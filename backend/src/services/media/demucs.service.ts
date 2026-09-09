import { spawn } from "child_process";
import path from "path";
import { MediaProcessingError } from "./media.types";

/**
 * Path to the Python separation script.
 * Resolves relative to the repo scripts/ folder: works in dev
 * (src/services/media -> <root>/scripts) and production builds
 * (dist/services/media -> <root>/scripts).
 */
const SEPARATION_SCRIPT =
  process.env.SEPARATION_SCRIPT_PATH ||
  path.resolve(__dirname, "..", "..", "..", "scripts", "separate_vocals.py");

const PYTHON_PATH = process.env.PYTHON_PATH || "python3";

/** Where Demucs/torch keeps the preloaded model (see Dockerfile + preload script). */
const TORCH_HOME =
  process.env.TORCH_HOME ||
  path.resolve(__dirname, "..", "..", "..", ".model-cache", "torch");

/** Spawn environment for separation runs (torch model cache + inherited). */
function separationEnv(): NodeJS.ProcessEnv {
  return { ...process.env, TORCH_HOME };
}

const SEPARATION_TIMEOUT_MS =
  Number(process.env.SEPARATION_TIMEOUT_MS) || 25 * 60 * 1000; // default: 25 minutes

const MAX_STDERR_BYTES = 64 * 1024;

// Demucs is extremely CPU/RAM intensive, so never run more than a small
// number of separations at once. Other (FFmpeg) media jobs are unaffected.
const MAX_CONCURRENT_SEPARATIONS =
  Number(process.env.MAX_CONCURRENT_SEPARATIONS) || 1;

let activeSeparations = 0;
const pendingSlots: Array<() => void> = [];

/**
 * Bounded semaphore: blocks until a separation slot is free. The returned
 * function releases the slot (idempotent). Respects an AbortSignal so a
 * client cancellation can leave the queue instead of hanging forever.
 */
async function acquireSeparationSlot(
  signal?: AbortSignal
): Promise<() => void> {
  if (signal?.aborted) {
    throw new MediaProcessingError("CANCELLED", "Processing cancelled.", 499);
  }
  if (activeSeparations < MAX_CONCURRENT_SEPARATIONS) {
    activeSeparations++;
    return releaseSeparationSlot;
  }
  return new Promise<() => void>((resolve, reject) => {
    const onAbort = () => {
      const idx = pendingSlots.indexOf(entry);
      if (idx >= 0) pendingSlots.splice(idx, 1);
      reject(
        new MediaProcessingError("CANCELLED", "Processing cancelled.", 499)
      );
    };
    const entry = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve(releaseSeparationSlot);
    };
    pendingSlots.push(entry);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function releaseSeparationSlot(): void {
  activeSeparations = Math.max(0, activeSeparations - 1);
  if (pendingSlots.length > 0 && activeSeparations < MAX_CONCURRENT_SEPARATIONS) {
    const next = pendingSlots.shift()!;
    activeSeparations++;
    next();
  }
}

/**
 * Check whether Python and Demucs are available on this system.
 * Returns true only when both the Python binary and the demucs package
 * can be found.
 */
export async function isDemucsAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      PYTHON_PATH,
      ["-c", "import demucs; print('ok')"],
      { stdio: "ignore", windowsHide: true, env: separationEnv() }
    );
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

/** Run the Demucs script with cancellation + bounded concurrency. */
export async function runDemucsSeparation(
  inputPath: string,
  outputPath: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (stage: string) => void;
  }
): Promise<void> {
  const release = await acquireSeparationSlot(options?.signal);
  try {
    await runSeparationProcess(inputPath, outputPath, options);
  } finally {
    release();
  }
}

/**
 * Execute the Python separation script (spawned directly, no shell).
 * Cancellation and timeouts kill the child process; stderr is captured
 * (bounded) and used only for server-side logging.
 */
async function runSeparationProcess(
  inputPath: string,
  outputPath: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (stage: string) => void;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    options?.onProgress?.("Starting vocal separation...");

    const child = spawn(
      PYTHON_PATH,
      [SEPARATION_SCRIPT, inputPath, outputPath],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: separationEnv(),
      }
    );

    let stderr = "";
    let settled = false;

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options?.signal?.removeEventListener("abort", onAbort);
      settle();
    };

    const killProcess = () => {
      try {
        child.kill("SIGKILL");
      } catch {
        // Already dead.
      }
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new MediaProcessingError(
            "PROCESSING_TIMEOUT",
            `Vocal separation exceeded ${Math.round(SEPARATION_TIMEOUT_MS / 1000)}s and was stopped.`,
            504
          )
        )
      );
      killProcess();
    }, SEPARATION_TIMEOUT_MS);

    const onAbort = () => {
      finish(() =>
        reject(
          new MediaProcessingError("CANCELLED", "Processing cancelled.", 499)
        )
      );
      killProcess();
    };
    options?.signal?.addEventListener("abort", onAbort, { once: true });

    // Parse stdout for progress updates.
    child.stdout.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const text = String(chunk);
      if (text.includes("Separated")) {
        options?.onProgress?.("Separation complete, saving...");
      }
    });

    // Demucs writes most progress to stderr.
    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      if (stderr.length < MAX_STDERR_BYTES) stderr += text;

      if (text.includes("Using") && text.includes("model")) {
        options?.onProgress?.("Loading separation model...");
      } else if (text.includes("Separating") || text.includes("100%")) {
        options?.onProgress?.("Separating music from voice...");
      }
    });

    child.on("error", (err) => {
      killProcess();
      finish(() => {
        const code = (err as NodeJS.ErrnoException).code === "ENOENT";
        reject(
          new MediaProcessingError(
            "PROCESSING_FAILED",
            code
              ? "Vocal separation service is not available on the server."
              : `Failed to start separation process: ${err.message}`,
            code ? 503 : 500
          )
        );
      });
    });

    child.on("close", (exitCode) => {
      finish(() => {
        if (exitCode === 0) {
          options?.onProgress?.("Separation complete");
          resolve();
          return;
        }
        const detail = stderr.slice(-2000);
        console.error(`[demucs] exited with code ${exitCode}\n${detail}`);
        reject(
          new MediaProcessingError(
            "PROCESSING_FAILED",
            "Audio source separation failed. The file may be corrupted or unsupported.",
            500,
            detail
          )
        );
      });
    });
  });
}