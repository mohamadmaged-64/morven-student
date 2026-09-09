import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  Input,
  Button,
  ProgressBar,
  Badge,
  EmptyState,
} from '@/components/UI';
import { AdhkarCard } from '@/components/adhkar/AdhkarCard';
import { CategoryCard } from '@/components/adhkar/CategoryCard';
import { AddDhikrModal } from '@/components/adhkar/AddDhikrModal';
import { useAdhkarStore } from '@/store/useAdhkarStore';
import {
  useAdhkarApprovedStore,
  getApprovedAdhkarForCategory,
} from '@/store/useAdhkarApprovedStore';
import {
  CATEGORIES,
  CATEGORY_META,
  getAdhkarByCategory,
  getCategoryProgress,
  searchAdhkar,
  type Dhikr,
  type DhikrCategory,
} from '@/data/adhkar';
import {
  Search,
  ChevronRight,
  Info,
  CircleCheck,
  RotateCcw,
  BookmarkPlus,
} from 'lucide-react';

export default function AdhkarPage() {
  const currentCategory = useAdhkarStore((s) => s.currentCategory);
  const setCategory = useAdhkarStore((s) => s.setCategory);

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {currentCategory ? (
          <motion.div
            key="category"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25 }}
          >
            <CategoryView
              category={currentCategory}
              onBack={() => setCategory(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Overview onSelect={setCategory} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Overview
// =============================================================================

function Overview({ onSelect }: { onSelect: (c: DhikrCategory) => void }) {
  const counts = useAdhkarStore((s) => s.counts);
  const increment = useAdhkarStore((s) => s.increment);
  const reset = useAdhkarStore((s) => s.reset);
  const [query, setQuery] = useState('');

  const allResults = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    const items = CATEGORIES.flatMap((c) => getAdhkarByCategory(c));
    return searchAdhkar(q, items);
  }, [query]);

  const groupedResults = useMemo(() => {
    if (!allResults || allResults.length === 0) return [];
    return CATEGORIES.map((category) => ({
      category,
      items: allResults.filter((d) => d.category === category),
    })).filter((g) => g.items.length > 0);
  }, [allResults]);

  return (
    <div className="space-y-5">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث في الأذكار: نص، عنوان، أو مصدر..."
        icon={<Search className="w-4 h-4" />}
        aria-label="البحث في الأذكار"
      />

      {groupedResults.length > 0 ? (
        <div className="space-y-6">
          {groupedResults.map(({ category, items }) => {
            const meta = CATEGORY_META[category];
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <meta.icon className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                  <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {meta.title}
                  </h2>
                  <Badge variant="secondary" size="sm">
                    {items.length}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => onSelect(category)}
                    className="ms-auto text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors"
                  >
                    عرض القسم
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((dhikr) => (
                    <AdhkarCard
                      key={dhikr.id}
                      dhikr={dhikr}
                      count={counts[dhikr.id] ?? 0}
                      onIncrement={() => increment(dhikr.id, dhikr.repeatCount)}
                      onReset={() => reset(dhikr.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : allResults ? (
        <EmptyState
          icon={<Search className="w-9 h-9" />}
          title="لا توجد نتائج"
          description="جرّب البحث بكلمات مختلفة"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const { completed, total } = getCategoryProgress(category, counts);
            return (
              <CategoryCard
                key={category}
                meta={meta}
                completed={completed}
                total={total}
                onSelect={() => onSelect(category)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Category view
// =============================================================================

function CategoryView({
  category,
  onBack,
}: {
  category: DhikrCategory;
  onBack: () => void;
}) {
  const meta = CATEGORY_META[category];
  const counts = useAdhkarStore((s) => s.counts);
  const increment = useAdhkarStore((s) => s.increment);
  const reset = useAdhkarStore((s) => s.reset);
  const resetCategory = useAdhkarStore((s) => s.resetCategory);
  const approvedCategory = useAdhkarApprovedStore((s) => s.approved);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Pull approved user-submitted content for this category so the dhikr list
  // merge below has data. Load is idempotent, never throws and only updates
  // the store when the fetched list actually changed — on a network failure the
  // bundled offline adhkar simply render without additions.
  useEffect(() => {
    void useAdhkarApprovedStore.getState().load();
  }, [category]);

  // Official (offline) items first, then APPROVED user submissions appended at
  // the end of the category — official content and hardcoded order stay intact.
  const categoryDhikrs = useMemo(
    () => [
      ...getAdhkarByCategory(category),
      ...getApprovedAdhkarForCategory(category, approvedCategory),
    ],
    [category, approvedCategory],
  );
  const { completed, total } = getCategoryProgress(category, counts);
  const allDone = total > 0 && completed === total;

  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors group"
      >
        <ChevronRight className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span className="text-sm font-medium">العودة لقائمة الأذكار</span>
      </button>

      {/* Header */}
      <Card padding="md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {meta.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {meta.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="md"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => resetCategory(category)}
              aria-label="تصفير القسم"
              title="تصفير القسم"
            >{''}</Button>
            <Button
              variant="ghost"
              size="md"
              icon={<BookmarkPlus className="w-4 h-4" />}
              onClick={() => setAddModalOpen(true)}
              aria-label="إضافة ذكر"
              title="إضافة ذكر"
            >{''}</Button>
          </div>
        </div>
      </Card>

      {/* Disclaimer for contextual categories */}
      {meta.disclaimer && (
        <Card padding="sm" className="border-amber-200 dark:border-amber-800/50">
          <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">{meta.disclaimer}</p>
          </div>
        </Card>
      )}

      {/* Progress */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            تم إنجاز {completed} من {total}
          </span>
          <span
            className={`text-sm font-semibold ${
              allDone
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {total > 0 ? Math.round((completed / total) * 100) : 0}%
          </span>
        </div>
        <ProgressBar
          value={completed}
          max={Math.max(1, total)}
          size="md"
          color={allDone ? 'success' : 'primary'}
        />
        {allDone && (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="w-4 h-4" />
            أتممت جميع أذكار هذا القسم
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {categoryDhikrs.map((dhikr: Dhikr) => (
          <AdhkarCard
            key={dhikr.id}
            dhikr={dhikr}
            count={counts[dhikr.id] ?? 0}
            onIncrement={() => increment(dhikr.id, dhikr.repeatCount)}
            onReset={() => reset(dhikr.id)}
          />
        ))}
      </div>

      <AddDhikrModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        categoryId={category}
        categoryTitle={meta.title}
      />
    </div>
  );
}