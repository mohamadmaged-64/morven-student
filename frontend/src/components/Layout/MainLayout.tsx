import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header/Header';
import { Sidebar } from './Sidebar/Sidebar';
import { PomodoroTimerService } from '@/pages/tools/GeneralTools/Pomodoro/PomodoroTimerService';
import { ToolErrorBoundary } from '@/pages/tools/ToolErrorBoundary';
import Footer from './Footer/Footer';

export function MainLayout() {
  const { pathname } = useLocation();

  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dir = 'rtl';
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg" dir="rtl">
      <PomodoroTimerService />
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header />

       <main
  ref={mainRef}
  className="flex-1 overflow-y-auto transition-all duration-300 flex flex-col"
>
  <div className="flex-1 p-4 md:p-6 lg:p-8">
    <ToolErrorBoundary resetKey={pathname}>
      <Outlet />
    </ToolErrorBoundary>
  </div>

  {pathname === '/' && <Footer />}
</main>
      </div>
    </div>
  );
}
