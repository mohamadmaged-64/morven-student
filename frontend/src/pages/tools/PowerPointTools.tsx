import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, CheckCircle2, Presentation, FileText } from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input, TextArea, Select } from '@/components/UI/Input';
import { FileUpload } from '@/components/UI/FileUpload';
import { ProgressBar } from '@/components/UI/ProgressBar';
import { EmptyState } from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useNavigate } from 'react-router-dom';
import { saveToLibrary } from '@/services/savedFilesService';
import { ToolHero } from '@/components/Tool/ToolHero';
import { numberSlides, generatePptFromText, generatePptFromPdf, mergePowerPoint, splitPowerPoint, type SlideNumberPosition } from '@/services/conversionApi';
import { isNetworkError } from '@/services/apiError';

function networkErrorMessage(direction: string): string {
  return direction === 'rtl'
    ? 'أنت غير متصل بالإنترنت. تتطلب هذه الأداة اتصالاً بالإنترنت. حاول مرة أخرى عند توفر الاتصال.'
    : 'You are offline. This tool requires an internet connection. Try again once you are back online.';
}

type OldToolId =
  | 'ppt-from-text'
  | 'ppt-from-pdf'

type NewToolId =
  | 'generate-ppt-text'
  | 'generate-ppt-pdf'
  | 'merge-ppt'
  | 'split-ppt'
  | 'compress-ppt'
  | 'protect-ppt'
  | 'number-slides';

type ToolId = OldToolId | NewToolId;

const THEME_COLORS = [
  { value: '1B5E20', label: 'Green' },
  { value: '0D47A1', label: 'Blue' },
  { value: 'B71C1C', label: 'Red' },
  { value: '4A148C', label: 'Purple' },
  { value: 'E65100', label: 'Orange' },
  { value: '263238', label: 'Dark' },
  { value: '004D40', label: 'Teal' },
  { value: '880E4F', label: 'Pink' },
];

const FONTS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
];

function parseSections(text: string): { title: string; bullets: string[] }[] {
  const sections = text.split(/\n\n+/).filter((s) => s.trim());
  return sections.map((section) => {
    const lines = section.trim().split('\n').filter((l) => l.trim());
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || 'Untitled';
    const bullets = lines.slice(1).map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
    return { title, bullets };
  });
}

function buildPptx(sections: { title: string; bullets: string[] }[], themeColor: string, font: string) {
  const pptx = new PptxGenJS();
  pptx.author = 'Morven Student';
  pptx.title = 'Generated Presentation';
  sections.forEach((section, i) => {
    const slide = pptx.addSlide();
    if (i === 0) {
      slide.background = { fill: themeColor };
      slide.addText(section.title, { x: 0.5, y: 1.5, w: '90%', h: 1.5, fontSize: 32, fontFace: font, color: 'FFFFFF', bold: true, align: 'center' });
      if (section.bullets.length > 0) {
        slide.addText(section.bullets.join('\n'), { x: 0.5, y: 3.2, w: '90%', h: 1.5, fontSize: 14, fontFace: font, color: 'FFFFFF', align: 'center' });
      }
    } else {
      slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: themeColor } });
      slide.addText(section.title, { x: 0.6, y: 0.3, w: '88%', h: 0.8, fontSize: 26, fontFace: font, color: themeColor, bold: true });
      if (section.bullets.length > 0) {
        slide.addText(
          section.bullets.map((b) => ({ text: b, options: { bullet: { code: '2022' }, fontSize: 16, fontFace: font, color: '333333', breakType: 'none' as const, paraSpaceAfter: 8 } })),
          { x: 0.8, y: 1.3, w: '84%', h: 4, valign: 'top' },
        );
      }
    }
  });
  return pptx;
}

