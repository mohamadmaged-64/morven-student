import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { FileUpload } from '@/components/UI/FileUpload';
import { Badge } from '@/components/UI/Badge';
import { MAX_VIDEO_SIZE_MB, editVideoAudioFile } from '@/services/mediaApi';
import type { AudioEditMode } from '@/services/mediaApi';
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

const AUDIO_ACCEPT = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac', 'audio/*'];

const MODE_OPTIONS: { value: AudioEditMode; label: string; hint: string }[] = [
  { value: 'volume', label: 'تعديل المستوى', hint: 'رفع أو خفض جهارة الصوت الحالي' },
  { value: 'remove', label: 'إزالة الصوت', hint: 'إنشاء فيديو صامت تمامًا' },
  { value: 'replace', label: 'استبدال الصوت', hint: 'حذف الصوت الأصلي ووضع ملف صوتي آخر' },
  { value: 'mix', label: 'دمج صوت جديد', hint: 'مزج مسار صوتي إضافي مع الأصلي' },
];

const MODE_HINTS: Record<AudioEditMode, string> = {
  volume: 'تعديل جهارة الصوت الموجود دون التأثير على الصورة. القيمة 100% تعني عدم التغيير.',
  remove: 'سيُنشأ ملف فيديو صامت تمامًا مع الحفاظ على جودة الصورة كما هي.',
  replace: 'سيُحذف المسار الصوتي الأصلي بالكامل ويُستبدل بالملف الصوتي الذي ترفعه. إذا كان الفيديو أطول من الصوت فسينتهي عند انتهاء الصوت.',
  mix: 'سيمتزج الصوت الجديد مع الصوت الأصلي (أو يُضاف فقط إن كان الفيديو صامتًا). ينتهي الناتج عند انتهاء أقصر مسار.',
};

function EditVideoAudioTool() {
  const {
    file, processing, progress, result, error,
    handleFile, clearFile, run, cancel, fullReset,
  } = useMediaProcessor();
  const videoRef = useRef<HTMLVideoElement>(null!);
  const [mode, setMode] = useState<AudioEditMode>('volume');
  const [volume, setVolume] = useState(100);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const needsAudio = mode === 'replace' || mode === 'mix';

  const handleAudioSelected = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length > 0) setAudioFile(files[0].file);
  }, []);

  const handleProcess = useCallback(() => {
    if (!file) return;
    if (needsAudio && !audioFile) return;
    run((onProgress, job) =>
      editVideoAudioFile(
        file,
        { mode, volume, audioFile: audioFile ?? undefined },
        onProgress,
        job
      )
    );
  }, [run, file, mode, volume, audioFile, needsAudio]);

  return (
    <ToolBody>
      {!file && (
        <MediaUploadZone
          label="ارفع فيديو لتحرير صوته"
          description={`إزالة أو إضافة أو استبدال الصوت وتعديل مستواه — حتى ${MAX_VIDEO_SIZE_MB} ميغابايت.`}
          onFilesSelected={handleFile}
        />
      )}
      {file && (
        <>
          <SelectedFileInfo file={file} onRemove={clearFile} />
          <VideoPreview file={file} videoRef={videoRef} />

          <ToolSection title="مصدر الصوت" summary="ماذا تريد أن يحدث للمسار الصوتي في الفيديو الناتج؟">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="مصدر الصوت">
              {MODE_OPTIONS.map((option) => {
                const active = mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(option.value)}
                    className={[
                      'rounded-xl border-2 p-3 text-start transition-all duration-200',
                      active
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-light-border dark:border-dark-border hover:border-primary-400 dark:hover:border-primary-500',
                    ].join(' ')}
                  >
                    <span className={`block text-sm font-bold ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {option.label}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{MODE_HINTS[mode]}</p>
          </ToolSection>

          {needsAudio && (
            <ToolSection title="الملف الصوتي" summary="يدعم MP3 وWAV وM4A وAAC وOGG وOPUS وFLAC.">
              <FileUpload
                accept={AUDIO_ACCEPT}
                maxSize={MAX_VIDEO_SIZE_MB * 1024 * 1024}
                readFileData={false}
                hideFileList
                onFilesSelected={handleAudioSelected}
                label="ارفع الملف الصوتي"
                description="اضغط أو اسحب الملف الصوتي هنا."
              />
              {audioFile && (
                <div className="flex items-center justify-between rounded-xl border border-light-border dark:border-dark-border p-3">
                  <div className="min-w-0">
                    <Badge variant="primary">الصوت المختار</Badge>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate mt-1" dir="ltr">{audioFile.name}</p>
                  </div>
                  <button
                    onClick={() => setAudioFile(null)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    aria-label="إزالة الملف الصوتي"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </ToolSection>
          )}

          <ToolSection title="مستوى الصوت">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="مستوى الصوت في الناتج"
                  className="w-full accent-primary-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={mode === 'remove'}
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500">0% — صامت</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">200% — ضعف الصوت</span>
                </div>
              </div>
              <Badge variant={mode === 'remove' ? 'neutral' : volume === 100 ? 'neutral' : volume > 100 ? 'info' : 'secondary'} className="shrink-0 tabular-nums">
                {mode === 'remove' ? '—' : `${volume}%`}
              </Badge>
            </div>
            {mode !== 'remove' && volume === 100 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">القيمة الحالية تُبقي مستوى الصوت كما هو دون تغيير.</p>
            )}
          </ToolSection>
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
          disabled={needsAudio && !audioFile}
          loading={processing}
          className="w-full"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>}
        >
          تعديل الصوت
        </Button>
      )}
      <ToolTips items={[
        'عند اختيار «استبدال» أو «دمج» يجب رفع ملف صوتي قبل تنفيذ العملية.',
        'في وضع الدمج ينتهي الفيديو الناتج عند انتهاء أقصر مسار صوتي.',
      ]} />
    </ToolBody>
  );
}

export { EditVideoAudioTool };
