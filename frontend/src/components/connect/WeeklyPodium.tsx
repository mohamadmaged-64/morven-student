import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Avatar } from '@/components/connect/Avatar';
import type { WeeklyRankingEntry } from '@/services/groupApi';

type WeeklyPodiumProps = {
  ranking: WeeklyRankingEntry[];
};

const PLACE_LABELS: Record<number, string> = {
  1: 'المركز الأول',
  2: 'المركز الثاني',
  3: 'المركز الثالث',
};

const PLACE_MEDAL_CLASS = {
  1: 'bg-amber-300 text-amber-950 dark:bg-amber-400 dark:text-amber-950',
  2: 'bg-slate-300 text-slate-800 dark:bg-slate-500 dark:text-slate-100',
  3: 'bg-orange-300 text-orange-950 dark:bg-orange-600 dark:text-orange-50',
};

const RISER_CLASS = {
  1: 'h-16 bg-gradient-to-t from-amber-400/50 to-amber-300/25 dark:from-amber-500/40 dark:to-amber-400/15',
  2: 'h-11 bg-gradient-to-t from-slate-300/50 to-slate-200/25 dark:from-slate-500/35 dark:to-slate-400/15',
  3: 'h-9 bg-gradient-to-t from-orange-300/50 to-orange-200/25 dark:from-orange-700/35 dark:to-orange-500/15',
};

const AVATAR_SIZE = { 1: 'lg', 2: 'sm', 3: 'sm' } as const;

function formatWeeklyHours(seconds: number): string {
  const hours = seconds / 3600;
  if (Number.isInteger(hours)) return `${hours} ساعة`;
  return `${hours.toFixed(1)} ساعة`;
}

/**
 * The weekly Top-3 podium for a group. Physical layout from left to right is
 * [2nd | 1st | 3rd]. In an RTL container the DOM order is therefore [3rd, 1st,
 * 2nd]; the `data-place` attribute exposes the rank for CSS/tests. Missing
 * places render as muted placeholders so the podium keeps its shape.
 */
export function WeeklyPodium({ ranking }: WeeklyPodiumProps) {
  const top = ranking.slice(0, 3);
  const byRank = new Map(top.map((entry) => [entry.rank, entry]));
  const displayOrder: Array<1 | 2 | 3> = [3, 1, 2];

  return (
    <div className="flex items-end justify-center gap-3">
      {displayOrder.map((place) => {
        const entry = byRank.get(place);
        if (!entry) {
          return (
            <div key={place} data-place={place} data-empty="true" className="flex-1 flex flex-col items-center gap-1">
              <span
                aria-label={PLACE_LABELS[place]}
                className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${PLACE_MEDAL_CLASS[place]}`}
              >
                {place}
              </span>
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border" />
              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
              <div className={`mt-3 w-full rounded-t-xl ${RISER_CLASS[place]}`} />
            </div>
          );
        }

        const nameClass = place === 1 ? 'text-sm font-bold' : 'text-xs font-semibold';
        const avatarClass = place === 1 ? 'ring-2 ring-amber-400/70 ring-offset-2 ring-offset-white dark:ring-offset-dark-card rounded-2xl' : '';
        return (
          <div key={place} data-place={place} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span
              aria-label={PLACE_LABELS[place]}
              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shadow-sm ${PLACE_MEDAL_CLASS[place]}`}
            >
              {place}
            </span>
            <Avatar
              src={entry.avatarUrl}
              name={entry.displayName}
              size={AVATAR_SIZE[place]}
              className={avatarClass}
            />
            <Link
              to={`/connect/profile/${entry.username}`}
              className={`${nameClass} text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors truncate max-w-full px-1`}
            >
              {entry.displayName}
            </Link>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-medium whitespace-nowrap">
              <Clock className="w-3 h-3" />
              {formatWeeklyHours(entry.weeklySeconds)}
            </span>
            <div className={`mt-3 w-full rounded-t-xl ${RISER_CLASS[place]}`} />
          </div>
        );
      })}
    </div>
  );
}