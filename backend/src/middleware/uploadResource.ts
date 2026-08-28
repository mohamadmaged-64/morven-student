import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "uploads");
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch { /* ignore */ }

const MAX_RESOURCE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (app-wide upload limit)
const MAX_RESOURCE_FILES = 10;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    cb(null, `${unique}${ext}`);
  },
});

export const uploadResource = multer({
  storage,
  limits: { fileSize: MAX_RESOURCE_FILE_SIZE, files: MAX_RESOURCE_FILES },
});
