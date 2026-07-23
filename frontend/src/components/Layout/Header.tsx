import { useEffect } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { ThemeToggle } from '@/components/UI/ThemeToggle';
import { usePomodoroStore } from '@/store/usePomodoroStore';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const pomodoroRunning = usePomodoroStore((s) => s.isRunning);
  const pomodoroPaused = usePomodoroStore((s) => s.isPaused);
  const pomodoroTimeRemaining = usePomodoroStore((s) => s.timeRemaining);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    i18n.language === 'ar'
      ? 'ar-SA-u-ca-islamic'
      : 'en-US-u-ca-islamic',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  ).format(now);

  const time = new Intl.DateTimeFormat(
    i18n.language === 'ar' ? 'ar-EG' : 'en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
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
        {/* Mobile Menu */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
          aria-label={t('sidebar.collapse')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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

       
      <div className="flex-1 flex justify-center md:justify-end">
      <div className="flex flex-col items-center md:items-end text-center md:text-right">
    <span className="text-sm font-semibold text-gray-900 dark:text-white">
      {gregorianDate}
    </span>

      <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {hijriDate}
      </span>

      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
        {time}
      </span>
    </div>
  </div>
</div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-1">
          {(pomodoroRunning || pomodoroPaused) && (
            <button
              onClick={() => navigate('/tool/pomodoro')}
              className="px-2.5 py-1.5 rounded-xl text-sm font-semibold font-mono tabular-nums text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
              aria-label={t('pomodoro.settings')}
              title={t('tools.pomodoro')}
            >
              {String(Math.floor(pomodoroTimeRemaining / 60)).padStart(2, '0')}:{String(pomodoroTimeRemaining % 60).padStart(2, '0')}
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}