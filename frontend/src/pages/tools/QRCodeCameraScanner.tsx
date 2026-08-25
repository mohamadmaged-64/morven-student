import { useState, useCallback, useRef, useEffect } from 'react';
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

function isMobileOrTablet(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return true;
  if (/ipad|ipod/i.test(ua)) return true;
  if (/iPhone/i.test(ua)) return true;
  if (/mobile/i.test(ua)) return true;
  if (/tablet/i.test(ua)) return true;
  if ('ontouchstart' in window && navigator.maxTouchPoints > 1 && window.screen.width < 1024) return true;
  return false;
}

type ScanState = 'idle' | 'scanning' | 'permission-denied' | 'no-camera' | 'error';

function QRCodeCameraScanner() {
  const { addNotification } = useAppStore();
  const [result, setResult] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const scanStateRef = useRef<ScanState>('idle');
  const mountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const scanFrame = useCallback(() => {
    if (!mountedRef.current || scanStateRef.current !== 'scanning') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code && mountedRef.current) {
      setResult(code.data);
      scanStateRef.current = 'idle';
      setScanState('idle');
      stopCamera();
      addNotification('تم اكتشاف رمز QR!', 'success');
      return;
    }
    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, addNotification]);

  const startCamera = useCallback(async () => {
    setResult(null);
    setScanState('scanning');
    scanStateRef.current = 'scanning';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setScanState('permission-denied');
          scanStateRef.current = 'permission-denied';
          return;
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setScanState('no-camera');
          scanStateRef.current = 'no-camera';
          return;
        }
      }
      setScanState('error');
      scanStateRef.current = 'error';
      addNotification('حدث خطأ أثناء تشغيل الكاميرا', 'error');
    }
  }, [scanFrame, addNotification]);

  const handleStop = useCallback(() => {
    scanStateRef.current = 'idle';
    setScanState('idle');
    stopCamera();
  }, [stopCamera]);

  const handleScanAgain = useCallback(() => {
    setResult(null);
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

  const resultIsUrl = result ? isUrl(result) : false;

  if (!isMobileOrTablet()) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card padding="lg">
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>}
            title="هذه الأداة متاحة فقط للهواتف والأجهزة اللوحية"
            description="مسح رمز QR بالكاميرا مصمم للهواتف والأجهزة اللوحية. استخدم أداة مسح رمز QR من صورة بدلاً من ذلك."
            action={{
              label: 'الانتقال إلى مسح رمز QR من صورة',
              onClick: () => window.location.href = '/tool/qr-scanner-image',
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {scanState === 'idle' && !result && (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              اضغط الزر أدناه لتشغيل الكاميرا ومسح رمز QR
            </p>
            <Button onClick={startCamera} size="lg" icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            }>
              تشغيل الكاميرا
            </Button>
          </div>
        </Card>
      )}

      {scanState === 'permission-denied' && (
        <Card padding="lg">
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l22 22"/><path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34"/><path d="M14.12 14.12A3 3 0 009.88 9.88"/></svg>}
            title="تم رفض إذن الكاميرا"
            description="يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح أو الجهاز، ثم حاول مرة أخرى."
            action={{ label: 'إعادة المحاولة', onClick: startCamera }}
          />
        </Card>
      )}

      {scanState === 'no-camera' && (
        <Card padding="lg">
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
            title="لم يتم العثور على كاميرا"
            description="لم نتمكن من العثور على كاميرا على جهازك. تأكد من أن الكاميرا متاحة وحاول مرة أخرى."
            action={{ label: 'إعادة المحاولة', onClick: startCamera }}
          />
        </Card>
      )}

      {scanState === 'error' && (
        <Card padding="lg">
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
            title="حدث خطأ"
            description="تعذر تشغيل الكاميرا. تأكد من أن المتصفح يدعم الكاميرا وحاول مرة أخرى."
            action={{ label: 'إعادة المحاولة', onClick: startCamera }}
          />
        </Card>
      )}

      {scanState === 'scanning' && (
        <Card padding="none" className="overflow-hidden relative">
          <div className="relative bg-black">
            <video
              ref={videoRef}
              className="w-full rounded-xl"
              playsInline
              muted
              style={{ minHeight: 200, objectFit: 'cover' }}
              aria-label="كاميرا مسح رمز QR"
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <div className="w-56 h-56 border-2 border-white/70 rounded-2xl shadow-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-400 rounded-br-lg" />
              </div>
            </div>
            <div className="absolute bottom-4 inset-x-0 flex justify-center">
              <div className="px-3 py-1.5 rounded-full bg-black/50 text-white text-xs flex items-center gap-2" role="status" aria-live="polite">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
                جارٍ البحث عن رمز QR...
              </div>
            </div>
          </div>
          <div className="p-4">
            <Button onClick={handleStop} variant="danger" className="w-full" icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
            }>
              إيقاف الكاميرا
            </Button>
          </div>
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
                  <Button onClick={handleScanAgain} variant="secondary">
                    مسح رمز آخر
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {scanState === 'scanning' && (
        <div className="text-center" aria-live="polite">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            جميع المعالجات تتم محلياً — لا يتم إرسال أي بيانات إلى خادم خارجي.
          </p>
        </div>
      )}
    </div>
  );
}

export { QRCodeCameraScanner };
