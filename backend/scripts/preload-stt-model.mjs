import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Downloads the Whisper ONNX model into the backend model cache so that
 * production containers can serve speech-to-text without runtime network
 * access. Safe to run repeatedly (the cache is content-addressed) and safe
 * to skip on offline machines (`|| echo` in the Dockerfile).
 */
const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const modelCacheDir = path.join(backendRoot, ".models");

const mod = await import("@xenova/transformers");
mod.env.cacheDir = modelCacheDir;

await mod.pipeline(
  "automatic-speech-recognition",
  process.env.STT_MODEL || "Xenova/whisper-base",
  { quantized: true }
);
console.log(`[stt] model preloaded into ${modelCacheDir}`);
