import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/UI/Button';
import {
  IMAGE_DIMENSION_MAX,
  IMAGE_DIMENSION_MIN,
  resizeImageFile,
  type ImageFitMode,
} from '@/services/mediaApi';
import {
  ImagePreview,
  type ImageMeta,
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

const FIT_OPTIONS: { value: ImageFitMode; label: string }[] = [
  { value: 'inside', label: 'احتواء داخل الأبعاد (الحفاظ على النسبة)' },
  { value: 'cover', label: 'تغطية كاملة الأبعاد (قص الزائد)' },
  { value: 'contain', label: 'احتواء مع خلفية (بدون قص)' },
  { value: 'fill', label: 'تمديد مطابقة الأبعاد (قد يشوه النسبة)' },
];

/** تغيير حجم الصورة مع قفل نسبة الأبعاد وخيارات الملاءمة. */
export default function ResizeTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [lockRatio, setLockRatio] = useState(true);
  const [fit, setFit] = useState<ImageFitMode>('inside');
  const [upscale, setUpscale] = useState(false);

  useEffect(() => {
    setMeta(null);
    setWidth('');
    setHeight('');
    if (!file) return;
    // Probe natural dimensions to power the ratio lock.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setMeta({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [file]);

  const parsedWidth = width === '' ? undefined : Number(width);
  const parsedHeight = height === '' ? undefined : Number(height);

  const canSubmit = useMemo(() => {
    const wOk = parsedWidth === undefined || (Number.isInteger(parsedWidth) && parsedWidth >= IMAGE_DIMENSION_MIN && parsedWidth <= IMAGE_DIMENSION_MAX);
    const hOk = parsedHeight === undefined || (Number.isInteger(parsedHeight) && parsedHeight >= IMAGE_DIMENSION_MIN && parsedHeight <= IMAGE_DIMENSION_MAX);
    return (parsedWidth !== undefined || parsedHeight !== undefined) && wOk && hOk;
  }, [parsedWidth, parsedHeight]);

  const onWidthChange = (value: string) => {
    setWidth(value);
    if (lockRatio && meta && meta.width > 0 && value !== '') {
      const next = Math.round((Number(value) * meta.height) / meta.width);
      if (Number.isFinite(next)) setHeight(String(next));
    }
  };

  const onHeightChange = (value: string) => {
    setHeight(value);
    if (lockRatio && meta && meta.height > 0 && value !== '') {
      const next = Math.round((Number(value) * meta.width) / meta.height);
      if (Number.isFinite(next)) setWidth(String(next));
    }
  };

  const start = () =>
    run(async (onProgress, job) =>
      resizeImageFile(
        file as File,
        {
          width: parsedWidth === undefined ? undefined : Math.round(parsedWidth),
          height: parsedHeight === undefined ? undefined : Math.round(parsedHeight),
          fit,
          upscale,
        },
        onProgress,
        job
      )
    );

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="حدد أبعادًا جديدة مع الحفاظ على تناسب الصورة"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <ToolSection
            title="الأبعاد الجديدة (بكسل)"
            summary={meta ? `أبعاد الصورة الحالية: ${meta.width}×${meta.height}` : 'جارٍ قراءة الأبعاد...'}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">العرض</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={IMAGE_DIMENSION_MIN}
                  max={IMAGE_DIMENSION_MAX}
                  value={width}
                  onChange={(e) => onWidthChange(e.target.value)}
                  placeholder="تلقائي"
                  className="w-full rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">الارتفاع</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={IMAGE_DIMENSION_MIN}
                  max={IMAGE_DIMENSION_MAX}
                  value={height}
                  onChange={(e) => onHeightChange(e.target.value)}
                  placeholder="تلقائي"
                  className="w-full rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={lockRatio}
                onChange={(e) => setLockRatio(e.target.checked)}
                className="rounded accent-primary-500"
              />
              قفل نسبة الأبعاد تلقائيًا
            </label>

            <label className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">طريقة الملاءمة</span>
              <select
                value={fit}
                onChange={(e) => setFit(e.target.value as ImageFitMode)}
                aria-label="طريقة الملاءمة"
                className="w-full rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm"
              >
                {FIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={upscale}
                onChange={(e) => setUpscale(e.target.checked)}
                className="rounded accent-primary-500"
              />
              السماح بتكبير الصورة عن أبعادها الأصلية
            </label>
          </ToolSection>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            <Button className="w-full" onClick={start} disabled={!canSubmit}>
              تغيير الحجم
            </Button>
          )}

          {!canSubmit && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              أدخل عرضًا أو ارتفاعًا بين {IMAGE_DIMENSION_MIN} و{IMAGE_DIMENSION_MAX} بكسل.
            </p>
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard
          result={result}
          extraInfo={<ImagePreview file={new File([result.blob], result.filename, { type: result.blob.type })} />}
          onDownload={() => downloadResult(result)}
          onReset={fullReset}
        />
      )}

      <ToolTips
        items={[
          'اترك أحد الحقلين فارغًا لاحتسابه تلقائيًا وفق نسبة الأبعاد.',
          'وضع "احتواء داخل الأبعاد" يضمن عدم تجاوز الأبعاد المحددة.',
          'النطاق المدعوم للأبعاد من 8 إلى 7680 بكسل.',
        ]}
      />
    </ToolBody>
  );
}
