import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { startBackend } from "./helpers/server.mjs";

const prisma = new PrismaClient();
const createdUserIds = [];

const CATEGORIES = ["morning-evening", "before-study", "after-study", "before-exam"];

function uniqueSuffix(tag) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${tag}${ts}${rnd}`.replace(/[^a-zA-Z0-9]/g, "_");
}

async function register(baseUrl, role, prefix = "dhkr") {
  const suffix = uniqueSuffix(role);
  const email = `${prefix}-${suffix}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      username: `${prefix}_${suffix}`,
      password: "SecurePass123!",
      displayName: role,
    }),
  });
  const data = await res.json();
  assert.ok([200, 201].includes(res.status), `register failed: ${JSON.stringify(data)}`);
  if (data.user?.id) createdUserIds.push(data.user.id);
  return { data, email, password: "SecurePass123!" };
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

async function adminUser(baseUrl, tag) {
  const { data, email, password } = await register(baseUrl, tag);
  await prisma.user.update({ where: { id: data.user.id }, data: { role: "ADMIN" } });
  const token = await login(baseUrl, { email, password });
  return { id: data.user.id, token };
}

function validPayload() {
  return {
    categoryId: "morning-evening",
    title: `ذكر تجريبي ${uniqueSuffix("t")}`,
    text: "اللهم إني أسألك علماً نافعاً",
    source: "دعاء من السنة",
  };
}

async function submit(baseUrl, token, payload = validPayload()) {
  const res = await fetch(`${baseUrl}/api/adhkar/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function official(baseUrl, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${baseUrl}/api/adhkar/submissions/official`, { headers });
  assert.equal(res.status, 200);
  return (await res.json()).adhkar;
}

