import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileIcon } from 'lucide-react';
import { categories } from '@/data/categories';
import { iconMap } from './iconMap';
import { itemVariants } from './itemVariants';
import { Badge } from '@/components/UI/Badge'

const categoryNames: Record<string, string> = {
  dashboard: 'الصفحة الرئيسية',
  pdf: 'أدوات الPDF',
  powerpoint: 'أدوات الPowerPoint',
  video: 'أدوات الفيديو',
  audio: 'أدوات الصوت',
  images: 'أدوات الصور',
  qrcode: 'رمز QR',
  general: 'عام',
  medical: 'القسم الطبي',
  engineering: 'القسم الهندسي',
  recent: 'الأدوات الأخيرة',
  allTools: 'جميع الأدوات',
  studentSection: 'القسم الطلابي',
  tools: 'الأدوات',
  studyTools: 'القسم الدراسي',
  productivityTools: 'القسم الانتاجي',
};

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
  const meta = categories[category as keyof typeof categories];
  if (!meta) return null;

  const Icon =
    typeof meta.icon === 'string'
      ? (iconMap[meta.icon as keyof typeof iconMap] || FileIcon)
      : meta.icon;
  const isComingSoon = !['engineering', 'powerpoint'].includes(category) && meta.comingSoon;
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
              {categoryNames[category] || category}
            </span>
            {isComingSoon && (
              <Badge variant="warning" size="sm">
                {'قريبًا'}
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
