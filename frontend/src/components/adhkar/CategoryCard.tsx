import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { ProgressBar } from '@/components/UI/ProgressBar';
import { ChevronLeft } from 'lucide-react';
import type { CategoryMeta } from '@/data/adhkar';

type CategoryCardProps = {
  meta: CategoryMeta;
  completed: number;
  total: number;
  onSelect: () => void;
};

function CategoryCard({ meta, completed, total, onSelect }: CategoryCardProps) {
  const Icon = meta.icon;
  const done = total > 0 && completed === total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card hoverable onClick={onSelect} className="h-full flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                done
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white">{meta.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {total} من الأذكار
              </p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" aria-hidden="true" />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {meta.description}
        </p>

        <div className="mt-auto space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              تم إنجاز {completed} من {total}
            </span>
            <span
              className={`font-semibold ${
                done
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {total > 0 ? Math.round((completed / total) * 100) : 0}%
            </span>
          </div>
          <ProgressBar
            value={completed}
            max={total}
            size="sm"
            color={done ? 'success' : 'primary'}
            animated={false}
          />
        </div>
      </Card>
    </motion.div>
  );
}

export { CategoryCard };
export type { CategoryCardProps };