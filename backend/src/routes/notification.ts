import { Router, Request, Response } from "express";
import {
  createNotificationSchema,
  listNotifications,
  createNotification,
  deleteNotification,
} from "../services/notification.service";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// GET /api/notifications — list global notifications (authenticated users)
router.get(
  "/api/notifications",
  authenticate,
  async (_req: Request, res: Response) => {
    try {
      const notifications = await listNotifications();
      res.json({ notifications });
    } catch (err) {
      console.error("List notifications error:", err);
      res.status(500).json({ error: "حدث خطأ في الخادم" });
    }
  }
);

// POST /api/notifications — create a GLOBAL notification (ADMIN only)
router.post(
  "/api/notifications",
  authenticate,
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "غير مصرح" });
        return;
      }

      const parsed = createNotificationSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        res.status(400).json({ error: firstError.message });
        return;
      }

      const notification = await createNotification(parsed.data, req.user.sub);
      res.status(201).json({ notification });
    } catch (err) {
      console.error("Create notification error:", err);
      res.status(500).json({ error: "حدث خطأ في الخادم" });
    }
  }
);

// DELETE /api/notifications/:id — delete a GLOBAL notification (ADMIN only)
router.delete(
  "/api/notifications/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || id.trim().length === 0) {
        res.status(400).json({ error: "معرف الإشعار مطلوب" });
        return;
      }

      const deleted = await deleteNotification(id);
      if (!deleted) {
        res.status(404).json({ error: "الإشعار غير موجود" });
        return;
      }

      res.json({ message: "تم حذف الإشعار بنجاح" });
    } catch (err) {
      console.error("Delete notification error:", err);
      res.status(500).json({ error: "حدث خطأ في الخادم" });
    }
  }
);

export default router;