import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';
import { Button } from '@/components/UI/Button';
import {
  MAX_AUDIO_MERGE_FILES,
  MAX_AUDIO_SIZE_MB,
  MIN_AUDIO_MERGE_FILES,
  mergeAudioFiles,
} from '@/services/mediaApi';
import { saveToLibrary } from '@/services/savedFilesService';
import {
  AudioUploadZone,
  AudioProcessingPanel,
  ToolBody,
  ToolSection,
  ToolTips,
  ResultCard,
  ErrorCard,
  formatBytes,
} from './shared';
import type { ProgressState } from './shared';
import type { MediaResult } from '@/services/mediaApi';

export default function MergeAudioTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobProgress, setJobProgress] = useState<ProgressState | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<MediaResult | null>(null);
  const [touched, setTouched] = useState(false);

  const handleFiles = useCallback((selected: { file: File; data: ArrayBuffer | string }[]) => {
    setFiles((prev) => [...prev, ...selected.map((f) => f.file)].slice(0, MAX_AUDIO_MERGE_FILES));
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const notEnough = files.length < MIN_AUDIO_MERGE_FILES;
  const atLimit = files.length >= MAX_AUDIO_MERGE_FILES;

  const handleMerge = useCallback(async () => {
    setTouched(true);
    if (notEnough) return;
    setJobProgress({ phase: 'uploading', percent: 0 });
    setJobError(null);
    try {
      const res = await mergeAudioFiles(files, (p) => setJobProgress(p), {});
      setJobResult(res);
      saveToLibrary(res.blob, res.filename, 'audio-tools').catch(() => {});
    } catch (err) {
      const { toArabicMediaError } = await import('@/services/mediaApi');
      setJobError(toArabicMediaError(err, 'audio'));
    } finally {
      setJobProgress(null);
    }
  }, [files, notEnough]);

  const resetAll = useCallback(() => {
    setFiles([]);
    setJobResult(null);
    setJobError(null);
    setTouched(false);
  }, []);

  return (
    <ToolBody>
      {jobProgress && <AudioProcessingPanel progress={jobProgress} onCancel={() => {}} />}

      {!jobProgress && !jobResult && (
        <>
          {files.length < MAX_AUDIO_MERGE_FILES && (
            <AudioUploadZone
              label="ارفع الملفات الصوتية للدمج"
              description={`يمكنك دمج حتى ${MAX_AUDIO_MERGE_FILES} ملفات صوتية — حتى ${MAX_AUDIO_SIZE_MB} ميغابايت لكل ملف. تُدمج بالترتيب المحدد أدناه.`}
              multiple
              maxFiles={MAX_AUDIO_MERGE_FILES}
              onFilesSelected={handleFiles}
            />
          )}

          {atLimit && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400" role="status">
              وصلت إلى الحد الأقصى ({MAX_AUDIO_MERGE_FILES} ملفات). أزل ملفاً لإضافة آخر.
            </p>
          )}

          <AnimatePresence>
            {files.length > 0 && (
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
                aria-label="ترتيب الملفات"
              >
                {files.map((f, index) => (
                  <motion.li
                    key={`${f.name}-${index}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    layout
                    className="flex items-center gap-2 rounded-xl border border-light-border dark:border-dark-border p-3 bg-gray-50 dark:bg-dark-surface"
                  >
                    <span className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" dir="ltr">{f.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(f.size)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveFile(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        aria-label={`تحريك ${f.name} لأعلى`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                      </button>
                      <button
                        onClick={() => moveFile(index, 1)}
                        disabled={index === files.length - 1}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        aria-label={`تحريك ${f.name} لأسفل`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label={`إزالة ${f.name}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {touched && notEnough && (
            <p className="text-sm text-red-500" role="alert">اختر ملفين على الأقل للدمج.</p>
          )}

          {files.length > 0 && !notEnough && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400" role="status">
              سيتم دمج {files.length} ملفات بالترتيب الظاهر أعلاه{atLimit ? ` (الحد الأقصى ${MAX_AUDIO_MERGE_FILES})` : ''}.
            </p>
          )}

          {files.length > 0 && (
            <Button onClick={handleMerge} disabled={notEnough} loading={!!jobProgress} className="w-full" icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
            }>
              دمج الملفات الصوتية
            </Button>
          )}
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

      <ToolTips items={[
        `يمكنك دمج حتى ${MAX_AUDIO_MERGE_FILES} ملفات صوتية في معالجة واحدة.`,
        'تُدمج الملفات بالترتيب الظاهر في القائمة — استخدم أسهم التحريك لتغيير الترتيب.',
        'يتم دمج جميع الملفات في ملف MP3 واحد.',
      ]} />
    </ToolBody>
  );
}
