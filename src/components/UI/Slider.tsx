import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

type SliderProps = {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
  minLabel?: string;
  maxLabel?: string;
};

function Slider({
  min = 0,
  max = 100,
  step = 1,
  value: controlledValue,
  onChange,
  label,
  showValue = true,
  disabled = false,
  className = '',
  minLabel,
  maxLabel,
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(min);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const trackRef = useRef<HTMLDivElement>(null);

  const percent = ((value - min) / (max - min)) * 100;

  const calculateValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step, value],
  );

  const handleChange = (newValue: number) => {
    if (controlledValue === undefined) setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (disabled) return;
    handleChange(calculateValue(e.clientX));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    let newValue = value;

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      newValue = Math.min(max, value + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      newValue = Math.max(min, value - step);
    } else if (e.key === 'Home') {
      newValue = min;
    } else if (e.key === 'End') {
      newValue = max;
    } else {
      return;
    }

    e.preventDefault();
    handleChange(newValue);
  };

  const handleThumbDrag = (e: React.PointerEvent) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      handleChange(calculateValue(ev.clientX));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 tabular-nums">
              {value}
            </span>
          )}
        </div>
      )}

      <div
        ref={trackRef}
        className="relative w-full h-6 flex items-center cursor-pointer"
        onClick={handleTrackClick}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label || 'Slider'}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <div className="relative w-full h-1.5 rounded-full bg-gray-200 dark:bg-dark-border">
          <motion.div
            className="absolute h-full rounded-full bg-primary-500"
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0 }}
          />
        </div>

        <motion.div
          className={[
            'absolute w-5 h-5 rounded-full bg-white border-2 border-primary-500 shadow-md',
            'cursor-grab active:cursor-grabbing',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            disabled && 'opacity-50 cursor-not-allowed',
          ].join(' ')}
          style={{ left: `calc(${percent}% - 10px)` }}
          onPointerDown={handleThumbDrag}
          whileHover={disabled ? undefined : { scale: 1.2 }}
          whileTap={disabled ? undefined : { scale: 0.95 }}
        />
      </div>

      {(minLabel || maxLabel) && (
        <div className="flex items-center justify-between mt-1">
          {minLabel && <span className="text-xs text-gray-400 dark:text-gray-500">{minLabel}</span>}
          {maxLabel && <span className="text-xs text-gray-400 dark:text-gray-500">{maxLabel}</span>}
        </div>
      )}
    </div>
  );
}

export { Slider };
export type { SliderProps };
