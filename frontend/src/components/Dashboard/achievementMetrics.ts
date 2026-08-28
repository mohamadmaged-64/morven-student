import {
  CheckSquare,
  Brain,
  Timer,
  StickyNote,
  FolderOpen,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface AchievementMetricCounts {
  completedTasks: number;
  cardsReviewed: number;
  completedSessions: number;
  meaningfulNotes: number;
  files: number;
  flashcards: number;
  quizzesCompleted: number;
}

// The 6 visible dashboard metrics (flashcards counts toward the total only).
export interface AchievementMetric {
  key: keyof AchievementMetricCounts;
  icon: LucideIcon;
  label: string;
  accent: string;
  accentDark: string;
  iconColor: string;
}

export const ACHIEVEMENT_METRICS: AchievementMetric[] = [
  {
    key: 'completedTasks',
    icon: CheckSquare,
    label: 'مهمة مكتملة',
    accent: 'bg-emerald-50',
    accentDark: 'dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'cardsReviewed',
    icon: Brain,
    label: 'بطاقة تمت مراجعتها',
    accent: 'bg-violet-50',
    accentDark: 'dark:bg-violet-900/30',
    iconColor: 'text-violet-600',
  },
  {
    key: 'completedSessions',
    icon: Timer,
    label: 'جلسة بومودورو',
    accent: 'bg-blue-50',
    accentDark: 'dark:bg-blue-900/30',
    iconColor: 'text-blue-600',
  },
  {
    key: 'meaningfulNotes',
    icon: StickyNote,
    label: 'ملاحظة',
    accent: 'bg-amber-50',
    accentDark: 'dark:bg-amber-900/30',
    iconColor: 'text-amber-600',
  },
  {
    key: 'files',
    icon: FolderOpen,
    label: 'ملف محفوظ',
    accent: 'bg-sky-50',
    accentDark: 'dark:bg-sky-900/30',
    iconColor: 'text-sky-600',
  },
  {
    key: 'quizzesCompleted',
    icon: Sparkles,
    label: 'اختبار مكتمل',
    accent: 'bg-rose-50',
    accentDark: 'dark:bg-rose-900/30',
    iconColor: 'text-rose-600',
  },
];

export function computeAchievementTotal(c: AchievementMetricCounts): number {
  return (
    c.completedTasks +
    c.cardsReviewed +
    c.completedSessions +
    c.meaningfulNotes +
    c.files +
    c.flashcards +
    c.quizzesCompleted
  );
}

export function achievementMotivationalMessage(total: number): string {
  return total >= 100
    ? 'ممتاز! وصلت إلى 100 إنجاز!'
    : 'استمر، فإنجازاتك تزيد يومًا بعد يوم.';
}
