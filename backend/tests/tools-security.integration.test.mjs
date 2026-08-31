import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";
import { makeClient, registerUser } from "./helpers/client.mjs";

/**
 * HIGH-01: anonymous file-processing endpoints must require authentication.
 * MEDIUM-01: CORS must only allow exact trusted origins (no wildcard suffix
 * matching in production).
 */

describe("protected file-processing endpoints (HIGH-01)", () => {
  let server;
  let auth;

  before(async () => {
    server = await startBackend({});
    auth = makeClient(server.baseUrl, (await registerUser(server.baseUrl, "-high01")).accessToken);
  });
  after(async () => {
    await server?.stop();
  });

  it("rejects unauthenticated requests with 401 on every protected tool route", async () => {
    const endpoints = [
      "/api/convert",
      "/api/compress",
      "/api/protect",
      "/api/unlock",
      "/api/ppt/number-slides",
      "/api/ppt/generate-from-text",
      "/api/ppt/generate-from-pdf",
      "/api/ppt/split",
      "/api/ppt/merge",
      "/api/media/extract-audio",
      "/api/media/compress-video",
      "/api/media/image/resize",
      "/api/media/audio/cut",
      "/api/media/jobs/some-id/status",
      "/api/media/jobs/some-id/download",
    ];
    for (const ep of endpoints) {
      let res;
      if (ep.includes("/jobs/")) {
        res = await fetch(`${server.baseUrl}${ep}`);
      } else {
        res = await fetch(`${server.baseUrl}${ep}`, { method: "POST" });
      }
      assert.equal(res.status, 401, `expected 401 for ${ep} (got ${res.status})`);
      await res.arrayBuffer().catch(() => {});
    }
  });

  it("accepts authenticated requests on the protected tool routes", async () => {
    // The HTTP layer lets authenticated users through (password-less rejections
    // happen later at the controller/upload layer, proving auth gate passed).
    const res = await auth.post(`${auth.baseUrl}/api/convert`);
    assert.notEqual(res.status, 401, "authenticated request must not be rejected by auth gate");
    await res.arrayBuffer().catch(() => {});
  });

  it("rejects requests with an invalid access token with 401", async () => {
    const res = await fetch(`${server.baseUrl}/api/media/image/resize`, {
      method: "POST",
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    assert.equal(res.status, 401);
  });

  it("rate-limits job-creation POSTs (429) after the configured max", async () => {
    const limited = await startBackend({ PROCESSING_RATE_LIMIT_MAX: "3" });
    try {
      // Unauthenticated POSTs still count toward the processing limiter, so
      // after `max` requests the limiter returns 429 (even before auth).
      let last = 0;
      for (let i = 0; i < 5; i++) {
        const r = await fetch(`${limited.baseUrl}/api/media/image/resize`, {
          method: "POST",
        });
        last = r.status;
        await r.arrayBuffer().catch(() => {});
      }
      assert.equal(last, 429, "expected the shared processing limiter to engage");
    } finally {
      await limited.stop();
    }
  });
});

describe("CORS exact-origin allowlist (MEDIUM-01)", () => {
  it("reflects an allowed local origin in development", async () => {
    const server = await startBackend({});
    try {
      const res = await fetch(`${server.baseUrl}/health`, {
        headers: { Origin: "http://localhost:5173" },
      });
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        "http://localhost:5173"
      );
    } finally {
      await server.stop();
    }
  });

  it("rejects an undeclared origin in development", async () => {
    const server = await startBackend({});
    try {
      const res = await fetch(`${server.baseUrl}/health`, {
        headers: { Origin: "https://evil.example.com" },
      });
      assert.equal(res.headers.get("access-control-allow-origin"), null);
    } finally {
      await server.stop();
    }
  });

  it("still allows *.vercel.app / *.railway.app in development (preview/staging)", async () => {
    const server = await startBackend({});
    try {
      const res = await fetch(`${server.baseUrl}/health`, {
        headers: { Origin: "https://my-app.vercel.app" },
      });
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        "https://my-app.vercel.app"
      );
    } finally {
      await server.stop();
    }
  });

  it("in production requires an exact CORS_ORIGINS origin and rejects wildcard suffixes", async () => {
    const server = await startBackend({
      NODE_ENV: "production",
      CORS_ORIGINS: "https://trusted.example.com",
    });
    try {
      // Exact trusted origin is allowed.
      const trusted = await fetch(`${server.baseUrl}/health`, {
        headers: { Origin: "https://trusted.example.com" },
      });
      assert.equal(
        trusted.headers.get("access-control-allow-origin"),
        "https://trusted.example.com"
      );

      // Wildcard *.vercel.app must NOT be allowed in production.
      const vercel = await fetch(`${server.baseUrl}/health`, {
        headers: { Origin: "https://my-app.vercel.app" },
      });
      assert.equal(
        vercel.headers.get("access-control-allow-origin"),
        null,
        "*.vercel.app must not be auto-allowed in production"
      );

      // Unknown origin must be rejected in production.
      const evil = await fetch(`${server.baseUrl}/health`, {
        headers: { Origin: "https://evil.example.com" },
      });
      assert.equal(evil.headers.get("access-control-allow-origin"), null);
    } finally {
      await server.stop();
    }
  });
});
