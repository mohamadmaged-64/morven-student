import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";

async function registerUser(baseUrl, suffix) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `grp-${suffix}@example.com`,
      username: `grp_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`,
      password: "SecurePass123!",
      displayName: `Group User ${suffix}`,
    }),
  });
  return res.json();
}

async function createGroup(baseUrl, token, name) {
  const res = await fetch(`${baseUrl}/api/groups`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

describe("Phase 3 - Groups", () => {
  let server;
  before(async () => { server = await startBackend(); });
  after(async () => { await server?.stop(); });

  describe("Group Creation", () => {
    it("creates a group and makes creator OWNER", async () => {
      const reg = await registerUser(server.baseUrl, `cr-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, reg.accessToken, "Test Group");
      assert.ok(group.id);
      assert.equal(group.name, "Test Group");
      assert.ok(group.joinCode);
      assert.equal(group.joinCode.length, 6);
      assert.equal(group.creatorId, reg.user.id);
    });

    it("generates unique 6-digit join codes", async () => {
      const reg = await registerUser(server.baseUrl, `uc-${Date.now()}`);
      const g1 = await createGroup(server.baseUrl, reg.accessToken, "Group 1");
      const g2 = await createGroup(server.baseUrl, reg.accessToken, "Group 2");
      assert.notEqual(g1.group.joinCode, g2.group.joinCode);
      assert.equal(g1.group.joinCode.length, 6);
      assert.equal(g2.group.joinCode.length, 6);
    });

    it("enforces maximum 3 groups per user", async () => {
      const reg = await registerUser(server.baseUrl, `max-${Date.now()}`);
      await createGroup(server.baseUrl, reg.accessToken, "G1");
      await createGroup(server.baseUrl, reg.accessToken, "G2");
      await createGroup(server.baseUrl, reg.accessToken, "G3");
      const res = await fetch(`${server.baseUrl}/api/groups`, {
        method: "POST",
        headers: { Authorization: `Bearer ${reg.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "G4" }),
      });
      assert.equal(res.status, 400);
    });

    it("rejects unauthenticated group creation", async () => {
      const res = await fetch(`${server.baseUrl}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nope" }),
      });
      assert.equal(res.status, 401);
    });

    it("rejects empty group name", async () => {
      const reg = await registerUser(server.baseUrl, `en-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups`, {
        method: "POST",
        headers: { Authorization: `Bearer ${reg.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      assert.equal(res.status, 400);
    });
  });

  describe("Joining by Code", () => {
    it("joins a group using a valid 6-digit code", async () => {
      const owner = await registerUser(server.baseUrl, `jo-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Joinable");

      const member = await registerUser(server.baseUrl, `jm-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.group.id, group.id);
    });

    it("rejects invalid join code", async () => {
      const reg = await registerUser(server.baseUrl, `ji-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${reg.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: "000000" }),
      });
      assert.equal(res.status, 404);
    });

    it("rejects already a member", async () => {
      const owner = await registerUser(server.baseUrl, `ja-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Dup");

      const member = await registerUser(server.baseUrl, `jam-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      assert.equal(res.status, 409);
    });
  });

  describe("List Groups", () => {
    it("lists groups the user belongs to", async () => {
      const reg = await registerUser(server.baseUrl, `ls-${Date.now()}`);
      await createGroup(server.baseUrl, reg.accessToken, "Listed");
      const res = await fetch(`${server.baseUrl}/api/groups`, {
        headers: { Authorization: `Bearer ${reg.accessToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(data.groups));
      assert.ok(data.groups.length >= 1);
    });
  });

  describe("Group Details", () => {
    it("returns group details with members for members", async () => {
      const owner = await registerUser(server.baseUrl, `dt-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Detail");
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.group.members);
      assert.ok(data.group.members.length >= 1);
      assert.equal(data.group.members[0].role, "OWNER");
    });

    it("returns the join code to every member regardless of role", async () => {
      const owner = await registerUser(server.baseUrl, `jc-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "JoinCode");
      const member = await registerUser(server.baseUrl, `jcm-${Date.now()}`);
      const admin = await registerUser(server.baseUrl, `jca-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });

      // MEMBER sees the join code.
      const memberDetail = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        headers: { Authorization: `Bearer ${member.accessToken}` },
      });
      const memberData = await memberDetail.json();
      assert.equal(memberDetail.status, 200);
      assert.match(memberData.group.joinCode, /^\d{6}$/);

      // ADMIN sees the same join code.
      const adminDetail = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      });
      const adminData = await adminDetail.json();
      assert.equal(adminDetail.status, 200);
      assert.equal(adminData.group.joinCode, memberData.group.joinCode);
    });

    it("rejects non-member access", async () => {
      const owner = await registerUser(server.baseUrl, `dn-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Private");
      const outsider = await registerUser(server.baseUrl, `do-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        headers: { Authorization: `Bearer ${outsider.accessToken}` },
      });
      assert.equal(res.status, 403);
    });
  });

  describe("Leaving Groups", () => {
    it("allows a MEMBER to leave", async () => {
      const owner = await registerUser(server.baseUrl, `lv-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Leaveable");
      const member = await registerUser(server.baseUrl, `lm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}` },
      });
      assert.equal(res.status, 200);
    });

    it("OWNER can leave a non-empty group, transferring ownership to the first remaining member", async () => {
      const owner = await registerUser(server.baseUrl, `ol-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "OwnLeave");

      // Two members join in order: m1 is the first, m2 joins after.
      const m1 = await registerUser(server.baseUrl, `ol1-${Date.now()}`);
      const m2 = await registerUser(server.baseUrl, `ol2-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${m1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${m2.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });

      // OWNER leaves.
      const leaveRes = await fetch(`${server.baseUrl}/api/groups/${group.id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(leaveRes.status, 200);

      // The first remaining member (m1) immediately becomes OWNER.
      const detailsRes = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${m1.accessToken}` },
      });
      assert.equal(detailsRes.status, 200);
      const { group: details } = await detailsRes.json();
      assert.equal(details.role, "OWNER");
      const m1Member = details.members.find((mm) => mm.id === m1.user.id);
      const m2Member = details.members.find((mm) => mm.id === m2.user.id);
      assert.equal(m1Member.role, "OWNER");
      assert.equal(m2Member.role, "MEMBER");

      // The previous OWNER is completely removed from the group.
      const oldOwnerRes = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(oldOwnerRes.status, 403);

      // The new OWNER receives all OWNER permissions (e.g. can edit the group).
      const editRes = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${m1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed by new owner" }),
      });
      assert.equal(editRes.status, 200);
    });

    it("OWNER leaving alone deletes the now-empty group", async () => {
      const owner = await registerUser(server.baseUrl, `solo-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "SoloLeave");
      const leaveRes = await fetch(`${server.baseUrl}/api/groups/${group.id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(leaveRes.status, 200);
      // The group no longer exists.
      const detailsRes = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(detailsRes.status, 404);
    });
  });

  describe("Deletion", () => {
    it("allows OWNER to delete", async () => {
      const owner = await registerUser(server.baseUrl, `dl-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Deletable");
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(res.status, 200);
    });

    it("OWNER cannot delete a group that has other members", async () => {
      const owner = await registerUser(server.baseUrl, `dnd-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "NotEmpty");
      const member = await registerUser(server.baseUrl, `dnm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(res.status, 400);
      // The group still exists.
      const detailsRes = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(detailsRes.status, 200);
    });

    it("prevents non-OWNER from deleting", async () => {
      const owner = await registerUser(server.baseUrl, `nd-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "NotDel");
      const member = await registerUser(server.baseUrl, `nm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${member.accessToken}` },
      });
      assert.equal(res.status, 403);
    });
  });

  describe("Member Removal", () => {
    it("OWNER cannot remove a MEMBER", async () => {
      const owner = await registerUser(server.baseUrl, `rm-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Removable");
      const member = await registerUser(server.baseUrl, `rmm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${member.user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(res.status, 403);
    });

    it("ADMIN can remove a MEMBER", async () => {
      const owner = await registerUser(server.baseUrl, `arm-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "AdminRemovable");
      const admin = await registerUser(server.baseUrl, `arma-${Date.now()}`);
      const member = await registerUser(server.baseUrl, `armm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      // Owner promotes admin
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${member.user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      });
      assert.equal(res.status, 200);
    });

    it("ADMIN can remove another ADMIN", async () => {
      const owner = await registerUser(server.baseUrl, `aam-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "AdminCanRemove");
      const admin1 = await registerUser(server.baseUrl, `aam1-${Date.now()}`);
      const admin2 = await registerUser(server.baseUrl, `aam2-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin2.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      // Owner promotes both to ADMIN
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin1.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin2.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin2.user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${admin1.accessToken}` },
      });
      assert.equal(res.status, 200);
    });

    it("ADMIN can remove the OWNER", async () => {
      const owner = await registerUser(server.baseUrl, `armo-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "AdminRemovesOwner");
      const admin = await registerUser(server.baseUrl, `armoa-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${owner.user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      });
      assert.equal(res.status, 200);
    });

    it("ADMIN cannot remove themselves", async () => {
      const owner = await registerUser(server.baseUrl, `asr-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "AdminSelfRemove");
      const admin = await registerUser(server.baseUrl, `asra-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin.user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      });
      assert.equal(res.status, 400);
    });

    it("MEMBER cannot remove others", async () => {
      const owner = await registerUser(server.baseUrl, `nr-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "NoRemove");
      const m1 = await registerUser(server.baseUrl, `nr1-${Date.now()}`);
      const m2 = await registerUser(server.baseUrl, `nr2-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${m1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${m2.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${m2.user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${m1.accessToken}` },
      });
      assert.equal(res.status, 403);
    });

    it("OWNER can still edit the group", async () => {
      const owner = await registerUser(server.baseUrl, `ede-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Editable");
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Edited" }),
      });
      assert.equal(res.status, 200);
    });

    it("ADMIN can edit the group", async () => {
      const owner = await registerUser(server.baseUrl, `aed-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "AdmEdit");
      const admin = await registerUser(server.baseUrl, `aedm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${admin.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Admin edited" }),
      });
      assert.equal(res.status, 200);
    });

    it("MEMBER cannot edit the group", async () => {
      const owner = await registerUser(server.baseUrl, `med-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "MemEdit");
      const member = await registerUser(server.baseUrl, `medm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Member tried" }),
      });
      assert.equal(res.status, 403);
    });

    it("OWNER can still delete the group", async () => {
      const owner = await registerUser(server.baseUrl, `del-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Deletable");
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(res.status, 200);
    });
  });

  describe("Role Management", () => {
    it("OWNER can promote MEMBER to ADMIN", async () => {
      const owner = await registerUser(server.baseUrl, `prom-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "Promote");
      const member = await registerUser(server.baseUrl, `prmm-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${member.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      assert.equal(res.status, 200);
    });

    it("OWNER cannot change own role", async () => {
      const owner = await registerUser(server.baseUrl, `ocr-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "OwnRole");
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${owner.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MEMBER" }),
      });
      assert.equal(res.status, 400);
    });

    it("ADMIN cannot change other ADMIN's role", async () => {
      const owner = await registerUser(server.baseUrl, `acr-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "AdminRole");
      const admin1 = await registerUser(server.baseUrl, `ac1-${Date.now()}`);
      const admin2 = await registerUser(server.baseUrl, `ac2-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${admin2.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      // Owner promotes both to ADMIN
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin1.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin2.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      // Admin1 tries to demote admin2
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${admin2.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${admin1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MEMBER" }),
      });
      assert.equal(res.status, 403);
    });

    it("MEMBER cannot change roles", async () => {
      const owner = await registerUser(server.baseUrl, `mcr-${Date.now()}`);
      const { group } = await createGroup(server.baseUrl, owner.accessToken, "MemRole");
      const m1 = await registerUser(server.baseUrl, `mcr1-${Date.now()}`);
      const m2 = await registerUser(server.baseUrl, `mcr2-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${m1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      await fetch(`${server.baseUrl}/api/groups/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${m2.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: group.joinCode }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/members/${m2.user.id}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${m1.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      assert.equal(res.status, 403);
    });
  });
});
