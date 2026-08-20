import { useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useNotesStore, sortNotes } from '@/store/useNotesStore';
import { usePomodoroStore } from '@/store/usePomodoroStore';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useResumeLearning } from '@/hooks/useResumeLearning';
import { formatFileSize } from '@/utils/file';
import type { Task } from '@/types';

function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      {action}
    </div>
  );
}

function PanelEmpty({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{text}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    </div>
  );
}

/* ─── Tasks Panel ─── */
function TasksPanel() {
  const { t } = useTranslation();
  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .sort((a, b) => {
        if (a.dueDate === today && b.dueDate !== today) return -1;
        if (a.dueDate !== today && b.dueDate === today) return 1;
        const aOverdue = a.dueDate && a.dueDate < today ? 0 : 1;
        const bOverdue = b.dueDate && b.dueDate < today ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        const po = { high: 0, medium: 1, low: 2 };
        return po[a.priority] - po[b.priority];
      })
      .slice(0, 5);
  }, [tasks, today]);

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  const priorityColor = (p: Task['priority']) => {
    if (p === 'high') return 'bg-red-400';
    if (p === 'medium') return 'bg-amber-400';
    return 'bg-green-400';
  };

  return (
    <div>
      <PanelHeader
        title={t('dashboard.workspace.tasks')}
        action={
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {activeCount} {t('dashboard.workspace.remaining', { count: activeCount })} · {completedCount} {t('dashboard.workspace.completed', { count: completedCount })}
          </span>
        }
      />
      {activeTasks.length === 0 ? (
        <PanelEmpty text={t('dashboard.workspace.noTasks')} hint={t('dashboard.workspace.noTasksHint')} />
      ) : (
        <div className="space-y-1.5">
          {activeTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors group"
            >
              <button
                onClick={() => toggleTask(task.id)}
                className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-colors shrink-0 flex items-center justify-center"
                aria-label={t('tasks.markComplete')}
              >
                {task.completed && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColor(task.priority)}`} />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{task.title}</span>
              {task.dueDate && (
                <span className={`text-xs shrink-0 ${task.dueDate < today ? 'text-red-500' : task.dueDate === today ? 'text-amber-500 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                  {task.dueDate === today
                    ? t('dashboard.workspace.today')
                    : task.dueDate < today
                      ? t('dashboard.workspace.overdue')
                      : new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <Link
        to="/tool/task-manager"
        className="block mt-3 text-center text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
      >
        {t('dashboard.workspace.viewAll')} →
      </Link>
    </div>
  );
}

/* ─── Files Panel ─── */
function FilesPanel() {
  const { t } = useTranslation();
  const { files, upload, remove } = useFileStorage();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      const buffer = await file.arrayBuffer();
      await upload(file.name, file.type, buffer);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDownload = (f: typeof files[0]) => {
    const blob = new Blob([f.data], { type: f.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recentFiles = files.slice(0, 5);

  return (
    <div>
      <PanelHeader
        title={t('dashboard.workspace.files')}
        action={
          <>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            <button
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              {t('dashboard.workspace.uploadFile')}
            </button>
          </>
        }
      />
      {recentFiles.length === 0 ? (
        <PanelEmpty text={t('dashboard.workspace.noFiles')} hint={t('dashboard.workspace.noFilesHint')} />
      ) : (
        <div className="space-y-1.5">
          {recentFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center text-gray-400 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{f.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatFileSize(f.size)}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(f)}
                  className="p-1 rounded text-gray-400 hover:text-primary-500 transition-colors"
                  title={t('ui.download')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <button
                  onClick={() => remove(f.id)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                  title={t('ui.delete')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Pomodoro Panel ─── */
function PomodoroPanel() {
  const { t } = useTranslation();
  const mode = usePomodoroStore((s) => s.mode);
  const timeRemaining = usePomodoroStore((s) => s.timeRemaining);
  const isRunning = usePomodoroStore((s) => s.isRunning);
  const currentSession = usePomodoroStore((s) => s.currentSession);
  const settings = usePomodoroStore((s) => s.settings);
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const resume = usePomodoroStore((s) => s.resume);
  const reset = usePomodoroStore((s) => s.reset);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const totalDuration = mode === 'focus'
    ? settings.focusDuration * 60
    : mode === 'break'
      ? settings.breakDuration * 60
      : settings.longBreakDuration * 60;
  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;

  const modeLabel = mode === 'focus' ? t('pomodoro.focus') : mode === 'break' ? t('pomodoro.break') : t('pomodoro.longBreak');
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const modeRingColor = mode === 'focus' ? 'text-blue-500' : mode === 'break' ? 'text-emerald-500' : 'text-purple-500';

  return (
    <div>
      <PanelHeader title={t('dashboard.workspace.pomodoro')} />
      <div className="flex items-center gap-5">
        {/* Small circular timer */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              stroke="currentColor"
              className={modeRingColor}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-gray-800 dark:text-white tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium mb-1 ${
            mode === 'focus' ? 'text-blue-600 dark:text-blue-400' :
            mode === 'break' ? 'text-emerald-600 dark:text-emerald-400' :
            'text-purple-600 dark:text-purple-400'
          }`}>
            {modeLabel}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {t('pomodoro.sessionCount', { current: currentSession + 1, total: settings.sessionsUntilLongBreak })}
          </p>
          <div className="flex items-center gap-1.5">
            {!isRunning ? (
              <button
                onClick={timeRemaining > 0 && timeRemaining < totalDuration ? resume : start}
                className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium transition-colors"
              >
                {timeRemaining > 0 && timeRemaining < totalDuration ? t('ui.resume') : t('ui.start')}
              </button>
            ) : (
              <button
                onClick={pause}
                className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-dark-hover hover:bg-gray-300 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors"
              >
                {t('ui.pause')}
              </button>
            )}
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-dark-hover hover:bg-gray-300 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors"
            >
              {t('ui.reset')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Exams Panel ─── */
function ExamsPanel() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const exams = useAppStore((s) => s.exams);
  const navigate = useNavigate();

  const sortedExams = useMemo(() => {
    return [...exams]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [exams]);

  const getDays = (dateStr: string) => {
    const now = new Date(new Date().toDateString());
    const d = new Date(dateStr);
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const colorBar = (color: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-emerald-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      teal: 'bg-teal-500',
      pink: 'bg-pink-500',
    };
    return map[color] || map.blue;
  };

  return (
    <div>
      <PanelHeader
        title={t('dashboard.workspace.exams')}
        action={
          <button
            onClick={() => navigate('/tool/exam-countdown')}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            {t('dashboard.workspace.addExam')}
          </button>
        }
      />
      {sortedExams.length === 0 ? (
        <PanelEmpty text={t('dashboard.workspace.noExams')} hint={t('dashboard.workspace.noExamsHint')} />
      ) : (
        <div className="space-y-2">
          {sortedExams.map((exam) => {
            const days = getDays(exam.date);
            return (
              <div key={exam.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors">
                <div className={`w-1 h-8 rounded-full shrink-0 ${colorBar(exam.color)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{exam.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(exam.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
                  days < 0
                    ? 'bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400'
                    : days <= 3
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                      : days <= 7
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400'
                }`}>
                  {days < 0
                    ? t('dashboard.workspace.overdue')
                    : days === 0
                      ? t('dashboard.workspace.today')
                      : days === 1
                        ? t('dashboard.workspace.tomorrow')
                        : t('dashboard.workspace.daysLeft', { count: days })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Notes Panel ─── */
function NotesPanel() {
  const { t } = useTranslation();
  const notes = useNotesStore((s) => s.notes);
  const navigate = useNavigate();

  const recentNotes = useMemo(() => sortNotes(notes).slice(0, 4), [notes]);

  return (
    <div>
      <PanelHeader
        title={t('dashboard.workspace.notes')}
        action={
          <button
            onClick={() => navigate('/tool/notes')}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            {t('dashboard.workspace.viewAll')}
          </button>
        }
      />
      {recentNotes.length === 0 ? (
        <PanelEmpty text={t('dashboard.workspace.noNotes')} hint={t('dashboard.workspace.noNotesHint')} />
      ) : (
        <div className="space-y-1.5">
          {recentNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => navigate('/tool/notes')}
              className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
            >
              {note.pinned && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 shrink-0">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {note.title || t('dashboard.workspace.recent')}
                </p>
                {note.content && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{note.content.slice(0, 60)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Resume Learning Panel ─── */
function ResumePanel() {
  const { t } = useTranslation();
  const { items } = useResumeLearning();
  const navigate = useNavigate();

  const recentItems = items.slice(0, 4);

  return (
    <div>
      <PanelHeader
        title={t('dashboard.workspace.resume')}
        action={
          <button
            onClick={() => navigate('/resume')}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            {t('dashboard.workspace.viewAll')}
          </button>
        }
      />
      {recentItems.length === 0 ? (
        <PanelEmpty text={t('dashboard.workspace.noResume')} hint={t('dashboard.workspace.noResumeHint')} />
      ) : (
        <div className="space-y-1.5">
          {recentItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/tool/${item.toolId}`)}
              className="w-full text-left flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 text-xs font-bold">
                {item.toolId.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.label}</p>
                {typeof item.progress.note === 'string' && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.progress.note}</p>
                )}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard ─── */
export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Row 1: Tasks | Files */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-card dark:shadow-card-dark">
          <TasksPanel />
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-card dark:shadow-card-dark">
          <FilesPanel />
        </div>

        {/* Row 2: Pomodoro | Exams */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-card dark:shadow-card-dark">
          <PomodoroPanel />
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-card dark:shadow-card-dark">
          <ExamsPanel />
        </div>

        {/* Row 3: Notes | Resume */}
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-card dark:shadow-card-dark">
          <NotesPanel />
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border shadow-card dark:shadow-card-dark">
          <ResumePanel />
        </div>
      </div>
    </div>
  );
}
