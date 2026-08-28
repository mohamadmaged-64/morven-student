import multer from "multer";
import path from "path";
import fs from "fs";
import { isAllowedImageUpload } from "../services/media/image.utils";
import { MediaProcessingError } from "../services/media/media.types";

// Images share the media temp root conventions (randomized names, UTF-8
// multipart decoding) but get their own, much smaller size budget.
const TEMP_DIR = path.resolve(__dirname, "..", "temp");

try {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (err) {
  console.error("Failed to create temp directory:", err);
}

export const MAX_IMAGE_SIZE_BYTES =
  (Number(process.env.MAX_IMAGE_SIZE_MB) || 50) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    // Randomized on-disk names; the original name never touches the filesystem.
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    cb(null, `${unique}${ext}`);
  },
});

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (!isAllowedImageUpload(file.originalname, file.mimetype)) {
    cb(
      new MediaProcessingError(
        "UNSUPPORTED_FILE_TYPE",
        "Unsupported media type. Please upload an image (JPG, PNG, WebP, GIF, BMP, TIFF or AVIF).",
        415
      )
    );
    return;
  }
  cb(null, true);
}

// Intersection augments @types/multer with the multer 2.x-only
// defParamCharset option (UTF-8 filenames, same rationale as video uploads).
const uploadOptions: multer.Options & { defParamCharset?: string } = {
  defParamCharset: "utf8",
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 2 },
  fileFilter: imageFileFilter,
};

/** Single-image upload used by every image tool endpoint. */
export const uploadImage = multer(uploadOptions);

/**
 * Watermark upload: field "file" is the base image and field "logo" the
 * optional watermark graphic; both pass through the image allow-list.
 */
export const uploadImageAndLogo = multer({
  ...uploadOptions,
}).fields([
  { name: "file", maxCount: 1 },
  { name: "logo", maxCount: 1 },
]);
