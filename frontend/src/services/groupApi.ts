import { authRequest, authedFetch } from './authApi';
import { API_BASE } from './apiBase';
import { isPreviewMode } from '@/dev/previewMode';
import {
  mockCreateGroup,
  mockJoinGroup,
  mockListGroups,
  mockGetGroupDetails,
  mockLeaveGroup,
  mockDeleteGroup,
  mockUpdateGroup,
  mockRemoveMember,
  mockUpdateMemberRole,
  mockSubmitPomodoroSession,
  mockGetGroupLeaderboard,
  mockGetWeeklyGroupRanking,
} from '@/dev/mockApi';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  joinCode: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
  memberCount?: number;
  isMember?: boolean;
}

export interface GroupMember {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalSeconds: number;
}

export interface WeeklyRankingEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  weeklySeconds: number;
}

export interface GroupDetails extends Group {
  members: GroupMember[];
}

export async function createGroup(data: { name: string; description?: string; image?: File }): Promise<{ group: Group }> {
  if (isPreviewMode()) return mockCreateGroup(data);
  if (data.image) {
    const fd = new FormData();
    fd.append('name', data.name);
    if (data.description) fd.append('description', data.description);
    fd.append('image', data.image);
    const res = await authedFetch(`${API_BASE}/api/groups`, { method: 'POST', body: fd });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'حدث خطأ'); }
    return res.json();
  }
  return authRequest<{ group: Group }>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name: data.name, description: data.description }),
  });
}

export async function updateGroup(groupId: string, data: { name?: string; description?: string; image?: File; removeImage?: boolean }): Promise<{ group: Group }> {
  if (isPreviewMode()) {
    return mockUpdateGroup(groupId, { name: data.name, description: data.description }).then((r) => r as { group: Group });
  }
  if (data.image || data.removeImage || data.name !== undefined || data.description !== undefined) {
    const fd = new FormData();
    if (data.name !== undefined) fd.append('name', data.name);
    if (data.description !== undefined) fd.append('description', data.description);
    if (data.image) fd.append('image', data.image);
    if (data.removeImage) fd.append('removeImage', 'true');
    const res = await authedFetch(`${API_BASE}/api/groups/${groupId}`, { method: 'PATCH', body: fd });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'حدث خطأ'); }
    return res.json();
  }
  return authRequest<{ group: Group }>(`/api/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function joinGroup(joinCode: string): Promise<{ group: Group }> {
  if (isPreviewMode()) return mockJoinGroup(joinCode);
  return authRequest<{ group: Group }>('/api/groups/join', {
    method: 'POST',
    body: JSON.stringify({ joinCode }),
  });
}

export async function listGroups(): Promise<{ groups: Group[] }> {
  if (isPreviewMode()) return mockListGroups();
  return authRequest<{ groups: Group[] }>('/api/groups');
}

export async function getGroupDetails(groupId: string): Promise<{ group: GroupDetails }> {
  if (isPreviewMode()) return mockGetGroupDetails(groupId);
  return authRequest<{ group: GroupDetails }>(`/api/groups/${groupId}`);
}

export async function leaveGroup(groupId: string): Promise<{ message: string }> {
  if (isPreviewMode()) return mockLeaveGroup(groupId);
  return authRequest<{ message: string }>(`/api/groups/${groupId}/leave`, {
    method: 'POST',
  });
}

export async function deleteGroup(groupId: string): Promise<{ message: string }> {
  if (isPreviewMode()) return mockDeleteGroup(groupId);
  return authRequest<{ message: string }>(`/api/groups/${groupId}`, {
    method: 'DELETE',
  });
}

export async function removeMember(groupId: string, memberId: string): Promise<{ message: string }> {
  if (isPreviewMode()) return mockRemoveMember(groupId, memberId);
  return authRequest<{ message: string }>(`/api/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function updateMemberRole(
  groupId: string,
  memberId: string,
  role: 'ADMIN' | 'MEMBER',
): Promise<{ message: string }> {
  if (isPreviewMode()) return mockUpdateMemberRole(groupId, memberId, role);
  return authRequest<{ message: string }>(`/api/groups/${groupId}/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

// ---------------------------------------------------------------------------
// Pomodoro competition
// ---------------------------------------------------------------------------

export async function submitPomodoroSession(data: {
  groupId: string;
  durationSeconds: number;
  sessionId: string;
}): Promise<{ session: { id: string; durationSeconds: number; completedAt: string }; userTotalSeconds: number }> {
  if (isPreviewMode()) return mockSubmitPomodoroSession(data);
  return authRequest(`/api/pomodoro/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getGroupLeaderboard(groupId: string): Promise<{ leaderboard: LeaderboardEntry[] }> {
  if (isPreviewMode()) return mockGetGroupLeaderboard(groupId);
  return authRequest<{ leaderboard: LeaderboardEntry[] }>(`/api/groups/${groupId}/leaderboard`);
}

export async function getWeeklyGroupRanking(groupId: string): Promise<{
  weekStart: string;
  weekEnd: string;
  ranking: WeeklyRankingEntry[];
}> {
  if (isPreviewMode()) return mockGetWeeklyGroupRanking(groupId);
  return authRequest<{ weekStart: string; weekEnd: string; ranking: WeeklyRankingEntry[] }>(
    `/api/groups/${groupId}/leaderboard/weekly`,
  );
}
