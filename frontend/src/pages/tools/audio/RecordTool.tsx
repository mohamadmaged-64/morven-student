import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import {
  enhanceAudioFile,
} from '@/services/mediaApi';
import { saveToLibrary } from '@/services/savedFilesService';
import {
  AudioProcessingPanel,
  ResultCard,
  ErrorCard,
  ToolBody,
  ToolSection,
  ToolTips,
  formatBytes,
} from './shared';
import type { ProgressState } from './shared';
import type { MediaResult } from '@/services/mediaApi';

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function RecordTool() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [jobProgress, setJobProgress] = useState<ProgressState | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<MediaResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: mimeType });
        setRecordedFile(file);
        setRecordedUrl(URL.createObjectURL(blob));
        setStatus('stopped');
      };

      recorder.start();
      pausedElapsedRef.current = 0;
      startTimeRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
      }, 200);
      setStatus('recording');
    } catch {
      setPermissionDenied(true);
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      pausedElapsedRef.current = elapsed;
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus('paused');
    }
  }, [elapsed]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
      }, 200);
      setStatus('recording');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!recordedFile) return;
    setJobProgress({ phase: 'uploading', percent: 0 });
    setJobError(null);
    try {
      const res = await enhanceAudioFile(
        recordedFile,
        { normalize: true, clarity: true },
        (p) => setJobProgress(p),
        {}
      );
      setJobResult(res);
      saveToLibrary(res.blob, res.filename, 'audio-tools').catch(() => {});
    } catch (err) {
      const { toArabicMediaError } = await import('@/services/mediaApi');
      setJobError(toArabicMediaError(err, 'audio'));
    } finally {
      setJobProgress(null);
    }
  }, [recordedFile]);

  const handleReset = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedFile(null);
    setRecordedUrl('');
    setJobResult(null);
    setJobError(null);
    setElapsed(0);
    setStatus('idle');
  }, [recordedUrl]);

  const handleDownloadRaw = useCallback(() => {
    if (!recordedFile) return;
    saveAs(recordedFile, recordedFile.name);
  }, [recordedFile]);

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';

  return (
    <ToolBody>
      {jobProgress && <AudioProcessingPanel progress={jobProgress} onCancel={() => {}} />}

      {permissionDenied && (
        <Card padding="sm" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">
            تم رفض إذن الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح وإعادة المحاولة.
          </p>
        </Card>
      )}

      {(status === 'idle') && (
        <ToolSection title="تسجيل صوتي جديد" summary="اضغط الزر أدناه لبدء التسجيل مباشرة من الميكروفون.">
          <div className="flex justify-center py-8">
            <motion.button
              onClick={startRecording}
              className="relative w-24 h-24 rounded-full bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/30 text-white flex items-center justify-center transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="بدء التسجيل"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </motion.button>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">اضغط لبدء التسجيل</p>
        </ToolSection>
      )}

      {(isRecording || isPaused) && (
        <ToolSection title="جارٍ التسجيل" summary={isPaused ? 'متوقف مؤقتاً — أعد الضغط للمتابعة' : 'تحدث بوضوح في الميكروفون'}>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              {isRecording && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <button
                onClick={isRecording ? pauseRecording : resumeRecording}
                className="relative w-20 h-20 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-lg"
                aria-label={isPaused ? 'استئناف' : 'إيقاف مؤقت'}
              >
                {isPaused ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                )}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold text-gray-800 dark:text-white tabular-nums">{formatTimer(elapsed)}</span>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            </div>
            <Button variant="secondary" onClick={stopRecording} className="w-full max-w-xs" icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            }>
              إيقاف التسجيل
            </Button>
          </div>
        </ToolSection>
      )}

      {status === 'stopped' && recordedFile && !jobResult && !jobProgress && (
        <>
          <ToolSection title="التسجيل جاهز">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatTimer(elapsed)} — {formatBytes(recordedFile.size)}
            </p>
            {recordedUrl && (
              <audio src={recordedUrl} controls className="w-full" />
            )}
          </ToolSection>

          <div className="flex flex-col gap-2">
            <Button onClick={handleDownloadRaw} variant="secondary" className="w-full" icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            }>
              تنزيل التسجيل (WebM)
            </Button>
            <Button onClick={handleEnhance} className="w-full" icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18"/><path d="m8 8 4-4 4 4"/><circle cx="12" cy="21" r="1"/>
              </svg>
            }>
              تحسين الصوت وتنزيل MP3
            </Button>
            <Button variant="secondary" onClick={handleReset} className="w-full">
              إعادة التسجيل
            </Button>
          </div>
        </>
      )}

      {jobError && <ErrorCard message={jobError} />}

      {jobResult && (
        <ResultCard
          result={jobResult}
          extraInfo={
            <p className="text-xs text-gray-500 dark:text-gray-400">
              تم تحسين التسجيل وتحويله إلى MP3 مع تنعيم تلقائي.
            </p>
          }
          onDownload={() => saveAs(jobResult.blob, jobResult.filename)}
          onReset={handleReset}
        />
      )}

      <ToolTips items={[
        'تأكد من السماح للمتصفح بالوصول إلى الميكروفون قبل بدء التسجيل.',
        'التسجيل محفوظ بصيغة WebM — يمكنك تنزيله مباشرة أو تحسينه وتحويله إلى MP3.',
        'يمكنك التوقف المؤقت واستئناف التسجيل في أي وقت.',
      ]} />
    </ToolBody>
  );
}
