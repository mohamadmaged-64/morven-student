import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { Input, Select } from '@/components/UI/Input';
import { MAX_VIDEO_SIZE_MB, editVideoFile } from '@/services/mediaApi';
import type { FlipMode, ResizePresetKey, RotateDegrees } from '@/services/mediaApi';
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

const RESIZE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'بدون تغيير الحجم' },
  { value: '1080p', label: '1080p — Full HD' },
  { value: '720p', label: '720p — HD' },
  { value: '480p', label: '480p — SD' },
  { value: '360p', label: '360p — حجم أصغر' },
  { value: 'custom', label: 'مخصص (تحديد العرض والارتفاع)' },
];

const ROTATE_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: 'بدون تدوير' },
  { value: '90', label: '90° — يمين' },
  { value: '180', label: '180° — مقلوب' },
  { value: '270', label: '270° — يسار' },
];

const FLIP_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'بدون قلب' },
  { value: 'h', label: 'أفقي (مرآة)' },
  { value: 'v', label: 'رأسي' },
];

const MIN_DIM = 16;
const MAX_DIM = 7680;

function EditVideoTool() {
  const {
    file, processing, progress, result, error,
    handleFile, clearFile, run, cancel, fullReset,
  } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [preset, setPreset] = useState<string>('none');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [rotate, setRotate] = useState<RotateDegrees>(0);
  const [flip, setFlip] = useState<FlipMode>('none');
  const [touched, setTouched] = useState(false);

  const widthNum = width === '' ? NaN : Number(width);
  const heightNum = height === '' ? NaN : Number(height);

  const isCustom = preset === 'custom';

  let validationError: string | null = null;
  if (isCustom) {
    if (
      !Number.isInteger(widthNum) || !Number.isInteger(heightNum) ||
      widthNum < MIN_DIM || widthNum > MAX_DIM ||
      heightNum < MIN_DIM || heightNum > MAX_DIM
    ) {
      validationError = `أبعاد مخصصة غير صالحة: أدخل أرقامًا صحيحة بين ${MIN_DIM} و${MAX_DIM}.`;
    } else if (widthNum % 2 !== 0 || heightNum % 2 !== 0) {
      validationError = 'يجب أن تكون الأبعاد أرقامًا زوجية (متطلب ترميز الفيديو).';
    }
  }
  if (!validationError && preset === 'none' && rotate === 0 && flip === 'none') {
    validationError = 'اختر تعديلًا واحدًا على الأقل: تغيير الحجم أو التدوير أو القلب.';
  }

  const transformSummary: string[] = [];
  if (!isCustom && preset !== 'none') transformSummary.push(`الحجم: ${preset}`);
  if (isCustom && !Number.isNaN(widthNum) && !Number.isNaN(heightNum)) transformSummary.push(`الحجم: ${widthNum}×${heightNum}`);
  if (rotate !== 0) transformSummary.push(`التدوير: ${rotate}°`);
  if (flip !== 'none') transformSummary.push(flip === 'h' ? 'القلب: أفقي' : 'القلب: رأسي');

  const handleProcess = useCallback(() => {
    setTouched(true);
    if (validationError || !file) return;
    run((onProgress, job) =>
      editVideoFile(
        file,
        {
          ...(preset === 'none' ? {} : { preset: preset as ResizePresetKey }),
          ...(isCustom ? { customWidth: widthNum, customHeight: heightNum } : {}),
          rotate,
          flip,
        },
        onProgress,
        job
      )
    );
  }, [run, file, preset, isCustom, widthNum, heightNum, rotate, flip, validationError]);

  return (
    <ToolBody>
      {!file && (
        <MediaUploadZone
          label="ارفع فيديو للتحرير"
          description={`تغيير الحجم والتدوير والقلب في معالجة واحدة  — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
          onFilesSelected={handleFile}
        />
      )}
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />

          <ToolSection title="الأبعاد" summary="اختر مقاسًا جاهزًا أو حدد عرضًا وارتفاعًا مخصصين.">
            <Select
              label="مقاس الإطار"
              value={preset}
              onChange={(e) => { setPreset(e.target.value); setTouched(true); }}
              options={RESIZE_OPTIONS}
            />
            {isCustom ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="العرض (بكسل)"
                  type="number"
                  min={MIN_DIM}
                  max={MAX_DIM}
                  step={2}
                  inputMode="numeric"
                  value={width}
                  onChange={(e) => { setWidth(e.target.value); setTouched(true); }}
                  placeholder="مثال: 1280"
                  dir="ltr"
                />
                <Input
                  label="الارتفاع (بكسل)"
                  type="number"
                  min={MIN_DIM}
                  max={MAX_DIM}
                  step={2}
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => { setHeight(e.target.value); setTouched(true); }}
                  placeholder="مثال: 720"
                  dir="ltr"
                />
              </div>
            ) : (
              preset !== 'none' && (
                <p className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg px-3 py-2">
                  يتم تعديل الارتفاع إلى القيمة المحددة مع الحفاظ على نسبة العرض تلقائيًا.
                </p>
              )
            )}
          </ToolSection>

          <div className="grid sm:grid-cols-2 gap-3">
            <ToolSection title="التدوير">
              <Select
                aria-label="التدوير"
                value={String(rotate)}
                onChange={(e) => { setRotate(Number(e.target.value) as RotateDegrees); setTouched(true); }}
                options={ROTATE_OPTIONS}
              />
            </ToolSection>
            <ToolSection title="القلب">
              <Select
                aria-label="القلب"
                value={flip}
                onChange={(e) => { setFlip(e.target.value as FlipMode); setTouched(true); }}
                options={FLIP_OPTIONS}
              />
            </ToolSection>
          </div>

          {transformSummary.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400" role="status">
              التعديلات المختارة: {transformSummary.join(' • ')}
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
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}
        >
          تعديل الفيديو
        </Button>
      )}
      <ToolTips items={[
        'أبعاد الفيديو المخصصة يجب أن تكون أرقامًا زوجية لضمان توافق الترميز.',
        'يمكن دمج أكثر من تعديل معًا؛ مثل تدوير الفيديو وتصغير حجمه في معالجة واحدة.',
      ]} />
    </ToolBody>
  );
}

export { EditVideoTool };
