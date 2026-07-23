import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SidebarHeaderProps {
  showText: boolean;
}

export function SidebarHeader({ showText }: SidebarHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center shadow-glow shrink-0">
        <span className="text-white text-lg font-bold">M</span>
      </div>

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
  );
}