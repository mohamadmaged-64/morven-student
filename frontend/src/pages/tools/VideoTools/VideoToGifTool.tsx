import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { Input, Select } from '@/components/UI/Input';
import { Badge } from '@/components/UI/Badge';
import {
  GIF_FPS_DEFAULT,
  GIF_FPS_MAX,
  GIF_FPS_MIN,
  GIF_WIDTH_DEFAULT,
  MAX_VIDEO_SIZE_MB,
  convertVideoToGif,
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
  formatSecondsLabel,
  useMediaProcessor,
  type VideoMeta,
} from './shared';

const MAX_CLIP_SECONDS = 60;
const MAX_FRAMES = 750;

const FPS_OPTIONS = [5, 10, 15, 20];
const WIDTH_OPTIONS = [240, 320, 480, 640];

function VideoToGifTool() {
  const {
    file, processing, progress, result, error,
    handleFile, clearFile, run, cancel, fullReset,
  } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [fps, setFps] = useState(GIF_FPS_DEFAULT);
  const [width, setWidth] = useState(GIF_WIDTH_DEFAULT);
  const [touched, setTouched] = useState(false);

  const onMeta = useCallback((next: VideoMeta) => setMeta(next), []);

  let validationError: string | null = null;
  if (start !== '' && end !== '') {
    const s = Number(start);
    const e = Number(end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e < 0) {
      validationError = 'أدخل قيمًا رقمية صحيحة للوقت.';
    } else if (e <= s) {
      validationError = 'وقت النهاية يجب أن يكون بعد وقت البداية.';
    } else if (e - s > MAX_CLIP_SECONDS) {
      validationError = `مدة مقطع GIF محدودة بـ ${MAX_CLIP_SECONDS} ثانية. اختر مقطعًا أقصر.`;
    } else if (Math.ceil((e - s) * fps) > MAX_FRAMES) {
      validationError = 'هذه الإعدادات ستنشئ إطارات كثيرة جدًا. اختر FPS أقل أو مقطعًا أقصر.';
    }
  } else if ((start === '') !== (end === '')) {
    validationError = 'أدخل وقتي البداية والنهاية معًا، أو اتركهما فارغين لتحويل الفيديو كاملًا.';
  }
  if (!validationError && start === '' && end === '' && meta && meta.duration * fps > MAX_FRAMES) {
    validationError = `مدة الفيديو (${Math.ceil(meta.duration)} ثانية) طويلة على FPS المحدد للتحويل الكامل. حدد بداية ونهاية أو خفّض FPS.`;
  }

  const handleProcess = useCallback(() => {
    setTouched(true);
    if (validationError || !file) return;
    run((onProgress, job) =>
      convertVideoToGif(
        file,
        {
          fps,
          width,
          ...(start !== '' && end !== ''
            ? { start: Number(start), end: Number(end) }
            : {}),
        },
        onProgress,
        job
      )
    );
  }, [run, file, fps, width, start, end, validationError]);

  return (
    <ToolBody>
      {!file && (
        <MediaUploadZone
          label="ارفع فيديو لتحويله إلى GIF"
          description={`تُستخرج الحركة بلوحة ألوان محسّنة — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
          onFilesSelected={handleFile}
        />
      )}
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} onMeta={onMeta} />

          <ToolSection title="مقطع GIF (اختياري)" summary="اترك الحقلين فارغين لتحويل الفيديو كاملًا.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="بداية المقطع (ثانية)"
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                value={start}
                onChange={(e) => { setStart(e.target.value); setTouched(true); }}
                placeholder="0"
                helperText={meta ? `المدة الكاملة: ${formatSecondsLabel(meta.duration)}` : undefined}
              />
              <Input
                label="نهاية المقطع (ثانية)"
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                value={end}
                onChange={(e) => { setEnd(e.target.value); setTouched(true); }}
                placeholder={meta ? String(Math.min(5, Math.floor(meta.duration))) : '5'}
              />
            </div>
          </ToolSection>

          <ToolSection title="إعدادات متقدمة" summary="FPS الأعلى يعني حركة أكثر سلاسة، والعرض الأكبر يعني صورة أوضح — وكلاهما يرفع حجم الملف.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Select
                label="عدد الإطارات في الثانية (FPS)"
                value={String(fps)}
                onChange={(e) => { setFps(Number(e.target.value)); setTouched(true); }}
                options={FPS_OPTIONS.map((f) => ({
                  value: String(f),
                  label: `${f} FPS${f === GIF_FPS_DEFAULT ? ' — موصى به' : f === GIF_FPS_MAX ? ' — حركة سلسة (حجم أكبر)' : f === GIF_FPS_MIN ? ' — حجم أصغر' : ''}`,
                }))}
              />
              <Select
                label="عرض الصورة"
                value={String(width)}
                onChange={(e) => { setWidth(Number(e.target.value)); setTouched(true); }}
                options={WIDTH_OPTIONS.map((w) => ({
                  value: String(w),
                  label: `${w}px${w === GIF_WIDTH_DEFAULT ? ' — موصى به' : ''}`,
                }))}
              />
            </div>
          </ToolSection>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">الحد الأقصى: {MAX_CLIP_SECONDS} ثانية</Badge>
            <Badge variant="info">حتى {MAX_FRAMES} إطار</Badge>
          </div>

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
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 9h4M13 9h4M7 13h10M8 17h8"/></svg>}
        >
          إنشاء GIF
        </Button>
      )}
      <ToolTips items={[
        'مقاطع قصيرة (أقل من 10 ثوانٍ) تعطي GIF أخف وأسهل للمشاركة.',
        'ملفات GIF لا تحتوي على صوت؛ استخدم أدوات الفيديو إذا احتجت الاحتفاظ بالصوت.',
      ]} />
    </ToolBody>
  );
}

export { VideoToGifTool };
