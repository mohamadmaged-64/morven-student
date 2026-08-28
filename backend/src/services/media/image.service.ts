import path from "path";
import { randomUUID } from "crypto";
import fs from "fs-extra";
import sharp from "sharp";
import type { Sharp, OverlayOptions } from "sharp";
import { MediaProcessingError } from "./media.types";
import type { FlipMode, RotateDegrees } from "./media.types";
import { mediaWorkRoot, cleanupJob } from "./media.service";
import type { MediaJobContext, MediaJobResult } from "./media.service";
import { extensionForFormat, outputFormatFor } from "./image.utils";
import type { ImageFormat } from "./image.types";
import type {
  BlurRegion,
  CropRegion,
  ImageAdjustments,
  ImageFitMode,
  ValidatedBlurRegion,
  WatermarkOptions,
} from "./image.types";
import {
  ADJUST_LIMITS,
  BG_REMOVE_LIMITS,
  BLUR_REGION_LIMITS,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_MEGAPIXELS,
  MIN_IMAGE_DIMENSION,
  WATERMARK_LIMITS,
} from "./image.types";

/**
 * Sharp-based image processing service.
 *
 * Every operation follows the same safety contract as the FFmpeg video
 * service: isolated random job directories under the shared media temp root,
 * hard timeouts, cooperative cancellation between stages, verified outputs
 * and full cleanup on failure. Progress is reported per stage (decode ->
 * transform -> encode) since libvips pipelines are not incrementally
 * observable.
 */

// Hard ceiling for one image operation. Even very large allowed inputs
// decode in seconds; this guards against pathological files.
const DEFAULT_TIMEOUT_MS =
  Number(process.env.IMAGE_TIMEOUT_MS) || 120 * 1000;

const ARABIC_RE = /[\u0600-\u06FF]/;

interface DecodedImage {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
}

function fail(code: "INVALID_CONVERSION" | "PROCESSING_FAILED" | "PROCESSING_TIMEOUT", message: string, status = 400): never {
  throw new MediaProcessingError(code, message, status);
}

/** Map unexpected decoder failures to safe, user-presentable messages. */
function mapSharpError(err: unknown): unknown {
  if (err instanceof MediaProcessingError) return err;
  return new MediaProcessingError(
    "PROCESSING_FAILED",
    "The uploaded image appears to be corrupted or is not a readable image.",
    500,
    err instanceof Error ? err.message : String(err)
  );
}

