import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileIcon } from 'lucide-react';
import { useLanguageStore } from '@/store/useLanguageStore';
import { categories } from '@/data/categories';
import { iconMap } from './iconMap';
import { itemVariants } from './itemVariants';
import { Badge } from '@/components/UI/Badge'

interface SidebarCategoryProps {
  category: string;
  index: number;
  showText: boolean;
  isMobile: boolean;
  onNavigate: () => void;
}

export function SidebarCategory({
  category,
  index,
  showText,
  isMobile,
  onNavigate,
}: SidebarCategoryProps) {
  const { t } = useTranslation();

  const meta = categories[category as keyof typeof categories];
  if (!meta) return null;

  const Icon =
    typeof meta.icon === 'string'
      ? (iconMap[meta.icon as keyof typeof iconMap] || FileIcon)
      : meta.icon;
const language = useLanguageStore((s) => s.language);
  const isComingSoon = meta.comingSoon;
  const isLocked = isComingSoon === true;

  const content = (
    <>
      <Icon size={18} className="shrink-0" />
      <AnimatePresence>
        {showText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between flex-1 min-w-0"
          >
            <span className="truncate whitespace-nowrap text-start">
              {t(`nav.${category}`)}
            </span>
            {isComingSoon && (
              <Badge variant="warning" size="sm">
                {language === 'ar' ? 'قريبًا' : 'Coming Soon'}
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={itemVariants}
    >
      {isLocked ? (
        <div
          aria-disabled="true"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group w-full opacity-70 cursor-not-allowed text-gray-400 dark:text-gray-500"
        >
          {content}
        </div>
      ) : (
        <NavLink
          to={`/category/${category}`}
          onClick={() => isMobile && onNavigate()}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group w-full',
              isActive
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-r-2 border-primary-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-200',
            ].join(' ')
          }
        >
          {content}
        </NavLink>
      )}
    </motion.div>
  );
}