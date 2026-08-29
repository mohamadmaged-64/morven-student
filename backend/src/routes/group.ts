import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  createGroupSchema,
  joinGroupSchema,
  updateMemberRoleSchema,
  updateGroupSchema,
  createGroup,
  joinGroup,
  listUserGroups,
  getGroupDetails,
  leaveGroup,
  deleteGroup,
  removeMember,
  updateMemberRole,
  updateGroup,
  GroupError,
} from "../services/group.service";
import { authenticate } from "../middleware/auth";
import { uploadAvatar } from "../middleware/uploadAvatar";

const router = Router();

function handleGroupError(err: unknown, res: Response): void {
  if (err instanceof GroupError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("Group error:", err);
  res.status(500).json({ error: "حدث خطأ في الخادم" });
}

function deleteFileIfExists(filePath: string) {
  if (!filePath || !filePath.startsWith("/uploads/")) return;
  const full = path.resolve(__dirname, "../..", filePath.slice(1));
  try { fs.unlinkSync(full); } catch { /* ignore */ }
}

// POST /api/groups — create a new group
router.post("/api/groups", authenticate, uploadAvatar.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const body = { ...req.body };
    if (req.file) {
      body.imageUrl = `/uploads/${req.file.filename}`;
    }

    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const group = await createGroup(req.user.sub, req.user.role, parsed.data);
    res.status(201).json({ group });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// POST /api/groups/join — join a group by code
router.post("/api/groups/join", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const parsed = joinGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const group = await joinGroup(req.user.sub, req.user.role, parsed.data.joinCode);
    res.json({ group });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// GET /api/groups — list groups the user belongs to
router.get("/api/groups", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const groups = await listUserGroups(req.user.sub, req.user.role);
    res.json({ groups });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// GET /api/groups/:groupId — get group details
router.get("/api/groups/:groupId", authenticate, async (req: Request<{ groupId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const details = await getGroupDetails(req.params.groupId, req.user.sub, req.user.role);
    res.json({ group: details });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// POST /api/groups/:groupId/leave — leave a group
router.post("/api/groups/:groupId/leave", authenticate, async (req: Request<{ groupId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    await leaveGroup(req.params.groupId, req.user.sub);
    res.json({ message: "تمت المغادرة بنجاح" });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// DELETE /api/groups/:groupId — delete a group (owner only)
router.delete("/api/groups/:groupId", authenticate, async (req: Request<{ groupId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const { default: prisma } = await import("../lib/prisma");
    const group = await prisma.group.findUnique({ where: { id: req.params.groupId }, select: { imageUrl: true } });

    await deleteGroup(req.params.groupId, req.user.sub, req.user.role);

    // Delete group image file
    if (group?.imageUrl) deleteFileIfExists(group.imageUrl);

    res.json({ message: "تم حذف المجموعة بنجاح" });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// DELETE /api/groups/:groupId/members/:memberId — remove a member
router.delete("/api/groups/:groupId/members/:memberId", authenticate, async (req: Request<{ groupId: string; memberId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    await removeMember(req.params.groupId, req.params.memberId, req.user.sub, req.user.role);
    res.json({ message: "تمت إزالة العضو بنجاح" });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// PATCH /api/groups/:groupId/members/:memberId/role — update a member's role
router.patch("/api/groups/:groupId/members/:memberId/role", authenticate, async (req: Request<{ groupId: string; memberId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    await updateMemberRole(req.params.groupId, req.params.memberId, parsed.data.role, req.user.sub, req.user.role);
    res.json({ message: "تم تحديث الدور بنجاح" });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// PATCH /api/groups/:groupId — update group details (owner or admin)
router.patch("/api/groups/:groupId", authenticate, uploadAvatar.single("image"), async (req: Request<{ groupId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const { default: prisma } = await import("../lib/prisma");
    const oldGroup = await prisma.group.findUnique({ where: { id: req.params.groupId }, select: { imageUrl: true } });

    const body = { ...req.body };
    if (req.file) {
      body.imageUrl = `/uploads/${req.file.filename}`;
    }
    if (body.removeImage === "true") {
      body.imageUrl = null;
    }
    delete body.removeImage;

    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const group = await updateGroup(req.params.groupId, req.user.sub, req.user.role, parsed.data);

    // Delete old group image file if it was replaced or removed
    if (oldGroup?.imageUrl && body.imageUrl !== undefined && oldGroup.imageUrl !== body.imageUrl) {
      deleteFileIfExists(oldGroup.imageUrl);
    }

    res.json({ group });
  } catch (err) {
    handleGroupError(err, res);
  }
});

// POST /api/profile/avatar — upload or replace profile avatar
router.post("/api/profile/avatar", authenticate, uploadAvatar.single("avatar"), async (req: Request, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }
    if (!req.file) { res.status(400).json({ error: "لم يتم اختيار ملف" }); return; }

    const { default: prisma } = await import("../lib/prisma");

    // Delete old avatar file if replacing
    const existing = await prisma.profile.findUnique({ where: { userId: req.user.sub }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) deleteFileIfExists(existing.avatarUrl);

    const avatarUrl = `/uploads/${req.file.filename}`;
    await prisma.profile.upsert({
      where: { userId: req.user.sub },
      update: { avatarUrl },
      create: { userId: req.user.sub, avatarUrl },
    });

    res.json({ avatarUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// DELETE /api/profile/avatar — remove profile avatar
router.delete("/api/profile/avatar", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const { default: prisma } = await import("../lib/prisma");

    // Delete file from disk
    const existing = await prisma.profile.findUnique({ where: { userId: req.user.sub }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) deleteFileIfExists(existing.avatarUrl);

    await prisma.profile.upsert({
      where: { userId: req.user.sub },
      update: { avatarUrl: null },
      create: { userId: req.user.sub, avatarUrl: null },
    });

    res.json({ message: "تم حذف الصورة" });
  } catch (err) {
    console.error("Avatar delete error:", err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
