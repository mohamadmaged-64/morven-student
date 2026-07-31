import { motion } from 'framer-motion';
import { Spinner } from '@/components/UI/Loading';

type ProcessingOverlayProps = {
  progress?: number;
  message?: string;
};

function ProcessingOverlay({
  progress = 0,
  message = 'Processing...',
}: ProcessingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-dark-bg/80"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-light-border bg-white p-6 shadow-xl dark:border-dark-border dark:bg-dark-surface">
        <Spinner size={40} />

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          {message}
        </motion.p>

        {progress > 0 && (
          <div className="w-56">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-border">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            <p className="mt-2 text-center text-xs text-gray-400">
              {Math.round(progress)}%
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { ProcessingOverlay };
export type { ProcessingOverlayProps };