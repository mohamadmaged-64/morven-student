import fs from "fs-extra";
import path from "path";
import { runFfmpeg } from "./ffmpeg.service";
import { MediaProcessingError } from "./media.types";
import type {
  AudioCleanStrength,
  AudioToolFormat,
  SttLanguage,
} from "./audio.types";
import {
  MIN_STT_SPEECH_SECONDS,
  SILENCE_PEAK_THRESHOLD,
} from "./audio.types";
import {
  buildCleanAudioArgs,
  buildCutAudioArgs,
  buildEnhanceAudioArgs,
  buildMergeAudioArgs,
  buildSttDecodeArgs,
  computePeakAmplitude,
} from "./audio.utils";
import { transcribeSamples } from "./stt.service";
import {
  cleanupJob,
  createJobPaths,
  ensureDiskSpace,
  runMediaJobMultiInput,
} from "./media.service";
import type { MediaJobContext, MediaJobResult } from "./media.service";

/**
 * Dedicated audio tools. Every operation shares the media job lifecycle:
 * an isolated per-job work directory, disk-headroom checks, real FFmpeg
 * progress, verified outputs and best-effort cleanup on failure.
 */
export class AudioService {
  /** Trim a clip while keeping its declared container/codec family. */
  static async cut(
    inputPath: string,
    format: AudioToolFormat,
    startSeconds: number,
    endSeconds: number,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJobMultiInput(
      [inputPath],
      (_paths, outputPath) =>
        buildCutAudioArgs(inputPath, outputPath, format, startSeconds, endSeconds),
      `cut.${format}`,
      ctx
    );
  }

  /** Volume / fades / loudness normalization / clarity in one pass. */
  static async enhance(
    inputPath: string,
    format: AudioToolFormat,
    options: {
      volumePercent: number;
      fadeInSeconds: number;
      fadeOutSeconds: number;
      normalize: boolean;
      clarity: boolean;
      durationSeconds?: number | null;
    },
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJobMultiInput(
      [inputPath],
      (_paths, outputPath) =>
        buildEnhanceAudioArgs(inputPath, outputPath, format, {
          volumePercent: options.volumePercent,
          fadeInSeconds: options.fadeInSeconds,
          fadeOutSeconds: options.fadeOutSeconds,
          normalize: options.normalize,
          clarity: options.clarity,
          durationSeconds: options.durationSeconds,
        }),
      `enhanced.${format}`,
      ctx
    );
  }

  /** Noise reduction (hum/rumble + broadband) at a chosen strength. */
  static async clean(
    inputPath: string,
    strength: AudioCleanStrength,
    format: AudioToolFormat,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJobMultiInput(
      [inputPath],
      (_paths, outputPath) =>
        buildCleanAudioArgs(inputPath, outputPath, format, strength),
      `cleaned.${format}`,
      ctx
    );
  }

  /** Concatenate clips in order into one normalized MP3. */
  static async merge(
    inputPaths: string[],
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    return runMediaJobMultiInput(
      inputPaths,
      (paths, outputPath) => buildMergeAudioArgs(paths, outputPath),
      "merged.mp3",
      ctx
    );
  }

  /**
   * Speech-to-text: decode → silence gate → Whisper → transcript.txt.
   * The transcript file becomes the job's downloadable output; the decoded
   * PCM intermediate is removed as soon as it has been consumed.
   */
  static async transcribe(
    inputPath: string,
    language: SttLanguage,
    ctx?: MediaJobContext
  ): Promise<MediaJobResult> {
    const { workDir, outputPath } = createJobPaths("transcript.txt");

    try {
      await fs.ensureDir(workDir);
      const inputStat = await fs.stat(inputPath);
      // Decoded PCM is ~64KB/s plus model overhead; keep a generous margin.
      await ensureDiskSpace(inputStat.size + 256 * 1024 * 1024);

      const rawPath = path.join(workDir, "audio-16k.f32");
      let lastFraction = -1;
      const emit = (fraction: number) => {
        const clamped = Math.max(0, Math.min(0.99, fraction));
        if (!ctx?.onProgress || clamped <= lastFraction) return;
        lastFraction = clamped;
        ctx.onProgress(clamped);
      };

      emit(0.02);
      await runFfmpeg(buildSttDecodeArgs(inputPath, rawPath), {
        signal: ctx?.signal,
      });
      if (!(await fs.pathExists(rawPath))) {
        throw new MediaProcessingError(
          "PROCESSING_FAILED",
          "Could not decode the uploaded audio for transcription.",
          500
        );
      }
      emit(0.25);

      const rawBuffer = await fs.readFile(rawPath);
      await fs.remove(rawPath).catch(() => undefined);
      const sampleCount = Math.floor(rawBuffer.length / 4);
      const samples = new Float32Array(
        rawBuffer.buffer,
        rawBuffer.byteOffset,
        sampleCount
      );

      let transcript = "";
      const seconds = sampleCount / 16000;
      const peak = computePeakAmplitude(samples);
      const isSilent =
        seconds < MIN_STT_SPEECH_SECONDS || peak < SILENCE_PEAK_THRESHOLD;

      if (!isSilent) {
        emit(0.35);
        try {
          transcript = await transcribeSamples(samples, { language });
        } catch (err) {
          throw new MediaProcessingError(
            "PROCESSING_FAILED",
            "The speech recognition engine failed to process this audio.",
            500,
            err instanceof Error ? err.message : String(err)
          );
        }
      }
      emit(0.97);

      await fs.writeFile(outputPath, `${transcript}\n`, "utf8");
      const outStat = await fs.stat(outputPath);
      if (!outStat.isFile() || outStat.size === 0) {
        throw new MediaProcessingError(
          "PROCESSING_FAILED",
          "Transcription finished but produced no output.",
          500
        );
      }
      emit(1);

      return {
        outputPath,
        workDir,
        originalSize: inputStat.size,
        outputSize: outStat.size,
      };
    } catch (err) {
      await cleanupJob(workDir);
      throw err;
    }
  }
}
