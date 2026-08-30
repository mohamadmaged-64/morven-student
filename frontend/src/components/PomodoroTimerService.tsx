import { useEffect } from 'react';
import { usePomodoroStore } from '@/store/usePomodoroStore';
import { usePrayerPauseStore } from '@/features/prayer-pause';
import { useAuthStore } from '@/store/useAuthStore';
import { startCompletionPolling, stopCompletionPolling } from '@/services/connectPomodoro';

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** Keeps the single application-wide Pomodoro clock alive independently of tool pages. */
export function PomodoroTimerService() {
  const tick = usePomodoroStore((s) => s.tick);
  const isRunning = usePomodoroStore((s) => s.isRunning);
  const timeRemaining = usePomodoroStore((s) => s.timeRemaining);
  const completedMessage = usePomodoroStore((s) => s.completedMessage);
  // Prayer Pause (Phase 3): while a pause is active/returning the feature owns
  // the document title, so this service must not overwrite it.
  const prayerPauseStatus = usePrayerPauseStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  // Keep the Connect sync alive for the whole app session: it observes the
  // Pomodoro store and broadcasts the live focusing state to the user's groups
  // (plus submits completed sessions). This must run beyond the group page so
  // members see the Focusing indicator while the Pomodoro actually runs.
  useEffect(() => {
    if (!user) return;
    startCompletionPolling();
    return () => stopCompletionPolling();
  }, [user]);

  useEffect(() => {
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    if (prayerPauseStatus !== 'normal') return;
    if (isRunning) document.title = `${formatTime(timeRemaining)} | Morven for Student`;
    else if (completedMessage) document.title = `${completedMessage === 'break' ? 'وقت الراحة' : 'وقت التركيز'}! | Morven for Student`;
    else document.title = 'Morven For Student';
  }, [completedMessage, isRunning, timeRemaining, prayerPauseStatus]);

  return null;
}
