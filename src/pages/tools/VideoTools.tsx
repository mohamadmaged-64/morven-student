import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input, Select, TextArea } from '@/components/UI/Input';
import { FileUpload } from '@/components/UI/FileUpload';
import { ProgressBar } from '@/components/UI/ProgressBar';
import { EmptyState } from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useNavigate } from 'react-router-dom';

type ToolId = 'extract-audio-video' | 'compress-video' | 'convert-video-formats' | 'video-to-audio';

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

  if (!url) {
    const newUrl = URL.createObjectURL(file);
    setUrl(newUrl);
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black">
        <video ref={videoRef} src={url} controls className="w-full max-h-[400px] object-contain" onLoadedMetadata={handleLoaded} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary">{formatBytes(file.size)}</Badge>
        <Badge variant="secondary">{file.type || 'unknown type'}</Badge>
        {meta && (
          <>
            <Badge variant="info">{Math.floor(meta.duration)}s</Badge>
            <Badge variant="neutral">{meta.width}x{meta.height}</Badge>
          </>
        )}
      </div>
    </div>
  );
}

function ExtractAudioFromVideo() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null!);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length > 0) setFile(files[0].file);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!file) return;
    setProcessing(true); setProgress(20);
    try {
      const videoEl = document.createElement('video');
      videoEl.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => reject(new Error('Failed to load video'));
      });
      setProgress(40);

      if (videoEl.captureStream) {
        const stream = videoEl.captureStream();
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks);
          const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = file.name.replace(/\.[^.]+$/, '') + '-audio.webm';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setProgress(100); addNotification('Audio extracted successfully!', 'success');
            setProcessing(false); setTimeout(() => setProgress(0), 2000);
          };

          videoEl.currentTime = 0;
          await videoEl.play();
          setProgress(60);
          mediaRecorder.start();

          videoEl.onended = () => { mediaRecorder.stop(); };
          setTimeout(() => { if (mediaRecorder.state === 'recording') mediaRecorder.stop(); }, (videoEl.duration + 1) * 1000);
          return;
        }
      }

      setProgress(50);
      addNotification('Audio track extraction requires browser MediaRecorder support. The video file has been renamed for download.', 'info');
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url; a.download = file.name.replace(/\.[^.]+$/, '') + '-audio' + (file.name.match(/\.[^.]+$/)?.[0] || '.mp4');
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setProgress(100);
      addNotification('Audio file download initiated', 'success');
    } catch (err) {
      addNotification('Error extracting audio: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setProcessing(false); setTimeout(() => setProgress(0), 2000);
    }
  }, [file, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['video/*']} onFilesSelected={handleFile} label="Upload video file" description="Supports MP4, WebM, OGG, and other video formats" />
      {file && <VideoPreview file={file} videoRef={videoRef} />}
      {processing && <ProgressBar value={progress} color="gradient" label="Extracting audio..." showLabel />}
      {file && (
        <Button onClick={handleExtract} loading={processing} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}>
          Extract Audio from Video
        </Button>
      )}
      <Card padding="sm" className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <p className="text-sm text-primary-700 dark:text-primary-300">
          <strong>Note:</strong> Full audio extraction works best in Chrome/Edge. The tool uses the MediaRecorder API to capture audio from the video's audio track. If your browser doesn't support captureStream(), the file will be provided for download as-is.
        </p>
      </Card>
    </div>
  );
}

function CompressVideo() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null!);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length > 0) setFile(files[0].file);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setProcessing(true); setProgress(10);
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
      });
      setProgress(20);

      if (video.captureStream) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 640);
        canvas.height = Math.min(video.videoHeight, 360);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        const stream = canvas.captureStream(15);
        const videoStream = video.captureStream();
        const audioTracks = videoStream.getAudioTracks();
        audioTracks.forEach((track: MediaStreamTrack) => stream.addTrack(track));

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = file.name.replace(/\.[^.]+$/, '') + '-compressed.webm';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setProgress(100);
          addNotification(`Compressed: ${formatBytes(file.size)} -> ${formatBytes(blob.size)}`, 'success');
          setProcessing(false); setTimeout(() => setProgress(0), 2000);
        };

        video.currentTime = 0;
        await video.play();
        recorder.start();
        setProgress(40);

        const drawFrame = () => {
          if (video.paused || video.ended) { recorder.stop(); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setProgress(40 + (video.currentTime / video.duration) * 55);
          requestAnimationFrame(drawFrame);
        };
        drawFrame();
        return;
      }

      addNotification('Video compression requires browser Canvas/MediaRecorder support. The original file is provided for download.', 'info');
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setProgress(100);
    } catch (err) {
      addNotification('Error compressing video: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setProcessing(false); setTimeout(() => setProgress(0), 2000);
    }
  }, [file, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['video/*']} onFilesSelected={handleFile} label="Upload video to compress" description="Videos will be re-encoded at lower resolution (640x360)" />
      {file && <VideoPreview file={file} videoRef={videoRef} />}
      {file && (
        <Card padding="sm" className="bg-gray-50 dark:bg-dark-surface">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500 dark:text-gray-400">Original size:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{formatBytes(file.size)}</span></div>
            <div><span className="text-gray-500 dark:text-gray-400">Format:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{file.type || 'unknown'}</span></div>
          </div>
        </Card>
      )}
      {processing && <ProgressBar value={progress} color="gradient" label="Compressing video..." showLabel />}
      {file && (
        <Button onClick={handleCompress} loading={processing} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>}>
          Compress Video
        </Button>
      )}
      <Card padding="sm" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>Note:</strong> Compression uses Canvas API to re-encode at 640x360 and 15fps. For higher quality or more advanced compression, a server-side solution with ffmpeg would be needed.
        </p>
      </Card>
    </div>
  );
}

