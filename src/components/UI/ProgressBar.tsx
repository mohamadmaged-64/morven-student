import { motion } from 'framer-motion';

type ProgressBarColor = 'primary' | 'success' | 'warning' | 'danger' | 'gradient';

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: ProgressBarColor;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
};

const barColors: Record<ProgressBarColor, string> = {
  primary: 'bg-primary-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  gradient: 'bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-400',
};

const barSizes = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const labelSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  label,
  className = '',
  animated = true,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          <span className={`${labelSizes[size]} font-medium text-gray-600 dark:text-gray-400`}>
            {label || 'Progress'}
          </span>
          <span className={`${labelSizes[size]} font-semibold text-gray-800 dark:text-gray-200`}>
            {Math.round(percent)}%
          </span>
        </div>
      )}

      <div
        className={`w-full ${barSizes[size]} rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <motion.div
          className={`h-full rounded-full ${barColors[color]}`}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percent}%` }}
          transition={animated ? { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } : { duration: 0 }}
        />
      </div>
    </div>
  );
}

export { ProgressBar };
export type { ProgressBarProps, ProgressBarColor };
