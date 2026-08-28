import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".fixtures"
);

/**
 * Generate small real media fixtures with FFmpeg itself (no binary blobs in
 * the repo). Cached across runs; pass force=true to regenerate.
 *
 * - video-mp4.mp4 : 3s 640x360 H.264/AAC test pattern with a sine tone
 * - video-large-quality.mp4 : 12s 1280x720 very-high-bitrate H.264/AAC
 *   (compresses dramatically -> meaningful compression assertions)
 * - corrupted.mp4 : random bytes that ffmpeg cannot decode
 */
export async function ensureFixtures(ffmpegPath, { force = false } = {}) {
  await mkdir(FIXTURES_DIR, { recursive: true });

  const small = path.join(FIXTURES_DIR, "video-mp4.mp4");
  const large = path.join(FIXTURES_DIR, "video-large-quality.mp4");
  const corrupted = path.join(FIXTURES_DIR, "corrupted.mp4");

  if (force || !(await exists(small))) {
    await runFfmpeg(ffmpegPath, [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "testsrc=duration=3:size=640x360:rate=25",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k",
      "-shortest", small,
    ]);
  }

  if (force || !(await exists(large))) {
    await runFfmpeg(ffmpegPath, [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "testsrc2=duration=12:size=1280x720:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=330:duration=12",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "10",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      "-shortest", large,
    ]);
  }

  if (force || !(await exists(corrupted))) {
    const junk = Buffer.alloc(64 * 1024);
    for (let i = 0; i < junk.length; i++) {
      junk[i] = (i * 31 + 7) % 251;
    }
    const { writeFile } = await import("node:fs/promises");
    await writeFile(corrupted, junk);
  }

  return { small, large, corrupted };
}

export function fixturesDir() {
  return FIXTURES_DIR;
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function runFfmpeg(ffmpegPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`fixture generation failed: ${stderr.slice(-500)}`));
    });
  });
}

/** Probe whether an ffmpeg binary is usable. */
export function isFfmpegUsable(ffmpegPath) {
  return new Promise((resolve) => {
    const child = spawn(ffmpegPath, ["-version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}
