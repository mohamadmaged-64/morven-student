import multer from "multer";
import path from "path";
import fs from "fs";
import { isAllowedVideoUpload, isAllowedAudioUpload } from "../services/media/media.utils";
import { MediaProcessingError } from "../services/media/media.types";

const TEMP_DIR = path.resolve(__dirname, "..", "temp");

try {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (err) {
  console.error("Failed to create temp directory:", err);
}

// Video files are much larger than documents; override with
// MAX_VIDEO_SIZE_MB when the deployment allows bigger uploads.
export const MAX_VIDEO_SIZE_BYTES =
  (Number(process.env.MAX_VIDEO_SIZE_MB) || 500) * 1024 * 1024;

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

/**
 * Multer pipeline for video uploads:
 * - randomized temp filenames
 * - extension allow-list + video/* MIME validation
 * - hard size limit
 */
// Intersection augments @types/multer (written for multer 1.x) with the
// `defParamCharset` option that the installed multer 2.x runtime supports
// and documents in its README.
const uploadOptions: multer.Options & { defParamCharset?: string } = {
  // Decode multipart filenames as UTF-8 (browsers send raw UTF-8 bytes in
  // filename=). Without this, multer defaults to latin1 and Arabic names
  // arrive mojibaked, degrading download names to the generic fallback.
  defParamCharset: "utf8",
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedVideoUpload(file.originalname, file.mimetype)) {
      cb(
        new MediaProcessingError(
          "UNSUPPORTED_FILE_TYPE",
          "Unsupported media type. Please upload a video file.",
          415
        )
      );
      return;
    }
    cb(null, true);
  },
};

export const uploadVideo = multer(uploadOptions);

/**
 * Multi-video upload (merge tool): same validation as single uploads, but
 * accepts up to `maxCount` files under one multipart field.
 */
export function makeMultiVideoUpload(maxCount: number) {
  const instance = multer({
    ...uploadOptions,
    limits: { fileSize: MAX_VIDEO_SIZE_BYTES, files: maxCount },
  });
  return instance;
}

/** Validator for the auxiliary audio upload (add/replace audio tool). */
function audioFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (!isAllowedAudioUpload(file.originalname, file.mimetype)) {
    cb(
      new MediaProcessingError(
        "UNSUPPORTED_FILE_TYPE",
        "Unsupported audio type. Please upload an MP3, WAV, M4A, AAC, OGG, OPUS or FLAC file.",
        415
      )
    );
    return;
  }
  cb(null, true);
}

/**
 * Video + optional external audio track in one request:
 * - field "file": the video (video allow-list)
 * - field "audio": an optional audio file (audio allow-list)
 * Multer applies one filter to every part, so we branch on fieldname.
 */
export const uploadVideoAndOptionalAudio = multer({
  ...uploadOptions,
  limits: { fileSize: MAX_VIDEO_SIZE_BYTES, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "audio") {
      audioFileFilter(_req, file, cb);
      return;
    }
    if (!isAllowedVideoUpload(file.originalname, file.mimetype)) {
      cb(
        new MediaProcessingError(
          "UNSUPPORTED_FILE_TYPE",
          "Unsupported media type. Please upload a video file.",
          415
        )
      );
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "audio", maxCount: 1 },
]);
