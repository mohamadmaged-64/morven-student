import { LucideIcon } from "lucide-react";

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface Tool {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: LucideIcon;
  category: ToolCategory;
  isFavorite?: boolean;
  lastUsed?: number;
  comingSoon?: boolean;
}

export type ToolCategory =
  | 'pdf'
  | 'ai'
  | 'powerpoint'
  | 'video'
  | 'audio'
  | 'images'
  | 'qrcode'
  | 'general'
  | 'medical'
  | 'engineering';

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer | string;
  createdAt: number;
  toolUsed?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExamCountdown {
  id: string;
  name: string;
  date: string;
  color: string;
  createdAt: number;
}

export interface PomodoroSession {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ClipboardEntry {
  id: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
}

export interface MedicalNote {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string;
  difficulty: 'easy' | 'medium' | 'hard';
  nextReview: number;
  reviewCount: number;
  createdAt: number;
}
