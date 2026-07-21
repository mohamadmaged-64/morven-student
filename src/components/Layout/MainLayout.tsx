import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useLanguageStore } from '@/store/useLanguageStore';
import { Header } from './Header';
import { Sidebar } from './Sidebar/Sidebar';
import { PomodoroTimerService } from '@/components/PomodoroTimerService';

export function MainLayout() {
  const direction = useLanguageStore((s) => s.direction);

  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg" dir={direction}>
      <PomodoroTimerService />
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header />

        <main className="flex-1 overflow-y-auto transition-all duration-300" >
          <div className="p-4 md:p-6 lg:p-8">
         <Outlet />
         </div>
        </main>
      </div>
    </div>
  );
}
