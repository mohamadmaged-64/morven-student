import { useEffect, useState } from 'react';
import { getAdhkarPeriod, type AdhkarPeriod } from '@/pages/tools/GeneralTools/Adhkar/adhkar';

export function getNextPeriodBoundary(from: Date): Date {
  const next = new Date(from);
  const hour = from.getHours();
  if (hour < 2) {
    next.setHours(2, 0, 0, 0);
  } else if (hour < 14) {
    next.setHours(14, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(2, 0, 0, 0);
  }
  return next;
}

/**
 * Tracks the current Morning/Evening adhkar period based on the local device
 * clock. Evaluated on mount (so refresh/reopen always picks the right period)
 * and re-scheduled to wake up just past the next 02:00 / 14:00 boundary, so an
 * open app switches category content automatically. Every consumer uses the
 * exact same logic, so the tool hero and the displayed category stay in sync.
 */
export function useDayPeriod(): AdhkarPeriod {
  const [period, setPeriod] = useState(() => getAdhkarPeriod(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const now = new Date();
      setPeriod(getAdhkarPeriod(now));
      const boundary = getNextPeriodBoundary(now);
      const delay = Math.min(
        Math.max(boundary.getTime() - now.getTime() + 1000, 1000),
        2_147_483_647,
      );
      timer = setTimeout(schedule, delay);
    };

    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return period;
}