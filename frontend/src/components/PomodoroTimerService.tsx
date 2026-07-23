import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePomodoroStore } from '@/store/usePomodoroStore';

const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

/** Keeps the single application-wide Pomodoro clock alive independently of tool pages. */
export function PomodoroTimerService() {
  const { t } = useTranslation();
  const tick = usePomodoroStore((s) => s.tick);
  const isRunning = usePomodoroStore((s) => s.isRunning);
  const timeRemaining = usePomodoroStore((s) => s.timeRemaining);
  const completedMessage = usePomodoroStore((s) => s.completedMessage);

  useEffect(() => {
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    if (isRunning) document.title = `${formatTime(timeRemaining)} | Morven for Student`;
    else if (completedMessage) document.title = `${t(completedMessage === 'break' ? 'pomodoro.breakTime' : 'pomodoro.focusTime')}! | Morven for Student`;
    else document.title = 'Morven For Student';
  }, [completedMessage, isRunning, t, timeRemaining]);

  return null;
}
