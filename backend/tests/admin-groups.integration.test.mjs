import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";
import { config as loadDotEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadDotEnv();

const prisma = new PrismaClient();

const createdUserIds = [];
const createdGroupIds = [];

function uniqueSuffix(tag) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${tag}${ts}${rnd}`;
}

async function register(baseUrl, suffix) {
  const safe = suffix.replace(/[^a-zA-Z0-9]/g, "_");
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `admgrp-${safe}@example.com`,
      username: `admgrp_${safe}`,
      password: "SecurePass123!",
      displayName: `Admin Test ${suffix}`,
    }),
  });
  const data = await res.json();
  assert.ok([200, 201].includes(res.status), `register failed: ${JSON.stringify(data)}`);
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
  return { res, data: await res.json() };
}

async function createGroup(baseUrl, token, name) {
  const { res, data } = await api(baseUrl, token, "/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  assert.equal(res.status, 201, `createGroup failed: ${JSON.stringify(data)}`);
  createdGroupIds.push(data.group.id);
  return data.group;
}

async function joinGroup(baseUrl, token, joinCode) {
  const { res, data } = await api(baseUrl, token, "/api/groups/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode }),
  });
  assert.equal(res.status, 200);
  return data.group;
}

// Creates a group owned by `ownerId` directly (bypasses the USER create limit)
// so it can be used purely as a join target for the ADMIN.
async function createGroupDirect(ownerId, name) {
  let joinCode;
  do {
    joinCode = String(Math.floor(100000 + Math.random() * 900000));
  } while (await prisma.group.findUnique({ where: { joinCode } }));
  const g = await prisma.group.create({
    data: { name, description: null, joinCode, creatorId: ownerId },
  });
  await prisma.groupMember.create({ data: { groupId: g.id, userId: ownerId, role: "OWNER" } });
  createdGroupIds.push(g.id);
  return g;
}

describe("Global ADMIN group management", () => {
  let server;
  let u1, u2, admin;
  let adminToken;

  before(async () => {
    server = await startBackend();
    // Two normal users, and one user promoted to ADMIN purely for this test.
    u1 = await register(server.baseUrl, uniqueSuffix("u1"));
    u2 = await register(server.baseUrl, uniqueSuffix("u2"));
    admin = await register(server.baseUrl, uniqueSuffix("adm"));
    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: "ADMIN" },
    });
    const loginAdmin = await login(server.baseUrl, admin.user.email);
    assert.equal(loginAdmin.user.role, "ADMIN");
    adminToken = loginAdmin.accessToken;
  });

  after(async () => {
    for (const id of createdGroupIds) {
      try { await prisma.group.delete({ where: { id } }); } catch { /* already gone */ }
    }
    for (const id of createdUserIds) {
      try { await prisma.user.delete({ where: { id } }); } catch { /* already gone */ }
    }
    await prisma.$disconnect();
    await server?.stop();
  });

  it("ADMIN has full, non-member management access to a group created by a normal USER", async () => {
    // 1. Normal USER creates Group A.
    const groupA = await createGroup(server.baseUrl, u1.accessToken, "AdminSeesA");

    // 2. ADMIN is NOT a member of Group A.
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: groupA.id, userId: admin.user.id } },
    });
    assert.equal(membership, null, "ADMIN must NOT be auto-added as a member");

    // 3. ADMIN sees Group A in the Groups list without joining.
    const list = await api(server.baseUrl, adminToken, "/api/groups");
    assert.equal(list.res.status, 200);
    const entry = list.data.groups.find((g) => g.id === groupA.id);
    assert.ok(entry, "Group A must appear in the ADMIN's group list");
    assert.equal(entry.isMember, false);
    assert.equal(entry.role, "ADMIN");
    assert.ok(entry.memberCount >= 1);

    // u2 joins Group A as a normal member (so there are members to manage).
    const joined = await joinGroup(server.baseUrl, u2.accessToken, groupA.joinCode);
    assert.equal(joined.id, groupA.id);

    // 4. ADMIN can open Group A even though they never joined.
    const details = await api(server.baseUrl, adminToken, `/api/groups/${groupA.id}`);
    assert.equal(details.res.status, 200);
    assert.equal(details.data.group.isMember, false);
    assert.equal(details.data.group.role, "ADMIN");
    const memberIds = details.data.group.members.map((m) => m.id);
    assert.ok(memberIds.includes(u1.user.id), "OWNER must be listed");
    assert.ok(memberIds.includes(u2.user.id), "MEMBER must be listed");
    assert.ok(!memberIds.includes(admin.user.id), "ADMIN must NOT be added as a member");
    assert.equal(details.data.group.members.find((m) => m.id === u1.user.id).role, "OWNER");

    // ADMIN can also view the group leaderboard.
    const lb = await api(server.baseUrl, adminToken, `/api/groups/${groupA.id}/leaderboard`);
    assert.equal(lb.res.status, 200);

    // 8. Normal MEMBERs cannot perform ADMIN-only actions.
    const memberEdit = await api(server.baseUrl, u2.accessToken, `/api/groups/${groupA.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hacked" }),
    });
    assert.equal(memberEdit.res.status, 403);

    const memberRemove = await api(server.baseUrl, u2.accessToken, `/api/groups/${groupA.id}/members/${u1.user.id}`, {
      method: "DELETE",
    });
    assert.equal(memberRemove.res.status, 403);

    const memberRoleChange = await api(server.baseUrl, u2.accessToken, `/api/groups/${groupA.id}/members/${u1.user.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "MEMBER" }),
    });
    assert.equal(memberRoleChange.res.status, 403);

    const memberDelete = await api(server.baseUrl, u2.accessToken, `/api/groups/${groupA.id}`, {
      method: "DELETE",
    });
    assert.equal(memberDelete.res.status, 403);

    // 9. Existing OWNER permissions still work.
    const ownerEdit = await api(server.baseUrl, u1.accessToken, `/api/groups/${groupA.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "OwnerEdited" }),
    });
    assert.equal(ownerEdit.res.status, 200);

    // OWNER (non-ADMIN) still cannot remove members (unchanged behavior).
    const ownerRemove = await api(server.baseUrl, u1.accessToken, `/api/groups/${groupA.id}/members/${u2.user.id}`, {
      method: "DELETE",
    });
    assert.equal(ownerRemove.res.status, 403);

    // 5. ADMIN can edit Group A without joining.
    const adminEdit = await api(server.baseUrl, adminToken, `/api/groups/${groupA.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AdminEdited" }),
    });
    assert.equal(adminEdit.res.status, 200);
    assert.equal(adminEdit.data.group.name, "AdminEdited");

    // 6. ADMIN can remove a member from Group A.
    const adminRemove = await api(server.baseUrl, adminToken, `/api/groups/${groupA.id}/members/${u2.user.id}`, {
      method: "DELETE",
    });
    assert.equal(adminRemove.res.status, 200);
    const afterRemove = await api(server.baseUrl, adminToken, `/api/groups/${groupA.id}`);
    assert.equal(afterRemove.res.status, 200);
    assert.ok(!afterRemove.data.group.members.some((m) => m.id === u2.user.id));

    // 7. ADMIN can delete Group A even though the OWNER is still a member.
    const adminDelete = await api(server.baseUrl, adminToken, `/api/groups/${groupA.id}`, {
      method: "DELETE",
    });
    assert.equal(adminDelete.res.status, 200);
    const gone = await api(server.baseUrl, u1.accessToken, `/api/groups/${groupA.id}`);
    assert.equal(gone.res.status, 404);
  });

  it("unrelated groups are unaffected by ADMIN management", async () => {
    // Group B is owned by u2 and is NOT touched by the ADMIN flow above.
    const groupB = await createGroup(server.baseUrl, u2.accessToken, "UnrelatedB");
    await joinGroup(server.baseUrl, u1.accessToken, groupB.joinCode);

    // The OWNER edits their own group as usual.
    const editB = await api(server.baseUrl, u2.accessToken, `/api/groups/${groupB.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "UnrelatedBRenamed" }),
    });
    assert.equal(editB.res.status, 200);

    // ADMIN still sees it with intact membership.
    const details = await api(server.baseUrl, adminToken, `/api/groups/${groupB.id}`);
    assert.equal(details.res.status, 200);
    assert.equal(details.data.group.name, "UnrelatedBRenamed");
    assert.equal(details.data.group.members.length, 2);

    // ADMIN list entry is unaffected and shows the real member count.
    const list = await api(server.baseUrl, adminToken, "/api/groups");
    const entry = list.data.groups.find((g) => g.id === groupB.id);
    assert.ok(entry);
    assert.equal(entry.memberCount, 2);

    // Cleanup is handled in `after` via createdGroupIds.
  });

  it("normal USER is still limited to 3 groups (create AND join)", async () => {
    const u3 = await register(server.baseUrl, uniqueSuffix("u3"));

    // A normal USER can create exactly 3 groups...
    for (let i = 0; i < 3; i++) {
      await createGroup(server.baseUrl, u3.accessToken, `LimitOwner${i}`);
    }

    // ...but the 4th create is rejected by the 3-group limit.
    const blockedCreate = await api(server.baseUrl, u3.accessToken, "/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "LimitOwner4" }),
    });
    assert.equal(blockedCreate.res.status, 400);
    assert.match(blockedCreate.data.error, /الأقصى من المجموعات/);

    // A normal USER at the limit is also blocked from joining more groups.
    const joinTarget = await createGroup(server.baseUrl, u2.accessToken, "LimitJoinTarget");
    const blockedJoin = await api(server.baseUrl, u3.accessToken, "/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: joinTarget.joinCode }),
    });
    assert.equal(blockedJoin.res.status, 400);
    assert.match(blockedJoin.data.error, /الأقصى من المجموعات/);

    const memberships = await prisma.groupMember.count({ where: { userId: u3.user.id } });
    assert.equal(memberships, 3, "normal USER must stay at exactly 3 memberships");
  });

  it("platform ADMIN is exempt from the 3-group limit (create AND join)", async () => {
    // ADMIN can create more than 3 groups in a row, all successfully.
    for (let i = 0; i < 4; i++) {
      await createGroup(server.baseUrl, adminToken, `AdminUnlimited${i}`);
    }

    // Group targets owned by a normal USER; the ADMIN joins all 4 without
    // being blocked (a normal USER could not join past 3 memberships).
    const u4 = await register(server.baseUrl, uniqueSuffix("u4"));
    const joinTargets = [];
    for (let i = 0; i < 4; i++) {
      joinTargets.push(await createGroupDirect(u4.user.id, `AdminJoinMe${i}`));
    }
    for (const g of joinTargets) {
      await joinGroup(server.baseUrl, adminToken, g.joinCode);
    }

    // ADMIN's membership count far exceeds the USER limit (4 owned + 4 joined).
    const memberships = await prisma.groupMember.count({ where: { userId: admin.user.id } });
    assert.ok(memberships > 3, `ADMIN should exceed the 3-group limit (got ${memberships})`);

    // The joined groups appear as real memberships (isMember=true) in ADMIN's list.
    const list = await api(server.baseUrl, adminToken, "/api/groups");
    assert.equal(list.res.status, 200);
    for (const g of joinTargets) {
      const entry = list.data.groups.find((x) => x.id === g.id);
      assert.ok(entry, `joined group ${g.name} must appear in ADMIN list`);
      assert.equal(entry.isMember, true, "ADMIN is now a real member of the joined group");
    }
  });

  it("ADMIN removing the OWNER transfers ownership to the earliest-joining remaining member", async () => {
    // Mohammed = owner, Ahmed = 2nd, Mahmoud = 3rd.
    const mohammed = await register(server.baseUrl, uniqueSuffix("mohammed"));
    const ahmed = await register(server.baseUrl, uniqueSuffix("ahmed"));
    const mahmoud = await register(server.baseUrl, uniqueSuffix("mahmoud"));

    const group = await createGroup(server.baseUrl, mohammed.accessToken, "OwnershipTransfer");

    // Add members in a known join order (explicit createdAt so the order is
    // deterministic: Ahmed joined before Mahmoud).
    const base = Date.now();
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: ahmed.user.id, role: "MEMBER", createdAt: new Date(base + 1000) },
    });
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: mahmoud.user.id, role: "MEMBER", createdAt: new Date(base + 2000) },
    });

    // ADMIN is NOT a member of the group.
    const adminMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: admin.user.id } },
    });
    assert.equal(adminMembership, null, "ADMIN must not be a member of the group");

    // ADMIN removes the current Owner (Mohammed).
    const removal = await api(server.baseUrl, adminToken, `/api/groups/${group.id}/members/${mohammed.user.id}`, {
      method: "DELETE",
    });
    assert.equal(removal.res.status, 200, `ADMIN owner removal failed: ${JSON.stringify(removal.data)}`);

    // Mohammed is removed from GroupMember.
    const mohammedRow = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: mohammed.user.id } },
    });
    assert.equal(mohammedRow, null, "removed owner must no longer be a member");

    // Ahmed (earliest-joining remaining member) becomes the new OWNER.
    const ahmedRow = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: ahmed.user.id } },
    });
    assert.equal(ahmedRow?.role, "OWNER", "earliest remaining member must become OWNER");

    // Mahmoud remains a normal member.
    const mahmoudRow = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: mahmoud.user.id } },
    });
    assert.equal(mahmoudRow?.role, "MEMBER", "later member must remain a normal member");

    // The group still exists and ADMIN is still NOT a member.
    const still = await prisma.group.findUnique({ where: { id: group.id } });
    assert.ok(still, "group must still exist after ownership transfer");
    const adminMembershipAfter = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: admin.user.id } },
    });
    assert.equal(adminMembershipAfter, null, "ADMIN must still not be a member");

    // The API confirms the new owner.
    const details = await api(server.baseUrl, adminToken, `/api/groups/${group.id}`);
    assert.equal(details.res.status, 200);
    const roles = details.data.group.members.map((m) => `${m.role}:${m.username}`);
    assert.ok(roles.includes(`OWNER:${ahmed.user.username}`), `Ahmed shown as OWNER (got ${roles})`);
    assert.ok(!roles.some((r) => r.includes(mohammed.user.username)), "Mohammed no longer listed");
  });
});