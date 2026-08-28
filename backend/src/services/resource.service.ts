import { z } from "zod";
import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const resourceTypeLiteral = z.enum(["FILE", "NOTE", "LINK"], { message: "النوع غير صالح" });

export const createResourceSchema = z.object({
  title: z.string().min(1, "اسم المادة مطلوب").max(200, "اسم المادة طويل جداً").trim(),
  description: z.string().max(1000, "الوصف طويل جداً").trim().optional(),
  type: resourceTypeLiteral,
});

export const updateResourceSchema = z.object({
  title: z.string().min(1, "اسم المادة مطلوب").max(200, "اسم المادة طويل جداً").trim().optional(),
  description: z.string().max(1000, "الوصف طويل جداً").trim().nullable().optional(),
  type: resourceTypeLiteral.optional(),
});

export const addNoteSchema = z.object({
  title: z.string().min(1, "عنوان الملاحظة مطلوب").max(200, "العنوان طويل جداً").trim(),
  content: z.string().max(10000, "المحتوى طويل جداً").optional(),
});

export const addLinkSchema = z.object({
  title: z.string().min(1, "اسم الرابط مطلوب").max(200, "الاسم طويل جداً").trim(),
  url: z.string().min(1, "عنوان الرابط مطلوب").max(2000, "الرابط طويل جداً").trim(),
});

const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "uploads");

function absolutePath(filename: string): string {
  return path.join(UPLOADS_DIR, path.basename(filename));
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * Admin has full control over any Resource. A Resource Owner has full control
 * over their own Resource. A regular Member is view-only.
 */
function canEdit(role: string, ownerId: string, userId: string): boolean {
  return role === "ADMIN" || ownerId === userId;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ResourceWithContent = Prisma.ResourceGetPayload<{
  include: {
    owner: { select: { id: true; displayName: true } };
    files: true;
    notes: true;
    links: true;
  };
}>;

function toType(value: string): "file" | "note" | "link" {
  return value.toLowerCase() as "file" | "note" | "link";
}

function sanitizeResourceBase(r: {
  id: string;
  title: string;
  description: string | null;
  type: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: { id: string; displayName: string };
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: toType(r.type),
    ownerId: r.ownerId,
    uploadedBy: r.owner?.displayName ?? "مستخدم",
    uploadedAt: r.createdAt.toISOString().split("T")[0],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function sanitizeContent(r: ResourceWithContent) {
  return {
    ...sanitizeResourceBase(r),
    files: r.files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.mimeType,
      size: f.size,
      createdAt: f.createdAt.getTime(),
    })),
    notes: r.notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content || "",
      createdAt: n.createdAt.getTime(),
    })),
    links: r.links.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      createdAt: l.createdAt.getTime(),
    })),
  };
}

async function getResourceOrThrow(resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) {
    throw new ResourceError("المورد غير موجود", 404);
  }
  return resource;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listResources() {
  const resources = await prisma.resource.findMany({
    include: { owner: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return resources.map(sanitizeResourceBase);
}

export async function createResource(ownerId: string, input: z.infer<typeof createResourceSchema>) {
  const resource = await prisma.resource.create({
    data: { title: input.title, description: input.description || null, type: input.type, ownerId },
    include: { owner: { select: { id: true, displayName: true } } },
  });
  return sanitizeResourceBase(resource);
}

export async function getResourceDetails(resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      owner: { select: { id: true, displayName: true } },
      files: true,
      notes: true,
      links: true,
    },
  });
  if (!resource) {
    throw new ResourceError("المورد غير موجود", 404);
  }
  return sanitizeContent(resource);
}

export async function updateResource(
  resourceId: string,
  requesterId: string,
  role: string,
  input: z.infer<typeof updateResourceSchema>,
) {
  const resource = await getResourceOrThrow(resourceId);

  if (!canEdit(role, resource.ownerId, requesterId)) {
    throw new ResourceError("ليس لديك صلاحية لتعديل هذا المورد", 403);
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.type !== undefined) data.type = input.type;

  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data,
    include: { owner: { select: { id: true, displayName: true } } },
  });

  return sanitizeResourceBase(updated);
}

