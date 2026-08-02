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
import { ToolHero } from '@/components/Tool/ToolHero';
import { numberSlides, generatePptFromText, generatePptFromPdf, mergePowerPoint, splitPowerPoint, type SlideNumberPosition } from '@/services/conversionApi';

type OldToolId =
  | 'ppt-from-text'
  | 'ppt-from-pdf'
  | 'ppt-from-word'
  | 'ppt-from-research'
  | 'extract-ppt-text'
  | 'convert-ppt-pdf'
  | 'improve-slide-design'
  | 'add-images-slides'
  | 'generate-speaker-notes';

type NewToolId =
  | 'generate-ppt-text'
  | 'generate-ppt-pdf'
  | 'merge-ppt'
  | 'split-ppt'
  | 'compress-ppt'
  | 'protect-ppt'
  | 'unlock-ppt'
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
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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

function GenerateFromWord({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setProcessing(true); setProgress(30);
    try {
      const raw = files[0].data as string;
      const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).join('\n').replace(/\n{3,}/g, '\n\n');
      setExtractedText(cleaned); setProgress(70);
      addNotification('Text extracted from Word document', 'success');
    } catch { addNotification('Error reading Word file', 'error'); }
    finally { setProcessing(false); setTimeout(() => setProgress(0), 500); }
  }, [addNotification]);

  const handleGenerate = useCallback(async () => {
    if (!extractedText.trim()) return;
    setGenerating(true); setProgress(80);
    try {
      const pptx = buildPptx(parseSections(extractedText), themeColor, font);
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'from-word.pptx');
      setProgress(100); addNotification('Presentation generated from Word!', 'success');
    } catch { addNotification('Error generating presentation', 'error'); }
    finally { setGenerating(false); setTimeout(() => setProgress(0), 2000); }
  }, [extractedText, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['.doc', '.docx', '.txt', 'text/plain']} onFilesSelected={handleFile} label="Upload Word / Text file" description="Supports .docx, .doc, and .txt files" />
      {processing && <ProgressBar value={progress} color="primary" label="Reading document..." showLabel />}
      {extractedText && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <TextArea label="Extracted text (editable)" value={extractedText} onChange={(e) => setExtractedText(e.target.value)} className="min-h-[200px]" />
          <Button onClick={handleGenerate} loading={generating} className="w-full mt-3">Generate PPTX from Word</Button>
        </motion.div>
      )}
    </div>
  );
}

