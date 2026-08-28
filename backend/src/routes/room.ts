import { Router, Request, Response } from "express";
import {
  createRoomSchema,
  updateRoomSchema,
  createRoom,
  listRooms,
  getRoomDetails,
  updateRoom,
  deleteRoom,
  RoomError,
} from "../services/room.service";
import { authenticate } from "../middleware/auth";

const router = Router();

function handleRoomError(err: unknown, res: Response): void {
  if (err instanceof RoomError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("Room error:", err);
  res.status(500).json({ error: "حدث خطأ في الخادم" });
}

// POST /api/groups/:groupId/rooms — create a room in a group
router.post("/api/groups/:groupId/rooms", authenticate, async (req: Request<{ groupId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const room = await createRoom(req.params.groupId, req.user.sub, parsed.data);
    res.status(201).json({ room });
  } catch (err) {
    handleRoomError(err, res);
  }
});

// GET /api/groups/:groupId/rooms — list rooms in a group
router.get("/api/groups/:groupId/rooms", authenticate, async (req: Request<{ groupId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const rooms = await listRooms(req.params.groupId, req.user.sub);
    res.json({ rooms });
  } catch (err) {
    handleRoomError(err, res);
  }
});

// GET /api/rooms/:roomId — get room details
router.get("/api/rooms/:roomId", authenticate, async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const room = await getRoomDetails(req.params.roomId, req.user.sub);
    res.json({ room });
  } catch (err) {
    handleRoomError(err, res);
  }
});

// PUT /api/rooms/:roomId — update a room
router.put("/api/rooms/:roomId", authenticate, async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: "لم يتم تقديم أي بيانات للتحديث" });
      return;
    }

    const room = await updateRoom(req.params.roomId, req.user.sub, parsed.data);
    res.json({ room });
  } catch (err) {
    handleRoomError(err, res);
  }
});

// DELETE /api/rooms/:roomId — delete a room
router.delete("/api/rooms/:roomId", authenticate, async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    await deleteRoom(req.params.roomId, req.user.sub);
    res.json({ message: "تم حذف الغرفة بنجاح" });
  } catch (err) {
    handleRoomError(err, res);
  }
});

export default router;
