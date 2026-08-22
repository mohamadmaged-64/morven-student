import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Select } from '@/components/UI/Input';
import { FileUpload } from '@/components/UI/FileUpload';
import { ProgressBar } from '@/components/UI/ProgressBar';
import { EmptyState } from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { saveToLibrary } from '@/services/savedFilesService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  ACCEPTED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE_MB,
  cancelMediaJob,
  compressVideoFile,
  convertVideoFile,
  extractAudioFromVideo,
  toArabicMediaError,
} from '@/services/mediaApi';
import type {
  AudioFormat,
  AudioQuality,
  CompressionPreset,
  MediaProgressHandler,
  MediaResult,
  VideoFormat,
} from '@/services/mediaApi';

type ToolId =
  | 'extract-audio-video'
  | 'compress-video'
  | 'convert-video'
  | 'convert-video-formats'
  | 'video-to-audio';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function VideoPreview({ file, videoRef }: { file: File; videoRef: React.RefObject<HTMLVideoElement> }) {
  const [url, setUrl] = useState<string>('');
  const [meta, setMeta] = useState<{ duration: number; width: number; height: number } | null>(null);

  const handleLoaded = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      setMeta({ duration: el.duration, width: el.videoWidth, height: el.videoHeight });
    }
  }, [videoRef]);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black">
        <video key={url} ref={videoRef} src={url} controls className="w-full max-h-[400px] object-contain" onLoadedMetadata={handleLoaded} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary">{formatBytes(file.size)}</Badge>
        <Badge variant="secondary">{file.type || 'نوع غير معروف'}</Badge>
        {meta && (
          <>
            <Badge variant="info">{Math.floor(meta.duration)} ث</Badge>
            <Badge variant="neutral">{meta.width}x{meta.height}</Badge>
          </>
        )}
      </div>
    </div>
  );
}

type ProgressState = { phase: 'uploading' | 'processing' | 'downloading'; percent: number | null };

const PHASE_LABELS: Record<ProgressState['phase'], string> = {
  uploading: 'جاري رفع الفيديو إلى خادم المعالجة...',
  processing: 'جارٍ معالجة الفيديو على الخادم...',
  downloading: 'جاري تنزيل الناتج...',
};

function IndeterminateBar() {
  return (
    <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden" role="progressbar" aria-label="المعالجة جارية">
      <motion.div
        className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-emerald-400"
        initial={{ x: '-120%' }}
        animate={{ x: '360%' }}
        transition={{ repeat: Infinity, duration: 1.3, ease: 'linear' }}
      />
    </div>
  );
}

function ProcessingPanel({ progress, onCancel }: { progress: ProgressState; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {PHASE_LABELS[progress.phase]}
        </span>
        <button
          onClick={onCancel}
          className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
        >
          إلغاء
        </button>
      </div>
      {progress.percent === null ? (
        <IndeterminateBar />
      ) : (
        <ProgressBar value={progress.percent} color="gradient" size="md" animated={false} />
      )}
      {progress.phase === 'processing' && progress.percent === null && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          قد تستغرق المعالجة عدة دقائق حسب حجم الملف وجودة الفيديو.
        </p>
      )}
    </motion.div>
  );
}