function GenerateFromResearch({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) { addNotification('Please enter research content', 'warning'); return; }
    setGenerating(true); setProgress(20);
    try {
      await new Promise((r) => setTimeout(r, 300)); setProgress(40);
      const lines = content.split('\n').filter((l) => l.trim());
      const sections: { title: string; bullets: string[] }[] = [];
      let current: { title: string; bullets: string[] } | null = null;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^(#+\s|^[A-Z][A-Za-z\s]+:$)/) || (trimmed.length < 60 && trimmed === trimmed.toUpperCase() && trimmed.length > 3)) {
          if (current) sections.push(current);
          current = { title: trimmed.replace(/^#+\s*/, '').replace(/:$/, ''), bullets: [] };
        } else if (current) {
          current.bullets.push(trimmed.replace(/^[-*]\s*/, ''));
        }
      }
      if (current) sections.push(current);
      if (sections.length === 0) {
        content.split('\n\n').filter((s) => s.trim()).forEach((block) => {
          const bl = block.split('\n').filter((l) => l.trim());
          if (bl.length > 0) sections.push({ title: bl[0].replace(/^#+\s*/, '').trim(), bullets: bl.slice(1).map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean) });
        });
      }
      if (sections.length === 0) sections.push({ title: 'Research Summary', bullets: lines.slice(0, 20).map((l) => l.trim()) });
      setProgress(70);
      const pptx = buildPptx(sections, themeColor, font); setProgress(90);
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'research-presentation.pptx');
      setProgress(100); addNotification('Research presentation generated!', 'success');
    } catch { addNotification('Error generating presentation', 'error'); }
    finally { setGenerating(false); setTimeout(() => setProgress(0), 2000); }
  }, [content, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <TextArea label="Paste your research content" placeholder="Paste research notes, article text, or structured content here. The tool will automatically organize it into slides." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[300px]" />
      {progress > 0 && <ProgressBar value={progress} color="gradient" showLabel />}
      <Button onClick={handleGenerate} loading={generating} disabled={!content.trim()} className="w-full">Generate Research Presentation</Button>
    </div>
  );
}

function ExtractPptTextTool() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [slideCount, setSlideCount] = useState(0);

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setProcessing(true);
    try {
      const result = await extractPptxText(files[0].data as ArrayBuffer);
      setExtractedText(result.text); setSlideCount(result.count);
      addNotification(`Text extracted from ${result.count} slides`, 'success');
    } catch { addNotification('Error reading PPTX file', 'error'); }
    finally { setProcessing(false); }
  }, [addNotification]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(extractedText);
    addNotification('Text copied to clipboard', 'success');
  }, [extractedText, addNotification]);

  const handleDownload = useCallback(() => {
    saveAs(new Blob([extractedText], { type: 'text/plain' }), 'extracted-text.txt');
    addNotification('Text file downloaded', 'success');
  }, [extractedText, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['.pptx']} onFilesSelected={handleFile} label="Upload PPTX file to extract text" description="Text will be extracted from all slides" />
      {processing && <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}
      {extractedText && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <Badge variant="info">{slideCount} slides extracted</Badge>
          <TextArea label="Extracted text" value={extractedText} readOnly className="min-h-[250px]" />
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="secondary" className="flex-1">Copy Text</Button>
            <Button onClick={handleDownload} variant="secondary" className="flex-1">Download TXT</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ConvertPptToPdf() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setProcessing(true); setProgress(20);
    try {
      const result = await extractPptxText(files[0].data as ArrayBuffer);
      setExtractedText(result.text); setProgress(70);
      addNotification('Text extracted. Ready to convert.', 'success');
    } catch { addNotification('Error reading PPTX', 'error'); }
    finally { setProcessing(false); setTimeout(() => setProgress(0), 500); }
  }, [addNotification]);

  const handleConvert = useCallback(async () => {
    if (!extractedText.trim()) return;
    setConverting(true); setProgress(75);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont('Helvetica');
      const pw = 612, ph = 792, margin = 50, maxW = pw - margin * 2;
      const sections = extractedText.split(/\n\n+/).filter((s) => s.trim());
      setProgress(85);
      for (const section of sections) {
        const lines = section.split('\n').filter((l) => l.trim());
        const title = lines[0]?.trim() || '';
        const body = lines.slice(1).join('\n');
        const page = pdfDoc.addPage([pw, ph]);
        let y = ph - margin;
        if (title) { page.drawText(title, { x: (pw - font.widthOfTextAtSize(title, 24)) / 2, y, size: 24, font }); y -= 40; }
        for (const line of body.split('\n')) {
          if (y < margin) break;
          const words = line.split(' ');
          let cur = '';
          for (const w of words) {
            const test = cur ? `${cur} ${w}` : w;
            if (font.widthOfTextAtSize(test, 12) > maxW && cur) { page.drawText(cur, { x: margin, y, size: 12, font }); y -= 18; cur = w; } else { cur = test; }
          }
          if (cur) { page.drawText(cur, { x: margin, y, size: 12, font }); y -= 18; }
        }
      }
      setProgress(95);
      const pdfBytes = await pdfDoc.save();
      saveAs(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }), 'converted-from-pptx.pdf');
      setProgress(100); addNotification('PDF generated successfully!', 'success');
    } catch { addNotification('Error converting to PDF', 'error'); }
    finally { setConverting(false); setTimeout(() => setProgress(0), 2000); }
  }, [extractedText, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['.pptx']} onFilesSelected={handleFile} label="Upload PPTX to convert to PDF" />
      {processing && <ProgressBar value={progress} color="primary" label="Extracting text..." showLabel />}
      {extractedText && (
        <>
          {converting && <ProgressBar value={progress} color="gradient" label="Creating PDF..." showLabel />}
          <Button onClick={handleConvert} loading={converting} disabled={!extractedText.trim()} className="w-full">Convert to PDF</Button>
        </>
      )}
    </div>
  );
}