function ConvertVideoFormats() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('webm');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null!);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length > 0) setFile(files[0].file);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setProcessing(true); setProgress(10);
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
      });
      setProgress(30);

      if (video.captureStream) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        const stream = canvas.captureStream(30);
        const vStream = video.captureStream();
        vStream.getAudioTracks().forEach((t) => stream.addTrack(t));

        const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const ext = targetFormat === 'webm' ? 'webm' : targetFormat === 'mp4' ? 'webm' : targetFormat;
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = file.name.replace(/\.[^.]+$/, '') + '-converted.' + ext;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setProgress(100);
          addNotification(`Video converted to ${ext.toUpperCase()}!`, 'success');
          setProcessing(false); setTimeout(() => setProgress(0), 2000);
        };

        video.currentTime = 0;
        await video.play();
        recorder.start();
        setProgress(40);

        const draw = () => {
          if (video.paused || video.ended) { recorder.stop(); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setProgress(40 + (video.currentTime / video.duration) * 55);
          requestAnimationFrame(draw);
        };
        draw();
        return;
      }

      addNotification('Format conversion requires MediaRecorder API. File downloaded as-is.', 'info');
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setProgress(100);
    } catch (err) {
      addNotification('Error converting video: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setProcessing(false); setTimeout(() => setProgress(0), 2000);
    }
  }, [file, targetFormat, addNotification]);

  const currentExt = file?.name.split('.').pop()?.toUpperCase() || 'Unknown';

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['video/*']} onFilesSelected={handleFile} label="Upload video to convert" description="Select a video file to convert" />
      {file && <VideoPreview file={file} videoRef={videoRef} />}
      {file && (
        <div className="grid grid-cols-2 gap-3">
          <Card padding="sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current Format</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{currentExt}</p>
          </Card>
          <Select
            label="Target Format"
            options={[
              { value: 'webm', label: 'WebM' },
              { value: 'mp4', label: 'MP4 (WebM container)' },
              { value: 'ogv', label: 'OGG Video' },
            ]}
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value)}
          />
        </div>
      )}
      {processing && <ProgressBar value={progress} color="gradient" label="Converting..." showLabel />}
      {file && (
        <Button onClick={handleConvert} loading={processing} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>}>
          Convert to {targetFormat.toUpperCase()}
        </Button>
      )}
      <Card padding="sm" className="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800">
        <p className="text-sm text-sky-700 dark:text-sky-300">
          <strong>Note:</strong> Browser-based conversion uses MediaRecorder with Canvas re-encoding. True MP4 output requires server-side processing. Output will be WebM format.
        </p>
      </Card>
    </div>
  );
}

function VideoToAudio() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null!);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length > 0) setFile(files[0].file);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setProcessing(true); setProgress(20);
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
      });
      setProgress(40);

      if (video.captureStream) {
        const stream = video.captureStream();
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks);
          const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = file.name.replace(/\.[^.]+$/, '') + '.webm';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setProgress(100);
            addNotification(`Audio extracted: ${formatBytes(blob.size)}`, 'success');
            setProcessing(false); setTimeout(() => setProgress(0), 2000);
          };
          video.currentTime = 0;
          await video.play();
          recorder.start();
          setProgress(60);
          video.onended = () => recorder.stop();
          setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, (video.duration + 1) * 1000);
          return;
        }
      }

      addNotification('No audio track found or browser does not support captureStream', 'warning');
      setProcessing(false);
    } catch (err) {
      addNotification('Error: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setProcessing(false); setTimeout(() => setProgress(0), 2000);
    }
  }, [file, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['video/*']} onFilesSelected={handleFile} label="Upload video to extract audio" description="Convert video audio track to a standalone audio file" />
      {file && <VideoPreview file={file} videoRef={videoRef} />}
      {processing && <ProgressBar value={progress} color="gradient" label="Converting..." showLabel />}
      {file && (
        <Button onClick={handleConvert} loading={processing} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}>
          Convert Video to Audio
        </Button>
      )}
      <Card padding="sm" className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <p className="text-sm text-primary-700 dark:text-primary-300">
          <strong>Note:</strong> This extracts the audio track from the video. The output format is WebM audio. For MP3 conversion, a server-side solution would be needed.
        </p>
      </Card>
    </div>
  );
}

function VideoToolPage({ toolId }: { toolId: string }) {
  const { direction } = useLanguageStore();
  const navigate = useNavigate();
  const configs: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
    'extract-audio-video': {
      title: 'Extract Audio from Video',
      description: 'Separate audio from video files',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
      component: <ExtractAudioFromVideo />,
    },
    'compress-video': {
      title: 'Compress Video',
      description: 'Reduce video file size with re-encoding',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
      component: <CompressVideo />,
    },
    'convert-video-formats': {
      title: 'Convert Video Formats',
      description: 'Convert between video formats',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
      component: <ConvertVideoFormats />,
    },
    'video-to-audio': {
      title: 'Video to Audio',
      description: 'Convert video files to audio format',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
      component: <VideoToAudio />,
    },
  };

  const config = configs[toolId as ToolId];

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        title="Tool not found"
        description="The requested video tool could not be found."
      />
    );
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={direction}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button
        onClick={() => navigate('/category/video')}
        className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors group"
      >
        <svg
          className={`w-5 h-5 transition-transform ${
            direction === 'rtl'
              ? 'rotate-180 group-hover:translate-x-1'
              : 'group-hover:-translate-x-1'
          }`}
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
          {direction === 'rtl'
            ? 'العودة لأدوات الفيديو'
            : 'Back to Video Tools'}
        </span>
      </button>

      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{config.component}</Card>
      </motion.div>
    </div>
  );
}

export default VideoToolPage;
