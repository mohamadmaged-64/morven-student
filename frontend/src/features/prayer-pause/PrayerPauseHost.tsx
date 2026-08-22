/**
 * Global host for the Prayer Pause feature.
 *
 * Mounted once beside the other global hosts (outside routes and layout).
 * Boots the Phase 3 scheduler singleton and renders the full-screen overlay,
 * which appears only when the store reports ACTIVE or RETURNING.
 */

import { useEffect } from 'react';

import { startPrayerScheduler, getSchedulerDebugState } from './prayerScheduler';
import { PrayerPauseOverlay } from './PrayerPauseOverlay';

export function PrayerPauseHost() {
  useEffect(() => {
    startPrayerScheduler();

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[prayer-pause] scheduler state', getSchedulerDebugState());
    }

    return () => {
      // Deliberately NOT stopping the scheduler on unmount: like the app's
      // other global hosts it must live for the whole page lifetime. StrictMode
      // double-mounts are harmless because startPrayerScheduler() is idempotent.
    };
  }, []);

  return <PrayerPauseOverlay />;
}
