import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getToolsByCategory } from '@/data/tools';
import { Card } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import type { Tool, ToolCategory } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { categories } from '@/data/categories'
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

const ALL_CATEGORIES: ToolCategory[] = [
  'office',
  'ai',
  'powerpoint',
  'video',
  'audio',
  'images',
  'qrcode',
  'student',
  'medical',
];

export function CategoryPage() {
  const { category: rawCategory } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, direction } = useLanguageStore();
  const { favoriteTools, toggleFavorite } = useAppStore();

  const category = rawCategory as ToolCategory;

  if (!category || !ALL_CATEGORIES.includes(category)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {language === 'ar' ? 'فئة غير موجودة' : 'Category Not Found'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {language === 'ar' ? 'هذه الفئة غير موجودة' : 'This category does not exist'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard'}
          </button>
        </motion.div>
      </div>
    );
  }

  const catMeta = categories[category];
  const tools = getToolsByCategory(category);
  const CategoryIcon = catMeta.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" dir={direction}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
        >
          <svg
            className={`w-5 h-5 transition-transform ${direction === 'rtl' ? 'rotate-180' : ''} group-hover:-translate-x-1`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">
            {language === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard'}
          </span>
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-2">
          <CategoryIcon className="w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {language === 'ar' ? catMeta.nameAr : catMeta.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {language === 'ar' ? catMeta.descriptionAr : catMeta.description}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Badge variant="primary">
            {tools.length} {language === 'ar' ? 'أداة' : 'tools'}
          </Badge>
        </div>
      </motion.div>

      {tools.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="mb-4">
  <CategoryIcon className="w-12 h-12 mx-auto" />
</div>
          <p className="text-gray-400 dark:text-gray-500">
            {language === 'ar' ? 'لا توجد أدوات في هذه الفئة بعد' : 'No tools in this category yet'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
    {tools.map((tool) => {
  const isFavorite = favoriteTools.includes(tool.id);
  const isComingSoon = tool.comingSoon === true;

  return (
    <motion.div key={tool.id} variants={itemVariants}>
      <Card
        hoverable
        onClick={() => {
          if (!isComingSoon) {
            navigate(`/tool/${tool.id}`);
          }
        }}
        className={`h-full group ${
          isComingSoon
            ? 'opacity-70 cursor-not-allowed'
            : 'cursor-pointer'
        }`}
      >
                 <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <tool.icon className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
                    <div className="flex items-center gap-2">
    {tool.comingSoon && (
      <Badge variant="warning" size="sm">
        {language === 'ar' ? 'قريبًا' : 'Coming Soon'}
      </Badge>
    )}

    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(tool.id);
      }}
      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
    >
      
                        <svg
                          className={`w-5 h-5 transition-colors ${
                            isFavorite
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'
                          }`}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      
  </button>
  </div>
  </div>
  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
  {language === 'ar' ? tool.nameAr : tool.name}
</h3>

<p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
  {language === 'ar' ? tool.descriptionAr : tool.description}
</p>

</div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default CategoryPage;
