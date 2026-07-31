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
  'general',
  'medical',
  'engineering',
  'ai',
  'pdf',
  'powerpoint',
  'video',
  'images',
  'audio',
  'qrcode',
  
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
  const isFeatured = category === 'general' && tool.id === 'holy-quran';

  return (
    <motion.div
      key={tool.id}
      variants={itemVariants}
      className={isFeatured ? 'lg:col-span-3 xl:col-span-4' : ''}
    >
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
        } ${
          isFeatured
            ? 'bg-gradient-to-br from-[#f8efda] via-[#eed9aa] to-[#d9b45e] dark:from-[#332a15] dark:via-[#4a3d1e] dark:to-[#5f4d24] !border-[#c9a45c]/70 dark:!border-[#d9bf8a]/40 !shadow-[0_4px_20px_-4px_rgba(180,140,50,0.35),0_10px_35px_-12px_rgba(180,140,50,0.3)] dark:!shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5),0_10px_35px_-12px_rgba(217,191,138,0.2)]'
            : ''
        }`}
      >
        <div
    className={`flex flex-col h-full ${
      isFeatured
        ? 'items-center justify-center text-center'
        : ''
    }`}
    >
        {tool.comingSoon && (
  <div className="mb-4 flex justify-center">
    <Badge variant="warning" size="sm">
      {language === 'ar' ? 'قريبًا' : 'Coming Soon'}
    </Badge>
  </div>
)}
  <h3
  className={`font-bold transition-colors ${
  isFeatured
    ? 'text-3xl mb-3 text-center'
    : 'text-lg mb-1 text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400'
}`}
> {language === 'ar' ? tool.nameAr : tool.name}
</h3>

<p
  className={`${
  isFeatured
    ? 'text-base text-center max-w-2xl mx-auto leading-8 text-gray-700 dark:text-gray-300'
    : 'text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1'
}`}
>  {language === 'ar' ? tool.descriptionAr : tool.description}
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
