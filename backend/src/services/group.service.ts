import { z } from "zod";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const createGroupSchema = z.object({
  name: z.string().min(1, "اسم المجموعة مطلوب").max(100, "اسم المجموعة طويل جداً"),
  description: z.string().max(500, "الوصف طويل جداً").optional(),
  imageUrl: z.string().max(500).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1, "اسم المجموعة مطلوب").max(100, "اسم المجموعة طويل جداً").optional(),
  description: z.string().max(500, "الوصف طويل جداً").optional(),
  imageUrl: z.string().max(500).nullable().optional(),
});

export const joinGroupSchema = z.object({
  joinCode: z.string().length(6, "رمز الانضمام يجب أن يكون 6 أرقام").regex(/^\d{6}$/, "رمز الانضمام يجب أن يكون أرقام فقط"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"], { message: "الدور غير صالح" }),
});

export const MAX_GROUPS_PER_USER = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateJoinCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

async function ensureUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCode();
    const existing = await prisma.group.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error("تعذر إنشاء رمز فريد");
}

function sanitizeGroup(group: {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  joinCode: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    imageUrl: group.imageUrl,
    joinCode: group.joinCode,
    creatorId: group.creatorId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createGroup(userId: string, input: z.infer<typeof createGroupSchema>) {
  const membershipCount = await prisma.groupMember.count({ where: { userId } });
  if (membershipCount >= MAX_GROUPS_PER_USER) {
    throw new GroupError("لقد وصلت إلى الحد الأقصى من المجموعات (3)", 400);
  }

  const joinCode = await ensureUniqueJoinCode();

  const group = await prisma.$transaction(async (tx) => {
    const g = await tx.group.create({
      data: {
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl || null,
        joinCode,
        creatorId: userId,
      },
    });

    await tx.groupMember.create({
      data: { groupId: g.id, userId, role: "OWNER" },
    });

    return g;
  });

  return sanitizeGroup(group);
}

export async function joinGroup(userId: string, joinCode: string) {
  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) {
    throw new GroupError("رمز الانضمام غير صالح", 404);
  }

  const existing = await getMembership(group.id, userId);
  if (existing) {
    throw new GroupError("أنت عضو بالفعل في هذه المجموعة", 409);
  }

  const membershipCount = await prisma.groupMember.count({ where: { userId } });
  if (membershipCount >= MAX_GROUPS_PER_USER) {
    throw new GroupError("لقد وصلت إلى الحد الأقصى من المجموعات (3)", 400);
  }

  await prisma.groupMember.create({
    data: { groupId: group.id, userId, role: "MEMBER" },
  });

  return sanitizeGroup(group);
}

export async function listUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: { _count: { select: { members: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((m) => ({
    ...sanitizeGroup(m.group),
    role: m.role,
    memberCount: m.group._count.members,
  }));
}

export async function getGroupDetails(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, displayName: true, profile: { select: { avatarUrl: true } } } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!group) {
    throw new GroupError("المجموعة غير موجودة", 404);
  }

  const membership = await getMembership(groupId, userId);
  if (!membership) {
    throw new GroupError("غير مصرح", 403);
  }

  return {
    ...sanitizeGroup(group),
    role: membership.role,
    members: group.members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.profile?.avatarUrl ?? null,
      role: m.role,
      joinedAt: m.createdAt,
    })),
  };
}

export async function leaveGroup(groupId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new GroupError("المجموعة غير موجودة", 404);
    }

    const membership = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new GroupError("غير مصرح", 403);
    }

    // Non-owner: simply leave.
    if (membership.role !== "OWNER") {
      await tx.groupMember.delete({
        where: { groupId_userId: { groupId, userId } },
      });
      return;
    }

    // OWNER leaving. Find the oldest remaining member (earliest join), and
    // transfer ownership to them so the group is never left without an owner.
    const successor = await tx.groupMember.findFirst({
      where: { groupId, userId: { not: userId } },
      orderBy: { createdAt: "asc" },
    });

    if (!successor) {
      // No other members remain — the group is now empty. Delete it.
      await tx.group.delete({ where: { id: groupId } });
      return;
    }

    await tx.groupMember.update({
      where: { groupId_userId: { groupId, userId: successor.userId } },
      data: { role: "OWNER" },
    });

    // Remove the previous OWNER completely.
    await tx.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  });
}

export async function deleteGroup(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new GroupError("المجموعة غير موجودة", 404);
  }

  const membership = await getMembership(groupId, userId);
  if (!membership || membership.role !== "OWNER") {
    throw new GroupError("فقط المالك يمكنه حذف المجموعة", 403);
  }

  // An OWNER cannot delete a group that has other members.
  const memberCount = await prisma.groupMember.count({ where: { groupId } });
  if (memberCount > 1) {
    throw new GroupError("لا يمكن حذف المجموعة وهي تحتوي على أعضاء آخرين", 400);
  }

  await prisma.group.delete({ where: { id: groupId } });
}

export async function removeMember(groupId: string, targetUserId: string, requesterId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new GroupError("المجموعة غير موجودة", 404);
  }

  const requesterMembership = await getMembership(groupId, requesterId);
  if (!requesterMembership || requesterMembership.role !== "ADMIN") {
    throw new GroupError("غير مصرح", 403);
  }

  if (requesterId === targetUserId) {
    throw new GroupError("لا يمكن إزالة نفسك", 400);
  }

  const targetMembership = await getMembership(groupId, targetUserId);
  if (!targetMembership) {
    throw new GroupError("العضو غير موجود", 404);
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
}

export async function updateMemberRole(groupId: string, targetUserId: string, newRole: "ADMIN" | "MEMBER", requesterId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new GroupError("المجموعة غير موجودة", 404);
  }

  const requesterMembership = await getMembership(groupId, requesterId);
  if (!requesterMembership || requesterMembership.role !== "OWNER") {
    throw new GroupError("فقط المالك يمكنه تغيير الأدوار", 403);
  }

  if (targetUserId === requesterId) {
    throw new GroupError("المالك لا يمكنه تغيير دوره", 400);
  }

  const targetMembership = await getMembership(groupId, targetUserId);
  if (!targetMembership) {
    throw new GroupError("العضو غير موجود", 404);
  }

  if (targetMembership.role === "OWNER") {
    throw new GroupError("لا يمكن تغيير دور المالك", 403);
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { role: newRole },
  });
}

export async function updateGroup(groupId: string, userId: string, input: z.infer<typeof updateGroupSchema>) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new GroupError("المجموعة غير موجودة", 404);
  }

  const membership = await getMembership(groupId, userId);
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new GroupError("المالك أو المدير فقط يمكنه تعديل المجموعة", 403);
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;

  const updated = await prisma.group.update({
    where: { id: groupId },
    data,
  });

  return sanitizeGroup(updated);
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class GroupError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GroupError";
    this.status = status;
  }
}
