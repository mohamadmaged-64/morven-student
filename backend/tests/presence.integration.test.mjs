import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";
import { Server as SocketIOServer } from "socket.io";
import Client from "socket.io-client";

async function registerUser(baseUrl, suffix) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `sock-${suffix}@example.com`,
      username: `sock_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`,
      password: "SecurePass123!",
      displayName: `Sock User ${suffix}`,
    }),
  });
  return res.json();
}

describe("Phase 5 - Socket.IO Presence", () => {
  let server;
  let baseUrl;
  before(async () => {
    server = await startBackend();
    baseUrl = server.baseUrl;
  });
  after(async () => {
    await server?.stop();
  });

  function createClient(token) {
    return Client(`${baseUrl}/connect`, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
  }

  describe("Authentication", () => {
    it("rejects connection without token", async () => {
      const client = Client(`${baseUrl}/connect`, {
        transports: ["websocket"],
        forceNew: true,
      });

      await new Promise((resolve) => {
        client.on("connect_error", (err) => {
          assert.ok(err.message.includes("Authentication") || err.message.includes("Invalid"));
          client.close();
          resolve();
        });
        setTimeout(() => { client.close(); resolve(); }, 3000);
      });
    });

    it("rejects connection with invalid token", async () => {
      const client = Client(`${baseUrl}/connect`, {
        auth: { token: "invalid-token" },
        transports: ["websocket"],
        forceNew: true,
      });

      await new Promise((resolve) => {
        client.on("connect_error", (err) => {
          assert.ok(err.message.includes("Invalid") || err.message.includes("Authentication"));
          client.close();
          resolve();
        });
        setTimeout(() => { client.close(); resolve(); }, 3000);
      });
    });

    it("accepts connection with valid token", async () => {
      const reg = await registerUser(baseUrl, `sk-${Date.now()}`);
      const client = createClient(reg.accessToken);

      await new Promise((resolve, reject) => {
        client.on("connect", () => {
          assert.ok(client.connected);
          client.close();
          resolve();
        });
        client.on("connect_error", reject);
        setTimeout(() => { client.close(); reject(new Error("timeout")); }, 3000);
      });
    });
  });

  describe("Presence", () => {
    it("broadcasts presence with all members when a user joins a group", async () => {
      const ts = Date.now();
      const reg = await registerUser(baseUrl, `pj-${ts}`);
      const { group } = await createGroup(baseUrl, reg.accessToken, "Presence P1");
      const client = createClient(reg.accessToken);

      await new Promise((resolve, reject) => {
        client.on("connect", () => {
          client.emit("join-group", { groupId: group.id });
        });

        client.on("group-presence-update", (data) => {
          if (data.groupId !== group.id) return;
          assert.ok(data.users.length >= 1);
          const me = data.users.find((u) => u.userId === reg.user.id);
          assert.ok(me, "self should appear in presence");
          assert.equal(me.username, reg.user.username);
          assert.equal(typeof me.focusing, "boolean");
          client.close();
          resolve();
        });

        client.on("connect_error", reject);
        setTimeout(() => { client.close(); reject(new Error("timeout")); }, 5000);
      });
    });

    it("broadcasts user-joined to other members of the same group", async () => {
      const ts = Date.now();
      const reg1 = await registerUser(baseUrl, `pj2-${ts}`);
      const reg2 = await registerUser(baseUrl, `pj3-${ts}`);
      const { group } = await createGroup(baseUrl, reg1.accessToken, "Presence P2");
      await joinGroup(baseUrl, reg2.accessToken, group.joinCode);

      const client1 = createClient(reg1.accessToken);
      const client2 = createClient(reg2.accessToken);

      await new Promise((resolve, reject) => {
        let joined = false;

        client1.on("connect", () => {
          client1.emit("join-group", { groupId: group.id });
        });

        client1.on("group-user-joined", (data) => {
          if (data.groupId !== group.id) return;
          assert.equal(data.user.userId, reg2.user.id);
          joined = true;
          client1.close();
          client2.close();
          resolve();
        });

        client2.on("connect", () => {
          setTimeout(() => {
            client2.emit("join-group", { groupId: group.id });
          }, 200);
        });

        client1.on("connect_error", reject);
        client2.on("connect_error", reject);
        setTimeout(() => { client1.close(); client2.close(); if (!joined) reject(new Error("timeout")); }, 6000);
      });
    });

    it("broadcasts user-left when a member disconnects", async () => {
      const ts = Date.now();
      const reg1 = await registerUser(baseUrl, `pl-${ts}`);
      const reg2 = await registerUser(baseUrl, `pl2-${ts}`);
      const { group } = await createGroup(baseUrl, reg1.accessToken, "Presence P3");
      await joinGroup(baseUrl, reg2.accessToken, group.joinCode);

      const client1 = createClient(reg1.accessToken);
      const client2 = createClient(reg2.accessToken);

      await new Promise((resolve, reject) => {
        let left = false;

        client1.on("connect", () => {
          client1.emit("join-group", { groupId: group.id });
        });

        client2.on("connect", () => {
          setTimeout(() => {
            client2.emit("join-group", { groupId: group.id });
          }, 200);
        });

        client1.on("group-user-joined", (data) => {
          if (data.user.userId === reg2.user.id) {
            setTimeout(() => {
              client2.close();
            }, 200);
          }
        });

        client1.on("group-user-left", (data) => {
          if (data.groupId !== group.id) return;
          assert.equal(data.user.userId, reg2.user.id);
          left = true;
          client1.close();
          resolve();
        });

        client1.on("connect_error", reject);
        client2.on("connect_error", reject);
        setTimeout(() => { client1.close(); client2.close(); if (!left) reject(new Error("timeout")); }, 6000);
      });
    });

    it("supports multiple sockets for one user (multi-tab)", async () => {
      const ts = Date.now();
      const reg = await registerUser(baseUrl, `mt-${ts}`);
      const { group } = await createGroup(baseUrl, reg.accessToken, "Presence MT");
      const client1 = createClient(reg.accessToken);
      const client2 = createClient(reg.accessToken);

      await new Promise((resolve, reject) => {
        const onPresence = (data) => {
          if (data.groupId !== group.id) return;
          const me = data.users.find((u) => u.userId === reg.user.id);
          if (me && me.socketCount === 2) {
            client1.close();
            client2.close();
            resolve();
          }
        };

        client1.on("connect", () => {
          client1.emit("join-group", { groupId: group.id });
        });

        client1.on("group-presence-update", onPresence);

        client2.on("connect", () => {
          setTimeout(() => {
            client2.emit("join-group", { groupId: group.id });
          }, 200);
        });

        client1.on("connect_error", reject);
        client2.on("connect_error", reject);
        setTimeout(() => { client1.close(); client2.close(); reject(new Error("multi-tab socketCount timeout")); }, 7000);
      });
    });

    it("room isolation: users in different groups don't see each other", async () => {
      const ts = Date.now();
      const reg1 = await registerUser(baseUrl, `ri-${ts}`);
      const reg2 = await registerUser(baseUrl, `ri2-${ts}`);
      // Two separate groups, each user is the sole member of their own group.
      const { group: g1 } = await createGroup(baseUrl, reg1.accessToken, "Iso A");
      const { group: g2 } = await createGroup(baseUrl, reg2.accessToken, "Iso B");

      const client1 = createClient(reg1.accessToken);
      const client2 = createClient(reg2.accessToken);

      await new Promise((resolve, reject) => {
        let isolated = false;

        client1.on("connect", () => {
          client1.emit("join-group", { groupId: g1.id });
        });

        client1.on("group-presence-update", (data) => {
          if (data.groupId !== g1.id) return;
          const otherUser = data.users.find((u) => u.userId === reg2.user.id);
          assert.equal(otherUser, undefined, "User in group B should not appear in group A");
          isolated = true;
          client1.close();
          client2.close();
          resolve();
        });

        client2.on("connect", () => {
          setTimeout(() => {
            client2.emit("join-group", { groupId: g2.id });
          }, 200);
        });

        client1.on("connect_error", reject);
        client2.on("connect_error", reject);
        setTimeout(() => { client1.close(); client2.close(); if (!isolated) reject(new Error("isolation timeout")); }, 7000);
      });
    });

    it("rejects join-group for a user who is not a member of that group (M1)", async () => {
      const ts = Date.now();
      // User A owns a group; user B is NOT a member.
      const regA = await registerUser(baseUrl, `m1a-${ts}`);
      const regB = await registerUser(baseUrl, `m1b-${ts}`);
      const { group } = await createGroup(baseUrl, regA.accessToken, "M1 Check");

      const clientB = createClient(regB.accessToken);

      await new Promise((resolve, reject) => {
        clientB.on("connect", () => {
          clientB.emit("join-group", { groupId: group.id });
        });

        clientB.on("join-group-error", (data) => {
          assert.equal(data.groupId, group.id);
          assert.ok(data.error && data.error.length > 0);
          clientB.close();
          resolve();
        });

        clientB.on("group-presence-update", () => {
          // Should never receive presence for a group the user isn't in.
          clientB.close();
          reject(new Error("unauthorized user received group presence"));
        });

        clientB.on("connect_error", reject);
        setTimeout(() => { clientB.close(); reject(new Error("join-group-error timeout")); }, 5000);
      });
    });
  });
});

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
