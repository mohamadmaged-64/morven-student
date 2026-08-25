import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { useNavigate } from 'react-router-dom';
import { saveToLibrary } from '@/services/savedFilesService';
import { ToolHero } from '@/components/Tool/ToolHero';
import { numberSlides, generatePptFromText, generatePptFromPdf, mergePowerPoint, splitPowerPoint, type SlideNumberPosition } from '@/services/conversionApi';
import { isNetworkError } from '@/services/apiError';

const NETWORK_ERROR_MESSAGE = 'أنت غير متصل بالإنترنت. تتطلب هذه الأداة اتصالاً بالإنترنت. حاول مرة أخرى عند توفر الاتصال.';

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
  { value: '1B5E20', label: 'أخضر' },
  { value: '0D47A1', label: 'أزرق' },
  { value: 'B71C1C', label: 'أحمر' },
  { value: '4A148C', label: 'بنفسجي' },
  { value: 'E65100', label: 'برتقالي' },
  { value: '263238', label: 'غامق' },
  { value: '004D40', label: 'تركوازي' },
  { value: '880E4F', label: 'وردي' },
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
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || 'بدون عنوان';
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
        text += `--- شريحة ${idx + 1} ---\n${texts.join(' ')}\n\n`;
      });
      return { text, count: slideFiles.length };
    });
  });
}

function ThemeOptions({ themeColor, setThemeColor, font, setFont }: { themeColor: string; setThemeColor: (v: string) => void; font: string; setFont: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Select label="لون السمة" options={THEME_COLORS} value={themeColor} onChange={(e) => setThemeColor(e.target.value)} />
      <Select label="الخط" options={FONTS} value={font} onChange={(e) => setFont(e.target.value)} />
    </div>
  );
}

function GenerateFromText({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) { addNotification('يرجى إدخال المحتوى', 'warning'); return; }
    setGenerating(true); setProgress(20);
    try {
      const sections = parseSections(content); setProgress(60);
      const pptx = buildPptx(sections, themeColor, font); setProgress(90);
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'presentation.pptx');
      saveToLibrary(blob as Blob, 'presentation.pptx', 'powerpoint-tools').catch(() => {});
      setProgress(100); addNotification('تم إنشاء العرض التقديمي بنجاح!', 'success');
    } catch { addNotification('حدث خطأ أثناء إنشاء العرض التقديمي.', 'error'); }
    finally { setGenerating(false); setTimeout(() => setProgress(0), 2000); }
  }, [content, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir="rtl">
      <TextArea label="أدخل المحتوى" placeholder={"عنوان الشريحة الأولى\n\nنقطة أولى\nنقطة ثانية\nنقطة ثالثة\n\nعنوان الشريحة الثانية\n\nنقطة أخرى"} value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[250px]" />
      {progress > 0 && <ProgressBar value={progress} color="gradient" label="جارٍ الإنشاء..." showLabel />}
      <Button onClick={handleGenerate} loading={generating} disabled={!content.trim()} className="w-full">إنشاء وتنزيل PPTX</Button>
    </div>
  );
}

function GenerateFromPdf({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
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
      addNotification('تم استخراج النص من PDF.', 'success');
    } catch { addNotification('حدث خطأ أثناء استخراج النص من PDF.', 'error'); }
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
      setProgress(100); addNotification('تم إنشاء العرض التقديمي من PDF!', 'success');
    } catch { addNotification('حدث خطأ أثناء إنشاء العرض التقديمي.', 'error'); }
    finally { setGenerating(false); setTimeout(() => setProgress(0), 2000); }
  }, [extractedText, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir="rtl">
      <FileUpload accept={['application/pdf']} onFilesSelected={handleFile} label="ارفع ملف PDF" description="يدعم ملفات PDF حتى 50 ميغابايت." />
      {processing && <ProgressBar value={progress} color="primary" label="جارٍ استخراج النص..." showLabel />}
      {extractedText && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <TextArea label="النص المستخرج (قابل للتعديل)" value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="min-h-[200px]" />
          {progress > 0 && !processing && <ProgressBar value={progress} color="gradient" label="جارٍ الإنشاء..." showLabel />}
          <Button onClick={handleGenerate} loading={generating} className="w-full mt-3">إنشاء PPTX من PDF</Button>
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
        addNotification('اكتملت المعالجة', 'success');
      } else {
        setProgress(p);
      }
    }, 200);
  }, [addNotification]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProcessing(false);
    setProgress(0);
    setDone(false);
  }, []);

  return { processing, progress, done, start, reset };
}

