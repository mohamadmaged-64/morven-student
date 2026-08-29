import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { House, Users, BookOpen, LogIn, UserPlus, Compass, FolderOpen } from 'lucide-react';
import { SidebarCategory } from './SidebarCategory';
import { sidebarSections } from './sidebarSections';
import { useAuthStore } from '@/store/useAuthStore';

interface SidebarNavigationProps {
  isMobile: boolean;
  showText: boolean;
}

const connectLinks = [
  { to: '/connect', label: 'الرئيسية', icon: Compass, end: true },
  { to: '/connect/groups', label: 'المجموعات', icon: Users, end: false },
  { to: '/connect/resources', label: 'الموارد', icon: BookOpen, end: false },
];

export function SidebarNavigation({
  isMobile,
  showText,
}: SidebarNavigationProps) {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin overflow-x-hidden">

      {/* Main Page */}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                {'الصفحة الرئيسية'}
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* الملتقي — First major section, ABOVE student tools */}
      <div className={`${showText ? '' : 'mb-1'}`}>
        <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 h-4">
          {showText ? 'الملتقى التعليمي' : ''}
        </div>

        <div className={showText ? 'space-y-0.5' : 'space-y-0'}>
          {user ? (
            connectLinks.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
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
                <Icon size={18} className="shrink-0" />
                <AnimatePresence>
                  {showText && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))
          ) : (
            <>
              <NavLink
                to="/login"
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
                <LogIn size={18} className="shrink-0" />
                <AnimatePresence>
                  {showText && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {'دخول'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
              <NavLink
                to="/register"
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
                <UserPlus size={18} className="shrink-0" />
                <AnimatePresence>
                  {showText && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {'إنشاء حساب'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className={`${showText ? 'mt-5' : 'mt-3'} border-t border-gray-200 dark:border-dark-border pt-4`} />

      {/* مورفن للطلاب — Student tools section, BELOW الملتقى */}
      <div className={showText ? 'space-y-5' : 'space-y-2'}>
        {sidebarSections.map((section) => (
          <div
            key={section.title}
            className={showText ? '' : 'mb-1'}
          >
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 h-4">
              {showText ? section.title : ''}
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
  );
}
