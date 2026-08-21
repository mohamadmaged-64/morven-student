import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolHero } from '@/components/Tool/ToolHero';
import { Input, Button, Modal, EmptyState } from '@/components/UI';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { useNotesStore } from '@/store/useNotesStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { NotebookPen, Search, Plus, StickyNote } from 'lucide-react';

export default function NotesPage() {
  const { language } = useLanguageStore();
  const notes = useNotesStore((s) => s.notes);
  const createNote = useNotesStore((s) => s.createNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const togglePin = useNotesStore((s) => s.togglePin);
  const searchNotes = useNotesStore((s) => s.searchNotes);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const visibleNotes = useMemo(() => searchNotes(searchQuery), [searchQuery, notes, searchNotes]);
  const editingNote = editingId ? notes.find((n) => n.id === editingId) : undefined;

  const pinnedNotes = visibleNotes.filter((n) => n.pinned);
  const unpinnedNotes = visibleNotes.filter((n) => !n.pinned);

  const handleNewNote = () => {
    const id = createNote();
    setEditingId(id);
  };

  const renderNote = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return null;

    if (editingId === id) {
      return (
        <NoteEditor
          key={note.id}
          note={note}
          language={language}
          onDone={() => setEditingId(null)}
          onTitleChange={(value) => updateNote(id, { title: value })}
          onContentChange={(value) => updateNote(id, { content: value })}
        />
      );
    }

    return (
      <NoteCard
        key={note.id}
        note={note}
        language={language}
        onEdit={() => setEditingId(id)}
        onDelete={() => setDeleteConfirmId(id)}
        onTogglePin={() => togglePin(id)}
      />
    );
  };

  return (
    <div className="space-y-6">
      <ToolHero
        icon={<NotebookPen className="w-6 h-6" />}
        title={language === 'ar' ? 'الملاحظات' : 'Notes'}
        description={
          language === 'ar'
            ? 'أنشئ واحفظ ملاحظاتك بسرعة مع حفظ تلقائي.'
            : 'Quickly create and organize your notes with automatic saving.'
        }
      />

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'ar' ? 'ابحث في ملاحظاتك...' : 'Search your notes...'}
          icon={<Search className="w-4 h-4" />}
          wrapperClassName="flex-1"
          aria-label={language === 'ar' ? 'البحث في الملاحظات' : 'Search notes'}
        />
        <Button onClick={handleNewNote} icon={<Plus className="w-4 h-4" />} className="shrink-0">
          {language === 'ar' ? 'ملاحظة جديدة' : 'New Note'}
        </Button>
      </motion.div>

      {/* Content */}
      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="w-9 h-9" />}
          title={language === 'ar' ? 'لا توجد ملاحظات حتى الآن' : 'No notes yet.'}
          description={
            language === 'ar' ? 'ابدأ بإنشاء أول ملاحظة.' : 'Create your first note.'
          }
          action={{ label: language === 'ar' ? 'إنشاء ملاحظة' : 'New Note', onClick: handleNewNote }}
        />
      ) : visibleNotes.length === 0 ? (
        <EmptyState
          icon={<Search className="w-9 h-9" />}
          title={language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
          description={
            language === 'ar' ? 'جرّب البحث بكلمات مختلفة' : 'Try different search terms'
          }
        />
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'مثبتة' : 'Pinned'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {pinnedNotes.map((n) => renderNote(n.id))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {unpinnedNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'كل الملاحظات' : 'All Notes'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {unpinnedNotes.map((n) => renderNote(n.id))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={language === 'ar' ? 'حذف الملاحظة' : 'Delete Note'}
        size="sm"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {language === 'ar'
            ? 'هل أنت متأكد من حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Are you sure you want to delete this note? This action cannot be undone.'}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="flex-1">
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (deleteConfirmId) {
                deleteNote(deleteConfirmId);
                if (editingId === deleteConfirmId) setEditingId(null);
                setDeleteConfirmId(null);
              }
            }}
            className="flex-1"
          >
            {language === 'ar' ? 'حذف' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
