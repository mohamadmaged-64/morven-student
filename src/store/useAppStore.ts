import { create } from 'zustand';
import type { Tool, ToolCategory, Notification, FileItem, Task, ExamCountdown, Flashcard, ClipboardEntry } from '@/types';
import { v4 as uuid } from 'uuid';

interface AppStore {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Favorites
  favoriteTools: string[];
  toggleFavorite: (toolId: string) => void;

  // Recent tools
  recentTools: string[];
  addRecentTool: (toolId: string) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (msg: string, type: Notification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;

  // Clipboard
  clipboardHistory: ClipboardEntry[];
  addClipboardEntry: (content: string, type: ClipboardEntry['type']) => void;
  removeClipboardEntry: (id: string) => void;
  clearClipboard: () => void;

  // Files
  recentFiles: FileItem[];
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Tasks
  tasks: Task[];
  addTask: (title: string, description?: string, priority?: Task['priority'], dueDate?: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  // Exams
  exams: ExamCountdown[];
  addExam: (name: string, date: string, color: string) => void;
  updateExam: (id: string, updates: Partial<ExamCountdown>) => void;
  deleteExam: (id: string) => void;

  // Flashcards
  flashcards: Flashcard[];
  addFlashcard: (front: string, back: string, deck: string) => void;
  updateFlashcard: (id: string, updates: Partial<Flashcard>) => void;
  deleteFlashcard: (id: string) => void;

  // Active tool
  activeTool: string | null;
  setActiveTool: (toolId: string | null) => void;
}

const loadState = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(`morven-${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const saveState = (key: string, value: unknown) => {
  try {
    localStorage.setItem(`morven-${key}`, JSON.stringify(value));
  } catch {}
};

export const useAppStore = create<AppStore>((set, get) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  favoriteTools: loadState('favorites', []),
  toggleFavorite: (toolId) => {
    const current = get().favoriteTools;
    const next = current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId];
    saveState('favorites', next);
    set({ favoriteTools: next });
  },

  recentTools: loadState('recentTools', []),
  addRecentTool: (toolId) => {
    const current = get().recentTools.filter((id) => id !== toolId);
    const next = [toolId, ...current].slice(0, 20);
    saveState('recentTools', next);
    set({ recentTools: next });
  },

  notifications: [],
  addNotification: (message, type, duration = 3000) => {
    const id = uuid();
    set((s) => ({ notifications: [...s.notifications, { id, message, type, duration }] }));
    setTimeout(() => get().removeNotification(id), duration);
  },
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  clipboardHistory: loadState('clipboard', []),
  addClipboardEntry: (content, type) => {
    const entry: ClipboardEntry = { id: uuid(), content, timestamp: Date.now(), type };
    const next = [entry, ...get().clipboardHistory].slice(0, 50);
    saveState('clipboard', next);
    set({ clipboardHistory: next });
  },
  removeClipboardEntry: (id) => {
    const next = get().clipboardHistory.filter((e) => e.id !== id);
    saveState('clipboard', next);
    set({ clipboardHistory: next });
  },
  clearClipboard: () => {
    saveState('clipboard', []);
    set({ clipboardHistory: [] });
  },

  recentFiles: loadState('files', []),
  addFile: (file) => {
    const next = [file, ...get().recentFiles].slice(0, 30);
    saveState('files', next);
    set({ recentFiles: next });
  },
  removeFile: (id) => {
    const next = get().recentFiles.filter((f) => f.id !== id);
    saveState('files', next);
    set({ recentFiles: next });
  },
  clearFiles: () => {
    saveState('files', []);
    set({ recentFiles: [] });
  },

  tasks: loadState('tasks', []),
  addTask: (title, description, priority = 'medium', dueDate) => {
    const task: Task = {
      id: uuid(),
      title,
      description,
      completed: false,
      priority,
      dueDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [...get().tasks, task];
    saveState('tasks', next);
    set({ tasks: next });
  },
  updateTask: (id, updates) => {
    const next = get().tasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t));
    saveState('tasks', next);
    set({ tasks: next });
  },
  deleteTask: (id) => {
    const next = get().tasks.filter((t) => t.id !== id);
    saveState('tasks', next);
    set({ tasks: next });
  },
  toggleTask: (id) => {
    const next = get().tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
    saveState('tasks', next);
    set({ tasks: next });
  },

  exams: loadState('exams', []),
  addExam: (name, date, color) => {
    const exam: ExamCountdown = { id: uuid(), name, date, color, createdAt: Date.now() };
    const next = [...get().exams, exam];
    saveState('exams', next);
    set({ exams: next });
  },
  updateExam: (id, updates) => {
    const next = get().exams.map((e) => (e.id === id ? { ...e, ...updates } : e));
    saveState('exams', next);
    set({ exams: next });
  },
  deleteExam: (id) => {
    const next = get().exams.filter((e) => e.id !== id);
    saveState('exams', next);
    set({ exams: next });
  },

  flashcards: loadState('flashcards', []),
  addFlashcard: (front, back, deck) => {
    const card: Flashcard = {
      id: uuid(),
      front,
      back,
      deck,
      difficulty: 'medium',
      nextReview: Date.now(),
      reviewCount: 0,
      createdAt: Date.now(),
    };
    const next = [...get().flashcards, card];
    saveState('flashcards', next);
    set({ flashcards: next });
  },
  updateFlashcard: (id, updates) => {
    const next = get().flashcards.map((c) => (c.id === id ? { ...c, ...updates } : c));
    saveState('flashcards', next);
    set({ flashcards: next });
  },
  deleteFlashcard: (id) => {
    const next = get().flashcards.filter((c) => c.id !== id);
    saveState('flashcards', next);
    set({ flashcards: next });
  },

  activeTool: null,
  setActiveTool: (toolId) => set({ activeTool: toolId }),
}));
