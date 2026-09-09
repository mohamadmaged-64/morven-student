import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { Trash2 } from 'lucide-react';
import type { Dhikr } from '@/data/adhkar';

type DeleteDhikrModalProps = {
  open: boolean;
  dhikr: Dhikr | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function DeleteDhikrModal({
  open,
  dhikr,
  deleting,
  onConfirm,
  onClose,
}: DeleteDhikrModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="حذف الذكر"
      size="sm"
      closeOnBackdrop={!deleting}
      closeOnEscape={!deleting}
      showClose={!deleting}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {dhikr?.title ?? 'ذكر بدون عنوان'}
            </p>
            {dhikr?.text && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line line-clamp-2">
                {dhikr.text}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          سيتم حذف هذا الذكر{' '}
          <span className="font-semibold text-red-600 dark:text-red-400">نهائياً</span>{' '}
          ولن يظهر لجميع المستخدمين بعد الآن. لا يمكن التراجع عن هذا الإجراء.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={deleting}>
            إلغاء
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} loading={deleting}>
            حذف نهائي
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { DeleteDhikrModal };
export type { DeleteDhikrModalProps };