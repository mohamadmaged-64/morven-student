import { z } from "zod";
import prisma from "../lib/prisma";
import { GroupError } from "./group.service";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const submitPomodoroSchema = z.object({
  groupId: z.string().uuid(),
  durationSeconds: z.number().int().min(60, "الحد الأدنى 60 ثانية").max(7200, "الحد الأقصى 7200 ثانية (ساعتان)"),
  sessionId: z.string().min(1, "معرف الجلسة مطلوب").max(200),
});

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function verifyMembership(userId: string, groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new GroupError("المجموعة غير موجودة", 404);
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    throw new GroupError("غير مصرح", 403);
  }
}

export async function submitPomodoroSession(
  userId: string,
  groupId: string,
  durationSeconds: number,
  sessionId: string,
) {
  // Verify membership (also throws 404 if group does not exist)
  await verifyMembership(userId, groupId);

  // Check duplicate
  const existing = await prisma.pomodoroSession.findUnique({
    where: { sessionId },
  });
  if (existing) {
    throw new GroupError("تم تسجيل هذه الجلسة مسبقاً", 409);
  }

  // Store session
  const session = await prisma.pomodoroSession.create({
    data: {
      userId,
      groupId,
      durationSeconds,
      sessionId,
    },
  });

  // Calculate this user's new total for the group
  const userTotal = await prisma.pomodoroSession.aggregate({
    where: { userId, groupId },
    _sum: { durationSeconds: true },
  });

  return {
    session: {
      id: session.id,
      durationSeconds: session.durationSeconds,
      completedAt: session.completedAt.toISOString(),
    },
    userTotalSeconds: userTotal._sum.durationSeconds ?? 0,
  };
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalSeconds: number;
}

export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  // Get all members with their user info
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          profile: { select: { avatarUrl: true } },
        },
      },
    },
  });

  // Get aggregated focus time per user
  const aggregates = await prisma.pomodoroSession.groupBy({
    by: ["userId"],
    where: { groupId },
    _sum: { durationSeconds: true },
  });

  const totalMap = new Map<string, number>();
  for (const agg of aggregates) {
    totalMap.set(agg.userId, agg._sum.durationSeconds ?? 0);
  }

  // Build leaderboard sorted by total seconds desc, then userId asc (deterministic tie-breaker)
  const leaderboard: LeaderboardEntry[] = members.map((m) => ({
    userId: m.user.id,
    username: m.user.username,
    displayName: m.user.displayName,
    avatarUrl: m.user.profile?.avatarUrl ?? null,
    totalSeconds: totalMap.get(m.user.id) ?? 0,
  }));

  leaderboard.sort((a, b) => {
    if (b.totalSeconds !== a.totalSeconds) return b.totalSeconds - a.totalSeconds;
    return a.userId.localeCompare(b.userId);
  });

  return leaderboard;
}