function PlaceholderResult({ fileName, type = 'PPTX', onReset, onDownload }: { fileName: string; type?: string; onReset: () => void; onDownload?: () => void }) {
  const { addNotification } = useAppStore();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">اكتملت المعالجة</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">ملفك جاهز للتنزيل</p>
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
          <Badge variant="success" dot>جاهز</Badge>
        </div>
        <div className="flex gap-3 mt-4">
          <Button
            className="flex-1"
            icon={<Download className="h-4 w-4" />}
            onClick={onDownload ?? (() => addNotification('سيكون التنزيل متاحًا قريبًا', 'info'))}
          >
            تنزيل
          </Button>
          <Button variant="ghost" onClick={onReset}>البدء من جديد</Button>
        </div>
      </Card>
    </motion.div>
  );
}

function GeneratePptFromTextTool() {
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
    if (!content.trim()) { addNotification('يرجى إدخال محتوى الشرائح', 'warning'); return; }
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
      addNotification('اكتملت المعالجة', 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? NETWORK_ERROR_MESSAGE : (err instanceof Error ? err.message : 'تعذر إنشاء العرض التقديمي.');
      addNotification(msg, 'error');
    }
  }, [title, content, addNotification]);

  return (
    <div className="space-y-4" dir="rtl">
      <Input
        label="عنوان العرض (اختياري)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="مثال: عرضي التقديمي"
      />
      <TextArea
        label="محتوى الشرائح"
        placeholder="عنوان الشريحة الأولى ثم النقاط. اترك سطرًا فارغًا بين الشرائح."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[250px]"
      />
      {processing && <ProgressBar value={progress} color="gradient" label="جارٍ إنشاء العرض..." showLabel />}
      {!done && (
        <Button onClick={handleGenerate} loading={processing} disabled={!content.trim()} className="w-full">
          إنشاء العرض التقديمي
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
      addNotification('حدد ملفًا واحدًا على الأقل', 'warning');
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
      addNotification('اكتملت المعالجة', 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? NETWORK_ERROR_MESSAGE : (err instanceof Error ? err.message : 'تعذر تحويل PDF إلى عرض تقديمي.');
      addNotification(msg, 'error');
    }
  }, [uploaded, addNotification]);

  return (
    <div className="space-y-4" dir="rtl">
      <FileUpload
        accept={['application/pdf', '.pdf']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label="ارفع ملف PDF لإنشاء عرض تقديمي"
        description="حدد ملف PDF بحجم يصل إلى 50 ميغابايت"
      />
      {processing && <ProgressBar value={progress} color="gradient" label="جارٍ إنشاء العرض..." showLabel />}
      {!done && uploaded && (
        <Button onClick={handleGenerate} loading={processing} className="w-full">إنشاء العرض التقديمي</Button>
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
      addNotification('حدد عرضين تقديميين على الأقل', 'warning');
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
      addNotification('اكتملت المعالجة', 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? NETWORK_ERROR_MESSAGE : (err instanceof Error ? err.message : 'تعذر دمج العروض التقديمية.');
      addNotification(msg, 'error');
    }
  }, [files, addNotification]);

  return (
    <div className="space-y-4" dir="rtl">
      <FileUpload
        accept={['.pptx', '.ppt']}
        multiple
        maxFiles={20}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label="ارفع العروض التقديمية للدمج"
        description="حدد عرضين تقديميين على الأقل"
      />
      {processing && <ProgressBar value={progress} color="gradient" label="جارٍ دمج العروض التقديمية..." showLabel />}
      {!done && files.length > 0 && (
        <Button onClick={handleProcess} loading={processing} className="w-full">دمج العروض التقديمية</Button>
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
      addNotification('حدد ملفًا واحدًا على الأقل', 'warning');
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
      addNotification('اكتملت المعالجة', 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? NETWORK_ERROR_MESSAGE : (err instanceof Error ? err.message : 'تعذر تقسيم العرض التقديمي.');
      addNotification(msg, 'error');
    }
  }, [uploaded, ranges, addNotification]);

  return (
    <div className="space-y-4" dir="rtl">
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label="ارفع عرضًا تقديميًا لتقسيمه"
      />
      {uploaded && !done && (
        <Input
          label="نطاقات الشرائح (اختياري)"
          placeholder="مثال: 1-3، 5، 8-10"
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
        />
      )}
      {processing && <ProgressBar value={progress} color="gradient" label="جارٍ تقسيم العرض التقديمي..." showLabel />}
      {!done && uploaded && (
        <Button onClick={handleProcess} loading={processing} className="w-full">معالجة</Button>
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
  const { addNotification } = useAppStore();
  const [hasFile, setHasFile] = useState(false);
  const [quality, setQuality] = useState('medium');
  const { processing, progress, done, start, reset } = useSimulatedProcess();

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length) setHasFile(true);
  }, []);

  const handleRemove = useCallback(() => { setHasFile(false); reset(); }, [reset]);

  const handleProcess = useCallback(() => {
    if (!hasFile) { addNotification('حدد ملفًا واحدًا على الأقل', 'warning'); return; }
    start();
  }, [hasFile, addNotification, start]);

  return (
    <div className="space-y-4" dir="rtl">
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label="ارفع عرضًا تقديميًا لضغطه"
      />
      {hasFile && !done && (
        <Select
          label="مستوى الضغط"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          options={[
            { value: 'low', label: 'منخفض' },
            { value: 'medium', label: 'متوسط' },
            { value: 'high', label: 'مرتفع' },
          ]}
        />
      )}
      {processing && <ProgressBar value={progress} color="gradient" label="جارٍ ضغط العرض التقديمي..." showLabel />}
      {!done && hasFile && (
        <Button onClick={handleProcess} loading={processing} className="w-full">معالجة</Button>
      )}
      {done && <PlaceholderResult fileName="compressed-presentation.pptx" onReset={() => { setHasFile(false); reset(); }} />}
    </div>
  );
}

function ProtectPptTool() {
  const { addNotification } = useAppStore();
  const [hasFile, setHasFile] = useState(false);
  const [password, setPassword] = useState('');
  const { processing, progress, done, start, reset } = useSimulatedProcess();

  const handleFile = useCallback((files: { file: File; data: ArrayBuffer | string }[]) => {
    if (files.length) setHasFile(true);
  }, []);

  const handleRemove = useCallback(() => { setHasFile(false); setPassword(''); reset(); }, [reset]);

  const handleProcess = useCallback(() => {
    if (!hasFile) { addNotification('حدد ملفًا واحدًا على الأقل', 'warning'); return; }
    if (!password) { addNotification('أدخل كلمة المرور', 'warning'); return; }
    start();
  }, [hasFile, password, addNotification, start]);

  return (
    <div className="space-y-4" dir="rtl">
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label="ارفع عرضًا تقديميًا لحمايته"
      />
      {hasFile && !done && (
        <Input
          label="تعيين كلمة المرور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="أدخل كلمة المرور..."
        />
      )}
      {processing && <ProgressBar value={progress} color="gradient" label="جارٍ حماية العرض التقديمي..." showLabel />}
      {!done && hasFile && (
        <Button onClick={handleProcess} loading={processing} className="w-full">معالجة</Button>
      )}
      {done && <PlaceholderResult fileName="protected-presentation.pptx" onReset={() => { setHasFile(false); setPassword(''); reset(); }} />}
    </div>
  );
}

function NumberSlidesTool() {
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
      addNotification('حدد ملفًا واحدًا على الأقل', 'warning');
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
      addNotification('اكتملت المعالجة', 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = isNetworkError(err) ? NETWORK_ERROR_MESSAGE : (err instanceof Error ? err.message : 'تعذر إضافة أرقام الشرائح.');
      addNotification(msg, 'error');
    }
  }, [uploaded, startNumber, position, addNotification]);

  return (
    <div className="space-y-4" dir="rtl">
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label="ارفع عرضًا تقديميًا لإضافة أرقام الشرائح"
      />
      {uploaded && !done && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="رقم البداية"
            type="number"
            min={1}
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
          />
          <Select
            label="الموضع"
            value={position}
            onChange={(e) => setPosition(e.target.value as SlideNumberPosition)}
            options={[
              { value: 'bottom-right', label: 'أسفل اليمين' },
              { value: 'bottom-center', label: 'أسفل الوسط' },
              { value: 'bottom-left', label: 'أسفل اليسار' },
              { value: 'top-right', label: 'أعلى اليمين' },
              { value: 'top-center', label: 'أعلى الوسط' },
              { value: 'top-left', label: 'أعلى اليسار' },
            ]}
          />
        </div>
      )}
      {processing && <ProgressBar value={progress} color="gradient" label="جارٍ إضافة أرقام الشرائح..." showLabel />}
      {!done && uploaded && (
        <Button onClick={handleProcess} loading={processing} className="w-full">تطبيق الترقيم</Button>
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
    title: 'إنشاء عرض من نص', description: 'حوّل نصك إلى عرض تقديمي احترافي',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  'ppt-from-pdf': {
    title: 'إنشاء عرض من PDF', description: 'استخرج النص من PDF وأنشئ شرائح',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },

};

function PowerPointToolPage({ toolId }: { toolId: string }) {
  const navigate = useNavigate();
  const [themeColor, setThemeColor] = useState('0D47A1');
  const [font, setFont] = useState('Arial');

  const newToolConfigs: Record<NewToolId, { title: string; description: string; icon: JSX.Element }> = {
    'generate-ppt-text': {
      title: 'إنشاء عرض من نص',
      description: 'أنشئ عرضًا تقديميًا من محتوى نصي',
      icon: <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'generate-ppt-pdf': {
      title: 'إنشاء عرض من PDF',
      description: 'حوّل ملف PDF إلى عرض PowerPoint',
      icon: <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'merge-ppt': {
      title: 'دمج عروض PowerPoint',
      description: 'ادمج عدة عروض PowerPoint في عرض واحد',
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'split-ppt': {
      title: 'تقسيم عرض PowerPoint',
      description: 'قسّم العرض التقديمي إلى عدة ملفات',
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'compress-ppt': {
      title: 'ضغط عرض PowerPoint',
      description: 'قلّل حجم عرضك التقديمي',
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },
    'protect-ppt': {
      title: 'حماية عرض PowerPoint',
      description: 'أضف حماية بكلمة مرور إلى عرضك التقديمي',
      icon: <Presentation className="w-8 h-8 text-primary-600 dark:text-primary-400" />,
    },

    'number-slides': {
      title: 'ترقيم الشرائح',
      description: 'أضف أرقام الشرائح تلقائيًا إلى عرضك التقديمي',
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
        title="الأداة غير موجودة"
        description="تعذر العثور على أداة PowerPoint المطلوبة."
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
      <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <button
            onClick={() => navigate('/category/powerpoint')}
            className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
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
              العودة إلى أدوات PowerPoint
            </span>
          </button>
        </motion.div>
        {needsTheme && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <ThemeOptions themeColor={themeColor} setThemeColor={setThemeColor} font={font} setFont={setFont} />
          </Card>
          </motion.div>
        )}
        <ToolHero icon={config.icon} title={config.title} description={config.description} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{toolComponents[toolId as ToolId]}</Card>
      </motion.div>
    </div>
  );
}

export default PowerPointToolPage;
