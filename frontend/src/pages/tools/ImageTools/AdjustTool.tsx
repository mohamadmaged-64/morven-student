import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/UI/Button';
import {
  ADJUST_LIMITS,
  adjustImageFile,
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

type SliderKey = keyof typeof ADJUST_LIMITS;

const SLIDER_DEFS: { key: SliderKey; label: string; hint: string; unit?: string }[] = [
  { key: 'brightness', label: 'السطوع', hint: '100% = بدون تغيير', unit: '%' },
  { key: 'saturation', label: 'التشبع', hint: '100% = بدون تغيير', unit: '%' },
  { key: 'contrast', label: 'التباين', hint: '0 = بدون تغيير' },
  { key: 'blur', label: 'الضبابية', hint: '0 = بدون ضبابية', unit: '' },
  { key: 'sharpen', label: 'الحدة', hint: '0 = بدون حدة' },
];

const DEFAULTS: Record<SliderKey, number> = {
  brightness: ADJUST_LIMITS.brightness.default,
  saturation: ADJUST_LIMITS.saturation.default,
  contrast: ADJUST_LIMITS.contrast.default,
  blur: ADJUST_LIMITS.blur.default,
  sharpen: ADJUST_LIMITS.sharpen.default,
};

/** تعديل الصورة: سطوع، تشبع، تباين، ضبابية وحدة مع معاينة CSS حية. */
export default function AdjustTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [values, setValues] = useState<Record<SliderKey, number>>({ ...DEFAULTS });
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

  const changedKeys = useMemo(
    () => SLIDER_DEFS.map((d) => d.key).filter((key) => values[key] !== DEFAULTS[key]),
    [values]
  );
  const hasChanges = changedKeys.length > 0;

  const setValue = (key: SliderKey, value: number) => setValues((prev) => ({ ...prev, [key]: value }));

  /** Approximate live preview using CSS filters (final render happens on the server). */
  const cssFilter = (() => {
    const parts: string[] = [];
    if (values.brightness !== DEFAULTS.brightness) parts.push(`brightness(${values.brightness}%)`);
    if (values.saturation !== DEFAULTS.saturation) parts.push(`saturate(${values.saturation}%)`);
    if (values.contrast !== DEFAULTS.contrast) {
      // Server maps contrast -100..100 onto a linear transform; mirror it roughly.
      const factor = (100 + values.contrast) / 100;
      parts.push(`contrast(${Math.round(factor * 100)}%)`);
    }
    if (values.blur > 0) parts.push(`blur(${(values.blur * 0.5).toFixed(1)}px)`);
    return parts.join(' ') || undefined;
  })();

  const start = () =>
    run(async (onProgress, job) => {
      const payload: Record<string, number> = {};
      for (const key of changedKeys) payload[key] = values[key];
      return adjustImageFile(file as File, payload, onProgress, job);
    });

  const resetAll = () => {
    fullReset();
    setValues({ ...DEFAULTS });
  };

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="اضبط السطوع والتشبع والتباين والضبابية والحدة"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ToolSection title="معاينة مباشرة">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 flex items-center justify-center min-h-[200px] overflow-hidden">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="معاينة التعديلات"
                    className="max-w-full max-h-[240px] object-contain"
                    style={{ filter: cssFilter }}
                    draggable={false}
                  />
                )}
              </div>
              {!hasChanges && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">لم يتم اختيار أي تعديل بعد.</p>
              )}
            </ToolSection>

            <ToolSection title="إعدادات التعديل">
              <div className="space-y-4">
                {SLIDER_DEFS.map((def) => {
                  const limits = ADJUST_LIMITS[def.key];
                  return (
                    <div key={def.key}>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor={`adjust-${def.key}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {def.label}
                          {values[def.key] !== DEFAULTS[def.key] && (
                            <span className="text-primary-500 font-bold"> •</span>
                          )}
                        </label>
                        <span className="text-xs text-gray-500 tabular-nums" aria-live="off">
                          {values[def.key]}
                          {def.unit ?? ''}
                        </span>
                      </div>
                      <input
                        id={`adjust-${def.key}`}
                        type="range"
                        min={limits.min}
                        max={limits.max}
                        step={1}
                        value={values[def.key]}
                        onChange={(e) => setValue(def.key, Number(e.target.value))}
                        className="w-full accent-primary-500"
                      />
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{def.hint}</p>
                    </div>
                  );
                })}
              </div>
            </ToolSection>
          </div>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            <Button className="w-full" onClick={start} disabled={!hasChanges}>
              تطبيق التعديلات
            </Button>
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard result={result} onDownload={() => downloadResult(result)} onReset={resetAll} />
      )}

      <ToolTips
        items={[
          'المعاينة على اليسار تقريبية — المعالجة النهائية تتم على الخادم بدقة كاملة.',
          'ابدأ بضبط السطوع والتباين ثم أضف الحدة للحصول على نتيجة متوازنة.',
          'النقطة البنفسجية • تشير إلى الإعدادات التي غيّرتها.',
        ]}
      />
    </ToolBody>
  );
}
