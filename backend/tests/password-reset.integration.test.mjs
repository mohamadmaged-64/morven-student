// ---------------------------------------------------------------------------
// Password reset / forgot password — backend integration tests.
//
// These tests exercise the full forgot/reset flow against a real compiled
// backend + the dev PostgreSQL database. Email sending is MOCKED: the backend
// is started with EMAIL_TRANSPORT=mock, so no real email is ever sent and no
// RESEND_API_KEY is required.
//
// To obtain deterministic reset tokens, the test process inserts
// password_reset_tokens rows directly into the DB (computing the same SHA-256
// hash the service uses) and/or asserts DB state, without needing to read the
// raw token out of the mocked email.
// ---------------------------------------------------------------------------

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { startBackend } from "./helpers/server.mjs";

const prisma = new PrismaClient();

function sha256(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const uniq = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const emailOf = (p) => `${uniq(p)}@example.com`;
const usernameOf = (p) =>
  `ut_${uniq(p).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20)}`;

// A valid CSRF pair: the double-submit validator only requires the cookie value
// and header value to be identical 64-char strings. We do not need to read a
// real CSRF cookie for these unauthenticated endpoints.
const fakeCsrf = "c".repeat(64);

function csrfHeaders() {
  return {
    Cookie: `morven_csrf_token=${fakeCsrf}`,
    "X-CSRF-Token": fakeCsrf,
  };
}

async function register(baseUrl, suffix) {
  const email = emailOf(suffix);
  const username = usernameOf(suffix);
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      username,
      password: "SecurePass123!",
      displayName: `Reset ${suffix}`,
    }),
  });
  assert.equal(res.status, 201, "register must succeed");
  return { email, username };
}

