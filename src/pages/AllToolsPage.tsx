import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { tools, categoryOrder, searchTools } from '@/data/tools';
import { Card } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import type { ToolCategory, Tool } from '@/types';
import { categories } from '@/data/categories';
import { CategoryMeta } from '@/data/categories';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 26 },
  },
};

const badgeVariantMap: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  office: 'info',
  ai: 'primary',
  powerpoint: 'warning',
  video: 'danger',
  audio: 'success',
  images: 'primary',
  qrcode: 'neutral',
  student: 'success',
  medical: 'danger',
};

export function AllToolsPage() {
  const navigate = useNavigate();
  const { language, direction } = useLanguageStore();
  const { favoriteTools, toggleFavorite } = useAppStore();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');

  const filteredTools = useMemo(() => {
    if (query.trim()) {
      return searchTools(query);
    }
    if (activeCategory === 'all') {
      return tools;
    }
    return tools.filter((t) => t.category === activeCategory);
  }, [query, activeCategory]);

  const groupedTools = useMemo(() => {
    if (query.trim() || activeCategory !== 'all') return null;
    const groups: Record<ToolCategory, Tool[]> = {} as any;
    for (const cat of categoryOrder) {
      const catTools = tools.filter((t) => t.category === cat);
      if (catTools.length > 0) {
        groups[cat] = catTools;
      }
    }
    return groups;
  }, [query, activeCategory]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) {
      setActiveCategory('all');
    }
  }, []);

  const handleCategoryChange = useCallback((cat: ToolCategory | 'all') => {
    setActiveCategory(cat);
    setQuery('');
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" dir={direction}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {language === 'ar' ? 'جميع الأدوات' : 'All Tools'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {filteredTools.length} {language === 'ar' ? 'أداة متاحة' : 'tools available'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-xl">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={
              language === 'ar'
                ? 'ابحث عن أداة...'
                : 'Search for a tool...'
            }
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mb-8 overflow-x-auto pb-2"
      >
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === 'all' && !query.trim()
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            {language === 'ar' ? 'الكل' : 'All'}
          </button>
          {categoryOrder.map((cat) => {
            const meta = categories[cat];
            const isActive = activeCategory === cat && !query.trim();
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                const Icon = meta.icon;
                <span>{language === 'ar' ? meta.nameAr : meta.name}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {filteredTools.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {language === 'ar' ? 'لا توجد نتائج' : 'No tools found'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {language === 'ar'
              ? 'جرب البحث بكلمات مختلفة'
              : 'Try searching with different keywords'}
          </p>
        </motion.div>
      ) : groupedTools ? (
        <div className="space-y-10">
          {categoryOrder.map((cat) => {
            const catTools = groupedTools[cat];
            if (!catTools || catTools.length === 0) return null;
            const meta = categories[cat];
            return (
              <motion.section
                key={cat}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-4">
                   
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    {language === 'ar' ? meta.nameAr : meta.name}
                  </h2>
                  <Badge variant={badgeVariantMap[cat] || 'neutral'} size="sm">
                    {catTools.length}
                  </Badge>
                </div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                  {catTools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isFavorite = favoriteTools.includes(tool.id);
                    return (
                      <motion.div key={tool.id} variants={itemVariants}>
                        <Card
                          hoverable
                          onClick={() => navigate(`/tool/${tool.id}`)}
                          className="h-full cursor-pointer group"
                        >
                          <div className="flex flex-col h-full">
                                   <span className="group-hover:scale-110 transition-transform duration-200">
        <ToolIcon className="w-9 h-9" />
      </span>
                            <div className="flex items-start justify-between mb-3">
                             
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(tool.id);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
              </motion.section>
            );
          })}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filteredTools.map((tool) => {
            const isFavorite = favoriteTools.includes(tool.id);
            const ToolIcon = tool.icon;
            return (
              <motion.div key={tool.id} variants={itemVariants}>
                <Card
                  hoverable
                  onClick={() => navigate(`/tool/${tool.id}`)}
                  className="h-full cursor-pointer group"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <span className="group-hover:scale-110 transition-transform duration-200">
        <ToolIcon className="w-9 h-9" />
      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(tool.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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

                    <div className="mb-2">
                      <Badge variant={badgeVariantMap[tool.category] || 'neutral'} size="sm">
                        {language === 'ar' ? categories[tool.category].nameAr : categories[tool.category].name}
                      </Badge>
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

export default AllToolsPage;
