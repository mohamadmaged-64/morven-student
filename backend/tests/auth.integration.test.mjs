import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";

async function registerAndGetTokens(baseUrl, suffix) {
  const safeSuffix = suffix.replace(/[^a-zA-Z0-9]/g, "_");
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `user-${suffix}@example.com`,
      username: `user_${safeSuffix}`,
      password: "SecurePass123!",
      displayName: `User ${suffix}`,
    }),
  });
  const data = await res.json();
  const sc = res.headers.getSetCookie?.() || [];
  const rc = sc.find((c) => c.includes("morven_refresh_token"));
  const cc = sc.find((c) => c.includes("morven_csrf_token"));
  const csrfToken = cc ? cc.split(";")[0].split("=").slice(1).join("=") : null;
  const refreshToken = rc ? rc.split(";")[0].split("=").slice(1).join("=") : null;
  return { ...data, csrfToken, refreshToken };
}

describe("Phase 1 - Authentication", () => {
  let server;
  before(async () => { server = await startBackend(); });
  after(async () => { await server?.stop(); });

  describe("POST /api/auth/register", () => {
    it("registers a new user and returns user + accessToken", async () => {
      const email = `test-${Date.now()}@example.com`;
      const username = `testuser_${Date.now()}`;
      const res = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password: "SecurePass123!", displayName: "Test User" }),
      });
      const data = await res.json();
      assert.equal(res.status, 201);
      assert.ok(data.user);
      assert.ok(data.accessToken);
      assert.ok(data.user.id);
      assert.equal(data.user.email, email);
      assert.equal(data.user.username, username);
      assert.ok(!data.user.passwordHash);
    });

    it("rejects registration with invalid email", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", username: "validuser", password: "SecurePass123!", displayName: "Test" }),
      });
      assert.equal(res.status, 400);
    });

    it("rejects registration with short password", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `spw-${Date.now()}@e.com`, username: `spw_${Date.now()}`, password: "123", displayName: "T" }),
      });
      assert.equal(res.status, 400);
    });

    it("rejects registration with invalid username characters", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `inv-${Date.now()}@e.com`, username: "invalid user!", password: "SecurePass123!", displayName: "T" }),
      });
      assert.equal(res.status, 400);
    });

    it("rejects duplicate email with generic conflict error", async () => {
      const email = `dupemail-${Date.now()}@e.com`;
      await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username: `dup1_${Date.now()}`, password: "SecurePass123!", displayName: "First" }),
      });
      const r2 = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username: `dup2_${Date.now()}`, password: "SecurePass123!", displayName: "Second" }),
      });
      assert.equal(r2.status, 409);
    });

    it("rejects duplicate username with generic conflict error", async () => {
      const username = `dupuname_${Date.now()}`;
      await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `a-${Date.now()}@e.com`, username, password: "SecurePass123!", displayName: "First" }),
      });
      const r2 = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `b-${Date.now()}@e.com`, username, password: "SecurePass123!", displayName: "Second" }),
      });
      assert.equal(r2.status, 409);
    });

    it("sets refresh and CSRF cookies on successful registration", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `ck-${Date.now()}@e.com`, username: `ck_${Date.now()}`, password: "SecurePass123!", displayName: "CK" }),
      });
      assert.equal(res.status, 201);
      const sc = res.headers.getSetCookie?.() || [];
      assert.ok(sc.some((c) => c.includes("morven_refresh_token")), "refresh cookie must be set");
      assert.ok(sc.some((c) => c.includes("morven_csrf_token")), "CSRF cookie must be set");
    });
  });

  describe("POST /api/auth/login", () => {
    const testEmail = `logintest-${Date.now()}@e.com`;
    const testUsername = `logintest_${Date.now()}`;
    const testPassword = "SecurePass123!";

    before(async () => {
      await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, username: testUsername, password: testPassword, displayName: "Login Test" }),
      });
    });

    it("logs in with valid credentials", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.user);
      assert.ok(data.accessToken);
      assert.equal(data.user.email, testEmail);
      assert.ok(!data.user.passwordHash);
    });

    it("rejects invalid credentials with generic error", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: "wrongpassword" }),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, "بيانات تسجيل الدخول غير صحيحة");
    });

    it("rejects non-existent email with same generic error", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `nouser-${Date.now()}@e.com`, password: "anything" }),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, "بيانات تسجيل الدخول غير صحيحة");
    });

    it("sets refresh and CSRF cookies on successful login", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      assert.equal(res.status, 200);
      const sc = res.headers.getSetCookie?.() || [];
      assert.ok(sc.some((c) => c.includes("morven_refresh_token")), "refresh cookie must be set");
      assert.ok(sc.some((c) => c.includes("morven_csrf_token")), "CSRF cookie must be set");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("returns new access token with valid refresh + CSRF tokens", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `ref-${Date.now()}`);
      assert.ok(tokens.csrfToken, "must have CSRF token");
      assert.ok(tokens.refreshToken, "must have refresh token");
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}`,
          "X-CSRF-Token": tokens.csrfToken,
        },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.accessToken);
      assert.ok(data.user);
    });

    it("rejects refresh without any cookies", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, { method: "POST" });
      assert.equal(res.status, 403);
    });

    it("rejects refresh with invalid refresh token", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: "morven_refresh_token=not-a-real-token",
          "X-CSRF-Token": "a".repeat(64),
        },
      });
      assert.equal(res.status, 403);
    });

    it("rotates refresh token and returns new CSRF cookie", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `rot-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}`,
          "X-CSRF-Token": tokens.csrfToken,
        },
      });
      assert.equal(res.status, 200);
      const sc = res.headers.getSetCookie?.() || [];
      assert.ok(sc.some((c) => c.includes("morven_refresh_token")), "must set new refresh cookie");
      assert.ok(sc.some((c) => c.includes("morven_csrf_token")), "must set new CSRF cookie");
    });

    it("rejects refresh when X-CSRF-Token header is missing", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `csrf-hdr-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}` },
      });
      assert.equal(res.status, 403);
    });

    it("rejects refresh when CSRF cookie is missing", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `csrf-co-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "X-CSRF-Token": tokens.csrfToken },
      });
      assert.equal(res.status, 403);
    });

    it("rejects refresh when CSRF header and cookie do not match", async () => {
      const t1 = await registerAndGetTokens(server.baseUrl, `csrf-a-${Date.now()}`);
      const t2 = await registerAndGetTokens(server.baseUrl, `csrf-b-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${t1.refreshToken}; morven_csrf_token=${t1.csrfToken}`,
          "X-CSRF-Token": t2.csrfToken,
        },
      });
      assert.equal(res.status, 403);
    });

    it("rejects refresh with short CSRF token", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `csrf-short-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=abc123`,
          "X-CSRF-Token": "abc123",
        },
      });
      assert.equal(res.status, 403);
    });

    it("rejects refresh with empty X-CSRF-Token header", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `csrf-empty-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}`,
          "X-CSRF-Token": "",
        },
      });
      assert.equal(res.status, 403);
    });
  });

  // MEDIUM-02: refresh-token reuse detection + token-family revocation.
  describe("POST /api/auth/refresh - token family reuse (MEDIUM-02)", () => {
    async function parseSetCookie(res, name) {
      const sc = res.headers.getSetCookie?.() || [];
      const c = sc.find((x) => x.includes(name));
      return c ? c.split(";")[0].split("=").slice(1).join("=") : null;
    }

    it("rotates through a chain of valid refresh sessions", async () => {
      const t0 = await registerAndGetTokens(server.baseUrl, `fam-chain-${Date.now()}`);
      let refreshToken = t0.refreshToken;
      let csrf = t0.csrfToken;
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: {
            Cookie: `morven_refresh_token=${refreshToken}; morven_csrf_token=${csrf}`,
            "X-CSRF-Token": csrf,
          },
        });
        assert.equal(res.status, 200, `chain step ${i} should succeed`);
        refreshToken = await parseSetCookie(res, "morven_refresh_token");
        csrf = await parseSetCookie(res, "morven_csrf_token");
        assert.ok(refreshToken, `chain step ${i} must rotate a new refresh token`);
      }
    });

    it("replaying a rotated token revokes the whole token family", async () => {
      const t0 = await registerAndGetTokens(server.baseUrl, `fam-reuse-${Date.now()}`);
      // First refresh legitimately rotates A -> B (B stays valid for now).
      const first = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${t0.refreshToken}; morven_csrf_token=${t0.csrfToken}`,
          "X-CSRF-Token": t0.csrfToken,
        },
      });
      assert.equal(first.status, 200);
      const newRefresh = await parseSetCookie(first, "morven_refresh_token");
      const newCsrf = await parseSetCookie(first, "morven_csrf_token");
      assert.ok(newRefresh && newCsrf);

      // Replay the ROTATED token A -> reuse detection must revoke the family.
      const replay = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${t0.refreshToken}; morven_csrf_token=${t0.csrfToken}`,
          "X-CSRF-Token": t0.csrfToken,
        },
      });
      assert.equal(replay.status, 401, "replayed (rotated) token must be rejected");

      // The legitimately-issued token B must now ALSO be dead, because the
      // whole family was revoked on reuse.
      const afterReuse = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${newRefresh}; morven_csrf_token=${newCsrf}`,
          "X-CSRF-Token": newCsrf,
        },
      });
      assert.notEqual(afterReuse.status, 200, "family revocation must kill the legit sibling token");
      assert.equal(afterReuse.status, 401);
    });

    it("revision-protects a purely sequential rotation (no false positive)", async () => {
      // The token issued by refresh N-1 is the CURRENT token for refresh N.
      // Using it once is a legitimate rotation, not a reuse.
      const t0 = await registerAndGetTokens(server.baseUrl, `fam-seq-${Date.now()}`);
      let refreshToken = t0.refreshToken;
      let csrf = t0.csrfToken;
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${server.baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: {
            Cookie: `morven_refresh_token=${refreshToken}; morven_csrf_token=${csrf}`,
            "X-CSRF-Token": csrf,
          },
        });
        assert.equal(res.status, 200);
        refreshToken = await parseSetCookie(res, "morven_refresh_token");
        csrf = await parseSetCookie(res, "morven_csrf_token");
      }
      // The latest token is still valid.
      const final = await fetch(`${server.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${refreshToken}; morven_csrf_token=${csrf}`,
          "X-CSRF-Token": csrf,
        },
      });
      assert.equal(final.status, 200);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("logs out successfully with valid CSRF token", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `lo-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}`,
          "X-CSRF-Token": tokens.csrfToken,
        },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.message);
    });

    it("is safe to call when already logged out", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `lo2-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}`,
          "X-CSRF-Token": tokens.csrfToken,
        },
      });
      const res = await fetch(`${server.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}`,
          "X-CSRF-Token": tokens.csrfToken,
        },
      });
      assert.equal(res.status, 200);
    });

    it("clears CSRF cookie on logout", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `lo3-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}`,
          "X-CSRF-Token": tokens.csrfToken,
        },
      });
      assert.equal(res.status, 200);
      const sc = res.headers.getSetCookie?.() || [];
      const cleared = sc.some((c) => c.includes("morven_csrf_token") && (c.includes("Max-Age=0") || c.includes("Expires=Thu, 01 Jan 1970")));
      assert.ok(cleared, "CSRF cookie must be cleared on logout");
    });

    it("rejects logout when X-CSRF-Token header is missing", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `lo4-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: `morven_refresh_token=${tokens.refreshToken}; morven_csrf_token=${tokens.csrfToken}` },
      });
      assert.equal(res.status, 403);
    });

    it("rejects logout when CSRF cookie is missing", async () => {
      const tokens = await registerAndGetTokens(server.baseUrl, `lo5-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { "X-CSRF-Token": tokens.csrfToken },
      });
      assert.equal(res.status, 403);
    });

    it("rejects logout when CSRF header and cookie do not match", async () => {
      const t1 = await registerAndGetTokens(server.baseUrl, `lo6-${Date.now()}`);
      const t2 = await registerAndGetTokens(server.baseUrl, `lo7-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: `morven_refresh_token=${t1.refreshToken}; morven_csrf_token=${t1.csrfToken}`,
          "X-CSRF-Token": t2.csrfToken,
        },
      });
      assert.equal(res.status, 403);
    });
  });

  describe("GET /api/auth/me", () => {
    let accessToken;
    before(async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `me-${Date.now()}@e.com`, username: `me_${Date.now()}`, password: "SecurePass123!", displayName: "Me" }),
      });
      const data = await res.json();
      accessToken = data.accessToken;
    });

    it("returns user info for authenticated request", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.user);
      assert.ok(data.user.id);
      assert.ok(!data.user.passwordHash);
    });

    it("rejects unauthenticated request", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/me`);
      assert.equal(res.status, 401);
    });

    it("rejects invalid token", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/me`, { headers: { Authorization: "Bearer invalid.token.here" } });
      assert.equal(res.status, 401);
    });

    it("does not return passwordHash in response", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      assert.equal(data.user.passwordHash, undefined);
      assert.equal(data.user.password_hash, undefined);
    });
  });

  describe("Security", () => {
    it("returns security headers (Helmet)", async () => {
      const res = await fetch(`${server.baseUrl}/health`);
      assert.ok(res.headers.get("x-content-type-options"), "x-content-type-options header must exist");
    });

    it("returns 404 with JSON for unknown routes", async () => {
      const res = await fetch(`${server.baseUrl}/api/nonexistent`);
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.ok(data.error);
    });
  });
});
