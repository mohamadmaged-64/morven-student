/**
 * DEV-ONLY: Mock API responses for UI Preview Mode.
 * Each function returns data matching the real API contract.
 */

import {
  MOCK_USER,
  MOCK_PROFILE,
  MOCK_ACHIEVEMENTS,
  MOCK_GROUPS,
  MOCK_GROUP_DETAILS,
  MOCK_LEADERBOARDS,
  mockDelay,
} from './mockData';
import type { AuthUser } from '@/pages/auth/authApi';
import type { OwnProfile, Profile, AchievementCounters, AchievementSync } from '@/services/profileApi';
import type { Group, GroupDetails } from '@/services/groupApi';

// ---------------------------------------------------------------------------
// Auth mocks
// ---------------------------------------------------------------------------

export function mockRefresh(): Promise<{ user: AuthUser; accessToken: string }> {
  return mockDelay({
    user: { ...MOCK_USER },
    accessToken: 'preview-mock-token',
  }, 100);
}

export function mockGetMe(): Promise<{ user: AuthUser }> {
  return mockDelay({ user: { ...MOCK_USER } }, 50);
}

export function mockLogin(_email: string, _password: string): Promise<{ user: AuthUser; accessToken: string }> {
  return mockDelay({
    user: { ...MOCK_USER },
    accessToken: 'preview-mock-token',
  }, 300);
}

export function mockRegister(
  _email: string,
  _username: string,
  _password: string,
  displayName: string,
): Promise<{ user: AuthUser; accessToken: string }> {
  return mockDelay({
    user: { ...MOCK_USER, displayName },
    accessToken: 'preview-mock-token',
  }, 300);
}

export async function mockLogout(): Promise<void> {
  await mockDelay(undefined, 100);
}

export function mockRequestPasswordReset(_email: string): Promise<{ message: string }> {
  return mockDelay(
    { message: 'إذا كان هذا البريد الإلكتروني مسجلاً، فستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.' },
    300,
  );
}

export function mockResetPassword(_token: string, _password: string): Promise<{ message: string }> {
  return mockDelay({ message: 'تم إعادة تعيين كلمة المرور بنجاح' }, 300);
}

// ---------------------------------------------------------------------------
// Profile mocks
// ---------------------------------------------------------------------------

export function mockGetOwnProfile(): Promise<{ profile: OwnProfile }> {
  return mockDelay({ profile: { ...MOCK_PROFILE } }, 150);
}

export function mockUpdateOwnProfile(data: {
  displayName?: string;
  bio?: string;
  isPublic?: boolean;
}): Promise<{ profile: OwnProfile }> {
  const updated = {
    ...MOCK_PROFILE,
    ...(data.displayName !== undefined && { displayName: data.displayName }),
    ...(data.bio !== undefined && { bio: data.bio || null }),
    ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
    updatedAt: new Date().toISOString(),
  };
  // Update local mock data so subsequent reads reflect the change
  Object.assign(MOCK_PROFILE, updated);
  return mockDelay({ profile: { ...MOCK_PROFILE } }, 150);
}

export function mockGetPublicProfile(username: string): Promise<{ profile: Profile }> {
  // Return mock profile for any username
  const profile = {
    id: `profile-${username}`,
    username,
    displayName: username === MOCK_PROFILE.username ? MOCK_PROFILE.displayName : `مستخدم ${username}`,
    bio: username === MOCK_PROFILE.username ? MOCK_PROFILE.bio : null,
    avatarUrl: null,
    isPublic: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-08-20T14:30:00.000Z',
  };
  return mockDelay({ profile }, 150);
}

export function mockGetPublicAchievements(username: string): Promise<{ achievements: AchievementCounters }> {
  const base = {
    ...MOCK_ACHIEVEMENTS,
    username,
  };
  base.totalAchievements =
    base.completedTasks + base.cardsReviewed + base.completedSessions +
    base.meaningfulNotes + base.files + base.flashcards + base.quizzesCompleted;
  return mockDelay({ achievements: { ...base } }, 150);
}

