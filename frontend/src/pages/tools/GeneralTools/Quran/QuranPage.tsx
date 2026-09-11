import { motion } from 'framer-motion';
import { useQuranStore } from '@/pages/tools/GeneralTools/Quran/quranStore';
import { Card } from '@/components/UI/Card';
import { Spinner } from '@/components/UI/Loading';
import { ReciterSelector } from '@/pages/tools/GeneralTools/Quran/ReciterSelector';
import { SurahSelector } from '@/pages/tools/GeneralTools/Quran/SurahSelector';
import { QuranPlayer } from '@/pages/tools/GeneralTools/Quran/QuranPlayer';
import { useQuranData } from '@/pages/tools/GeneralTools/Quran/quranApi';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button } from '@/components/UI/Button';
import { useEffect, useRef } from 'react';
import { Book, Headphones, AlertCircle, WifiOff } from 'lucide-react';

export default function QuranPage() {
  const { currentReciter, currentSurah, setReciter, setSurah } = useQuranStore();
  const { reciters, surahs, loading, error, refetch } = useQuranData();
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(!isOnline);

  useEffect(() => {
    if (wasOffline.current && isOnline) {
      refetch();
    }
    wasOffline.current = !isOnline;
  }, [isOnline, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8 text-primary-500" />
      </div>
    );
  }

  if (!isOnline) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <WifiOff className="w-12 h-12 text-amber-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            أنت غير متصل بالإنترنت
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md mb-4">
            يتطلب القرآن الكريم اتصالاً بالإنترنت لتحميل القراء والسور والاستماع إليها.
          </p>
          <Button onClick={refetch}>
            إعادة المحاولة
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            خطأ في التحميل
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md mb-4">{error}</p>
          <Button onClick={refetch}>
            إعادة المحاولة
          </Button>
        </div>
      </Card>
    );
  }

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
                القرآن الكريم
              </h1>

              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                استمع إلى القرآن الكريم مع عدة قراء
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
                <Headphones className="w-8 h-8 text-primary-500 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                اختر قارئاً وسورة
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
                اختر قارئاً وسورة من القائمة أعلاه لبدء الاستماع
              </p>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