export async function deleteResource(resourceId: string, requesterId: string, role: string) {
  const resource = await getResourceOrThrow(resourceId);

  if (!canEdit(role, resource.ownerId, requesterId)) {
    throw new ResourceError("ليس لديك صلاحية لحذف هذا المورد", 403);
  }

  const files = await prisma.resourceFile.findMany({ where: { resourceId } });

  await prisma.resource.delete({ where: { id: resourceId } });

  // Clean up stored files from disk (best-effort).
  for (const file of files) {
    try { fs.unlinkSync(absolutePath(file.storagePath)); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Resource: owner/admin only mutations (enforced by canEdit)
// ---------------------------------------------------------------------------

async function assertCanEditResource(resourceId: string, requesterId: string, role: string) {
  const resource = await getResourceOrThrow(resourceId);
  if (!canEdit(role, resource.ownerId, requesterId)) {
    throw new ResourceError("ليس لديك صلاحية", 403);
  }
  return resource;
}

export async function addFiles(
  resourceId: string,
  requesterId: string,
  role: string,
  files: { originalname: string; filename: string; size: number; mimetype: string }[],
) {
  await assertCanEditResource(resourceId, requesterId, role);

  // Enforce a maximum of 10 files per resource (mirrors the frontend limit).
  const allowedRemaining = 10 - (await prisma.resourceFile.count({ where: { resourceId } }));
  const toCreate = files.slice(0, allowedRemaining);

  const created = [];
  for (const file of toCreate) {
    const record = await prisma.resourceFile.create({
      data: {
        resourceId,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: file.filename,
      },
    });
    created.push({
      id: record.id,
      name: record.name,
      type: record.mimeType,
      size: record.size,
      createdAt: record.createdAt.getTime(),
    });
  }

  // Remove any files that exceeded the limit from disk.
  for (const file of files.slice(allowedRemaining)) {
    try { fs.unlinkSync(absolutePath(file.filename)); } catch { /* ignore */ }
  }

  return created;
}

export async function listFiles(resourceId: string) {
  const files = await prisma.resourceFile.findMany({
    where: { resourceId },
    orderBy: { createdAt: "desc" },
  });
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.mimeType,
    size: f.size,
    createdAt: f.createdAt.getTime(),
  }));
}

export async function getDownloadableFile(resourceId: string, fileId: string) {
  const file = await prisma.resourceFile.findFirst({ where: { id: fileId, resourceId } });
  if (!file) {
    throw new ResourceError("الملف غير موجود", 404);
  }
  return file;
}

export async function deleteResourceFile(resourceId: string, fileId: string, requesterId: string, role: string) {
  await assertCanEditResource(resourceId, requesterId, role);

  const file = await prisma.resourceFile.findFirst({ where: { id: fileId, resourceId } });
  if (!file) {
    throw new ResourceError("الملف غير موجود", 404);
  }

  await prisma.resourceFile.delete({ where: { id: fileId } });
  try { fs.unlinkSync(absolutePath(file.storagePath)); } catch { /* ignore */ }
}

export async function addNote(
  resourceId: string,
  requesterId: string,
  role: string,
  input: z.infer<typeof addNoteSchema>,
) {
  await assertCanEditResource(resourceId, requesterId, role);

  const note = await prisma.resourceNote.create({
    data: { resourceId, title: input.title, content: input.content || "" },
  });
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.getTime(),
  };
}

export async function deleteResourceNote(resourceId: string, noteId: string, requesterId: string, role: string) {
  await assertCanEditResource(resourceId, requesterId, role);

  const note = await prisma.resourceNote.findFirst({ where: { id: noteId, resourceId } });
  if (!note) {
    throw new ResourceError("الملاحظة غير موجودة", 404);
  }
  await prisma.resourceNote.delete({ where: { id: noteId } });
}

export async function addLink(
  resourceId: string,
  requesterId: string,
  role: string,
  input: z.infer<typeof addLinkSchema>,
) {
  await assertCanEditResource(resourceId, requesterId, role);

  const link = await prisma.resourceLink.create({
    data: { resourceId, title: input.title, url: input.url },
  });
  return {
    id: link.id,
    title: link.title,
    url: link.url,
    createdAt: link.createdAt.getTime(),
  };
}

export async function deleteResourceLink(resourceId: string, linkId: string, requesterId: string, role: string) {
  await assertCanEditResource(resourceId, requesterId, role);

  const link = await prisma.resourceLink.findFirst({ where: { id: linkId, resourceId } });
  if (!link) {
    throw new ResourceError("الرابط غير موجود", 404);
  }
  await prisma.resourceLink.delete({ where: { id: linkId } });
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ResourceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ResourceError";
    this.status = status;
  }
}