async function withTimeout<T>(task: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      task(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new MediaProcessingError(
                "PROCESSING_TIMEOUT",
                `Image processing exceeded ${Math.round(DEFAULT_TIMEOUT_MS / 1000)}s and was stopped.`,
                504
              )
            ),
          DEFAULT_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Cooperative cancellation checkpoint between pipeline stages. */
function assertNotAborted(ctx?: MediaJobContext): void {
  if (ctx?.signal?.aborted) {
    throw new MediaProcessingError("CANCELLED", "Processing cancelled.", 499);
  }
}

function emitProgress(ctx: MediaJobContext | undefined, fraction: number): void {
  ctx?.onProgress?.(Math.max(0, Math.min(0.99, fraction)));
}

/** Read header metadata, enforcing the megapixel decompression-bomb guard. */
async function decodeInfo(inputPath: string): Promise<DecodedImage> {
  try {
    const meta = await sharp(inputPath).metadata();
    if (!meta.width || !meta.height) {
      fail("PROCESSING_FAILED", "The uploaded image appears to be corrupted or is not a readable image.", 500);
    }
    const megapixels = (meta.width * meta.height) / 1_000_000;
    if (megapixels > MAX_IMAGE_MEGAPIXELS) {
      fail(
        "INVALID_CONVERSION",
        `This image is too large to process (${megapixels.toFixed(0)} megapixels). The limit is ${MAX_IMAGE_MEGAPIXELS} MP.`
      );
    }
    return {
      width: meta.width,
      height: meta.height,
      format: meta.format ?? "unknown",
      hasAlpha: Boolean(meta.hasAlpha),
    };
  } catch (err) {
    throw mapSharpError(err);
  }
}

/**
 * Header-only dimension probe used by controllers to validate pixel
 * coordinates (crop / blur regions) before a job is accepted. Throws the
 * same safe errors as processing when the file is unreadable.
 */
export async function probeImageInfo(inputPath: string): Promise<DecodedImage> {
  return decodeInfo(inputPath);
}

async function verifyOutput(outputPath: string): Promise<number> {
  const stat = await fs.stat(outputPath).catch(() => null);
  if (!stat || !stat.isFile() || stat.size === 0) {
    throw new MediaProcessingError(
      "PROCESSING_FAILED",
      "Processing finished but produced no output.",
      500
    );
  }
  // The result must itself be decodable before we hand it to the client.
  try {
    const meta = await sharp(outputPath).metadata();
    if (!meta.width || !meta.height) throw new Error("undecodable output");
  } catch {
    throw new MediaProcessingError(
      "PROCESSING_FAILED",
      "The processed image could not be verified. Please try again.",
      500
    );
  }
  return stat.size;
}

interface ImageJobRunResult {
  outputPath: string;
}

/**
 * Shared job shell: creates an isolated work directory under the shared
 * media temp root, runs the operation, verifies the artifact and cleans up
 * on any failure. Mirrors runMediaJob in media.service.ts.
 */
async function runImageJob(
  inputPaths: string[],
  process: (workDir: string) => Promise<ImageJobRunResult>,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const workDir = path.join(mediaWorkRoot, randomUUID());
  try {
    await fs.ensureDir(workDir);
    let totalBytes = 0;
    for (const p of inputPaths) {
      totalBytes += (await fs.stat(p)).size;
    }

    assertNotAborted(ctx);
    const { outputPath } = await withTimeout(() => process(workDir));

    const outputSize = await verifyOutput(outputPath);
    ctx?.onProgress?.(1);

    return { outputPath, workDir, originalSize: totalBytes, outputSize };
  } catch (err) {
    await cleanupJob(workDir);
    throw err instanceof MediaProcessingError ? err : mapSharpError(err);
  }
}

function encodeTo(
  pipeline: Sharp,
  outputPath: string,
  format: ImageFormat
): Sharp {
  switch (format) {
    case "jpeg":
      return pipeline.jpeg({ quality: 92, mozjpeg: true });
    case "webp":
      return pipeline.webp({ quality: 92 });
    case "png":
    default:
      return pipeline.png();
  }
}

function outputFileNameFor(base: string, suffix: string, format: ImageFormat): string {
  return `${base}${suffix}${extensionForFormat(format)}`;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** Remove-background: border-seeded flood fill over raw RGBA pixels. */
export async function removeImageBackground(
  inputPath: string,
  tolerancePercent: number,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.05);
    const info = await decodeInfo(inputPath);

    emitProgress(ctx, 0.15);
    const raw = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data } = raw;
    const W = info.width;
    const H = info.height;
    const stride = W * 4;

    // Reference background color = mean of the border ring.
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    const sampleBorder = (x: number, y: number): void => {
      const o = y * stride + x * 4;
      rSum += data[o];
      gSum += data[o + 1];
      bSum += data[o + 2];
      count += 1;
    };
    for (let x = 0; x < W; x++) {
      sampleBorder(x, 0);
      sampleBorder(x, H - 1);
    }
    for (let y = 1; y < H - 1; y++) {
      sampleBorder(0, y);
      sampleBorder(W - 1, y);
    }
    const refR = rSum / count;
    const refG = gSum / count;
    const refB = bSum / count;

    const maxDistance = 441.67; // sqrt(3) * 255
    const threshold = (tolerancePercent / 100) * maxDistance;
    const thresholdSq = threshold * threshold;

    const isBackgroundPixel = (o: number): boolean => {
      const dr = data[o] - refR;
      const dg = data[o + 1] - refG;
      const db = data[o + 2] - refB;
      return dr * dr + dg * dg + db * db <= thresholdSq || data[o + 3] < 16;
    };

    assertNotAborted(ctx);
    emitProgress(ctx, 0.35);

    // Flood fill (iterative DFS with an explicit index stack).
    const total = W * H;
    const visited = new Uint8Array(total);
    const stack = new Int32Array(total);
    let sp = 0;
    const pushIfBackground = (idx: number): void => {
      if (!visited[idx] && isBackgroundPixel(idx * 4)) {
        visited[idx] = 1;
        stack[sp++] = idx;
      }
    };
    for (let x = 0; x < W; x++) {
      pushIfBackground(x);
      pushIfBackground((H - 1) * W + x);
    }
    for (let y = 1; y < H - 1; y++) {
      pushIfBackground(y * W);
      pushIfBackground(y * W + W - 1);
    }

    let removed = 0;
    while (sp > 0) {
      const idx = stack[--sp];
      removed += 1;
      const x = idx % W;
      const y = (idx / W) | 0;
      if (x > 0) pushIfBackground(idx - 1);
      if (x < W - 1) pushIfBackground(idx + 1);
      if (y > 0) pushIfBackground(idx - W);
      if (y < H - 1) pushIfBackground(idx + W);
    }

    const removedFraction = removed / total;
    if (removedFraction < 0.0005) {
      fail(
        "INVALID_CONVERSION",
        "Could not detect a removable background in this image. Try increasing the tolerance."
      );
    }
    if (removedFraction > 0.995) {
      fail(
        "INVALID_CONVERSION",
        "Nearly the whole image matched the background color. Lower the tolerance and try again."
      );
    }

    // Clear alpha for background pixels.
    for (let idx = 0; idx < total; idx++) {
      if (visited[idx]) data[idx * 4 + 3] = 0;
    }

    assertNotAborted(ctx);
    emitProgress(ctx, 0.6);

    // Feather: soften ONLY the alpha plane so cut edges are not jagged.
    // Implemented as a small separable box blur to stay independent of
    // libvips band-expansion semantics for raw single-channel buffers.
    const alphaPlane = new Uint8Array(total);
    for (let idx = 0; idx < total; idx++) alphaPlane[idx] = data[idx * 4 + 3];
    const tmp = new Uint8Array(total);
    const softenedArr = new Uint8Array(total);
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const left = alphaPlane[row + (x > 0 ? x - 1 : 0)];
        const mid = alphaPlane[row + x];
        const right = alphaPlane[row + (x < W - 1 ? x + 1 : W - 1)];
        tmp[row + x] = (left + mid + right) / 3;
      }
    }
    for (let y = 0; y < H; y++) {
      const row = y * W;
      const upRow = (y > 0 ? y - 1 : 0) * W;
      const downRow = (y < H - 1 ? y + 1 : H - 1) * W;
      for (let x = 0; x < W; x++) {
        const up = tmp[upRow + x];
        const mid = tmp[row + x];
        const down = tmp[downRow + x];
        softenedArr[row + x] = (up + mid + down) / 3;
      }
    }
    for (let idx = 0; idx < total; idx++) {
      data[idx * 4 + 3] = Math.min(data[idx * 4 + 3], softenedArr[idx]);
    }

    assertNotAborted(ctx);
    emitProgress(ctx, 0.85);

    const outputPath = path.join(workDir, outputFileNameFor("image", "-no-bg", "png"));
    await sharp(data, {
      raw: { width: W, height: H, channels: 4 },
    })
      .png()
      .toFile(outputPath);

    return { outputPath };
  }, ctx);
}

