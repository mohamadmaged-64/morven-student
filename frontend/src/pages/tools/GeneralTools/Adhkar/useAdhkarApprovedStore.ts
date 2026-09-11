import { create } from 'zustand';
import {
  fetchApprovedAdhkar,
  type OfficialApprovedDhikr,
  type OfficialDhikrEdit,
} from '@/pages/tools/GeneralTools/Adhkar/adhkarApi';
import type { Dhikr, DhikrCategory } from '@/pages/tools/GeneralTools/Adhkar/adhkar';

interface AdhkarApprovedState {
  approved: OfficialApprovedDhikr[];
  officialEdits: OfficialDhikrEdit[];
  officialDeletions: string[];
  load: () => Promise<void>;
}

// In-flight guard so overlapping calls share one request.
let inflight: Promise<void> | null = null;

/**
 * Holds the APPROVED user-submitted dhikr fetched from the backend, together
 * with the admin mutations applied over the bundled official adhkar
 * (overrides + tombstone deletions).
 *
 * It is intentionally NOT persisted to localStorage and NOT merged into the
 * bundled `ADHKARS` dataset: the official offline content stays untouched.
 * Category rendering appends the approved items after the official ones, and
 * applies the official mutations via `applyOfficialMutations`. The counter
 * store keyed by `sub-<id>` keeps incremented counts working for approved
 * items.
 *
 * The state only changes when a fetched value actually differs, so opening a
 * category never triggers a pointless re-render.
 */
export const useAdhkarApprovedStore = create<AdhkarApprovedState>((set, get) => ({
  approved: [],
  officialEdits: [],
  officialDeletions: [],
  load: () => {
    if (inflight) return inflight;
    inflight = fetchApprovedAdhkar()
      .then((result) => {
        const approved = result.adhkar ?? [];
        const officialEdits = result.officialEdits ?? [];
        const officialDeletions = result.officialDeletions ?? [];
        const current = get();
        const changed =
          approved.length !== current.approved.length ||
          approved.some((item, i) => item.id !== current.approved[i]?.id) ||
          officialEdits.length !== current.officialEdits.length ||
          officialEdits.some(
            (edit, i) =>
              edit.officialDhikrId !== current.officialEdits[i]?.officialDhikrId ||
              edit.title !== current.officialEdits[i]?.title ||
              edit.text !== current.officialEdits[i]?.text ||
              edit.source !== current.officialEdits[i]?.source,
          ) ||
          officialDeletions.length !== current.officialDeletions.length ||
          officialDeletions.some((id, i) => id !== current.officialDeletions[i]);
        if (changed) {
          set({ approved, officialEdits, officialDeletions });
        }
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

/**
 * Applies the admin mutations to an array of official adhkar: tombstone
 * deletions are filtered out and override edits (title/text/source) replace
 * the matching entry. Everything else — order, repetition count, references —
 * is preserved.
 */
export function applyOfficialMutations(
  dhikrs: Dhikr[],
  officialEdits: OfficialDhikrEdit[],
  officialDeletions: string[],
): Dhikr[] {
  const deleted = new Set(officialDeletions);
  const edits = new Map(officialEdits.map((e) => [e.officialDhikrId, e]));
  return dhikrs
    .filter((d) => !deleted.has(d.id))
    .map((d) => {
      const edit = edits.get(d.id);
      if (!edit) return d;
      return { ...d, title: edit.title, text: edit.text, source: edit.source };
    });
}

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