function extractPptxText(data: ArrayBuffer): Promise<{ text: string; count: number }> {
  return JSZip.loadAsync(data).then((zip) => {
    const slideFiles = Object.keys(zip.files)
      .filter((n) => n.match(/ppt\/slides\/slide\d+\.xml/))
      .sort((a, b) => (parseInt(a.match(/slide(\d+)/)?.[1] || '0') - parseInt(b.match(/slide(\d+)/)?.[1] || '0')));
    return Promise.all(slideFiles.map((sf) => zip.file(sf)!.async('string'))).then((xmls) => {
      let text = '';
      xmls.forEach((xml, idx) => {
        const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
        const texts = matches.map((m) => m.replace(/<\/?a:t>/g, ''));
        text += `--- Slide ${idx + 1} ---\n${texts.join(' ')}\n\n`;
      });
      return { text, count: slideFiles.length };
    });
  });
}

function ThemeOptions({ themeColor, setThemeColor, font, setFont }: { themeColor: string; setThemeColor: (v: string) => void; font: string; setFont: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Select label="Theme Color" options={THEME_COLORS} value={themeColor} onChange={(e) => setThemeColor(e.target.value)} />
      <Select label="Font" options={FONTS} value={font} onChange={(e) => setFont(e.target.value)} />
    </div>
  );
}

function GenerateFromText({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) { addNotification('Please enter content', 'warning'); return; }
    setGenerating(true); setProgress(20);
    try {
      const sections = parseSections(content); setProgress(60);
      const pptx = buildPptx(sections, themeColor, font); setProgress(90);
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'presentation.pptx');
      saveToLibrary(blob as Blob, 'presentation.pptx', 'powerpoint-tools').catch(() => {});
      setProgress(100); addNotification('Presentation generated successfully!', 'success');
    } catch { addNotification('Error generating presentation', 'error'); }
    finally { setGenerating(false); setTimeout(() => setProgress(0), 2000); }
  }, [content, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <TextArea label="Enter your content" placeholder={"Title of first slide\n\nFirst bullet point\nSecond bullet point\nThird bullet point\n\nTitle of second slide\n\nAnother bullet point"} value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[250px]" />
      {progress > 0 && <ProgressBar value={progress} color="gradient" label="Generating..." showLabel />}
      <Button onClick={handleGenerate} loading={generating} disabled={!content.trim()} className="w-full">Generate & Download PPTX</Button>
    </div>
  );
}

function GenerateFromPdf({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [extractedText, setExtractedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setProcessing(true); setProgress(20);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
      const doc = await pdfjsLib.getDocument({ data: files[0].data as ArrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(20 + (i / doc.numPages) * 50);
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n\n';
      }
      setExtractedText(text); setProgress(70);
      addNotification('Text extracted from PDF', 'success');
    } catch { addNotification('Error extracting text from PDF', 'error'); }
    finally { setProcessing(false); setTimeout(() => setProgress(0), 500); }
  }, [addNotification]);

  const handleGenerate = useCallback(async () => {
    if (!extractedText.trim()) return;
    setGenerating(true); setProgress(80);
    try {
      const pptx = buildPptx(parseSections(extractedText), themeColor, font); setProgress(95);
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'from-pdf.pptx');
      saveToLibrary(blob as Blob, 'from-pdf.pptx', 'powerpoint-tools').catch(() => {});
      setProgress(100); addNotification('Presentation generated from PDF!', 'success');
    } catch { addNotification('Error generating presentation', 'error'); }
    finally { setGenerating(false); setTimeout(() => setProgress(0), 2000); }
  }, [extractedText, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['application/pdf']} onFilesSelected={handleFile} label="Upload PDF file" description="Supports PDF files up to 50MB" />
      {processing && <ProgressBar value={progress} color="primary" label="Extracting text..." showLabel />}
      {extractedText && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <TextArea label="Extracted text (editable)" value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="min-h-[200px]" />
          {progress > 0 && !processing && <ProgressBar value={progress} color="gradient" label="Generating..." showLabel />}
          <Button onClick={handleGenerate} loading={generating} className="w-full mt-3">Generate PPTX from PDF</Button>
        </motion.div>
      )}
    </div>
  );
}


