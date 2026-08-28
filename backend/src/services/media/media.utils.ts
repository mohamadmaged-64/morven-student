import path from "path";
import fs from "fs-extra";
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

// ─── Allowed inputs ─────────────────────────────────────────────────

/** Video container extensions accepted for upload. */
export const ALLOWED_VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".m4v",
  ".mov",
  ".mkv",
  ".webm",
  ".avi",
  ".wmv",
  ".flv",
  ".mpg",
  ".mpeg",
  ".ts",
  ".3gp",
  ".ogv",
]);

/**
 * A file is considered a video when its extension is in the allow-list AND
 * (its MIME type is missing/generic OR starts with "video/"). Some browsers
 * send application/octet-stream for less common containers.
 */
export function isAllowedVideoUpload(
  originalname: string,
  mimetype: string
): boolean {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_VIDEO_EXTENSIONS.has(ext)) return false;
  if (!mimetype || mimetype === "application/octet-stream") return true;
  return mimetype.startsWith("video/");
}

/** Audio container extensions accepted for the add/replace-audio upload. */
export const ALLOWED_AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".flac",
]);

/** Same two-factor check as videos, but for audio uploads. */
export function isAllowedAudioUpload(
  originalname: string,
  mimetype: string
): boolean {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) return false;
  if (!mimetype || mimetype === "application/octet-stream") return true;
  return mimetype.startsWith("audio/");
}

const SAFE_BASE_NAME_PATTERN = /[^A-Za-z0-9._\-\u0600-\u06FF ]+/g;

/**
 * Derive a safe base name from the user-supplied filename:
 * strips the extension, path components (path traversal protection),
 * control characters, and caps the length. Falls back to "video".
 */
export function sanitizeBaseName(originalname: string): string {
  const withoutPath = path.basename(originalname || "");
  const withoutExt = path.basename(withoutPath, path.extname(withoutPath));
  const cleaned = withoutExt
    .replace(/[\r\n\t\0]/g, " ")
    .replace(SAFE_BASE_NAME_PATTERN, "")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : "video";
}

export function extensionOf(originalname: string): string {
  return path.extname(originalname || "").toLowerCase().replace(".", "");
}

// ─── Output format metadata ─────────────────────────────────────────

export const AUDIO_MIME: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
};

export const VIDEO_MIME: Record<VideoFormat, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
};

export const COMPRESSION_PRESET_LABELS: Record<CompressionPreset, string> = {
  light: "ضغط خفيف",
  medium: "ضغط متوسط",
  strong: "ضغط قوي",
};

// ─── FFmpeg argument builders ───────────────────────────────────────
// Every value here is a compile-time constant or an internally validated
// enum; user input never flows into these strings directly.

const MP4_COMPATIBLE_ARGS = [
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-movflags",
  "+faststart",
];

/** Audio extraction args per output format (with quality variants). */
export function buildExtractAudioArgs(
  inputPath: string,
  outputPath: string,
  format: AudioFormat,
  quality: AudioQuality
): string[] {
  const codecArgs: Record<AudioFormat, string[]> = {
    mp3:
      quality === "high"
      ? ["-c:a", "libmp3lame", "-q:a", "2"]
        : ["-c:a", "libmp3lame", "-q:a", "5"],
    wav: ["-c:a", "pcm_s16le"],
    m4a:
      quality === "high"
        ? ["-c:a", "aac", "-b:a", "192k"]
        : ["-c:a", "aac", "-b:a", "128k"],
  };
  return ["-i", inputPath, "-vn", ...codecArgs[format], outputPath];
}

