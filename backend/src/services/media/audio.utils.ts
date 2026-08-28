import fs from "fs-extra";
import path from "path";
import { isAudioToolFormat } from "./audio.types";
import type { AudioCleanStrength, AudioToolFormat } from "./audio.types";

// ─── Upload validation ──────────────────────────────────────────────

/** Extensions accepted by the dedicated audio tools. */
export const ALLOWED_AUDIO_TOOL_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".webm",
  ".flac",
]);

/**
 * Two-factor upload check for standalone audio tools. Beyond the classic
 * audio/* MIME types this accepts the container-specific types browsers
 * actually send for recordings (video/webm from Chrome MediaRecorder,
 * video/mp4-style m4a from Safari) plus the generic octet-stream.
 */
export function isAllowedAudioToolUpload(
  originalname: string,
  mimetype: string
): boolean {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_AUDIO_TOOL_EXTENSIONS.has(ext)) return false;
  if (!mimetype || mimetype === "application/octet-stream") return true;
  if (mimetype.startsWith("audio/")) return true;
  if (ext === ".webm" && mimetype.startsWith("video/webm")) return true;
  if ((ext === ".m4a" || ext === ".aac") && mimetype.startsWith("video/mp4")) {
    return true;
  }
  return false;
}

function ascii(buf: Buffer, start: number, end: number): string {
  return buf.toString("latin1", start, end);
}

/**
 * Content-based sniffing: does the leading bytes of an uploaded file match
 * the declared audio extension? Defense against renamed/corrupt uploads
 * that pass the metadata filter. Only the first bytes are inspected.
 */
export function sniffAudioMagic(header: Buffer, ext: string): boolean {
  if (header.length < 12) return false;
  switch (ext) {
    case ".mp3":
      // ID3v2 tag or MPEG audio frame sync (0xFFEx).
      return (
        ascii(header, 0, 3) === "ID3" ||
        (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
      );
    case ".wav":
      return ascii(header, 0, 4) === "RIFF" && ascii(header, 8, 12) === "WAVE";
    case ".ogg":
    case ".opus":
      // Opus practical containers are Ogg.
      return ascii(header, 0, 4) === "OggS";
    case ".flac":
      return ascii(header, 0, 4) === "fLaC";
    case ".webm":
      // EBML marker shared with MKV.
      return (
        header[0] === 0x1a &&
        header[1] === 0x45 &&
        header[2] === 0xdf &&
        header[3] === 0xa3
      );
    case ".m4a":
      // ISO BMFF: brand box starts at offset 4.
      return ascii(header, 4, 8) === "ftyp";
    case ".aac":
      // ADTS frame sync (0xFFFx, layer bits 00).
      return header[0] === 0xff && (header[1] & 0xf6) === 0xf0;
    default:
      return false;
  }
}

/**
 * Verify that an uploaded temp file's contents match its declared audio
 * extension. Returns false on read failure or undersized files so callers
 * can reject before spawning any processing job.
 */
export async function verifyUploadedAudioFile(
  filePath: string,
  originalname: string
): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size < 16) return false;
    const handle = await fs.promises.open(filePath, "r");
    try {
      const { buffer, bytesRead } = await handle.read({
        buffer: Buffer.alloc(64),
        position: 0,
      });
      return sniffAudioMagic(buffer.subarray(0, bytesRead), path.extname(originalname).toLowerCase());
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}

// ─── Output codec selection ─────────────────────────────────────────

/**
 * Re-encode arguments per target container. Used whenever a tool must
 * rewrite samples while keeping the user's original format (cut/enhance/
 * clean); merge always produces MP3.
 */
export function buildAudioCodecArgs(format: AudioToolFormat): string[] {
  switch (format) {
    case "mp3":
      return ["-c:a", "libmp3lame", "-q:a", "2"];
    case "wav":
      return ["-c:a", "pcm_s16le"];
    case "m4a":
      return ["-c:a", "aac", "-b:a", "192k"];
    case "ogg":
      return ["-c:a", "libvorbis", "-q:a", "5"];
    case "opus":
      return ["-c:a", "libopus", "-b:a", "128k"];
    case "webm":
      return ["-c:a", "libopus", "-b:a", "128k"];
    case "flac":
      return ["-c:a", "flac", "-compression_level", "5"];
    case "aac":
      // Raw .aac output defaults to ADTS framing automatically.
      return ["-c:a", "aac", "-b:a", "192k"];
    default:
      return ["-c:a", "libmp3lame", "-q:a", "2"];
  }
}

/** Map an uploaded filename to its re-encode output format. */
export function formatFromName(originalname: string): AudioToolFormat | null {
  const ext = path.extname(originalname || "").toLowerCase().replace(".", "");
  return isAudioToolFormat(ext) ? ext : null;
}

// ─── FFmpeg argument builders ───────────────────────────────────────
// Every argument is a compile-time constant or internally validated value;
// user input never flows into these strings unvalidated.

