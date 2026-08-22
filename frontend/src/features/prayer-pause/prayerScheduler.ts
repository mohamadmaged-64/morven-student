/**
 * Prayer Pause scheduler — the runtime engine.
 *
 * Pipeline on every evaluation:
 *   Date.now() -> Jerusalem date (Phase 2) -> prayer schedule -> state
 *
 * Guarantees:
 *  - Exactly ONE chained setTimeout exists at any moment (module singleton).
 *    While NORMAL the next timeout targets the next relevant event (window
 *    start); there is no permanent high-frequency interval.
 *  - Window semantics are half-open [start, end): ACTIVE at start, NORMAL at
 *    exactly end. Missed windows are never replayed because containment is
 *    recomputed from the real clock on every pass.
 *  - Side effects (Pomodoro pause, Quran stop) run at most once per windowId
 *    per browser runtime — re-evaluations from focus/visibility/online/late
 *    timers/clock changes can never duplicate them.
 *  - Every evaluation re-derives everything from Date.now(), so system clock
 *    changes self-correct: forward jumps skip expired windows, backward jumps
 *    into a still-valid window enter ACTIVE again.
 *  - Fully local: no network access anywhere on this path.
 */

import {
  getJerusalemDate,
  getPrayerTimesForDate,
  getWindowForPrayer,
  safeGetPrayerTimesForInstant,
  type PrayerId,
  type PrayerSchedule,
} from './prayerTimes';
import { WINDOW_MINUTES } from './config';
import { usePrayerPauseStore } from './prayerPauseStore';
import { usePomodoroStore } from '@/store/usePomodoroStore';
import { useQuranStore } from '@/store/quranStore';

/* ── Tuning constants ──────────────────────────────────────────────────── */

/**
 * Upper bound for a single scheduled delay. Not an interval: it is the chain
 * cap that keeps one timeout alive so rare wall-clock changes (which do not
 * necessarily fire pending timers) self-heal within minutes instead of only
 * at the next focus/visibility event.
 */
const RESYNC_CAP_MS = 5 * 60_000;

/**
 * RETURNING is a short controlled transition: the overlay calls
 * `returnToNormal()` when its handoff animation finishes; this fallback
 * completes the transition automatically if that signal never arrives.
 */
const RETURNING_FALLBACK_MS = 1_500;

/** Tiny epsilon past a boundary so timeouts never fire a millisecond early. */
const SCHEDULE_EPSILON_MS = 25;

/** Retry delay after a schedule computation failure (engine errors => no pause). */
const ERROR_RETRY_MS = 60_000;

/** Hard ceiling for setTimeout delays (browsers clamp >2^31-1 anyway). */
const MAX_TIMEOUT_MS = 0x7fffffff;

/* ── Runtime singletons ────────────────────────────────────────────────── */

/** The ONE scheduled timeout of the whole application. */
let scheduledTimeout: number | null = null;

/** WindowIds whose side effects already ran in this browser runtime. */
const sideEffectsExecuted = new Set<string>();

let listenersBound = false;
let started = false;

/* ── Internal helpers ──────────────────────────────────────────────────── */

interface ScheduleWindow {
  windowId: string;
  prayerId: PrayerId;
  /** Absolute epoch ms; half-open [start, end). */
  start: number;
  end: number;
}

function collectWindows(schedule: PrayerSchedule): ScheduleWindow[] {
  return schedule.prayers.map((timing) => {
    const window = getWindowForPrayer(timing);
    return {
      // Deterministic ID from the PRAYER's own Jerusalem day: 2026-08-22:fajr
      windowId: `${schedule.date.key}:${timing.id}`,
      prayerId: timing.id,
      start: window.start.getTime(),
      end: window.end.getTime(),
    };
  });
}

/** Jerusalem civil day shifted by N days, via public API only (no tz math). */
function shiftJerusalemDate(date: ReturnType<typeof getJerusalemDate>, days: number) {
  // Civil noon on the given Y/M/D is DST-safe in Asia/Hebron and maps back to
  // the same civil date through Intl regardless of the device timezone.
  const noon = new Date(date.year, date.month - 1, date.day + days, 12);
  return getJerusalemDate(noon);
}

