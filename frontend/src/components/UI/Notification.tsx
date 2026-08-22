import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

type NotificationItem = {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
};

type NotificationProps = {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
};

const typeConfig: Record<
  NotificationType,
  { bg: string; icon: ReactNode; border: string }
> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    border: 'border-s-emerald-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    border: 'border-s-red-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
    border: 'border-s-primary-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    border: 'border-s-amber-500',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

type ReactNode = import('react').ReactNode;

const positionClasses: Record<string, string> = {
  'top-right': 'top-4 end-4',
  'top-left': 'top-4 start-4',
  'bottom-right': 'bottom-4 end-4',
  'bottom-left': 'bottom-4 start-4',
};

function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
}) {
  const config = typeConfig[notification.type];
  const duration = notification.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [notification.id, duration, onDismiss]);

  const progressVariants = {
    initial: { scaleX: 1 },
    animate: { scaleX: 0, transition: { duration: duration / 1000, ease: 'linear' } },
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-xl border ${config.bg} ${config.border} shadow-lg p-4 min-w-[320px] max-w-[420px]`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5">{config.icon}</span>
        <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {notification.message}
        </p>
        <button
          onClick={() => onDismiss(notification.id)}
          className="shrink-0 p-0.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-0.5 origin-start">
        <motion.div
          className="h-full bg-current opacity-30"
          variants={progressVariants}
          initial="initial"
          animate="animate"
        />
      </div>
    </motion.div>
  );
}

function NotificationContainer({
  notifications,
  onDismiss,
  position = 'top-right',
  className = '',
  suppressed = false,
}: NotificationProps & { suppressed?: boolean }) {
  return (
    <div
      data-notification-container=""
      className={`fixed z-[100] flex flex-col gap-2 ${positionClasses[position]} ${className} ${
        // Prayer Pause (Phase 5): while the pause overlay is up, notifications
        // stay mounted (state and expiry timers untouched) but are invisible
        // and non-interactive. Never raised above the overlay via z-index.
        suppressed ? 'invisible pointer-events-none' : ''
      }`}
      aria-hidden={suppressed || undefined}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => (
          <NotificationToast key={n.id} notification={n} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function useNotifications() {
  const dismiss = useCallback(() => {}, []);
  return { notifications: [] as NotificationItem[], dismiss };
}

export { NotificationContainer, NotificationToast, useNotifications };
export type { NotificationProps, NotificationItem, NotificationType };
