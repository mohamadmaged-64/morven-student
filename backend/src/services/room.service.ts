import { z } from "zod";
import prisma from "../lib/prisma";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const createRoomSchema = z.object({
  name: z.string().min(1, "اسم الغرفة مطلوب").max(100, "اسم الغرفة طويل جداً"),
  description: z.string().max(500, "الوصف طويل جداً").optional(),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1, "اسم الغرفة مطلوب").max(100, "اسم الغرفة طويل جداً").optional(),
  description: z.string().max(500, "الوصف طويل جداً").optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeRoom(room: {
  id: string;
  name: string;
  description: string | null;
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    groupId: room.groupId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

async function verifyGroupMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return membership;
}

async function verifyGroupExists(groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  return group;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createRoom(groupId: string, userId: string, input: z.infer<typeof createRoomSchema>) {
  const group = await verifyGroupExists(groupId);
  if (!group) {
    throw new RoomError("المجموعة غير موجودة", 404);
  }

  const membership = await verifyGroupMembership(groupId, userId);
  if (!membership) {
    throw new RoomError("غير مصرح", 403);
  }

  if (membership.role === "MEMBER") {
    throw new RoomError("الأعضاء لا يمكنهم إنشاء غرف", 403);
  }

  const room = await prisma.room.create({
    data: {
      name: input.name,
      description: input.description,
      groupId,
    },
  });

  return sanitizeRoom(room);
}

export async function listRooms(groupId: string, userId: string) {
  const group = await verifyGroupExists(groupId);
  if (!group) {
    throw new RoomError("المجموعة غير موجودة", 404);
  }

  const membership = await verifyGroupMembership(groupId, userId);
  if (!membership) {
    throw new RoomError("غير مصرح", 403);
  }

  const rooms = await prisma.room.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
  });

  return rooms.map(sanitizeRoom);
}

export async function getRoomDetails(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    throw new RoomError("الغرفة غير موجودة", 404);
  }

  const membership = await verifyGroupMembership(room.groupId, userId);
  if (!membership) {
    throw new RoomError("غير مصرح", 403);
  }

  return sanitizeRoom(room);
}

export async function updateRoom(roomId: string, userId: string, input: z.infer<typeof updateRoomSchema>) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    throw new RoomError("الغرفة غير موجودة", 404);
  }

  const membership = await verifyGroupMembership(room.groupId, userId);
  if (!membership) {
    throw new RoomError("غير مصرح", 403);
  }

  if (membership.role === "MEMBER") {
    throw new RoomError("الأعضاء لا يمكنهم تعديل الغرف", 403);
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
    },
  });

  return sanitizeRoom(updated);
}

export async function deleteRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    throw new RoomError("الغرفة غير موجودة", 404);
  }

  const membership = await verifyGroupMembership(room.groupId, userId);
  if (!membership) {
    throw new RoomError("غير مصرح", 403);
  }

  if (membership.role === "MEMBER") {
    throw new RoomError("الأعضاء لا يمكنهم حذف الغرف", 403);
  }

  await prisma.room.delete({ where: { id: roomId } });
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class RoomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RoomError";
    this.status = status;
  }
}