// ─── New UI-only tools (backend support coming soon) ────────────────

const NEW_TOOL_IDS: NewToolId[] = [
  'generate-ppt-text',
  'generate-ppt-pdf',
  'merge-ppt',
  'split-ppt',
  'compress-ppt',
  'number-slides',
];

const THEME_TOOL_IDS: OldToolId[] = [
  'ppt-from-text',
  'ppt-from-pdf',
];

function useSimulatedProcess() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDone(false);
    setProgress(0);
    setProcessing(true);
    let p = 0;
    intervalRef.current = setInterval(() => {
      p += 8;
      if (p >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setProgress(100);
        setProcessing(false);
        setDone(true);
        addNotification(t('Processing Complete', 'Processing Complete'), 'success');
      } else {
        setProgress(p);
      }
    }, 200);
  }, [addNotification, t]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProcessing(false);
    setProgress(0);
    setDone(false);
  }, []);

  return { processing, progress, done, start, reset };
}

function PlaceholderResult({ fileName, type = 'PPTX', onReset, onDownload }: { fileName: string; type?: string; onReset: () => void; onDownload?: () => void }) {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{t('Processing Complete', 'Processing Complete')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('Your file is ready to download', 'Your file is ready to download')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-light-border dark:border-dark-border p-3 mt-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Presentation className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{type}</p>
            </div>
          </div>
          <Badge variant="success" dot>{t('Ready', 'Ready')}</Badge>
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            className="flex-1"
            icon={<Download className="h-4 w-4" />}
            onClick={onDownload ?? (() => addNotification(t('Download will be available soon', 'Download will be available soon'), 'info'))}
          >
            {t('Download', 'Download')}
          </Button>
          <Button variant="ghost" onClick={onReset}>{t('Start Over', 'Start Over')}</Button>
        </div>
      </Card>
    </motion.div>
  );
}

function GeneratePptFromTextTool() {
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) { addNotification(t('Please enter slide content', 'Please enter slide content'), 'warning'); return; }
    setResult(null);
    setDone(false);
    setProgress(0);
    setProcessing(true);

    progressRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 10));
    }, 250);

    try {
      const blob = await generatePptFromText(title.trim(), content);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setProcessing(false);
      const slug = title.trim().replace(/[^\w\u0600-\u06FF -]+/g, '').trim().replace(/\s+/g, '-');
      const name = (slug ? `${slug}-presentation` : 'presentation') + '.pptx';
      setResult({ blob, name });
      setDone(true);
      saveAs(blob, name);
      saveToLibrary(blob, name, 'powerpoint-tools').catch(() => {});
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? networkErrorMessage(direction) : (err instanceof Error ? err.message : 'Failed to generate presentation');
      addNotification(msg, 'error');
    }
  }, [title, content, addNotification, t]);

  return (
    <div className="space-y-4" dir={direction}>
      <Input
        label={t('Presentation Title (optional)', 'Presentation Title (optional)')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('e.g. My Presentation', 'e.g. My Presentation')}
      />
      <TextArea
        label={t('Slide content', 'Slide content')}
        placeholder={t('Title of first slide, then bullet points. Leave a blank line between slides.', 'Title of first slide, then bullet points. Leave a blank line between slides.')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[250px]"
      />
      {processing && <ProgressBar value={progress} color="gradient" label={t('Generating presentation...', 'Generating presentation...')} showLabel />}
      {!done && (
        <Button onClick={handleGenerate} loading={processing} disabled={!content.trim()} className="w-full">
          {t('Generate Presentation', 'Generate Presentation')}
        </Button>
      )}
      {done && result && (
        <PlaceholderResult
          fileName={result.name}
          onReset={() => { setTitle(''); setContent(''); setResult(null); setDone(false); setProgress(0); }}
          onDownload={() => { saveAs(result.blob, result.name); saveToLibrary(result.blob, result.name, 'powerpoint-tools').catch(() => {}); }}
        />
      )}
    </div>
  );
}

