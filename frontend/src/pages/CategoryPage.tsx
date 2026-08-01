import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getToolsByCategory } from '@/data/tools';
import { Card } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import type { Tool, ToolCategory } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { Braces, Globe, ArrowLeftRight, Server, Database, BookOpenCheck, Wand2, ShieldCheck } from 'lucide-react';
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

interface EngineeringSubCategory {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: LucideIcon;
  toolIds: string[];
}

const ENGINEERING_SUBCATEGORIES: EngineeringSubCategory[] = [
  {
    id: 'code-tools',
    name: 'Code Tools',
    nameAr: 'أدوات البرمجة',
    description: 'Work with JSON, regex, hashes, and code utilities',
    descriptionAr: 'تعامل مع JSON والتعبيرات النمطية والتجزئة وأدوات البرمجة',
    icon: Braces,
    toolIds: ['json-formatter', 'json-validator', 'regex-tester', 'uuid-generator', 'base64-encoder', 'jwt-decoder', 'hash-generator', 'password-generator'],
  },
  {
    id: 'web-development',
    name: 'Web Development',
    nameAr: 'تطوير الويب',
    description: 'HTML preview, SVG viewer, colors, and gradients',
    descriptionAr: 'معاينة HTML وعارض SVG والألوان والتدرجات',
    icon: Globe,
    toolIds: ['html-preview', 'css-beautifier', 'css-minifier', 'js-beautifier', 'js-minifier', 'svg-viewer', 'color-picker', 'gradient-generator'],
  },
  {
    id: 'data-conversion',
    name: 'Data Conversion',
    nameAr: 'تحويل البيانات',
    description: 'Convert between CSV, JSON, Markdown, and more',
    descriptionAr: 'التحويل بين CSV وJSON وMarkdown والمزيد',
    icon: ArrowLeftRight,
    toolIds: ['json-yaml', 'json-xml', 'csv-json', 'markdown-html', 'html-markdown', 'url-encoder'],
  },
  {
    id: 'api-networking',
    name: 'API & Networking',
    nameAr: 'واجهات API والشبكات',
    description: 'HTTP status codes, REST methods, and API references',
    descriptionAr: 'أكواد حالة HTTP وطرق REST ومراجع واجهات API',
    icon: Server,
    toolIds: ['api-tester', 'http-status-codes', 'http-headers', 'mime-types', 'rest-methods'],
  },
  {
    id: 'database',
    name: 'Database',
    nameAr: 'قواعد البيانات',
    description: 'SQL formatting and CSV/JSON to SQL conversion',
    descriptionAr: 'تنسيق SQL وتحويل CSV وJSON إلى SQL',
    icon: Database,
    toolIds: ['sql-formatter', 'sql-beautifier', 'sql-playground', 'csv-to-sql', 'json-to-sql'],
  },
  {
    id: 'developer-reference',
    name: 'Developer Reference',
    nameAr: 'مرجع المطور',
    description: 'Cheat sheets for Git, Linux, regex, and HTML entities',
    descriptionAr: 'أوراق مرجعية لـ Git وLinux والتعبيرات النمطية وكيانات HTML',
    icon: BookOpenCheck,
    toolIds: ['git-cheatsheet', 'linux-commands', 'regex-cheatsheet', 'http-cheatsheet', 'html-entities', 'ascii-table'],
  },
  {
    id: 'developer-utilities',
    name: 'Developer Utilities',
    nameAr: 'أدوات المطور',
    description: 'Timestamps, QR codes, Lorem Ipsum, and test data',
    descriptionAr: 'الطوابع الزمنية ورموز QR ولوريم إيبسوم وبيانات الاختبار',
    icon: Wand2,
    toolIds: ['unix-timestamp', 'qr-generator-eng', 'barcode-generator', 'lorem-ipsum', 'random-data', 'cron-builder'],
  },
  {
    id: 'security',
    name: 'Security',
    nameAr: 'الأمان',
    description: 'Password strength, hash verification, and HMAC',
    descriptionAr: 'قوة كلمات المرور والتحقق من التجزئة وHMAC',
    icon: ShieldCheck,
    toolIds: ['password-strength', 'hash-verifier', 'hmac-generator', 'jwt-inspector', 'token-decoder'],
  },
];

export function CategoryPage() {
  const { category: rawCategory } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, direction } = useLanguageStore();
  const { favoriteTools, toggleFavorite } = useAppStore();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

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
  const CategoryIcon = catMeta.icon;
  const isEngineering = category === 'engineering';
  const isLocked = catMeta.comingSoon === true;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4" dir={direction}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <CategoryIcon className="w-10 h-10 text-primary-600 dark:text-primary-400" />
          </div>
          <Badge variant="warning" className="mb-3">
            {language === 'ar' ? 'قريبًا' : 'Coming Soon'}
          </Badge>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {language === 'ar' ? catMeta.nameAr : catMeta.name}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {language === 'ar'
              ? 'هذا القسم قيد التطوير وسيتوفر قريباً. ترقبوا المزيد!'
              : 'This section is under development and will be available soon. Stay tuned!'}
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

  const tools = getToolsByCategory(category);
  const activeSubCategory = isEngineering
    ? ENGINEERING_SUBCATEGORIES.find((s) => s.id === selectedSubCategory) ?? null
    : null;
  const displayTools = activeSubCategory
    ? tools.filter((tool) => activeSubCategory.toolIds.includes(tool.id))
    : tools;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" dir={direction}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => (activeSubCategory ? setSelectedSubCategory(null) : navigate('/'))}
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
            {activeSubCategory
              ? (language === 'ar' ? 'العودة للفئات' : 'Back to Categories')
              : (language === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard')}
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
          {activeSubCategory ? (
            <activeSubCategory.icon className="w-10 h-10" />
          ) : (
            <CategoryIcon className="w-10 h-10" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {activeSubCategory
                ? (language === 'ar' ? activeSubCategory.nameAr : activeSubCategory.name)
                : (language === 'ar' ? catMeta.nameAr : catMeta.name)}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeSubCategory
                ? (language === 'ar' ? activeSubCategory.descriptionAr : activeSubCategory.description)
                : (language === 'ar' ? catMeta.descriptionAr : catMeta.description)}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Badge variant="primary">
            {displayTools.length} {language === 'ar' ? 'أداة' : 'tools'}
          </Badge>
        </div>
      </motion.div>

      {isEngineering && !activeSubCategory ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {ENGINEERING_SUBCATEGORIES.map((sub) => {
            const SubIcon = sub.icon;
            const subTools = tools.filter((tool) => sub.toolIds.includes(tool.id));
            const availableCount = subTools.filter((tool) => !tool.comingSoon).length;

            return (
              <motion.div key={sub.id} variants={itemVariants}>
                <Card
                  hoverable
                  onClick={() => setSelectedSubCategory(sub.id)}
                  className="h-full group cursor-pointer"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <SubIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <Badge variant="neutral" size="sm">
                        {availableCount} {language === 'ar' ? 'متاحة' : 'available'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {language === 'ar' ? sub.nameAr : sub.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
                      {language === 'ar' ? sub.descriptionAr : sub.description}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary-600 dark:text-primary-400">
                      {language === 'ar' ? 'استعراض الأدوات' : 'View tools'}
                      <svg
                        className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${direction === 'rtl' ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : displayTools.length === 0 ? (
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
    {displayTools.map((tool) => {
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
