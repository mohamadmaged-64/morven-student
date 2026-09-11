import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type ToolLayoutProps = {
  children: ReactNode;
  backTo: string;
  backLabel: string;
  backState?: Record<string, unknown>;
};

function ToolLayout({ children, backTo, backLabel, backState }: ToolLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => navigate(backTo, backState ? { state: backState } : undefined)}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
        >
          <svg
            className="w-5 h-5 transition-transform rotate-180 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm font-medium">{backLabel}</span>
        </button>
      </motion.div>

      {children}
    </div>
  );
}

export { ToolLayout };
export type { ToolLayoutProps };
