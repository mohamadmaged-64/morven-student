import { authRequest } from './authApi';
import { isPreviewMode } from '@/dev/previewMode';

export interface ServerNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'announcement' | 'update';
  createdAt: string;
}

export async function fetchNotifications(): Promise<{
  notifications: ServerNotification[];
}> {
  if (isPreviewMode()) return { notifications: [] };
  return authRequest<{ notifications: ServerNotification[] }>(
    '/api/notifications',
  );
}

export async function createNotification(input: {
  title: string;
  body: string;
  type: 'info' | 'announcement' | 'update';
}): Promise<{ notification: ServerNotification }> {
  if (isPreviewMode()) throw new Error('غير متاح في وضع المعاينة');
  return authRequest<{ notification: ServerNotification }>(
    '/api/notifications',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function deleteNotification(
  id: string,
): Promise<{ message: string }> {
  if (isPreviewMode()) throw new Error('غير متاح في وضع المعاينة');
  return authRequest<{ message: string }>(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
}