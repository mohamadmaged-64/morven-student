import path from "path";
import fs from "fs-extra";
import { statfs } from "fs/promises";
import { randomUUID } from "crypto";
import {
  probeMediaInfo,
  runFfmpeg,
  type FfmpegEvent,
} from "./ffmpeg.service";
import { MediaProcessingError } from "./media.types";
import type {
  AudioEditMode,
  AudioFormat,
  AudioQuality,
  CompressionPreset,
  FlipMode,
  ResizePresetKey,
  RotateDegrees,
  VideoFormat,
} from "./media.types";
import {
  buildChangeSpeedArgs,
  buildCompressVideoArgs,
  buildConvertVideoArgs,
  buildCutVideoArgs,
  buildEditVideoArgs,
  buildExtractAudioArgs,
  buildGifOutputArgs,
  buildGifPaletteArgs,
  buildMergeVideoArgs,
  buildMixAudioArgs,
  buildRemoveAudioArgs,
  buildReplaceAudioArgs,
  buildVolumeAudioArgs,
  removeUploadTempFiles,
} from "./media.utils";

// Per-job working directories live under the shared backend temp folder
// (src/temp in dev, dist/temp in production builds). Override with
// MEDIA_TEMP_DIR when deploying to a dedicated volume.
const MEDIA_WORK_ROOT =
  process.env.MEDIA_TEMP_DIR ||
  path.resolve(__dirname, "..", "..", "temp", "media");

export const mediaWorkRoot = MEDIA_WORK_ROOT;

/**
 * Remove stale temp artifacts left by crashed/restarted processes or by
 * unlink calls that lost a Windows file-handle race:
 * - orphaned per-job directories under the media work root
 * - orphaned uploaded files sitting in the parent temp root
 * Entries older than MEDIA_JOB_TTL_MINUTES are reclaimed. Invoked from the
 * single periodic media sweeper (MediaJobsService.sweep).
 */
export async function sweepStaleMediaDirs(): Promise<void> {
  try {
    const ttlMs = (Number(process.env.MEDIA_JOB_TTL_MINUTES) || 30) * 60 * 1000;
    const tempRoot = path.resolve(MEDIA_WORK_ROOT, "..");
    const now = Date.now();
    const sweepDir = async (dir: string, dirsOnly: boolean): Promise<void> => {
      if (!(await fs.pathExists(dir))) return;
      const entries = await fs.readdir(dir);
      await Promise.all(
        entries.map(async (entry) => {
          try {
            const full = path.join(dir, entry);
            const stat = await fs.stat(full);
            if (now - stat.mtimeMs <= ttlMs) return;
            if (stat.isDirectory()) {
              if (dirsOnly && dir === MEDIA_WORK_ROOT) await fs.remove(full);
            } else if (!dirsOnly) {
              // Root level: only plain uploaded files are ours to delete.
              await fs.remove(full);
            }
          } catch {
            // Ignore unreadable entries.
          }
        })
      );
    };
    // Orphaned job directories under media/.
    await sweepDir(MEDIA_WORK_ROOT, true);
    // Leftover uploads in the temp root (files only; never touch dirs there).
    await sweepDir(tempRoot, false);
  } catch (err) {
    console.error("[media] failed to sweep stale media dirs:", err);
  }
}

export interface MediaJobResult {
  /** Absolute path of the produced file inside the job directory. */
  outputPath: string;
  /** Absolute path of the per-job working directory (input + output). */
  workDir: string;
  originalSize: number;
  outputSize: number;
}