function GeneratePptFromPdfTool() {
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [uploaded, setUploaded] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length) setUploaded(files[0].file);
  }, []);

  const handleRemove = useCallback(() => {
    setUploaded(null);
    setResult(null);
    setDone(false);
    setProgress(0);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!uploaded) {
      addNotification(t('Select at least one file', 'Select at least one file'), 'warning');
      return;
    }

    setResult(null);
    setDone(false);
    setProgress(0);
    setProcessing(true);

    progressRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 10));
    }, 250);

    try {
      const blob = await generatePptFromPdf(uploaded);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setProcessing(false);
      const name = uploaded.name.replace(/\.[^.]+$/, '') + '-presentation.pptx';
      setResult({ blob, name });
      setDone(true);
      saveAs(blob, name);
      saveToLibrary(blob, name, 'powerpoint-tools').catch(() => {});
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? networkErrorMessage(direction) : (err instanceof Error ? err.message : 'Failed to convert PDF to presentation');
      addNotification(msg, 'error');
    }
  }, [uploaded, addNotification, t]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload
        accept={['application/pdf', '.pdf']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label={t('Upload PDF to generate presentation', 'Upload PDF to generate presentation')}
        description={t('Select a PDF file up to 50MB', 'Select a PDF file up to 50MB')}
      />
      {processing && <ProgressBar value={progress} color="gradient" label={t('Generating presentation...', 'Generating presentation...')} showLabel />}
      {!done && uploaded && (
        <Button onClick={handleGenerate} loading={processing} className="w-full">{t('Generate Presentation', 'Generate Presentation')}</Button>
      )}
      {done && result && (
        <PlaceholderResult
          fileName={result.name}
          onReset={() => { setUploaded(null); setResult(null); setDone(false); setProgress(0); }}
          onDownload={() => { saveAs(result.blob, result.name); saveToLibrary(result.blob, result.name, 'powerpoint-tools').catch(() => {}); }}
        />
      )}
    </div>
  );
}

function MergePptTool() {
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const handleFile = useCallback((selected: { file: File; data: ArrayBuffer | string }[]) => {
    setFiles(selected.map((s) => s.file));
  }, []);

  const handleRemove = useCallback(() => {
    setFiles([]);
    setResult(null);
    setDone(false);
    setProgress(0);
  }, []);

  const handleProcess = useCallback(async () => {
    if (files.length < 2) {
      addNotification(t('Select at least 2 presentations', 'Select at least 2 presentations'), 'warning');
      return;
    }

    setResult(null);
    setDone(false);
    setProgress(0);
    setProcessing(true);

    progressRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 10));
    }, 250);

    try {
      const blob = await mergePowerPoint(files);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setProcessing(false);
      const name = 'merged-presentation.pptx';
      setResult({ blob, name });
      setDone(true);
      saveAs(blob, name);
      saveToLibrary(blob, name, 'powerpoint-tools').catch(() => {});
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? networkErrorMessage(direction) : (err instanceof Error ? err.message : 'Failed to merge presentations');
      addNotification(msg, 'error');
    }
  }, [files, addNotification, t]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload
        accept={['.pptx', '.ppt']}
        multiple
        maxFiles={20}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label={t('Upload presentations to merge', 'Upload presentations to merge')}
        description={t('Select at least 2 presentations', 'Select at least 2 presentations')}
      />
      {processing && <ProgressBar value={progress} color="gradient" label={t('Merging presentations...', 'Merging presentations...')} showLabel />}
      {!done && files.length > 0 && (
        <Button onClick={handleProcess} loading={processing} className="w-full">{t('Merge Presentations', 'Merge Presentations')}</Button>
      )}
      {done && result && (
        <PlaceholderResult
          fileName={result.name}
          onReset={() => { setFiles([]); setResult(null); setDone(false); setProgress(0); }}
          onDownload={() => { saveAs(result.blob, result.name); saveToLibrary(result.blob, result.name, 'powerpoint-tools').catch(() => {}); }}
        />
      )}
    </div>
  );
}