export function mockSyncAchievements(counters: Omit<AchievementSync, 'username'>): Promise<{ ok: boolean }> {
  Object.assign(MOCK_ACHIEVEMENTS, {
    ...counters,
    totalAchievements:
      counters.completedTasks + counters.cardsReviewed + counters.completedSessions +
      counters.meaningfulNotes + counters.files + counters.flashcards + counters.quizzesCompleted,
    updatedAt: new Date().toISOString(),
  });
  return mockDelay({ ok: true }, 100);
}

// ---------------------------------------------------------------------------
// Group mocks
// ---------------------------------------------------------------------------

let localGroups: Group[] = [...MOCK_GROUPS];

export function mockListGroups(): Promise<{ groups: Group[] }> {
  return mockDelay({ groups: [...localGroups] }, 150);
}

export function mockCreateGroup(data: { name: string; description?: string }): Promise<{ group: Group }> {
  const newGroup: Group = {
    id: `group-${Date.now()}`,
    name: data.name,
    description: data.description || null,
    joinCode: String(Math.floor(100000 + Math.random() * 900000)),
    creatorId: MOCK_USER.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: 'OWNER',
    memberCount: 1,
  };
  localGroups = [newGroup, ...localGroups];
  return mockDelay({ group: { ...newGroup } }, 200);
}

export function mockJoinGroup(joinCode: string): Promise<{ group: Group }> {
  const existing = localGroups.find((g) => g.joinCode === joinCode);
  if (existing) {
    return Promise.reject(new Error('أنت عضو بالفعل في هذه المجموعة'));
  }
  const newGroup: Group = {
    id: `group-${Date.now()}`,
    name: `مجموعة ${joinCode}`,
    description: 'انضمّت عبر المعاينة',
    joinCode,
    creatorId: 'other-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: 'MEMBER',
    memberCount: 4,
  };
  localGroups = [newGroup, ...localGroups];
  return mockDelay({ group: { ...newGroup } }, 200);
}

export function mockGetGroupDetails(groupId: string): Promise<{ group: GroupDetails }> {
  const details = MOCK_GROUP_DETAILS[groupId];
  if (!details) {
    return Promise.reject(new Error('المجموعة غير موجودة'));
  }
  return mockDelay({ group: { ...details } as GroupDetails }, 150);
}

export function mockLeaveGroup(_groupId: string): Promise<{ message: string }> {
  return mockDelay({ message: 'تمت المغادرة بنجاح' }, 200);
}

export function mockDeleteGroup(groupId: string): Promise<{ message: string }> {
  localGroups = localGroups.filter((g) => g.id !== groupId);
  return mockDelay({ message: 'تم حذف المجموعة بنجاح' }, 200);
}

export function mockUpdateGroup(
  groupId: string,
  data: { name?: string; description?: string },
): Promise<{ group: GroupDetails }> {
  const details = MOCK_GROUP_DETAILS[groupId];
  if (!details) {
    return Promise.reject(new Error('المجموعة غير موجودة'));
  }
  // OWNER and ADMIN can edit; MEMBER cannot (mirrors backend authorization).
  if (details.role !== 'OWNER' && details.role !== 'ADMIN') {
    return Promise.reject(new Error('فقط المالك أو المدير يمكنه تعديل المجموعة'));
  }
  if (data.name !== undefined) details.name = data.name;
  if (data.description !== undefined) details.description = data.description;
  details.updatedAt = new Date().toISOString();

  const listGroup = localGroups.find((g) => g.id === groupId);
  if (listGroup) {
    if (data.name !== undefined) listGroup.name = data.name;
    if (data.description !== undefined) listGroup.description = data.description;
  }

  return mockDelay({ group: { ...details } as GroupDetails }, 150);
}


export function mockRemoveMember(_groupId: string, _memberId: string): Promise<{ message: string }> {
  return mockDelay({ message: 'تمت إزالة العضو بنجاح' }, 200);
}

