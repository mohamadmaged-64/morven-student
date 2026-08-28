import { Router, Request, Response } from "express";
import { submitPomodoroSchema, submitPomodoroSession, getGroupLeaderboard, verifyMembership } from "../services/pomodoro.service";
import { GroupError } from "../services/group.service";
import { authenticate } from "../middleware/auth";
import { broadcastLeaderboard } from "../services/presence.service";

const router = Router();

function handlePomodoroError(err: unknown, res: Response): void {
  if (err instanceof GroupError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error("Pomodoro error:", err);
  res.status(500).json({ error: "حدث خطأ في الخادم" });
}

// POST /api/pomodoro/submit — submit a completed Pomodoro session
router.post("/api/pomodoro/submit", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    const parsed = submitPomodoroSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { groupId, durationSeconds, sessionId } = parsed.data;
    const result = await submitPomodoroSession(
      req.user.sub,
      groupId,
      durationSeconds,
      sessionId,
    );

    // Broadcast updated leaderboard to group members via Socket.IO
    try {
      const leaderboard = await getGroupLeaderboard(groupId);
      broadcastLeaderboard(groupId, leaderboard);
    } catch { /* broadcast is best-effort */ }

    res.status(201).json(result);
  } catch (err) {
    handlePomodoroError(err, res);
  }
});

// GET /api/groups/:groupId/leaderboard — get group leaderboard
router.get("/api/groups/:groupId/leaderboard", authenticate, async (req: Request<{ groupId: string }>, res: Response) => {
  try {
    if (!req.user) { res.status(401).json({ error: "غير مصرح" }); return; }

    // Only group members may view the leaderboard
    await verifyMembership(req.user.sub, req.params.groupId);

    const leaderboard = await getGroupLeaderboard(req.params.groupId);
    res.json({ leaderboard });
  } catch (err) {
    handlePomodoroError(err, res);
  }
});

export default router;
