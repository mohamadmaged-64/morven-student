import { spawn } from "child_process";
import {
  MediaProcessingError,
} from "./media.types";

// FFmpeg binary resolution:
// 1. FFMPEG_PATH environment variable (recommended for production).
// 2. "ffmpeg" resolved from the system PATH (Linux containers, dev machines
//    with ffmpeg on PATH). No machine-specific paths are hard-coded.
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

// ffprobe ships with every standard FFmpeg distribution (including the
// Debian ffmpeg package used by the production Docker image). It can be
// overridden independently for exotic setups.
const FFPROBE_PATH = process.env.FFPROBE_PATH || "ffprobe";

// Hard ceiling for a single FFmpeg run. Large videos need several minutes,
// so this is deliberately generous and configurable via FFMPEG_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS =
  Number(process.env.FFMPEG_TIMEOUT_MS) || 15 * 60 * 1000;

// Cap captured stderr so huge logs cannot exhaust memory; full output is
// only used server-side for logging/diagnostics.
const MAX_STDERR_BYTES = 64 * 1024;

export type FfmpegEvent =
  | { type: "duration"; seconds: number }
  | { type: "time"; seconds: number };

export interface RunFfmpegOptions {
  timeoutMs?: number;
  /** Aborting the signal kills the ffmpeg process immediately. */
  signal?: AbortSignal;
  /**
   * Real progress events derived from ffmpeg's own metadata:
   * - "duration" is parsed from ffmpeg's input analysis.
   * - "time" reports processed output time in seconds.
   */
  onEvent?: (event: FfmpegEvent) => void;
}

export interface FfmpegRunResult {
  stderr: string;
}

/** Cheap availability probe (`ffmpeg -version`). */
export function isFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(FFMPEG_PATH, ["-version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

function parseClockToSeconds(clock: string): number | null {
  // Format: [-][HH:]MM:SS[.m...]
  const match = clock.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (!Number.isFinite(hours + minutes + seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Execute FFmpeg safely.
 *
 * Security properties:
 * - The binary is spawned directly (no shell), arguments are passed as an
 *   argv array, so user-controlled values can never inject shell commands.
 * - stdin is disabled (-nostdin).
 * - stdout carries ffmpeg's machine-readable `-progress` report, which we
 *   parse to emit REAL progress derived from ffmpeg metadata.
 * - stderr is captured (bounded) and returned; callers log it server-side.
 * - A hard timeout kills the process and surfaces PROCESSING_TIMEOUT.
 * - An abort signal kills the process for cancellation handling.
 */
export function runFfmpeg(
  args: string[],
  options: RunFfmpegOptions = {}
): Promise<FfmpegRunResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<FfmpegRunResult>((resolve, reject) => {
    const child = spawn(
      FFMPEG_PATH,
      [
        "-hide_banner",
        "-nostdin",
        "-loglevel",
        "info",
        "-y",
        "-progress",
        "pipe:1",
        "-nostats",
        ...args,
      ],
      { windowsHide: true }
    );

    let stderr = "";
    let settled = false;
    let durationSeconds: number | null = null;

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      settle();
    };

    const killProcess = () => {
      try {
        child.kill("SIGKILL");
      } catch {
        // Process may already be dead.
      }
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new MediaProcessingError(
            "PROCESSING_TIMEOUT",
            `FFmpeg processing exceeded ${Math.round(timeoutMs / 1000)}s and was stopped.`,
            504
          )
        )
      );
      killProcess();
    }, timeoutMs);

    const onAbort = () => {
      finish(() =>
        reject(new MediaProcessingError("CANCELLED", "Processing cancelled.", 499))
      );
      killProcess();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    // `-progress pipe` writes key=value lines such as:
    //   out_time_ms=1530000   (microseconds, despite the name)
    //   out_time=00:00:01.530000
    //   progress=continue|end
    child.stdout.on("data", (chunk: Buffer | string) => {
      if (settled || !options.onEvent) return;
      const text = String(chunk);
      const timeMatch = text.match(/out_time=(\S+)/);
      if (timeMatch) {
        const seconds = parseClockToSeconds(timeMatch[1]);
        if (seconds !== null) options.onEvent({ type: "time", seconds });
      } else {
        // Older builds only provide out_time_ms (microseconds).
        const msMatch = text.match(/^out_time_ms=(\d+)/m);
        if (msMatch) {
          options.onEvent({ type: "time", seconds: Number(msMatch[1]) / 1e6 });
        }
      }
      if (/^progress=end/m.test(text)) {
        options.onEvent({ type: "time", seconds: durationSeconds ?? Infinity });
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      if (stderr.length < MAX_STDERR_BYTES) stderr += text;

      if (options.onEvent && durationSeconds === null) {
        // Example: "Duration: 00:00:12.04, start: 0.000000, bitrate: ..."
        const durationMatch = text.match(
          /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/
        );
        if (durationMatch) {
          const seconds =
            Number(durationMatch[1]) * 3600 +
            Number(durationMatch[2]) * 60 +
            Number(durationMatch[3]);
          if (Number.isFinite(seconds) && seconds > 0) {
            durationSeconds = seconds;
            options.onEvent({ type: "duration", seconds });
          }
        }
      }
    });

    child.on("error", (err) => {
      killProcess();
      finish(() => {
        const code = (err as NodeJS.ErrnoException).code === "ENOENT";
        console.error("[ffmpeg] spawn failed:", err.message);
        reject(
          new MediaProcessingError(
            code ? "FFMPEG_NOT_AVAILABLE" : "PROCESSING_FAILED",
            code
              ? "FFmpeg is not installed or FFMPEG_PATH is invalid."
              : "Failed to start FFmpeg.",
            code ? 503 : 500
          )
        );
      });
    });

    child.on("close", (exitCode) => {
      finish(() => {
        if (exitCode === 0) {
          resolve({ stderr });
          return;
        }
        // Full technical detail stays in server logs only.
        console.error(
          `[ffmpeg] exited with code ${exitCode}\n${stderr.slice(-4096)}`
        );
        reject(
          new MediaProcessingError(
            "PROCESSING_FAILED",
            summarizeFfmpegFailure(stderr),
            500,
            stderr.slice(-4096)
          )
        );
      });
    });
  });
}

/**
 * Translate known ffmpeg failure signatures into short, safe messages that
 * can be shown to users. Raw stderr is never sent to clients.
 */
export function summarizeFfmpegFailure(stderr: string): string {
  const lower = stderr.toLowerCase();
  if (lower.includes("invalid data found when processing input")) {
    return "The uploaded media file appears to be corrupted.";
  }
  if (
    lower.includes("matches no streams") ||
    lower.includes("does not match any streams") ||
    lower.includes("output file #0 does not contain any stream")
  ) {
    return "The requested operation is not possible for this file (e.g. no audio track).";
  }
  if (lower.includes("unknown encoder") || lower.includes("encoder")) {
    return "The required codec is unavailable on the server.";
  }
  if (lower.includes("no space left on device")) {
    return "Not enough disk space on the processing server.";
  }
  return "Media processing failed unexpectedly.";
}

export interface MediaProbeInfo {
  hasAudio: boolean;
  /** Duration in seconds when it could be determined, else null. */
  durationSeconds: number | null;
  /** Video stream pixel dimensions when known. */
  width?: number;
  height?: number;
  /** Source frame rate when known (e.g. 25, 29.97). */
  fps?: number;
}

interface ProbeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
}

interface ProbePayload {
  format?: { duration?: string };
  streams?: ProbeStream[];
}

function runProbe(args: string[], timeoutMs = 20000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFPROBE_PATH, ["-v", "error", ...args], {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // Already dead.
      }
      reject(new Error("probe timeout"));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.slice(-500) || `ffprobe exited with ${code}`));
    });
  });
}