export interface MediaJobContext {
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

export async function ensureDiskSpace(requiredBytes: number): Promise<void> {
  try {
    // fs.statfs is available on Linux (production containers) and modern
    // Node on Windows; treat unavailability as non-fatal.
    const stats = await statfs(MEDIA_WORK_ROOT);
    const freeBytes = stats.bsize * stats.bavail;
    if (freeBytes < requiredBytes) {
      throw new MediaProcessingError(
        "STORAGE_ERROR",
        "Not enough disk space on the processing server.",
        507
      );
    }
  } catch (err) {
    if (err instanceof MediaProcessingError) throw err;
    // Ignore probe failures (unsupported platform/filesystem).
  }
}

interface JobPaths {
  workDir: string;
  outputPath: string;
}

export function createJobPaths(outputFileName: string): JobPaths {
  const workDir = path.join(MEDIA_WORK_ROOT, randomUUID());
  // Output name is server-generated from sanitized/known parts only.
  const outputPath = path.join(workDir, outputFileName);
  return { workDir, outputPath };
}

/**
 * Remove the whole per-job directory (input copy + output) best-effort.
 * Uses the retrying remover: right after FFmpeg is killed (cancel/timeout)
 * Windows may still hold the output handle open for a moment, and an
 * immediate unlink would silently fail, orphaning the directory.
 */
export async function cleanupJob(workDir: string): Promise<void> {
  await removeUploadTempFiles([workDir]);
}

function makeProgressEmitter(ctx?: MediaJobContext) {
  let lastFraction = -1;
  return (fraction: number) => {
    const clamped = Math.max(0, Math.min(0.99, fraction));
    if (!ctx?.onProgress || clamped <= lastFraction) return;
    lastFraction = clamped;
    ctx.onProgress(clamped);
  };
}

/**
 * Run one FFmpeg invocation with real progress reporting derived from its
 * own metadata, scaled into [from, to] inside a larger job.
 */
async function runStep(
  args: string[],
  ctx: MediaJobContext | undefined,
  from: number,
  to: number
): Promise<{ stderr: string }> {
  let durationSeconds: number | null = null;
  const emit = makeProgressEmitter(ctx);

  const handleEvent = (event: FfmpegEvent) => {
    if (event.type === "duration") durationSeconds = event.seconds;
    if (event.type === "time" && durationSeconds && durationSeconds > 0) {
      emit(from + ((to - from) * event.seconds) / durationSeconds);
    }
  };

  try {
    return await runFfmpeg(args, { signal: ctx?.signal, onEvent: handleEvent });
  } catch (err) {
    if (
      err instanceof MediaProcessingError &&
      err.code === "CANCELLED" &&
      ctx?.signal?.aborted
    ) {
      // Re-tag client cancellations so job bookkeeping stays accurate.
      throw new MediaProcessingError("CANCELLED", "Processing cancelled.", 499);
    }
    throw err;
  } finally {
    // Keep progress monotonic across steps.
    emit(from);
  }
}

async function verifyOutput(outputPath: string): Promise<number> {
  const outStat = await fs.stat(outputPath).catch(() => null);
  if (!outStat || !outStat.isFile() || outStat.size === 0) {
    throw new MediaProcessingError(
      "PROCESSING_FAILED",
      "FFmpeg finished but produced no output.",
      500
    );
  }
  return outStat.size;
}

/**
 * Core single-input/single-pass runner shared by most media operations:
 * 1. create an isolated, randomly named temp job directory
 * 2. verify disk headroom
 * 3. run FFmpeg with safe argv and real progress reporting
 * 4. verify the output exists
 * On failure the job directory is removed before the error propagates.
 */
async function runMediaJob(
  inputPath: string,
  argsBuilder: (outputPath: string) => string[],
  outputFileName: string,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  return runMediaJobMultiInput(
    [inputPath],
    (_paths, outputPath) => argsBuilder(outputPath),
    outputFileName,
    ctx
  );
}

/**
 * Multi-input variant of runMediaJob (merge tool). Inputs may live outside
 * the workdir; only the workdir lifecycle is managed here.
 */
export async function runMediaJobMultiInput(
  inputPaths: string[],
  argsBuilder: (inputPaths: string[], outputPath: string) => string[],
  outputFileName: string,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const { workDir, outputPath } = createJobPaths(outputFileName);

  try {
    await fs.ensureDir(workDir);

    let totalBytes = 0;
    for (const p of inputPaths) {
      totalBytes += (await fs.stat(p)).size;
    }
    await ensureDiskSpace(totalBytes * 3);

    await runStep(argsBuilder(inputPaths, outputPath), ctx, 0, 0.99);

    const outputSize = await verifyOutput(outputPath);
    ctx?.onProgress?.(1);

    return {
      outputPath,
      workDir,
      originalSize: totalBytes,
      outputSize,
    };
  } catch (err) {
    await cleanupJob(workDir);
    throw err;
  }
}

const MISSING_AUDIO_DETAIL =
  /no audio|does not contain any stream|matches no streams|Stream map '0:a'|filter.*has an unconnected output/i;

/**
 * Probe whether an input has an audio stream; when ffprobe is unavailable
 * or fails we optimistically assume audio exists and rely on the retry
 * fallback below to degrade safely.
 */
async function detectAudioOrAssume(inputPath: string): Promise<boolean> {
  const info = await probeMediaInfo(inputPath);
  if (!info) return true;
  return info.hasAudio;
}

function isMissingAudioFailure(err: unknown): boolean {
  return (
    err instanceof MediaProcessingError &&
    err.code === "PROCESSING_FAILED" &&
    MISSING_AUDIO_DETAIL.test(err.detail ?? "")
  );
}

export class MediaService {
  static async isAvailable(): Promise<boolean> {
    const { isFfmpegAvailable } = await import("./ffmpeg.service");
    return isFfmpegAvailable();
  }