/** Resize with aspect-preserving defaults and explicit fit control. */
export async function resizeImage(
  inputPath: string,
  options: {
    width?: number;
    height?: number;
    fit: ImageFitMode;
    allowUpscale: boolean;
  },
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.2);
    await decodeInfo(inputPath);

    emitProgress(ctx, 0.5);
    const outputPath = path.join(
      workDir,
      outputFileNameFor("image", "-resized", format)
    );
    const pipeline = sharp(inputPath).resize({
      width: options.width,
      height: options.height,
      fit: options.fit,
      kernel: "lanczos3",
      withoutEnlargement: !options.allowUpscale,
    });
    await encodeTo(pipeline, outputPath, format).toFile(outputPath);
    return { outputPath };
  }, ctx);
}

/** Crop an exact pixel rectangle. */
export async function cropImage(
  inputPath: string,
  region: CropRegion,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.25);
    await decodeInfo(inputPath);

    emitProgress(ctx, 0.55);
    const outputPath = path.join(
      workDir,
      outputFileNameFor("image", "-cropped", format)
    );
    await encodeTo(sharp(inputPath).extract(region), outputPath, format).toFile(
      outputPath
    );
    return { outputPath };
  }, ctx);
}

/** Rotate clockwise and/or mirror horizontally/vertically. */
export async function rotateImage(
  inputPath: string,
  options: { rotate: RotateDegrees; flip: FlipMode },
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.2);
    await decodeInfo(inputPath);

    emitProgress(ctx, 0.55);
    let pipeline = sharp(inputPath);
    if (options.rotate !== 0) {
      pipeline = pipeline.rotate(options.rotate, { background: "#00000000" });
    }
    if (options.flip === "h") pipeline = pipeline.flop();
    if (options.flip === "v") pipeline = pipeline.flip();

    const outputPath = path.join(
      workDir,
      outputFileNameFor("image", "-rotated", format)
    );
    await encodeTo(pipeline, outputPath, format).toFile(outputPath);
    return { outputPath };
  }, ctx);
}