function ResultCard({ result, extraInfo, onDownload, onReset }: {
  result: MediaResult;
  extraInfo?: React.ReactNode;
  onDownload: () => void;
  onReset: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card padding="sm" className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400 shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">تمت المعالجة بنجاح</p>
        </div>
      </Card>

      <Card padding="sm">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-light-border dark:border-dark-border p-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" dir="ltr">{result.filename}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">الحجم النهائي: {formatBytes(result.blob.size)}</p>
            </div>
          </div>
          <Badge variant="success" dot>جاهز</Badge>
        </div>

        {extraInfo && <div className="mt-3">{extraInfo}</div>}

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button className="flex-1" onClick={onDownload}>
            تنزيل الملف
          </Button>
          <Button variant="secondary" onClick={onReset}>
            معالجة ملف آخر
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card padding="sm" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="flex items-start gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="font-semibold text-red-600 dark:text-red-400">تعذرت المعالجة</p>
            <p className="text-sm text-red-500 dark:text-red-300 mt-1">{message}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function OfflineNotice() {
  return (
    <Card padding="sm" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          لا يوجد اتصال حاليًا. واجهة الأداة متاحة دون اتصال، لكن معالجة الفيديو تتم على خادم المعالجة وتتطلب اتصالًا بالإنترنت. أعد المحاولة عند توفر الاتصال.
        </p>
      </div>
    </Card>
  );
}

type JobHandle = { jobId?: string; abortUpload?: () => void };

function useMediaProcessor() {
  const { addNotification } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobRef = useRef<JobHandle>({});
  const cancelledRef = useRef(false);

  const processing = progress !== null;

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length > 0) {
      setFile(files[0].file);
      setResult(null);
      setError(null);
    }
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(
    (task: (onProgress: MediaProgressHandler, job: JobHandle) => Promise<MediaResult>) => {
      if (!file || processing) return;
      cancelledRef.current = false;
      jobRef.current = {};
      setResult(null);
      setError(null);
      setProgress({ phase: 'uploading', percent: 0 });
      void (async () => {
        try {
          const res = await task((p) => setProgress(p), jobRef.current);
          setResult(res);
          saveToLibrary(res.blob, res.filename, 'video-tools').catch(() => {});
          addNotification('تمت المعالجة بنجاح', 'success');
        } catch (err) {
          if (!cancelledRef.current) {
            setError(toArabicMediaError(err));
          }
        } finally {
          setProgress(null);
        }
      })();
    },
    [file, processing, addNotification]
  );

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    setProgress(null);
    const job = jobRef.current;
    job.abortUpload?.();
    if (job.jobId) {
      await cancelMediaJob(job.jobId);
    }
  }, []);

  const fullReset = useCallback(() => {
    cancelledRef.current = true;
    setFile(null);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset };
}

function SelectedFileInfo({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-light-border dark:border-dark-border p-3">
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">تم اختيار:</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate" dir="ltr">{file.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
        aria-label="إزالة الملف"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function AudioFormatOptions({ format, quality, onFormatChange, onQualityChange }: {
  format: AudioFormat;
  quality: AudioQuality;
  onFormatChange: (f: AudioFormat) => void;
  onQualityChange: (q: AudioQuality) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Select
        label="صيغة الصوت الناتج"
        value={format}
        onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
        options={[
          { value: 'mp3', label: 'MP3 — الأكثر توافقًا (افتراضي)' },
          { value: 'm4a', label: 'M4A — جودة عالية بحجم أصغر' },
          { value: 'wav', label: 'WAV — بدون فقدان في الجودة' },
        ]}
      />
      {format !== 'wav' && (
        <Select
          label="جودة الصوت"
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as AudioQuality)}
          options={[
            { value: 'high', label: 'عالية (حجم أكبر)' },
            { value: 'standard', label: 'قياسية (حجم أصغر)' },
          ]}
        />
      )}
    </div>
  );
}

function ExtractAudioFromVideo() {
  const online = useOnlineStatus();
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [quality, setQuality] = useState<AudioQuality>('high');

  const handleProcess = useCallback(() => {
    run((onProgress, job) => extractAudioFromVideo(file!, { format, quality }, onProgress, job));
  }, [run, file, format, quality]);

  return (
    <div className="space-y-4" dir="rtl">
      {!online && <OfflineNotice />}
      <FileUpload
        accept={['video/*', ...ACCEPTED_VIDEO_EXTENSIONS]}
        maxSize={MAX_VIDEO_SIZE_MB * 1024 * 1024}
        readFileData={false}
        onFilesSelected={handleFile}
        label="ارفع ملف فيديو"
        description={`يدعم MP4 وMOV وWebM وMKV وغيرها — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
      />
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />
          <AudioFormatOptions
            format={format}
            quality={quality}
            onFormatChange={setFormat}
            onQualityChange={setQuality}
          />
        </>
      )}
      {processing && progress && <ProcessingPanel progress={progress} onCancel={() => void cancel()} />}
      {error && <ErrorCard message={error} />}
      {result && (
        <ResultCard
          result={result}
          onDownload={() => saveAs(result.blob, result.filename)}
          onReset={fullReset}
        />
      )}
      {file && !result && !processing && (
        <Button onClick={handleProcess} disabled={!online} loading={processing} className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
        >
          استخراج الصوت من الفيديو
        </Button>
      )}
    </div>
  );
}

const COMPRESSION_PRESETS: { value: CompressionPreset; label: string; description: string }[] = [
  { value: 'light', label: 'ضغط خفيف', description: 'أعلى جودة ممكنة مع تقليل معتدل في الحجم' },
  { value: 'medium', label: 'ضغط متوسط', description: 'توازن جيد بين الحجم والجودة (موصى به)' },
  { value: 'strong', label: 'ضغط قوي', description: 'أصغر حجم ممكن مع جودة مقبولة' },
];

function CompressVideo() {
  const online = useOnlineStatus();
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [preset, setPreset] = useState<CompressionPreset>('medium');

  const handleCompress = useCallback(() => {
    run((onProgress, job) => compressVideoFile(file!, preset, onProgress, job));
  }, [run, file, preset]);

  const outputSize = result?.blob.size ?? 0;
  const originalSize = file?.size ?? 0;
  const savedBytes = originalSize - outputSize;
  const reductionPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

  return (
    <div className="space-y-4" dir="rtl">
      {!online && <OfflineNotice />}
      <FileUpload
        accept={['video/*', ...ACCEPTED_VIDEO_EXTENSIONS]}
        maxSize={MAX_VIDEO_SIZE_MB * 1024 * 1024}
        readFileData={false}
        onFilesSelected={handleFile}
        label="ارفع فيديو لضغطه"
        description={`يعيد الخادم ترميز الفيديو باستخدام FFmpeg لتقليل حجمه — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
      />
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />
          <Select
            label="مستوى الضغط"
            value={preset}
            onChange={(e) => setPreset(e.target.value as CompressionPreset)}
            options={COMPRESSION_PRESETS.map((p) => ({ value: p.value, label: `${p.label} — ${p.description}` }))}
          />
          <Card padding="sm" className="bg-gray-50 dark:bg-dark-surface">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">الحجم الأصلي:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{formatBytes(originalSize)}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">الصيغة:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{file.type || 'غير معروف'}</span></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              نسبة التقليل تعتمد على محتوى الفيديو الأصلي ودرجة ضغطه الحالية.
            </p>
          </Card>
        </>
      )}
      {processing && progress && <ProcessingPanel progress={progress} onCancel={() => void cancel()} />}
      {error && <ErrorCard message={error} />}
      {result && (
        <ResultCard
          result={result}
          onDownload={() => saveAs(result.blob, result.filename)}
          onReset={fullReset}
          extraInfo={
            savedBytes > 0 ? (
              <div className="grid grid-cols-2 gap-3 text-sm rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3">
                <div><span className="text-gray-500 dark:text-gray-400">الحجم الأصلي:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{formatBytes(originalSize)}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">الحجم الجديد:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{formatBytes(outputSize)}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">تم توفير:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatBytes(savedBytes)}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">نسبة التقليل:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">{reductionPercent}%</span></div>
              </div>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                لم يتم تقليل حجم هذا الملف؛ يبدو أنه مضغوط مسبقًا بكفاءة عالية. جرّب مستوى ضغط أقوى أو استخدم الملف كما هو.
              </p>
            )
          }
        />
      )}
      {file && !result && !processing && (
        <Button onClick={handleCompress} disabled={!online} loading={processing} className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>}
        >
          ضغط الفيديو
        </Button>
      )}
    </div>
  );
}