  static async extractAudio(
    inputPath: string,
    format: AudioFormat,
    quality: AudioQuality,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJob(
      inputPath,
      (outputPath) => buildExtractAudioArgs(inputPath, outputPath, format, quality),
      `audio.${format}`,
      ctx
    );
  }

  static async compressVideo(
    inputPath: string,
    preset: CompressionPreset,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJob(
      inputPath,
      (outputPath) => buildCompressVideoArgs(inputPath, outputPath, preset),
      "compressed.mp4",
      ctx
    );
  }

  static async convertVideo(
    inputPath: string,
    target: VideoFormat,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJob(
      inputPath,
      (outputPath) => buildConvertVideoArgs(inputPath, outputPath, target),
      `converted.${target}`,
      ctx
    );
  }

  /** Trim without re-encoding (stream copy keeps original quality). */
  static async cutVideo(
    inputPath: string,
    startSeconds: number,
    endSeconds: number,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJob(
      inputPath,
      (outputPath) =>
        buildCutVideoArgs(inputPath, outputPath, startSeconds, endSeconds),
      "cut.mp4",
      ctx
    );
  }

  /** Resize/rotate/flip in one re-encode pass. */
  static async editVideo(
    inputPath: string,
    options: {
      preset?: ResizePresetKey;
      customWidth?: number;
      customHeight?: number;
      rotate?: RotateDegrees;
      flip?: FlipMode;
    },
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    const hasAudio = await detectAudioOrAssume(inputPath);
    try {
      return await runMediaJob(
        inputPath,
        (outputPath) =>
          buildEditVideoArgs(inputPath, outputPath, { ...options, hasAudio }),
        "edited.mp4",
        ctx
      );
    } catch (err) {
      if (hasAudio && isMissingAudioFailure(err)) {
        // Probe was unavailable/wrong: redo without touching audio.
        return runMediaJob(
          inputPath,
          (outputPath) =>
            buildEditVideoArgs(inputPath, outputPath, { ...options, hasAudio: false }),
          "edited.mp4",
          ctx
        );
      }
      throw err;
    }
  }

  /**
   * Audio operations on video. `mix` falls back to plain replacement when
   * the source has no existing track so silent videos are handled safely.
   */
  static async editVideoAudio(
    inputPath: string,
    mode: AudioEditMode,
    options: { volumePercent: number; audioPath?: string },
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    if (mode === "remove") {
      return runMediaJob(
        inputPath,
        (outputPath) => buildRemoveAudioArgs(inputPath, outputPath),
        "no-audio.mp4",
        ctx
      );
    }

    if (mode === "volume") {
      const hasAudio = await detectAudioOrAssume(inputPath);
      if (!hasAudio) {
        throw new MediaProcessingError(
          "INVALID_CONVERSION",
          "This video has no audio track, so there is nothing to adjust.",
          400
        );
      }
      try {
        return await runMediaJob(
          inputPath,
          (outputPath) =>
            buildVolumeAudioArgs(inputPath, outputPath, options.volumePercent),
          "volume.mp4",
          ctx
        );
      } catch (err) {
        if (isMissingAudioFailure(err)) {
          throw new MediaProcessingError(
            "INVALID_CONVERSION",
            "This video has no audio track, so there is nothing to adjust.",
            400
          );
        }
        throw err;
      }
    }

    const audioPath = options.audioPath;
    if (!audioPath) {
      throw new MediaProcessingError(
        "INVALID_CONVERSION",
        "An audio file is required for this operation.",
        400
      );
    }

    if (mode === "replace") {
      return runMediaJobMultiInput(
        [inputPath, audioPath],
        (_paths, outputPath) =>
          buildReplaceAudioArgs(
            inputPath,
            audioPath,
            outputPath,
            options.volumePercent
          ),
        "audio-replaced.mp4",
        ctx
      );
    }

    // mix: overlay uploaded audio onto the existing track; fall back to
    // attaching it as the only track for videos without audio.
    const hasAudio = await detectAudioOrAssume(inputPath);
    try {
      if (hasAudio) {
        return await runMediaJobMultiInput(
          [inputPath, audioPath],
          (_paths, outputPath) =>
            buildMixAudioArgs(
              inputPath,
              audioPath,
              outputPath,
              options.volumePercent
            ),
          "audio-mixed.mp4",
          ctx
        );
      }
    } catch (err) {
      if (!isMissingAudioFailure(err)) throw err;
      // else fall through to replace-style attach below.
    }
    return runMediaJobMultiInput(
      [inputPath, audioPath],
      (_paths, outputPath) =>
        buildReplaceAudioArgs(inputPath, audioPath, outputPath, options.volumePercent),
      "audio-added.mp4",
      ctx
    );
  }

