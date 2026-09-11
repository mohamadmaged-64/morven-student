import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsQR from 'jsqr';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { EmptyState } from '@/components/UI/EmptyState';
import { useAppStore } from '@/store/useAppStore';

function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function QRImageScanner() {
  const { addNotification } = useAppStore();
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [noQR, setNoQR] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const decodeImage = useCallback((file: File) => {
    setLoading(true);
    setResult(null);
    setNoQR(false);

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          addNotification('تعذر معالجة الصورة', 'error');
          setLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code) {
          setResult(code.data);
        } else {
          setNoQR(true);
        }
      } catch {
        addNotification('حدث خطأ أثناء قراءة الصورة', 'error');
      } finally {
        setLoading(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      addNotification('صيغة الصورة غير مدعومة', 'error');
      setLoading(false);
    };
    img.src = objectUrl;
  }, [addNotification]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) decodeImage(file);
  }, [decodeImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addNotification('يرجى اختيار ملف صورة', 'warning');
        return;
      }
      decodeImage(file);
    }
  }, [decodeImage, addNotification]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      addNotification('تم النسخ إلى الحافظة', 'success');
    } catch {
      addNotification('تعذر النسخ', 'error');
    }
  }, [result, addNotification]);

  const handleReset = useCallback(() => {
    setResult(null);
    setNoQR(false);
    setLoading(false);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (inputRef.current) inputRef.current.value = '';
  }, [preview]);

  const resultIsUrl = result ? isUrl(result) : false;

  return (
    <div className="space-y-6" dir="rtl">
      <Card padding="lg">
        <div
          className="relative rounded-xl border-2 border-dashed px-4 py-3 text-center transition-all duration-200 cursor-pointer border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label="منطقة رفع صورة رمز QR"
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-dark-surface text-gray-400 dark:text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                اسحب صورة هنا أو اضغط للتصفح
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, WEBP, GIF — المعالجة تتم محلياً على جهازك
              </p>
            </div>
          </div>
        </div>
      </Card>

      {preview && !result && !noQR && (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-4">
            <img
              src={preview}
              alt="الصورة المحددة"
              className="max-h-64 rounded-xl object-contain"
            />
            {loading && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400" role="status">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">جارٍ قراءة رمز QR...</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {noQR && (
        <Card padding="lg">
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
            title="لم يتم العثور على رمز QR"
            description="الصورة المحددة لا تحتوي على رمز QR قابل للقراءة. جرّب صورة أخرى."
            action={{ label: 'جرّب صورة أخرى', onClick: handleReset }}
          />
        </Card>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card padding="lg">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    النتيجة
                  </h3>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border break-all" role="region" aria-live="polite">
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap" data-testid="qr-result">
                    {result}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleCopy} variant="primary" icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  }>
                    نسخ
                  </Button>
                  {resultIsUrl && (
                    <a
                      href={result}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      فتح الرابط
                    </a>
                  )}
                  <Button onClick={handleReset} variant="secondary">
                    مسح الصورة ومسح رمز آخر
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !noQR && !loading && (
        <div className="text-center" aria-live="polite">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            جميع المعالجات تتم محلياً — لا تتم رفع أي صورة إلى خادم خارجي.
          </p>
        </div>
      )}
    </div>
  );
}

export { QRImageScanner };
