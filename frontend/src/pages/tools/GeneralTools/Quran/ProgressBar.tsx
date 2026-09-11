import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const calculateTime = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || duration <= 0) return 0;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );

      return ratio * duration;
    },
    [duration]
  );

  const handleTrackClick = (e: React.MouseEvent) => {
    onSeek(calculateTime(e.clientX));
  };

  const handleThumbDrag = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      onSeek(calculateTime(ev.clientX));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
        {formatTime(currentTime)}
      </span>

      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="group relative flex flex-1 h-5 cursor-pointer items-center"
      >
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-border">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-primary-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.08 }}
          />
        </div>

        <motion.div
          className="absolute h-3 w-3 rounded-full bg-primary-500 shadow-md opacity-0 group-hover:opacity-100"
          style={{ left: `calc(${progress}% - 6px)` }}
          onPointerDown={handleThumbDrag}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        />
      </div>

      <span className="w-10 text-right text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
        {formatTime(duration)}
      </span>
    </div>
  );
}