export function mockUpdateMemberRole(_groupId: string, _memberId: string, _role: string): Promise<{ message: string }> {
  return mockDelay({ message: 'تم تحديث الدور بنجاح' }, 200);
}

// ---------------------------------------------------------------------------
// Pomodoro mocks
// ---------------------------------------------------------------------------

export function mockSubmitPomodoroSession(data: {
  groupId: string;
  durationSeconds: number;
  sessionId: string;
}): Promise<{ session: { id: string; durationSeconds: number; completedAt: string }; userTotalSeconds: number }> {
  // Add to leaderboard mock
  const lb = MOCK_LEADERBOARDS[data.groupId] ?? [];
  const existing = lb.find((e) => e.userId === MOCK_USER.id);
  if (existing) {
    existing.totalSeconds += data.durationSeconds;
  } else {
    lb.push({
      userId: MOCK_USER.id,
      username: MOCK_USER.username,
      displayName: MOCK_USER.displayName,
      avatarUrl: null,
      totalSeconds: data.durationSeconds,
    });
    MOCK_LEADERBOARDS[data.groupId] = lb;
  }
  // Re-sort by totalSeconds desc
  lb.sort((a, b) => b.totalSeconds - a.totalSeconds);

  const totalSeconds = existing ? existing.totalSeconds : data.durationSeconds;
  return mockDelay({
    session: {
      id: `session-${Date.now()}`,
      durationSeconds: data.durationSeconds,
      completedAt: new Date().toISOString(),
    },
    userTotalSeconds: totalSeconds,
  }, 150);
}

export function mockGetGroupLeaderboard(groupId: string): Promise<{ leaderboard: typeof MOCK_LEADERBOARDS[string] }> {
  const leaderboard = [...(MOCK_LEADERBOARDS[groupId] ?? [])].sort((a, b) => {
    if (b.totalSeconds !== a.totalSeconds) return b.totalSeconds - a.totalSeconds;
    return a.userId.localeCompare(b.userId);
  });
  return mockDelay({ leaderboard }, 150);
}

/**
 * Current weekly competition week for preview mode: Saturday 00:00 →
 * Friday 23:59:59 in Asia/Hebron (same rules as the backend).
 */
function mockWeekBounds() {
  const DAY_MS = 86_400_000;
  const now = new Date();
  // Backtrack to the most recent Saturday 00:00 in the app's civil time.
  const hebron = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hebron',
    weekday: 'short',
  });
  const daysBack = WEEKDAY_OFFSET[hebron.format(now)] ?? 0;
  const saturdayLocalZero = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, 0, 0, 0, 0);
  const weekStart = new Date(saturdayLocalZero.getTime() - saturdayLocalZero.getTimezoneOffset() * 60_000);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS - 1000);
  return { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() };
}

const WEEKDAY_OFFSET: Record<string, number> = {
  Sat: 0,
  Fri: 1,
  Thu: 2,
  Wed: 3,
  Tue: 4,
  Mon: 5,
  Sun: 6,
};

export function mockGetWeeklyGroupRanking(groupId: string): Promise<{
  weekStart: string;
  weekEnd: string;
  ranking: Array<{ rank: number; userId: string; username: string; displayName: string; avatarUrl: string | null; weeklySeconds: number }>;
}> {
  const entries = (MOCK_LEADERBOARDS[groupId] ?? [])
    .map((e) => ({
      rank: 0,
      userId: e.userId,
      username: e.username,
      displayName: e.displayName,
      avatarUrl: e.avatarUrl,
      weeklySeconds: e.totalSeconds,
    }))
    .sort((a, b) => b.weeklySeconds - a.weeklySeconds || a.userId.localeCompare(b.userId))
    .map((e, i) => ({ ...e, rank: i + 1 }));
  const { weekStart, weekEnd } = mockWeekBounds();
  return mockDelay({ weekStart, weekEnd, ranking: entries }, 150);
}