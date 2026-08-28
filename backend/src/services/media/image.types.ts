import {
  MediaProcessingError,
} from "./media.types";

/**
 * Image-specific contracts for the sharp-based processing service.
 *
 * Design notes:
 * - Every operation runs inside the shared media-job infrastructure
 *   (MediaJobsService), so jobs inherit TTL sweeping, concurrency caps,
 *   cancellation and single-consumer downloads.
 * - Output formats: JPEG/PNG/WebP are preserved; every other supported
 *   input (GIF/BMP/TIFF/AVIF) is delivered as PNG for broad compatibility.
 *   Background removal always produces PNG (alpha channel required).
 */

export type ImageFormat = "jpeg" | "png" | "webp";

export type ImageFitMode = "inside" | "cover" | "contain" | "fill";
const IMAGE_FIT_MODES: ImageFitMode[] = ["inside", "cover", "contain", "fill"];

export type FlipMode = "none" | "h" | "v";
const FLIP_MODES: FlipMode[] = ["none", "h", "v"];

/** Rotation in degrees clockwise; 0 means "no rotation". */
export type RotateDegrees = 0 | 90 | 180 | 270;
const ROTATE_DEGREES: RotateDegrees[] = [0, 90, 180, 270];

/** Blur/pixelate mode for the region editor tool. */
export type RegionEffect = "blur" | "pixelate";
const REGION_EFFECTS: RegionEffect[] = ["blur", "pixelate"];

/** Nine-grid anchor positions shared by watermark modes. */
export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
const WATERMARK_POSITIONS: WatermarkPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

// ---------------------------------------------------------------------------
// Limits (mirrored on the frontend; keep both sides in sync).
// ---------------------------------------------------------------------------

export const MIN_IMAGE_DIMENSION = 8;
export const MAX_IMAGE_DIMENSION = 7680;
/** Hard pixel budget guarding against decompression bombs. */
export const MAX_IMAGE_MEGAPIXELS = 100;
export const MIN_CROP_SIZE = 8;

export const ADJUST_LIMITS = {
  /** Percent, 100 = unchanged. */
  brightness: { min: 50, max: 150, default: 100 },
  /** Percent, 100 = unchanged. */
  saturation: { min: 0, max: 200, default: 100 },
  /** -100..100, 0 = unchanged. */
  contrast: { min: -100, max: 100, default: 0 },
  /** Gaussian sigma in pixels. */
  blur: { min: 0, max: 20, default: 0 },
  /** User-facing strength; mapped to a libvips sigma internally. */
  sharpen: { min: 0, max: 30, default: 0 },
} as const;

export const BLUR_REGION_LIMITS = {
  maxRegions: 20,
  intensity: { min: 2, max: 20, default: 6 },
} as const;

export const BG_REMOVE_LIMITS = {
  tolerance: { min: 1, max: 100, default: 25 },
} as const;

export const WATERMARK_LIMITS = {
  textMaxLength: 60,
  /** Font size as percent of the smaller output side. */
  fontSizePercent: { min: 3, max: 30, default: 8 },
  /** Logo width as percent of the base image width. */
  logoSizePercent: { min: 5, max: 50, default: 25 },
  opacityPercent: { min: 5, max: 100, default: 80 },
  rotationDeg: { min: -90, max: 90, default: 0 },
} as const;

export interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BlurRegion extends CropRegion {
  effect?: RegionEffect;
}

export type ValidatedBlurRegion = CropRegion;

export interface ImageAdjustments {
  brightness: number;
  saturation: number;
  contrast: number;
  blur: number;
  sharpen: number;
}

export interface TextWatermarkOptions {
  type: "text";
  text: string;
  fontSizePercent: number;
  opacityPercent: number;
  color: string;
  position: WatermarkPosition;
  rotationDeg: number;
}

export interface LogoWatermarkOptions {
  type: "image";
  logoPath: string;
  sizePercent: number;
  opacityPercent: number;
  position: WatermarkPosition;
  rotationDeg: number;
}

export type WatermarkOptions = TextWatermarkOptions | LogoWatermarkOptions;

// ---------------------------------------------------------------------------
// Validators — every controller field passes through one of these before it
// reaches the service layer.
// ---------------------------------------------------------------------------

