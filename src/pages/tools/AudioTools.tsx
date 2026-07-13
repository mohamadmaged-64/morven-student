import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Select, TextArea } from '@/components/UI/Input';
import { FileUpload } from '@/components/UI/FileUpload';
import { ProgressBar } from '@/components/UI/ProgressBar';
import { EmptyState } from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';

type ToolId = 'speech-to-text';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'pt-BR', label: 'Portuguese' },
  { value: 'ja-JP', label: 'Japanese' },
];

function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

function SpeechToTextTool() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [language, setLanguage] = useState('en-US');
  const [transcription, setTranscription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [uploadedAudio, setUploadedAudio] = useState<{ file: File; url: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [supported] = useState(isSpeechRecognitionSupported());

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const handleFileUpload = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length > 0) {
      const file = files[0].file;
      const url = URL.createObjectURL(file);
      setUploadedAudio({ file, url });
      addNotification('Audio file loaded. Click "Transcribe Uploaded Audio" to begin.', 'info');
    }
  }, [addNotification]);

  const startRecording = useCallback(async () => {
    if (!supported) {
      addNotification('Speech Recognition is not supported in your browser. Try Chrome or Edge.', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setUploadedAudio({ file: new File([blob], 'recording.webm', { type: 'audio/webm' }), url });
      };

      mediaRecorder.start();

      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition: SpeechRecognition = new SpeechRecognitionAPI();
        recognition.lang = language;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let final = '';
          let interim = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript + ' ';
            } else {
              interim += result[0].transcript;
            }
          }
          setTranscription(final + (interim ? `[${interim}]` : ''));
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error !== 'aborted') {
            addNotification('Recognition error: ' + event.error, 'error');
          }
          setIsRecognizing(false);
        };

        recognition.onend = () => {
          setIsRecognizing(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecognizing(true);
      }

      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
      addNotification('Recording started. Speak clearly into the microphone.', 'info');
    } catch {
      addNotification('Micro access denied. Please allow microphone access.', 'error');
    }
  }, [language, supported, addNotification]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsRecognizing(false);
    addNotification('Recording stopped.', 'success');
  }, [addNotification]);

  const transcribeUpload = useCallback(async () => {
    if (!uploadedAudio) return;
    if (!supported) {
      addNotification('Speech Recognition is not supported. Try Chrome or Edge.', 'error');
      return;
    }

    setProgress(10);
    try {
      const audio = new Audio(uploadedAudio.url);
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Cannot load audio'));
      });
      setProgress(30);

      addNotification('Transcription via browser Speech API requires playing the audio. The audio will play in the background.', 'info');

      const SpeechRecognitionAPI2 = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI2) {
        addNotification('Speech Recognition not supported', 'error');
        setProgress(0);
        return;
      }

      const recognition: SpeechRecognition = new SpeechRecognitionAPI2();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalText = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscription(finalText + (interim ? `[${interim}]` : ''));
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        setTranscription(finalText);
        setProgress(100);
        addNotification('Transcription complete!', 'success');
        setTimeout(() => setProgress(0), 2000);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecognizing(true);

      audio.play();
      audio.onended = () => {
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
            recognitionRef.current = null;
          }
          setIsRecognizing(false);
        }, 1000);
      };

      setProgress(50);
    } catch {
      addNotification('Error transcribing audio', 'error');
      setProgress(0);
    }
  }, [uploadedAudio, language, supported, addNotification]);

  const handleCopy = useCallback(() => {
    const cleanText = transcription.replace(/\[.*?\]/g, '').trim();
    navigator.clipboard.writeText(cleanText);
    addNotification('Transcription copied to clipboard', 'success');
  }, [transcription, addNotification]);

  const handleDownload = useCallback(() => {
    const cleanText = transcription.replace(/\[.*?\]/g, '').trim();
    const blob = new Blob([cleanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transcription.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification('Transcription downloaded', 'success');
  }, [transcription, addNotification]);

  const cleanTranscription = transcription.replace(/\[.*?\]/g, '').trim();

  return (
    <div className="space-y-6" dir={direction}>
      {!supported && (
        <Card padding="md" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>Browser not supported.</strong> Speech Recognition requires Chrome, Edge, or Safari. Firefox and some mobile browsers may not support this feature.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Language" options={LANGUAGES} value={language} onChange={(e) => setLanguage(e.target.value)} />
        <div className="flex items-end">
          <Badge variant={isRecording ? 'danger' : 'secondary'} dot={isRecording}>
            {isRecording ? `Recording ${formatTime(recordTime)}` : 'Ready'}
          </Badge>
          {isRecognizing && <Badge variant="success" className="ms-2">Recognizing...</Badge>}
        </div>
      </div>

      <div className="flex justify-center">
        <motion.button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!supported}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
              : 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/30'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          whileHover={supported ? { scale: 1.05 } : undefined}
          whileTap={supported ? { scale: 0.95 } : undefined}
        >
          <AnimatePresence>
            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </AnimatePresence>
          {isRecording ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </motion.button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isRecording ? 'Click the button to stop recording' : 'Click the button to start recording'}
        </p>
      </div>

      <div className="border-t border-light-border dark:border-dark-border pt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or upload an audio file:</p>
        <FileUpload
          accept={['audio/*']}
          onFilesSelected={handleFileUpload}
          label="Upload audio file"
          description="Supports MP3, WAV, OGG, WebM, and other audio formats"
          maxFiles={1}
        />
      </div>

      {uploadedAudio && (
        <div className="space-y-3">
          <audio src={uploadedAudio.url} controls className="w-full" />
          <div className="flex gap-2">
            <Button onClick={transcribeUpload} loading={isRecognizing} variant="secondary" className="flex-1">Transcribe Uploaded Audio</Button>
          </div>
        </div>
      )}

      {progress > 0 && <ProgressBar value={progress} color="gradient" label="Processing..." showLabel />}

      {transcription && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transcription</label>
            <div className="flex gap-2">
              <Badge variant="info">{cleanTranscription.split(/\s+/).filter(Boolean).length} words</Badge>
            </div>
          </div>
          <TextArea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            className="min-h-[200px]"
            placeholder="Transcription will appear here..."
          />
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="secondary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}>
              Copy
            </Button>
            <Button onClick={handleDownload} variant="secondary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}>
              Download TXT
            </Button>
          </div>
        </motion.div>
      )}

      <Card padding="sm" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>How it works:</strong> Uses the Web Speech API (SpeechRecognition) built into modern browsers. Best results with Chrome/Edge. Speak clearly for 5-30 seconds per sentence. Text in [brackets] is interim (not yet finalized).
        </p>
      </Card>
    </div>
  );
}

function AudioToolPage({ toolId }: { toolId: string }) {
  const { direction } = useLanguageStore();

  const configs: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
    'speech-to-text': {
      title: 'Speech to Text',
      description: 'Convert speech and audio files to text transcription',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
      component: <SpeechToTextTool />,
    },
  };

  const config = configs[toolId as ToolId];

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        title="Tool not found"
        description="The requested audio tool could not be found."
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={direction}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">{config.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
            </div>
          </div>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{config.component}</Card>
      </motion.div>
    </div>
  );
}

export default AudioToolPage;