function SplitPptTool() {
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [uploaded, setUploaded] = useState<File | null>(null);
  const [ranges, setRanges] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length) setUploaded(files[0].file);
  }, []);

  const handleRemove = useCallback(() => {
    setUploaded(null);
    setRanges('');
    setResult(null);
    setDone(false);
    setProgress(0);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!uploaded) {
      addNotification(t('Select at least one file', 'Select at least one file'), 'warning');
      return;
    }

    setResult(null);
    setDone(false);
    setProgress(0);
    setProcessing(true);

    progressRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 10));
    }, 250);

    try {
      const blob = await splitPowerPoint(uploaded, ranges);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setProcessing(false);
      const name = uploaded.name.replace(/\.[^.]+$/, '') + '-split.zip';
      setResult({ blob, name });
      setDone(true);
      saveAs(blob, name);
      saveToLibrary(blob, name, 'powerpoint-tools').catch(() => {});
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? networkErrorMessage(direction) : (err instanceof Error ? err.message : 'Failed to split presentation');
      addNotification(msg, 'error');
    }
  }, [uploaded, ranges, addNotification, t]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label={t('Upload a presentation to split', 'Upload a presentation to split')}
      />
      {uploaded && !done && (
        <Input
          label={t('Page ranges (optional)', 'Page ranges (optional)')}
          placeholder={t('Example 1-3, 5, 8-10', 'Example 1-3, 5, 8-10')}
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
        />
      )}
      {processing && <ProgressBar value={progress} color="gradient" label={t('Splitting presentation...', 'Splitting presentation...')} showLabel />}
      {!done && uploaded && (
        <Button onClick={handleProcess} loading={processing} className="w-full">{t('Process', 'Process')}</Button>
      )}
      {done && result && (
        <PlaceholderResult
          fileName={result.name}
          type="ZIP"
          onReset={() => { setUploaded(null); setRanges(''); setResult(null); setDone(false); setProgress(0); }}
          onDownload={() => { saveAs(result.blob, result.name); saveToLibrary(result.blob, result.name, 'powerpoint-tools').catch(() => {}); }}
        />
      )}
    </div>
  );
}

function CompressPptTool() {
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [hasFile, setHasFile] = useState(false);
  const [quality, setQuality] = useState('medium');
  const { processing, progress, done, start, reset } = useSimulatedProcess();

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length) setHasFile(true);
  }, []);

  const handleRemove = useCallback(() => { setHasFile(false); reset(); }, [reset]);

  const handleProcess = useCallback(() => {
    if (!hasFile) { addNotification(t('Select at least one file', 'Select at least one file'), 'warning'); return; }
    start();
  }, [hasFile, addNotification, t, start]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label={t('Upload a presentation to compress', 'Upload a presentation to compress')}
      />
      {hasFile && !done && (
        <Select
          label={t('Compression Level', 'Compression Level')}
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          options={[
            { value: 'low', label: t('Low', 'Low') },
            { value: 'medium', label: t('Medium', 'Medium') },
            { value: 'high', label: t('High', 'High') },
          ]}
        />
      )}
      {processing && <ProgressBar value={progress} color="gradient" label={t('Compressing presentation...', 'Compressing presentation...')} showLabel />}
      {!done && hasFile && (
        <Button onClick={handleProcess} loading={processing} className="w-full">{t('Process', 'Process')}</Button>
      )}
      {done && <PlaceholderResult fileName="compressed-presentation.pptx" onReset={() => { setHasFile(false); reset(); }} />}
    </div>
  );
}

