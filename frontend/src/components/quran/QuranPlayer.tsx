import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useQuranStore } from '@/store/quranStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ProgressBar } from './ProgressBar';
import { ProgressBar as DownloadBar } from '@/components/UI/Loading';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  CheckCircle2,
  X,
  RotateCw,
  WifiOff,
} from 'lucide-react';
import type { Surah } from '@/types/quran';

interface QuranPlayerProps {
  surahs: Surah[];
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
}

export function QuranPlayer({ surahs }: QuranPlayerProps) {
  const { language } = useLanguageStore();
  const isOnline = useOnlineStatus();
  const {
    currentReciter,
    currentSurah,
    isPlaying,
    volume,
    duration,
    currentTime,
    downloads,
    audioUnavailable,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setSurah,
    download,
    cancelDownload,
    removeDownload,
  } = useQuranStore();

  const key =
    currentReciter && currentSurah
      ? `${currentReciter.id}:${currentSurah.id}`
      : '';
  const dl = key ? downloads[key] : undefined;

  const handlePrevious = useCallback(() => {
    if (!currentSurah || surahs.length === 0) return;
    const idx = surahs.findIndex((s) => s.id === currentSurah.id);
    if (idx > 0) {
      setSurah(surahs[idx - 1]);
    }
  }, [currentSurah, surahs, setSurah]);

  const handleNext = useCallback(() => {
    if (!currentSurah || surahs.length === 0) return;
    const idx = surahs.findIndex((s) => s.id === currentSurah.id);
    if (idx < surahs.length - 1) {
      setSurah(surahs[idx + 1]);
    }
  }, [currentSurah, surahs, setSurah]);

  if (!currentReciter || !currentSurah) {
    return null;
  }

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 0.8);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: 'spring' }}
      className="bg-white dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border shadow-card dark:shadow-card-dark p-6 space-y-5"
    >
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
          {language === 'ar' ? currentSurah.nameAr : currentSurah.name}
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {language === 'ar' ? currentReciter.nameAr : currentReciter.name}
        </p>
      </div>

      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
      />

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handlePrevious}
          disabled={surahs.findIndex((s) => s.id === currentSurah.id) <= 0}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface hover:text-gray-700 dark:hover:text-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={language === 'ar' ? 'السابق' : 'Previous'}
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <motion.button
          onClick={isPlaying ? pause : play}
          disabled={!isOnline && !dl}
          className="p-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isPlaying ? (language === 'ar' ? 'إيقاف مؤقت' : 'Pause') : (language === 'ar' ? 'تشغيل' : 'Play')}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </motion.button>

        <button
          onClick={handleNext}
          disabled={surahs.findIndex((s) => s.id === currentSurah.id) >= surahs.length - 1}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface hover:text-gray-700 dark:hover:text-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={language === 'ar' ? 'التالي' : 'Next'}
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      <div className="border-t border-light-border dark:border-dark-border pt-4 space-y-3">
        {audioUnavailable && !isOnline ? (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200/70 dark:border-amber-800/40 text-amber-700 dark:text-amber-300">
            <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              {language === 'ar'
                ? 'هذه التلاوة غير متاحة بدون اتصال. قم بتحميلها أثناء الاتصال بالإنترنت.'
                : 'This recitation is not available offline. Download it while you are connected to the internet.'}
            </p>
          </div>
        ) : null}

        {isOnline && !dl ? (
          <button
            onClick={() => download(currentReciter!, currentSurah!)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-surface dark:text-gray-200 dark:hover:bg-dark-hover border border-light-border dark:border-dark-border transition-all"
          >
            <Download className="w-4 h-4" />
            {language === 'ar'
              ? 'تحميل للاستماع بدون إنترنت'
              : 'Download for offline listening'}
          </button>
        ) : null}

        {dl?.status === 'downloading' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {language === 'ar' ? 'جاري التحميل...' : 'Downloading...'}
              </span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">
                {dl.progress != null
                  ? `${Math.round(dl.progress * 100)}%`
                  : '...'}
              </span>
            </div>
            <DownloadBar
              value={dl.progress != null ? dl.progress * 100 : 0}
              color="primary"
              size="sm"
            />
            <button
              onClick={() => cancelDownload(dl.key)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              {language === 'ar' ? 'إلغاء التحميل' : 'Cancel download'}
            </button>
          </div>
        ) : null}

        {dl?.status === 'done' ? (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200/70 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium truncate">
                {language === 'ar'
                  ? 'متاحة بدون إنترنت'
                  : 'Available offline'}{' '}
                · {formatSize(dl.size)}
              </span>
            </div>
            <button
              onClick={() => void removeDownload(dl.key)}
              aria-label={language === 'ar' ? 'حذف التحميل' : 'Delete download'}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {dl?.status === 'error' ? (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200/70 dark:border-red-800/40 text-red-700 dark:text-red-300">
            <span className="text-sm">
              {language === 'ar' ? 'فشل التحميل' : 'Download failed'}
            </span>
            <button
              onClick={() => download(currentReciter!, currentSurah!)}
              className="flex items-center gap-1.5 text-xs font-medium hover:underline"
            >
              <RotateCw className="w-3.5 h-3.5" />
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