function secondsToTimestamp(seconds: number): string {
  return seconds.toFixed(3);
}

/** Cut (trim) a clip, re-encoding to keep the declared container valid. */
export function buildCutAudioArgs(
  inputPath: string,
  outputPath: string,
  format: AudioToolFormat,
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
    "-vn",
    ...buildAudioCodecArgs(format),
    outputPath,
  ];
}

export interface EnhanceAudioOptions {
  volumePercent: number; // 0..200, 100 = unchanged
  fadeInSeconds: number; // 0..AUDIO_FADE_MAX_SECONDS
  fadeOutSeconds: number;
  /** EBU R128 loudness normalization to podcast-level loudness. */
  normalize: boolean;
  /** Speech-clarity chain (high-pass + presence EQ + gentle compression). */
  clarity: boolean;
  /**
   * Source duration in seconds when known (ffprobe); required to place the
   * fade-out window. When unknown the fade-out is skipped gracefully.
   */
  durationSeconds?: number | null;
}

/** Build the -af chain for the enhance tool; null when nothing applies. */
export function buildEnhanceFilterChain(
  options: EnhanceAudioOptions
): string | null {
  const parts: string[] = [];

  if (options.clarity) {
    parts.push(
      "highpass=f=90",
      "equalizer=f=250:t=q:w=1:g=2",
      "equalizer=f=3200:t=q:w=2:g=3",
      "acompressor=threshold=0.063:ratio=3:attack=15:release=180"
    );
  }

  if (options.volumePercent !== 100) {
    parts.push(`volume=${(options.volumePercent / 100).toFixed(3)}`);
  }

  if (options.normalize) {
    parts.push("loudnorm=I=-16:TP=-1.5:LRA=11");
  }

  if (options.fadeInSeconds > 0) {
    parts.push(`afade=t=in:st=0:d=${options.fadeInSeconds.toFixed(3)}`);
  }

  if (
    options.fadeOutSeconds > 0 &&
    typeof options.durationSeconds === "number" &&
    options.durationSeconds > options.fadeOutSeconds
  ) {
    const fadeStart = Math.max(
      0,
      options.durationSeconds - options.fadeOutSeconds
    );
    parts.push(
      `afade=t=out:st=${fadeStart.toFixed(3)}:d=${options.fadeOutSeconds.toFixed(3)}`
    );
  }

  return parts.length > 0 ? parts.join(",") : null;
}

export function buildEnhanceAudioArgs(
  inputPath: string,
  outputPath: string,
  format: AudioToolFormat,
  options: EnhanceAudioOptions
): string[] {
  const args = ["-i", inputPath];
  const filter = buildEnhanceFilterChain(options);
  if (filter) args.push("-af", filter);
  args.push("-vn", ...buildAudioCodecArgs(format), outputPath);
  return args;
}

const CLEAN_PRESETS: Record<AudioCleanStrength, { nr: string; nf: string }> = {
  light: { nr: "10", nf: "-28" },
  medium: { nr: "22", nf: "-32" },
  strong: { nr: "34", nf: "-36" },
};

/** Noise-reduction chain: rumble removal + FFT denoiser. */
export function buildCleanAudioArgs(
  inputPath: string,
  outputPath: string,
  format: AudioToolFormat,
  strength: AudioCleanStrength
): string[] {
  const preset = CLEAN_PRESETS[strength];
  const filter = `highpass=f=85,afftdn=nr=${preset.nr}:nf=${preset.nf}:tn=1`;
  return [
    "-i",
    inputPath,
    "-af",
    filter,
    "-vn",
    ...buildAudioCodecArgs(format),
    outputPath,
  ];
}

// ─── Merge ──────────────────────────────────────────────────────────

/**
 * Concatenate every input through one graph, normalizing sample rate and
 * channel layout so mismatched files still merge cleanly. Order follows
 * the multipart part order exactly.
 */
export function buildMergeAudioArgs(
  inputPaths: string[],
  outputPath: string
): string[] {
  const n = inputPaths.length;
  const args: string[] = [];
  for (const p of inputPaths) args.push("-i", p);

  const chains: string[] = [];
  const labels: string[] = [];
  for (let i = 0; i < n; i++) {
    chains.push(`[${i}:a]aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[a${i}]`);
    labels.push(`[a${i}]`);
  }
  chains.push(`${labels.join("")}concat=n=${n}:v=0:a=1[merged]`);

  args.push(
    "-filter_complex",
    chains.join(";"),
    "-map",
    "[merged]",
    "-vn",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    outputPath
  );
  return args;
}

// ─── Speech-to-text decode ──────────────────────────────────────────

/** Decode any supported input to mono 16 kHz float PCM for Whisper. */
export function buildSttDecodeArgs(
  inputPath: string,
  rawOutputPath: string
): string[] {
  return [
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_f32le",
    "-f",
    "f32le",
    rawOutputPath,
  ];
}

/** Peak absolute amplitude of float PCM samples (-1..1 range). */
export function computePeakAmplitude(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
}
