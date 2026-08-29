import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';

interface SidebarFooterProps {
  showText: boolean;
}

export function SidebarFooter({ showText }: SidebarFooterProps) {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  if (user) return null;

  return (
    <div className="px-3 py-3 border-t border-light-border dark:border-dark-border">
      <button
        onClick={toggleTheme}
        className={[
          'flex items-center w-full rounded-xl text-sm font-medium transition-all duration-200',
          showText ? 'gap-3 px-3 py-2.5 justify-start' : 'gap-3 py-2.5 justify-center',
          'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-200',
        ].join(' ')}
        title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
        aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      >
        {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
      </button>
    </div>
  );
}
