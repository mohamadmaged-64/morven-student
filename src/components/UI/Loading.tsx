import { motion } from 'framer-motion';

type SpinnerProps = {
  size?: number;
  color?: string;
  className?: string;
};

function Spinner({ size = 24, color, className = '' }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      style={color ? { color } : undefined}
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  animated?: boolean;
};

const barColors = {
  primary: 'bg-primary-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const barSizes = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
  animated = true,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`w-full ${barSizes[size]} rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden`}>
        <motion.div
          className={`h-full rounded-full ${barColors[color]}`}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percent}%` }}
          transition={animated ? { duration: 0.5, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
      {showLabel && (
        <span className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}

type SkeletonProps = {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
};

function Skeleton({ className = '', variant = 'text', width, height, count = 1 }: SkeletonProps) {
  const base = 'animate-pulse rounded-xl bg-gray-200 dark:bg-dark-surface';
  const variants = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${base} ${variants[variant]}`}
          style={{
            ...style,
            ...(variant === 'text' && count > 1 && i === count - 1 ? { width: '70%' } : {}),
          }}
        />
      ))}
    </div>
  );
}

type FullPageLoaderProps = {
  text?: string;
  className?: string;
};

function FullPageLoader({ text = 'Loading...', className = '' }: FullPageLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm ${className}`}
      role="status"
      aria-label={text}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Spinner size={40} />
        </div>
        {text && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {text}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

export { Spinner, ProgressBar, Skeleton, FullPageLoader };
export type { SpinnerProps, ProgressBarProps, SkeletonProps, FullPageLoaderProps };
