import path from "path";
import { readFile } from "fs-extra";
import type { ImageFormat } from "./image.types";

/** Upload extensions accepted for image tools (mirrored on the frontend). */
export const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".avif",
]);

const ALLOWED_IMAGE_MIME_PREFIXES = ["image/"];

/**
 * Two-factor upload validation (same policy as video/audio uploads):
 * the extension must be allow-listed AND the declared MIME type must be an
 * image type (or a generic octet-stream, which some browsers and HTTP
 * clients send for binary parts).
 */
export function isAllowedImageUpload(originalname: string, mimetype: string): boolean {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) return false;
  if (!mimetype || mimetype === "application/octet-stream") return true;
  return ALLOWED_IMAGE_MIME_PREFIXES.some((prefix) => mimetype.startsWith(prefix));
}

/**
 * Magic-byte verification: confirms the file content really is the image
 * format its extension claims. Blocks renamed executables/text and other
 * spoofing attempts before any decoder touches the file.
 */
export async function imageContentMatchesExtension(
  filePath: string,
  originalname: string
): Promise<boolean> {
  const ext = path.extname(originalname).toLowerCase();
  let head: Buffer;
  try {
    const handle = await import("fs").then((fs) => fs.promises.open(filePath, "r"));
    try {
      const buf = Buffer.alloc(16);
      await handle.read(buf, 0, 16, 0);
      head = buf;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case ".png":
      return (
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47
      );
    case ".gif":
      return head.slice(0, 4).toString("ascii") === "GIF8";
    case ".webp":
      return (
        head.slice(0, 4).toString("ascii") === "RIFF" &&
        head.slice(8, 12).toString("ascii") === "WEBP"
      );
    case ".bmp":
      return head[0] === 0x42 && head[1] === 0x4d;
    case ".tiff":
    case ".tif":
      return (
        (head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a) ||
        (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00)
      );
    case ".avif":
      return head.slice(4, 8).toString("ascii") === "ftyp" &&
        head.slice(8, 12).toString("ascii").startsWith("avif");
    default:
      return false;
  }
}

/**
 * Output container decision:
 * - JPEG/PNG/WebP inputs keep their format (quality-preserving defaults).
 * - Every other accepted input (GIF/BMP/TIFF/AVIF) becomes PNG so results
 *   open reliably everywhere. Background removal always returns PNG.
 */
export function outputFormatFor(originalname: string): ImageFormat {
  const ext = path.extname(originalname).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "jpeg";
  if (ext === ".webp") return "webp";
  if (ext === ".png") return "png";
  return "png";
}

export function extensionForFormat(format: ImageFormat): string {
  return format === "jpeg" ? ".jpg" : `.${format}`;
}

export const IMAGE_MIME: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
