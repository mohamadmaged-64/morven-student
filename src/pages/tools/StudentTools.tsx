import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Modal,
  Input,
  TextArea,
  Select,
  EmptyState,
  Badge,
  Tabs,
  Tooltip,
  Chip,
  ProgressBar,
} from '@/components/UI';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import type { Task, ExamCountdown } from '@/types';

// =============================================================================
// Shared
// =============================================================================

interface StudentToolPageProps {
  toolId: string;
}
export function StudentToolPage({ toolId }: StudentToolPageProps) {
  const navigate = useNavigate();
  const { direction } = useLanguageStore();

  let content: React.ReactNode;

  switch (toolId) {
    case 'pomodoro':
      content = <PomodoroTimer />;
      break;

    case 'task-manager':
      content = <TaskManager />;
      break;

    case 'exam-countdown':
      content = <ExamCountdownPage />;
      break;

    default:
      return (
        <EmptyState
          icon={<span className="text-4xl">🔧</span>}
          title="Tool Not Found"
          description="This tool is not available yet."
        />
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/category/student')}
        className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors group"
      >
        <svg
          className={`w-5 h-5 transition-transform ${
            direction === 'rtl'
              ? 'rotate-180 group-hover:translate-x-1'
              : 'group-hover:-translate-x-1'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>

        <span className="text-sm font-medium">
          {direction === 'rtl'
            ? 'العودة للأدوات الطلابية'
            : 'Back to Student Tools'}
        </span>
      </button>

      {content}
    </div>
  );
}

 



// =============================================================================
// 1. POMODORO TIMER
// =============================================================================

type PomodoroMode = 'work' | 'break' | 'longBreak';

interface PomodoroSettings {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
};

const POMODORO_STORAGE_KEY = 'morven-pomodoro-settings';

function loadPomodoroSettings(): PomodoroSettings {
  try {
    const saved = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function savePomodoroSettings(settings: PomodoroSettings) {
  try {
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🍅' });
  }
}

const modeColors: Record<PomodoroMode, { ring: string; bg: string; text: string; glow: string; label: string }> = {
  work: {
    ring: 'stroke-blue-500',
    bg: 'from-blue-500 to-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-500/30',
    label: 'Work',
  },
  break: {
    ring: 'stroke-emerald-500',
    bg: 'from-emerald-500 to-emerald-600',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-emerald-500/30',
    label: 'Break',
  },
  longBreak: {
    ring: 'stroke-purple-500',
    bg: 'from-purple-500 to-purple-600',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-500/30',
    label: 'Long Break',
  },
};

function PomodoroTimer() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { addNotification } = useAppStore();

  const [settings, setSettings] = useState<PomodoroSettings>(loadPomodoroSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [currentMode, setCurrentMode] = useState<PomodoroMode>('work');
  const [sessionCount, setSessionCount] = useState(0);
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);

  const totalDuration = (() => {
    switch (currentMode) {
      case 'work': return settings.workDuration * 60;
      case 'break': return settings.breakDuration * 60;
      case 'longBreak': return settings.longBreakDuration * 60;
    }
  })();

  const [timeRemaining, setTimeRemaining] = useState(totalDuration);
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef<PomodoroMode>(currentMode);

  useEffect(() => { modeRef.current = currentMode; }, [currentMode]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const switchMode = useCallback((mode: PomodoroMode, resetTimer = true) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setCurrentMode(mode);
    if (resetTimer) {
      switch (mode) {
        case 'work': setTimeRemaining(settings.workDuration * 60); break;
        case 'break': setTimeRemaining(settings.breakDuration * 60); break;
        case 'longBreak': setTimeRemaining(settings.longBreakDuration * 60); break;
      }
    }
  }, [settings]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsRunning(false);
          playNotificationSound();
          const mode = modeRef.current;

          if (mode === 'work') {
            const newCount = sessionCount + 1;
            setSessionCount(newCount);
            setTotalWorkSeconds(prev => prev + settings.workDuration * 60);
            sendBrowserNotification(t('pomodoro.timeUp'), t('pomodoro.breakTime'));

            if (newCount >= settings.sessionsUntilLongBreak) {
              setSessionCount(0);
              switchMode('longBreak', true);
            } else {
              switchMode('break', true);
            }
          } else {
            sendBrowserNotification(t('pomodoro.timeUp'), t('pomodoro.workTime'));
            switchMode('work', true);
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, sessionCount, settings, switchMode, t]);

  useEffect(() => {
    setTimeRemaining(totalDuration);
  }, [totalDuration]);

  const handleStart = () => {
    requestNotificationPermission();
    setIsRunning(true);
  };
  const handlePause = () => setIsRunning(false);
  const handleResume = () => { requestNotificationPermission(); setIsRunning(true); };
  const handleReset = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsRunning(false);
    setTimeRemaining(totalDuration);
  };
  const handleSkip = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsRunning(false);
    if (currentMode === 'work') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      setTotalWorkSeconds(prev => prev + timeRemaining);
      if (newCount >= settings.sessionsUntilLongBreak) {
        setSessionCount(0);
        switchMode('longBreak');
      } else {
        switchMode('break');
      }
    } else {
      switchMode('work');
    }
  };

  const handleSaveSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    savePomodoroSettings(newSettings);
    if (!isRunning) {
      switch (currentMode) {
        case 'work': setTimeRemaining(newSettings.workDuration * 60); break;
        case 'break': setTimeRemaining(newSettings.breakDuration * 60); break;
        case 'longBreak': setTimeRemaining(newSettings.longBreakDuration * 60); break;
      }
    }
    addNotification(t('ui.saved'), 'success');
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;
  const modeColor = modeColors[currentMode];
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTotalTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const modeLabel = (() => {
    switch (currentMode) {
      case 'work': return t('pomodoro.work');
      case 'break': return t('pomodoro.break');
      case 'longBreak': return t('pomodoro.longBreak');
    }
  })();

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      {/* Timer Display */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="relative w-72 h-72 md:w-80 md:h-80">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            <circle
              cx="130" cy="130" r="120"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-200 dark:text-gray-700"
            />
            <motion.circle
              cx="130" cy="130" r="120"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={modeColor.ring}
              stroke="currentColor"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>

          <motion.div
            className={`absolute inset-4 rounded-full flex flex-col items-center justify-center bg-white dark:bg-dark-card shadow-lg ${isRunning ? `shadow-xl ${modeColor.glow}` : ''}`}
            animate={isRunning ? { boxShadow: [`0 0 20px 0px rgba(0,0,0,0.1)`, `0 0 40px 4px ${currentMode === 'work' ? 'rgba(59,130,246,0.2)' : currentMode === 'break' ? 'rgba(16,185,129,0.2)' : 'rgba(168,85,247,0.2)'}`, `0 0 20px 0px rgba(0,0,0,0.1)`] } : {}}
            transition={isRunning ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={modeColor.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`text-sm font-semibold uppercase tracking-wider ${modeColor.text} mb-1`}
              >
                {modeLabel}
              </motion.span>
            </AnimatePresence>

            <span className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-white font-mono tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>

            <span className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {t('pomodoro.sessionCount', { current: Math.min(sessionCount + 1, settings.sessionsUntilLongBreak), total: settings.sessionsUntilLongBreak })}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        className="flex items-center gap-3 flex-wrap justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {!isRunning && timeRemaining === totalDuration && (
          <Button size="lg" onClick={handleStart}>
            {t('pomodoro.start')}
          </Button>
        )}
        {isRunning && (
          <Button size="lg" variant="secondary" onClick={handlePause}>
            {t('pomodoro.pause')}
          </Button>
        )}
        {!isRunning && timeRemaining < totalDuration && timeRemaining > 0 && (
          <Button size="lg" onClick={handleResume}>
            {t('ui.resume')}
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={handleReset}>
          {t('pomodoro.reset')}
        </Button>
        <Button size="lg" variant="ghost" onClick={handleSkip}>
          {t('pomodoro.skip')}
        </Button>
        <Button size="lg" variant="ghost" onClick={() => setShowSettings(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="flex items-center gap-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{sessionCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('pomodoro.totalSessions')}</p>
        </div>
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
        <div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatTotalTime(totalWorkSeconds)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('pomodoro.totalWorkTime')}</p>
        </div>
      </motion.div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-dark-surface">
        {(['work', 'break', 'longBreak'] as PomodoroMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => { if (!isRunning) switchMode(mode); }}
            disabled={isRunning}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              currentMode === mode
                ? `bg-white dark:bg-dark-card shadow-md text-gray-800 dark:text-white`
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            } ${isRunning && currentMode !== mode ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {(() => {
              switch (mode) {
                case 'work': return t('pomodoro.work');
                case 'break': return t('pomodoro.break');
                case 'longBreak': return t('pomodoro.longBreak');
              }
            })()}
          </button>
        ))}
      </div>

      {/* Settings Modal */}
      <PomodoroSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

function PomodoroSettingsModal({
  open, onClose, settings, onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: PomodoroSettings;
  onSave: (s: PomodoroSettings) => void;
}) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(settings);

  useEffect(() => { setLocal(settings); }, [settings]);

  return (
    <Modal open={open} onClose={onClose} title={t('pomodoro.settings')} size="sm">
      <div className="space-y-4">
        <Input
          label={t('pomodoro.workDuration')}
          type="number"
          min={1}
          max={120}
          value={local.workDuration}
          onChange={e => setLocal(p => ({ ...p, workDuration: Math.max(1, parseInt(e.target.value) || 1) }))}
        />
        <Input
          label={t('pomodoro.breakDuration')}
          type="number"
          min={1}
          max={60}
          value={local.breakDuration}
          onChange={e => setLocal(p => ({ ...p, breakDuration: Math.max(1, parseInt(e.target.value) || 1) }))}
        />
        <Input
          label={t('pomodoro.longBreakDuration')}
          type="number"
          min={1}
          max={60}
          value={local.longBreakDuration}
          onChange={e => setLocal(p => ({ ...p, longBreakDuration: Math.max(1, parseInt(e.target.value) || 1) }))}
        />
        <Input
          label={t('pomodoro.sessionsUntilLongBreak')}
          type="number"
          min={1}
          max={20}
          value={local.sessionsUntilLongBreak}
          onChange={e => setLocal(p => ({ ...p, sessionsUntilLongBreak: Math.max(1, parseInt(e.target.value) || 1) }))}
        />
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {t('ui.cancel')}
          </Button>
          <Button onClick={() => { onSave(local); onClose(); }} className="flex-1">
            {t('ui.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// 2. TASK MANAGER
// =============================================================================

type TaskFilter = 'all' | 'active' | 'completed';
type TaskSort = 'date' | 'priority' | 'name';

const priorityColors: Record<Task['priority'], string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const priorityBadge: Record<Task['priority'], 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

function TaskManager() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { tasks, addTask, updateTask, deleteTask, toggleTask } = useAppStore();

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  const filteredTasks = tasks
    .filter(task => {
      if (filter === 'active' && task.completed) return false;
      if (filter === 'completed' && !task.completed) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          (task.description && task.description.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      if (sort === 'name') return a.title.localeCompare(b.title);
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });

  const completedCount = tasks.filter(t => t.completed).length;
  const activeCount = tasks.length - completedCount;
  const completionPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask(newTitle.trim(), newDescription.trim() || undefined, newPriority, newDueDate || undefined);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setNewDueDate('');
    setShowAddModal(false);
  };

  const handleUpdateTitle = (id: string) => {
    if (editingTitle.trim()) {
      updateTask(id, { title: editingTitle.trim() });
    }
    setEditingId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const current = filteredTasks[index];
    const prev = filteredTasks[index - 1];
    const currentOrigIndex = tasks.findIndex(t => t.id === current.id);
    const prevOrigIndex = tasks.findIndex(t => t.id === prev.id);
    if (currentOrigIndex === -1 || prevOrigIndex === -1) return;
    const newTasks = [...tasks];
    [newTasks[currentOrigIndex], newTasks[prevOrigIndex]] = [newTasks[prevOrigIndex], newTasks[currentOrigIndex]];
    newTasks.forEach(t => updateTask(t.id, t));
  };

  const handleMoveDown = (index: number) => {
    if (index >= filteredTasks.length - 1) return;
    const current = filteredTasks[index];
    const next = filteredTasks[index + 1];
    const currentOrigIndex = tasks.findIndex(t => t.id === current.id);
    const nextOrigIndex = tasks.findIndex(t => t.id === next.id);
    if (currentOrigIndex === -1 || nextOrigIndex === -1) return;
    const newTasks = [...tasks];
    [newTasks[currentOrigIndex], newTasks[nextOrigIndex]] = [newTasks[nextOrigIndex], newTasks[currentOrigIndex]];
    newTasks.forEach(t => updateTask(t.id, t));
  };

  const handleClearCompleted = () => {
    tasks.filter(t => t.completed).forEach(t => deleteTask(t.id));
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  };

  const isToday = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate === today;
  };

  const taskFilterOptions = [
    { value: 'all', label: t('tasks.allTasks') },
    { value: 'active', label: t('tasks.activeTasks') },
    { value: 'completed', label: t('tasks.completedTasks') },
  ];

  const sortOptions = [
    { value: 'date', label: t('tasks.sortByDate') },
    { value: 'priority', label: t('tasks.sortByPriority') },
    { value: 'name', label: t('tasks.sortByName') },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('tasks.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('tasks.taskCount', { count: tasks.length })}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('tasks.addTask')}
          </Button>
        </div>

        {tasks.length > 0 && (
          <Card padding="sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {completedCount}/{tasks.length} {t('tasks.completed').toLowerCase()}
              </span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {Math.round(completionPercent)}%
              </span>
            </div>
            <ProgressBar value={completionPercent} color="gradient" size="sm" />
          </Card>
        )}
      </motion.div>

      {/* Filters and Search */}
      {tasks.length > 0 && (
        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Input
            placeholder={language === 'ar' ? 'بحث في المهام...' : 'Search tasks...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            wrapperClassName="flex-1"
          />
          <Select
            options={taskFilterOptions}
            value={filter}
            onChange={e => setFilter(e.target.value as TaskFilter)}
            wrapperClassName="sm:w-44"
          />
          <Select
            options={sortOptions}
            value={sort}
            onChange={e => setSort(e.target.value as TaskSort)}
            wrapperClassName="sm:w-44"
          />
        </motion.div>
      )}

      {/* Bulk Actions */}
      {completedCount > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClearCompleted}>
            {t('tasks.clearCompleted')} ({completedCount})
          </Button>
        </div>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">📋</span>}
          title={searchQuery
            ? (language === 'ar' ? 'لا توجد نتائج' : 'No results found')
            : t('tasks.noTasks')
          }
          description={searchQuery
            ? (language === 'ar' ? 'جرّب البحث بكلمات مختلفة' : 'Try different search terms')
            : t('tasks.noTasksHint')
          }
          action={!searchQuery ? { label: t('tasks.addTask'), onClick: () => setShowAddModal(true) } : undefined}
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card padding="sm" className={`group ${task.completed ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                      }`}
                    >
                      {task.completed && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onBlur={() => handleUpdateTitle(task.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleUpdateTitle(task.id); if (e.key === 'Escape') setEditingId(null); }}
                          className="w-full text-sm font-medium bg-transparent border-b border-primary-500 outline-none text-gray-800 dark:text-white pb-0.5"
                        />
                      ) : (
                        <h4
                          onClick={() => { setEditingId(task.id); setEditingTitle(task.title); }}
                          className={`text-sm font-medium cursor-text hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                            task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h4>
                      )}

                      {task.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase ${priorityColors[task.priority]}`}>
                          {t(`tasks.${task.priority}`)}
                        </span>

                        {task.dueDate && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            task.completed ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' :
                            isOverdue(task.dueDate) ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                            isToday(task.dueDate) ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {isOverdue(task.dueDate) && !task.completed ? '⚠ ' : ''}
                            {new Date(task.dueDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Tooltip content={language === 'ar' ? 'تحريك لأعلى' : 'Move up'}>
                        <button
                          onClick={() => handleMoveUp(index)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-dark-hover transition-colors"
                          disabled={index === 0}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                      </Tooltip>
                      <Tooltip content={language === 'ar' ? 'تحريك لأسفل' : 'Move down'}>
                        <button
                          onClick={() => handleMoveDown(index)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-dark-hover transition-colors"
                          disabled={index === filteredTasks.length - 1}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </Tooltip>
                      <Tooltip content={t('ui.delete')}>
                        <button
                          onClick={() => setDeleteConfirmId(task.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Task Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('tasks.addTask')}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label={t('tasks.taskTitle')}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder={language === 'ar' ? 'عنوان المهمة' : 'Enter task title'}
            autoFocus
          />
          <TextArea
            label={t('tasks.description')}
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder={language === 'ar' ? 'وصف اختياري' : 'Optional description'}
            rows={2}
          />
          <Select
            label={t('tasks.priority')}
            value={newPriority}
            onChange={e => setNewPriority(e.target.value as Task['priority'])}
            options={[
              { value: 'low', label: t('tasks.low') },
              { value: 'medium', label: t('tasks.medium') },
              { value: 'high', label: t('tasks.high') },
            ]}
          />
          <Input
            label={t('tasks.dueDate')}
            type="date"
            value={newDueDate}
            onChange={e => setNewDueDate(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1">
              {t('ui.cancel')}
            </Button>
            <Button onClick={handleAddTask} disabled={!newTitle.trim()} className="flex-1">
              {t('tasks.addTask')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t('tasks.deleteTask')}
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('tasks.deleteConfirm')}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="flex-1">
            {t('ui.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => { if (deleteConfirmId) { deleteTask(deleteConfirmId); setDeleteConfirmId(null); } }}
            className="flex-1"
          >
            {t('ui.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// =============================================================================
// 3. EXAM COUNTDOWN
// =============================================================================

const EXAM_COLORS = [
  { name: 'Blue', value: 'blue', class: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { name: 'Green', value: 'green', class: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { name: 'Red', value: 'red', class: 'bg-red-500', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/20' },
];

function getExamColorMeta(color: string) {
  return EXAM_COLORS.find(c => c.value === color) || EXAM_COLORS[0];
}

function getDaysRemaining(dateStr: string): number {
  const now = new Date(new Date().toDateString());
  const examDate = new Date(dateStr);
  const diff = examDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getMotivationalMessage(days: number, language: string): string {
  if (days < 0) return language === 'ar' ? 'انتهى موعد الامتحان!' : 'Exam has passed!';
  if (days === 0) return language === 'ar' ? 'الامتحان اليوم! حظاً موفقاً!' : "It's today! Good luck!";
  if (days <= 3) return language === 'ar' ? 'تحضر جيداً! أنت قريب!' : 'Study hard! You\'re almost there!';
  if (days <= 7) return language === 'ar' ? 'أسبوع واحد متبقٍ - ركّز!' : 'One week left - focus up!';
  if (days <= 14) return language === 'ar' ? 'أسبوعان - حان وقت المراجعة' : 'Two weeks - time to review';
  if (days <= 30) return language === 'ar' ? 'وقت كافٍ للتحضير الجيد' : 'Enough time to prepare well';
  return language === 'ar' ? 'استمتع بوقتك للاستعداد' : 'Enjoy your time to prepare';
}

function ExamCountdownPage() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { exams, addExam, deleteExam } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Re-render periodically to update countdowns in real-time feel
  useEffect(() => {
    const interval = setInterval(() => setTick(prev => prev + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleAddExam = () => {
    if (!newName.trim() || !newDate) return;
    addExam(newName.trim(), newDate, newColor);
    setNewName('');
    setNewDate('');
    setNewColor('blue');
    setShowAddModal(false);
  };

  const examCountLabel = language === 'ar'
    ? `${exams.length} ${exams.length === 1 ? 'امتحان' : 'امتحانات'}`
    : `${exams.length} ${exams.length === 1 ? 'exam' : 'exams'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('exams.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{examCountLabel}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('exams.addExam')}
        </Button>
      </motion.div>

      {/* Exam Cards */}
      {sortedExams.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">📚</span>}
          title={t('exams.noExams')}
          description={t('exams.noExamsHint')}
          action={{ label: t('exams.addFirstExam'), onClick: () => setShowAddModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {sortedExams.map((exam, index) => {
              const days = getDaysRemaining(exam.date);
              const colorMeta = getExamColorMeta(exam.color);
              const message = getMotivationalMessage(days, language);

              return (
                <motion.div
                  key={exam.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card padding="none" className="overflow-hidden">
                    <div className={`h-2 ${colorMeta.class}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                            {exam.name}
                          </h3>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(exam.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => setDeleteConfirmId(exam.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors shrink-0 ms-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <motion.span
                          key={days}
                          initial={{ scale: 1.2, opacity: 0.5 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`text-5xl font-black ${colorMeta.text}`}
                        >
                          {days <= 0 ? 0 : days}
                        </motion.span>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {days === 0
                              ? t('exams.today')
                              : days < 0
                                ? t('exams.overdue')
                                : language === 'ar'
                                  ? `${days} يوم متبقي`
                                  : `${days} day${days !== 1 ? 's' : ''} left`
                            }
                          </p>
                        </div>
                      </div>

                      <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${colorMeta.bg} ${colorMeta.text}`}>
                        {message}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Exam Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('exams.addExam')}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label={t('exams.examName')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={language === 'ar' ? 'اسم الامتحان' : 'e.g. Mathematics Final'}
            autoFocus
          />
          <Input
            label={t('exams.examDate')}
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('exams.examColor')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {EXAM_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setNewColor(color.value)}
                  className={`w-8 h-8 rounded-full ${color.class} transition-all duration-200 ${
                    newColor === color.value ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-dark-card' : 'hover:scale-105'
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1">
              {t('ui.cancel')}
            </Button>
            <Button onClick={handleAddExam} disabled={!newName.trim() || !newDate} className="flex-1">
              {t('exams.addExam')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t('exams.deleteExam')}
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {language === 'ar' ? 'هل أنت متأكد من حذف هذا الامتحان؟' : 'Are you sure you want to delete this exam?'}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="flex-1">
            {t('ui.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => { if (deleteConfirmId) { deleteExam(deleteConfirmId); setDeleteConfirmId(null); } }}
            className="flex-1"
          >
            {t('ui.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
