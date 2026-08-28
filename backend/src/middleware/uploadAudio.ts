import multer from "multer";
import path from "path";
import fs from "fs";
import { isAllowedAudioToolUpload } from "../services/media/audio.utils";
import { MediaProcessingError } from "../services/media/media.types";

const TEMP_DIR = path.resolve(__dirname, "..", "temp");

try {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch (err) {
  console.error("Failed to create temp directory:", err);
}

// Audio files are far smaller than videos; MAX_AUDIO_SIZE_MB raises the
// ceiling when a deployment allows longer recordings.
export const MAX_AUDIO_SIZE_BYTES =
  (Number(process.env.MAX_AUDIO_SIZE_MB) || 100) * 1024 * 1024;

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

function audioFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (!isAllowedAudioToolUpload(file.originalname, file.mimetype)) {
    cb(
      new MediaProcessingError(
        "UNSUPPORTED_FILE_TYPE",
        "Unsupported audio type. Please upload an MP3, WAV, M4A, AAC, OGG, OPUS, WEBM or FLAC file.",
        415
      )
    );
    return;
  }
  cb(null, true);
}

// Intersection augments @types/multer (written for multer 1.x) with the
// `defParamCharset` option that the installed multer 2.x runtime supports.
const uploadOptions: multer.Options & { defParamCharset?: string } = {
  // Decode multipart filenames as UTF-8 so Arabic names survive intact.
  defParamCharset: "utf8",
  storage,
  limits: { fileSize: MAX_AUDIO_SIZE_BYTES, files: 1 },
  fileFilter: audioFileFilter,
};

/** Single-file pipeline used by cut / enhance / clean / transcribe. */
export const uploadAudio = multer(uploadOptions);

/** Multi-file pipeline for the merge tool (field "files"). */
export function makeMultiAudioUpload(maxCount: number) {
  return multer({
    ...uploadOptions,
    limits: { fileSize: MAX_AUDIO_SIZE_BYTES, files: maxCount },
  });
}