/** Brightness/saturation/contrast/blur/sharpen adjustments in one pass. */
export async function adjustImage(
  inputPath: string,
  adjustments: ImageAdjustments,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.15);
    await decodeInfo(inputPath);

    emitProgress(ctx, 0.45);
    const { brightness, saturation, contrast, blur, sharpen } = adjustments;
    let pipeline = sharp(inputPath).modulate({
      brightness: brightness / 100,
      saturation: saturation / 100,
    });
    if (contrast !== ADJUST_LIMITS.contrast.default) {
      const a = (100 + contrast) / 100;
      pipeline = pipeline.linear(a, -(a - 1) * 128);
    }
    if (blur > 0) pipeline = pipeline.blur(Math.max(0.3, blur));
    if (sharpen > 0) {
      pipeline = pipeline.sharpen({
        sigma: Math.min(3, Math.max(0.5, sharpen / 10)),
      });
    }

    const outputPath = path.join(
      workDir,
      outputFileNameFor("image", "-adjusted", format)
    );
    await encodeTo(pipeline, outputPath, format).toFile(outputPath);
    return { outputPath };
  }, ctx);
}

/**
 * Hide selected rectangles behind a blur or pixelation effect. The effect
 * layer is generated once for the whole image, then each region is cut out
 * of it and composited back over the untouched original.
 */
export async function blurRegionsImage(
  inputPath: string,
  regions: ValidatedBlurRegion[],
  effect: "blur" | "pixelate",
  intensity: number,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.1);
    const info = await decodeInfo(inputPath);

    emitProgress(ctx, 0.3);
    // Lossless intermediate so repeated extracts/composites stay clean.
    const basePng = await sharp(inputPath).png().toBuffer();

    emitProgress(ctx, 0.5);
    assertNotAborted(ctx);
    const effectLayer =
      effect === "pixelate"
        ? await sharp(basePng)
            .resize(
              Math.max(1, Math.round(info.width / intensity)),
              Math.max(1, Math.round(info.height / intensity)),
              { fit: "fill", kernel: "nearest" }
            )
            .resize(info.width, info.height, { fit: "fill", kernel: "nearest" })
            .png()
            .toBuffer()
        : await sharp(basePng)
            .blur(Math.max(1, intensity * 0.8))
            .png()
            .toBuffer();

    const composites: OverlayOptions[] = [];
    for (let i = 0; i < regions.length; i++) {
      assertNotAborted(ctx);
      const region = regions[i];
      const patch = await sharp(effectLayer)
        .extract({
          left: region.left,
          top: region.top,
          width: region.width,
          height: region.height,
        })
        .png()
        .toBuffer();
      composites.push({
        input: patch,
        left: region.left,
        top: region.top,
      });
      emitProgress(ctx, 0.5 + (0.35 * (i + 1)) / regions.length);
    }

    const outputPath = path.join(
      workDir,
      outputFileNameFor("image", "-hidden", format)
    );
    await encodeTo(sharp(basePng).composite(composites), outputPath, format).toFile(
      outputPath
    );
    return { outputPath };
  }, ctx);
}

/** Nine-grid geometry shared by both watermark modes. */
function anchorFor(
  position: string,
  W: number,
  H: number,
  boxWidth: number,
  boxHeight: number
): { left: number; top: number; cssAnchor: "start" | "middle" | "end"; row: "top" | "center" | "bottom" } {
  const margin = Math.max(8, Math.round(Math.min(W, H) * 0.04));
  const horizontal = position.endsWith("left")
    ? "start"
    : position.endsWith("right")
      ? "end"
      : "middle";
  const row = position.startsWith("top")
    ? "top"
    : position.startsWith("bottom")
      ? "bottom"
      : "center";

  const left =
    horizontal === "start"
      ? margin
      : horizontal === "end"
        ? W - margin - boxWidth
        : Math.round((W - boxWidth) / 2);
  const top =
    row === "top"
      ? margin
      : row === "bottom"
        ? H - margin - boxHeight
        : Math.round((H - boxHeight) / 2);
  return { left, top, cssAnchor: horizontal, row };
}