describe("Adhkar submissions API", () => {
  let server;

  before(async () => {
    server = await startBackend();
  });

  after(async () => {
    for (const id of createdUserIds.splice(0)) {
      try {
        await prisma.user.delete({ where: { id } });
      } catch {
        /* already gone */
      }
    }
    await server?.stop();
    await prisma.$disconnect().catch(() => {});
  });

  it("allows an authenticated user to submit a dhikr that starts as PENDING", async () => {
    const { data: user } = await register(server.baseUrl, "submitter");
    const payload = validPayload();
    const { res, data } = await submit(server.baseUrl, user.accessToken, payload);
    assert.equal(res.status, 201, JSON.stringify(data));
    const s = data.submission;
    assert.equal(s.userId, user.user.id);
    assert.equal(s.categoryId, "morning-evening");
    assert.equal(s.title, payload.title);
    assert.equal(s.text, payload.text);
    assert.equal(s.source, payload.source);
    assert.equal(s.status, "PENDING");

    const stored = await prisma.dhikrSubmission.findUnique({
      where: { id: s.id },
      include: { user: { select: { email: true } } },
    });
    assert.ok(stored, "submission must exist in the database");
    assert.equal(stored.userId, user.user.id);
    assert.equal(stored.user.email, user.user.email);
    assert.equal(stored.status, "PENDING");
  });

  it("rejects unauthenticated submission", async () => {
    const res = await fetch(`${server.baseUrl}/api/adhkar/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload()),
    });
    assert.equal(res.status, 401);
  });

  it("rejects an invalid category", async () => {
    const { data: user } = await register(server.baseUrl, "badcat");
    const { res, data } = await submit(server.baseUrl, user.accessToken, {
      ...validPayload(),
      categoryId: "unknown-category",
    });
    assert.equal(res.status, 400, JSON.stringify(data));
  });

  it("rejects empty/missing required fields", async () => {
    const { data: user } = await register(server.baseUrl, "empty");
    const bare = (overrides) => submit(server.baseUrl, user.accessToken, {
      ...validPayload(),
      ...overrides,
    });

    for (const overrides of [
      { title: "   " },
      { title: undefined },
      { text: "" },
      { text: undefined },
    ]) {
      const { res, data } = await bare(overrides);
      assert.equal(res.status, 400, JSON.stringify(data));
    }
  });

  it("ignores userId from the request body (no spoofing)", async () => {
    const { data: user } = await register(server.baseUrl, "spoofer");
    const { data: other } = await register(server.baseUrl, "victim");
    const { res, data } = await submit(server.baseUrl, user.accessToken, {
      ...validPayload(),
      userId: other.user.id,
      user_id: other.user.id,
    });
    assert.equal(res.status, 201);
    assert.equal(data.submission.userId, user.user.id);
    assert.notEqual(data.submission.userId, other.user.id);
  });

  it("never exposes PENDING or REJECTED submissions as official content", async () => {
    const { data: user } = await register(server.baseUrl, "invisible");

    const pending = await submit(server.baseUrl, user.accessToken, validPayload());
    assert.equal(pending.res.status, 201);

    const admin = await adminUser(server.baseUrl, "rejadmin");
    const rejectedRes = await submit(server.baseUrl, user.accessToken, {
      ...validPayload(),
      categoryId: "before-study",
    });
    const rejection = await fetch(
      `${server.baseUrl}/api/admin/adhkar/submissions/${rejectedRes.data.submission.id}/reject`,
      { method: "POST", headers: { Authorization: `Bearer ${admin.token}` } }
    );
    assert.equal(rejection.status, 200);

    const list = await official(server.baseUrl);
    assert.ok(
      !list.some((x) => x.id === pending.data.submission.id),
      "PENDING submission must not appear in official content"
    );
    assert.ok(
      !list.some((x) => x.id === rejectedRes.data.submission.id),
      "REJECTED submission must not appear in official content"
    );
  });

  it("returns approved adhkar publicly (even without auth) and appends new ones after older ones", async () => {
    const { data: user } = await register(server.baseUrl, "approvee");
    const admin = await adminUser(server.baseUrl, "appradmin");

    const first = await submit(server.baseUrl, user.accessToken, validPayload());
    const second = await submit(server.baseUrl, user.accessToken, {
      ...validPayload(),
      categoryId: "before-exam",
    });

    await fetch(
      `${server.baseUrl}/api/admin/adhkar/submissions/${first.data.submission.id}/approve`,
      { method: "POST", headers: { Authorization: `Bearer ${admin.token}` } }
    );
    await fetch(
      `${server.baseUrl}/api/admin/adhkar/submissions/${second.data.submission.id}/approve`,
      { method: "POST", headers: { Authorization: `Bearer ${admin.token}` } }
    );

    // Guests (no token) can read approved content.
    const guests = await official(server.baseUrl);
    const guestIds = guests.map((x) => x.id);
    assert.ok(guestIds.includes(first.data.submission.id));
    assert.ok(guestIds.includes(second.data.submission.id));

    assert.ok(
      guestIds.indexOf(first.data.submission.id) < guestIds.indexOf(second.data.submission.id),
      "earlier-approved dhikr must come before later-approved one in the public list"
    );

    const dbRow = await (
      await fetch(`${server.baseUrl}/api/admin/adhkar/submissions`, {
        headers: { Authorization: `Bearer ${admin.token}` },
      })
    ).json();
    const row = dbRow.submissions.find((x) => x.id === first.data.submission.id);
    assert.equal(row.status, "APPROVED");
  });

  it("approving the same submission twice does not create a duplicate", async () => {
    const { data: user } = await register(server.baseUrl, "dedupe");
    const admin = await adminUser(server.baseUrl, "dupadmin");

    const { res, data } = await submit(server.baseUrl, user.accessToken, validPayload());
    assert.equal(res.status, 201);
    const id = data.submission.id;

    const approve = async () =>
      fetch(`${server.baseUrl}/api/admin/adhkar/submissions/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin.token}` },
      });

    assert.equal((await approve()).status, 200);
    assert.equal((await approve()).status, 200);

    const list = await official(server.baseUrl);
    assert.equal(list.filter((x) => x.id === id).length, 1, "a dhikr must never be published twice");
  });

  it("rejects a submission and notifies ONLY the submitting user in-app", async () => {
    const { data: submitter, email: submitterEmail } = await register(server.baseUrl, "notifsub");
    const { data: stranger, email: strangerEmail } = await register(server.baseUrl, "stranger");
    const admin = await adminUser(server.baseUrl, "notifadmin");

    const { data } = await submit(server.baseUrl, submitter.accessToken, validPayload());
    const submissionId = data.submission.id;

    // Stranger tries to list pending submissions as a normal user → denied.
    const strList = await fetch(`${server.baseUrl}/api/admin/adhkar/submissions`, {
      headers: { Authorization: `Bearer ${stranger.accessToken}` },
    });
    assert.equal(strList.status, 403);

    const rejection = await fetch(
      `${server.baseUrl}/api/admin/adhkar/submissions/${submissionId}/reject`,
      { method: "POST", headers: { Authorization: `Bearer ${admin.token}` } }
    );
    assert.equal(rejection.status, 200);
    assert.equal((await rejection.json()).submission.status, "REJECTED");

    const submitterList = await fetch(`${server.baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${submitter.accessToken}` },
    });
    const submitterNotifications = (await submitterList.json()).notifications;
    const notice = submitterNotifications.find(
      (n) => n.title === "تم رفض الذكر المقترح" && n.body.includes("morning-evening")
    );
    // Body contains the Arabic category title, not the raw id — match either.
    const noticeArabic = submitterNotifications.find(
      (n) => n.title === "تم رفض الذكر المقترح" && n.body.includes("أذكار الصباح والمساء")
    );
    assert.ok(noticeArabic, "submitter must receive the in-app rejection notification");
    assert.ok(notice || noticeArabic);

    // The stranger must NOT see the targeted notification.
    const strangerList = await fetch(`${server.baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${stranger.accessToken}` },
    });
    const strangerNotifications = (await strangerList.json()).notifications;
    assert.ok(
      !strangerNotifications.some((n) => n.title === "تم رفض الذكر المقترح"),
      "rejection notification must only be visible to the submitting user"
    );

    // And the submission must not appear as official content after rejection.
    const list = await official(server.baseUrl);
    assert.ok(!list.some((x) => x.id === submissionId));
    assert.notEqual(submitterEmail, strangerEmail);
  });

  it("rejecting twice sends the rejection notification only once", async () => {
    const { data: user } = await register(server.baseUrl, "rejecttwice");
    const admin = await adminUser(server.baseUrl, "twiceadmin");
    const { data } = await submit(server.baseUrl, user.accessToken, validPayload());
    const id = data.submission.id;

    const reject = () =>
      fetch(`${server.baseUrl}/api/admin/adhkar/submissions/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin.token}` },
      });

    assert.equal((await reject()).status, 200);
    assert.equal((await reject()).status, 200);

    const notices = await prisma.appNotification.findMany({
      where: { title: "تم رفض الذكر المقترح", targetUserId: user.user.id },
    });
    assert.equal(notices.length, 1, "rejecting twice must not create a second notification");
  });

  it("blocks non-admin users from listing, approving or rejecting submissions", async () => {
    const { data: user } = await register(server.baseUrl, "blocked");
    const { data: proposer } = await register(server.baseUrl, "proposer");
    const admin = await adminUser(server.baseUrl, "blockadmin");

    const { data } = await submit(server.baseUrl, proposer.accessToken, validPayload());
    const id = data.submission.id;

    const asUser = (path) =>
      fetch(`${server.baseUrl}/api/admin/adhkar/submissions${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });

    const list = await fetch(`${server.baseUrl}/api/admin/adhkar/submissions`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    assert.equal(list.status, 403);

    assert.equal((await asUser(`/${id}/approve`)).status, 403);
    assert.equal((await asUser(`/${id}/reject`)).status, 403);

    // The submission must still be PENDING and untouched.
    const stored = await prisma.dhikrSubmission.findUnique({ where: { id } });
    assert.equal(stored.status, "PENDING");
  });

  it("returns 404 for unknown submission ids on approve/reject, and 401 when unauthenticated", async () => {
    const admin = await adminUser(server.baseUrl, "missadmin");
    const asAdmin = (path, token) =>
      fetch(`${server.baseUrl}/api/admin/adhkar/submissions${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

    assert.equal((await asAdmin("/does-not-exist/approve", admin.token)).status, 404);
    assert.equal((await asAdmin("/does-not-exist/reject", admin.token)).status, 404);

    const noAuth = await fetch(`${server.baseUrl}/api/admin/adhkar/submissions/some/approve`, {
      method: "POST",
    });
    assert.equal(noAuth.status, 401);
  });

  it("lets admin list all submissions with user info, newest first", async () => {
    const admin = await adminUser(server.baseUrl, "listadmin");
    const { data: user, email } = await register(server.baseUrl, "listsub");

    const payloads = [
      { ...validPayload(), title: "الأقدم" },
      { ...validPayload(), title: "الأوسط" },
      { ...validPayload(), title: "الأحدث" },
    ];
    for (const p of payloads) {
      const { res } = await submit(server.baseUrl, user.accessToken, p);
      assert.equal(res.status, 201);
    }

    const res = await fetch(`${server.baseUrl}/api/admin/adhkar/submissions`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(res.status, 200);
    const { submissions } = await res.json();
    assert.ok(Array.isArray(submissions));

    const mine = submissions.filter((s) => s.user.email === email);
    assert.equal(mine.length, 3);
    assert.deepEqual(
      mine.map((s) => s.title),
      ["الأحدث", "الأوسط", "الأقدم"]
    );

    for (const s of mine) {
      assert.equal(s.user.email, email);
      assert.equal(typeof s.user.id, "string");
      assert.equal(typeof s.user.username, "string");
      assert.ok(s.user.hasOwnProperty("avatarUrl"));
      assert.equal(s.user.passwordHash, undefined, "password hash must not leak");
    }
  });
});