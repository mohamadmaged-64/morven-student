import { NotificationContainer } from '@/components/UI/Notification';
import { useAppStore } from '@/store/useAppStore';
import { usePrayerPauseStore } from '@/components/prayer-pause';

export function NotificationHost() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);
  // Prayer Pause (Phase 5): suppress notification visibility while the
  // pause overlay owns the screen. Boolean selector — re-renders only on
  // status transitions, never on countdown ticks.
  const suppressed = usePrayerPauseStore((s) => s.status !== 'normal');

  return (
    <NotificationContainer
      notifications={notifications}
      onDismiss={removeNotification}
      suppressed={suppressed}
    />
  );
}
