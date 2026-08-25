import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { cropImageFile, type CropRegionInput } from '@/services/mediaApi';
import {
  ImageProcessingPanel,
  ImageUploadZone,
  ResultCard,
  ErrorCard,
  SelectedFileInfo,
  ToolBody,
  ToolSection,
  ToolTips,
  downloadResult,
  formatBytes,
  useImageProcessor,
} from './shared';

const MIN_CROP_SIZE = 8;

type Rect = { left: number; top: number; width: number; height: number };

const RATIO_OPTIONS: { label: string; value: string }[] = [
  { label: 'حر', value: 'free' },
  { label: '1:1', value: '1' },
  { label: '4:3', value: '4/3' },
  { label: '16:9', value: '16/9' },
  { label: '9:16', value: '9/16' },
];

function clampRect(rect: Rect, bounds: { w: number; h: number }): Rect {
  const width = Math.min(Math.max(MIN_CROP_SIZE, Math.round(rect.width)), Math.round(bounds.w));
  const height = Math.min(Math.max(MIN_CROP_SIZE, Math.round(rect.height)), Math.round(bounds.h));
  return {
    width,
    height,
    left: Math.min(Math.max(0, Math.round(rect.left)), Math.round(bounds.w) - width),
    top: Math.min(Math.max(0, Math.round(rect.top)), Math.round(bounds.h) - height),
  };
}

/** قص الصورة بتحديد منطقة بالسحب على المعاينة مع إدخال رقمي دقيق. */
export default function CropTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [ratio, setRatio] = useState('free');
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    setDims(null);
    setSelection(null);
    if (!file) {
      setObjectUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onLoaded = useCallback(() => {
    const img = imgRef.current;
    if (img && img.naturalWidth > 0) {
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

  /** Convert a pointer event position to source-image coordinates. */
  const toSourcePoint = (clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img || !dims) return null;
    const box = img.getBoundingClientRect();
    const scaleX = dims.w / box.width;
    const scaleY = dims.h / box.height;
    return {
      x: Math.min(Math.max(0, (clientX - box.left) * scaleX), dims.w),
      y: Math.min(Math.max(0, (clientY - box.top) * scaleY), dims.h),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!dims) return;
    const p = toSourcePoint(e.clientX, e.clientY);
    if (!p) return;
    dragStart.current = { x: p.x, y: p.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setSelection({ left: p.x, top: p.y, width: 0, height: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || !dims) return;
    const p = toSourcePoint(e.clientX, e.clientY);
    if (!p) return;
    let width = Math.abs(p.x - dragStart.current.x);
    let height = Math.abs(p.y - dragStart.current.y);
    if (ratio !== 'free') {
      const r = eval(ratio.replace('/', '/')); // "16/9" -> 1.777
      height = Math.min(height, width / r);
      width = height * r;
    }
    const left = Math.min(p.x, dragStart.current.x);
    const top = Math.min(p.y, dragStart.current.y);
    setSelection(clampRect({ left, top, width, height }, dims));
  };

  const endDrag = () => {
    dragStart.current = null;
  };

  const selectAll = () => {
    if (dims) setSelection({ left: 0, top: 0, width: dims.w, height: dims.h });
  };

  const updateField = (field: keyof Rect, raw: string) => {
    setSelection((prev) => {
      const base: Rect = prev ?? { left: 0, top: 0, width: 0, height: 0 };
      const value = Number(raw);
      if (!Number.isFinite(value)) return base;
      return clampRect({ ...base, [field]: value }, dims ?? { w: 7680, h: 7680 });
    });
  };

  const canSubmit = !!(
    dims &&
    selection &&
    selection.width >= MIN_CROP_SIZE &&
    selection.height >= MIN_CROP_SIZE &&
    selection.left >= 0 &&
    selection.top >= 0 &&
    selection.left + selection.width <= dims.w &&
    selection.top + selection.height <= dims.h
  );

  // Overlay rectangle mapped back into display pixels.
  const overlayStyle = (() => {
    const img = imgRef.current;
    if (!dims || !img || !selection) return null;
    const scaleX = img.clientWidth / dims.w;
    const scaleY = img.clientHeight / dims.h;
    return {
      left: selection.left * scaleX,
      top: selection.top * scaleY,
      width: selection.width * scaleX,
      height: selection.height * scaleY,
    };
  })();

  const start = () =>
    run(async (onProgress, job) =>
      cropImageFile(
        file as File,
        {
          left: Math.round(selection!.left),
          top: Math.round(selection!.top),
          width: Math.round(selection!.width),
          height: Math.round(selection!.height),
        } satisfies CropRegionInput,
        onProgress,
        job
      )
    );

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="حدد المنطقة المطلوبة بالماوس أو أدخل الإحداثيات رقميًا"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <ToolSection title="تحديد منطقة القص" summary={dims ? `أبعاد الصورة: ${dims.w}×${dims.h}` : 'جارٍ التحميل...'}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">نسبة الأبعاد:</span>
              {RATIO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRatio(option.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    ratio === option.value
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-light-border dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-primary-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-light-border dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-primary-400"
              >
                تحديد كل الصورة
              </button>
            </div>

            <div ref={wrapRef} className="relative inline-block max-w-full touch-none select-none">
              {objectUrl && (
                <>
                  <img
                    ref={imgRef}
                    src={objectUrl}
                    alt="معاينة القص"
                    className="max-w-full max-h-[380px] object-contain rounded-lg"
                    onLoad={onLoaded}
                    draggable={false}
                  />
                  {overlayStyle && (
                    <div
                      className="absolute bg-primary-500/25 border-2 border-primary-500 pointer-events-none"
                      style={{
                        left: overlayStyle.left,
                        top: overlayStyle.top,
                        width: overlayStyle.width,
                        height: overlayStyle.height,
                      }}
                    />
                  )}
                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    role="application"
                    aria-label="منطقة التحديد"
                  />
                </>
              )}
            </div>

            {dims && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {(
                  [
                    ['left', 'الأفقي (يسار)'],
                    ['top', 'الرأسي (أعلى)'],
                    ['width', 'العرض'],
                    ['height', 'الارتفاع'],
                  ] as [keyof Rect, string][]
                ).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={selection ? Math.round(selection[field]) : ''}
                      onChange={(e) => updateField(field, e.target.value)}
                      className="w-full rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
            )}
          </ToolSection>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            <Button className="w-full" onClick={start} disabled={!canSubmit}>
              قص الآن
            </Button>
          )}

          {!canSubmit && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              اسحب على الصورة لتحديد منطقة لا تقل عن {MIN_CROP_SIZE}×{MIN_CROP_SIZE} بكسل وداخل حدود الصورة.
            </p>
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard
          result={result}
          extraInfo={
            <p className="text-xs text-gray-500 dark:text-gray-400">
              حجم الناتج: {formatBytes(result.blob.size)}
            </p>
          }
          onDownload={() => downloadResult(result)}
          onReset={fullReset}
        />
      )}

      <ToolTips
        items={[
          'اسحب بالماوس فوق الصورة لرسم مستطيل القص، أو أدخل الإحداثيات رقميًا.',
          'اختر نسبة أبعاد جاهزة للحصول على مقاسات مناسبة للنشر في وسائل التواصل.',
          'أصغر مساحة قص مدعومة هي 8×8 بكسل.',
        ]}
      />
    </ToolBody>
  );
}
