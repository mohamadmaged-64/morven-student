import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { useAppStore } from '@/store/useAppStore';
import { saveToLibrary } from '@/services/savedFilesService';
import {
  MAX_VIDEO_SIZE_MB,
  cancelMediaJob,
  removeMusicFromVideo,
  toArabicMediaError,
} from '@/services/mediaApi';
import type { MediaProgress, MusicRemovalResult } from '@/services/mediaApi';
import {
  ToolBody,
  MediaUploadZone,
  SelectedFileInfo,
  VideoPreview,
  ProcessingPanel,
  ErrorCard,
  ToolTips,
  downloadResult,
  formatBytes,
  type JobHandle,
} from './shared';

/** Map the real backend job fraction (0..99) to a human-readable stage. */
function stageLabel(percent: number | null): string {
  if (percent === null) return 'جارٍ تحليل الفيديو على الخادم...';
  if (percent < 5) return 'تحضير الفيديو...';
  if (percent < 15) return 'استخراج الصوت...';
  if (percent < 75) return 'فصل الموسيقى عن الصوت...';
  if (percent < 90) return 'إعادة بناء الفيديو...';
  return 'إنهاء المعالجة...';
}

/**
 * Remove Music from Video — upload a video, separate vocals from
 * background music with Demucs on the server, then preview and export the
 * processed video or the processed audio.
 */
export function RemoveMusicTool() {
  const { addNotification } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<MediaProgress | null>(null);
  const [result, setResult] = useState<MusicRemovalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobRef = useRef<JobHandle>({});
  const cancelledRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null!);
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

  const run = useCallback(() => {
    if (processing || !file) return;
    cancelledRef.current = false;
    jobRef.current = {};
    setResult(null);
    setError(null);
    setProgress({ phase: 'uploading', percent: 0 });

    void (async () => {
      try {
        const res = await removeMusicFromVideo(file, (p) => setProgress(p), jobRef.current);
        setResult(res);
        // Archive the processed video in the user's library.
        saveToLibrary(res.video.blob, res.video.filename, 'video-tools').catch(() => {});
        addNotification('تمت إزالة الموسيقى بنجاح', 'success');
      } catch (err) {
        if (!cancelledRef.current) {
          setError(toArabicMediaError(err, 'video'));
        }
      } finally {
        setProgress(null);
      }
    })();
  }, [file, processing, addNotification]);

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    setProgress(null);
    setError(null);
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

  return (
    <ToolBody>
      {!file && (
        <MediaUploadZone
          label="ارفع فيديو لإزالة موسيقاه"
          description={`يتم فصل الموسيقى عن الصوت تلقائيًا — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
          onFilesSelected={handleFile}
        />
      )}
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Card padding="sm" className="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800">
              <p className="text-xs text-sky-700 dark:text-sky-300">
                سيتم فصل المكون الموسيقي عن الصوت باستخدام نموذج ذكاء اصطناعي للفصل بين الصوت البشري والموسيقى، مع الحفاظ على الكلام قدر الإمكان.
              </p>
            </Card>
            <Card padding="sm" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                قد تستغرق المعالجة عدة دقائق حسب مدة الفيديو وجودته، إذ يتم التحليل جزءًا تلو الآخر على الخادم.
              </p>
            </Card>
          </div>
        </>
      )}

      {processing && progress && (
        <ProcessingPanel
          progress={progress}
          onCancel={() => void cancel()}
          labels={{
            uploading: 'جاري رفع الفيديو إلى خادم المعالجة...',
            processing: stageLabel(progress.percent),
            downloading: 'جاري تجهيز النتائج...',
          }}
        />
      )}

      {error && <ErrorCard message={error} />}

      {result && (
        <MusicRemovalResultView
          result={result}
          originalFile={file}
          onReset={fullReset}
        />
      )}

      {file && !result && !processing && (
        <Button
          onClick={run}
          loading={processing}
          className="w-full"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          }
        >
          إزالة الموسيقى من الفيديو
        </Button>
      )}

      <ToolTips items={[
        'أفضل النتائج عند استخدام فيديو يحتوي كلامًا واضحًا وخلفية موسيقية منفصلة نسبيًا.',
        'قد يظهر بعض التأثير على الصوت في المقاطع المعقدة (موسيقى قريبة جدًا من الصوت البشري) وهذا أمر طبيعي لفصل المصادر الصوتية.',
        'يمكنك مقارنة الفيديو الأصلي بالنتيجة قبل التنزيل، واختيار تنزيل الفيديو أو الصوت فقط.',
      ]} />
    </ToolBody>
  );
}

/** Blob URL lifecycle helper for preview players. */
function useObjectUrl(blob: Blob | null): string {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    if (!blob) {
      setUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return url;
}

function PreviewSection({ title, url, file }: { title: string; url: string; file: { filename: string; blob: Blob } }) {
  return (
    <Card padding="sm">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</p>
      <div className="relative rounded-xl overflow-hidden bg-black">
        <video key={url} src={url} controls preload="metadata" className="w-full max-h-[400px] object-contain" />
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <Badge variant="secondary">{file.filename}</Badge>
        <Badge variant="neutral">{formatBytes(file.blob.size)}</Badge>
      </div>
    </Card>
  );
}

function MusicRemovalResultView({
  result,
  originalFile,
  onReset,
}: {
  result: MusicRemovalResult;
  originalFile: File | null;
  onReset: () => void;
}) {
  const videoUrl = useObjectUrl(result.video.blob);
  const audioUrl = useObjectUrl(result.audio.blob);
  const originalUrl = useObjectUrl(originalFile);

  const download = (target: 'video' | 'audio') => {
    if (target === 'video') downloadResult(result.video);
    else downloadResult(result.audio);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      role="status"
      aria-live="polite"
    >
      <Card padding="sm" className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">تمت إزالة الموسيقى بنجاح</p>
            <p className="text-xs text-emerald-600/90 dark:text-emerald-300/80 mt-0.5">
              تم الحفاظ على الصوت البشري/الكلام قدر الإمكان مع خفض المكون الموسيقي.
            </p>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <div className="grid lg:grid-cols-2 gap-3">
        {originalFile && originalUrl && (
          <PreviewSection title="الفيديو الأصلي (قبل المعالجة)" url={originalUrl} file={{ filename: originalFile.name, blob: originalFile }} />
        )}
        {videoUrl && (
          <PreviewSection title="الفيديو بعد إزالة الموسيقى" url={videoUrl} file={result.video} />
        )}
      </div>

      {/* Processed audio player */}
      {audioUrl && (
        <Card padding="sm">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            الصوت الناتج (كلام بدون موسيقى)
          </p>
          <audio key={audioUrl} src={audioUrl} controls className="w-full mt-2" />
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{result.audio.filename}</Badge>
            <Badge variant="neutral">{formatBytes(result.audio.blob.size)}</Badge>
          </div>
        </Card>
      )}

      {/* Downloads */}
      <Card padding="sm">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">تنزيل النتيجة</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1" onClick={() => download('video')} icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }>
            تنزيل الفيديو
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => download('audio')} icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }>
            تنزيل الصوت
          </Button>
          <Button variant="ghost" onClick={onReset}>
            معالجة فيديو آخر
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export default RemoveMusicTool;