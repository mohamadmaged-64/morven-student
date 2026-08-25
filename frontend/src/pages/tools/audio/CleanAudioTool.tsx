import { useCallback, useState } from 'react';
import { saveAs } from 'file-saver';
import { Button } from '@/components/UI/Button';
import { cleanAudioFile } from '@/services/mediaApi';
import type { AudioToolCleanStrength, MediaResult } from '@/services/mediaApi';
import { saveToLibrary } from '@/services/savedFilesService';
import {
  AudioUploadZone,
  AudioPreview,
  AudioProcessingPanel,
  SelectedFileInfo,
  ToolBody,
  ToolSection,
  ToolTips,
  ResultCard,
  ErrorCard,
  useAudioProcessor,
} from './shared';
import type { ProgressState } from './shared';

const STRENGTH_OPTIONS: { value: AudioToolCleanStrength; label: string; desc: string }[] = [
  { value: 'light', label: 'خفيفة', desc: 'إزالة الضوضاء الخفيفة مع الحفاظ على طبيعة الصوت' },
  { value: 'medium', label: 'متوسطة', desc: 'إزالة ملحوظة للضوضاء الخلفية — الأنسب لمعظم التسجيلات' },
  { value: 'strong', label: 'قوية', desc: 'إزالة قوية للضوضاء — قد تؤثر قليلاً على جودة الصوت' },
];

export default function CleanAudioTool() {
  const {
    file, processing, progress, result, error,
    handleFile, clearFile, fullReset,
  } = useAudioProcessor();
  const [strength, setStrength] = useState<AudioToolCleanStrength>('medium');
  const [jobProgress, setJobProgress] = useState<ProgressState | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<MediaResult | null>(null);

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setJobProgress({ phase: 'uploading', percent: 0 });
    setJobError(null);
    try {
      const res = await cleanAudioFile(file, strength, (p) => setJobProgress(p), {});
      setJobResult(res);
      saveToLibrary(res.blob, res.filename, 'audio-tools').catch(() => {});
    } catch (err) {
      const { toArabicMediaError } = await import('@/services/mediaApi');
      setJobError(toArabicMediaError(err, 'audio'));
    } finally {
      setJobProgress(null);
    }
  }, [file, strength]);

  const resetAll = useCallback(() => {
    clearFile();
    setJobResult(null);
    setJobError(null);
    setStrength('medium');
  }, [clearFile]);

  return (
    <ToolBody>
      {jobProgress && <AudioProcessingPanel progress={jobProgress} onCancel={() => {}} />}

      {!file && !jobProgress && (
        <AudioUploadZone
          label="ارفع ملفًا صوتيًا لتنظيفه"
          description="إزالة الضوضاء والتشويش من الملف الصوتي — حتى 100 ميغابايت."
          onFilesSelected={handleFile}
        />
      )}

      {file && !jobProgress && !jobResult && (
        <>
          <SelectedFileInfo file={file} onRemove={resetAll} />
          <AudioPreview file={file} />

          <ToolSection title="شدة التنظيف" summary="اختر مستوى إزالة الضوضاء المناسب لملفك.">
            <div className="space-y-2">
              {STRENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStrength(opt.value)}
                  className={`w-full rounded-xl border p-3 text-right transition-colors ${
                    strength === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-light-border dark:border-dark-border hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${strength === opt.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}`}>
                      {opt.label}
                    </span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      strength === opt.value ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {strength === opt.value && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </ToolSection>
        </>
      )}

      {jobError && <ErrorCard message={jobError} />}

      {jobResult && (
        <ResultCard
          result={jobResult}
          onDownload={() => saveAs(jobResult.blob, jobResult.filename)}
          onReset={resetAll}
        />
      )}

      {file && !jobResult && !jobProgress && (
        <Button onClick={handleProcess} loading={processing} className="w-full" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
          </svg>
        }>
          تنظيف الصوت
        </Button>
      )}

      <ToolTips items={[
        'الضبط الخفيفة هو الأفضل إذا كانت الضوضاء طفيفة و تريد الحفاظ على طبيعة الصوت.',
        'الضبط المتوسط يناسب التسجيلات التي فيها ضوضاء خلفية ملحوظة مثل المراوح أو التكييف.',
        'الضبط القوي للحالات الشديدة — قد يؤثر قليلاً على نقاء الصوت الأصلي.',
      ]} />
    </ToolBody>
  );
}
