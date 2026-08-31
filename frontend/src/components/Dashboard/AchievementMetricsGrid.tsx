import {
  ACHIEVEMENT_METRICS,
  computeAchievementTotal,
  achievementMotivationalMessage,
  type AchievementMetricCounts,
} from './achievementMetrics';
import { Sparkles } from 'lucide-react';

interface Props {
  counts: AchievementMetricCounts;
  total?: number;
  showMilestoneMessage?: boolean;
  /** Renders an empty-state block when there are no achievements yet. */
  emptyLabel?: string;
}

/**
 * Presentational metrics grid + motivational message shared by the dashboard
 * achievements panel and the public profile page, so both reflect the same
 * achievement counter semantics.
 */
export default function AchievementMetricsGrid({
  counts,
  total,
  showMilestoneMessage = true,
  emptyLabel,
}: Props) {
  const resolvedTotal = total ?? computeAchievementTotal(counts);
  const hasAny = resolvedTotal > 0;

  if (!hasAny) {
    if (emptyLabel) {
      return (
        <div className="flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-dark-surface px-4 py-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{emptyLabel}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="w-full flex flex-col">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {ACHIEVEMENT_METRICS.map((m) => (
          <div
            key={m.label}
            className={`flex flex-col items-center justify-center rounded-2xl ${m.accent} ${m.accentDark} px-3 py-4 transition-all`}
          >
            <m.icon className={`w-5 h-5 ${m.iconColor} mb-2`} strokeWidth={1.8} />
            <span className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
              {counts[m.key]}
            </span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1 text-center leading-tight">
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {showMilestoneMessage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-4 py-3">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {achievementMotivationalMessage(resolvedTotal)}
          </p>
        </div>
      )}
    </div>
  );
}
