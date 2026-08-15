import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore } from '@/store/useLanguageStore';
import {
  getSurahText,
  getBasmala,
  getSurahById,
  getSurahList,
} from '@/data/quran';
import { Spinner } from '@/components/UI/Loading';
import { Card } from '@/components/UI/Card';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  History,
  ListOrdered,
} from 'lucide-react';
import type { Surah } from '@/types/quran';

export interface QuranScrollRequest {
  surahId: number;
  ayah: number;
  ts: number;
}

interface QuranReaderProps {
  surah: Surah | null;
  request: QuranScrollRequest | null;
  onOpenSurah: (surah: Surah, ayah: number) => void;
}

const LAST_KEY = 'morven-quran-last';
const BOOKMARKS_KEY = 'morven-quran-bookmarks';

interface LastPosition {
  surahId: number;
  ayah: number;
  date: number;
}

function getLastPosition(): LastPosition | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as LastPosition) : null;
  } catch {
    return null;
  }
}

function saveLastPosition(pos: LastPosition) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(pos));
  } catch {
    // ignore storage failures
  }
}

function getBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(list: string[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
  } catch {
    // ignore storage failures
  }
}

function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

export function QuranReader({ surah, request, onOpenSurah }: QuranReaderProps) {
  const { language } = useLanguageStore();
  const [text, setText] = useState<string[] | null>(null);
  const [basmala, setBasmala] = useState('');
  const [loadingText, setLoadingText] = useState(true);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [goTo, setGoTo] = useState('');

  const refs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setLoadingText(true);

    if (!surah) {
      setLoadingText(false);
      return;
    }

    void (async () => {
      const [surahText, basmalaText] = await Promise.all([
        getSurahText(surah.id),
        getBasmala(),
      ]);
      if (cancelled) return;
      setText(surahText);
      setBasmala(basmalaText);
      setLoadingText(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [surah]);

  useEffect(() => {
    if (!surah) return;
    const ayah =
      request && request.surahId === surah.id ? request.ayah : 1;
    saveLastPosition({ surahId: surah.id, ayah, date: Date.now() });
  }, [surah, request]);

  useEffect(() => {
    if (!request || !surah || request.surahId !== surah.id) return;
    const el = refs.current[request.ayah];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [request, surah, text]);

  const highlightAyah =
    request && surah && request.surahId === surah.id ? request.ayah : null;

  const toggleBookmark = (surahId: number, ayah: number) => {
    const key = `${surahId}:${ayah}`;
    setBookmarks((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      saveBookmarks(next);
      return next;
    });
  };

  const handleGoTo = () => {
    if (!surah || !text) return;
    const n = Number(goTo.trim());
    if (n >= 1 && n <= text.length) {
      onOpenSurah(surah, n);
      setGoTo('');
    }
  };

  const showBasmala = surah !== null && surah.id !== 1 && surah.id !== 9;
  const last = getLastPosition();
  const lastSurah = last ? getSurahById(last.surahId) : null;
  const bookmarkedSurahs = getSurahList();

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        {surah ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {language === 'ar' ? surah.nameAr : surah.name}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {surah.verses}{' '}
                    {language === 'ar' ? 'آية' : 'verses'}
                    {surah.juz && surah.juz.length > 0 ? (
                      <>
                        {' · '}
                        {language === 'ar' ? 'الجزء' : 'Juz'}{' '}
                        {surah.juz.join(', ')}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2" dir="rtl">
                <input
                  type="number"
                  min={1}
                  max={text?.length ?? 1}
                  value={goTo}
                  onChange={(e) => setGoTo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGoTo();
                  }}
                  placeholder={language === 'ar' ? 'رقم الآية' : 'Ayah #'}
                  className="w-24 px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
                <button
                  onClick={handleGoTo}
                  className="px-3 py-2 text-sm font-medium rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-all"
                >
                  {language === 'ar' ? 'انتقل' : 'Go'}
                </button>
              </div>
            </div>

            {loadingText || !text ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="w-7 h-7 text-primary-500" />
              </div>
            ) : (
              <div dir="rtl" className="text-right space-y-1">
                {showBasmala && basmala ? (
                  <p className="text-center text-2xl leading-[2.4] text-gray-800 dark:text-gray-100 py-3 mb-3 border-b border-light-border dark:border-dark-border">
                    {basmala}
                  </p>
                ) : null}

                {text.map((ayahText, idx) => {
                  const ayahNum = idx + 1;
                  const key = `${surah.id}:${ayahNum}`;
                  const isBookmarked = bookmarks.includes(key);
                  const isHighlighted = highlightAyah === ayahNum;

                  return (
                    <div
                      key={key}
                      ref={(el) => {
                        refs.current[ayahNum] = el;
                      }}
                      id={`ayah-${surah.id}-${ayahNum}`}
                      className={[
                        'group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300',
                        isHighlighted
                          ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-300/50 dark:ring-primary-700/40'
                          : 'hover:bg-gray-50 dark:hover:bg-dark-surface',
                      ].join(' ')}
                    >
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                        <button
                          onClick={() => toggleBookmark(surah.id, ayahNum)}
                          aria-label={
                            isBookmarked
                              ? language === 'ar'
                                ? 'إزالة العلامة'
                                : 'Remove bookmark'
                              : language === 'ar'
                                ? 'أضف علامة'
                                : 'Bookmark'
                          }
                          className={[
                            'p-1.5 rounded-lg transition-all',
                            isBookmarked
                              ? 'text-amber-500'
                              : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 focus:opacity-100',
                          ].join(' ')}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                        <span className="text-lg font-medium text-primary-600 dark:text-primary-400 tabular-nums">
                          ۝{toArabicDigits(ayahNum)}
                        </span>
                      </div>

                      <p className="flex-1 text-[1.35rem] leading-[2.3] text-gray-800 dark:text-gray-100">
                        {ayahText}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  {language === 'ar' ? 'قراءة القرآن' : 'Read the Quran'}
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {language === 'ar'
                    ? 'النص متاح محلياً ويُعرض بدون إنترنت'
                    : 'The text is available locally and works offline'}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {lastSurah ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200/60 dark:border-primary-800/40"
                >
                  <div className="flex items-center gap-2 mb-2 text-primary-700 dark:text-primary-300 text-sm font-medium">
                    <History className="w-4 h-4" />
                    {language === 'ar'
                      ? 'متابعة القراءة'
                      : 'Continue reading'}
                  </div>
                  <button
                    onClick={() =>
                      onOpenSurah(lastSurah, last!.ayah)
                    }
                    className="flex items-center justify-between w-full text-left px-4 py-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:shadow-card dark:hover:shadow-card-dark transition-all"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {language === 'ar' ? lastSurah.nameAr : lastSurah.name}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      {language === 'ar' ? 'الآية' : 'Verse'}{' '}
                      {toArabicDigits(last!.ayah)}
                    </span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {bookmarks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-300 text-sm font-medium">
                  <BookmarkCheck className="w-4 h-4 text-amber-500" />
                  {language === 'ar'
                    ? 'العلامات المحفوظة'
                    : 'Saved bookmarks'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {bookmarks.map((bm) => {
                    const [sid, ayah] = bm.split(':');
                    const s = bookmarkedSurahs.find(
                      (x) => x.id === Number(sid),
                    );
                    if (!s) return null;
                    return (
                      <button
                        key={bm}
                        onClick={() =>
                          onOpenSurah(s, Number(ayah))
                        }
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border hover:shadow-card dark:hover:shadow-card-dark transition-all"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {language === 'ar' ? s.nameAr : s.name}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">
                          ۝{toArabicDigits(Number(ayah))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!lastSurah && bookmarks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-dark-surface flex items-center justify-center mb-3">
                  <ListOrdered className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
                  {language === 'ar'
                    ? 'اختر سورة لعرض نصها كاملاً، أو استخدم البحث للانتقال إلى أي آية'
                    : 'Select a surah to read its full text, or use search to jump to any verse'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
