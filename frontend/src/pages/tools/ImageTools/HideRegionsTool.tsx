import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/UI/Button';
import {
  BLUR_INTENSITY_DEFAULT,
  BLUR_INTENSITY_MAX,
  BLUR_INTENSITY_MIN,
  hideImageRegions,
  type ImageBlurEffect,
  type CropRegionInput,
} from '@/services/mediaApi';
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
  useImageProcessor,
} from './shared';

type Rect = { left: number; top: number; width: number; height: number };
const MIN_REGION_SIZE = 8;

/** طمس أو تنقيط مناطق محددة على الصورة لحماية الخصوصية. */
export default function HideRegionsTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [regions, setRegions] = useState<Rect[]>([]);
  const [draft, setDraft] = useState<Rect | null>(null);
  const [effect, setEffect] = useState<ImageBlurEffect>('blur');
  const [intensity, setIntensity] = useState(BLUR_INTENSITY_DEFAULT);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    setRegions([]);
    setDraft(null);
    setDims(null);
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
    if (img && img.naturalWidth > 0) setDims({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  const toSourcePoint = (clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img || !dims) return null;
    const box = img.getBoundingClientRect();
    return {
      x: Math.min(Math.max(0, ((clientX - box.left) * dims.w) / box.width), dims.w),
      y: Math.min(Math.max(0, ((clientY - box.top) * dims.h) / box.height), dims.h),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!dims) return;
    const p = toSourcePoint(e.clientX, e.clientY);
    if (!p) return;
    dragStart.current = p;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraft({ left: p.x, top: p.y, width: 0, height: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || !dims) return;
    const p = toSourcePoint(e.clientX, e.clientY);
    if (!p) return;
    setDraft({
      left: Math.min(p.x, dragStart.current.x),
      top: Math.min(p.y, dragStart.current.y),
      width: Math.abs(p.x - dragStart.current.x),
      height: Math.abs(p.y - dragStart.current.y),
    });
  };

  const endDrag = () => {
    dragStart.current = null;
    setDraft((current) => {
      if (!current || !dims) return null;
      const snapped: Rect = {
        left: Math.round(Math.max(0, current.left)),
        top: Math.round(Math.max(0, current.top)),
        width: Math.round(current.width),
        height: Math.round(current.height),
      };
      snapped.width = Math.min(snapped.width, dims.w - snapped.left);
      snapped.height = Math.min(snapped.height, dims.h - snapped.top);
      if (snapped.width >= MIN_REGION_SIZE && snapped.height >= MIN_REGION_SIZE) {
        setRegions((prev) => [...prev, snapped]);
      }
      return null;
    });
  };

  const removeRegion = (index: number) => setRegions((prev) => prev.filter((_, i) => i !== index));

  /** Map a source-space rect into display pixels for the overlay. */
  const displayRect = (rect: Rect) => {
    const img = imgRef.current;
    if (!dims || !img) return null;
    return {
      left: (rect.left * img.clientWidth) / dims.w,
      top: (rect.top * img.clientHeight) / dims.h,
      width: (rect.width * img.clientWidth) / dims.w,
      height: (rect.height * img.clientHeight) / dims.h,
    };
  };

  const canSubmit = regions.length > 0;

  const start = () =>
    run(async (onProgress, job) =>
      hideImageRegions(
        file as File,
        { regions: regions satisfies CropRegionInput[], effect, intensity },
        onProgress,
        job
      )
    );

  const resetAll = () => {
    fullReset();
    setEffect('blur');
    setIntensity(BLUR_INTENSITY_DEFAULT);
  };

  const overlayBox = 'absolute bg-primary-500/30 border-2 border-primary-500 pointer-events-none';

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="ارسم مستطيلات فوق الوجوه أو الأرقام الحساسة لطمسها"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <ToolSection title="رسم المناطق" summary={dims ? `أبعاد الصورة: ${dims.w}×${dims.h} — المناطق المحددة: ${regions.length}` : undefined}>
            <div className="relative inline-block max-w-full touch-none select-none">
              {objectUrl && (
                <>
                  <img
                    ref={imgRef}
                    src={objectUrl}
                    alt="معاينة إخفاء المناطق"
                    className="max-w-full max-h-[380px] object-contain rounded-lg"
                    onLoad={onLoaded}
                    draggable={false}
                  />
                  {regions.map((region, i) => {
                    const box = displayRect(region);
                    return box ? <div key={i} className={overlayBox} style={box} /> : null;
                  })}
                  {draft && displayRect(draft) && <div className={`${overlayBox} border-dashed`} style={displayRect(draft)!} />}
                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    role="application"
                    aria-label="منطقة رسم المستطيلات"
                  />
                </>
              )}
            </div>

            {regions.length > 0 && (
              <ul className="mt-3 space-y-1.5" aria-label="المناطق المحددة">
                {regions.map((region, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300 rounded-lg border border-light-border dark:border-dark-border px-2.5 py-1.5">
                    <span>
                      منطقة {i + 1}: X={Math.round(region.left)} Y={Math.round(region.top)} — {Math.round(region.width)}×{Math.round(region.height)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRegion(i)}
                      className="text-red-500 hover:text-red-600 font-bold"
                      aria-label={`حذف المنطقة ${i + 1}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ToolSection>

          <ToolSection title="أسلوب الإخفاء">
            <div className="flex gap-2 mb-3">
              {(
                [
                  ['blur', 'طمس'],
                  ['pixelate', 'تنقيط'],
                ] as [ImageBlurEffect, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEffect(value)}
                  aria-pressed={effect === value}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    effect === value
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-light-border dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-primary-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="blur-intensity" className="text-sm text-gray-700 dark:text-gray-300 shrink-0">
                قوة التأثير
              </label>
              <input
                id="blur-intensity"
                type="range"
                min={BLUR_INTENSITY_MIN}
                max={BLUR_INTENSITY_MAX}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="flex-1 accent-primary-500"
              />
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400 tabular-nums w-8 text-center">
                {intensity}
              </span>
            </div>
          </ToolSection>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            <Button className="w-full" onClick={start} disabled={!canSubmit}>
              إخفاء المناطق المحددة
            </Button>
          )}

          {!canSubmit && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ارسم منطقة واحدة على الأقل (8×8 بكسل فأكثر) بالسحب على الصورة.
            </p>
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard result={result} onDownload={() => downloadResult(result)} onReset={resetAll} />
      )}

      <ToolTips
        items={[
          'يمكنك تحديد عدة مناطق قبل التنفيذ (حتى 20 منطقة).',
          '"التنقيط" يخفي المحتوى بشكل أقوى من "الطمس" ويصعب عكسه.',
          'ارسم فوق الوجوه وأرقام الهواتف وبيانات البطاقات لحمايتها.',
        ]}
      />
    </ToolBody>
  );
}
