import { authRequest, getAccessToken } from './authApi';
import { isPreviewMode } from '@/dev/previewMode';
import {
  mockGetOwnProfile,
  mockUpdateOwnProfile,
  mockGetPublicProfile,
  mockGetPublicAchievements,
  mockSyncAchievements,
} from '@/dev/mockApi';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OwnProfile extends Profile {
  email: string;
}

export interface AchievementCounters {
  username: string;
  completedTasks: number;
  cardsReviewed: number;
  completedSessions: number;
  meaningfulNotes: number;
  files: number;
  flashcards: number;
  quizzesCompleted: number;
  totalAchievements: number;
  updatedAt: string | null;
}

export interface AchievementSync {
  completedTasks: number;
  cardsReviewed: number;
  completedSessions: number;
  meaningfulNotes: number;
  files: number;
  flashcards: number;
  quizzesCompleted: number;
}

export async function getOwnProfile(): Promise<{ profile: OwnProfile }> {
  if (isPreviewMode()) return mockGetOwnProfile();
  return authRequest<{ profile: OwnProfile }>('/api/profile/me');
}

export async function updateOwnProfile(data: {
  displayName?: string;
  bio?: string;
  isPublic?: boolean;
}): Promise<{ profile: OwnProfile }> {
  if (isPreviewMode()) return mockUpdateOwnProfile(data);
  return authRequest<{ profile: OwnProfile }>('/api/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const fd = new FormData();
  fd.append('avatar', file);
  const res = await fetch(`${API_BASE}/api/profile/avatar`, { method: 'POST', headers: authHeaders(), body: fd, credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'حدث خطأ'); }
  return res.json();
}

export async function removeAvatar(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/profile/avatar`, { method: 'DELETE', headers: authHeaders(), credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'حدث خطأ'); }
  return res.json();
}

export async function getPublicProfile(
  username: string,
): Promise<{ profile: Profile }> {
  if (isPreviewMode()) return mockGetPublicProfile(username);
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/profile/${encodeURIComponent(username)}`,
    {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ غير متوقع');
  }

  return data as { profile: Profile };
}

export async function getPublicAchievements(
  username: string,
): Promise<{ achievements: AchievementCounters }> {
  if (isPreviewMode()) return mockGetPublicAchievements(username);
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/profile/${encodeURIComponent(username)}/achievements`,
    {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ غير متوقع');
  }

  return data as { achievements: AchievementCounters };
}

export async function syncAchievements(
  counters: Omit<AchievementSync, 'username'>,
): Promise<{ ok: boolean }> {
  if (isPreviewMode()) return mockSyncAchievements(counters);
  return authRequest<{ ok: boolean }>('/api/profile/me/achievements', {
    method: 'PUT',
    body: JSON.stringify(counters),
  });
}
