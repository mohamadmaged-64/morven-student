import { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { ThemeToggle } from '@/components/UI/ThemeToggle';
import { LanguageSwitcher } from '@/components/UI/LanguageSwitcher';
import { categoryOrder } from '@/data/navigation';
import { categories } from '@/data/categories';
import { getToolById, tools } from '@/data/tools';
import {
  House,
  Brain,
  FileText,
  Presentation,
  Video,
  Music,
  Image,
  QrCode,
  GraduationCap,
  HeartPulse,
} from 'lucide-react';
 const iconMap = {
               FileText,
               Brain,
               Presentation,
               Video,
               Music,
               Image,
               QrCode,
               GraduationCap,
               HeartPulse,
};
const sidebarVariants = {
  open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 },
  }),
};

const favoriteTools = tools.filter((t) => useAppStore.getState().favoriteTools.includes(t.id));

function SidebarContent() {
  const { t } = useTranslation();
  const favoriteToolsIds = useAppStore((s) => s.favoriteTools);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const location = useLocation();

  const favTools = tools.filter((t) => favoriteToolsIds.includes(t.id));
  const collapsed = true;
  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
       <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center shadow-glow">
  <span className="text-white text-lg font-bold">M</span>
</div>
    {!collapsed && (
  <div className="flex flex-col">
    <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
      {t('app.name')}
    </span>

    <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
      {t('app.subtitle')}
    </span>
  </div>
)}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {/* Dashboard */}
        <div className="mb-3">
          <NavLink
            to="/"
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-200',
              ].join(' ')
            }
          >
            <House size={18} className="shrink-0" />
            {!collapsed && <span>{t('nav.dashboard')}</span>}
          </NavLink>
        </div>

        {/* Categories */}
        <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
  {t('nav.tools')}
</div>
        <div className="space-y-0.5">
          
          {categoryOrder.map((cat, i) => {
            const meta = categories[cat];
            const count = tools.filter((t) => t.category === cat).length;
            const Icon = iconMap[meta.icon as keyof typeof iconMap];
            return (
              <>
    {cat === 'student' && (
      <div className="mt-5 px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {t('nav.studentSection')}
      </div>
    )}
              <motion.div key={cat} custom={i} initial="hidden" animate="visible" variants={itemVariants}>
                <NavLink
                  to={`/category/${cat}`}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                      isActive
  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-r-2 border-primary-600'
  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-200'
                    ].join(' ')
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{t(`nav.${cat}`)}</span>
                </NavLink>
              </motion.div>
              </>
            );
          })}
        </div>

        {/* Favorites */}
        {favTools.length > 0 && (
          <div className="mt-5 pt-4 border-t border-light-border dark:border-dark-border">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('nav.favorites')}
            </div>
            <div className="space-y-0.5">
              {favTools.slice(0, 5).map((tool) => (
                <NavLink
                  key={tool.id}
                  to={`/tool/${tool.id}`}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover',
                    ].join(' ')
                  }
                >
                  <span className="text-base shrink-0">{tool.icon}</span>
                  <span className="truncate">{tool.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between px-2">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const direction = useLanguageStore((s) => s.direction);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              ref={overlayRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.aside
              key="sidebar"
              custom={direction}
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className={[
                'fixed top-0 z-50 h-full w-20 hover:w-64 transition-all duration-300 bg-white dark:bg-dark-card border-r border-light-border dark:border-dark-border shadow-xl',
                'lg:static lg:z-auto lg:translate-x-0',
                direction === 'rtl' ? 'right-0 border-r-0 border-l' : 'left-0',
              ].join(' ')}
            >
             
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}