function ImproveSlideDesign({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [content, setContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setProcessing(true);
    try {
      const result = await extractPptxText(files[0].data as ArrayBuffer);
      setContent(result.text); addNotification('Text extracted. Edit and improve.', 'success');
    } catch { addNotification('Error reading PPTX', 'error'); }
    finally { setProcessing(false); }
  }, [addNotification]);

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) { addNotification('No content to improve', 'warning'); return; }
    setGenerating(true);
    try {
      const sections = parseSections(content).map((s) => ({
        ...s,
        bullets: s.bullets.map((b) => b.length > 60 ? b.split(' ').reduce((acc: string[], word: string, i: number) => { if (i === Math.ceil(b.split(' ').length / 2)) acc.push(' - ' + word); else acc.push((acc.pop() || '') + ' ' + word); return acc; }, []).join('') : b),
      }));
      const pptx = buildPptx(sections, themeColor, font);
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'improved-presentation.pptx');
      addNotification('Improved presentation generated!', 'success');
    } catch { addNotification('Error generating presentation', 'error'); }
    finally { setGenerating(false); }
  }, [content, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['.pptx']} onFilesSelected={handleFile} label="Upload existing PPTX to improve" description="Or paste content below" />
      {processing && <ProgressBar value={50} color="primary" label="Reading file..." showLabel />}
      <TextArea label="Content (edit to improve)" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[250px]" placeholder="Paste or edit your slide content here..." />
      <Button onClick={handleGenerate} loading={generating} disabled={!content.trim()} className="w-full">Generate Improved Presentation</Button>
    </div>
  );
}

