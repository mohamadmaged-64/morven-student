import { useEffect } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key: string[] = [];
      if (e.ctrlKey || e.metaKey) key.push('ctrl');
      if (e.shiftKey) key.push('shift');
      if (e.altKey) key.push('alt');
      key.push(e.key.toLowerCase());
      const combo = key.join('+');
      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
