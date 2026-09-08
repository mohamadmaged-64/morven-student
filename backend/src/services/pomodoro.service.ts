import { z } from "zod";
import prisma from "../lib/prisma";
import { GroupError, isGlobalAdmin } from "./group.service";
import { getWeekBounds } from "./week.service";

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

export async function verifyMembership(userId: string, groupId: string, userRole?: string): Promise<void> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new GroupError("المجموعة غير موجودة", 404);
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership && !isGlobalAdmin(userRole)) {
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

// ---------------------------------------------------------------------------
// Weekly Group Ranking
// ---------------------------------------------------------------------------
// A per-Group competition scoped to the current competition week
// (Saturday 00:00 → Friday 23:59:59 in the configured weekly timezone).
// Totals are derived directly from the existing Pomodoro sessions (the
// source of truth) filtered by the half-open weekly interval, so:
//   - no personal/global statistics are ever written or reset,
//   - existing sessions are never deleted or modified,
//   - concurrent completions cannot corrupt totals (nothing is aggregated
//     into a mutable per-user counter at write time),
//   - the ranking automatically moves to the new week each Saturday without
//     any reset job or frontend timer.
// ---------------------------------------------------------------------------

export interface WeeklyRankingEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  weeklySeconds: number;
}

export async function getWeeklyGroupRanking(
  groupId: string,
  now: Date = new Date(),
): Promise<{ weekStart: Date; weekEnd: Date; ranking: WeeklyRankingEntry[] }> {
  const { weekStart, weekEnd, nextWeekStart } = getWeekBounds(now);

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

  // Aggregate this week's Pomodoro duration per user within this group.
  const aggregates = await prisma.pomodoroSession.groupBy({
    by: ["userId"],
    where: {
      groupId,
      completedAt: { gte: weekStart, lt: nextWeekStart },
    },
    _sum: { durationSeconds: true },
  });

  const weeklyMap = new Map<string, number>();
  for (const agg of aggregates) {
    weeklyMap.set(agg.userId, agg._sum.durationSeconds ?? 0);
  }

  // Same user/profile conventions as the existing all-time leaderboard, plus
  // the weekly duration. Sorted by duration descending with a deterministic
  // tie-breaker (userId ascending).
  const ranking: WeeklyRankingEntry[] = members
    .map((m) => ({
      userId: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      avatarUrl: m.user.profile?.avatarUrl ?? null,
      weeklySeconds: weeklyMap.get(m.user.id) ?? 0,
    }))
    .sort((a, b) => {
      if (b.weeklySeconds !== a.weeklySeconds) return b.weeklySeconds - a.weeklySeconds;
      return a.userId.localeCompare(b.userId);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return { weekStart, weekEnd, ranking };
}