/** Video compression presets (CRF-based rate control). */
export function buildCompressVideoArgs(
  inputPath: string,
  outputPath: string,
  preset: CompressionPreset
): string[] {
  // light: near-original quality · medium: balanced · strong: smallest file
  const presetArgs: Record<CompressionPreset, string[]> = {
    light: ["-crf", "23", "-preset", "fast"],
    medium: ["-crf", "28", "-preset", "medium"],
    strong: ["-crf", "32", "-preset", "medium"],
  };
  // Downscale only when the source is larger than the cap; smaller videos
  // keep their resolution (scale=-2 keeps even dimensions for x264).
  const scaleArgs: Record<CompressionPreset, string[]> = {
    light: [],
    medium: ["-vf", "scale='min(1280,iw)':-2"],
    strong: ["-vf", "scale='min(854,iw)':-2"],
  };
  return [
    "-i",
    inputPath,
    "-c:v",
    "libx264",
    ...presetArgs[preset],
    "-pix_fmt",
    "yuv420p",
    ...scaleArgs[preset],
    "-c:a",
    "aac",
    "-b:a",
    preset === "strong" ? "96k" : "128k",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

/**
 * Video conversion args per target container. All targets are produced via
 * re-encoding so any supported input can be converted to any target.
 */
export function buildConvertVideoArgs(
  inputPath: string,
  outputPath: string,
  target: VideoFormat
): string[] {
  switch (target) {
    case "webm":
      return [
        "-i",
        inputPath,
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",
        "-crf",
        "34",
        "-deadline",
        "realtime",
        "-cpu-used",
        "5",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
        outputPath,
      ];
    case "mkv":
      return ["-i", inputPath, ...MP4_COMPATIBLE_ARGS, outputPath];
    case "mov":
      return [
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        outputPath,
      ];
    case "mp4":
    default:
      return ["-i", inputPath, ...MP4_COMPATIBLE_ARGS, outputPath];
  }
}

// ─── Cut video (trim) ───────────────────────────────────────────────

/** Parse a user-supplied seconds value; returns null when invalid. */
export function parseSeconds(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  // Cap at 24h to keep the value sane.
  if (num > 86400) return null;
  return num;
}

/** Format a validated number as a fixed-point FFmpeg timestamp. */
function secondsToTimestamp(seconds: number): string {
  return seconds.toFixed(3);
}

/**
 * Stream-copy trim: `-ss` before the input seeks by keyframe and `-t`
 * copies without re-encoding, preserving the original media quality.
 */
export function buildCutVideoArgs(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  endSeconds: number
): string[] {
  const duration = endSeconds - startSeconds;
  return [
    "-ss",
    secondsToTimestamp(startSeconds),
    "-i",
    inputPath,
    "-t",
    secondsToTimestamp(duration),
    "-c",
    "copy",
    "-avoid_negative_ts",
    "make_zero",
    outputPath,
  ];
}

// ─── Edit video (resize / rotate / flip) ────────────────────────────

/** Height targets for named resize presets; width stays proportional (-2). */
export const RESIZE_PRESET_HEIGHTS: Record<
  Exclude<ResizePresetKey, "custom">,
  number
> = {
  "1080p": 1080,
  "720p": 720,
  "480p": 480,
  "360p": 360,
};

/** Bounds for custom dimensions (even numbers enforced by callers). */
export const MIN_CUSTOM_DIMENSION = 16;
export const MAX_CUSTOM_DIMENSION = 7680;

export function isValidCustomDimension(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_CUSTOM_DIMENSION &&
    value <= MAX_CUSTOM_DIMENSION
  );
}

interface EditVideoOptions {
  preset?: ResizePresetKey;
  customWidth?: number;
  customHeight?: number;
  rotate?: RotateDegrees;
  flip?: FlipMode;
}

/** Build the -vf chain for resize + rotate + flip. Returns null when empty. */
export function buildVideoFilterChain(options: EditVideoOptions): string | null {
  const parts: string[] = [];

  if (options.preset === "custom") {
    parts.push(`scale=${options.customWidth}:${options.customHeight}`);
  } else if (options.preset) {
    parts.push(`scale=-2:${RESIZE_PRESET_HEIGHTS[options.preset]}`);
  }

  switch (options.rotate) {
    case 90:
      parts.push("transpose=1");
      break;
    case 180:
      parts.push("transpose=1", "transpose=1");
      break;
    case 270:
      parts.push("transpose=2");
      break;
    default:
      break;
  }

  if (options.flip === "h") parts.push("hflip");
  if (options.flip === "v") parts.push("vflip");

  return parts.length > 0 ? parts.join(",") : null;
}

/** Re-encode with the requested visual edits, keeping/renormalizing audio. */
export function buildEditVideoArgs(
  inputPath: string,
  outputPath: string,
  options: EditVideoOptions & { hasAudio: boolean }
): string[] {
  const filter = buildVideoFilterChain(options);
  const args = ["-i", inputPath];
  if (filter) args.push("-vf", filter);
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p"
  );
  if (options.hasAudio) {
    args.push("-c:a", "aac", "-b:a", "128k");
  } else {
    args.push("-an");
  }
  args.push("-movflags", "+faststart", outputPath);
  return args;
}

// ─── Edit video audio ───────────────────────────────────────────────

/** Volume percent accepted range (100 = unchanged). */
export function isValidVolumePercent(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 200
  );
}

