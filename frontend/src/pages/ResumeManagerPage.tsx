import { useState } from 'react';
import { useResumeLearning } from '@/hooks/useResumeLearning';

const DEMO_TOOLS = [
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'notes', label: 'Notes' },
  { id: 'pdf-merge', label: 'PDF Merge' },
];

export default function ResumeManagerPage() {
  const { items, loading, error, save, remove, clear } = useResumeLearning();
  const [selectedTool, setSelectedTool] = useState(DEMO_TOOLS[0].id);
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!note.trim()) return;
    const tool = DEMO_TOOLS.find((t) => t.id === selectedTool);
    await save(selectedTool, tool?.label ?? selectedTool, { note: note.trim() });
    setNote('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">Resume Learning</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Persistent resumable progress (IndexedDB)</p>

      <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Save Progress</h2>
        <div className="flex gap-2 mb-3">
          {DEMO_TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTool(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTool === t.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-dark-hover text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-dark-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Progress note…"
            className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <button
            onClick={handleSave}
            disabled={!note.trim()}
            className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Saved Progress</h2>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
          >
            Clear All
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No saved progress yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 text-xs font-bold">
                {item.toolId.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {typeof item.progress.note === 'string' ? item.progress.note : JSON.stringify(item.progress)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => remove(item.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                title="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
