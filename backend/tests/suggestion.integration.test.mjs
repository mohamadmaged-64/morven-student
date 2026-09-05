import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { startBackend } from "./helpers/server.mjs";

const prisma = new PrismaClient();

async function register(baseUrl, role) {
  const n = `sug-${role}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const suffix = n.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 28);
  const email = `${suffix}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      username: suffix,
      password: "SecurePass123!",
      displayName: role,
    }),
  });
  assert.equal(res.status, 201, `register ${role} should succeed`);
  const data = await res.json();
  return { ...data, email, password: "SecurePass123!", id: data.user.id };
}

async function login(baseUrl, { email, password }) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).accessToken;
}

describe("Suggestions API", () => {
  let server;

  before(async () => {
    server = await startBackend();
  });
  after(async () => {
    await server?.stop();
    await prisma.$disconnect().catch(() => {});
  });

  it("allows an authenticated user to submit a suggestion", async () => {
    const user = await register(server.baseUrl, "submitter");
    const res = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ title: "اقتراح اختبار", content: "محتوى الاقتراح" }),
    });
    assert.equal(res.status, 201);
    const { suggestion } = await res.json();
    assert.equal(suggestion.title, "اقتراح اختبار");
    assert.equal(suggestion.content, "محتوى الاقتراح");
    assert.equal(suggestion.userId, user.id);

    const stored = await prisma.suggestion.findUnique({
      where: { id: suggestion.id },
      include: { user: true },
    });
    assert.ok(stored, "suggestion must exist in the database");
    assert.equal(stored.userId, user.id, "suggestion must be related to the user");
    assert.equal(stored.user.email, user.email);
  });

  it("rejects unauthenticated submission", async () => {
    const res = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "بدون تسجيل", content: "يجب رفضه" }),
    });
    assert.equal(res.status, 401);
  });

  it("rejects an empty title", async () => {
    const user = await register(server.baseUrl, "emptytitle");
    const res = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ title: "   ", content: "محتوى" }),
    });
    assert.equal(res.status, 400);

    const empty = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ content: "محتوى" }),
    });
    assert.equal(empty.status, 400);
  });

  it("rejects an empty content", async () => {
    const user = await register(server.baseUrl, "emptycontent");
    const res = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ title: "عنوان", content: "   " }),
    });
    assert.equal(res.status, 400);

    const empty = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ title: "عنوان" }),
    });
    assert.equal(empty.status, 400);
  });

  it("ignores userId from the request body (no spoofing)", async () => {
    const user = await register(server.baseUrl, "spoiler");
    const other = await register(server.baseUrl, "victim");

    const res = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({
        title: "محاولة انتحال",
        content: "يجب أن يُنسب للمستخدم الحقيقي",
        userId: other.id,
        user_id: other.id,
      }),
    });
    assert.equal(res.status, 201);
    const { suggestion } = await res.json();
    assert.equal(suggestion.userId, user.id, "userId must come from the session");
    assert.notEqual(suggestion.userId, other.id);
  });

  it("keeps the user association even when the anonymous option is sent", async () => {
    const user = await register(server.baseUrl, "hidden");
    const res = await fetch(`${server.baseUrl}/api/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({
        title: "اقتراح متخفي",
        content: "يجب أن يظل مرتبطاً بالمستخدم رغم خيار التخفي",
        anonymous: true,
        isAnonymous: true,
      }),
    });
    assert.equal(res.status, 201);
    const { suggestion } = await res.json();
    assert.equal(suggestion.userId, user.id, "anonymous option must not remove the user association");
    assert.equal(typeof suggestion.anonymous, "undefined", "no anonymous field should exist");
  });

  it("allows an admin to retrieve suggestions with user info, newest first", async () => {
    const a = await register(server.baseUrl, "adminview");

    await prisma.user.update({ where: { id: a.id }, data: { role: "ADMIN" } });
    const adminToken = await login(server.baseUrl, a);

    const submitter = await register(server.baseUrl, "viewsub");

    // Create three suggestions by the same user, ensuring timestamps are distinct.
    for (const title of ["الأقدم", "الأوسط", "الأحدث"]) {
      const res = await fetch(`${server.baseUrl}/api/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${submitter.accessToken}`,
        },
        body: JSON.stringify({ title, content: "محتوى " + title }),
      });
      assert.equal(res.status, 201);
    }

    const res = await fetch(`${server.baseUrl}/api/admin/suggestions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const { suggestions } = await res.json();
    assert.ok(Array.isArray(suggestions));
    assert.ok(suggestions.length >= 3);

    // Suggestions for this submitter ordered newest first.
    const mine = suggestions.filter((s) => s.user.email === submitter.email);
    assert.equal(mine.length, 3);
    const titles = mine.map((s) => s.title);
    assert.deepEqual(titles, ["الأحدث", "الأوسط", "الأقدم"]);

    for (const s of mine) {
      assert.equal(s.user.email, submitter.email);
      assert.equal(s.user.displayName, submitter.user.displayName);
      assert.ok(s.user.hasOwnProperty("avatarUrl"));
      assert.equal(typeof s.user.avatarUrl, "object"); // null or string
      assert.equal(typeof s.user.id, "string");
      assert.equal(typeof s.user.username, "string");
      // Sensitive fields must not leak.
      assert.equal(s.user.passwordHash, undefined);
      assert.equal(s.user.googleId, undefined);
    }
  });

  it("denies a regular user access to admin suggestions", async () => {
    const user = await register(server.baseUrl, "denieduser");
    const res = await fetch(`${server.baseUrl}/api/admin/suggestions`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    assert.equal(res.status, 403);
  });

  it("denies unauthenticated access to admin suggestions", async () => {
    const res = await fetch(`${server.baseUrl}/api/admin/suggestions`);
    assert.equal(res.status, 401);
  });

  it("does not expose a list endpoint to normal users", async () => {
    const user = await register(server.baseUrl, "nolist");
    const res = await fetch(`${server.baseUrl}/api/suggestions`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    assert.equal(res.status, 404);
  });
});