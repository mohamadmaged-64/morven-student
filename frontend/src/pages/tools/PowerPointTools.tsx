import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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

type ToolId =
  | 'ppt-from-text'
  | 'ppt-from-pdf'
  | 'ppt-from-word'
  | 'ppt-from-research'
  | 'extract-ppt-text'
  | 'convert-ppt-pdf'
  | 'improve-slide-design'
  | 'add-images-slides'
  | 'generate-speaker-notes';

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

const TOOL_CONFIGS: Record<ToolId, { title: string; description: string; icon: JSX.Element }> = {
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
  const  navigate  = useNavigate();
  const { direction } = useLanguageStore();
  const [themeColor, setThemeColor] = useState('0D47A1');
  const [font, setFont] = useState('Arial');
  const config = TOOL_CONFIGS[toolId as ToolId];

  if (!config) {
    return <EmptyState icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>} title="Tool not found" description="The requested PowerPoint tool could not be found." />;
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
          {direction === 'rtl'
            ? 'العودة لأدوات PowerPoint'
            : 'Back to PowerPoint Tools'}
        </span>
      </button>
          <ThemeOptions themeColor={themeColor} setThemeColor={setThemeColor} font={font} setFont={setFont} />
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{toolComponents[toolId as ToolId]}</Card>
      </motion.div>
    </div>
  );
}

export default PowerPointToolPage;
