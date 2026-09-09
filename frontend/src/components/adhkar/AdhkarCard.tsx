import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import { Tooltip } from '@/components/UI/Tooltip';
import { CircleCheck, RotateCcw, Hand, Pencil, Trash2 } from 'lucide-react';
import type { Dhikr } from '@/data/adhkar';

type AdhkarCardProps = {
  dhikr: Dhikr;
  count: number;
  onIncrement: () => void;
  onReset: () => void;
  canManage?: boolean;
  onEdit?: (dhikr: Dhikr) => void;
  onDelete?: (dhikr: Dhikr) => void;
};

function AdhkarCard({
  dhikr,
  count,
  onIncrement,
  onReset,
  canManage = false,
  onEdit,
  onDelete,
}: AdhkarCardProps) {
  const complete = count >= dhikr.repeatCount;
  const counterLabel = `${count} / ${dhikr.repeatCount}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        padding="md"
        data-testid={`adhkar-${dhikr.id}`}
        className={`h-full flex flex-col gap-4 rounded-2xl border transition-colors duration-300 ${
          complete
            ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/40 dark:bg-emerald-900/10'
            : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" size="sm">
              التكرار: {dhikr.repeatCount}
            </Badge>
            {complete && (
              <Badge variant="success" size="sm" icon={<CircleCheck className="w-3 h-3" />}>
                تمّ
              </Badge>
            )}
          </div>
          {!complete && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
              اضغط للتسبيح
            </span>
          )}
        </div>

        {/* Main counter zone — clicking increments (keyboard friendly) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`${dhikr.title ?? 'الذكر'}، تم العد ${count} من ${dhikr.repeatCount}`}
          onClick={onIncrement}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onIncrement();
            }
          }}
          className={`flex flex-col items-center gap-4 rounded-xl px-4 py-5 text-center cursor-pointer select-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
            complete
              ? 'bg-emerald-100/60 dark:bg-emerald-900/20'
              : 'bg-gray-50 dark:bg-dark-surface hover:bg-primary-50 dark:hover:bg-primary-900/20'
          }`}
        >
          {dhikr.title && (
            <h3
              className={`text-sm font-bold ${
                complete
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-primary-700 dark:text-primary-400'
              }`}
            >
              {dhikr.title}
            </h3>
          )}

          <p
            dir="rtl"
            className={`font-semibold leading-[2.2] text-gray-800 dark:text-gray-100 ${
              dhikr.text.length > 80
                ? 'text-lg sm:text-xl'
                : 'text-xl sm:text-2xl'
            }`}
          >
            {dhikr.text}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-2xl font-black tabular-nums ${
                complete
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-800 dark:text-white'
              }`}
            >
              {counterLabel}
            </span>
            {!complete && (
              <Hand className="w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Footer: source + reset (plus admin edit/delete whenever allowed) */}
        <div className="pt-3 border-t border-light-border dark:border-dark-border flex items-end justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 min-w-0">
            <p>
              <span className="font-semibold text-gray-600 dark:text-gray-300">المصدر: </span>
              {dhikr.source}
              {dhikr.reference && <span className="text-gray-400 dark:text-gray-500"> • {dhikr.reference}</span>}
            </p>
            {dhikr.note && <p className="text-gray-400 dark:text-gray-500">{dhikr.note}</p>}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canManage && onEdit && (
              <Tooltip content="تعديل الذكر">
                <button
                  type="button"
                  onClick={() => onEdit(dhikr)}
                  aria-label={`تعديل ذكر ${dhikr.title ?? 'الذكر'}`}
                  className="p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:text-primary-400 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            {canManage && onDelete && (
              <Tooltip content="حذف الذكر">
                <button
                  type="button"
                  onClick={() => onDelete(dhikr)}
                  aria-label={`حذف ذكر ${dhikr.title ?? 'الذكر'}`}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="إعادة تعيين العداد">
              <button
                type="button"
                onClick={onReset}
                aria-label={`إعادة تعيين عداد ${dhikr.title ?? 'الذكر'}`}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export { AdhkarCard };
export type { AdhkarCardProps };