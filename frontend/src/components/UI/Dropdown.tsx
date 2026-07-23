import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type DropdownItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
};

type DropdownProps = {
  items: DropdownItem[];
  onSelect: (id: string) => void;
  trigger?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
  width?: 'auto' | 'sm' | 'md' | 'lg';
};

const widthClasses = {
  auto: '',
  sm: 'w-40',
  md: 'w-56',
  lg: 'w-72',
};

function Dropdown({
  items,
  onSelect,
  trigger,
  align = 'end',
  className = '',
  width = 'md',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const nonDisabledItems = items.filter((i) => !i.disabled && !i.divider);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => {
          let next = prev + 1;
          while (next < nonDisabledItems.length && nonDisabledItems[next]?.disabled) next++;
          return next >= nonDisabledItems.length ? 0 : next;
        });
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && nonDisabledItems[next]?.disabled) next--;
          return next < 0 ? nonDisabledItems.length - 1 : next;
        });
      }

      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const item = nonDisabledItems[activeIndex];
        if (item) {
          onSelect(item.id);
          close();
        }
      }
    };

    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, activeIndex, nonDisabledItems, onSelect, close]);

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={[
              'absolute z-50 mt-2 py-1.5 rounded-xl border overflow-hidden',
              'bg-white dark:bg-dark-card',
              'border-light-border dark:border-dark-border',
              'shadow-elevated',
              widthClasses[width],
              align === 'end' ? 'end-0' : 'start-0',
            ].join(' ')}
            role="menu"
            aria-orientation="vertical"
          >
            {items.map((item, index) => {
              if (item.divider) {
                return (
                  <div
                    key={item.id}
                    className="my-1.5 border-t border-light-border dark:border-dark-border"
                    role="separator"
                  />
                );
              }

              const itemIndex = nonDisabledItems.indexOf(item);

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      onSelect(item.id);
                      close();
                    }
                  }}
                  onMouseEnter={() => setActiveIndex(itemIndex)}
                  disabled={item.disabled}
                  className={[
                    'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-start transition-colors duration-100',
                    item.danger
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover',
                    activeIndex === itemIndex && !item.danger && 'bg-gray-50 dark:bg-dark-hover',
                    item.disabled && 'opacity-40 cursor-not-allowed',
                  ].join(' ')}
                  role="menuitem"
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Dropdown };
export type { DropdownProps, DropdownItem };
