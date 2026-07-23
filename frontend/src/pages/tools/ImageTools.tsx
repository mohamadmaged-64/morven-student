import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input, TextArea, Select } from '@/components/UI/Input';
import { FileUpload } from '@/components/UI/FileUpload';
import { ProgressBar } from '@/components/UI/ProgressBar';
import { EmptyState } from '@/components/UI/EmptyState';
import { Slider } from '@/components/UI/Slider';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useNavigate } from 'react-router-dom';

type ToolId = 'background-remover' | 'rotate-image' | 'blur-image' | 'images-to-pdf';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

function BackgroundRemover() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [originalUrl, setOriginalUrl] = useState('');
  const [processedUrl, setProcessedUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tolerance, setTolerance] = useState(30);
  const fileNameRef = useRef('image.png');

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    const url = files[0].data as string;
    setOriginalUrl(url);
    setProcessedUrl('');
    fileNameRef.current = files[0].file.name.replace(/\.[^.]+$/, '') + '-no-bg.png';
  }, []);

  const handleProcess = useCallback(async () => {
    if (!originalUrl) return;
    setProcessing(true);
    try {
      const img = await loadImage(originalUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const bgColor = { r: data[0], g: data[1], b: data[2] };

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dist = Math.sqrt(
          Math.pow(r - bgColor.r, 2) +
          Math.pow(g - bgColor.g, 2) +
          Math.pow(b - bgColor.b, 2)
        );
        if (dist < tolerance * 2.55) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedUrl(canvas.toDataURL('image/png'));
      addNotification('Background removed successfully!', 'success');
    } catch {
      addNotification('Error processing image', 'error');
    } finally {
      setProcessing(false);
    }
  }, [originalUrl, tolerance, addNotification]);

  const handleDownload = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement('a');
    a.href = processedUrl; a.download = fileNameRef.current;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    addNotification('Image downloaded', 'success');
  }, [processedUrl, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['image/*']} onFilesSelected={handleFile} label="Upload image to remove background" description="Detects and removes near-white backgrounds" maxFiles={1} readAs="DataURL" />
      {originalUrl && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original</p>
            <img src={originalUrl} alt="Original" className="w-full rounded-xl border border-light-border dark:border-dark-border" />
          </div>
          {processedUrl && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Processed</p>
              <div className="relative">
                <img src={processedUrl} alt="Processed" className="w-full rounded-xl border border-light-border dark:border-dark-border" style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0 / 20px 20px' }} />
              </div>
            </motion.div>
          )}
        </div>
      )}
      {originalUrl && (
        <Slider label="Color Tolerance" value={tolerance} onChange={setTolerance} min={5} max={80} showValue minLabel="Low" maxLabel="High" />
      )}
      {processing && <ProgressBar value={70} color="gradient" label="Processing..." showLabel />}
      <div className="flex gap-2">
        <Button onClick={handleProcess} loading={processing} disabled={!originalUrl} className="flex-1" variant="primary">Remove Background</Button>
        {processedUrl && <Button onClick={handleDownload} className="flex-1" variant="success">Download</Button>}
      </div>
    </div>
  );
}

