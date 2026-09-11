import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Badge } from '@/components/UI/Badge';
import {
  MAX_VIDEO_SIZE_MB,
  SPEED_MAX,
  SPEED_MIN,
  changeVideoSpeed,
} from '@/services/mediaApi';
import {
  ToolBody,
  MediaUploadZone,
  VideoPreview,
  ProcessingPanel,
  ResultCard,
  ErrorCard,
  SelectedFileInfo,
  ToolSection,
  ToolTips,
  downloadResult,
  useMediaProcessor,
} from './shared';

const PRESETS: { value: number; label: string; hint: string; group: 'slower' | 'original' | 'faster'; disabled?: boolean }[] = [
  { value: 0.25, label: '0.25×', hint: 'ربع السرعة', group: 'slower' },
  { value: 0.5, label: '0.5×', hint: 'نصف السرعة', group: 'slower' },
  { value: 1, label: '1×', hint: 'السرعة الأصلية', group: 'original', disabled: true },
  { value: 1.5, label: '1.5×', hint: 'سرعة ونصف', group: 'faster' },
  { value: 2, label: '2×', hint: 'ضعف السرعة', group: 'faster' },
];

function ChangeSpeedTool() {
  const {
    file, processing, progress, result, error,
    handleFile, clearFile, run, cancel, fullReset,
  } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [selectedSpeed, setSelectedSpeed] = useState<number | null>(null);
  const [customSpeed, setCustomSpeed] = useState('');
  const [touched, setTouched] = useState(false);

  const usingCustom = selectedSpeed === null && customSpeed !== '';
  const customNum = customSpeed === '' ? NaN : Number(customSpeed);

  let validationError: string | null = null;
  if (usingCustom) {
    if (!Number.isFinite(customNum)) {
      validationError = 'أدخل قيمة رقمية للسرعة.';
    } else if (customNum < SPEED_MIN || customNum > SPEED_MAX) {
      validationError = `السرعة المدعومة بين ${SPEED_MIN}× و${SPEED_MAX}×.`;
    } else if (Math.abs(customNum - 1) < 1e-9) {
      validationError = 'الفيديو يعمل أصلًا بالسرعة العادية؛ اختر سرعة مختلفة.';
    }
  } else if (selectedSpeed === null) {
    validationError = 'اختر سرعة من القيم المتاحة أو أدخل سرعة مخصصة.';
  }

  const effectiveSpeed = usingCustom ? customNum : (selectedSpeed ?? NaN);

  const handleProcess = useCallback(() => {
    setTouched(true);
    if (validationError || !file || !Number.isFinite(effectiveSpeed)) return;
    run((onProgress, job) => changeVideoSpeed(file, effectiveSpeed, onProgress, job));
  }, [run, file, effectiveSpeed, validationError]);

  return (
    <ToolBody>
      {!file && (
        <MediaUploadZone
          label="ارفع فيديو لتغيير سرعته"
          description={`يُعدَّل إيقاع الصورة والصوت معًا — بين ${SPEED_MIN}× و${SPEED_MAX}×.`}
          onFilesSelected={handleFile}
        />
      )}
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />

          <ToolSection title="اختيار السرعة">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
              <span>أبطأ</span>
              <span>أسرع</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="اختيار السرعة">
              {PRESETS.map((preset) => {
                const active = selectedSpeed === preset.value;
                const disabled = Boolean(preset.disabled);
                return (
                  <motion.button
                    key={preset.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-disabled={disabled}
                    title={disabled ? 'الفيديو أصبح بالسرعة الأصلية؛ اختر سرعة مختلفة' : preset.hint}
                    onClick={() => { if (disabled) return; setSelectedSpeed(preset.value); setCustomSpeed(''); setTouched(true); }}
                    whileHover={disabled ? undefined : { scale: 1.03 }}
                    whileTap={disabled ? undefined : { scale: 0.97 }}
                    className={[
                      'rounded-xl border-2 p-3 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                      disabled
                        ? 'border-light-border/70 dark:border-dark-border/70 opacity-60 cursor-not-allowed'
                        : active
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 cursor-pointer'
                          : 'border-light-border dark:border-dark-border hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer',
                    ].join(' ')}
                  >
                    <span className={`block text-lg font-bold ${active ? 'text-primary-600 dark:text-primary-400' : disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`} dir="ltr">
                      {preset.label}
                    </span>
                    <span className={`block text-[11px] mt-1 ${active ? 'text-primary-500 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {preset.hint}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-[auto_1fr] items-end gap-3 pt-1 border-t border-dashed border-light-border dark:border-dark-border">
              <button
                type="button"
                onClick={() => { setSelectedSpeed(null); setTouched(true); }}
                className={[
                  'rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  usingCustom
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'border-light-border dark:border-dark-border text-gray-700 dark:text-gray-300 hover:border-primary-400',
                ].join(' ')}
                aria-pressed={usingCustom}
              >
                سرعة مخصصة
              </button>
              <Input
                label={`قيمة مخصصة (${SPEED_MIN} – ${SPEED_MAX})`}
                type="number"
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={0.05}
                inputMode="decimal"
                disabled={!usingCustom}
                value={customSpeed}
                onChange={(e) => { setCustomSpeed(e.target.value); setSelectedSpeed(null); setTouched(true); }}
                placeholder="مثال: 1.25"
                dir="ltr"
              />
            </div>
          </ToolSection>

          {!usingCustom && selectedSpeed !== null && !validationError && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400" role="status">
              سيتم تشغيل الفيديو بسرعة <span className="font-semibold tabular-nums" dir="ltr">{selectedSpeed}×</span>.
            </p>
          )}

          {touched && validationError && (
            <p className="text-sm text-red-500" role="alert">{validationError}</p>
          )}
        </>
      )}
      {processing && progress && <ProcessingPanel progress={progress} onCancel={() => void cancel()} />}
      {error && <ErrorCard message={error} />}
      {result && (
        <ResultCard
          result={result}
          onDownload={() => downloadResult(result)}
          onReset={fullReset}
        />
      )}
      {file && !result && !processing && (
        <Button
          onClick={handleProcess}
          disabled={Boolean(validationError)}
          loading={processing}
          className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>}
        >
          تغيير السرعة
        </Button>
      )}
      <ToolTips items={[
        `للحصول على سرعات غير القوالب الجاهزة استخدم خيار «سرعة مخصصة» بأي قيمة بين ${SPEED_MIN}× و${SPEED_MAX}×.`,
        'يُعاد ترميز الفيديو بالسرعة الجديدة ويُعدَّل الصوت بنفس النسبة ليظل متزامنًا مع الصورة.',
      ]} />
    </ToolBody>
  );
}

export { ChangeSpeedTool };
