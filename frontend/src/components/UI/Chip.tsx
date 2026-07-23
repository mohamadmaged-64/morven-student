import { motion } from 'framer-motion';

type ChipVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

type ChipProps = {
  label: string;
  variant?: ChipVariant;
  onRemove?: () => void;
  disabled?: boolean;
  icon?: import('react').ReactNode;
  className?: string;
};

const variantClasses: Record<ChipVariant, string> = {
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border-primary-200 dark:border-primary-800',
  secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

function Chip({
  label,
  variant = 'secondary',
  onRemove,
  disabled = false,
  icon,
  className = '',
}: ChipProps) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border',
        variantClasses[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      ].join(' ')}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate max-w-[150px]">{label}</span>
      {onRemove && !disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={[
            'shrink-0 -me-1 p-0.5 rounded-full transition-colors duration-150',
            'hover:bg-black/10 dark:hover:bg-white/10',
          ].join(' ')}
          aria-label={`Remove ${label}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </motion.span>
  );
}

export { Chip };
export type { ChipProps, ChipVariant };
