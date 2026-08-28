// Shared types, bounds and guards for the dedicated audio tools
// (cut / enhance / clean / merge / speech-to-text).

/** Output/working formats accepted across the audio tools. */
export type AudioToolFormat =
  | "mp3"
  | "wav"
  | "m4a"
  | "ogg"
  | "opus"
  | "webm"
  | "flac"
  | "aac";

/** Noise-reduction strength presets for the "clean audio" tool. */
export type AudioCleanStrength = "light" | "medium" | "strong";

/**
 * Languages accepted by the speech-to-text tool. Whisper is multilingual;
 * "auto" lets the model detect the spoken language itself.
 */
export const STT_LANGUAGES = [
  "auto",
  "ar",
  "en",
  "fr",
  "es",
  "de",
  "tr",
  "it",
  "pt",
  "ru",
  "fa",
  "ur",
  "hi",
  "zh",
  "ja",
] as const;
export type SttLanguage = (typeof STT_LANGUAGES)[number];

// ─── Bounds ─────────────────────────────────────────────────────────

/** Per-side fade length cap for the enhance tool (seconds). */
export const AUDIO_FADE_MAX_SECONDS = 10;

/** Merge tool file-count window (UI + API). */
export const MIN_AUDIO_MERGE_FILES = 2;
export const MAX_AUDIO_MERGE_FILES = 10;

/** Minimum selectable segment length, mirroring the video cut tool. */
export const MIN_AUDIO_CUT_SECONDS = 0.1;

/**
 * Hard ceiling on audio length accepted by the speech-to-text tool.
 * Keeps Whisper CPU time and memory bounded; override per deployment.
 */
export const DEFAULT_MAX_STT_DURATION_SECONDS = 15 * 60;

/**
 * Decoded-sample peak below which the clip is treated as digital silence:
 * inference is skipped entirely because Whisper tends to hallucinate
 * plausible sentences when fed pure silence.
 */
export const SILENCE_PEAK_THRESHOLD = 0.005;

/** Clips shorter than this (seconds) are treated as "nothing to transcribe". */
export const MIN_STT_SPEECH_SECONDS = 0.2;

// ─── Guards ─────────────────────────────────────────────────────────

const AUDIO_TOOL_FORMATS: readonly AudioToolFormat[] = [
  "mp3",
  "wav",
  "m4a",
  "ogg",
  "opus",
  "webm",
  "flac",
  "aac",
];

export function isAudioToolFormat(value: string): value is AudioToolFormat {
  return (AUDIO_TOOL_FORMATS as readonly string[]).includes(value);
}

export function isAudioCleanStrength(
  value: string
): value is AudioCleanStrength {
  return value === "light" || value === "medium" || value === "strong";
}

export function isSttLanguage(value: string): value is SttLanguage {
  return (STT_LANGUAGES as readonly string[]).includes(value);
}

/** Parse a non-negative bounded seconds value; null when invalid. */
export function parseBoundedSeconds(
  value: unknown,
  maxSeconds: number
): number | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0 || num > maxSeconds) return null;
  return num;
}