function RotateImageTool() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [originalUrl, setOriginalUrl] = useState('');
  const [rotation, setRotation] = useState(0);
  const [processedUrl, setProcessedUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const fileNameRef = useRef('image.png');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setOriginalUrl(files[0].data as string);
    setProcessedUrl('');
    setRotation(0);
    fileNameRef.current = files[0].file.name.replace(/\.[^.]+$/, '') + '-rotated.png';
  }, []);

  const applyRotation = useCallback(async (angle: number) => {
    if (!originalUrl) return;
    setProcessing(true);
    try {
      const img = await loadImage(originalUrl);
      const rad = (angle * Math.PI) / 180;
      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));
      const w = img.width;
      const h = img.height;
      const newW = Math.ceil(w * absCos + h * absSin);
      const newH = Math.ceil(w * absSin + h * absCos);

      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(newW / 2, newH / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -w / 2, -h / 2);
      canvasRef.current = canvas;
      setProcessedUrl(canvas.toDataURL('image/png'));
    } catch {
      addNotification('Error rotating image', 'error');
    } finally {
      setProcessing(false);
    }
  }, [originalUrl, addNotification]);

  const handleSliderChange = useCallback((value: number) => {
    setRotation(value);
    applyRotation(value);
  }, [applyRotation]);

  const handleQuickRotation = useCallback((angle: number) => {
    setRotation(angle);
    applyRotation(angle);
  }, [applyRotation]);

  const handleDownload = useCallback(() => {
    if (canvasRef.current) {
      downloadCanvas(canvasRef.current, fileNameRef.current);
      addNotification('Image downloaded', 'success');
    }
  }, [addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['image/*']} onFilesSelected={handleFile} label="Upload image to rotate" maxFiles={1} readAs="DataURL" />
      {originalUrl && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original</p>
            <img src={originalUrl} alt="Original" className="w-full rounded-xl border border-light-border dark:border-dark-border" />
          </div>
          {processedUrl && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rotated ({rotation})</p>
              <img src={processedUrl} alt="Rotated" className="w-full rounded-xl border border-light-border dark:border-dark-border" />
            </motion.div>
          )}
        </div>
      )}
      {originalUrl && (
        <>
          <Slider label="Rotation Angle" value={rotation} onChange={handleSliderChange} min={0} max={360} showValue minLabel="0" maxLabel="360" />
          <div className="flex gap-2">
            {[0, 90, 180, 270].map((angle) => (
              <Button key={angle} variant={rotation === angle ? 'primary' : 'secondary'} onClick={() => handleQuickRotation(angle)} className="flex-1">
                {angle}
              </Button>
            ))}
          </div>
        </>
      )}
      {processing && <ProgressBar value={50} color="gradient" label="Rotating..." showLabel />}
      {processedUrl && <Button onClick={handleDownload} className="w-full" variant="success">Download Rotated Image</Button>}
    </div>
  );
}

function BlurImageTool() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [originalUrl, setOriginalUrl] = useState('');
  const [blurRadius, setBlurRadius] = useState(5);
  const [processedUrl, setProcessedUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const fileNameRef = useRef('image.png');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setOriginalUrl(files[0].data as string);
    setProcessedUrl('');
    setBlurRadius(5);
    fileNameRef.current = files[0].file.name.replace(/\.[^.]+$/, '') + '-blurred.png';
  }, []);

  const applyBlur = useCallback(async (radius: number) => {
    if (!originalUrl) return;
    setProcessing(true);
    try {
      const img = await loadImage(originalUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      if (radius > 0) {
        const passes = Math.min(radius, 10);
        const step = Math.max(1, Math.floor(radius / passes));
        ctx.filter = `blur(${step}px)`;
        for (let i = 0; i < passes; i++) {
          ctx.drawImage(canvas, 0, 0);
        }
        ctx.filter = 'none';
      }

      canvasRef.current = canvas;
      setProcessedUrl(canvas.toDataURL('image/png'));
    } catch {
      addNotification('Error blurring image', 'error');
    } finally {
      setProcessing(false);
    }
  }, [originalUrl, addNotification]);

  const handleSliderChange = useCallback((value: number) => {
    setBlurRadius(value);
    applyBlur(value);
  }, [applyBlur]);

  const handleDownload = useCallback(() => {
    if (canvasRef.current) {
      downloadCanvas(canvasRef.current, fileNameRef.current);
      addNotification('Image downloaded', 'success');
    }
  }, [addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['image/*']} onFilesSelected={handleFile} label="Upload image to blur" maxFiles={1} readAs="DataURL" />
      {originalUrl && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original</p>
            <img src={originalUrl} alt="Original" className="w-full rounded-xl border border-light-border dark:border-dark-border" />
          </div>
          {processedUrl && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Blurred</p>
              <img src={processedUrl} alt="Blurred" className="w-full rounded-xl border border-light-border dark:border-dark-border" />
            </motion.div>
          )}
        </div>
      )}
      {originalUrl && <Slider label="Blur Radius" value={blurRadius} onChange={handleSliderChange} min={0} max={20} showValue minLabel="None" maxLabel="Heavy" />}
      {processing && <ProgressBar value={50} color="gradient" label="Applying blur..." showLabel />}
      {processedUrl && <Button onClick={handleDownload} className="w-full" variant="success">Download Blurred Image</Button>}
    </div>
  );
}

interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
}

function ImagesToPdfTool() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    const newImages = files.map((f) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      file: f.file,
      url: f.data as string,
      name: f.file.name,
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const moveImage = useCallback((id: string, direction: 'up' | 'down') => {
    setImages((prev) => {
      const idx = prev.findIndex((img) => img.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (images.length === 0) { addNotification('Please add at least one image', 'warning'); return; }
    setGenerating(true); setProgress(10);
    try {
      const pdfDoc = await PDFDocument.create();
      setProgress(30);

      for (let i = 0; i < images.length; i++) {
        const img = await loadImage(images[i].url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const pngDataUrl = canvas.toDataURL('image/png');
        const pngBytes = await fetch(pngDataUrl).then((r) => r.arrayBuffer());
        const embeddedImg = await pdfDoc.embedPng(pngBytes);

        const pageWidth = 612;
        const pageHeight = 792;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const imgAspect = embeddedImg.width / embeddedImg.height;
        const pageAspect = pageWidth / pageHeight;

        let drawW: number, drawH: number;
        if (imgAspect > pageAspect) {
          drawW = pageWidth - 40;
          drawH = drawW / imgAspect;
        } else {
          drawH = pageHeight - 40;
          drawW = drawH * imgAspect;
        }

        const x = (pageWidth - drawW) / 2;
        const y = (pageHeight - drawH) / 2;

        page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH });
        setProgress(30 + ((i + 1) / images.length) * 60);
      }

      setProgress(95);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'images.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProgress(100);
      addNotification(`PDF created with ${images.length} images!`, 'success');
    } catch {
      addNotification('Error creating PDF', 'error');
    } finally {
      setGenerating(false); setTimeout(() => setProgress(0), 2000);
    }
  }, [images, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['image/*']} onFilesSelected={handleFiles} label="Upload images for PDF" description="Add multiple images. They can be reordered below." multiple maxFiles={20} readAs="DataURL" />

      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{images.length} images</label>
          </div>
          <AnimatePresence>
            {images.map((img, idx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border"
              >
                <img src={img.url} alt={img.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{img.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Page {idx + 1}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveImage(img.id, 'up')} disabled={idx === 0} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-hover disabled:opacity-30 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button onClick={() => moveImage(img.id, 'down')} disabled={idx === images.length - 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-hover disabled:opacity-30 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <button onClick={() => removeImage(img.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {progress > 0 && <ProgressBar value={progress} color="gradient" label="Creating PDF..." showLabel />}
      {images.length > 0 && (
        <Button onClick={handleGenerate} loading={generating} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
          Create PDF ({images.length} pages)
        </Button>
      )}
    </div>
  );
}

function ImageToolPage({ toolId }: { toolId: string }) {
  const { direction } = useLanguageStore();
  const navigate = useNavigate();
  const configs: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
    'background-remover': {
      title: 'Background Remover',
      description: 'Remove backgrounds from images using color detection',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
      component: <BackgroundRemover />,
    },
    'rotate-image': {
      title: 'Rotate Image',
      description: 'Rotate images by any angle with live preview',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
      component: <RotateImageTool />,
    },
    'blur-image': {
      title: 'Blur Image',
      description: 'Apply blur effect to images with adjustable radius',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" opacity="0.5"/><circle cx="12" cy="12" r="2" opacity="0.3"/></svg>,
      component: <BlurImageTool />,
    },
    'images-to-pdf': {
      title: 'Images to PDF',
      description: 'Combine multiple images into a single PDF document',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
      component: <ImagesToPdfTool />,
    },
  };

  const config = configs[toolId as ToolId];

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        title="Tool not found"
        description="The requested image tool could not be found."
      />
    );
  }

return (
  <div className="max-w-4xl mx-auto space-y-6" dir={direction}>
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => navigate('/category/images')}
        className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
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
            ? 'العودة لأدوات الصور'
            : 'Back to Image Tools'}
        </span>
      </button>

      <Card>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            {config.icon}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {config.title}
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {config.description}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card>
        {config.component}
      </Card>
    </motion.div>
  </div>
);
}

export default ImageToolPage;
