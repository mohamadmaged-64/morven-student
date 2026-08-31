import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { startBackend } from "./helpers/server.mjs";

async function registerUser(baseUrl, suffix) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `prof-${suffix}@example.com`,
      username: `prof_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`,
      password: "SecurePass123!",
      displayName: `Profile User ${suffix}`,
    }),
  });
  return res.json();
}

describe("Phase 2 - Profiles", () => {
  let server;
  before(async () => { server = await startBackend(); });
  after(async () => { await server?.stop(); });

  describe("GET /api/profile/me", () => {
    it("returns own profile for authenticated user", async () => {
      const suffix = `own-${Date.now()}`;
      const reg = await registerUser(server.baseUrl, suffix);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${reg.accessToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.profile);
      assert.equal(data.profile.email, `prof-${suffix}@example.com`);
      assert.ok(data.profile.username);
      assert.ok(data.profile.displayName);
      assert.equal(typeof data.profile.isPublic, "boolean");
    });

    it("rejects unauthenticated request", async () => {
      const res = await fetch(`${server.baseUrl}/api/profile/me`);
      assert.equal(res.status, 401);
    });

    it("rejects request with invalid token", async () => {
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        headers: { Authorization: "Bearer invalid-token" },
      });
      assert.equal(res.status, 401);
    });

    it("creates profile automatically if it does not exist", async () => {
      const reg = await registerUser(server.baseUrl, `auto-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${reg.accessToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.profile);
      assert.ok(data.profile.id);
      assert.equal(data.profile.bio, null);
      assert.equal(data.profile.isPublic, true);
    });
  });

  describe("PUT /api/profile/me", () => {
    it("updates display name", async () => {
      const reg = await registerUser(server.baseUrl, `dn-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "New Name" }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.profile.displayName, "New Name");
    });

    it("updates bio", async () => {
      const reg = await registerUser(server.baseUrl, `bio-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: "Hello, I am a student." }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.profile.bio, "Hello, I am a student.");
    });

    it("updates privacy setting", async () => {
      const reg = await registerUser(server.baseUrl, `priv-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: false }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.profile.isPublic, false);
    });

    it("updates multiple fields at once", async () => {
      const reg = await registerUser(server.baseUrl, `multi-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "Multi User", bio: "Multi bio", isPublic: false }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.profile.displayName, "Multi User");
      assert.equal(data.profile.bio, "Multi bio");
      assert.equal(data.profile.isPublic, false);
    });

    it("rejects empty update", async () => {
      const reg = await registerUser(server.baseUrl, `empty-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
    });

    it("rejects invalid display name (too long)", async () => {
      const reg = await registerUser(server.baseUrl, `long-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "A".repeat(101) }),
      });
      assert.equal(res.status, 400);
    });

    it("rejects invalid bio (too long)", async () => {
      const reg = await registerUser(server.baseUrl, `blong-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: "A".repeat(501) }),
      });
      assert.equal(res.status, 400);
    });

    it("rejects unauthenticated update", async () => {
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Hacked" }),
      });
      assert.equal(res.status, 401);
    });

    it("does not allow modifying another user's profile", async () => {
      const userA = await registerUser(server.baseUrl, `a-${Date.now()}`);
      const userB = await registerUser(server.baseUrl, `b-${Date.now()}`);

      // User A updates their profile
      await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${userA.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "User A Name" }),
      });

      // User B reads their own profile — should NOT have User A's name
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${userB.accessToken}` },
      });
      const data = await res.json();
      assert.equal(data.profile.displayName, "Profile User b-" + (userB.user?.username?.split("_").pop() || ""));
    });

    it("clears bio by sending empty string", async () => {
      const reg = await registerUser(server.baseUrl, `clr-${Date.now()}`);
      // Set bio
      await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: "Some bio" }),
      });
      // Clear bio
      const res = await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: "" }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.profile.bio, null);
    });
  });

  describe("GET /api/profile/:username", () => {
    it("returns public profile when isPublic = true", async () => {
      const suffix = `pub-${Date.now()}`;
      const reg = await registerUser(server.baseUrl, suffix);
      // Ensure profile is public (default)
      await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: "Public bio", isPublic: true }),
      });

      const res = await fetch(`${server.baseUrl}/api/profile/prof_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`);
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.profile);
      assert.equal(data.profile.isPublic, true);
      assert.equal(data.profile.bio, "Public bio");
      assert.equal(data.profile.username, `prof_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`);
    });

    it("exposes only minimal identity when isPublic = false", async () => {
      const suffix = `priv-${Date.now()}`;
      const username = `prof_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const reg = await registerUser(server.baseUrl, suffix);
      // Set profile to private with a bio that must NOT leak
      await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: false, bio: "Secret bio" }),
      });

      const res = await fetch(`${server.baseUrl}/api/profile/${username}`);
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.profile.isPublic, false);
      assert.equal(data.profile.username, username);
      assert.ok(data.profile.displayName);
      // Private data must NOT be exposed
      assert.equal(data.profile.bio, undefined, "bio must not be exposed for private profile");
      assert.equal(data.profile.email, undefined, "email must not be exposed for private profile");
      assert.equal(data.profile.createdAt, undefined, "createdAt must not be exposed for private profile");
      assert.equal(data.profile.updatedAt, undefined, "updatedAt must not be exposed for private profile");
    });

    it("returns 404 for non-existent user", async () => {
      const res = await fetch(`${server.baseUrl}/api/profile/nonexistent_user_${Date.now()}`);
      assert.equal(res.status, 404);
    });

    it("never exposes email in public profile response", async () => {
      const suffix = `email-${Date.now()}`;
      const username = `prof_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const reg = await registerUser(server.baseUrl, suffix);
      await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: true }),
      });

      const res = await fetch(`${server.baseUrl}/api/profile/${username}`);
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.profile);
      assert.equal(data.profile.email, undefined, "email must not be in public profile");
    });

    it("does not expose passwordHash in public profile", async () => {
      const suffix = `hash-${Date.now()}`;
      const username = `prof_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const reg = await registerUser(server.baseUrl, suffix);
      await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: true }),
      });

      const res = await fetch(`${server.baseUrl}/api/profile/${username}`);
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.profile.passwordHash, undefined);
    });
  });

  describe("Achievements", () => {
    function uname(suffix) {
      return `prof_${suffix.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }

    it("requires auth to sync achievements", async () => {
      const res = await fetch(`${server.baseUrl}/api/profile/me/achievements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedTasks: 5 }),
      });
      assert.equal(res.status, 401);
    });

    it("rejects invalid sync payload", async () => {
      const reg = await registerUser(server.baseUrl, `inv-${Date.now()}`);
      const res = await fetch(`${server.baseUrl}/api/profile/me/achievements`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completedTasks: -1 }),
      });
      assert.equal(res.status, 400);
    });

    it("syncs achievements for the authenticated user only", async () => {
      const suffix = `sync-${Date.now()}`;
      const reg = await registerUser(server.baseUrl, suffix);

      const res = await fetch(`${server.baseUrl}/api/profile/me/achievements`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completedTasks: 7,
          cardsReviewed: 12,
          completedSessions: 3,
          meaningfulNotes: 4,
          files: 2,
          flashcards: 9,
          quizzesCompleted: 1,
        }),
      });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).ok, true);

      const pub = await fetch(`${server.baseUrl}/api/profile/${uname(suffix)}/achievements`);
      const data = await pub.json();
      assert.equal(pub.status, 200);
      assert.equal(data.achievements.completedTasks, 7);
      assert.equal(data.achievements.cardsReviewed, 12);
      assert.equal(data.achievements.completedSessions, 3);
      assert.equal(data.achievements.meaningfulNotes, 4);
      assert.equal(data.achievements.files, 2);
      assert.equal(data.achievements.flashcards, 9);
      assert.equal(data.achievements.quizzesCompleted, 1);
      assert.equal(data.achievements.totalAchievements, 7 + 12 + 3 + 4 + 2 + 9 + 1);
    });

    it("defaults to zero achievements when none synced", async () => {
      const suffix = `zero-${Date.now()}`;
      await registerUser(server.baseUrl, suffix);
      const res = await fetch(`${server.baseUrl}/api/profile/${uname(suffix)}/achievements`);
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.achievements.completedTasks, 0);
      assert.equal(data.achievements.totalAchievements, 0);
    });

    it("hides achievements when profile is private", async () => {
      const suffix = `apriv-${Date.now()}`;
      const reg = await registerUser(server.baseUrl, suffix);
      await fetch(`${server.baseUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${reg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: false }),
      });

      const res = await fetch(`${server.baseUrl}/api/profile/${uname(suffix)}/achievements`);
      assert.equal(res.status, 404);
    });

    it("returns 404 for non-existent user achievements", async () => {
      const res = await fetch(`${server.baseUrl}/api/profile/nonexistent_ach_${Date.now()}/achievements`);
      assert.equal(res.status, 404);
    });
  });
});
