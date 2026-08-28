import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";
import Client from "socket.io-client";

async function registerUser(baseUrl, suffix) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `foc-${suffix}@example.com`,
      username: `foc_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`,
      password: "SecurePass123!",
      displayName: `Foc User ${suffix}`,
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

async function joinGroup(baseUrl, token, joinCode) {
  const res = await fetch(`${baseUrl}/api/groups/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode }),
  });
  return res.json();
}

function createClient(baseUrl, token) {
  return Client(`${baseUrl}/connect`, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true,
  });
}

function waitConnect(client, label) {
  return new Promise((resolve, reject) => {
    client.on("connect", () => resolve());
    client.on("connect_error", (err) => reject(new Error(`${label} connect_error: ${err.message}`)));
    setTimeout(() => reject(new Error(`${label} connect timeout`)), 5000);
  });
}

describe("Focusing status (cross-group)", () => {
  let server;
  let baseUrl;
  before(async () => {
    server = await startBackend();
    baseUrl = server.baseUrl;
  });
  after(async () => {
    await server?.stop();
  });

  it("broadcasts focusing=true to EVERY group the user belongs to", async () => {
    const ts = Date.now();
    const userA = await registerUser(baseUrl, `a-${ts}`);
    const userB = await registerUser(baseUrl, `b-${ts}`);

    // A is member of two groups (cross-group focus).
    const g1 = await createGroup(baseUrl, userA.accessToken, "Focus G1");
    const g2 = await createGroup(baseUrl, userA.accessToken, "Focus G2");

    // B joins both groups too.
    await joinGroup(baseUrl, userB.accessToken, g1.group.joinCode);
    await joinGroup(baseUrl, userB.accessToken, g2.group.joinCode);

    const clientA = createClient(baseUrl, userA.accessToken);
    const clientB = createClient(baseUrl, userB.accessToken);
    await waitConnect(clientA, "A");
    await waitConnect(clientB, "B");

    // B joins both group rooms so it can observe cross-group updates.
    clientB.emit("join-group", { groupId: g1.group.id });
    clientB.emit("join-group", { groupId: g2.group.id });

    const received = [];
    await new Promise((resolve, reject) => {
      clientB.on("user-focusing-update", (data) => {
        received.push(data);
        if (
          received.some((d) => d.groupId === g1.group.id && d.userId === userA.user.id && d.focusing === true) &&
          received.some((d) => d.groupId === g2.group.id && d.userId === userA.user.id && d.focusing === true)
        ) {
          resolve();
        }
      });
      clientB.on("connect_error", reject);

      clientA.on("connect", () => {});
      // emit focusing after a short delay so listeners are attached
      setTimeout(() => {
        clientA.emit("focusing-state", { focusing: true });
      }, 300);

      setTimeout(() => reject(new Error("cross-group focusing timeout")), 6000);
    });

    assert.ok(
      arrayIncludes(received, g1.group.id, userA.user.id, true),
      "should receive focusing=true for group 1",
    );
    assert.ok(
      arrayIncludes(received, g2.group.id, userA.user.id, true),
      "should receive focusing=true for group 2 (cross-group)",
    );

    clientA.close();
    clientB.close();
  });

  it("presence snapshot in every group reflects the user as focusing", async () => {
    const ts = Date.now();
    const userA = await registerUser(baseUrl, `c-${ts}`);
    const userB = await registerUser(baseUrl, `d-${ts}`);

    const g1 = await createGroup(baseUrl, userA.accessToken, "Pres G1");
    const g2 = await createGroup(baseUrl, userA.accessToken, "Pres G2");
    await joinGroup(baseUrl, userB.accessToken, g1.group.joinCode);

    const clientA = createClient(baseUrl, userA.accessToken);
    const clientB = createClient(baseUrl, userB.accessToken);
    await waitConnect(clientA, "A");
    await waitConnect(clientB, "B");

    // B only joined group 1; A focuses.
    clientA.emit("focusing-state", { focusing: true });

    await new Promise((resolve, reject) => {
      clientB.on("group-presence-update", (data) => {
        if (data.groupId !== g1.group.id) return;
        const me = data.users.find((u) => u.userId === userA.user.id);
        if (me && me.focusing === true) {
          resolve();
        }
      });
      clientB.on("connect_error", reject);

      // B joining the group triggers a membership-based presence push.
      setTimeout(() => {
        clientB.emit("join-group", { groupId: g1.group.id });
      }, 300);

      setTimeout(() => reject(new Error("presence focusing timeout")), 6000);
    });

    clientA.close();
    clientB.close();
  });

  it("clears focusing when the user pauses/stops", async () => {
    const ts = Date.now();
    const userA = await registerUser(baseUrl, `e-${ts}`);
    const userB = await registerUser(baseUrl, `f-${ts}`);

    const g1 = await createGroup(baseUrl, userA.accessToken, "Off G1");
    await joinGroup(baseUrl, userB.accessToken, g1.group.joinCode);

    const clientA = createClient(baseUrl, userA.accessToken);
    const clientB = createClient(baseUrl, userB.accessToken);
    await waitConnect(clientA, "A");
    await waitConnect(clientB, "B");
    clientB.emit("join-group", { groupId: g1.group.id });

    await new Promise((resolve, reject) => {
      clientB.on("user-focusing-update", (data) => {
        if (data.groupId === g1.group.id && data.userId === userA.user.id) {
          if (data.focusing === false) {
            resolve();
          } else {
            // got true first; now signal stop
            setTimeout(() => clientA.emit("focusing-state", { focusing: false }), 200);
          }
        }
      });
      clientB.on("connect_error", reject);

      setTimeout(() => clientA.emit("focusing-state", { focusing: true }), 300);
      setTimeout(() => reject(new Error("clear focusing timeout")), 7000);
    });

    clientA.close();
    clientB.close();
  });
});

function arrayIncludes(list, groupId, userId, focusing) {
  return list.some((d) => d.groupId === groupId && d.userId === userId && d.focusing === focusing);
}
