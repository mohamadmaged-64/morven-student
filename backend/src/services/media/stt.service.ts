import fs from "fs-extra";
import path from "path";

/**
 * Server-side speech-to-text powered by Whisper via transformers.js.
 *
 * - The model (default: Xenova/whisper-base, quantized ONNX) is downloaded
 *   once into HF_HOME and reused for the lifetime of the process.
 * - The pipeline instance itself is memoized; concurrent jobs share it.
 * - Model id and cache location are deployment-configurable through
 *   STT_MODEL / HF_HOME. Docker builds may preload the model with
 *   scripts/preload-stt-model.mjs so containers start offline-ready.
 */

const BACKEND_ROOT = path.resolve(__dirname, "..", "..", "..");
const MODEL_CACHE_DIR = process.env.HF_HOME || path.join(BACKEND_ROOT, ".models");
export const STT_MODEL_ID = process.env.STT_MODEL || "Xenova/whisper-base";

interface SttOptions {
  /** ISO language code ("ar", "en", ...); omit for auto-detection. */
  language?: string;
}

type SttPipeline = (
  samples: Float32Array,
  options?: SttOptions & { chunk_length_s?: number; stride_length_s?: number }
) => Promise<{ text?: string }>;

let pipelinePromise: Promise<SttPipeline> | null = null;

async function loadPipeline(): Promise<SttPipeline> {
  await fs.ensureDir(MODEL_CACHE_DIR);
  const mod = await import("@xenova/transformers");
  // transformers.js v2 derives its default cache dir from its own module
  // folder and ignores HF_HOME; point env.cacheDir at the deployment
  // cache explicitly so models survive dependency reinstalls.
  (mod as { env: { cacheDir?: string } }).env.cacheDir = MODEL_CACHE_DIR;
  const transcriber = await mod.pipeline(
    "automatic-speech-recognition",
    STT_MODEL_ID,
    { quantized: true }
  );
  console.log(`[stt] model ready (${STT_MODEL_ID})`);
  return transcriber as unknown as SttPipeline;
}

function getTranscriber(): Promise<SttPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = loadPipeline().catch((err) => {
      // Allow a later job to retry a failed/interrupted download.
      pipelinePromise = null;
      throw err;
    });
  }
  return pipelinePromise;
}

/**
 * Fire-and-forget model load (called at server startup). Moving the heavy
 * first-load off the request path keeps the event loop responsive when the
 * first transcription job arrives; failures are logged and retried lazily
 * by the first real job.
 */
export function warmupStt(): void {
  getTranscriber().catch((err) => {
    console.error(
      "[stt] model warmup failed (will retry on first use):",
      err instanceof Error ? err.message : String(err)
    );
  });
}

/**
 * Transcribe mono 16 kHz float PCM samples. Returns the trimmed transcript
 * ("" when nothing intelligible was recognized). Language selection is
 * validated upstream; "auto" simply omits the hint so Whisper detects it.
 */
export async function transcribeSamples(
  samples: Float32Array,
  options: SttOptions = {}
): Promise<string> {
  const transcriber = await getTranscriber();
  const opts: Parameters<SttPipeline>[1] = {
    chunk_length_s: 30,
    stride_length_s: 5,
  };
  if (options.language && options.language !== "auto") {
    opts.language = options.language;
    // Explicit transcription task keeps translation mode off.
    (opts as Record<string, unknown>).task = "transcribe";
  }
  const result = await transcriber(samples, opts);
  return (result?.text ?? "").trim();
}
