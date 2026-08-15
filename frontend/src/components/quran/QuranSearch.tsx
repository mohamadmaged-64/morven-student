import { useEffect, useMemo, useState } from 'react';
import { useLanguageStore } from '@/store/useLanguageStore';
import { searchQuran, getSurahById } from '@/data/quran';
import type { QuranSearchResult } from '@/data/quran';
import { Card } from '@/components/UI/Card';
import { Spinner } from '@/components/UI/Loading';
import { Search, ArrowLeft, FileSearch } from 'lucide-react';
import type { Surah } from '@/types/quran';

interface QuranSearchProps {
  onOpenSurah: (surah: Surah, ayah: number) => void;
}

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

export function QuranSearch({ onOpenSurah }: QuranSearchProps) {
  const { language } = useLanguageStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuranSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      setSearched(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        const found = await searchQuran(trimmed, 15);
        if (cancelled) return;
        setResults(found);
        setSearching(false);
        setSearched(true);
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              {language === 'ar' ? 'بحث في القرآن الكريم' : 'Search the Quran'}
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {language === 'ar'
                ? 'يبحث في النص المحلي ويعمل بدون إنترنت'
                : 'Searches the local text and works offline'}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              language === 'ar'
                ? 'ابحث عن آية أو كلمة...'
                : 'Search for a verse or word...'
            }
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>

        {searching && (
          <div className="flex items-center justify-center py-6">
            <Spinner className="w-6 h-6 text-primary-500" />
          </div>
        )}

        {!searching && searched && results && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileSearch className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {language === 'ar'
                ? 'لا توجد نتائج مطابقة'
                : 'No matching verses found'}
            </p>
          </div>
        )}

        {!searching && searched && results && results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto overscroll-contain">
            {results.map((r) => {
              const surah = getSurahById(r.surahId);
              return (
                <button
                  key={`${r.surahId}:${r.ayah}`}
                  onClick={() => {
                    if (surah) onOpenSurah(surah, r.ayah);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border hover:shadow-card dark:hover:shadow-card-dark transition-all text-left"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                      {language === 'ar' ? r.surahNameAr : r.surahName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      ۝{toArabicDigits(r.ayah)}
                    </span>
                  </div>
                  <p
                    dir="rtl"
                    className="flex-1 text-right text-base leading-[1.9] text-gray-700 dark:text-gray-300 line-clamp-3"
                  >
                    {r.text}
                  </p>
                  <ArrowLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
