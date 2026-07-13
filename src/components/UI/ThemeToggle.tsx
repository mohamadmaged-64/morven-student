import { useThemeStore } from '@/store/useThemeStore';
import { motion } from 'framer-motion';

type ThemeToggleProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={[
        'relative rounded-xl transition-colors duration-200',
        'text-gray-500 dark:text-gray-400',
        'hover:bg-gray-100 dark:hover:bg-dark-hover',
        'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg',
        'outline-none',
        sizes[size],
        className,
      ].join(' ')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative overflow-hidden" style={{ width: iconSizes[size], height: iconSizes[size] }}>
        <motion.svg
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0"
          initial={false}
          animate={
            theme === 'dark'
              ? { rotate: 0, opacity: 1, scale: 1 }
              : { rotate: 90, opacity: 0, scale: 0 }
          }
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </motion.svg>

        <motion.svg
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0"
          initial={false}
          animate={
            theme === 'light'
              ? { rotate: 0, opacity: 1, scale: 1 }
              : { rotate: -90, opacity: 0, scale: 0 }
          }
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </motion.svg>
      </div>
    </button>
  );
}

export { ThemeToggle };
export type { ThemeToggleProps };