function ProtectPptTool() {
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [hasFile, setHasFile] = useState(false);
  const [password, setPassword] = useState('');
  const { processing, progress, done, start, reset } = useSimulatedProcess();

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length) setHasFile(true);
  }, []);

  const handleRemove = useCallback(() => { setHasFile(false); setPassword(''); reset(); }, [reset]);

  const handleProcess = useCallback(() => {
    if (!hasFile) { addNotification(t('Select at least one file', 'Select at least one file'), 'warning'); return; }
    if (!password) { addNotification(t('Enter a password', 'Enter a password'), 'warning'); return; }
    start();
  }, [hasFile, password, addNotification, t, start]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label={t('Upload a presentation to protect', 'Upload a presentation to protect')}
      />
      {hasFile && !done && (
        <Input
          label={t('Set Password', 'Set Password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('Enter password...', 'Enter password...')}
        />
      )}
      {processing && <ProgressBar value={progress} color="gradient" label={t('Protecting presentation...', 'Protecting presentation...')} showLabel />}
      {!done && hasFile && (
        <Button onClick={handleProcess} loading={processing} className="w-full">{t('Process', 'Process')}</Button>
      )}
      {done && <PlaceholderResult fileName="protected-presentation.pptx" onReset={() => { setHasFile(false); setPassword(''); reset(); }} />}
    </div>
  );
}

function NumberSlidesTool() {
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [uploaded, setUploaded] = useState<File | null>(null);
  const [startNumber, setStartNumber] = useState('1');
  const [position, setPosition] = useState<SlideNumberPosition>('bottom-right');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (progressRef.current) clearInterval(progressRef.current); }, []);

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length) setUploaded(files[0].file);
  }, []);

  const handleRemove = useCallback(() => {
    setUploaded(null);
    setResult(null);
    setDone(false);
    setProgress(0);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!uploaded) {
      addNotification(t('Select at least one file', 'Select at least one file'), 'warning');
      return;
    }

    const parsedStart = Number(startNumber);
    const validStart = Number.isInteger(parsedStart) && parsedStart >= 1 ? parsedStart : 1;

    setResult(null);
    setDone(false);
    setProgress(0);
    setProcessing(true);

    progressRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 10));
    }, 250);

    try {
      const blob = await numberSlides(uploaded, position, validStart);
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setProcessing(false);
      const name = uploaded.name.replace(/\.[^.]+$/, '') + '-numbered.pptx';
      setResult({ blob, name });
      setDone(true);
      saveAs(blob, name);
      saveToLibrary(blob, name, 'powerpoint-tools').catch(() => {});
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? networkErrorMessage(direction) : (err instanceof Error ? err.message : 'Failed to add slide numbers');
      addNotification(msg, 'error');
    }
  }, [uploaded, startNumber, position, addNotification, t]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label={t('Upload a presentation to add slide numbers', 'Upload a presentation to add slide numbers')}
      />
      {uploaded && !done && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('Start Number', 'Start Number')}
            type="number"
            min={1}
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
          />
          <Select
            label={t('Position', 'Position')}
            value={position}
            onChange={(e) => setPosition(e.target.value as SlideNumberPosition)}
            options={[
              { value: 'bottom-right', label: t('Bottom Right', 'Bottom Right') },
              { value: 'bottom-center', label: t('Bottom Center', 'Bottom Center') },
              { value: 'bottom-left', label: t('Bottom Left', 'Bottom Left') },
              { value: 'top-right', label: t('Top Right', 'Top Right') },
              { value: 'top-center', label: t('Top Center', 'Top Center') },
              { value: 'top-left', label: t('Top Left', 'Top Left') },
            ]}
          />
        </div>
      )}
      {processing && <ProgressBar value={progress} color="gradient" label={t('Adding slide numbers...', 'Adding slide numbers...')} showLabel />}
      {!done && uploaded && (
        <Button onClick={handleProcess} loading={processing} className="w-full">{t('Apply Numbering', 'Apply Numbering')}</Button>
      )}
      {done && result && (
        <PlaceholderResult
          fileName={result.name}
          onReset={() => { setUploaded(null); setResult(null); setDone(false); setProgress(0); }}
          onDownload={() => { saveAs(result.blob, result.name); saveToLibrary(result.blob, result.name, 'powerpoint-tools').catch(() => {}); }}
        />
      )}
    </div>
  );
}

