import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";

async function registerUser(baseUrl, suffix) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `room-${suffix}@example.com`,
      username: `room_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`,
      password: "SecurePass123!",
      displayName: `Room User ${suffix}`,
    }),
  });
  return res.json();
}

async function createGroupAndJoin(baseUrl, ownerSuffix, memberSuffix) {
  const owner = await registerUser(baseUrl, ownerSuffix);
  const gRes = await fetch(`${baseUrl}/api/groups`, {
    method: "POST",
    headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `Room Test Group ${ownerSuffix}` }),
  });
  const { group } = await gRes.json();

  let member = null;
  if (memberSuffix) {
    member = await registerUser(baseUrl, memberSuffix);
    await fetch(`${baseUrl}/api/groups/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: group.joinCode }),
    });
  }

  return { owner, group, member };
}

describe("Phase 4 - Rooms", () => {
  let server;
  before(async () => { server = await startBackend(); });
  after(async () => { await server?.stop(); });

  describe("Room Creation", () => {
    it("creates a room in a group (OWNER/ADMIN)", async () => {
      const { owner, group } = await createGroupAndJoin(server.baseUrl, `rcr-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Study Room" }),
      });
      const data = await res.json();
      assert.equal(res.status, 201);
      assert.ok(data.room.id);
      assert.equal(data.room.name, "Study Room");
      assert.equal(data.room.groupId, group.id);
    });

    it("rejects MEMBER from creating rooms", async () => {
      const { owner, group, member } = await createGroupAndJoin(server.baseUrl, `rcr2-${Date.now()}`, `rcrm-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No Room" }),
      });
      assert.equal(res.status, 403);
    });

    it("rejects non-member from creating rooms", async () => {
      const { group } = await createGroupAndJoin(server.baseUrl, `rcr3-${Date.now()}`);
      const outsider = await registerUser(server.baseUrl, `rcro-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${outsider.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No" }),
      });
      assert.equal(res.status, 403);
    });

    it("rejects empty room name", async () => {
      const { owner, group } = await createGroupAndJoin(server.baseUrl, `rcr4-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      assert.equal(res.status, 400);
    });
  });

  describe("Room Listing", () => {
    it("lists rooms for group members", async () => {
      const { owner, group } = await createGroupAndJoin(server.baseUrl, `rls-${Date.now()}`);
      await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Room 1" }),
      });
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.rooms.length >= 1);
    });

    it("rejects non-member from listing rooms", async () => {
      const { group } = await createGroupAndJoin(server.baseUrl, `rls2-${Date.now()}`);
      const outsider = await registerUser(server.baseUrl, `rlso-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        headers: { Authorization: `Bearer ${outsider.accessToken}` },
      });
      assert.equal(res.status, 403);
    });
  });

  describe("Room Details", () => {
    it("returns room details for members", async () => {
      const { owner, group } = await createGroupAndJoin(server.baseUrl, `rdt-${Date.now()}`);
      const createRes = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Detail Room" }),
      });
      const { room } = await createRes.json();
      const res = await fetch(`${server.baseUrl}/api/rooms/${room.id}`, {
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.room.name, "Detail Room");
    });
  });

  describe("Room Editing", () => {
    it("ADMIN can edit room", async () => {
      const { owner, group } = await createGroupAndJoin(server.baseUrl, `red-${Date.now()}`);
      const createRes = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Editable" }),
      });
      const { room } = await createRes.json();
      const res = await fetch(`${server.baseUrl}/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Edited" }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.room.name, "Edited");
    });

    it("MEMBER cannot edit room", async () => {
      const { owner, group, member } = await createGroupAndJoin(server.baseUrl, `red2-${Date.now()}`, `redm-${Date.now()}`);
      const createRes = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No Edit" }),
      });
      const { room } = await createRes.json();
      const res = await fetch(`${server.baseUrl}/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${member.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacked" }),
      });
      assert.equal(res.status, 403);
    });
  });

  describe("Room Deletion", () => {
    it("ADMIN can delete room", async () => {
      const { owner, group } = await createGroupAndJoin(server.baseUrl, `rdl-${Date.now()}`);
      const createRes = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Deletable" }),
      });
      const { room } = await createRes.json();
      const res = await fetch(`${server.baseUrl}/api/rooms/${room.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${owner.accessToken}` },
      });
      assert.equal(res.status, 200);
    });

    it("MEMBER cannot delete room", async () => {
      const { owner, group, member } = await createGroupAndJoin(server.baseUrl, `rdl2-${Date.now()}`, `rdlm-${Date.now()}`);
      const createRes = await fetch(`${server.baseUrl}/api/groups/${group.id}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No Del" }),
      });
      const { room } = await createRes.json();
      const res = await fetch(`${server.baseUrl}/api/rooms/${room.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${member.accessToken}` },
      });
      assert.equal(res.status, 403);
    });
  });
});