/**
 * All windows that could contain `now` or be the next event:
 * yesterday's (clock-jump safety margin around midnight), today's, and
 * tomorrow's (post-Isha evening / pre-Fajr morning). Computation is cached
 * inside the engine's LRU, so this costs effectively nothing.
 */
function collectCandidateWindows(nowMs: number): ScheduleWindow[] {
  const today = getJerusalemDate(new Date(nowMs));
  const schedules = [
    getPrayerTimesForDate(shiftJerusalemDate(today, -1)),
    getPrayerTimesForDate(today),
    getPrayerTimesForDate(shiftJerusalemDate(today, 1)),
  ];
  return schedules.flatMap(collectWindows);
}

/* ── Side effects (deduplicated per window per browser runtime) ────────── */

/**
 * Pause the Pomodoro WITHOUT resetting, finishing, or resuming it, and
 * without touching completed-session statistics. The store's own `pause()`
 * delegates to `finish()` when remaining time is zero — this guard makes sure
 * we never trigger that path; an already-expired timer is left to its normal
 * tick completion instead.
 */
function pausePomodoroIfRunning(): void {
  const pomodoro = usePomodoroStore.getState();
  if (!pomodoro.isRunning) return;
  if (pomodoro.endTimestamp !== null && pomodoro.endTimestamp - Date.now() <= 0) return;
  pomodoro.pause();
}

/** Stop Quran audio only if something is actually playing; no teardown. */
function pauseQuranIfPlaying(): void {
  const quran = useQuranStore.getState();
  if (!quran.isPlaying) return;
  quran.pause();
}

function runEnterSideEffectsOnce(windowId: string): void {
  if (sideEffectsExecuted.has(windowId)) return;
  sideEffectsExecuted.add(windowId);
  pausePomodoroIfRunning();
  pauseQuranIfPlaying();
}

/* ── Timeout plumbing ──────────────────────────────────────────────────── */

function armTimeout(delayMs: number, onFire: () => void = evaluate): void {
  clearScheduledTimeout();
  const delay = Math.min(Math.max(Math.ceil(delayMs), 0), Math.min(RESYNC_CAP_MS, MAX_TIMEOUT_MS));
  scheduledTimeout = window.setTimeout(() => {
    scheduledTimeout = null;
    onFire();
  }, delay);
}

function clearScheduledTimeout(): void {
  if (scheduledTimeout !== null) {
    window.clearTimeout(scheduledTimeout);
    scheduledTimeout = null;
  }
}

function delayUntil(targetMs: number, nowMs: number): number {
  return targetMs - nowMs + SCHEDULE_EPSILON_MS;
}

/** Next strictly-upcoming window start, or null (should not happen in practice). */
function findNextStart(windows: ScheduleWindow[], nowMs: number): number | null {
  let next: number | null = null;
  for (const w of windows) {
    if (w.start > nowMs && (next === null || w.start < next)) next = w.start;
  }
  return next;
}

/* ── Core evaluation ───────────────────────────────────────────────────── */

/**
 * Derive the true current state from the real clock and act on it. Safe to
 * call as often as desired (focus storms, late timers, clock changes):
 * transitions are idempotent and side effects deduplicated by windowId.
 */