/** Remove the audio track entirely (video stream copied untouched). */
export function buildRemoveAudioArgs(
  inputPath: string,
  outputPath: string
): string[] {
  return ["-i", inputPath, "-an", "-c:v", "copy", "-movflags", "+faststart", outputPath];
}

/** Discard any original audio and attach the uploaded file as the track. */
export function buildReplaceAudioArgs(
  inputPath: string,
  audioPath: string,
  outputPath: string,
  volumePercent: number
): string[] {
  const volumeFilter =
    volumePercent === 100 ? null : `volume=${(volumePercent / 100).toFixed(3)}`;
  const args = [
    "-i",
    inputPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
  ];
  if (volumeFilter) args.push("-af", volumeFilter);
  args.push(
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath
  );
  return args;
}

/**
 * Mix an uploaded audio over the existing track. Both sources are levelled
 * to 50% before amix so the result does not clip; output ends with the
 * shorter of the two streams.
 */
export function buildMixAudioArgs(
  inputPath: string,
  audioPath: string,
  outputPath: string,
  volumePercent: number
): string[] {
  const videoVolume = (volumePercent / 100).toFixed(3);
  return [
    "-i",
    inputPath,
    "-i",
    audioPath,
    "-filter_complex",
    `[0:a]volume=${videoVolume}[a0];[1:a]volume=1.0[a1];` +
      "[a0][a1]amix=inputs=2:duration=shortest:dropout_transition=2[mixout]",
    "-map",
    "0:v:0",
    "-map",
    "[mixout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

/** Adjust the volume of the existing track only (video copied untouched). */
export function buildVolumeAudioArgs(
  inputPath: string,
  outputPath: string,
  volumePercent: number
): string[] {
  const args = ["-i", inputPath];
  if (volumePercent !== 100) {
    args.push("-af", `volume=${(volumePercent / 100).toFixed(3)}`);
  }
  args.push("-c:v", "copy", "-c:a", "aac", "-b:a", "160k", outputPath);
  return args;
}

// ─── Merge videos ───────────────────────────────────────────────────

export const MIN_MERGE_FILES = 2;
/** Product decision: the merge tool accepts at most 5 clips (UI + API). */
export const MAX_MERGE_FILES = 5;

/**
 * Concat every input through one filter graph, normalizing resolution/fps
 * to the first clip's canvas so mismatched inputs still merge.
 * Requires ffprobe-validated audio presence for EVERY clip when
 * `withAudio` is true (all-or-none rule enforced by the controller).
 */
export function buildMergeVideoArgs(
  inputPaths: string[],
  outputPath: string,
  options: { width: number; height: number; fps: number; withAudio: boolean }
): string[] {
  const n = inputPaths.length;
  const args: string[] = [];
  for (const p of inputPaths) args.push("-i", p);

  const chains: string[] = [];
  const concatInputs: string[] = [];
  const scaleExpr =
    `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,` +
    `pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2,fps=${options.fps},` +
    "format=yuv420p,setsar=1";

  for (let i = 0; i < n; i++) {
    chains.push(`[${i}:v]${scaleExpr}[v${i}]`);
    concatInputs.push(`[v${i}]`);
    if (options.withAudio) {
      chains.push(`[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${i}]`);
      concatInputs.push(`[a${i}]`);
    }
  }

  chains.push(
    `${concatInputs.join("")}concat=n=${n}:v=1:a=${
      options.withAudio ? 1 : 0
    }[cv${options.withAudio ? "][ca" : ""}]`
  );

  args.push("-filter_complex", chains.join(";"), "-map", "[cv]");
  if (options.withAudio) args.push("-map", "[ca]");
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p"
  );
  if (options.withAudio) args.push("-c:a", "aac", "-b:a", "128k");
  args.push("-movflags", "+faststart", outputPath);
  return args;
}

// ─── Video → GIF ────────────────────────────────────────────────────

export const GIF_FPS_MIN = 5;
export const GIF_FPS_MAX = 20;
export const GIF_FPS_DEFAULT = 10;
export const GIF_WIDTH_MIN = 64;
export const GIF_WIDTH_MAX = 1280;
export const GIF_WIDTH_DEFAULT = 480;
export const GIF_DURATION_MAX_SECONDS = 60;
/** Hard cap on total frames to bound CPU/memory usage. */
export const GIF_MAX_FRAMES = 750;

export interface GifTimeWindow {
  start?: number;
  end?: number;
}

/** Guard against unreasonable frame budgets before FFmpeg runs. */
export function isGifFrameBudgetOk(fps: number, window: GifTimeWindow): boolean {
  if (window.end !== undefined && window.start !== undefined) {
    const duration = Math.min(window.end - window.start, GIF_DURATION_MAX_SECONDS);
    return Math.ceil(duration * fps) <= GIF_MAX_FRAMES;
  }
  // Unknown duration: conservative defaults must stay within budget for
  // clips up to the max duration; longer inputs rely on the timeout guard.
  return true;
}

/** Pass 1: derive an optimal palette from the selected time window. */
export function buildGifPaletteArgs(
  inputPath: string,
  palettePath: string,
  fps: number,
  width: number,
  window: GifTimeWindow
): string[] {
  const args: string[] = [];
  if (window.start !== undefined) args.push("-ss", secondsToTimestamp(window.start));
  args.push("-i", inputPath);
  if (window.end !== undefined && window.start !== undefined) {
    args.push("-t", secondsToTimestamp(window.end - window.start));
  }
  args.push(
    "-vf",
    `fps=${fps},scale=${width}:-2:flags=lanczos,palettegen=max_colors=256`,
    palettePath
  );
  return args;
}

/**
 * Pass 2: render the GIF using the generated palette. Arguments are passed
 * as a raw argv array (no shell), so the filter graph needs no quoting.
 */
export function buildGifOutputArgs(
  inputPath: string,
  palettePath: string,
  outputPath: string,
  fps: number,
  width: number,
  window: GifTimeWindow
): string[] {
  const seekArgs: string[] = [];
  if (window.start !== undefined) seekArgs.push("-ss", secondsToTimestamp(window.start));
  const durationArgs: string[] = [];
  if (window.end !== undefined && window.start !== undefined) {
    durationArgs.push("-t", secondsToTimestamp(window.end - window.start));
  }
  return [
    ...seekArgs,
    "-i",
    inputPath,
    "-i",
    palettePath,
    ...durationArgs,
    "-lavfi",
    `fps=${fps},scale=${width}:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`,
    "-loop",
    "0",
    outputPath,
  ];
}

// ─── Change video speed ─────────────────────────────────────────────

export const SPEED_MIN = 0.25;
export const SPEED_MAX = 4;

/** atempo only accepts 0.5–2.0 per instance; chain filters for extremes. */
export function buildAtempoChain(speed: number): string[] {
  const tempos: number[] = [];
  let remaining = speed;
  while (remaining > 2.0 + 1e-9) {
    tempos.push(2.0);
    remaining /= 2.0;
  }
  while (remaining < 0.5 - 1e-9) {
    tempos.push(0.5);
    remaining *= 2.0;
  }
  tempos.push(Number(remaining.toFixed(4)));
  return tempos.map((t) => `atempo=${t}`);
}

/** Re-encode both streams at the requested factor. Audio optional. */
export function buildChangeSpeedArgs(
  inputPath: string,
  outputPath: string,
  speed: number,
  hasAudio: boolean
): string[] {
  const setpts = `setpts=PTS/${speed.toFixed(6)}`;
  const args = ["-i", inputPath, "-vf", setpts];
  if (hasAudio) {
    const chain = buildAtempoChain(speed).join(",");
    args.push("-af", chain);
  } else {
    args.push("-an");
  }
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p"
  );
  if (hasAudio) args.push("-c:a", "aac", "-b:a", "128k");
  args.push("-movflags", "+faststart", outputPath);
  return args;
}

// ─── Temp-file lifecycle helpers ────────────────────────────────────

/**
 * Best-effort removal of uploaded temp files that also survives the
 * Windows race where the just-closed upload handle is released slightly
 * after the write ends (EBUSY/EPERM on unlink). Each target is retried
 * briefly; anything still stuck is left for the periodic stale-temp
 * sweeper, which reclaims files older than MEDIA_JOB_TTL_MINUTES.
 */
export async function removeUploadTempFiles(paths: (string | undefined | null)[]): Promise<void> {
  const targets = paths.filter((p): p is string => typeof p === "string" && p.length > 0);
  await Promise.all(targets.map((p) => removeOneWithRetry(p)));
}

async function removeOneWithRetry(
  target: string,
  attempts = 8,
  delayMs = 150
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fs.remove(target);
      return;
    } catch {
      // Swallowed on purpose: callers only need best-effort semantics and
      // must never surface filesystem details to clients.
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}