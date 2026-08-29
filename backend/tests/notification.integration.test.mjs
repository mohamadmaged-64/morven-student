import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";
import { config as loadDotEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadDotEnv();

const prisma = new PrismaClient();

const createdUserIds = [];
const createdNotificationIds = [];

function uniqueSuffix(tag) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${tag}${ts}${rnd}`;
}

async function register(baseUrl, suffix, prefix = "notif") {
  const safe = suffix.replace(/[^a-zA-Z0-9]/g, "_");
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `${prefix}-${safe}@example.com`,
      username: `${prefix}_${safe}`,
      password: "SecurePass123!",
      displayName: `Notification Test ${suffix}`,
    }),
  });
  const data = await res.json();
  assert.ok(
    [200, 201].includes(res.status),
    `register failed: ${JSON.stringify(data)}`
  );
  if (data.user?.id) createdUserIds.push(data.user.id);
  return data;
}

async function login(baseUrl, email) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "SecurePass123!" }),
  });
  return res.json();
}

async function api(baseUrl, token, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function makeNotification() {
  const suffix = uniqueSuffix("ntf");
  return {
    title: `إشعار تجريبي ${suffix}`,
    body: `هذا إشعار عام تجريبي ${suffix}`,
    type: "announcement",
  };
}

describe("Global Notifications (ADMIN vs USER)", () => {
  let server;
  let normalUser, adminUser;
  let normalToken, adminToken;

  before(async () => {
    server = await startBackend();
    // Register two users; promote one to ADMIN purely for this test.
    adminUser = await register(server.baseUrl, uniqueSuffix("adm"));
    normalUser = await register(server.baseUrl, uniqueSuffix("usr"));
    await prisma.user.update({
      where: { id: adminUser.user.id },
      data: { role: "ADMIN" },
    });
    const adminLogin = await login(server.baseUrl, adminUser.user.email);
    assert.equal(adminLogin.user.role, "ADMIN");
    adminToken = adminLogin.accessToken;
    normalToken = normalUser.accessToken;
  });

  beforeEach(async () => {
    // Isolate each test from any notifications created by previous tests.
    for (const id of createdNotificationIds.splice(0)) {
      try {
        await prisma.appNotification.delete({ where: { id } });
      } catch {
        /* already gone */
      }
    }
  });

  after(async () => {
    for (const id of createdNotificationIds) {
      try {
        await prisma.appNotification.delete({ where: { id } });
      } catch {
        /* already gone */
      }
    }
    for (const id of createdUserIds) {
      try {
        await prisma.user.delete({ where: { id } });
      } catch {
        /* already gone */
      }
    }
    await server.stop();
  });

  it("GET /api/notifications requires authentication", async () => {
    const { res } = await api(server.baseUrl, null, "/api/notifications");
    assert.equal(res.status, 401);
  });

  it("a normal USER can list global notifications", async () => {
    const { res, data } = await api(server.baseUrl, normalToken, "/api/notifications");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.notifications));
  });

  it("a normal USER cannot create or delete global notifications (403)", async () => {
    const { res: createRes, data: createData } = await api(
      server.baseUrl,
      normalToken,
      "/api/notifications",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeNotification()),
      }
    );
    assert.equal(createRes.status, 403, JSON.stringify(createData));

    const { res: deleteRes } = await api(
      server.baseUrl,
      normalToken,
      "/api/notifications/some-id",
      { method: "DELETE" }
    );
    assert.equal(deleteRes.status, 403);
  });

  it("an ADMIN can create a notification visible to ALL users", async () => {
    const payload = makeNotification();
    const { res, data: createData } = await api(
      server.baseUrl,
      adminToken,
      "/api/notifications",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    assert.equal(res.status, 201, JSON.stringify(createData));
    assert.equal(createData.notification.title, payload.title);
    assert.equal(createData.notification.type, payload.type);
    createdNotificationIds.push(createData.notification.id);

    const { data: userList } = await api(server.baseUrl, normalToken, "/api/notifications");
    assert.ok(
      userList.notifications.some((n) => n.id === createData.notification.id),
      "normal USER should see the ADMIN-created notification"
    );

    const { data: adminList } = await api(server.baseUrl, adminToken, "/api/notifications");
    assert.ok(
      adminList.notifications.some((n) => n.id === createData.notification.id)
    );
  });

  it("validates the create payload", async () => {
    const { res } = await api(
      server.baseUrl,
      adminToken,
      "/api/notifications",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", body: "", type: "info" }),
      }
    );
    assert.equal(res.status, 400);
  });

  it("an ADMIN can delete a notification and it disappears for ALL users", async () => {
    const { data: createData } = await api(
      server.baseUrl,
      adminToken,
      "/api/notifications",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(makeNotification()),
      }
    );
    assert.equal(createData.notification.id.length > 0, true);
    createdNotificationIds.push(createData.notification.id);

    const { res } = await api(
      server.baseUrl,
      adminToken,
      `/api/notifications/${createData.notification.id}`,
      { method: "DELETE" }
    );
    assert.equal(res.status, 200);

    const { data: userList } = await api(server.baseUrl, normalToken, "/api/notifications");
    assert.ok(
      !userList.notifications.some((n) => n.id === createData.notification.id),
      "deleted notification should be gone for normal USER"
    );
  });

  it("deleting a missing notification returns 404", async () => {
    const { res } = await api(
      server.baseUrl,
      adminToken,
      "/api/notifications/does-not-exist",
      { method: "DELETE" }
    );
    assert.equal(res.status, 404);
  });
});