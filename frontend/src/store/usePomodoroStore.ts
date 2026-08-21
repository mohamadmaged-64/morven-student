import { create } from 'zustand';

export type PomodoroMode = 'focus' | 'break' | 'longBreak';

export interface PomodoroSettings {
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

interface PomodoroSnapshot {
  mode: PomodoroMode;
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  currentSession: number;
  completedSessions: number;
  totalFocusSeconds: number;
  settings: PomodoroSettings;
  endTimestamp: number | null;
}

interface PomodoroStore extends PomodoroSnapshot {
  completedMessage: 'break' | 'focus' | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  setMode: (mode: PomodoroMode) => void;
  setSettings: (settings: PomodoroSettings) => void;
}

const STORAGE_KEY = 'morven-pomodoro';
const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
};

const durationFor = (mode: PomodoroMode, settings: PomodoroSettings) => {
  switch (mode) {
    case 'focus': return settings.focusDuration * 60;
    case 'break': return settings.breakDuration * 60;
    case 'longBreak': return settings.longBreakDuration * 60;
  }
};

const loadSnapshot = (): PomodoroSnapshot => {
  const fallback: PomodoroSnapshot = {
    mode: 'focus', timeRemaining: DEFAULT_POMODORO_SETTINGS.focusDuration * 60,
    isRunning: false, isPaused: false, currentSession: 0, completedSessions: 0,
    totalFocusSeconds: 0, settings: DEFAULT_POMODORO_SETTINGS, endTimestamp: null,
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<PomodoroSnapshot>;
    const settings = { ...DEFAULT_POMODORO_SETTINGS, ...parsed.settings };
    const mode = parsed.mode === 'break' || parsed.mode === 'longBreak' ? parsed.mode : 'focus';
    const endTimestamp = typeof parsed.endTimestamp === 'number' ? parsed.endTimestamp : null;
    const isRunning = Boolean(parsed.isRunning) && endTimestamp !== null;
    return {
      ...fallback,
      ...parsed,
      mode,
      settings,
      timeRemaining: isRunning ? Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000)) : Math.max(0, Number(parsed.timeRemaining) || durationFor(mode, settings)),
      isRunning,
      isPaused: Boolean(parsed.isPaused),
      endTimestamp,
    };
  } catch {
    return fallback;
  }
};

const saveSnapshot = (state: PomodoroSnapshot) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
};

const requestNotificationPermission = () => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
};

const playNotificationSound = () => {
  try {
    const context = new AudioContext();

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gain.gain.setValueAtTime(0.3, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      context.currentTime + 0.5
    );

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);

    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // Audio is optional
  }
};

const notifyCompletion = (next: 'break' | 'focus') => {
  playNotificationSound();
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('انتهى الوقت!', { body: next === 'break' ? 'وقت الاستراحة' : 'وقت التركيز', icon: '🍅' });
  }
};

const initialSnapshot = loadSnapshot();

export const usePomodoroStore = create<PomodoroStore>((set, get) => {
  const persist = (next: PomodoroSnapshot) => saveSnapshot(next);
  const update = (
  next: PomodoroSnapshot,
  completedMessage: 'break' | 'focus' | null = null
) => {
  persist(next);

  set({
    ...next,
    completedMessage,
  });
};
  const finish = () => {
    const state = get();
    const isFocus = state.mode === 'focus';
    const reachedLongBreak = isFocus && state.currentSession + 1 >= state.settings.sessionsUntilLongBreak;
    const nextMode: PomodoroMode = isFocus ? (reachedLongBreak ? 'longBreak' : 'break') : 'focus';
    const next: PomodoroSnapshot = {
      ...state,
      mode: nextMode,
      timeRemaining: durationFor(nextMode, state.settings),
      isRunning: false,
      isPaused: false,
      endTimestamp: null,
      currentSession: isFocus ? (reachedLongBreak ? 0 : state.currentSession + 1) : state.currentSession,
      completedSessions: isFocus ? state.completedSessions + 1 : state.completedSessions,
      totalFocusSeconds: isFocus ? state.totalFocusSeconds + state.settings.focusDuration * 60 : state.totalFocusSeconds,
    };
    update(next, isFocus ? 'break' : 'focus');
    notifyCompletion(isFocus ? 'break' : 'focus');
  };

  return {
    ...initialSnapshot,
    completedMessage: null,
    start: () => {
      const state = get();
      if (state.isRunning) return;
      requestNotificationPermission();
      const next: PomodoroSnapshot = { ...state, isRunning: true, isPaused: false, endTimestamp: Date.now() + state.timeRemaining * 1000 };
      update(next);
    },
    pause: () => {
      const state = get();
      if (!state.isRunning) return;
      const remaining = state.endTimestamp ? Math.max(0, Math.ceil((state.endTimestamp - Date.now()) / 1000)) : state.timeRemaining;
      if (remaining === 0) { finish(); return; }
      const next: PomodoroSnapshot = { ...state, timeRemaining: remaining, isRunning: false, isPaused: true, endTimestamp: null };
      update(next);
    },
    resume: () => get().start(),
    reset: () => {
      const state = get();
      const next: PomodoroSnapshot = { ...state, timeRemaining: durationFor(state.mode, state.settings), isRunning: false, isPaused: false, endTimestamp: null };
      update(next);
    },
    skip: () => finish(),
    tick: () => {
      const state = get();
      if (!state.isRunning || !state.endTimestamp) return;
      const remaining = Math.max(0, Math.ceil((state.endTimestamp - Date.now()) / 1000));
      if (remaining === 0) { finish(); return; }
      if (remaining !== state.timeRemaining) {
        const next: PomodoroSnapshot = { ...state, timeRemaining: remaining };
        set(next);
      }
    },
    setMode: (mode) => {
      const state = get();
      if (state.isRunning) return;
      const next: PomodoroSnapshot = { ...state, mode, timeRemaining: durationFor(mode, state.settings), isPaused: false, endTimestamp: null };
      update(next);
    },
    setSettings: (settings) => {
      const state = get();
      const next: PomodoroSnapshot = state.isRunning ? { ...state, settings } : { ...state, settings, timeRemaining: durationFor(state.mode, settings), isPaused: false, endTimestamp: null };
      update(next);
    },
  };
});
