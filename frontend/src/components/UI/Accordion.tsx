import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type AccordionItem = {
  id: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  defaultOpen?: boolean;
};

type AccordionProps = {
  items: AccordionItem[];
  multiple?: boolean;
  className?: string;
};

function AccordionItemComponent({
  item,
  isOpen,
  onToggle,
}: {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-light-border dark:border-dark-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        disabled={item.disabled}
        className={[
          'w-full flex items-center justify-between px-5 py-4 text-start transition-colors duration-200',
          'hover:bg-gray-50 dark:hover:bg-dark-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'bg-gray-50/50 dark:bg-dark-hover/50',
        ].join(' ')}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {item.icon && <span className="text-gray-400 dark:text-gray-500">{item.icon}</span>}
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {item.title}
          </span>
        </div>
        <motion.svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400 dark:text-gray-500 shrink-0 ms-2"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {item.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Accordion({ items, multiple = false, className = '' }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    items.forEach((item) => {
      if (item.defaultOpen) ids.add(item.id);
    });
    return ids;
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <AccordionItemComponent
          key={item.id}
          item={item}
          isOpen={openIds.has(item.id)}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  );
}

export { Accordion };
export type { AccordionProps, AccordionItem };
