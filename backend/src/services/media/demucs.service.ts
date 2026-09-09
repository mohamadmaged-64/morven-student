import { spawn } from "child_process";
import path from "path";
import { MediaProcessingError } from "./media.types";

/**
 * Path to the persistent Python separation worker.
 * Resolves relative to the repo scripts/ folder: works in dev
 * (src/services/media -> <root>/scripts) and production builds
 * (dist/services/media -> <root>/scripts).
 */
const SEPARATION_WORKER =
  process.env.SEPARATION_WORKER_SCRIPT ||
  path.resolve(__dirname, "..", "..", "..", "scripts", "separate_vocals_worker.py");

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
// NOTE: a single worker is warm-started (model kept in memory), which also
// makes this the effective concurrency ceiling.
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

// ---------------------------------------------------------------------------
// Persistent worker management. The Demucs model is loaded once by a single
// Python process and kept warm between jobs, so per-job cost is only the
// actual separation (not the ~10-20s model reload). The worker consumes jobs
// serially over stdin/stdout as JSON lines. On abrupt exit it is respawned;
// a timeout kills it (SIGKILL) so the next job starts with a fresh model.
// ---------------------------------------------------------------------------

interface PendingSeparation {
  inputPath: string;
  outputPath: string;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
  /** A job line has been written to the worker stdin. */
  sent: boolean;
  /** The client already got a resolution (cancel/timeout) but the worker
   *  may still be processing this input — its slot in the FIFO is kept. */
  settled: boolean;
  resolve: () => void;
  reject: (err: unknown) => void;
  timer?: NodeJS.Timeout;
}

let workerChild: ReturnType<typeof spawn> | null = null;
const pendingJobs: PendingSeparation[] = [];
let workerStdoutBuffer = "";
let workerStderr = "";

function currentActiveJob(): PendingSeparation | undefined {
  return pendingJobs.find((j) => j.sent && !j.settled);
}

/** Spawn the worker process (model load happens on its side). */
function ensureWorker(): Promise<ReturnType<typeof spawn>> {
  return new Promise((resolve, reject) => {
    if (workerChild && workerChild.exitCode === null && !workerChild.killed) {
      resolve(workerChild);
      return;
    }

    const child = spawn(PYTHON_PATH, [SEPARATION_WORKER], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: separationEnv(),
    });
    workerChild = child;
    workerStdoutBuffer = "";
    workerStderr = "";

    child.on("error", (err) => {
      if (workerChild === child) workerChild = null;
      const unavailable = (err as NodeJS.ErrnoException).code === "ENOENT";
      rejectPendingJobs(
        new MediaProcessingError(
          "PROCESSING_FAILED",
          unavailable
            ? "Vocal separation service is not available on the server."
            : `Failed to start separation service: ${err.message}`,
          unavailable ? 503 : 500
        )
      );
      reject(err);
    });

    // Progress + error detail lives on stderr.
    child.stderr?.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      if (workerStderr.length < MAX_STDERR_BYTES) workerStderr += text;

      const active = currentActiveJob();
      if (!active?.onProgress) return;
      if (text.includes("Using") && text.includes("model")) {
        active.onProgress("Loading separation model...");
      } else if (text.includes("Separating")) {
        active.onProgress("Separating music from voice...");
      } else if (text.includes("Saving")) {
        active.onProgress("Saving vocals output...");
      } else if (text.includes("complete")) {
        active.onProgress("Separation complete");
      }
    });

    // One result line per job: {"ok": true} | {"ok": false, "error": "..."}.
    child.stdout?.on("data", (chunk: Buffer | string) => {
      if (workerChild !== child) return; // stale worker's output
      workerStdoutBuffer += String(chunk);
      let newline;
      while ((newline = workerStdoutBuffer.indexOf("\n")) >= 0) {
        const line = workerStdoutBuffer.slice(0, newline).trim();
        workerStdoutBuffer = workerStdoutBuffer.slice(newline + 1);
        if (line) handleWorkerResult(child, line);
      }
    });

    child.on("close", () => {
      const wasCurrent = workerChild === child;
      if (wasCurrent) workerChild = null;

      // Jobs already written to this worker will never be answered: reject.
      let i = pendingJobs.length;
      while (i--) {
        const job = pendingJobs[i];
        if (!job.sent) continue;
        if (job.timer) clearTimeout(job.timer);
        pendingJobs.splice(i, 1);
        if (!job.settled) {
          const detail = workerStderr.slice(-2000);
          console.error(
            `[demucs] worker exited unexpectedly\n${detail || "no stderr"}`
          );
          job.reject(
            new MediaProcessingError(
              "PROCESSING_FAILED",
              "Audio source separation failed. The file may be corrupted or unsupported.",
              500,
              detail
            )
          );
        }
      }

      // Spawn a fresh worker if jobs are still queued.
      if (pendingJobs.some((j) => !j.settled)) {
        void ensureWorker()
          .then((next) => pumpWorker(next))
          .catch(() => {});
      }
    });

    // Success path.
    resolve(child);
  });
}

