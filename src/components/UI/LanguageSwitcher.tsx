import { useLanguageStore } from '@/store/useLanguageStore';
import { motion } from 'framer-motion';

type LanguageSwitcherProps = {
  className?: string;
};

function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language, toggleLanguage } = useLanguageStore();

  return (
    <button
      onClick={toggleLanguage}
      className={[
        'relative px-3 py-1.5 rounded-xl text-sm font-semibold',
        'border transition-all duration-200',
        'border-light-border dark:border-dark-border',
        'bg-gray-50 dark:bg-dark-surface',
        'hover:bg-gray-100 dark:hover:bg-dark-hover',
        'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg',
        'outline-none',
        className,
      ].join(' ')}
      aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
    >
      <div className="relative overflow-hidden h-5 w-6 flex items-center justify-center">
        <motion.span
          key={language}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute text-gray-700 dark:text-gray-300"
        >
          {language === 'en' ? 'EN' : 'AR'}
        </motion.span>
      </div>
    </button>
  );
}

export { LanguageSwitcher };
export type { LanguageSwitcherProps };
