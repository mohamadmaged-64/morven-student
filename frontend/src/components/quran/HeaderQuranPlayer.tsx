import type { KeyboardEvent, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useLanguageStore } from '@/store/useLanguageStore';
import { useQuranStore } from '@/store/quranStore';
import { useQuranData } from '@/services/quranApi';

export function HeaderQuranPlayer() {
  const navigate = useNavigate();

  const { language } = useLanguageStore();
  const { surahs } = useQuranData();
  const { currentSurah, currentReciter, isPlaying, play, pause, setSurah } =
    useQuranStore();

  const hasSelection = Boolean(currentSurah && currentReciter);

  const openQuran = () => navigate('/tool/holy-quran');

  const handlePrevious = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!hasSelection) {
      openQuran();
      return;
    }

    if (surahs.length === 0) return;

    const idx = surahs.findIndex((s) => s.id === currentSurah?.id);
    if (idx > 0) {
      setSurah(surahs[idx - 1]);
    }
  };

  const handleNext = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!hasSelection) {
      openQuran();
      return;
    }

    if (surahs.length === 0) return;

    const idx = surahs.findIndex((s) => s.id === currentSurah?.id);
    if (idx < surahs.length - 1) {
      setSurah(surahs[idx + 1]);
    }
  };

  const handlePlayPause = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!hasSelection) {
      openQuran();
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'BUTTON') return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openQuran();
    }
  };

  return (
  <motion.div
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    onClick={openQuran}
    role="button"
    tabIndex={0}
    onKeyDown={handleKeyDown}
    className="
      group hidden lg:flex
      h-[52px] w-[215px] shrink-0
      flex-row items-center justify-between
      rounded-full border border-light-border dark:border-dark-border
      bg-white/70 dark:bg-dark-card/70 backdrop-blur-xl
      px-3 shadow-soft dark:shadow-none
      cursor-pointer transition-colors
      hover:bg-light-hover dark:hover:bg-dark-hover
    "
  >
    {/* Text */}
    <div className="min-w-0 flex-1 text-start">
      {hasSelection ? (
        <>
          <p className="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">
            {language === 'ar' ? currentSurah?.nameAr : currentSurah?.name}
          </p>

          <p className="truncate text-[11px] leading-tight text-gray-500 dark:text-gray-400">
            {language === 'ar'
              ? currentReciter?.nameAr
              : currentReciter?.name}
          </p>
        </>
      ) : (
        <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
          {language === 'ar' ? 'ابدأ التلاوة' : 'Start Recitation'}
        </p>
      )}
    </div>

    {/* Controls */}
    <div className="flex items-center gap-0.5">
      <button
        onClick={handlePrevious}
        aria-label={language === 'ar' ? 'السورة السابقة' : 'Previous Surah'}
        className="
          flex h-7 w-7 items-center justify-center rounded-full
          text-gray-500 dark:text-gray-400
          transition-colors
          hover:bg-black/5 dark:hover:bg-white/10
          hover:text-gray-800 dark:hover:text-white
        "
      >
        <SkipBack className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={handlePlayPause}
        aria-label={language === 'ar' ? 'تشغيل / إيقاف' : 'Play / Pause'}
        className="
          flex h-9 w-9 items-center justify-center rounded-full
          bg-primary-500 text-white
          shadow-lg shadow-primary-500/20
          transition-all
          hover:scale-105 active:scale-95
        "
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ltr:ml-0.5 rtl:mr-0.5" />
        )}
      </button>

      <button
        onClick={handleNext}
        aria-label={language === 'ar' ? 'السورة التالية' : 'Next Surah'}
        className="
          flex h-7 w-7 items-center justify-center rounded-full
          text-gray-500 dark:text-gray-400
          transition-colors
          hover:bg-black/5 dark:hover:bg-white/10
          hover:text-gray-800 dark:hover:text-white
        "
      >
        <SkipForward className="h-3.5 w-3.5" />
      </button>
    </div>
  </motion.div>
);
}