let ffprobeAvailable: boolean | null = null;

/** Cheap availability probe (`ffprobe -version`), cached per process. */
export function isFfprobeAvailable(): Promise<boolean> {
  if (ffprobeAvailable !== null) return Promise.resolve(ffprobeAvailable);
  return new Promise((resolve) => {
    const child = spawn(FFPROBE_PATH, ["-version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => {
      ffprobeAvailable = false;
      resolve(false);
    });
    child.on("close", (code) => {
      ffprobeAvailable = code === 0;
      resolve(ffprobeAvailable);
    });
  });
}

/**
 * Probe a media file for stream layout and duration.
 * Returns null when ffprobe is unavailable or the file cannot be parsed —
 * callers must treat null as "unknown" and degrade safely, never leak
 * probe details to users.
 */
export async function probeMediaInfo(
  inputPath: string
): Promise<MediaProbeInfo | null> {
  try {
    const available = await isFfprobeAvailable();
    if (!available) return null;

    const stdout = await runProbe([
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      inputPath,
    ]);

    let payload: ProbePayload;
    try {
      payload = JSON.parse(stdout) as ProbePayload;
    } catch {
      return null;
    }

    const streams = payload.streams ?? [];
    const hasAudio = streams.some((s) => s?.codec_type === "audio");
    const video = streams.find((s) => s?.codec_type === "video");
    const rawDuration = payload.format?.duration;
    const durationSeconds =
      typeof rawDuration === "string" && Number.isFinite(Number(rawDuration))
        ? Number(rawDuration)
        : null;

    let fps: number | undefined;
    if (typeof video?.avg_frame_rate === "string") {
      const [num, den] = video.avg_frame_rate.split("/").map(Number);
      if (Number.isFinite(num) && Number.isFinite(den) && den > 0 && num > 0) {
        fps = num / den;
      }
    }

    return {
      hasAudio,
      durationSeconds,
      width: typeof video?.width === "number" ? video.width : undefined,
      height: typeof video?.height === "number" ? video.height : undefined,
      fps,
    };
  } catch {
    return null;
  }
}
