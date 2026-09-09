import { create } from 'zustand';
import {
  fetchApprovedAdhkar,
  type OfficialApprovedDhikr,
} from '@/services/adhkarApi';
import type { Dhikr, DhikrCategory } from '@/data/adhkar';

interface AdhkarApprovedState {
  approved: OfficialApprovedDhikr[];
  load: () => Promise<void>;
}

// In-flight guard so overlapping calls share one request.
let inflight: Promise<void> | null = null;

/**
 * Holds the APPROVED user-submitted dhikr fetched from the backend.
 *
 * It is intentionally NOT persisted to localStorage and NOT merged into the
 * bundled `ADHKARS` dataset: the official offline content stays untouched.
 * Category rendering appends these after the official items, and the counter
 * store keyed by `sub-<id>` keeps incremented counts working for them.
 *
 * `approved` only changes when the fetched list actually differs, so opening a
 * category never triggers a pointless re-render.
 */
export const useAdhkarApprovedStore = create<AdhkarApprovedState>((set, get) => ({
  approved: [],
  load: () => {
    if (inflight) return inflight;
    inflight = fetchApprovedAdhkar()
      .then((approved) => {
        const current = get().approved;
        const changed =
          approved.length !== current.length ||
          approved.some((item, i) => item.id !== current[i]?.id);
        if (changed) set({ approved });
      })
      // Network/server failure: keep the bundled adhkar as-is. The next load
      // (e.g. after opening another category or a successful submit) retries.
      // load() must never reject — it's called fire-and-forget from the UI.
      .catch(() => {})
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
}));

/** Maps approved submissions into display-ready Dhikr objects for a category. */
export function getApprovedAdhkarForCategory(
  category: DhikrCategory,
  approved: OfficialApprovedDhikr[],
): Dhikr[] {
  return approved
    .filter((item) => item.categoryId === category)
    .map((item) => ({
      id: `sub-${item.id}`,
      category,
      title: item.title,
      text: item.text,
      repeatCount: 1,
      source: item.source || 'إضافة بتصديق إدارة الموقع',
    }));
}