import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { tools, categoryOrder, searchTools } from '@/data/tools';
import { Card } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
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
    general: 'success',
    medical: 'danger',
    engineering: 'success',
  pdf: 'info',
    powerpoint: 'warning',
    video: 'danger',
    images: 'primary',
    audio: 'success',
    qrcode: 'neutral',

};

export function AllToolsPage() {
  const navigate = useNavigate();
  const direction = 'rtl' as const;

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
          جميع الأدوات
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {filteredTools.length} أداة متاحة
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
            placeholder="ابحث عن أداة..."
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
            الكل
          </button>
          {categoryOrder.map((cat) => {
            const meta = categories[cat];
            const Icon = meta.icon;
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

                <span>{meta.name}</span>
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
            لا توجد نتائج
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            جرب البحث بكلمات مختلفة
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
                    {meta.name}
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
                    const isComingSoon = tool.comingSoon === true;
                    return (
                      <motion.div key={tool.id} variants={itemVariants}>
                        <Card
                          hoverable
                          onClick={() => {
                            if (!tool.comingSoon) {
                              navigate(`/tool/${tool.id}`);
                            }
                          }}
                          className={`h-full group ${
                            tool.comingSoon
                              ? 'cursor-not-allowed opacity-75'
                              : 'cursor-pointer'
                            }`}
                        >
                          <div className="flex flex-col h-full">

                            <div className="flex items-start justify-between mb-3">
                              <ToolIcon className="w-9 h-9 group-hover:scale-110 transition-transform duration-200" />

                              <div className="flex items-center gap-2">

                                {tool.comingSoon && (
                                  <Badge variant="warning" size="sm">
                                    قريبًا
                                  </Badge>
                                )}

                              </div>
                            </div>

                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 group-hover:text-primary-600 transition-colors">
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
            const ToolIcon = tool.icon;
            return (
              <motion.div key={tool.id} variants={itemVariants}>
                <Card
                  hoverable
                  onClick={() => {
                    if (!tool.comingSoon) {
                      navigate(`/tool/${tool.id}`);
                    }
                  }}
                  className="h-full cursor-pointer group"
                >
                  <div className="flex flex-col h-full">

                    <div className="flex items-start justify-between mb-3">
                      <span className="group-hover:scale-110 transition-transform duration-200">
                        <ToolIcon className="w-9 h-9" />
                      </span>
                    </div>

                    <div className="mb-2">
                      <Badge variant={badgeVariantMap[tool.category] || 'neutral'} size="sm">
                        {categories[tool.category].name}
                      </Badge>
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

export default AllToolsPage;
