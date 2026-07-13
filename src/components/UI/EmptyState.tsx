import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {icon && (
        <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-dark-surface flex items-center justify-center text-gray-300 dark:text-gray-600 mb-6">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-colors duration-200"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
