import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePomodoroStore } from '@/store/usePomodoroStore';
import { useNotesStore } from '@/store/useNotesStore';
import { useStatsStore } from '@/store/useStatsStore';
import { useFileStorage } from '@/hooks/useFileStorage';
import {
  Trophy,
  CheckSquare,
  Brain,
  Timer,
  StickyNote,
  FolderOpen,
  Sparkles,
} from 'lucide-react';

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

  const flashcardsCount = useMemo(() => flashcards.length, [flashcards]);

  const totalAchievements = completedTasks + completedSessions + meaningfulNotes + files.length + flashcardsCount + cardsReviewed + quizzesCompleted;

  const metrics: {
    icon: typeof Trophy;
    value: number;
    label: string;
    accent: string;
    accentDark: string;
    iconColor: string;
  }[] = [
    {
      icon: CheckSquare,
      value: completedTasks,
      label: 'مهمة مكتملة',
      accent: 'bg-emerald-50',
      accentDark: 'dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600',
    },
    {
      icon: Brain,
      value: cardsReviewed,
      label: 'بطاقة تمت مراجعتها',
      accent: 'bg-violet-50',
      accentDark: 'dark:bg-violet-900/30',
      iconColor: 'text-violet-600',
    },
    {
      icon: Timer,
      value: completedSessions,
      label: 'جلسة بومودورو',
      accent: 'bg-blue-50',
      accentDark: 'dark:bg-blue-900/30',
      iconColor: 'text-blue-600',
    },
    {
      icon: StickyNote,
      value: meaningfulNotes,
      label: 'ملاحظة',
      accent: 'bg-amber-50',
      accentDark: 'dark:bg-amber-900/30',
      iconColor: 'text-amber-600',
    },
    {
      icon: FolderOpen,
      value: files.length,
      label: 'ملف محفوظ',
      accent: 'bg-sky-50',
      accentDark: 'dark:bg-sky-900/30',
      iconColor: 'text-sky-600',
    },
    {
      icon: Sparkles,
      value: quizzesCompleted,
      label: 'اختبار مكتمل',
      accent: 'bg-rose-50',
      accentDark: 'dark:bg-rose-900/30',
      iconColor: 'text-rose-600',
    },
  ];

  const hasAny = totalAchievements > 0;

  const motivationalMessage = totalAchievements >= 100
    ? 'ممتاز! وصلت إلى 100 إنجاز!'
    : 'استمر، فإنجازاتك تزيد يومًا بعد يوم.';

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
            {'لسه ما بدأت إنجازاتك'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[220px]">
            {'ابدأ باستخدام أدوات مورفن وسجل أول إنجاز لك.'}
          </p>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {metrics.map((m) => (
              <div
                key={m.label}
                className={`flex flex-col items-center justify-center rounded-2xl ${m.accent} ${m.accentDark} px-3 py-4 transition-all`}
              >
                <m.icon className={`w-5 h-5 ${m.iconColor} mb-2`} strokeWidth={1.8} />
                <span className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                  {m.value}
                </span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1 text-center leading-tight">
                  {m.label}
                </span>
              </div>
            ))}
          </div>

          {/* Motivational Message */}
          <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-4 py-3">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              {motivationalMessage}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
