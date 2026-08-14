import { NotificationContainer } from '@/components/UI/Notification';
import { useAppStore } from '@/store/useAppStore';

export function NotificationHost() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);

  return (
    <NotificationContainer
      notifications={notifications}
      onDismiss={removeNotification}
    />
  );
}
