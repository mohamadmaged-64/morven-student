import { z } from "zod";
import prisma from "../lib/prisma";

export const createNotificationSchema = z.object({
  title: z
    .string()
    .min(1, "العنوان مطلوب")
    .max(120, "العنوان طويل جداً")
    .trim(),
  body: z
    .string()
    .min(1, "النص مطلوب")
    .max(1000, "النص طويل جداً")
    .trim(),
  type: z.enum(["info", "announcement", "update"], {
    error: "نوع الإشعار غير صالح",
  }),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export async function listNotifications() {
  return prisma.appNotification.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createNotification(
  input: CreateNotificationInput,
  createdBy: string
) {
  return prisma.appNotification.create({
    data: { ...input, createdBy },
  });
}

export async function deleteNotification(id: string) {
  const result = await prisma.appNotification.deleteMany({ where: { id } });
  return result.count > 0;
}