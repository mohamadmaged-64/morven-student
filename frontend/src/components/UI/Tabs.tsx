import { useState, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';

type Tab = {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

type TabsProps = {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'text-xs px-3 py-1.5 gap-1',
  md: 'text-sm px-4 py-2 gap-1.5',
  lg: 'text-base px-5 py-2.5 gap-2',
};

function Tabs({ tabs, activeTab, onChange, className = '', size = 'md' }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id ?? '');
  const activeTabId = activeTab ?? internalActive;
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const handleChange = (id: string) => {
    if (activeTab === undefined) setInternalActive(id);
    onChange?.(id);

    const el = tabRefs.current.get(id);
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  };

  const activeTabObj = tabs.find((t) => t.id === activeTabId);

  return (
    <div
      className={`relative ${className}`}
      role="tablist"
    >
      <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-dark-surface border border-light-border dark:border-dark-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={[
              'relative flex items-center justify-center font-medium rounded-lg transition-colors duration-200 z-10',
              sizeClasses[size],
              activeTabId === tab.id
                ? 'text-primary-700 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              tab.disabled && 'opacity-40 cursor-not-allowed',
            ].join(' ')}
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TabsWithIndicator({ tabs, activeTab: controlledActive, onChange, className = '', size = 'md' }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id ?? '');
  const activeTabId = controlledActive ?? internalActive;
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleChange = (id: string) => {
    if (controlledActive === undefined) setInternalActive(id);
    onChange?.(id);
  };

  const getIndicatorStyle = () => {
    const el = tabRefs.current.get(activeTabId);
    const container = tabsContainerRef.current;
    if (!el || !container) return { left: 0, width: 0 };
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return {
      left: elRect.left - containerRect.left,
      width: elRect.width,
    };
  };

  const indicator = getIndicatorStyle();

  return (
    <div className={`relative ${className}`} role="tablist">
      <div ref={tabsContainerRef} className="relative flex items-center gap-0 border-b border-light-border dark:border-dark-border">
        <motion.div
          className="absolute bottom-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full"
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={[
              'relative flex items-center justify-center font-medium transition-colors duration-200 pb-3',
              sizeClasses[size],
              activeTabId === tab.id
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              tab.disabled && 'opacity-40 cursor-not-allowed',
            ].join(' ')}
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-controls={`tabpanel-${activeTabId}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { Tabs, TabsWithIndicator };
export type { TabsProps, Tab };