export function evaluate(): void {
  const nowMs = Date.now();
  const store = usePrayerPauseStore.getState();

  let windows: ScheduleWindow[];
  try {
    windows = collectCandidateWindows(nowMs);
  } catch {
    // Engine failure must degrade to "no pause", never crash the app.
    // Keep an already-ACTIVE window only while its previously computed bounds
    // still hold; otherwise stay/become normal and retry shortly.
    if (
      store.status === 'active' &&
      store.activeStart !== null &&
      store.activeEnd !== null &&
      nowMs >= store.activeStart &&
      nowMs < store.activeEnd
    ) {
      store.setNow(nowMs);
      armTimeout(delayUntil(store.activeEnd, nowMs));
    } else {
      armTimeout(ERROR_RETRY_MS);
    }
    return;
  }

  // Containment against the half-open [start, end) windows.
  const current = windows.find((w) => nowMs >= w.start && nowMs < w.end);

  if (current) {
    runEnterSideEffectsOnce(current.windowId);
    store.enterActive({
      windowId: current.windowId,
      prayerId: current.prayerId,
      start: current.start,
      end: current.end,
    });
    armTimeout(delayUntil(current.end, nowMs));
    return;
  }

  if (store.status === 'active') {
    // The active window is gone: it either just ended (or was skipped by a
    // forward clock jump) or the clock jumped backward before its start —
    // either way RETURNING is the graceful exit from ACTIVE.
    store.beginReturning(nowMs);
    // Controlled transition fallback: completes RETURNING -> NORMAL directly,
    // without comparing wall clocks, so it works under any time jumps. The
    // overlay normally calls returnToNormal() before this fires.
    armTimeout(RETURNING_FALLBACK_MS, () => {
      if (usePrayerPauseStore.getState().status === 'returning') {
        usePrayerPauseStore.getState().returnToNormal();
      }
      evaluate();
    });
    return;
  }

  if (store.status === 'returning') {
    // The armed RETURNING fallback is still pending and owns the transition;
    // evaluation storms (focus/visibility) must not postpone it.
    if (scheduledTimeout === null) armTimeout(RETURNING_FALLBACK_MS);
    return;
  }

  // NORMAL: sleep until the next relevant event. Day rollover needs no special
  // case here — tomorrow's Fajr start IS the next event, and every firing
  // recomputes the Jerusalem day from scratch.
  const nextStart = findNextStart(windows, nowMs);
  if (nextStart !== null) {
    armTimeout(delayUntil(nextStart, nowMs));
  } else {
    // Unreachable with valid schedules (tomorrow's Fajr always qualifies);
    // kept as a bounded safety net rather than an infinite sleep.
    armTimeout(RESYNC_CAP_MS);
  }
}

/* ── Lifecycle ─────────────────────────────────────────────────────────── */

function handleReevaluationEvent(): void {
  evaluate();
}

function bindGlobalListeners(): void {
  if (listenersBound || typeof document === 'undefined') return;
  // Background tabs throttle timers: re-derive instantly when the app becomes
  // visible/focused/online again.
  document.addEventListener('visibilitychange', handleReevaluationEvent);
  window.addEventListener('focus', handleReevaluationEvent);
  window.addEventListener('online', handleReevaluationEvent);
  listenersBound = true;
}

export function unbindGlobalListeners(): void {
  if (!listenersBound) return;
  document.removeEventListener('visibilitychange', handleReevaluationEvent);
  window.removeEventListener('focus', handleReevaluationEvent);
  window.removeEventListener('online', handleReevaluationEvent);
  listenersBound = false;
}

/**
 * Start the scheduler exactly once per page load. Idempotent: repeated calls
 * (StrictMode double-mount, HMR) never create competing timeouts.
 */
export function startPrayerScheduler(): void {
  bindGlobalListeners();
  if (started) {
    // Already running — still re-evaluate once so a long-idle module picks up
    // the current clock immediately.
    evaluate();
    return;
  }
  started = true;
  evaluate();
}

/** Test/HMR escape hatch: tears everything down so start() can run fresh. */
export function stopPrayerScheduler(): void {
  clearScheduledTimeout();
  unbindGlobalListeners();
  started = false;
}

/** Introspection for verification/tests: confirms the single-timeout invariant. */
export function getSchedulerDebugState(): {
  hasScheduledTimeout: boolean;
  listenersBound: boolean;
  started: boolean;
  sideEffectCount: number;
} {
  return {
    hasScheduledTimeout: scheduledTimeout !== null,
    listenersBound,
    started,
    sideEffectCount: sideEffectsExecuted.size,
  };
}