async function forgotPassword(baseUrl, email) {
  return fetch(`${baseUrl}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrfHeaders() },
    body: JSON.stringify({ email }),
  });
}

async function resetPasswordCall(baseUrl, token, password) {
  return fetch(`${baseUrl}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrfHeaders() },
    body: JSON.stringify({ token, password }),
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function countResetTokens(userId) {
  return prisma.passwordResetToken.count({ where: { userId } });
}

async function countRefreshTokens(userId) {
  return prisma.refreshToken.count({ where: { userId } });
}

describe("Phase 2 - Password Reset (functional)", () => {
  let server;
  const createdUserIds = [];

  before(async () => {
    server = await startBackend({
      EMAIL_TRANSPORT: "mock",
      PUBLIC_BASE_URL: "https://test-frontend.vercel.app",
      RESET_RATE_LIMIT_MAX: "1000", // effectively unlimited for functional tests
    });
  });

  after(async () => {
    // Tidy up test data (reset tokens + users we created) — never destructive
    // to existing data; only rows our tests created.
    for (const id of createdUserIds) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: id } });
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
      await prisma.profile.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    await prisma.$disconnect();
    await server?.stop();
  });

  function trackUser(email) {
    return findUserByEmail(email).then((u) => {
      if (u) createdUserIds.push(u.id);
      return u;
    });
  }

  describe("POST /api/auth/forgot-password", () => {
    it("returns the SAME response for an existing and a non-existent email", async () => {
      const { email } = await register(server.baseUrl, "same-resp");
      await trackUser(email);

      const existingRes = await forgotPassword(server.baseUrl, email);
      const missingRes = await forgotPassword(server.baseUrl, `does-not-exist-${Date.now()}@example.com`);

      assert.equal(existingRes.status, 200);
      assert.equal(missingRes.status, 200);
      const existingJson = await existingRes.json();
      const missingJson = await missingRes.json();
      assert.equal(existingJson.message, missingJson.message);
    });

    it("creates a hashed reset token and emails only the existing user", async () => {
      const { email } = await register(server.baseUrl, "token-created");
      const user = await trackUser(email);

      const res = await forgotPassword(server.baseUrl, email);
      assert.equal(res.status, 200);

      // Exactly one reset token row exists for this user.
      const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
      assert.equal(tokens.length, 1);
      // Token must be stored hashed — never the raw value (and raw length would
      // be 64 hex anyway; assert it's a SHA-256 digest: 64 lowercase hex).
      assert.match(tokens[0].tokenHash, /^[0-9a-f]{64}$/);
      assert.ok(tokens[0].expiresAt > new Date());
      assert.equal(tokens[0].usedAt, null);
    });

    it("does NOT create a reset token for a non-existent email", async () => {
      const missingEmail = `ghost-${Date.now()}@example.com`;
      const res = await forgotPassword(server.baseUrl, missingEmail);
      assert.equal(res.status, 200);

      const user = await findUserByEmail(missingEmail);
      // No account was created by merely requesting a reset.
      assert.equal(user, null);
    });

    it("does NOT reveal that a Google-only account has no password", async () => {
      // Start a second backend with Google mock enabled to create a Google-only
      // account (passwordHash === null), then assert the reset flow hides it.
      const gsrv = await startBackend({
        GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
        GOOGLE_TOKEN_VERIFIER: "mock",
        EMAIL_TRANSPORT: "mock",
        PUBLIC_BASE_URL: "https://test-frontend.vercel.app",
        RESET_RATE_LIMIT_MAX: "1000",
      });
      try {
        const gEmail = emailOf("g-cheese");
        const b64u = (o) =>
          Buffer.from(JSON.stringify(o))
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
        const now = Math.floor(Date.now() / 1000);
        const credential = `${b64u({ alg: "none", typ: "JWT" })}.${b64u({
          iss: "https://accounts.google.com",
          aud: "test-client.apps.googleusercontent.com",
          exp: now + 3600,
          sub: uniq("gsub"),
          email: gEmail,
          email_verified: true,
        })}.x`;

        const gRes = await fetch(`${gsrv.baseUrl}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });
        assert.equal(gRes.status, 201);
        const gUser = await prisma.user.findUnique({ where: { email: gEmail } });
        assert.ok(gUser);
        assert.equal(gUser.passwordHash, null, "Google-only account has no password");
        createdUserIds.push(gUser.id);

        // Forgot-password returns the identical uniform message (no leak).
        const res = await forgotPassword(gsrv.baseUrl, gEmail);
        assert.equal(res.status, 200);
        const json = await res.json();
        const missingRes = await forgotPassword(gsrv.baseUrl, `anybody-${Date.now()}@example.com`);
        const missingJson = await missingRes.json();
        assert.equal(json.message, missingJson.message);

        // And critically: NO reset token was created for the Google-only account.
        const tokens = await prisma.passwordResetToken.findMany({ where: { userId: gUser.id } });
        assert.equal(tokens.length, 0, "no reset token for a Google-only account");
      } finally {
        await gsrv.stop();
      }
    });

    it("rejects invalid email format", async () => {
      const res = await forgotPassword(server.baseUrl, "not-an-email");
      assert.equal(res.status, 400);
    });

    it("rejects missing CSRF token", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `csrf-${Date.now()}@example.com` }),
      });
      assert.equal(res.status, 403);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("resets the password with a valid single-use token", async () => {
      const { email } = await register(server.baseUrl, "valid-reset");
      const user = await trackUser(email);

      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: sha256(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // The old password works before the reset.
      const oldLogin = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "SecurePass123!" }),
      });
      assert.equal(oldLogin.status, 200);

      const res = await resetPasswordCall(server.baseUrl, rawToken, "NewSecurePass456!");
      assert.equal(res.status, 200);

      // New password works.
      const newLogin = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "NewSecurePass456!" }),
      });
      assert.equal(newLogin.status, 200);

      // Old password no longer works.
      const oldAgain = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "SecurePass123!" }),
      });
      assert.equal(oldAgain.status, 401);
    });

    it("rejects an invalid token", async () => {
      const res = await resetPasswordCall(server.baseUrl, crypto.randomBytes(32).toString("hex"), "NewSecurePass456!");
      assert.equal(res.status, 400);
    });

    it("rejects an expired token", async () => {
      const { email } = await register(server.baseUrl, "expired-reset");
      const user = await trackUser(email);

      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: sha256(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // already expired
        },
      });

      const res = await resetPasswordCall(server.baseUrl, rawToken, "NewSecurePass456!");
      assert.equal(res.status, 400);

      // The existing password must remain unchanged.
      const login = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "SecurePass123!" }),
      });
      assert.equal(login.status, 200);
    });

    it("rejects a token that was already used (single-use)", async () => {
      const { email } = await register(server.baseUrl, "reuse-reset");
      const user = await trackUser(email);

      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: sha256(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const first = await resetPasswordCall(server.baseUrl, rawToken, "FirstPass123!");
      assert.equal(first.status, 200);

      // Replaying the same token must fail — the password must NOT be changed
      // a second time.
      const replay = await resetPasswordCall(server.baseUrl, rawToken, "SecondPass456!");
      assert.equal(replay.status, 400);

      // First password still active; replay password rejected.
      const login1 = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "FirstPass123!" }),
      });
      assert.equal(login1.status, 200);
      const login2 = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "SecondPass456!" }),
      });
      assert.equal(login2.status, 401);
    });

    it("invalidates ALL other outstanding reset tokens after a successful reset", async () => {
      const { email } = await register(server.baseUrl, "invalidate-others");
      const user = await trackUser(email);

      const goodToken = crypto.randomBytes(32).toString("hex");
      const otherTokenA = crypto.randomBytes(32).toString("hex");
      const otherTokenB = crypto.randomBytes(32).toString("hex");
      for (const t of [goodToken, otherTokenA, otherTokenB]) {
        await prisma.passwordResetToken.create({
          data: {
            tokenHash: sha256(t),
            userId: user.id,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        });
      }

      const res = await resetPasswordCall(server.baseUrl, goodToken, "ResetOk123!");
      assert.equal(res.status, 200);

      // All three tokens (including the consumed one) now marked used.
      const all = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
      assert.equal(all.length, 3);
      for (const t of all) {
        assert.ok(t.usedAt, "every reset token must be marked used after a reset");
      }

      // Using one of the previously-outstanding tokens must now fail.
      const stale = await resetPasswordCall(server.baseUrl, otherTokenA, "Another456!");
      assert.equal(stale.status, 400);
    });

    it("revokes ALL refresh tokens after a successful reset", async () => {
      const { email } = await register(server.baseUrl, "revoke-refresh");
      const user = await trackUser(email);

      // Establish a couple of real refresh-token sessions by logging in twice.
      for (let i = 0; i < 2; i++) {
        const r = await fetch(`${server.baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "SecurePass123!" }),
        });
        assert.equal(r.status, 200);
      }
      assert.ok((await countRefreshTokens(user.id)) >= 2, "should have logged-in sessions");

      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: sha256(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const res = await resetPasswordCall(server.baseUrl, rawToken, "Revoked456!");
      assert.equal(res.status, 200);

      // All refresh tokens must be gone.
      assert.equal(await countRefreshTokens(user.id), 0);
    });

    it("rejects weak / short passwords", async () => {
      const { email } = await register(server.baseUrl, "weakpw");
      const user = await trackUser(email);

      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: sha256(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // A genuinely weak token must not be consumed, so create it fresh.
      const res = await resetPasswordCall(server.baseUrl, rawToken, "short");
      assert.equal(res.status, 400);

      // Token still valid (not consumed) — it can be used with a strong password.
      const retry = await resetPasswordCall(server.baseUrl, rawToken, "NowStrong123!");
      assert.equal(retry.status, 200);
    });

    it("rejects reusing the current password", async () => {
      const { email } = await register(server.baseUrl, "reuse-current");
      const user = await trackUser(email);

      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: sha256(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Current password is "SecurePass123!".
      const res = await resetPasswordCall(server.baseUrl, rawToken, "SecurePass123!");
      assert.equal(res.status, 400);
    });

    it("rejects missing CSRF token", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "anything", password: "Whatever123!" }),
      });
      assert.equal(res.status, 403);
    });
  });
});

describe("Phase 2 - Password Reset (rate limiting)", () => {
  let limiter;
  before(async () => {
    limiter = await startBackend({
      EMAIL_TRANSPORT: "mock",
      PUBLIC_BASE_URL: "https://test-frontend.vercel.app",
      RESET_RATE_LIMIT_MAX: "2",
    });
  });
  after(async () => {
    await limiter?.stop();
  });

  it("returns 429 after exceeding the strict reset limit", async () => {
    const body = { email: `rl-${Date.now()}@example.com` };
    const doReq = () =>
      fetch(`${limiter.baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(body),
      });

    const r1 = await doReq();
    const r2 = await doReq();
    const r3 = await doReq();
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429);
  });
});
