/**
 * Prayer Pause state machine store.
 *
 * Holds ONLY the derived runtime state of the pause engine:
 *   normal -> active -> returning -> normal
 *
 * Correctness contract: every value here is (re)derived from Date.now() plus
 * the Phase 2 prayer schedule by the scheduler. Nothing in this store is ever
 * persisted to localStorage — a fresh page load must always re-derive the
 * true current state from the clock, never replay a stale one.
 */

import { create } from 'zustand';

import { PRAYER_IDS } from './prayerTimes';
import type { PrayerId } from './prayerTimes';

export type PrayerPauseStatus = 'normal' | 'active' | 'returning';

/** Payload required to enter the ACTIVE state for one prayer window. */
export interface EnterActivePayload {
  /** Deterministic `YYYY-MM-DD:prayerId` identifier of the window. */
  windowId: string;
  prayerId: PrayerId;
  /** Absolute epoch ms of the prayer start. */
  start: number;
  /** Absolute epoch ms of the window end (start + WINDOW_MINUTES). */
  end: number;
}

interface PrayerPauseState {
  status: PrayerPauseStatus;
  activePrayerId: PrayerId | null;
  activeWindowId: string | null;
  activeStart: number | null;
  activeEnd: number | null;
  /** Last evaluation instant (Date.now() at scheduler tick time). */
  now: number;

  /**
   * Transition into ACTIVE. Callable from any status so backward clock jumps
   * can re-enter a still-valid window; side-effect deduplication is handled
   * by the scheduler, not here.
   */
  enterActive: (payload: EnterActivePayload) => void;

  /**
   * ACTIVE -> RETURNING. Keeps the window context so the overlay can
   * play its exit animation before signalling NORMAL.
   */
  beginReturning: (now: number) => void;

  /**
   * RETURNING -> NORMAL. The public signal the future overlay calls when its
   * exit animation completes; the scheduler also uses it as an automatic
   * fallback so the app can never get stuck in RETURNING without UI.
   */
  returnToNormal: () => void;

  /** Refresh the evaluation timestamp without changing status. */
  setNow: (now: number) => void;
}

const initialStatus: PrayerPauseStatus = 'normal';

export const usePrayerPauseStore = create<PrayerPauseState>((set, get) => ({
  status: initialStatus,
  activePrayerId: null,
  activeWindowId: null,
  activeStart: null,
  activeEnd: null,
  now: Date.now(),

  enterActive: ({ windowId, prayerId, start, end }) => {
    // Runtime boundary guard. TypeScript enforces EnterActivePayload at
    // compile time, but JS callers (devtools experiments, stale HMR code)
    // bypass it entirely — e.g. a `{ startMs, endMs }` shape would silently
    // store `undefined` bounds and later crash the overlay with
    // "RangeError: Invalid time value". A malformed payload must never
    // poison the state machine: reject it and keep the current status.
    if (
      typeof windowId !== 'string' ||
      windowId.length === 0 ||
      !(PRAYER_IDS as readonly string[]).includes(prayerId) ||
      typeof start !== 'number' ||
      !Number.isFinite(start) ||
      typeof end !== 'number' ||
      !Number.isFinite(end) ||
      end <= start
    ) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          '[prayer-pause] enterActive rejected an invalid payload:',
          { windowId, prayerId, start, end },
        );
      }
      return;
    }
    const state = get();
    if (
      state.status === 'active' &&
      state.activeWindowId === windowId &&
      state.activeStart === start &&
      state.activeEnd === end
    ) {
      // Already ACTIVE for this exact window — idempotent no-op.
      set({ now: Date.now() });
      return;
    }
    set({
      status: 'active',
      activePrayerId: prayerId,
      activeWindowId: windowId,
      activeStart: start,
      activeEnd: end,
      now: Date.now(),
    });
  },

  beginReturning: (now) => {
    const state = get();
    if (state.status !== 'active') return;
    set({
      status: 'returning',
      now,
    });
  },

  returnToNormal: () => {
    const state = get();
    if (state.status !== 'returning') return;
    set({
      status: 'normal',
      activePrayerId: null,
      activeWindowId: null,
      activeStart: null,
      activeEnd: null,
      now: Date.now(),
    });
  },

  setNow: (now) => {
    if (get().now !== now) set({ now });
  },
}));

/** Synchronous snapshot helpers for non-React consumers (e.g. title guard). */
export function getPrayerPauseStatus(): PrayerPauseStatus {
  return usePrayerPauseStore.getState().status;
}
