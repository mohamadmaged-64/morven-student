import { useState } from 'react';
import { Modal } from '@/components/UI/Modal';
import { Input, TextArea } from '@/components/UI/Input';
import { Button } from '@/components/UI/Button';
import { useAppStore } from '@/store/useAppStore';
import { useAdhkarApprovedStore } from '@/store/useAdhkarApprovedStore';
import { submitDhikrSubmission } from '@/services/adhkarApi';
import { isNetworkError } from '@/services/apiError';
import type { DhikrCategory } from '@/data/adhkar';

const NOT_LOGGED_IN_MESSAGE = 'غير مصرح';

type AddDhikrModalProps = {
  open: boolean;
  onClose: () => void;
  categoryId: DhikrCategory;
  categoryTitle: string;
};

type FieldErrors = Partial<Record<'title' | 'text', string>>;

function AddDhikrModal({ open, onClose, categoryId, categoryTitle }: AddDhikrModalProps) {
  const addNotification = useAppStore((s) => s.addNotification);
  const reloadApproved = useAdhkarApprovedStore((s) => s.load);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setErrors({});
    onClose();
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'يرجى إدخال عنوان الذكر';
    if (!text.trim()) next.text = 'يرجى إدخال محتوى الذكر';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await submitDhikrSubmission({
        categoryId,
        title: title.trim(),
        text: text.trim(),
        source: source.trim(),
      });
      // Approved content may have changed; refresh silently. Also clears any
      // previous network failure flag so the next submission can retry.
      void reloadApproved();
      addNotification('تم إرسال الذكر وسيظهر بعد مراجعة الإدارة', 'success', 4000);
      setTitle('');
      setText('');
      setSource('');
      setErrors({});
      onClose();
    } catch (err) {
      if (isNetworkError(err)) {
        addNotification(
          'تعذر إرسال الذكر، تحقق من اتصالك بالإنترنت',
          'error',
          4000,
        );
      } else if (err instanceof Error && err.message === NOT_LOGGED_IN_MESSAGE) {
        addNotification('يجب تسجيل الدخول لإضافة ذكر', 'warning', 4000);
      } else {
        addNotification(
          err instanceof Error ? err.message : 'حدث خطأ غير متوقع',
          'error',
          4000,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="إضافة ذكر"
      description={`سيُرسل الذكر للمراجعة ولن يظهر في قسم ${categoryTitle} إلا بعد اعتماده من الإدارة.`}
      size="sm"
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      showClose={!submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="عنوان الذكر"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: دعاء الاستفتاح في الصلاة"
          error={errors.title}
          disabled={submitting}
          aria-label="عنوان الذكر"
        />

        <TextArea
          label="محتوى الذكر"
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب نص الذكر هنا..."
          error={errors.text}
          disabled={submitting}
          aria-label="محتوى الذكر"
        />

        <Input
          label="المصدر"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="مثال: متفق عليه، أو مرجع موثوق (اختياري)"
          disabled={submitting}
          aria-label="المصدر"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            إرسال للمراجعة
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export { AddDhikrModal };
export type { AddDhikrModalProps };