import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/UI/Card';

type ToolHeroProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

function ToolHero({ icon, title, description }: ToolHeroProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 -start-10 w-40 h-40 rounded-full bg-primary-100/60 dark:bg-primary-900/20 blur-2xl" />
          <div className="absolute -bottom-14 -end-8 w-44 h-44 rounded-full bg-emerald-100/50 dark:bg-emerald-900/15 blur-2xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-500 text-white shadow-lg shadow-primary-600/25 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export { ToolHero };
export type { ToolHeroProps };
export { ToolHero as ToolHeroHeader };