/** Text watermark rendered through an SVG overlay composited by libvips. */
export async function watermarkWithText(
  inputPath: string,
  options: Extract<WatermarkOptions, { type: "text" }>,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.15);
    const info = await decodeInfo(inputPath);
    const W = info.width;
    const H = info.height;

    emitProgress(ctx, 0.45);
    const fontSize = Math.max(
      10,
      Math.round((Math.min(W, H) * options.fontSizePercent) / 100)
    );
    const margin = Math.max(8, Math.round(Math.min(W, H) * 0.04));
    const anchorX =
      options.position.endsWith("left")
        ? margin
        : options.position.endsWith("right")
          ? W - margin
          : Math.round(W / 2);
    const centerY =
      options.position.startsWith("top")
        ? margin + Math.round(fontSize * 0.5)
        : options.position.startsWith("bottom")
          ? H - margin - Math.round(fontSize * 0.5)
          : Math.round(H / 2);
    const textAnchor =
      options.position.endsWith("left")
        ? "start"
        : options.position.endsWith("right")
          ? "end"
          : "middle";

    const escapedText = options.text
      .replace(/[\r\n]+/g, " ")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
    const direction = ARABIC_RE.test(options.text) ? ' direction="rtl"' : "";
    const opacity = options.opacityPercent / 100;
    const weight = fontSize >= 24 ? "700" : "600";

    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <text x="${anchorX}" y="${centerY}"${direction} text-anchor="${textAnchor}" dominant-baseline="central" font-family="sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${options.color}" fill-opacity="${opacity}" transform="rotate(${options.rotationDeg} ${anchorX} ${centerY})">${escapedText}</text>
</svg>`
    );

    assertNotAborted(ctx);
    emitProgress(ctx, 0.7);
    const outputPath = path.join(
      workDir,
      outputFileNameFor("image", "-watermarked", format)
    );
    await encodeTo(sharp(inputPath).composite([{ input: svg }]), outputPath, format).toFile(
      outputPath
    );
    return { outputPath };
  }, ctx);
}

/** Logo/image watermark: resize, fade, rotate, then pin onto the nine grid. */
export async function watermarkWithLogo(
  inputPath: string,
  options: Extract<WatermarkOptions, { type: "image" }>,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob(
    [inputPath, options.logoPath],
    async (workDir) => {
      emitProgress(ctx, 0.1);
      const info = await decodeInfo(inputPath);
      const logoInfo = await decodeInfo(options.logoPath);
      void logoInfo;

      emitProgress(ctx, 0.35);
      const targetWidth = Math.max(
        MIN_IMAGE_DIMENSION,
        Math.min(MAX_IMAGE_DIMENSION, Math.round((info.width * options.sizePercent) / 100))
      );
      const fadedLogoRaw = await sharp(options.logoPath)
        .ensureAlpha()
        .resize({ width: targetWidth, withoutEnlargement: false })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Apply uniform opacity by scaling the alpha channel.
      const factor = options.opacityPercent / 100;
      const { data: logoData, info: logoRawInfo } = fadedLogoRaw;
      for (let o = 3; o < logoData.length; o += 4) {
        logoData[o] = Math.round(logoData[o] * factor);
      }

      let logoRotated = sharp(logoData, { raw: logoRawInfo });
      if (options.rotationDeg !== 0) {
        logoRotated = logoRotated.rotate(options.rotationDeg, {
          background: "#00000000",
        });
      }
      const logoPng = await logoRotated.png().toBuffer();
      const logoMeta = await sharp(logoPng).metadata();
      const logoW = logoMeta.width ?? targetWidth;
      const logoH = logoMeta.height ?? targetWidth;

      assertNotAborted(ctx);
      emitProgress(ctx, 0.65);
      const anchor = anchorFor(
        options.position,
        info.width,
        info.height,
        logoW,
        logoH
      );
      const left = Math.max(0, Math.min(info.width - logoW, anchor.left));
      const top = Math.max(0, Math.min(info.height - logoH, anchor.top));

      const outputPath = path.join(
        workDir,
        outputFileNameFor("image", "-watermarked", format)
      );
      await encodeTo(
        sharp(inputPath).composite([{ input: logoPng, left, top }]),
        outputPath,
        format
      ).toFile(outputPath);
      return { outputPath };
    },
    ctx
  );
}

/**
 * Metadata removal: sharp strips EXIF/GPS/XMP/IPTC by default. Auto-rotate
 * first so EXIF orientation is baked into the pixels and the visible image
 * never changes after the tags are gone.
 */
export async function stripImageMetadata(
  inputPath: string,
  ctx?: MediaJobContext
): Promise<MediaJobResult> {
  const format = outputFormatFor(inputPath);
  return runImageJob([inputPath], async (workDir) => {
    emitProgress(ctx, 0.25);
    await decodeInfo(inputPath);

    emitProgress(ctx, 0.6);
    const outputPath = path.join(
      workDir,
      outputFileNameFor("image", "-clean", format)
    );
    await encodeTo(sharp(inputPath).rotate(), outputPath, format).toFile(
      outputPath
    );
    return { outputPath };
  }, ctx);
}
