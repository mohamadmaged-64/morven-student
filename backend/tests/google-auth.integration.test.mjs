import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";

const CLIENT_ID = "test-client.apps.googleusercontent.com";
const ALLOWED_ISS = "https://accounts.google.com";

// Builds a mock Google ID token credential (3 dot-separated segments).
// The backend runs with GOOGLE_TOKEN_VERIFIER=mock, which validates the
// claims segment (iss/aud/exp/sub/email) without any network access.
function makeCredential(claims) {
  const b64u = (obj) =>
    Buffer.from(JSON.stringify(obj), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const header = { alg: "none", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ALLOWED_ISS,
    aud: CLIENT_ID,
    exp: now + 3600,
    ...claims,
  };
  return `${b64u(header)}.${b64u(payload)}.x`;
}

function validVerified(sub, email) {
  return makeCredential({ sub, email, email_verified: true });
}

async function googleSignIn(baseUrl, credential) {
  return fetch(`${baseUrl}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
}

function extractCookies(res) {
  const sc = res.headers.getSetCookie?.() || [];
  const getName = (name) => {
    const c = sc.find((x) => x.includes(name));
    return c ? c.split(";")[0].split("=").slice(1).join("=") : null;
  };
  return {
    refreshToken: getName("morven_refresh_token"),
    csrfToken: getName("morven_csrf_token"),
  };
}

describe("Google Sign-In", () => {
  let server;
  before(async () => {
    server = await startBackend({
      GOOGLE_CLIENT_ID: CLIENT_ID,
      GOOGLE_TOKEN_VERIFIER: "mock",
    });
  });
  after(async () => {
    await server?.stop();
  });

  const uniq = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = (p) => `${uniq(p)}@example.com`;
  const username = (p) => `u_${uniq(p).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20)}`;

  describe("POST /api/auth/google", () => {
    it("creates a new account for a verified Google identity", async () => {
      const sub = uniq("sub-new");
      const em = email("gmail-case1");
      const res = await googleSignIn(server.baseUrl, validVerified(sub, em));
      const data = await res.json();
      assert.equal(res.status, 201);
      assert.ok(data.user, "must return user");
      assert.equal(data.user.email, em);
      assert.ok(data.user.googleId, "user must have googleId");
      assert.equal(data.user.googleId, sub);
      assert.ok(data.accessToken);
      assert.equal(data.user.passwordHash, undefined);
      const cookies = extractCookies(res);
      assert.ok(cookies.refreshToken, "must set refresh cookie");
      assert.ok(cookies.csrfToken, "must set CSRF cookie");
    });

    it("logs in an existing Google account (same sub) instead of creating a new one", async () => {
      const sub = uniq("sub-login");
      const em = email("gmail-case2");
      const first = await googleSignIn(server.baseUrl, validVerified(sub, em));
      const firstData = await first.json();
      assert.equal(first.status, 201);

      const second = await googleSignIn(server.baseUrl, validVerified(sub, em));
      const secondData = await second.json();
      assert.equal(second.status, 201);
      assert.equal(secondData.user.id, firstData.user.id, "must reuse existing user id");
      assert.equal(secondData.user.email, em);
      assert.ok(secondData.accessToken);
    });

    it("rejects a valid-but-unverified email for a brand-new account", async () => {
      const res = await googleSignIn(
        server.baseUrl,
        makeCredential({ sub: uniq("sub-unv"), email: email("gmail-unv"), email_verified: false })
      );
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, "GOOGLE_EMAIL_UNVERIFIED");
    });

    it("does NOT auto-merge an email that belongs to a password-only account", async () => {
      const existingEmail = email("pw-case");
      const register = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: existingEmail,
          username: username("pw"),
          password: "SecurePass123!",
          displayName: "PW User",
        }),
      });
      assert.equal(register.status, 201);

      const res = await googleSignIn(
        server.baseUrl,
        validVerified(uniq("sub-conflict"), existingEmail)
      );
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.equal(data.code, "GOOGLE_EMAIL_EXISTS");

      // The password account must remain independent (no googleId added) and
      // still sign in with its password.
      const login = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: existingEmail, password: "SecurePass123!" }),
      });
      assert.equal(login.status, 200);
    });

    it("refuses a second (different) Google account that claims the same email — no account created, no takeover", async () => {
      const em = email("gmail-multi");
      const a = await googleSignIn(server.baseUrl, validVerified(uniq("sub-a-"), em));
      assert.equal(a.status, 201);
      const aData = await a.json();

      const b = await googleSignIn(server.baseUrl, validVerified(uniq("sub-b-"), em));
      assert.equal(b.status, 409);
      const bData = await b.json();
      assert.equal(bData.code, "GOOGLE_EMAIL_EXISTS");

      // The first Google account still owns the email and logs in fine.
      const retry = await googleSignIn(server.baseUrl, validVerified(aData.user.googleId, em));
      assert.equal(retry.status, 201);
    });

    it("rejects a credential with the wrong audience", async () => {
      const credential = makeCredential({
        sub: uniq("sub-aud"),
        email: email("gmail-aud"),
        email_verified: true,
        aud: "other-client.apps.googleusercontent.com",
      });
      const res = await googleSignIn(server.baseUrl, credential);
      assert.equal(res.status, 401);
    });

    it("rejects a credential with an invalid issuer", async () => {
      const credential = makeCredential({
        sub: uniq("sub-iss"),
        email: email("gmail-iss"),
        email_verified: true,
        iss: "https://evil.example.com",
      });
      const res = await googleSignIn(server.baseUrl, credential);
      assert.equal(res.status, 401);
    });

    it("rejects an expired credential", async () => {
      const credential = makeCredential({
        sub: uniq("sub-exp"),
        email: email("gmail-exp"),
        email_verified: true,
        exp: Math.floor(Date.now() / 1000) - 10,
      });
      const res = await googleSignIn(server.baseUrl, credential);
      assert.equal(res.status, 401);
    });

    it("rejects a malformed credential", async () => {
      const res = await googleSignIn(server.baseUrl, "not-a-jwt");
      assert.equal(res.status, 401);
    });

    it("rejects a request with no credential", async () => {
      const res = await fetch(`${server.baseUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
    });

    it("prevents password login on a Google-only account (null passwordHash)", async () => {
      const sub = uniq("sub-nopw");
      const em = email("gmail-nopw");
      const created = await googleSignIn(server.baseUrl, validVerified(sub, em));
      assert.equal(created.status, 201);

      const login = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: "Whatever123!" }),
      });
      assert.equal(login.status, 401);
      const data = await login.json();
      assert.equal(data.error, "بيانات تسجيل الدخول غير صحيحة");
    });
  });
});