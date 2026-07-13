import { type ReactNode } from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

type BadgeProps = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const dotColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  secondary: 'bg-gray-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  neutral: 'bg-gray-500',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1 text-sm gap-1.5',
};

function Badge({
  variant = 'secondary',
  size = 'md',
  dot = false,
  icon,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant, BadgeSize };
