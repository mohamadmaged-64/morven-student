import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
};

export function MainLayout() {
  const direction = useLanguageStore((s) => s.direction);
  const { t } = useTranslation();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg" dir={direction}>
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header />

        <main
          className={[
            'flex-1 overflow-y-auto',
            'transition-all duration-300',
          ].join(' ')}
        >
          <div className="p-4 md:p-6 lg:p-8">
  <Outlet />
</div>
 
        </main>
      </div>
    </div>
  );
}
