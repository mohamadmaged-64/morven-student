/**
 * Formats a seconds value as clock text.
 *
 * Count Up may exceed one hour, so the display extends cleanly to HH:MM:SS the
 * moment the elapsed time reaches an hour; otherwise it stays MM:SS.
 */
export function formatClock(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Whether the clock text needs an hours group (>= 1 hour). */
export const hasClockHours = (totalSeconds: number): boolean => Math.floor(Math.max(0, totalSeconds) / 3600) > 0;