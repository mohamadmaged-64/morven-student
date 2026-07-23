import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  shortcut?: string;
  className?: string;
};

function SearchBar({
  value: controlledValue,
  onChange,
  onFocus,
  onBlur,
  placeholder = 'Search...',
  shortcut = 'Ctrl+K',
  className = '',
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleChange = (v: string) => {
    if (controlledValue === undefined) setInternalValue(v);
    onChange?.(v);
  };

  const handleClear = () => {
    handleChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={[
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200',
          'bg-gray-50 dark:bg-dark-surface',
          isFocused
            ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-dark-card'
            : 'border-light-border dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600',
        ].join(' ')}
        layout
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-gray-400 dark:text-gray-500"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
          aria-label="Search"
        />

        {value && (
          <button
            onClick={handleClear}
            className="p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {!value && shortcut && (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-dark-hover border border-light-border dark:border-dark-border rounded-md">
            {shortcut}
          </kbd>
        )}
      </motion.div>
    </div>
  );
}

export { SearchBar };
export type { SearchBarProps };
