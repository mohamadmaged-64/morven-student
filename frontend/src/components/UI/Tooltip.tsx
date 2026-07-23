import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  content: ReactNode;
  position?: TooltipPosition;
  children: ReactNode;
  className?: string;
  delay?: number;
};

const positionStyles: Record<TooltipPosition, { className: string; offset: string }> = {
  top: {
    className: 'bottom-full start-1/2 -translate-x-1/2 mb-2',
    offset: 'top-full start-1/2 -translate-x-1/2',
  },
  bottom: {
    className: 'top-full start-1/2 -translate-x-1/2 mt-2',
    offset: 'bottom-full start-1/2 -translate-x-1/2',
  },
  left: {
    className: 'end-full top-1/2 -translate-y-1/2 me-2',
    offset: 'start-full top-1/2 -translate-y-1/2',
  },
  right: {
    className: 'start-full top-1/2 -translate-y-1/2 ms-2',
    offset: 'end-full top-1/2 -translate-y-1/2',
  },
};

function Tooltip({
  content,
  position = 'top',
  children,
  className = '',
  delay = 300,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const pos = positionStyles[position];

  return (
    <div className={`relative inline-flex ${className}`} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg pointer-events-none whitespace-nowrap ${pos.className}`}
            role="tooltip"
          >
            {content}
            <div className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 ${pos.offset}`} style={{ margin: '-4px' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Tooltip };
export type { TooltipProps, TooltipPosition };
