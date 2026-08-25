import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getToolsByCategory } from '@/data/tools';
import { Card } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import type { Tool, ToolCategory } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { Braces, Globe, ArrowLeftRight, Server, Database, BookOpenCheck, Wand2, ShieldCheck } from 'lucide-react';
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
  description: string;
  icon: LucideIcon;
  toolIds: string[];
  comingSoon?: boolean;
}

const ENGINEERING_SUBCATEGORIES: EngineeringSubCategory[] = [
  {
    id: 'code-tools',
    name: 'أدوات البرمجة',
    description: 'تعامل مع JSON والتعبيرات النمطية والتجزئة وأدوات البرمجة',
    icon: Braces,
    toolIds: ['json-formatter', 'json-validator', 'regex-tester', 'uuid-generator', 'base64-encoder', 'jwt-decoder', 'hash-generator', 'password-generator'],
  },
  {
    id: 'web-development',
    name: 'تطوير الويب',
    description: 'معاينة HTML وعارض SVG والألوان والتدرجات',
    icon: Globe,
    toolIds: ['html-preview', 'css-beautifier', 'css-minifier', 'js-beautifier', 'js-minifier', 'svg-viewer', 'color-picker', 'gradient-generator'],
  },
  {
    id: 'data-conversion',
    name: 'تحويل البيانات',
    description: 'التحويل بين CSV وJSON وMarkdown والمزيد',
    icon: ArrowLeftRight,
    toolIds: ['json-yaml', 'json-xml', 'csv-json', 'markdown-html', 'html-markdown', 'url-encoder'],
    comingSoon: true,
  },
  {
    id: 'api-networking',
    name: 'واجهات API والشبكات',
    description: 'أكواد حالة HTTP وطرق REST ومراجع واجهات API',
    icon: Server,
    toolIds: ['api-tester', 'http-status-codes', 'http-headers', 'mime-types', 'rest-methods'],
    comingSoon: true,
  },
  {
    id: 'database',
    name: 'قواعد البيانات',
    description: 'تنسيق SQL وتحويل CSV وJSON إلى SQL',
    icon: Database,
    toolIds: ['sql-formatter', 'sql-beautifier', 'sql-playground', 'csv-to-sql', 'json-to-sql'],
    comingSoon: true,
  },
  {
    id: 'developer-reference',
    name: 'مرجع المطور',
    description: 'أوراق مرجعية لـ Git وLinux والتعبيرات النمطية وكيانات HTML',
    icon: BookOpenCheck,
    toolIds: ['git-cheatsheet', 'linux-commands', 'regex-cheatsheet', 'http-cheatsheet', 'html-entities', 'ascii-table'],
    comingSoon: true,
  },
  {
    id: 'developer-utilities',
    name: 'أدوات المطور',
    description: 'الطوابع الزمنية ورموز QR ولوريم إيبسوم وبيانات الاختبار',
    icon: Wand2,
    toolIds: ['unix-timestamp', 'qr-generator-eng', 'barcode-generator', 'lorem-ipsum', 'random-data', 'cron-builder'],
    comingSoon: true,
  },
  {
    id: 'security',
    name: 'الأمان',
    description: 'قوة كلمات المرور والتحقق من التجزئة وHMAC',
    icon: ShieldCheck,
    toolIds: ['password-strength', 'hash-verifier', 'hmac-generator', 'jwt-inspector', 'token-decoder'],
    comingSoon: true,
  },
];

export function CategoryPage() {
  const { category: rawCategory } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const direction = 'rtl' as const;
  const initialState = (location.state as { sub?: string } | null)?.sub ?? null;
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(initialState);

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
            فئة غير موجودة
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            هذه الفئة غير موجودة
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            العودة للصفحة الرئيسية
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
            قريبًا
          </Badge>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {catMeta.name}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            هذا القسم قيد التطوير وسيتوفر قريباً. ترقبوا المزيد!
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            العودة للصفحة الرئيسية
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

  const isSubCategoryComingSoon = activeSubCategory?.comingSoon === true;

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
              ? 'العودة للفئات'
              : 'العودة للصفحة الرئيسية'}
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
                ? activeSubCategory.name
                : catMeta.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeSubCategory
                ? activeSubCategory.description
                : catMeta.description}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Badge variant="primary">
            {displayTools.length} أداة
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
                  hoverable={!sub.comingSoon}
                  onClick={() => {
                    if (!sub.comingSoon) {
                      setSelectedSubCategory(sub.id);
                    }
                  }}
                  className={`h-full group ${
                    sub.comingSoon ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <SubIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      {sub.comingSoon ? (
                        <Badge variant="warning" size="sm">
                          قريبًا
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          {availableCount} متاحة
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
                      {sub.description}
                    </p>
                    <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary-600 dark:text-primary-400">
                      {sub.comingSoon ? 'قريباً' : 'استعراض الأدوات'}
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
      ) : isSubCategoryComingSoon ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            {activeSubCategory && <activeSubCategory.icon className="w-10 h-10 text-primary-600 dark:text-primary-400" />}
          </div>
          <Badge variant="warning" className="mb-3">
            قريبًا
          </Badge>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {activeSubCategory?.name}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            هذا القسم قيد التطوير وسيتوفر قريباً. ترقبوا المزيد!
          </p>
          <button
            onClick={() => setSelectedSubCategory(null)}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            العودة للفئات
          </button>
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
            لا توجد أدوات في هذه الفئة بعد
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
                      navigate(`/tool/${tool.id}`, {
                        state: selectedSubCategory
                          ? { sub: selectedSubCategory, subName: activeSubCategory?.name }
                          : undefined,
                      });
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
                            قريبًا
                          </Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {tool.name}
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
                      {tool.description}
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