const CONVERT_TARGETS: { value: VideoFormat; label: string }[] = [
  { value: 'mp4', label: 'MP4 — الأكثر توافقًا مع جميع الأجهزة' },
  { value: 'webm', label: 'WebM — مثالي للويب' },
  { value: 'mov', label: 'MOV — Apple QuickTime' },
  { value: 'mkv', label: 'MKV — حاوية مرنة عالية الجودة' },
];

function ConvertVideoFormats() {
  const online = useOnlineStatus();
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [target, setTarget] = useState<VideoFormat>('webm');

  const currentExt = (file?.name.split('.').pop() || '').toLowerCase();
  const availableTargets = CONVERT_TARGETS.filter((t) => t.value !== currentExt);

  useEffect(() => {
    if (availableTargets.length > 0 && !availableTargets.some((t) => t.value === target)) {
      setTarget(availableTargets[0].value);
    }
  }, [availableTargets, target]);

  const displayFormat = currentExt ? currentExt.toUpperCase() : 'غير معروف';

  const handleConvert = useCallback(() => {
    run((onProgress, job) => convertVideoFile(file!, target, onProgress, job));
  }, [run, file, target]);

  return (
    <div className="space-y-4" dir="rtl">
      {!online && <OfflineNotice />}
      <FileUpload
        accept={['video/*', ...ACCEPTED_VIDEO_EXTENSIONS]}
        maxSize={MAX_VIDEO_SIZE_MB * 1024 * 1024}
        readFileData={false}
        onFilesSelected={handleFile}
        label="ارفع فيديو للتحويل"
        description={`يتم التحويل على خادم المعالجة باستخدام FFmpeg — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
      />
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />
          <div className="grid sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Card padding="sm" className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">الصيغة الحالية</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{displayFormat}</p>
            </Card>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500 mx-auto rotate-90 sm:rotate-180">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            <Select
              label="الصيغة المطلوبة"
              value={target}
              onChange={(e) => setTarget(e.target.value as VideoFormat)}
              options={availableTargets.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>
          <Card padding="sm" className="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800">
            <p className="text-sm text-sky-700 dark:text-sky-300">
              تتم إعادة ترميز الفيديو بالكودك المناسب لكل صيغة على الخادم، فتحصل على ملف حقيقي بالصيغة المطلوبة.
            </p>
          </Card>
        </>
      )}
      {processing && progress && <ProcessingPanel progress={progress} onCancel={() => void cancel()} />}
      {error && <ErrorCard message={error} />}
      {result && (
        <ResultCard
          result={result}
          onDownload={() => saveAs(result.blob, result.filename)}
          onReset={fullReset}
        />
      )}
      {file && !result && !processing && (
        <Button onClick={handleConvert} disabled={!online} loading={processing} className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>}
        >
          تحويل إلى {target.toUpperCase()}
        </Button>
      )}
    </div>
  );
}

function VideoToAudio() {
  const online = useOnlineStatus();
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [quality, setQuality] = useState<AudioQuality>('standard');

  const handleConvert = useCallback(() => {
    run((onProgress, job) => extractAudioFromVideo(file!, { format, quality }, onProgress, job));
  }, [run, file, format, quality]);

  return (
    <div className="space-y-4" dir="rtl">
      {!online && <OfflineNotice />}
      <FileUpload
        accept={['video/*', ...ACCEPTED_VIDEO_EXTENSIONS]}
        maxSize={MAX_VIDEO_SIZE_MB * 1024 * 1024}
        readFileData={false}
        onFilesSelected={handleFile}
        label="ارفع فيديو لاستخراج الصوت"
        description={`حوّل المسار الصوتي للفيديو إلى ملف صوتي مستقل — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
      />
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />
          <AudioFormatOptions
            format={format}
            quality={quality}
            onFormatChange={setFormat}
            onQualityChange={setQuality}
          />
        </>
      )}
      {processing && progress && <ProcessingPanel progress={progress} onCancel={() => void cancel()} />}
      {error && <ErrorCard message={error} />}
      {result && (
        <ResultCard
          result={result}
          onDownload={() => saveAs(result.blob, result.filename)}
          onReset={fullReset}
        />
      )}
      {file && !result && !processing && (
        <Button onClick={handleConvert} disabled={!online} loading={processing} className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
        >
          تحويل الفيديو إلى صوت
        </Button>
      )}
    </div>
  );
}