  /** Merge several clips into one normalized MP4. */
  static async mergeVideos(
    inputPaths: string[],
    options: { width: number; height: number; fps: number; withAudio: boolean },
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    try {
      return await runMediaJobMultiInput(
        inputPaths,
        (paths, outputPath) => buildMergeVideoArgs(paths, outputPath, options),
        "merged.mp4",
        ctx
      );
    } catch (err) {
      if (options.withAudio && isMissingAudioFailure(err)) {
        // ffprobe was unavailable and at least one clip lacks audio:
        // retry silently as a video-only merge rather than failing.
        return runMediaJobMultiInput(
          inputPaths,
          (paths, outputPath) =>
            buildMergeVideoArgs(paths, outputPath, { ...options, withAudio: false }),
          "merged.mp4",
          ctx
        );
      }
      throw err;
    }
  }

  /** Two-pass GIF rendering (palettegen → paletteuse) with shared cleanup. */
  static async videoToGif(
    inputPath: string,
    options: {
      fps: number;
      width: number;
      window: { start?: number; end?: number };
    },
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    const { workDir, outputPath } = createJobPaths("animation.gif");
    try {
      await fs.ensureDir(workDir);

      const inputStat = await fs.stat(inputPath);
      await ensureDiskSpace(inputStat.size * 3);

      const palettePath = path.join(workDir, "palette.png");
      await runStep(
        buildGifPaletteArgs(
          inputPath,
          palettePath,
          options.fps,
          options.width,
          options.window
        ),
        ctx,
        0,
        0.35
      );

      await verifyOutput(palettePath);

      await runStep(
        buildGifOutputArgs(
          inputPath,
          palettePath,
          outputPath,
          options.fps,
          options.width,
          options.window
        ),
        ctx,
        0.35,
        0.99
      );

      const outputSize = await verifyOutput(outputPath);
      ctx?.onProgress?.(1);

      return {
        outputPath,
        workDir,
        originalSize: inputStat.size,
        outputSize,
      };
    } catch (err) {
      await cleanupJob(workDir);
      throw err;
    }
  }

  /** Speed up / slow down video and audio together. */
  static async changeVideoSpeed(
    inputPath: string,
    speed: number,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    const hasAudio = await detectAudioOrAssume(inputPath);
    try {
      return await runMediaJob(
        inputPath,
        (outputPath) => buildChangeSpeedArgs(inputPath, outputPath, speed, hasAudio),
        "speed.mp4",
        ctx
      );
    } catch (err) {
      if (hasAudio && isMissingAudioFailure(err)) {
        return runMediaJob(
          inputPath,
          (outputPath) =>
            buildChangeSpeedArgs(inputPath, outputPath, speed, false),
          "speed.mp4",
          ctx
        );
      }
      throw err;
    }
  }

