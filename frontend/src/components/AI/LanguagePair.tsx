import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Card } from '@/components/UI/Card';
import { Select } from '@/components/UI/Input';

type LanguagePairProps = {
  targetValue: 'en' | 'ar';
  targetOnChange: (value: 'en' | 'ar') => void;

  title?: string;
  description?: string;

  sourceLanguage: string;

  options: {
    value: 'en' | 'ar';
    label: string;
  }[];
};

function LanguagePair({
  targetValue,
  targetOnChange,

  title = 'Translation Settings',
  description = 'Choose translation language',

  sourceLanguage,

  options,
}: LanguagePairProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="p-5 sm:p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>

        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl border border-light-border bg-gray-100 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:border-dark-border dark:bg-dark-surface dark:text-gray-300">
            {sourceLanguage}
          </div>

          <ArrowRight className="h-5 w-5 shrink-0 text-gray-400" />

          <div className="flex-1">
            <Select
              value={targetValue}
              onChange={(e) =>
                targetOnChange(e.target.value as 'en' | 'ar')
              }
              options={options}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export { LanguagePair };
export type { LanguagePairProps };