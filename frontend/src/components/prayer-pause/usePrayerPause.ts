/**
 * React interface to the Prayer Pause engine.
 *
 * All values are derived from the Zustand store plus a light local tick that
 * runs ONLY while a pause is in progress (active/returning). Nothing here is
 * persisted; `remainingMs` is always recomputed from Date.now() so background
 * throttling, refreshes, and clock changes can never show a stale countdown.
 */

import { useEffect, useState } from 'react';

import { usePrayerPauseStore } from './prayerPauseStore';
import type { PrayerPauseStatus } from './prayerPauseStore';
import type { PrayerId } from './prayerTimes';

export interface UsePrayerPauseResult {
  status: PrayerPauseStatus;
  activePrayerId: PrayerId | null;
  activeWindowId: string | null;
  /** Absolute epoch ms of window bounds, or null when idle. */
  activeStart: number | null;
  activeEnd: number | null;
  /** Milliseconds left in the ACTIVE window (0 once ended/returning). */
  remainingMs: number;
  isActive: boolean;
  isReturning: boolean;
}

const TICK_MS = 250;

function useTickingNow(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), TICK_MS);

    // Background tabs throttle intervals: resync instantly on wake events.
    const resync = () => setNow(Date.now());
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, [enabled]);

  return now;
}

export function usePrayerPause(): UsePrayerPauseResult {
  const status = usePrayerPauseStore((s) => s.status);
  const activePrayerId = usePrayerPauseStore((s) => s.activePrayerId);
  const activeWindowId = usePrayerPauseStore((s) => s.activeWindowId);
  const activeStart = usePrayerPauseStore((s) => s.activeStart);
  const activeEnd = usePrayerPauseStore((s) => s.activeEnd);

  const now = useTickingNow(status !== 'normal');

  // Number.isFinite (not just !== null) so a malformed/legacy store value can
  // never propagate NaN into the countdown; the overlay renders 0 instead.
  const remainingMs =
    status === 'active' && activeEnd !== null && Number.isFinite(activeEnd)
      ? Math.max(0, activeEnd - now)
      : 0;

  return {
    status,
    activePrayerId,
    activeWindowId,
    activeStart,
    activeEnd,
    remainingMs,
    isActive: status === 'active',
    isReturning: status === 'returning',
  };
}
