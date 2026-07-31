import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';

type ToolHeroProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

function ToolHero ({ icon, title, description }: ToolHeroProps) {

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export { ToolHero };
export type { ToolHeroProps };
