import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { ThemeToggle } from '@/components/UI/ThemeToggle';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
 const { t, i18n } = useTranslation();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
 const now = new Date();

const gregorianDate = new Intl.DateTimeFormat(
  i18n.language === 'ar' ? 'ar-EG' : 'en-US',
  {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
).format(now);

const hijriDate = new Intl.DateTimeFormat(
  i18n.language === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic',
  {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
).format(now);
  return (
    <header
      className={[
        'sticky top-0 z-30',
        'bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl',
        'border-b border-light-border dark:border-dark-border',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 px-4 h-16">
        {/* Hamburger for mobile */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
          aria-label={t('sidebar.collapse')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Title */}
        {title && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate hidden sm:block">
            {title}
          </h1>
        )}

        {/* Spacer */}
        <div className="flex-1" />

       <div className="hidden md:flex flex-col text-right">
  <span className="text-sm font-semibold text-gray-900 dark:text-white">
    {gregorianDate}
  </span>

  <span className="text-xs text-gray-500 dark:text-gray-400">
    {hijriDate}
  </span>
</div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          
        </div>
      </div>
    </header>
  );
}