  /**
   * Remove background music from a video using Demucs source separation.
   *
   * Pipeline:
   * 1. Verify the video has an audio track
   * 2. Extract audio to WAV (44100 Hz stereo)
   * 3. Run Demucs HTDemucs to separate vocals from music
   * 4. Remux the original video stream with the processed vocals audio
   * 5. Also produce an audio-only output
   *
   * Returns the processed video; the audio-only file is written alongside it.
   */
  static async removeMusic(
    inputPath: string,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult & { audioOutputPath: string }> {
    const { workDir } = createJobPaths("processed-video.mp4");
    const extractedAudioPath = path.join(workDir, "extracted-audio.wav");
    const vocalsPath = path.join(workDir, "vocals.wav");
    const videoOutputPath = path.join(workDir, "processed-video.mp4");
    const audioOutputPath = path.join(workDir, "processed-audio.mp3");

    try {
      await fs.ensureDir(workDir);

      const inputStat = await fs.stat(inputPath);
      await ensureDiskSpace(inputStat.size * 5);

      const emit = makeProgressEmitter(ctx);

      // Step 1: Check for an audio track
      emit(0.02);
      const hasAudio = await detectAudioOrAssume(inputPath);
      if (!hasAudio) {
        throw new MediaProcessingError(
          "NO_AUDIO_TRACK",
          "This video has no audio track, so there is no music to remove.",
          400
        );
      }

      // Step 2: Extract audio to WAV for Demucs
      try {
        await runStep(
          [
            "-i", inputPath,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "44100",
            "-ac", "2",
            "-y",
            extractedAudioPath,
          ],
          ctx,
          0.05,
          0.15
        );
      } catch (err) {
        if (isMissingAudioFailure(err)) {
          throw new MediaProcessingError(
            "NO_AUDIO_TRACK",
            "This video has no audio track, so there is no music to remove.",
            400
          );
        }
        throw err;
      }

      // Verify extracted audio exists and has content
      const audioStat = await fs.stat(extractedAudioPath).catch(() => null);
      if (!audioStat || audioStat.size === 0) {
        throw new MediaProcessingError(
          "PROCESSING_FAILED",
          "Failed to extract audio from the video.",
          500
        );
      }

      // Step 3: Run Demucs source separation (the heavy step: 0.15 -> 0.75)
      const { runDemucsSeparation } = await import("./demucs.service");
      await runDemucsSeparation(extractedAudioPath, vocalsPath, {
        signal: ctx?.signal,
        onProgress: (stage) => {
          // Map Demucs progress into the 0.15..0.75 range.
          if (stage.includes("Loading")) emit(0.22);
          else if (stage.includes("Separating")) emit(0.50);
          else if (stage.includes("Saving")) emit(0.70);
          else if (stage.includes("complete")) emit(0.72);
        },
      });

      // Verify vocals output exists
      const vocalsStat = await fs.stat(vocalsPath).catch(() => null);
      if (!vocalsStat || vocalsStat.size === 0) {
        throw new MediaProcessingError(
          "PROCESSING_FAILED",
          "Source separation produced no output.",
          500
        );
      }

      // Clean up intermediate extracted audio.
      await removeUploadTempFiles([extractedAudioPath]);

      // Step 4: Remux original video stream with processed vocals audio (0.80 -> 0.90)
      await runStep(
        [
          "-i", inputPath,
          "-i", vocalsPath,
          "-map", "0:v:0",
          "-map", "1:a:0",
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "192k",
          "-shortest",
          "-y",
          videoOutputPath,
        ],
        ctx,
        0.80,
        0.90
      );

      // Step 5: Generate audio-only output (0.90 -> 0.99)
      await runStep(
        [
          "-i", vocalsPath,
          "-codec:a", "libmp3lame",
          "-b:a", "192k",
          "-y",
          audioOutputPath,
        ],
        ctx,
        0.90,
        0.99
      );

      // Verify outputs
      const videoStat = await verifyOutput(videoOutputPath);
      const audioStatFinal = await verifyOutput(audioOutputPath);

      // Clean up the vocals WAV (no longer needed after encoding).
      await removeUploadTempFiles([vocalsPath]);

      emit(1);
      ctx?.onProgress?.(1);

      return {
        outputPath: videoOutputPath,
        workDir,
        originalSize: inputStat.size,
        outputSize: videoStat,
        audioOutputPath,
      };
    } catch (err) {
      await cleanupJob(workDir);
      throw err;
    }
  }
}
