import { useRef, useEffect, useState } from 'react';
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
  Image as ImageIcon,
  QrCode,
  GraduationCap,
  HeartPulse,
  FileIcon
} from 'lucide-react';

const iconMap = {
  FileText,
  Brain,
  Presentation,
  Video,
  Music,
  Image: ImageIcon,
  QrCode,
  GraduationCap,
  HeartPulse,
};

const sidebarVariants = {
  open: {
    x: 0,
    transition: {
      type: 'tween',
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },

  closed: (direction: 'ltr' | 'rtl') => ({
    x: direction === 'rtl' ? '100%' : '-100%',
    transition: {
      type: 'tween',
     duration: 0.25,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};
const itemVariants = {
  hidden: (direction: 'ltr' | 'rtl') => ({
    opacity: 0,
    x: direction === 'rtl' ? 16 : -16,
  }),

  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  }),
};

const studentCategories = ['student', 'medical', 'engineering'];

const studyCategories = [
  'ai',
  'office',
  'powerpoint',
];

const productivityCategories = [
  'video',
  'images',
  'audio',
  'qrcode',
];

function SidebarContent({ isMobile, isHovered }: { isMobile: boolean; isHovered: boolean }) {
  const { t } = useTranslation();
  const favoriteToolsIds = useAppStore((s) => s.favoriteTools);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const location = useLocation();

  const favTools = tools.filter((t) => favoriteToolsIds.includes(t.id));
  
  const showText = isMobile || isHovered;
const renderCategory = (cat: string, index: number) => {
  const meta = categories[cat as keyof typeof categories];
  if (!meta) return null;

  const Icon =
    typeof meta.icon === 'string'
      ? (iconMap[meta.icon as keyof typeof iconMap] || FileIcon)
      : meta.icon;

  return (
    <motion.div
      key={cat}
      custom={index}
      initial="hidden"
      animate="visible"
      variants={itemVariants}
    >
      <NavLink
        to={`/category/${cat}`}
        onClick={() => isMobile && setSidebarOpen(false)}
        className={({ isActive }) =>
          [
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group w-full',
            isActive
              ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-r-2 border-primary-600'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-200',
          ].join(' ')
        }
      >
        <Icon size={18} className="shrink-0" />

        <AnimatePresence>
          {showText && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 truncate whitespace-nowrap text-start"
            >
              {t(`nav.${cat}`)}
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
    </motion.div>
  );
};
  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center shadow-glow shrink-0">
          <span className="text-white text-lg font-bold">M</span>
        </div>
        
        {/* Animate text appearance */}
        <AnimatePresence>
          {showText && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {t('app.name')}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                {t('app.subtitle')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin overflow-x-hidden">
        {/* Dashboard */}
        <div className="mb-3">
          <NavLink
            to="/"
            end
            onClick={() => isMobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-200',
              ].join(' ')
            }
          >
            <House size={18} className="shrink-0" />
            <AnimatePresence>
              {showText && (
                <motion.span 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  {t('nav.dashboard')}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        </div>

        {/* Categories */}
        <div className={showText ? "space-y-5" : "space-y-2"}>

  {/* Student Section */}
  <div className={showText ? "" : "mb-1"}>
    <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 h-4">
     {showText ? t('nav.studentSection') : ''}
    </div>

    <div className={showText ? "space-y-0.5" : "space-y-0"}>
      {studentCategories.map((cat, i) => renderCategory(cat, i))}
    </div>
  </div>

  {/* Studying Section */}
  <div className={showText ? "" : "mb-1"}>
    <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 h-4">
      {showText ? t('nav.studyTools') : ''}
    </div>

    <div className={showText ? "space-y-0.5" : "space-y-0"}>
      {studyCategories.map((cat, i) => renderCategory(cat, i))}
    </div>
  </div>

  {/* Productivity */}
  <div className={showText ? "" : "mb-1"}>
    <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 h-4">
      {showText ? t('nav.productivityTools') : ''}
    </div>

    <div className={showText ? "space-y-0.5" : "space-y-0"}>
      {productivityCategories.map((cat, i) => renderCategory(cat, i))}
    </div>
  </div>

</div>

        {/* Favorites */}
        {favTools.length > 0 && (
          <div className="mt-5 pt-4 border-t border-light-border dark:border-dark-border w-full">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 h-4">
              {showText ? t('nav.favorites') : ''}
            </div>
            <div className="space-y-0.5 w-full">
              {favTools.slice(0, 5).map((tool) => {
                 const ToolIcon = typeof tool.icon === 'string' 
                   ? (iconMap[tool.icon as keyof typeof iconMap] || FileIcon) 
                   : (tool.icon as React.ElementType);

                return (
                  <NavLink
                    key={tool.id}
                    to={`/tool/${tool.id}`}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 w-full',
                        isActive
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover',
                      ].join(' ')
                    }
                  >
                    <ToolIcon className="w-4 h-4 shrink-0" />
                    <AnimatePresence>
                      {showText && (
                        <motion.span 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="truncate whitespace-nowrap"
                        >
                          {tool.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-light-border dark:border-dark-border">
        <div className={`flex items-center ${showText ? 'justify-between' : 'justify-center'} px-2`}>
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
  
  // Track hover state for desktop and screen width for mobile detection
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

 useEffect(() => {
  const handleResize = () => {
    const mobile = window.innerWidth < 1024;

    setIsMobile(mobile);

    if (mobile) {
      setSidebarOpen(false); // الموبايل يبدأ مغلق
    } else {
      setSidebarOpen(true); // اللاب يبدأ مفتوح
    }
  };

  handleResize();
  window.addEventListener('resize', handleResize);

  return () => window.removeEventListener('resize', handleResize);
}, [setSidebarOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, setSidebarOpen, isMobile]);

  return (
    <>
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
              onMouseEnter={() => !isMobile && setIsHovered(true)}
              onMouseLeave={() => !isMobile && setIsHovered(false)}
              // Changed styling: w-64 on mobile ALWAYS, hover effect ONLY on lg screens
              className={[
                'fixed top-0 z-50 h-full transition-all duration-300 bg-white dark:bg-dark-card border-light-border dark:border-dark-border shadow-xl overflow-hidden',
                isMobile ? 'w-64' : (isHovered ? 'w-64' : 'w-20'),
                'lg:static lg:z-auto lg:translate-x-0',
                direction === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
              ].join(' ')}
            >

              <SidebarContent isMobile={isMobile} isHovered={isHovered} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}