import { motion } from 'framer-motion';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useQuranStore } from '@/store/quranStore';
import { Card } from '@/components/UI/Card';
import { ReciterSelector } from '@/components/quran/ReciterSelector';
import { SurahSelector } from '@/components/quran/SurahSelector';
import { QuranPlayer } from '@/components/quran/QuranPlayer';
import { QuranReader } from '@/components/quran/QuranReader';
import type { QuranScrollRequest } from '@/components/quran/QuranReader';
import { QuranSearch } from '@/components/quran/QuranSearch';
import { DownloadedSurahs } from '@/components/quran/DownloadedSurahs';
import { useQuranData } from '@/services/quranApi';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useEffect, useRef, useState } from 'react';
import { Book, Headphones, AlertCircle, WifiOff } from 'lucide-react';
import type { Surah } from '@/types/quran';

export default function QuranPage() {
  const { language } = useLanguageStore();
  const { currentReciter, currentSurah, setReciter, setSurah } = useQuranStore();
  const { reciters, surahs, error, refetch } = useQuranData();
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(!isOnline);
  const [request, setRequest] = useState<QuranScrollRequest | null>(null);

  useEffect(() => {
    if (wasOffline.current && isOnline) {
      refetch();
    }
    wasOffline.current = !isOnline;
  }, [isOnline, refetch]);

  const handleOpenSurah = (surah: Surah, ayah: number) => {
    setSurah(surah);
    setRequest({ surahId: surah.id, ayah, ts: Date.now() });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center justify-center text-center gap-4 py-2">
            <div className="w-12 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Book className="w-6 h-6" />
            </div>

            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'ar' ? 'القرآن الكريم' : 'Holy Quran'}
              </h1>

              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                {language === 'ar'
                  ? 'اقرأ واستمع إلى القرآن الكريم مع عدة قراء'
                  : 'Read and listen to the Holy Quran with multiple reciters.'}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {!isOnline ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card padding="sm">
            <div className="flex items-start gap-3 p-1">
              <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {language === 'ar'
                  ? 'أنت غير متصل بالإنترنت. يتوفر نص القرآن الكريم والبحث والتلاوات المحملة فقط.'
                  : 'You are offline. Quran text, search, and downloaded recitations are available.'}
              </p>
            </div>
          </Card>
        </motion.div>
      ) : null}

      {error && isOnline ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card padding="sm">
            <div className="flex items-center gap-3 p-1">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">
                {language === 'ar'
                  ? 'تعذر تحميل قائمة القراء. يمكنك القراءة والبحث بدونها.'
                  : 'Failed to load the reciter list. You can still read and search.'}
              </p>
              <button
                onClick={refetch}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover transition-all"
              >
                {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
              </button>
            </div>
          </Card>
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <SurahSelector
          surahs={surahs}
          currentSurah={currentSurah}
          onSelect={setSurah}
        />

        <ReciterSelector
          reciters={reciters}
          currentReciter={currentReciter}
          onSelect={setReciter}
        />
      </motion.div>

      {currentReciter && currentSurah && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <QuranPlayer surahs={surahs} />
        </motion.div>
      )}

      {!currentReciter || !currentSurah ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
                <Headphones className="w-8 h-8 text-primary-500 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ar' ? 'اختر قارئاً وسورة' : 'Select a Reciter & Surah'}
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
                {language === 'ar'
                  ? 'اختر قارئاً وسورة من القائمة أعلاه لبدء الاستماع'
                  : 'Choose a reciter and a surah from the options above to start listening'}
              </p>
            </div>
          </Card>
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <QuranReader
          surah={currentSurah}
          request={request}
          onOpenSurah={handleOpenSurah}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <QuranSearch onOpenSurah={handleOpenSurah} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <DownloadedSurahs />
      </motion.div>
    </div>
  );
}
