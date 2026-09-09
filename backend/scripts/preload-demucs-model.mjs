import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Pre-downloads the Demucs HTDemucs source-separation model into the
 * container's torch hub cache so production jobs do not need runtime
 * access to the model registry. Safe to run repeatedly (the hub cache is
 * content-addressed) and safe to skip on offline machines
 * (`|| echo` in the Dockerfile).
 */
const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const torchHome = process.env.TORCH_HOME || path.join(backendRoot, ".model-cache", "torch");

const python = process.env.PYTHON_PATH || "python3";

const script = `
import demucs.api
sep = demucs.api.Separator(model="htdemucs")
print("demucs model loaded and cached")
`;

const result = spawnSync(python, ["-c", script], {
  encoding: "utf-8",
  timeout: 20 * 60 * 1000, // 20 minutes
  stdio: ["ignore", "inherit", "inherit"],
  env: {
    ...process.env,
    TORCH_HOME: torchHome,
  },
});

if (result.status !== 0) {
  console.error(`[demucs] model preload failed (exit ${result.status})`);
  console.error(result.stderr || "unknown preload error");
  process.exit(1);
}
console.log(`[demucs] HTDemucs model preloaded into ${torchHome}`);