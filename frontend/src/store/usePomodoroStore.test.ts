import { describe, expect, it, beforeEach } from 'vitest';
import { usePomodoroStore, type PomodoroTheme } from './usePomodoroStore';

const STORAGE_KEY = 'morven-pomodoro';

beforeEach(() => {
  localStorage.clear();
  // Reset the shared store singleton back to a clean baseline so tests are
  // order-independent.
  usePomodoroStore.setState({
    mode: 'focus',
    timeRemaining: 25 * 60,
    isRunning: false,
    isPaused: false,
    currentSession: 0,
    completedSessions: 0,
    totalFocusSeconds: 0,
    endTimestamp: null,
    settings: {
      focusDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsUntilLongBreak: 4,
      theme: 'classic' as PomodoroTheme,
    },
    completedMessage: null,
  });
});

describe('Pomodoro theme selection', () => {
  it('defaults to the "classic" theme when nothing is saved', () => {
    expect(usePomodoroStore.getState().settings.theme).toBe('classic');
  });

  it('persists each selectable theme to localStorage via setTheme', () => {
    for (const theme of ['digital', 'nature', 'classic'] as PomodoroTheme[]) {
      usePomodoroStore.getState().setTheme(theme);

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(saved.settings.theme).toBe(theme);
      expect(usePomodoroStore.getState().settings.theme).toBe(theme);
    }
  });
});

describe('Pomodoro theme is presentation-only', () => {
  it('switching themes while RUNNING preserves all timer state', () => {
    const endTimestamp = 9999999999000;
    usePomodoroStore.setState({
      isRunning: true,
      isPaused: false,
      mode: 'focus',
      currentSession: 3,
      completedSessions: 2,
      totalFocusSeconds: 6000,
      timeRemaining: 5 * 60 + 30,
      endTimestamp,
    });

    const before = usePomodoroStore.getState();

    // Switch through every theme; none may disturb the running timer.
    for (const theme of ['digital', 'nature', 'classic'] as PomodoroTheme[]) {
      usePomodoroStore.getState().setTheme(theme);
      const s = usePomodoroStore.getState();
      expect(s.isRunning).toBe(true);
      expect(s.isPaused).toBe(false);
      expect(s.mode).toBe('focus');
      expect(s.currentSession).toBe(3);
      expect(s.completedSessions).toBe(2);
      expect(s.totalFocusSeconds).toBe(6000);
      expect(s.timeRemaining).toBe(before.timeRemaining);
      expect(s.endTimestamp).toBe(endTimestamp);
      expect(s.settings.theme).toBe(theme);
    }
  });

  it('switching themes while PAUSED preserves paused state and exact remaining time', () => {
    usePomodoroStore.setState({
      isRunning: false,
      isPaused: true,
      mode: 'break',
      currentSession: 1,
      timeRemaining: 3 * 60 + 7,
      endTimestamp: null,
    });

    const before = usePomodoroStore.getState();

    usePomodoroStore.getState().setTheme('nature');
    const s = usePomodoroStore.getState();
    expect(s.isRunning).toBe(false);
    expect(s.isPaused).toBe(true);
    expect(s.mode).toBe('break');
    expect(s.timeRemaining).toBe(before.timeRemaining);
    expect(s.endTimestamp).toBeNull();
    expect(s.settings.theme).toBe('nature');
  });

  it('switching themes while paused does not reset the remaining time to full duration', () => {
    usePomodoroStore.setState({
      isRunning: false,
      isPaused: true,
      mode: 'focus',
      timeRemaining: 1 * 60 + 12, // deliberately not the full 25m
      endTimestamp: null,
    });

    usePomodoroStore.getState().setTheme('digital');
    const s = usePomodoroStore.getState();
    expect(s.timeRemaining).toBe(1 * 60 + 12);
    expect(s.isPaused).toBe(true);
  });
});
