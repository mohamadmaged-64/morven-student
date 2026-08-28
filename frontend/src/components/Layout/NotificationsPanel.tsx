import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type Notification } from '@/store/useNotificationStore';
import { Bell, Megaphone, RefreshCw, Info, X, CheckCheck } from 'lucide-react';

function typeIcon(type: Notification['type']) {
  switch (type) {
    case 'announcement':
      return <Megaphone className="w-4 h-4 text-primary-500" />;
    case 'update':
      return <RefreshCw className="w-4 h-4 text-sky-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-amber-500" />;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification } =
    useNotificationStore();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute top-full end-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-card rounded-2xl shadow-elevated border border-light-border dark:border-dark-border overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  الإشعارات
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  قراءة الكل
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`relative flex gap-3 px-4 py-3 border-b border-light-border/50 dark:border-dark-border/50 last:border-0 transition-colors ${
                      !n.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                    }`}
                    onClick={() => markAsRead(n.id)}
                  >
                    {!n.read && (
                      <div className="absolute top-4 end-4 w-2 h-2 rounded-full bg-primary-500" />
                    )}
                    <div className="shrink-0 mt-0.5">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(n.id);
                      }}
                      className="shrink-0 p-1 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
