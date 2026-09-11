import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic2, Search, ChevronDown } from 'lucide-react';
import type { Reciter } from '@/pages/tools/GeneralTools/Quran/quran';

interface ReciterSelectorProps {
  reciters: Reciter[];
  currentReciter: Reciter | null;
  onSelect: (reciter: Reciter) => void;
}

export function ReciterSelector({
  reciters,
  currentReciter,
  onSelect,
}: ReciterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return reciters;

    const q = search.toLowerCase();

    return reciters.filter(
      (r) =>
        r.name.toLowerCase().includes(q),
    );
  }, [reciters, search]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Mic2 className="w-4 h-4" />
        القارئ
      </label>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={[
            'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border',
            currentReciter
              ? 'bg-white dark:bg-dark-card border-light-border dark:border-dark-border'
              : 'bg-gray-50 dark:bg-dark-surface border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500',
          ].join(' ')}
        >
          <span>
            {currentReciter
              ? currentReciter.name
              : 'اختر القارئ'}
          </span>

          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-lg overflow-hidden"
            >
              <div className="p-3 border-b border-light-border dark:border-dark-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث عن قارئ..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto overscroll-contain">
                {filtered.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
                    لا توجد نتائج
                  </div>
                ) : (
                  <div className="p-1">
                    {filtered.map((reciter) => {
                      const isActive =
                        currentReciter?.id === reciter.id;

                      return (
                        <button
                          key={reciter.id}
                          onClick={() => {
                            onSelect(reciter);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={[
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-surface',
                          ].join(' ')}
                        >
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-surface text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                            <Mic2 className="w-4 h-4" />
                          </span>

                          <div className="flex-1 text-left">
                            <div className="font-medium">
                              {reciter.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}