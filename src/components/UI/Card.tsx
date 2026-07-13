import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type CardProps = {
  hoverable?: boolean;
  onClick?: () => void;
  gradient?: boolean;
  glass?: boolean;
  className?: string;
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
} & Omit<HTMLMotionProps<'div'>, 'className' | 'children' | 'onClick'>;

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      hoverable = false,
      onClick,
      gradient = false,
      glass = false,
      className = '',
      children,
      padding = 'md',
      ...rest
    },
    ref,
  ) => {
    const baseClasses = [
      'rounded-2xl transition-all duration-300',
      !gradient && !glass && [
        'bg-white dark:bg-dark-card',
        'border border-light-border dark:border-dark-border',
        'shadow-card dark:shadow-card-dark',
      ].join(' '),
      gradient && [
        'relative bg-white dark:bg-dark-card p-[1px]',
        'rounded-2xl',
      ].join(' '),
      glass && [
        'bg-white/60 dark:bg-dark-card/60',
        'backdrop-blur-xl',
        'border border-white/20 dark:border-white/5',
        'shadow-elevated',
      ].join(' '),
      hoverable && 'cursor-pointer',
      paddingClasses[padding],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const motionProps: HTMLMotionProps<'div'> = hoverable
      ? {
          whileHover: { y: -4, scale: 1.01 },
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        }
      : {};

    const content = (
      <div className={gradient ? `rounded-2xl p-6 ${paddingClasses[padding]}` : ''}>
        {children}
      </div>
    );

    if (gradient) {
      return (
        <motion.div
          ref={ref}
          className={[
            'rounded-2xl p-[1px]',
            'bg-gradient-to-br from-primary-400 via-primary-600 to-primary-400',
            'dark:from-primary-600 dark:via-primary-400 dark:to-primary-600',
            hoverable && 'cursor-pointer',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={onClick}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          onKeyDown={
            onClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                  }
                }
              : undefined
          }
          {...motionProps}
          {...rest}
        >
          <div className="bg-white dark:bg-dark-card rounded-[15px] h-full">{content}</div>
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        {...motionProps}
        {...rest}
      >
        {content}
      </motion.div>
    );
  },
);

Card.displayName = 'Card';

export { Card };
export type { CardProps };
