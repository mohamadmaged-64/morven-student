import { create } from 'zustand';
import type { Theme } from '@/types';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('morven-theme') as Theme;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem('morven-theme', theme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('morven-theme', newTheme);
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
      return { theme: newTheme };
    });
  },
}));
