import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Spawn the compiled backend (dist/server.js) on an ephemeral port with
 * custom environment overrides and wait until /health responds.
 */
export async function startBackend(env = {}) {
  const port = await getEphemeralPort();
  const child = spawn(process.execPath, ["dist/server.js"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: {
      ...process.env,
      PORT: String(port),
      AUTH_RATE_LIMIT_MAX: "500",
      REFRESH_RATE_LIMIT_MAX: "500",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (d) => {
    output += d;
  });
  child.stderr.on("data", (d) => {
    output += d;
  });

  await waitForHealth(port);

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    logs: () => output,
    stop: () =>
      new Promise((resolve) => {
        child.removeAllListeners();
        child.kill("SIGKILL");
        setTimeout(resolve, 300);
      }),
  };
}

function waitForHealth(port, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const attempt = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // not up yet
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`backend did not become healthy within ${timeoutMs}ms`));
        return;
      }
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

import net from "node:net";

function getEphemeralPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      srv.close(() => resolve(address.port));
    });
  });
}
