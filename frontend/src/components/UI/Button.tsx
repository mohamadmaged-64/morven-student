import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, type HTMLMotionProps } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

type ButtonBaseProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  as?: 'button' | 'link';
  to?: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

type ButtonAsButton = ButtonBaseProps & Omit<HTMLMotionProps<'button'>, keyof ButtonBaseProps> & { as?: 'button' };
type ButtonAsLink = ButtonBaseProps & Omit<Parameters<typeof Link>[0], keyof ButtonBaseProps | 'disabled'> & { as: 'link'; to: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-600/20 dark:shadow-primary-600/30',
  secondary:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-surface dark:text-gray-200 dark:hover:bg-dark-hover border border-light-border dark:border-dark-border',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-hover',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20 dark:shadow-red-600/30',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 dark:shadow-emerald-600/30',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
};

const iconOnlySizeClasses: Record<Size, string> = {
  sm: 'p-1.5 rounded-lg',
  md: 'p-2 rounded-xl',
  lg: 'p-3 rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconRight,
    as = 'button',
    className = '',
    children,
    disabled,
    ...rest
  } = props;

  const isDisabled = disabled || loading;
  const isIconOnly = icon && !children;

  const classes = [
    'inline-flex items-center justify-center font-medium transition-all duration-200 select-none outline-none',
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg',
    'disabled:opacity-50 disabled:pointer-events-none',
    variantClasses[variant],
    isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const motionProps: HTMLMotionProps<'button'> = {
    whileHover: isDisabled ? undefined : { scale: 1.02 },
    whileTap: isDisabled ? undefined : { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 17 },
  };

  const content = (
    <>
      {loading && (
        <svg
          className="animate-spin shrink-0"
          width={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
          height={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
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
      )}
      {!loading && icon}
      {children && <span>{children}</span>}
      {iconRight}
    </>
  );

  if (as === 'link' && 'to' in rest) {
    const { to, ...linkRest } = rest as { to: string } & Record<string, unknown>;
    return (
      <motion.div
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="inline-flex"
      >
        <Link
          to={to}
          className={classes}
          aria-disabled={isDisabled}
          {...(linkRest as Record<string, unknown>)}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...motionProps}
      {...(rest as HTMLMotionProps<'button'>)}
    >
      {content}
    </motion.button>
  );
});

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, Variant as ButtonVariant, Size as ButtonSize };
