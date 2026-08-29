import { create } from 'zustand';
import { isPreviewMode } from '@/dev/previewMode';
import { getAccessToken } from '@/services/authApi';
import {
  fetchNotifications as fetchNotificationsApi,
  createNotification as createNotificationApi,
  deleteNotification as deleteNotificationApi,
} from '@/services/notificationApi';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'announcement' | 'update';
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  fetchNotifications: () => Promise<void>;
  createNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'مرحباً بك في الملتقى',
    body: 'تم إطلاق الملتقى ! انضم لمجموعتك الدراسية وابدأ التعاون مع زملائك.',
    type: 'announcement',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'n2',
    title: 'تحديث جديد',
    body: 'تم إضافة غرفة الدراسة المباشرة. يمكنك الآن الانضمام لغرف دراسية مع زملائك.',
    type: 'update',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'n3',
    title: 'معلومة',
    body: 'يمكنك إنشاء حتى 3 مجموعات دراسية. انضم لمجموعات زملائك باستخدام رمز الانضمام.',
    type: 'info',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
  loading: false,

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: `n${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  dismissNotification: (id) => {
    set((state) => {
      const n = state.notifications.find((x) => x.id === id);
      return {
        notifications: state.notifications.filter((x) => x.id !== id),
        unreadCount: n && !n.read ? state.unreadCount - 1 : state.unreadCount,
      };
    });
  },

  fetchNotifications: async () => {
    if (isPreviewMode() || !getAccessToken()) return;
    set({ loading: true });
    try {
      const { notifications: server } = await fetchNotificationsApi();
      const local = get().notifications;
      const readMap = new Map(local.map((n) => [n.id, n.read]));
      const merged: Notification[] = server.map((n) => ({
        ...n,
        read: readMap.get(n.id) ?? false,
      }));
      const localOnly = local.filter(
        (n) => !server.some((s) => s.id === n.id),
      );
      const all = [...merged, ...localOnly].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      set({
        notifications: all,
        unreadCount: all.filter((n) => !n.read).length,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  createNotification: async (n) => {
    const { notification } = await createNotificationApi(n);
    set((state) => ({
      notifications: [{ ...notification, read: false }, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  deleteNotification: async (id) => {
    await deleteNotificationApi(id);
    set((state) => {
      const n = state.notifications.find((x) => x.id === id);
      return {
        notifications: state.notifications.filter((x) => x.id !== id),
        unreadCount: n && !n.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
  },
}));