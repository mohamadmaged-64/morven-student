// Shared types for the media (video/audio) processing services.

export type AudioFormat = "mp3" | "wav" | "m4a";

export type AudioQuality = "high" | "standard";

export type VideoFormat = "mp4" | "webm" | "mov" | "mkv";

export type CompressionPreset = "light" | "medium" | "strong";

export type ResizePresetKey = "1080p" | "720p" | "480p" | "360p" | "custom";

export type RotateDegrees = 0 | 90 | 180 | 270;

export type FlipMode = "none" | "h" | "v";

/** Audio-edit operation selected in the "Edit Video Audio" tool. */
export type AudioEditMode = "remove" | "replace" | "mix" | "volume";

export type MediaErrorCode =
  | "FFMPEG_NOT_AVAILABLE"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_CONVERSION"
  | "PROCESSING_TIMEOUT"
  | "PROCESSING_FAILED"
  | "CANCELLED"
  | "STORAGE_ERROR";

export class MediaProcessingError extends Error {
  readonly code: MediaErrorCode;
  readonly status: number;
  /**
   * Raw technical detail for INTERNAL branching/logging only (e.g. retry
   * strategies). Never included in API responses.
   */
  readonly detail?: string;

  constructor(code: MediaErrorCode, message: string, status = 500, detail?: string) {
    super(message);
    this.name = "MediaProcessingError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export function isAudioFormat(value: string): value is AudioFormat {
  return value === "mp3" || value === "wav" || value === "m4a";
}

export function isVideoFormat(value: string): value is VideoFormat {
  return (
    value === "mp4" || value === "webm" || value === "mov" || value === "mkv"
  );
}

export function isCompressionPreset(value: string): value is CompressionPreset {
  return value === "light" || value === "medium" || value === "strong";
}

export function isAudioQuality(value: string): value is AudioQuality {
  return value === "high" || value === "standard";
}

export function isResizePresetKey(value: string): value is ResizePresetKey {
  return (
    value === "1080p" ||
    value === "720p" ||
    value === "480p" ||
    value === "360p" ||
    value === "custom"
  );
}

export function isRotateDegrees(value: number): value is RotateDegrees {
  return value === 0 || value === 90 || value === 180 || value === 270;
}

export function isFlipMode(value: string): value is FlipMode {
  return value === "none" || value === "h" || value === "v";
}

export function isAudioEditMode(value: string): value is AudioEditMode {
  return (
    value === "remove" || value === "replace" || value === "mix" || value === "volume"
  );
}