function handleWorkerResult(
  child: ReturnType<typeof spawn>,
  line: string
): void {
  if (workerChild !== child) return; // stale response
  const idx = pendingJobs.findIndex((j) => j.sent);
  if (idx < 0) return;
  const [job] = pendingJobs.splice(idx, 1);
  if (job.timer) clearTimeout(job.timer);

  if (job.settled) {
    // Client cancelled; the worker still computed it. Drop quietly.
    pumpWorker(child);
    return;
  }

  let parsed: { ok?: boolean; error?: string };
  try {
    parsed = JSON.parse(line) as { ok?: boolean; error?: string };
  } catch {
    const detail = workerStderr.slice(-2000);
    job.reject(
      new MediaProcessingError(
        "PROCESSING_FAILED",
        "Audio source separation failed. The file may be corrupted or unsupported.",
        500,
        detail
      )
    );
    pumpWorker(child);
    return;
  }

  if (parsed.ok) {
    job.resolve();
  } else {
    const detail = String(parsed.error ?? workerStderr).slice(-2000);
    console.error(`[demucs] separation failed: ${detail}`);
    job.reject(
      new MediaProcessingError(
        "PROCESSING_FAILED",
        "Audio source separation failed. The file may be corrupted or unsupported.",
        500,
        detail
      )
    );
  }
  pumpWorker(child);
}

/** Write the next unsent job to the worker stdin (worker processes serially). */
function pumpWorker(child: ReturnType<typeof spawn>): void {
  if (workerChild !== child || !child.stdin || child.stdin.destroyed) return;
  const job = pendingJobs.find((j) => !j.sent);
  if (!job) return;

  const line = JSON.stringify({ input: job.inputPath, output: job.outputPath });
  const flushed = child.stdin.write(line + "\n");
  if (flushed) {
    markSent(child, job);
  } else {
    child.stdin.once("drain", () => markSent(child, job));
  }
}

function markSent(child: ReturnType<typeof spawn>, job: PendingSeparation): void {
  if (workerChild !== child || job.sent || job.settled) return;
  job.sent = true;
  job.timer = setTimeout(() => {
    const idx = pendingJobs.indexOf(job);
    if (idx >= 0) pendingJobs.splice(idx, 1);
    if (!job.settled) {
      job.reject(
        new MediaProcessingError(
          "PROCESSING_TIMEOUT",
          `Vocal separation exceeded ${Math.round(SEPARATION_TIMEOUT_MS / 1000)}s and was stopped.`,
          504
        )
      );
    }
    // The running separation cannot be interrupted mid-flight: kill the
    // worker; the next job will spawn a fresh one with a warm cache.
    const victim = workerChild;
    workerChild = null;
    try {
      victim?.kill("SIGKILL");
    } catch {
      // Already dead.
    }
  }, SEPARATION_TIMEOUT_MS);
  job.timer.unref?.();
}

function rejectPendingJobs(err: MediaProcessingError): void {
  for (const job of pendingJobs.splice(0)) {
    if (job.timer) clearTimeout(job.timer);
    if (!job.settled) job.reject(err);
  }
}

/** Run one separation against the persistent worker. */
function runJobOnWorker(
  inputPath: string,
  outputPath: string,
  options?: { signal?: AbortSignal; onProgress?: (stage: string) => void }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const job: PendingSeparation = {
      inputPath,
      outputPath,
      signal: options?.signal,
      onProgress: options?.onProgress,
      sent: false,
      settled: false,
      resolve,
      reject,
    };
    pendingJobs.push(job);

    const onAbort = () => {
      job.signal?.removeEventListener("abort", onAbort);
      if (job.settled) return;
      job.settled = true;
      reject(new MediaProcessingError("CANCELLED", "Processing cancelled.", 499));
      // Keep the FIFO slot aligned with the worker's serial responses.
    };
    job.signal?.addEventListener("abort", onAbort, { once: true });

    void ensureWorker()
      .then((child) => pumpWorker(child))
      .catch(() => {
        const idx = pendingJobs.indexOf(job);
        if (idx >= 0) pendingJobs.splice(idx, 1);
        job.signal?.removeEventListener("abort", onAbort);
        if (!job.settled) {
          job.reject(
            new MediaProcessingError(
              "PROCESSING_FAILED",
              "Vocal separation service is not available on the server.",
              503
            )
          );
        }
      });
  });
}

/** Run the Demucs separation with cancellation + bounded concurrency. */
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
    await runJobOnWorker(inputPath, outputPath, options);
  } finally {
    release();
  }
}