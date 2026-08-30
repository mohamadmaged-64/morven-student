import { authRequest } from './authApi';
import type { AuthUser } from './authApi';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function listUsers(): Promise<AdminUser[]> {
  const data = await authRequest<{ users: AdminUser[] }>('/api/admin/users');
  return data.users;
}

export async function updateUserRole(
  userId: string,
  role: 'ADMIN' | 'USER',
): Promise<AdminUser> {
  const data = await authRequest<{ user: AdminUser }>(
    `/api/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );
  return data.user;
}

export type { AuthUser };