function fail(code: MediaProcessingErrorCodeAlias, message: string): never {
  throw new MediaProcessingError(code, message, 400);
}

type MediaProcessingErrorCodeAlias =
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_CONVERSION"
  | "PROCESSING_FAILED"
  | "FILE_TOO_LARGE";

export function isImageFitMode(value: string): value is ImageFitMode {
  return (IMAGE_FIT_MODES as string[]).includes(value);
}

export function isFlipModeValue(value: string): value is FlipMode {
  return (FLIP_MODES as string[]).includes(value);
}

export function isRotateDegreesValue(value: number): value is RotateDegrees {
  return (ROTATE_DEGREES as number[]).includes(value);
}

export function isRegionEffect(value: string): value is RegionEffect {
  return (REGION_EFFECTS as string[]).includes(value);
}

export function isWatermarkPosition(value: string): value is WatermarkPosition {
  return (WATERMARK_POSITIONS as string[]).includes(value);
}

/** Whole number within [min, max]. */
export function parseBoundedInt(
  raw: unknown,
  min: number,
  max: number,
  label: string
): number {
  const value = typeof raw === "string" ? Number(raw.trim()) : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail("INVALID_CONVERSION", `${label} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

/** Whole number within [min, max]; returns `fallback` for absent/empty input. */
export function parseOptionalInt(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
  label: string
): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return parseBoundedInt(raw, min, max, label);
}

export function parseHexColor(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const value = raw.trim().toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) {
    fail("INVALID_CONVERSION", "Color must be a hex value such as #ffffff.");
  }
  // Expand #abc -> #aabbcc so downstream SVG rendering is uniform.
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value;
}

/** Parse and validate an absolute crop region against known image bounds. */
export function parseCropRegion(
  body: Record<string, unknown>,
  imageWidth: number,
  imageHeight: number
): CropRegion {
  const left = parseBoundedInt(body.left, 0, imageWidth - 1, "Crop left offset");
  const top = parseBoundedInt(body.top, 0, imageHeight - 1, "Crop top offset");
  const width = parseBoundedInt(body.width, MIN_CROP_SIZE, MAX_IMAGE_DIMENSION, "Crop width");
  const height = parseBoundedInt(body.height, MIN_CROP_SIZE, MAX_IMAGE_DIMENSION, "Crop height");
  if (left + width > imageWidth || top + height > imageHeight) {
    fail(
      "INVALID_CONVERSION",
      "The crop region extends beyond the image bounds."
    );
  }
  return { left, top, width, height };
}

/** Validate the JSON `regions` payload of the blur tool. */
export function parseBlurRegions(
  raw: unknown,
  imageWidth: number,
  imageHeight: number
): CropRegion[] {
  if (typeof raw !== "string" || raw.trim() === "") {
    fail("INVALID_CONVERSION", "Select at least one region to hide.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("INVALID_CONVERSION", "The regions payload is malformed.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail("INVALID_CONVERSION", "Select at least one region to hide.");
  }
  if (parsed.length > BLUR_REGION_LIMITS.maxRegions) {
    fail(
      "INVALID_CONVERSION",
      `You can hide up to ${BLUR_REGION_LIMITS.maxRegions} regions per image.`
    );
  }
  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      fail("INVALID_CONVERSION", `Region ${index + 1} is malformed.`);
    }
    const region = entry as Record<string, unknown>;
    const left = parseBoundedInt(region.left, 0, imageWidth - 1, `Region ${index + 1}: left`);
    const top = parseBoundedInt(region.top, 0, imageHeight - 1, `Region ${index + 1}: top`);
    const width = parseBoundedInt(region.width, MIN_CROP_SIZE, MAX_IMAGE_DIMENSION, `Region ${index + 1}: width`);
    const height = parseBoundedInt(region.height, MIN_CROP_SIZE, MAX_IMAGE_DIMENSION, `Region ${index + 1}: height`);
    if (left + width > imageWidth || top + height > imageHeight) {
      fail(
        "INVALID_CONVERSION",
        `Region ${index + 1} extends beyond the image bounds.`
      );
    }
    return { left, top, width, height };
  });
}
