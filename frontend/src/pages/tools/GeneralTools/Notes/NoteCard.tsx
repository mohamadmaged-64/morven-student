import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Pin, PinOff, Pencil, Trash2, Calendar, Clock } from 'lucide-react';
import type { Note } from '@/types';

type NoteCardProps = {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
};

function formatNoteDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ar-SA-u-nu-latn', {
    month: 'short',
    day: 'numeric',
  });
}

function NoteCard({ note, onEdit, onDelete, onTogglePin }: NoteCardProps) {
  const emptyTitle = !note.title.trim();
  const hasContent = !!note.content.trim();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <Card
        padding="sm"
        hoverable
        onClick={onEdit}
        className="group h-full flex flex-col"
      >
        <div className="flex items-start gap-2">
          <h3
            className={`flex-1 min-w-0 truncate text-sm font-semibold ${
              emptyTitle
                ? 'text-gray-400 dark:text-gray-500 italic'
                : 'text-gray-800 dark:text-white'
            }`}
          >
            {note.title.trim() || 'بدون عنوان'}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              note.pinned
                ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                : 'text-gray-300 dark:text-gray-600 hover:text-primary-500 hover:bg-primary-50 dark:hover:text-primary-400 dark:hover:bg-primary-900/30'
            }`}
            title={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
          >
            {note.pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
          </button>
        </div>

        {hasContent && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line line-clamp-4 flex-1">
            {note.content}
          </p>
        )}
        {!hasContent && (
          <p className="mt-1.5 text-sm text-gray-300 dark:text-gray-600 italic flex-1">
            لا يوجد محتوى بعد...
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="inline-flex items-center gap-1" title="تاريخ الإنشاء">
              <Calendar className="w-3 h-3" />
              {formatNoteDate(note.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1" title="آخر تعديل">
              <Clock className="w-3 h-3" />
              {formatNoteDate(note.updatedAt)}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:text-primary-400 dark:hover:bg-primary-900/30 transition-colors"
              title="تحرير"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              title="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export { NoteCard };
export type { NoteCardProps };
