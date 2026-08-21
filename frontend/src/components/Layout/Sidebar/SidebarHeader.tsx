import { motion, AnimatePresence } from 'framer-motion';

interface SidebarHeaderProps {
  showText: boolean;
}

export function SidebarHeader({ showText }: SidebarHeaderProps) {
  return (
  <div className="flex items-center gap-3 px-5 py-5">
    <div className="w-10 h-10 flex items-center justify-center shrink-0">
      <img src="/morven.png" alt="مورفن" className="w-8 h-8 object-contain" />
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
              {'مورفن للطلاب'}
            </span>

            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
              {'أدواتك الشاملة للدراسة والإنتاجية'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
