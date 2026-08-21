import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuranStore } from '@/store/quranStore';
import { ProgressBar } from './ProgressBar';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Surah } from '@/types/quran';

interface QuranPlayerProps {
  surahs: Surah[];
}

export function QuranPlayer({ surahs }: QuranPlayerProps) {
  const {
    currentReciter,
    currentSurah,
    isPlaying,
    volume,
    duration,
    currentTime,
    play,
    pause,
    seek,
    setVolume,
    setSurah,
  } = useQuranStore();

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
          {currentSurah.name}
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {currentReciter.name}
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
          aria-label="السابق"
        >
          <SkipBack className="w-5 h-5" />
        </button>

       

        <motion.button
          onClick={isPlaying ? pause : play}
          className="p-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </motion.button>

        <button
          onClick={handleNext}
          disabled={surahs.findIndex((s) => s.id === currentSurah.id) >= surahs.length - 1}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface hover:text-gray-700 dark:hover:text-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="التالي"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      
    </motion.div>
  );
}
