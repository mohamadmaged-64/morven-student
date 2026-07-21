import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarHeader } from './SidebarHeader';
import { SidebarCategory } from './SidebarCategory';
import { sidebarSections } from './sidebarSections';
import { SidebarFooter } from './SidebarFooter';
import { House } from 'lucide-react';


interface SidebarContentProps {
  isMobile: boolean;
  isHovered: boolean;
}

export function SidebarContent({
  isMobile,
  isHovered,
}: SidebarContentProps) {

  const { t } = useTranslation();
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const showText = isMobile || isHovered;

  return (
    <nav className="flex flex-col h-full">
     <SidebarHeader showText={showText} />


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
        <div className={showText ? 'space-y-5' : 'space-y-2'}>
          {sidebarSections.map((section) => (
            <div key={section.title} className={showText ? '' : 'mb-1'}>
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 h-4">
                {showText ? t(section.title) : ''}
              </div>

              <div className={showText ? 'space-y-0.5' : 'space-y-0'}>
                {section.categories.map((category, index) => (
                  <SidebarCategory
                    key={category}
                    category={category}
                    index={index}
                    showText={showText}
                    isMobile={isMobile}
                    onNavigate={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
       <SidebarFooter showText={showText} />
    </nav>
  );
}
