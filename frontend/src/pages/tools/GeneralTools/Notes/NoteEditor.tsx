import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Check } from 'lucide-react';
import type { Note } from '@/types';

type NoteEditorProps = {
  note: Note;
  onDone: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
};

function NoteEditor({ note, onDone, onTitleChange, onContentChange }: NoteEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    focusedRef.current = true;
    if (!note.title.trim() && !note.content.trim()) {
      titleRef.current?.focus();
    } else {
      contentRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const autoGrow = () => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    autoGrow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.content, note.id]);

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
        className="border-primary-300/60 dark:border-primary-700/60 shadow-elevated"
      >
        <div
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onDone();
            }
          }}
        >
          <input
            ref={titleRef}
            value={note.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="عنوان الملاحظة..."
            className="w-full bg-transparent text-base font-semibold text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 border-b border-transparent focus:border-primary-400 dark:focus:border-primary-500 outline-none transition-colors py-1"
          />

          <textarea
            ref={contentRef}
            value={note.content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="اكتب ملاحظتك هنا..."
            rows={3}
            className="mt-2 w-full bg-transparent resize-none overflow-hidden text-sm leading-relaxed text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none min-h-[64px]"
          />

          <div className="mt-3 pt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              يُحفظ تلقائياً
            </span>
            <Button size="sm" onClick={onDone}>
              تم
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export { NoteEditor };
export type { NoteEditorProps };
