import { create } from 'zustand';
import i18n from 'i18next';
import type { Language, Direction } from '@/types';

interface LanguageStore {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('morven-language') as Language;
    if (saved) return saved;
  }
  return 'en';
};

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: getInitialLanguage(),
  direction: getInitialLanguage() === 'ar' ? 'rtl' : 'ltr',
  setLanguage: (lang) => {
    localStorage.setItem('morven-language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    i18n.changeLanguage(lang);
    set({ language: lang, direction: lang === 'ar' ? 'rtl' : 'ltr' });
  },
  toggleLanguage: () => {
    set((state) => {
      const newLang = state.language === 'en' ? 'ar' : 'en';
      localStorage.setItem('morven-language', newLang);
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
      i18n.changeLanguage(newLang);
      return { language: newLang, direction: newLang === 'ar' ? 'rtl' : 'ltr' };
    });
  },
}));
