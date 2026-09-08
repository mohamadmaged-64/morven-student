import { Link } from 'react-router-dom';
import { Trophy, Crown, Clock, Flame, UserMinus } from 'lucide-react';
import { Avatar } from '@/components/connect/Avatar';

export interface GroupMemberRowData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

type GroupMemberRowProps = {
  member: GroupMemberRowData;
  rank: number;
  totalSeconds: number;
  focusing: boolean;
  isSelf: boolean;
  canRemove: boolean;
  onRemove?: () => void;
};

const TOP_RANK_COLORS = {
  1: 'text-amber-500 dark:text-amber-400',
  2: 'text-slate-400 dark:text-slate-300',
  3: 'text-orange-600 dark:text-orange-400',
} as const;

const TOP_RANK_LABELS = {
  1: 'المركز الأول',
  2: 'المركز الثاني',
  3: 'المركز الثالث',
} as const;

function formatFocusTime(seconds: number): string {
  const hours = seconds / 3600;
  // The word "ساعة" is always fixed, regardless of the number of hours.
  if (Number.isInteger(hours)) return `${hours} ساعة`;
  return `${hours.toFixed(1)} ساعة`;
}

/**
 * The rank indicator. The top 3 use a single unified trophy/cup icon in gold,
 * silver, and bronze (no containers or medal circles, just the colored icon).
 * Every rank from 4 onward is shown as a plain number. All variants share the
 * same footprint so the rows stay aligned.
 */
function RankBadge({ rank }: { rank: number }) {
  const color = TOP_RANK_COLORS[rank as 1 | 2 | 3];
  if (color) {
    return (
      <span
        aria-label={TOP_RANK_LABELS[rank as 1 | 2 | 3]}
        className={`w-7 h-7 flex items-center justify-center shrink-0 ${color}`}
      >
        <Trophy className="w-5 h-5" />
      </span>
    );
  }
  return (
    <span
      aria-label={`الترتيب ${rank}`}
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-dark-surface border border-light-border dark:border-dark-border text-xs font-bold text-gray-500 dark:text-gray-400"
    >
      {rank}
    </span>
  );
}

/**
 * A single, reusable member row used consistently by every group.
 *
 * Layout (RTL, justify-between): left group has the rank badge on the RIGHT of
 * the avatar and the avatar on the RIGHT of the name, so the physical order is
 * [Name + Crown + "أنت" + Remove] [Avatar] [Rank badge]; right group on the
 * LEFT is [Focusing ICON] [hours badge].
 *
 * The Remove button sits next to the name on the left side (rather than at
 * the far-left edge of the row). There is deliberately NO standalone
 * online/offline indicator. The ONLY live badge is the compact Focusing icon
 * (online + Pomodoro running). Hours always show (including 0 ساعة). The word
 * "ساعة" is always fixed.
 */
export function GroupMemberRow({
  member: m,
  rank,
  totalSeconds,
  focusing,
  isSelf,
  canRemove,
  onRemove,
}: GroupMemberRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50/80 dark:bg-dark-surface/80 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
      {/* Rank badge first (renders on the RIGHT of the avatar in RTL), then
          avatar, then the name cluster (renders on the LEFT of the avatar) */}
      <div className="flex items-center gap-3 min-w-0">
        <RankBadge rank={rank} />
        <Avatar src={m.avatarUrl} name={m.displayName} size="sm" />
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/connect/profile/${m.username}`}
            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors truncate"
          >
            {m.displayName}
          </Link>
          {m.role === 'OWNER' && (
            <Crown className="w-3 h-3 text-primary-400 dark:text-primary-500 shrink-0" aria-label="المنشئ" />
          )}
          {isSelf && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium shrink-0">
              أنت
            </span>
          )}
          {canRemove && onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors shrink-0"
              title="إزالة العضو"
              aria-label="إزالة العضو"
            >
              <UserMinus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Badges (render on the LEFT in RTL). The Focusing icon comes first so it
          sits immediately to the RIGHT of the hours badge, closest to the name;
          hours is the leftmost element. */}
      <div className="flex items-center gap-2 shrink-0">
        {focusing && (
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 shrink-0"
            title="يركّز الآن"
            aria-label="يركّز الآن"
          >
            <Flame className="w-3.5 h-3.5" />
          </span>
        )}

        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-medium whitespace-nowrap"
          title="ساعات التركيز"
        >
          <Clock className="w-3 h-3" />
          {formatFocusTime(totalSeconds)}
        </span>
      </div>
    </div>
  );
}