function VideoToolPage({ toolId }: { toolId: string }) {
  const navigate = useNavigate();
  const convertComponent = <ConvertVideoFormats />;
  const configs: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
    'extract-audio-video': {
      title: 'استخراج الصوت من الفيديو',
      description: 'فصل الصوت عن ملفات الفيديو عبر خادم المعالجة',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
      component: <ExtractAudioFromVideo />,
    },
    'compress-video': {
      title: 'ضغط الفيديو',
      description: 'قلّل حجم الفيديو بإعادة ترميز احترافية',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
      component: <CompressVideo />,
    },
    'convert-video': {
      title: 'تحويل صيغ الفيديو',
      description: 'التحويل بين MP4 وWebM وMOV وMKV',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
      component: convertComponent,
    },
    'convert-video-formats': {
      title: 'تحويل صيغ الفيديو',
      description: 'التحويل بين MP4 وWebM وMOV وMKV',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
      component: convertComponent,
    },
    'video-to-audio': {
      title: 'فيديو إلى صوت',
      description: 'حوّل ملفات الفيديو إلى صيغة صوتية',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
      component: <VideoToAudio />,
    },
  };

  const config = configs[toolId as ToolId];

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        title="الأداة غير موجودة"
        description="تعذر العثور على أداة الفيديو المطلوبة."
      />
    );
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button
          onClick={() => navigate('/category/video')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors group"
        >
          <svg
            className="w-5 h-5 transition-transform rotate-180 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>

          <span className="text-sm font-medium">
            العودة إلى أدوات الفيديو
          </span>
        </button>

      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{config.component}</Card>
      </motion.div>
    </div>
  );
}

export { ExtractAudioFromVideo, CompressVideo, ConvertVideoFormats };
export default VideoToolPage;
