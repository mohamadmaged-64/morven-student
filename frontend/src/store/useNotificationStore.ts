import { create } from 'zustand';
import { isPreviewMode } from '@/dev/previewMode';
import { getAccessToken } from '@/services/authApi';
import {
  fetchNotifications as fetchNotificationsApi,
  createNotification as createNotificationApi,
  deleteNotification as deleteNotificationApi,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
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

function recompute(state: NotificationState, notifications: Notification[]): Partial<NotificationState> {
  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

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
    set((state) =>
      recompute(state, [notification, ...state.notifications]),
    );
  },

  markAsRead: (id) => {
    const notif = get().notifications.find((n) => n.id === id);
    if (!notif || notif.read) return;
    set((state) =>
      recompute(
        state,
        state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      ),
    );
    markAsReadApi(id).catch(() => {
      set((state) =>
        recompute(
          state,
          state.notifications.map((n) =>
            n.id === id ? { ...n, read: false } : n,
          ),
        ),
      );
    });
  },

  markAllAsRead: () => {
    set((state) =>
      recompute(
        state,
        state.notifications.map((n) => ({ ...n, read: true })),
      ),
    );
    markAllAsReadApi().catch(() => {
      fetchNotificationsApi()
        .then(({ notifications }) => {
          set((state) => recompute(state, notifications));
        })
        .catch(() => {
          /* keep optimistic state */
        });
    });
  },

  dismissNotification: (id) => {
    const n = get().notifications.find((x) => x.id === id);
    if (!n) return;
    if (!n.read) markAsReadApi(id).catch(() => {});
    set((state) => ({
      notifications: state.notifications.filter((x) => x.id !== id),
    }));
  },

  fetchNotifications: async () => {
    if (isPreviewMode()) return;
    if (!getAccessToken()) return;
    set({ loading: true });
    try {
      const { notifications: server } = await fetchNotificationsApi();
      set((state) => ({ ...recompute(state, server), loading: false }));
    } catch {
      set({ loading: false });
    }
  },

  createNotification: async (n) => {
    const { notification } = await createNotificationApi(n);
    set((state) =>
      recompute(state, [{ ...notification, read: false }, ...state.notifications]),
    );
  },

  deleteNotification: async (id) => {
    await deleteNotificationApi(id);
    set((state) =>
      recompute(state, state.notifications.filter((x) => x.id !== id)),
    );
  },
}));
