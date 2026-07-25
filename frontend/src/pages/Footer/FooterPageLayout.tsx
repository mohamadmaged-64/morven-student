import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface FooterPageLayoutProps {
  titleKey: string;
  children: React.ReactNode;
}

export default function FooterPageLayout({ titleKey, children }: FooterPageLayoutProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-3xl mx-auto py-8 md:py-12"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
        {t(titleKey)}
      </h1>
      <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
        {children}
      </div>
    </motion.div>
  );
}
