import { useEffect, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { rotateImageFile, type FlipMode, type RotateDegrees } from '@/services/mediaApi';
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

const ROTATIONS: { value: RotateDegrees; label: string; icon: string }[] = [
  { value: 0, label: 'بدون تدوير', icon: '⟲' },
  { value: 90, label: '90°', icon: '↻' },
  { value: 180, label: '180°', icon: '⇅' },
  { value: 270, label: '270°', icon: '↺' },
];

/** تدوير وقلب الصورة مع معاينة CSS فورية. */
export default function RotateTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [rotation, setRotation] = useState<RotateDegrees>(0);
  const [flip, setFlip] = useState<FlipMode>('none');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const noChange = rotation === 0 && flip === 'none';

  const toggleFlip = (axis: Exclude<FlipMode, 'none'>) =>
    setFlip((current) => (current === axis ? 'none' : axis));

  const previewTransform = (() => {
    const parts: string[] = [];
    if (flip === 'h') parts.push('scaleX(-1)');
    if (flip === 'v') parts.push('scaleY(-1)');
    if (rotation !== 0) parts.push(`rotate(${rotation}deg)`);
    return parts.join(' ') || undefined;
  })();

  const start = () =>
    run(async (onProgress, job) => rotateImageFile(file as File, { rotate: rotation, flip }, onProgress, job));

  const reset = () => {
    fullReset();
    setRotation(0);
    setFlip('none');
  };

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="تدوير بزوايا 90° أو قلب أفقي/عمودي مع معاينة فورية"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <ToolSection title="التدوير والقلب" summary="المعاينة أدناه تطابق النتيجة النهائية تمامًا.">
            <div className="flex flex-wrap gap-2">
              {ROTATIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRotation(option.value)}
                  aria-pressed={rotation === option.value}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    rotation === option.value
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-light-border dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-primary-400'
                  }`}
                >
                  <span aria-hidden="true" className="me-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleFlip('h')}
                aria-pressed={flip === 'h'}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  flip === 'h'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-light-border dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-emerald-400'
                }`}
              >
                ↔ قلب أفقي
              </button>
              <button
                type="button"
                onClick={() => toggleFlip('v')}
                aria-pressed={flip === 'v'}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  flip === 'v'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-light-border dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-emerald-400'
                }`}
              >
                ↕ قلب عمودي
              </button>
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 flex items-center justify-center min-h-[220px] overflow-hidden">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="معاينة التدوير"
                  className="max-w-full max-h-[280px] object-contain transition-transform duration-200"
                  style={{ transform: previewTransform }}
                  draggable={false}
                />
              )}
            </div>
          </ToolSection>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            <Button className="w-full" onClick={start} disabled={noChange}>
              {noChange ? 'اختر تدويرًا أو قلبًا واحدًا على الأقل' : 'تطبيق التعديلات'}
            </Button>
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard result={result} onDownload={() => downloadResult(result)} onReset={reset} />
      )}

      <ToolTips
        items={[
          'يمكن دمج التدوير مع القلب في نفس العملية.',
          'القلب الأفقي مفيد لصور السيلفي قبل النشر.',
          'الجودة الأصلية محفوظة بالكامل — لا يوجد إعادة ترميز بفقدان إضافي.',
        ]}
      />
    </ToolBody>
  );
}