function AddImagesToSlides({ themeColor, font }: { themeColor: string; font: string }) {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ name: string; data: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const inputRef = useCallback((node: HTMLInputElement | null) => { if (node) (globalThis as Record<string, unknown>)._imgInput = node; }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, { name: file.name, data: reader.result as string }]);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!content.trim()) { addNotification('Please enter slide content', 'warning'); return; }
    setGenerating(true);
    try {
      const sections = parseSections(content);
      const pptx = new PptxGenJS();
      pptx.author = 'Morven Student';
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
            slide.addText(section.bullets.map((b) => ({ text: b, options: { bullet: { code: '2022' }, fontSize: 16, fontFace: font, color: '333333', breakType: 'none' as const, paraSpaceAfter: 8 } })), { x: 0.8, y: 1.3, w: '84%', h: 4, valign: 'top' });
          }
        }
        if (i < images.length) {
          slide.addImage({ data: images[i].data, x: 6.5, y: 0.5, w: 3, h: 3 });
        }
      });
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'presentation-with-images.pptx');
      addNotification('Presentation with images generated!', 'success');
    } catch { addNotification('Error generating presentation', 'error'); }
    finally { setGenerating(false); }
  }, [content, images, themeColor, font, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <TextArea label="Slide content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[200px]" placeholder={"Title slide\n\nBullet point 1\nBullet point 2\n\nSecond slide\n\nMore content"} />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Images</label>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
        <Button variant="secondary" onClick={() => { const el = (globalThis as Record<string, unknown>)._imgInput; if (el instanceof HTMLInputElement) el.click(); }} className="w-full">Add Images</Button>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative group">
                <img src={img.data} alt={img.name} className="w-full h-20 object-cover rounded-lg" />
                <button onClick={() => setImages((p) => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">x</button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Button onClick={handleGenerate} loading={generating} disabled={!content.trim()} className="w-full">Generate Presentation with Images</Button>
    </div>
  );
}

function GenerateSpeakerNotesTool() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const [content, setContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<{ title: string; text: string; notes: string }[]>([]);

  const handleFile = useCallback(async (files: { file: File; data: ArrayBuffer | string }[]) => {
    if (!files.length) return;
    setProcessing(true);
    try {
      const result = await extractPptxText(files[0].data as ArrayBuffer);
      const extracted = parseSections(result.text).map((s) => ({
        title: s.title, text: s.bullets.join('\n'), notes: '',
      }));
      setSlides(extracted);
      addNotification(`Extracted ${extracted.length} slides. Generate notes below.`, 'success');
    } catch { addNotification('Error reading PPTX', 'error'); }
    finally { setProcessing(false); }
  }, [addNotification]);

  const handleGenerateNotes = useCallback(() => {
    const sections = content.trim() ? parseSections(content) : slides.map((s) => ({ title: s.title, bullets: s.text.split('\n') }));
    setSlides(sections.map((s) => ({
      title: s.title, text: s.bullets.join('\n'),
      notes: `Opening: "${s.title}". Key points: ${s.bullets.length > 0 ? s.bullets.slice(0, 3).join(', ') : 'main topic'}. Time: ~${Math.max(1, Math.ceil(s.bullets.length / 3))} min. Engagement: ask questions about ${s.title}.`,
    })));
    addNotification('Speaker notes generated!', 'success');
  }, [content, slides, addNotification]);

  const handleGenerate = useCallback(async () => {
    if (!slides.length) { addNotification('No slides to export', 'warning'); return; }
    setGenerating(true);
    try {
      const pptx = new PptxGenJS();
      slides.forEach((s) => {
        const slide = pptx.addSlide();
        slide.addText(s.title, { x: 0.5, y: 0.3, w: '90%', fontSize: 24, bold: true, color: '333333' });
        slide.addText(s.text || '', { x: 0.5, y: 1.2, w: '90%', fontSize: 14, color: '666666' });
        slide.addNotes(s.notes);
      });
      const blob = await pptx.write({ outputType: 'blob' });
      saveAs(blob as Blob, 'presentation-with-notes.pptx');
      addNotification('Presentation with speaker notes generated!', 'success');
    } catch { addNotification('Error generating presentation', 'error'); }
    finally { setGenerating(false); }
  }, [slides, addNotification]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload accept={['.pptx']} onFilesSelected={handleFile} label="Upload PPTX to add speaker notes" description="Or paste content below" />
      {processing && <ProgressBar value={50} color="primary" label="Reading file..." showLabel />}
      <TextArea label="Or paste content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[200px]" placeholder="Paste slide content here..." />
      {(content.trim() || slides.length > 0) && <Button onClick={handleGenerateNotes} variant="secondary" className="w-full">Generate Speaker Notes</Button>}
      {slides.length > 0 && (
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card padding="sm">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">Slide {i + 1}: {slide.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{slide.text}</p>
                {slide.notes && <p className="text-sm text-primary-600 dark:text-primary-400 mt-2 italic">{slide.notes}</p>}
              </Card>
            </motion.div>
          ))}
          <Button onClick={handleGenerate} loading={generating} className="w-full">Download Presentation with Notes</Button>
        </div>
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
  'protect-ppt',
  'unlock-ppt',
  'number-slides',
];

const THEME_TOOL_IDS: OldToolId[] = [
  'ppt-from-text',
  'ppt-from-pdf',
  'ppt-from-word',
  'ppt-from-research',
  'improve-slide-design',
  'add-images-slides',
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
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = err instanceof Error ? err.message : 'Failed to generate presentation';
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
          onDownload={() => saveAs(result.blob, result.name)}
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
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = err instanceof Error ? err.message : 'Failed to convert PDF to presentation';
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
          onDownload={() => saveAs(result.blob, result.name)}
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
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = err instanceof Error ? err.message : 'Failed to merge presentations';
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
          onDownload={() => saveAs(result.blob, result.name)}
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
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = err instanceof Error ? err.message : 'Failed to split presentation';
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
          onDownload={() => saveAs(result.blob, result.name)}
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

function UnlockPptTool() {
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
    if (!password) { addNotification(t('Enter the current password', 'Enter the current password'), 'warning'); return; }
    start();
  }, [hasFile, password, addNotification, t, start]);

  return (
    <div className="space-y-4" dir={direction}>
      <FileUpload
        accept={['.pptx', '.ppt']}
        onFilesSelected={handleFile}
        onFileRemove={handleRemove}
        label={t('Upload a presentation to unlock', 'Upload a presentation to unlock')}
      />
      {hasFile && !done && (
        <Input
          label={t('Enter Current Password', 'Enter Current Password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('Enter password...', 'Enter password...')}
        />
      )}
      {processing && <ProgressBar value={progress} color="gradient" label={t('Unlocking presentation...', 'Unlocking presentation...')} showLabel />}
      {!done && hasFile && (
        <Button onClick={handleProcess} loading={processing} className="w-full">{t('Process', 'Process')}</Button>
      )}
      {done && <PlaceholderResult fileName="unlocked-presentation.pptx" onReset={() => { setHasFile(false); setPassword(''); reset(); }} />}
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
      addNotification(t('Processing Complete', 'Processing Complete'), 'success');
    } catch (err) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProcessing(false);
      setDone(false);
      const msg = err instanceof Error ? err.message : 'Failed to add slide numbers';
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
          onDownload={() => saveAs(result.blob, result.name)}
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
  'ppt-from-word': {
    title: 'Generate PPT from Word', description: 'Convert Word documents into presentations',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>,
  },
  'ppt-from-research': {
    title: 'Generate PPT from Research', description: 'Structure research content into slides',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  'extract-ppt-text': {
    title: 'Extract PPT Text', description: 'Extract all text from a PowerPoint file',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  },
  'convert-ppt-pdf': {
    title: 'Convert PPT to PDF', description: 'Convert PowerPoint presentations to PDF',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  },
  'improve-slide-design': {
    title: 'Improve Slide Design', description: 'Enhance the design and layout of your slides',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  },
  'add-images-slides': {
    title: 'Add Images to Slides', description: 'Add images to your presentation slides',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  },
  'generate-speaker-notes': {
    title: 'Generate Speaker Notes', description: 'Auto-generate speaker notes for slides',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
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
    'unlock-ppt': {
      title: t('Unlock PowerPoint', 'Unlock PowerPoint'),
      description: t('Remove password protection from your presentation', 'Remove password protection from your presentation'),
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
    'ppt-from-word': <GenerateFromWord themeColor={themeColor} font={font} />,
    'ppt-from-research': <GenerateFromResearch themeColor={themeColor} font={font} />,
    'extract-ppt-text': <ExtractPptTextTool />,
    'convert-ppt-pdf': <ConvertPptToPdf />,
    'improve-slide-design': <ImproveSlideDesign themeColor={themeColor} font={font} />,
    'add-images-slides': <AddImagesToSlides themeColor={themeColor} font={font} />,
    'generate-speaker-notes': <GenerateSpeakerNotesTool />,
    'generate-ppt-text': <GeneratePptFromTextTool />,
    'generate-ppt-pdf': <GeneratePptFromPdfTool />,
    'merge-ppt': <MergePptTool />,
    'split-ppt': <SplitPptTool />,
    'compress-ppt': <CompressPptTool />,
    'protect-ppt': <ProtectPptTool />,
    'unlock-ppt': <UnlockPptTool />,
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
