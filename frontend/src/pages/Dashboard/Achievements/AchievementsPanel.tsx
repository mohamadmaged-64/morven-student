import { useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePomodoroStore } from '@/pages/tools/GeneralTools/Pomodoro/usePomodoroStore';
import { useNotesStore } from '@/pages/tools/GeneralTools/Notes/useNotesStore';
import { useStatsStore } from '@/store/useStatsStore';
import { useFileStorage } from '@/hooks/useFileStorage';
import { syncAchievements } from '@/services/profileApi';
import { Trophy } from 'lucide-react';
import {
  computeAchievementTotal,
  type AchievementMetricCounts,
} from './achievementMetrics';
import AchievementMetricsGrid from './AchievementMetricsGrid';

export default function AchievementsPanel() {
  const tasks = useAppStore((s) => s.tasks);
  const flashcards = useAppStore((s) => s.flashcards);
  const completedSessions = usePomodoroStore((s) => s.completedSessions);
  const notes = useNotesStore((s) => s.notes);
  const { files } = useFileStorage();
  const cardsReviewed = useStatsStore((s) => s.cardsReviewed);
  const quizzesCompleted = useStatsStore((s) => s.quizzesCompleted);

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks],
  );

  const meaningfulNotes = useMemo(
    () => notes.filter((n) => n.title.trim() || n.content.trim()).length,
    [notes],
  );

  const counts: AchievementMetricCounts = {
    completedTasks,
    cardsReviewed,
    completedSessions,
    meaningfulNotes,
    files: files.length,
    flashcards: flashcards.length,
    quizzesCompleted,
  };

  const totalAchievements = computeAchievementTotal(counts);

  // Seed the server-side achievement counters from the dashboard data so the
  // user's public profile reflects the same achievements. Fire-and-forget.
  useEffect(() => {
    syncAchievements(counts).catch(() => {
      // ignore — syncing is best-effort
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAchievements]);

  const hasAny = totalAchievements > 0;

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute start-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
          <Trophy className="w-[18px] h-[18px] text-amber-600" strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 text-center tracking-tight">
          {'إنجازاتك'}
        </h2>
      </div>

      {!hasAny ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-amber-300 dark:text-amber-500" strokeWidth={1.4} />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
            {'لم تبدأ انجازاتك بعد'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[220px]">
            {'ابدأ باستخدام الأدوات وسجل أول إنجاز لك.'}
          </p>
        </div>
      ) : (
        <AchievementMetricsGrid counts={counts} total={totalAchievements} />
      )}
    </div>
  );
}