const TOOL_CONFIGS: Record<OldToolId, { title: string; description: string; icon: JSX.Element }> = {
  'ppt-from-text': {
    title: 'Generate PPT from Text', description: 'Convert your text into a professional presentation',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  'ppt-from-pdf': {
    title: 'Generate PPT from PDF', description: 'Extract text from PDF and create slides',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },
 
};

function PowerPointToolPage({ toolId }: { toolId: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { direction } = useLanguageStore();
  const [themeColor, setThemeColor] = useState('0D47A1');
  const [font, setFont] = useState('Arial');

  const newToolConfigs: Record<NewToolId, { title: string; description: string; icon: JSX.Element }> = {
    'generate-ppt-text': {
      title: t('Generate PPT from Text', 'Generate PPT from Text'),
      description: t('Create a presentation from text content', 'Create a presentation from text content'),
      icon: <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'generate-ppt-pdf': {
      title: t('Generate PPT from PDF', 'Generate PPT from PDF'),
      description: t('Convert PDF to a PowerPoint presentation', 'Convert PDF to a PowerPoint presentation'),
      icon: <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'merge-ppt': {
      title: t('Merge PowerPoint', 'Merge PowerPoint'),
      description: t('Combine multiple PowerPoint presentations into one', 'Combine multiple PowerPoint presentations into one'),
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'split-ppt': {
      title: t('Split PowerPoint', 'Split PowerPoint'),
      description: t('Split a presentation into multiple files', 'Split a presentation into multiple files'),
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'compress-ppt': {
      title: t('Compress PowerPoint', 'Compress PowerPoint'),
      description: t('Reduce the size of your PowerPoint presentation', 'Reduce the size of your PowerPoint presentation'),
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'protect-ppt': {
      title: t('Protect PowerPoint', 'Protect PowerPoint'),
      description: t('Add password protection to your presentation', 'Add password protection to your presentation'),
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },

    'number-slides': {
      title: t('Number Slides', 'Number Slides'),
      description: t('Automatically add slide numbers to your presentation', 'Automatically add slide numbers to your presentation'),
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
  };

  const isNewTool = (NEW_TOOL_IDS as readonly string[]).includes(toolId);
  const config = isNewTool
    ? newToolConfigs[toolId as NewToolId]
    : TOOL_CONFIGS[toolId as OldToolId];
  const needsTheme = THEME_TOOL_IDS.includes(toolId as OldToolId);

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        title={t('Tool not found', 'Tool not found')}
        description={t('The requested PowerPoint tool could not be found.', 'The requested PowerPoint tool could not be found.')}
      />
    );
  }

  const toolComponents: Record<ToolId, JSX.Element> = {
    'ppt-from-text': <GenerateFromText themeColor={themeColor} font={font} />,
    'ppt-from-pdf': <GenerateFromPdf themeColor={themeColor} font={font} />,
    'generate-ppt-text': <GeneratePptFromTextTool />,
    'generate-ppt-pdf': <GeneratePptFromPdfTool />,
    'merge-ppt': <MergePptTool />,
    'split-ppt': <SplitPptTool />,
    'compress-ppt': <CompressPptTool />,
    'protect-ppt': <ProtectPptTool />,
    
    'number-slides': <NumberSlidesTool />,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={direction}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <button
        onClick={() => navigate('/category/powerpoint')}
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
          {t('Back to PowerPoint Tools', 'Back to PowerPoint Tools')}
        </span>
      </button>
          {needsTheme && <ThemeOptions themeColor={themeColor} setThemeColor={setThemeColor} font={font} setFont={setFont} />}
        </Card>
      </motion.div>
      <ToolHero icon={config.icon} title={config.title} description={config.description} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{toolComponents[toolId as ToolId]}</Card>
      </motion.div>
    </div>
  );
}

export default PowerPointToolPage;
