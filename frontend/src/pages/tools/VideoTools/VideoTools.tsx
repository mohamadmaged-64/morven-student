import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Select } from '@/components/UI/Input';
import { EmptyState } from '@/components/UI/EmptyState';
import { useNavigate } from 'react-router-dom';
import {
  ACCEPTED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE_MB,
  compressVideoFile,
  convertVideoFile,
  extractAudioFromVideo,
} from '@/services/mediaApi';
import type { AudioFormat, AudioQuality, VideoFormat } from '@/services/mediaApi';
import {
  ToolBody,
  ToolHeroHeader,
  MediaUploadZone,
  SelectedFileInfo,
  VideoPreview,
  ProcessingPanel,
  ResultCard,
  ErrorCard,
  ToolTips,
  downloadResult,
  useMediaProcessor,
} from './shared';
import { ExtractAudioFromVideo, AudioFormatOptions } from './ExtractAudioTool';
import { CompressVideo } from './CompressVideoTool';
import { CutVideoTool } from './CutVideoTool';
import { EditVideoTool } from './EditVideoTool';
import { EditVideoAudioTool } from './EditVideoAudioTool';
import { MergeVideosTool } from './MergeVideosTool';
import { VideoToGifTool } from './VideoToGifTool';
import { ChangeSpeedTool } from './ChangeSpeedTool';
import { RemoveMusicTool } from './RemoveMusicTool';

type ToolId =
  | 'extract-audio-video'
  | 'compress-video'
  | 'cut-video'
  | 'edit-video'
  | 'edit-video-audio'
  | 'merge-videos'
  | 'video-to-gif'
  | 'change-video-speed'
  | 'remove-music'
  // Legacy route-only tools (kept functional, not listed in tools.ts).
  | 'convert-video'
  | 'convert-video-formats'
  | 'video-to-audio';

const CONVERT_TARGETS: { value: VideoFormat; label: string }[] = [
  { value: 'mp4', label: 'MP4 — الأكثر توافقًا مع جميع الأجهزة' },
  { value: 'webm', label: 'WebM — مثالي للويب' },
  { value: 'mov', label: 'MOV — Apple QuickTime' },
  { value: 'mkv', label: 'MKV — حاوية مرنة عالية الجودة' },
];

function ConvertVideoFormats() {
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
    <ToolBody>
      <MediaUploadZone
        label="ارفع فيديو للتحويل"
        description={`يتم التحويل على خادم المعالجة باستخدام FFmpeg — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
        onFilesSelected={handleFile}
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
          onDownload={() => downloadResult(result)}
          onReset={fullReset}
        />
      )}
      {file && !result && !processing && (
        <Button onClick={handleConvert} loading={processing} className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>}
        >
          تحويل إلى {target.toUpperCase()}
        </Button>
      )}
      <ToolTips items={[
        'اختر WebM للويب أو MP4 لأوسع توافق مع الأجهزة والتطبيقات.',
      ]} />
    </ToolBody>
  );
}

function VideoToAudio() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [format, setFormat] = useState<AudioFormat>('mp3');
  const [quality, setQuality] = useState<AudioQuality>('standard');

  const handleConvert = useCallback(() => {
    run((onProgress, job) => extractAudioFromVideo(file!, { format, quality }, onProgress, job));
  }, [run, file, format, quality]);

  return (
    <ToolBody>
      <MediaUploadZone
        label="ارفع فيديو لاستخراج الصوت"
        description={`حوّل المسار الصوتي للفيديو إلى ملف صوتي مستقل — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
        onFilesSelected={handleFile}
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
          onDownload={() => downloadResult(result)}
          onReset={fullReset}
        />
      )}
      {file && !result && !processing && (
        <Button onClick={handleConvert} loading={processing} className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
        >
          تحويل الفيديو إلى صوت
        </Button>
      )}
    </ToolBody>
  );
}

type ToolConfig = {
  title: string;
  description: string;
  icon: JSX.Element;
  component: React.ComponentType;
};

const TOOL_CONFIGS: Record<ToolId, ToolConfig> = {
  'extract-audio-video': {
    title: 'استخراج الصوت من الفيديو',
    description: 'فصل الصوت عن ملفات الفيديو عبر خادم المعالجة',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    component: ExtractAudioFromVideo,
  },
  'compress-video': {
    title: 'ضغط الفيديو',
    description: 'قلّل حجم الفيديو بإعادة ترميز احترافية',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
    component: CompressVideo,
  },
  'cut-video': {
    title: 'قص الفيديو',
    description: 'اقتطاع مقطع من الفيديو دون إعادة ترميز',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
    component: CutVideoTool,
  },
  'edit-video': {
    title: 'تحرير الفيديو',
    description: 'تغيير الحجم والتدوير والقلب في معالجة واحدة',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    component: EditVideoTool,
  },
  'edit-video-audio': {
    title: 'تحرير صوت الفيديو',
    description: 'إزالة أو إضافة أو استبدال الصوت وتعديل مستواه',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>,
    component: EditVideoAudioTool,
  },
  'merge-videos': {
    title: 'دمج الفيديوهات',
    description: 'دمج عدة مقاطع مرتبة في فيديو واحد',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>,
    component: MergeVideosTool,
  },
  'video-to-gif': {
    title: 'تحويل الفيديو إلى GIF',
    description: 'إنشاء GIF متحرك من مقطع فيديو بلوحة ألوان محسّنة',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 9h4M13 9h4M7 13h10M8 17h8"/></svg>,
    component: VideoToGifTool,
  },
  'change-video-speed': {
    title: 'تغيير سرعة الفيديو',
    description: 'تسريع أو تبطيء الفيديو مع مزامنة الصوت',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>,
    component: ChangeSpeedTool,
  },
  'remove-music': {
    title: 'إزالة الموسيقى من الفيديو',
    description: 'فصل الكلام عن الموسيقى وإزالة الخلفية الموسيقية مع الحفاظ على الصوت',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M20 4l-8.5 8.5"/></svg>,
    component: RemoveMusicTool,
  },
  'convert-video': {
    title: 'تحويل صيغ الفيديو',
    description: 'التحويل بين MP4 وWebM وMOV وMKV',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    component: ConvertVideoFormats,
  },
  'convert-video-formats': {
    title: 'تحويل صيغ الفيديو',
    description: 'التحويل بين MP4 وWebM وMOV وMKV',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    component: ConvertVideoFormats,
  },
  'video-to-audio': {
    title: 'فيديو إلى صوت',
    description: 'حوّل ملفات الفيديو إلى صيغة صوتية',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
    component: VideoToAudio,
  },
};

function VideoToolPage({ toolId }: { toolId: string }) {
  const navigate = useNavigate();
  const config = TOOL_CONFIGS[toolId as ToolId];
  const ToolComponent = config?.component;

  if (!config || !ToolComponent) {
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

      <ToolHeroHeader icon={config.icon} title={config.title} description={config.description} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>
          <ToolComponent />
        </Card>
      </motion.div>
    </div>
  );
}

export { ExtractAudioFromVideo, CompressVideo, ConvertVideoFormats, RemoveMusicTool };
export default VideoToolPage;
