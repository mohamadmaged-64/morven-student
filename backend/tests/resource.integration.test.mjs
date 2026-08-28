import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { startBackend } from "./helpers/server.mjs";

const prisma = new PrismaClient();

async function register(baseUrl, role) {
  const n = `${role}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
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

const withTimeout = (ms, p) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);

describe("Phase 2 - Resource authorization", () => {
  let server;

  before(async () => {
    server = await startBackend();
  });
  after(async () => {
    await server?.stop();
    await prisma.$disconnect().catch(() => {});
  });

  it("enforces full admin/owner control and member view-only access", async () => {
    const owner = await register(server.baseUrl, "owner");
    const member = await register(server.baseUrl, "member");
    const stranger = await register(server.baseUrl, "stranger");
    const adminUser = await register(server.baseUrl, "admincandidate");

    // Promote adminUser to ADMIN in DB, then log in again to embed the role.
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: "ADMIN" },
    });
    const adminToken = await login(server.baseUrl, adminUser);

    // 1. Create a resource as owner.
    const createRes = await fetch(`${server.baseUrl}/api/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${owner.accessToken}` },
      body: JSON.stringify({ title: "ملخص الرياضيات", description: "وصف", type: "file" }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).resource;
    const resourceId = created.id;
    assert.ok(created.ownerId, "resource must expose ownerId");
    assert.equal(created.ownerId, owner.id, "owner must be the creating user");

    const authOf = (token) => ({ Authorization: `Bearer ${token}` });

    // 2. Owner can update + delete (full control).
    const ownerPatch = await fetch(`${server.baseUrl}/api/resources/${resourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authOf(owner.accessToken) },
      body: JSON.stringify({ title: "ملخص الرياضيات المتقدم" }),
    });
    assert.equal(ownerPatch.status, 200, "owner can update");

    // 3. Member / stranger can view but NOT mutate.
    const memberView = await fetch(`${server.baseUrl}/api/resources/${resourceId}`, {
      headers: authOf(member.accessToken),
    });
    assert.equal(memberView.status, 200, "member can view detail");
    const memberBody = (await memberView.json()).resource;
    assert.equal(memberBody.ownerId, owner.id, "detail includes ownerId for frontend role-gating");

    const memberList = await fetch(`${server.baseUrl}/api/resources`, {
      headers: authOf(member.accessToken),
    });
    assert.equal(memberList.status, 200, "member can list");
    assert.ok((await memberList.json()).resources.some((r) => r.id === resourceId));

    const mutations = [
      ["PATCH", `${server.baseUrl}/api/resources/${resourceId}`, { title: "x" }],
      ["DELETE", `${server.baseUrl}/api/resources/${resourceId}`, null],
      ["POST", `${server.baseUrl}/api/resources/${resourceId}/notes`, { title: "ملاحظة", content: "نص" }],
      ["POST", `${server.baseUrl}/api/resources/${resourceId}/links`, { url: "https://example.com", title: "رابط" }],
    ];

    for (const [method, url, body] of mutations) {
      for (const actor of [member, stranger]) {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...authOf(actor.accessToken) },
          body: body ? JSON.stringify(body) : undefined,
        });
        assert.equal(res.status, 403, `${method} ${url} by ${actor.email} should be 403`);
      }
    }

    // 4. Owner uploads a file; member can list + download, member cannot delete.
    const fileName = "notes.txt";
    const fd = new FormData();
    fd.append("files", new Blob(["resource file content"], { type: "text/plain" }), fileName);
    const upload = await withTimeout(
      15000,
      fetch(`${server.baseUrl}/api/resources/${resourceId}/files`, {
        method: "POST",
        headers: authOf(owner.accessToken),
        body: fd,
      }),
    );
    assert.equal(upload.status, 201, "owner can upload");
    const { files } = await upload.json();
    const fileId = files[0].id;
    assert.ok(files[0].name, "file metadata includes name");

    const memberFiles = await fetch(`${server.baseUrl}/api/resources/${resourceId}/files`, {
      headers: authOf(member.accessToken),
    });
    assert.equal(memberFiles.status, 200, "member can list files");
    assert.equal((await memberFiles.json()).files.length, 1);

    const memberDownload = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/files/${fileId}/download`,
      { headers: authOf(member.accessToken) },
    );
    assert.equal(memberDownload.status, 200, "member can download");

    const memberDelFile = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/files/${fileId}`,
      { method: "DELETE", headers: authOf(member.accessToken) },
    );
    assert.equal(memberDelFile.status, 403, "member cannot delete file");

    const strangerDelFile = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/files/${fileId}`,
      { method: "DELETE", headers: authOf(stranger.accessToken) },
    );
    assert.equal(strangerDelFile.status, 403, "stranger cannot delete file");

    // 5. Per-child delete checks: member cannot delete another's note/link.
    const addNote = await fetch(`${server.baseUrl}/api/resources/${resourceId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authOf(owner.accessToken) },
      body: JSON.stringify({ title: "ملاحظة أصلية", content: "نص" }),
    });
    assert.equal(addNote.status, 201);
    const noteId = (await addNote.json()).note.id;

    const memberDelNote = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/notes/${noteId}`,
      { method: "DELETE", headers: authOf(member.accessToken) },
    );
    assert.equal(memberDelNote.status, 403, "member cannot delete note");

    const addLink = await fetch(`${server.baseUrl}/api/resources/${resourceId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authOf(owner.accessToken) },
      body: JSON.stringify({ url: "https://example.com", title: "رابط أصلي" }),
    });
    assert.equal(addLink.status, 201);
    const linkId = (await addLink.json()).link.id;

    const memberDelLink = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/links/${linkId}`,
      { method: "DELETE", headers: authOf(member.accessToken) },
    );
    assert.equal(memberDelLink.status, 403, "member cannot delete link");

    // 6. Owner can clean up their own children.
    const ownerDelFile = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/files/${fileId}`,
      { method: "DELETE", headers: authOf(owner.accessToken) },
    );
    assert.equal(ownerDelFile.status, 200);
    const ownerDelNote = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/notes/${noteId}`,
      { method: "DELETE", headers: authOf(owner.accessToken) },
    );
    assert.equal(ownerDelNote.status, 200);
    const ownerDelLink = await fetch(
      `${server.baseUrl}/api/resources/${resourceId}/links/${linkId}`,
      { method: "DELETE", headers: authOf(owner.accessToken) },
    );
    assert.equal(ownerDelLink.status, 200);

    // 7. Admin can update + delete a resource owned by another user.
    const adminPatch = await fetch(`${server.baseUrl}/api/resources/${resourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authOf(adminToken) },
      body: JSON.stringify({ title: "عدله الأدمن" }),
    });
    assert.equal(adminPatch.status, 200, "admin can update another user's resource");

    const adminDel = await fetch(`${server.baseUrl}/api/resources/${resourceId}`, {
      method: "DELETE",
      headers: authOf(adminToken),
    });
    assert.equal(adminDel.status, 200, "admin can delete another user's resource");

    const gone = await fetch(`${server.baseUrl}/api/resources/${resourceId}`, {
      headers: authOf(owner.accessToken),
    });
    assert.equal(gone.status, 404, "resource removed after admin delete");
  });

  it("requires authentication to list resources", async () => {
    const res = await fetch(`${server.baseUrl}/api/resources`);
    assert.equal(res.status, 401);
  });
});
