import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';
import { v4 as uuid } from 'uuid';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import { Input, TextArea, Select } from '@/components/UI/Input';
import { FileUpload } from '@/components/UI/FileUpload';
import { EmptyState } from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { Spinner } from '@/components/UI/Loading';
import { ProgressBar } from '@/components/UI/ProgressBar';
import { Modal } from '@/components/UI/Modal';
import { useAppStore } from '@/store/useAppStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useNavigate } from 'react-router-dom';
import {
  fileToArrayBuffer,
  fileToDataURL,
  downloadBlob,
  formatFileSize,
  getFileExtension,
  createFileItem,
  mergePDFs,
  splitPDF,
  deletePDFPages,
  rotatePDFPages,
  reorderPDFPages,
  passwordProtectPDF,
  removePDFPassword,
  addWatermarkPDF,
  compressPDF,
  extractPDFImages,
  ocrPDF,
  comparePDFs,
  addSignaturePDF,
} from '@/utils/file';

import {
  FileText,
  File,
  FileSpreadsheet,
  Presentation,
  Files,
  Scissors,
  Archive,
  Trash2,
  ArrowUpDown,
  RotateCw,
  Lock,
  LockOpen,
  Droplets,
  PenTool,
  Image,
  ScanSearch,
  ArrowLeft,
  Scale,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';


// ─── Tool Configuration ─────────────────────────────────────────────

interface ToolConfig {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: LucideIcon;
  accepts: string[];
  multiple?: boolean;
  maxFiles?: number;
  category: string;
  section: string;
}

const TOOLS: Record<string, ToolConfig> = {
 
  'word-to-pdf': {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    nameAr: 'Word إلى PDF',
    description: 'Convert Word documents to PDF format',
    descriptionAr: 'تحويل مستندات Word إلى تنسيق PDF',
    icon: File,
    accepts: ['.docx', '.doc'],
    category: 'conversion',
    section: 'pdf',
  },
  'excel-to-pdf': {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    nameAr: 'Excel إلى PDF',
    description: 'Convert Excel spreadsheets to PDF format',
    descriptionAr: 'تحويل جداول Excel إلى تنسيق PDF',
    icon: FileSpreadsheet,
    accepts: ['.xlsx', '.xls', '.csv'],
    category: 'conversion',
    section: 'pdf',
  },
  'ppt-to-pdf': {
    id: 'ppt-to-pdf',
    name: 'PowerPoint to PDF',
    nameAr: 'PowerPoint إلى PDF',
    description: 'Convert PowerPoint presentations to PDF',
    descriptionAr: 'تحويل عروض PowerPoint إلى PDF',
    icon: Presentation,
    accepts: ['.pptx', '.ppt'],
    category: 'conversion',
    section: 'pdf',
  },
  'merge-pdfs': {
    id: 'merge-pdfs',
    name: 'Merge PDFs',
    nameAr: 'دمج ملفات PDF',
    description: 'Combine multiple PDF files into one document',
    descriptionAr: 'دمج ملفات PDF متعددة في مستند واحد',
    icon: Files,
    accepts: ['.pdf'],
    multiple: true,
    maxFiles: 20,
    category: 'pdf',
    section: 'pdf',
  },
  'split-pdf': {
    id: 'split-pdf',
    name: 'Split PDF',
    nameAr: 'تقسيم PDF',
    description: 'Extract specific pages from a PDF document',
    descriptionAr: 'استخراج صفحات محددة من مستند PDF',
    icon: Scissors,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'compress-pdf': {
    id: 'compress-pdf',
    name: 'Compress PDF',
    nameAr: 'ضغط PDF',
    description: 'Reduce PDF file size while maintaining quality',
    descriptionAr: 'تقليل حجم ملف PDF مع الحفاظ على الجودة',
    icon: Archive,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'delete-pages': {
    id: 'delete-pages',
    name: 'Delete PDF Pages',
    nameAr: 'حذف صفحات PDF',
    description: 'Remove unwanted pages from a PDF document',
    descriptionAr: 'إزالة الصفحات غير المرغوب فيها من مستند PDF',
    icon: Trash2,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'reorder-pages': {
    id: 'reorder-pages',
    name: 'Reorder PDF Pages',
    nameAr: 'إعادة ترتيب صفحات PDF',
    description: 'Change the order of pages in a PDF document',
    descriptionAr: 'تغيير ترتيب الصفحات في مستند PDF',
    icon: ArrowUpDown,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'rotate-pages': {
    id: 'rotate-pages',
    name: 'Rotate PDF Pages',
    nameAr: 'تدوير صفحات PDF',
    description: 'Rotate specific pages in a PDF document',
    descriptionAr: 'تدوير صفحات محددة في مستند PDF',
    icon: RotateCw,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'password-protect': {
    id: 'password-protect',
    name: 'Password Protect PDF',
    nameAr: 'حماية PDF بكلمة مرور',
    description: 'Add password protection to a PDF document',
    descriptionAr: 'إضافة حماية بكلمة مرور لمستند PDF',
    icon: Lock,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'remove-password': {
    id: 'remove-password',
    name: 'Remove PDF Password',
    nameAr: 'إزالة كلمة مرور PDF',
    description: 'Remove password protection from a PDF',
    descriptionAr: 'إزالة الحماية بكلمة مرور من ملف PDF',
    icon: LockOpen,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'add-watermark': {
    id: 'add-watermark',
    name: 'Add Watermark',
    nameAr: 'إضافة علامة مائية',
    description: 'Add a text watermark to all pages of a PDF',
    descriptionAr: 'إضافة علامة مائية نصية لجميع صفحات PDF',
    icon: Droplets,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'add-signature': {
    id: 'add-signature',
    name: 'Add Signature',
    nameAr: 'إضافة توقيع',
    description: 'Draw and place a signature on a PDF page',
    descriptionAr: 'رسم ووضع توقيع على صفحة PDF',
    icon: PenTool,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'extract-images': {
    id: 'extract-images',
    name: 'Extract Images',
    nameAr: 'استخراج الصور',
    description: 'Extract all images from a PDF document',
    descriptionAr: 'استخراج جميع الصور من مستند PDF',
    icon: Image,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'ocr': {
    id: 'ocr',
    name: 'OCR - Text Recognition',
    nameAr: 'OCR - التعرف على النص',
    description: 'Extract text from scanned PDFs using OCR',
    descriptionAr: 'استخراج النص من PDFات الممسوحة باستخدام OCR',
    icon: ScanSearch,
    accepts: ['.pdf'],
    category: 'pdf',
    section: 'pdf',
  },
  'compare-pdfs': {
    id: 'compare-pdfs',
    name: 'Compare PDFs',
    nameAr: 'مقارنة ملفات PDF',
    description: 'Compare two PDF documents and find differences',
    descriptionAr: 'مقارنة مستندين PDF وإيجاد الفروقات',
    icon: Scale,
    accepts: ['.pdf'],
    multiple: true,
    maxFiles: 2,
    category: 'pdf',
    section: 'pdf',
  },
};

// ─── Types ──────────────────────────────────────────────────────────

type ProcessState = 'idle' | 'processing' | 'done' | 'error';

interface UploadedFileData {
  file: File;
  data: ArrayBuffer | string;
}

// ─── Utility Sub-Components ─────────────────────────────────────────
 
function ToolHeader({ tool, isDark, isRtl }: { tool: ToolConfig; isDark: boolean; isRtl: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Icon = tool.icon;
  return (
    <>
<button
  onClick={() => navigate('/category/pdf')}
  className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
>
  <svg
    className={`w-5 h-5 transition-transform ${
      isRtl ? 'rotate-180' : ''
    } group-hover:-translate-x-1`}
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
    {isRtl ? 'العودة لأدوات الPDF' : 'Back to PDF Tools'}
  </span>
</button>
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center gap-4 mb-3">
       <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
  <Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
</div>
        <div className={isRtl ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isRtl ? tool.nameAr : tool.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isRtl ? tool.descriptionAr : tool.description}
          </p>
        </div>
      </div>
    </motion.div>
    </>
  );
}

function ProcessingOverlay({ progress, message }: { progress: number; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Card className="w-full max-w-sm mx-4 p-8 text-center">
        <Spinner size={40} className="mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {message}
        </p>
        {progress > 0 && <ProgressBar value={progress} color="gradient" showLabel />}
      </Card>
    </motion.div>
  );
}

function SuccessResult({
  result,
  toolName,
  originalSize,
  onReset,
  isDark,
  isRtl,
}: {
  result: Blob | string;
  toolName: string;
  originalSize?: number;
  onReset: () => void;
  isDark: boolean;
  isRtl: boolean;
}) {
  const { t } = useTranslation();
  const isText = typeof result === 'string';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (isText) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
    >
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('Processing Complete', 'Processing Complete')}
            </h3>
            {!isText && result instanceof Blob && originalSize && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(originalSize)} → {formatFileSize(result.size)}
                {originalSize > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 ms-1">
                    ({Math.round((1 - result.size / originalSize) * 100)}% reduced)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {isText && (
          <div className="mb-4 max-h-64 overflow-auto rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-surface p-4">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {result}
            </pre>
          </div>
        )}

        <div className="flex gap-2">
          {!isText && result instanceof Blob && (
          <Button
  variant="primary"
  onClick={() => downloadBlob(result, toolName + '.pdf')}
  icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              {t('Download', 'Download')}
            </Button>
          )}
          {isText && (
            <Button
              variant="primary"
              onClick={() => {
                const blob = new Blob([result], { type: 'text/plain' });
                downloadBlob(blob, toolName + '.txt', 'text/plain');
              }}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              {t('Download TXT', 'Download TXT')}
            </Button>
          )}
          {isText && (
            <Button
              variant="secondary"
              onClick={handleCopy}
              icon={
                copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )
              }
            >
              {copied ? t('Copied!', 'Copied!') : t('Copy Text', 'Copy Text')}
            </Button>
          )}
          <Button variant="ghost" onClick={onReset}>
            {t('Start Over', 'Start Over')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── PDF Page Thumbnails ────────────────────────────────────────────

function PDFPageThumbnails({
  file,
  selectedPages,
  onTogglePage,
  selectMode,
}: {
  file: File;
  selectedPages: number[];
  onTogglePage: (page: number) => void;
  selectMode: 'single' | 'multiple' | 'exclusive';
}) {
  const [pages, setPages] = useState<number[]>([]);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const pdfjsLib = await import('pdfjs-dist');
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      if (cancelled) return;
      const indices = Array.from({ length: pdf.numPages }, (_, i) => i);
      setPages(indices);

      for (const idx of indices) {
        if (cancelled) return;
        const page = await pdf.getPage(idx + 1);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport })
          .promise;
        if (!cancelled) {
          setThumbnails((prev) => new Map(prev).set(idx, canvas.toDataURL()));
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [file]);

  return (
    <div ref={containerRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-4">
      {pages.map((idx) => {
        const isSelected = selectedPages.includes(idx);
        return (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTogglePage(idx)}
            className={[
              'relative rounded-xl border-2 overflow-hidden transition-all',
              isSelected
                ? 'border-primary-500 ring-2 ring-primary-500/30 shadow-md'
                : 'border-light-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600',
            ].join(' ')}
          >
            {thumbnails.get(idx) ? (
              <img
                src={thumbnails.get(idx)}
                alt={`Page ${idx + 1}`}
                className="w-full aspect-[1/1.41] object-contain bg-white"
              />
            ) : (
              <div className="w-full aspect-[1/1.41] bg-gray-100 dark:bg-dark-surface flex items-center justify-center">
                <Spinner size={16} />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5 font-medium">
              {idx + 1}
            </div>
            {isSelected && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Signature Canvas ───────────────────────────────────────────────

function SignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const { theme } = useThemeStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = theme === 'dark' ? '#ffffff' : '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [theme]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const handleUp = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        className="w-full rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-600 cursor-crosshair bg-white dark:bg-dark-surface"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={save}>
          Save Signature
        </Button>
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Compare Result ─────────────────────────────────────────────────

function CompareResult({
  result,
  isRtl,
}: {
  result: { match: boolean; differences: string[] };
  isRtl: boolean;
}) {
  return (
    <Card className="p-6 mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            result.match
              ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : 'bg-amber-100 dark:bg-amber-900/30'
          }`}
        >
          {result.match ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {result.match ? 'Documents Match' : 'Differences Found'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {result.differences.length} {result.differences.length === 1 ? 'difference' : 'differences'} found
          </p>
        </div>
      </div>

      {result.differences.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-auto">
          {result.differences.map((diff, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30"
            >
              <span className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">•</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">{diff}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Main Page Component ────────────────────────────────────────────

type Step = 'upload' | 'configure' | 'result';

export default function PdfToolPage({ toolId: propToolId }: { toolId?: string }) {
  const navigate = useNavigate();
  const { toolId: routeToolId } = useParams<{ toolId: string }>();
  const toolId = propToolId || routeToolId || '';
  const tool = TOOLS[toolId];

  const { t } = useTranslation();
  const { addNotification, addFile } = useAppStore();
  const { theme } = useThemeStore();
  const { direction } = useLanguageStore();
  const isDark = theme === 'dark';
  const isRtl = direction === 'rtl';

  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<UploadedFileData[]>([]);
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | string | null>(null);
  const [compareResult, setCompareResult] = useState<{ match: boolean; differences: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tool-specific state
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [rotationDegrees, setRotationDegrees] = useState<number>(90);
  const [password, setPassword] = useState('');
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkFontSize, setWatermarkFontSize] = useState(50);
  const [watermarkColor, setWatermarkColor] = useState('#888888');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  const [ocrLang, setOcrLang] = useState('eng');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [sigPage, setSigPage] = useState(0);
  const [sigX, setSigX] = useState(100);
  const [sigY, setSigY] = useState(100);
  const [sigWidth, setSigWidth] = useState(150);
  const [sigHeight, setSigHeight] = useState(60);

  const reset = useCallback(() => {
    setStep('upload');
    setFiles([]);
    setProcessState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
    setCompareResult(null);
    setSelectedPages([]);
    setPageOrder([]);
    setPassword('');
    setWatermarkText('');
    setShowSignaturePad(false);
    setSignatureData('');
  }, []);

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <EmptyState
          title={t('Tool Not Found', 'Tool Not Found')}
          description={t('The requested tool could not be found.', 'The requested tool could not be found.')}
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
      </div>
    );
  }

  const onFilesSelected = (selected: { file: File; data: ArrayBuffer | string }[]) => {
    setFiles(selected);
    if (
      tool.id === 'merge-pdfs' ||
      tool.id === 'compare-pdfs' ||
      tool.multiple
    ) {
      setStep('configure');
    } else {
      setStep('configure');
    }
  };

  const handleRemoveFile = (_id: string) => {
    setFiles((prev) => prev.filter((_, i) => i !== 0));
  };

  const processFile = async () => {
    if (files.length === 0) return;
    setProcessState('processing');
    setProgress(10);
    setError(null);

    try {
      let output: Blob | string;
      const firstFile = files[0].file;

      switch (tool.id) {
        

        case 'merge-pdfs': {
          if (files.length < 2) throw new Error('At least 2 files required');
          setProgress(20);
          const blobs = files.map((f) => f.file);
          setProgress(50);
          output = await mergePDFs(blobs);
          break;
        }

        case 'split-pdf':
          setProgress(30);
          if (selectedPages.length === 0) throw new Error('Select at least one page');
          output = await splitPDF(firstFile, selectedPages);
          break;

        case 'compress-pdf':
          setProgress(20);
          output = await compressPDF(firstFile);
          break;

        case 'delete-pages':
          setProgress(30);
          if (selectedPages.length === 0) throw new Error('Select pages to delete');
          output = await deletePDFPages(firstFile, selectedPages);
          break;

        case 'reorder-pages':
          setProgress(30);
          output = await reorderPDFPages(firstFile, pageOrder.length > 0 ? pageOrder : undefined as unknown as number[]);
          break;

        case 'rotate-pages':
          setProgress(30);
          if (selectedPages.length === 0) throw new Error('Select pages to rotate');
          output = await rotatePDFPages(firstFile, selectedPages, rotationDegrees);
          break;

        case 'password-protect':
          setProgress(20);
          if (!password) throw new Error('Enter a password');
          output = await passwordProtectPDF(firstFile, password);
          break;

        case 'remove-password':
          setProgress(20);
          if (!password) throw new Error('Enter the current password');
          output = await removePDFPassword(firstFile, password);
          break;

        case 'add-watermark':
          setProgress(20);
          if (!watermarkText) throw new Error('Enter watermark text');
          output = await addWatermarkPDF(firstFile, watermarkText, {
            fontSize: watermarkFontSize,
            color: watermarkColor,
            opacity: watermarkOpacity,
            rotation: watermarkRotation,
          });
          break;

        case 'add-signature':
          setProgress(30);
          if (!signatureData) throw new Error('Draw a signature first');
          output = await addSignaturePDF(firstFile, signatureData, sigPage, sigX, sigY, sigWidth, sigHeight);
          break;

        case 'extract-images': {
          setProgress(20);
          const images = await extractPDFImages(firstFile);
          setProgress(80);
          if (images.length === 0) throw new Error('No images found in the PDF');
          const zip = new JSZip();
          images.forEach((img, i) => {
            zip.file(`image_${i + 1}.png`, img);
          });
          output = await zip.generateAsync({ type: 'blob' });
          break;
        }

        case 'ocr':
        case 'scan-to-text':
          setProgress(10);
          output = await ocrPDF(firstFile, ocrLang);
          break;

        case 'compare-pdfs':
          setProgress(20);
          if (files.length < 2) throw new Error('Upload exactly 2 PDFs');
          const comparison = await comparePDFs(files[0].file, files[1].file);
          setCompareResult(comparison);
          setProcessState('done');
          addNotification(t('Comparison complete', 'Comparison complete'), 'success');
          return;
        case 'word-to-pdf':
        case 'excel-to-pdf':
        case 'ppt-to-pdf':
        throw new Error('This tool is cooming soon. Please check back later.');
        default:
          throw new Error('Unknown tool');
      }

      setProgress(100);
      setResult(output);
      setProcessState('done');

      const fileItem = createFileItem(
        firstFile,
        output instanceof Blob ? await output.arrayBuffer() : output,
        tool.id,
      );
      addFile(fileItem);
      addNotification(
        t('Processing complete', 'Processing complete'),
        'success',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      setProcessState('error');
      addNotification(msg, 'error');
    }
  };

  const handleTogglePage = (page: number) => {
    if (tool.id === 'split-pdf' || tool.id === 'delete-pages' || tool.id === 'rotate-pages') {
      setSelectedPages((prev) =>
        prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page],
      );
    }
  };

  const getFileAccept = () => tool.accepts.join(',');

  const toolNameForDownload = tool.name.replace(/\s+/g, '_').toLowerCase();

  return (
    <div className={`min-h-screen bg-light-bg dark:bg-dark-bg ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ToolHeader tool={tool} isDark={isDark} isRtl={isRtl} />

        <AnimatePresence mode="wait">
          {/* Upload Step */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-6">
                <FileUpload
                  accept={tool.accepts}
                  multiple={tool.multiple || false}
                  maxFiles={tool.maxFiles || 10}
                  onFilesSelected={onFilesSelected}
                  onFileRemove={handleRemoveFile}
                  label={t('fileUpload.dropLabel', 'Drop files here or click to browse')}
                  description={tool.accepts.map((a) => a.toUpperCase()).join(', ')}
                />
              </Card>
            </motion.div>
          )}

          {/* Configure / Process Step */}
          {step === 'configure' && processState !== 'done' && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* File Summary */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {files.map((f) => f.file.name).join(', ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {files.length} {files.length === 1 ? 'file' : 'files'} ·{' '}
                      {formatFileSize(files.reduce((sum, f) => sum + f.file.size, 0))}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setFiles([]); }}>
                    {t('Change', 'Change')}
                  </Button>
                </div>
              </Card>

              {/* Tool-specific Options */}

              {/* Password Protect / Remove Password */}
              {(tool.id === 'password-protect' || tool.id === 'remove-password') && (
                <Card className="p-6">
                  <Input
                    label={tool.id === 'password-protect' ? t('Set Password', 'Set Password') : t('Enter Current Password', 'Enter Current Password')}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('Enter password...', 'Enter password...')}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    }
                  />
                </Card>
              )}

              {/* Watermark */}
              {tool.id === 'add-watermark' && (
                <Card className="p-6 space-y-4">
                  <Input
                    label={t('Watermark Text', 'Watermark Text')}
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder={'e.g. CONFIDENTIAL'}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={t('Font Size', 'Font Size')}
                      type="number"
                      value={watermarkFontSize}
                      onChange={(e) => setWatermarkFontSize(Number(e.target.value))}
                      min={10}
                      max={200}
                    />
                    <Input
                      label={t('Color', 'Color')}
                      type="color"
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                      className="h-[42px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={t('Opacity', 'Opacity')}
                      type="number"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Math.min(1, Math.max(0, Number(e.target.value))))}
                      min={0.05}
                      max={1}
                      step={0.05}
                    />
                    <Input
                      label={t('Rotation (degrees)', 'Rotation (degrees)')}
                      type="number"
                      value={watermarkRotation}
                      onChange={(e) => setWatermarkRotation(Number(e.target.value))}
                      min={-180}
                      max={180}
                    />
                  </div>
                </Card>
              )}

              {/* Add Signature */}
              {tool.id === 'add-signature' && (
                <Card className="p-6 space-y-4">
                  {!showSignaturePad && !signatureData && (
                    <Button variant="primary" onClick={() => setShowSignaturePad(true)}>
                      {t('Draw Signature', 'Draw Signature')}
                    </Button>
                  )}
                  {showSignaturePad && (
                    <SignaturePad
                      onSave={(data) => {
                        setSignatureData(data);
                        setShowSignaturePad(false);
                      }}
                      onCancel={() => setShowSignaturePad(false)}
                    />
                  )}
                  {signatureData && !showSignaturePad && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={signatureData} alt="Signature" className="h-16 rounded-lg border border-light-border dark:border-dark-border bg-white px-2" />
                        <Button variant="ghost" size="sm" onClick={() => { setSignatureData(''); setShowSignaturePad(true); }}>
                          {t('Redraw', 'Redraw')}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input label={t('Page', 'Page')} type="number" value={sigPage} onChange={(e) => setSigPage(Number(e.target.value))} min={0} />
                        <Input label={t('X Position', 'X Position')} type="number" value={sigX} onChange={(e) => setSigX(Number(e.target.value))} min={0} />
                        <Input label={t('Y Position', 'Y Position')} type="number" value={sigY} onChange={(e) => setSigY(Number(e.target.value))} min={0} />
                        <Input label={t('Width', 'Width')} type="number" value={sigWidth} onChange={(e) => setSigWidth(Number(e.target.value))} min={20} />
                        <Input label={t('Height', 'Height')} type="number" value={sigHeight} onChange={(e) => setSigHeight(Number(e.target.value))} min={20} />
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* OCR Language */}
              {(tool.id === 'ocr' || tool.id === 'scan-to-text') && (
                <Card className="p-6">
                  <Select
                    label={t('Language', 'Language')}
                    value={ocrLang}
                    onChange={(e) => setOcrLang(e.target.value)}
                    options={[
                      { value: 'eng', label: 'English' },
                      { value: 'ara', label: 'Arabic' },
                      { value: 'fra', label: 'French' },
                      { value: 'deu', label: 'German' },
                      { value: 'spa', label: 'Spanish' },
                      { value: 'ita', label: 'Italian' },
                      { value: 'por', label: 'Portuguese' },
                      { value: 'rus', label: 'Russian' },
                      { value: 'jpn', label: 'Japanese' },
                      { value: 'chi_sim', label: 'Chinese (Simplified)' },
                      { value: 'kor', label: 'Korean' },
                    ]}
                  />
                </Card>
              )}

              {/* Page Selection Tools */}
              {(tool.id === 'split-pdf' || tool.id === 'delete-pages' || tool.id === 'rotate-pages') && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tool.id === 'split-pdf'
                        ? t('Select pages to extract', 'Select pages to extract')
                        : tool.id === 'delete-pages'
                          ? t('Select pages to delete', 'Select pages to delete')
                          : t('Select pages to rotate', 'Select pages to rotate')}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (files[0]) {
                            import('pdfjs-dist').then((lib) =>
                              files[0].file.arrayBuffer().then((buf) =>
                                lib.getDocument({ data: buf }).promise.then((pdf) => {
                                  const all = Array.from({ length: pdf.numPages }, (_, i) => i);
                                  setSelectedPages(all);
                                }),
                              ),
                            );
                          }
                        }}
                      >
                        {t('Select All', 'Select All')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPages([])}>
                        {t('Clear', 'Clear')}
                      </Button>
                    </div>
                  </div>
                  {files[0] && (
                    <PDFPageThumbnails
                      file={files[0].file}
                      selectedPages={selectedPages}
                      onTogglePage={handleTogglePage}
                      selectMode="multiple"
                    />
                  )}
                </Card>
              )}

              {/* Rotate Angle */}
              {tool.id === 'rotate-pages' && (
                <Card className="p-6">
                  <Select
                    label={t('Rotation Angle', 'Rotation Angle')}
                    value={String(rotationDegrees)}
                    onChange={(e) => setRotationDegrees(Number(e.target.value))}
                    options={[
                      { value: '90', label: '90°' },
                      { value: '180', label: '180°' },
                      { value: '270', label: '270°' },
                    ]}
                  />
                </Card>
              )}

              {/* Compare PDFs extra file upload */}
              {tool.id === 'compare-pdfs' && files.length < 2 && (
                <Card className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('Upload a second PDF to compare', 'Upload a second PDF to compare')}
                  </p>
                  <FileUpload
                    accept={['.pdf']}
                    onFilesSelected={(f) => {
                      if (f.length > 0) {
                        setFiles((prev) => [...prev, f[0]]);
                      }
                    }}
                    maxFiles={1}
                    label={t('Drop second PDF here', 'Drop second PDF here')}
                  />
                </Card>
              )}

              {error && (
                <Card className="p-4 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10">
                  <div className="flex items-center gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={processFile}
                  loading={processState === 'processing'}
                  disabled={files.length === 0}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  }
                >
                  {t('Process', 'Process')}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  {t('Cancel', 'Cancel')}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Result Step */}
          {step === 'configure' && processState === 'done' && (result !== null || compareResult !== null) && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {compareResult ? (
                <>
                  <CompareResult result={compareResult} isRtl={isRtl} />
                  <div className="mt-4">
                    <Button variant="ghost" onClick={reset}>
                      {t('Start Over', 'Start Over')}
                    </Button>
                  </div>
                </>
              ) : result !== null ? (
                <SuccessResult
                  result={result}
                  toolName={toolNameForDownload}
                  originalSize={files[0]?.file.size}
                  onReset={reset}
                  isDark={isDark}
                  isRtl={isRtl}
                />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {processState === 'processing' && (
          <ProcessingOverlay progress={progress} message={t('Processing your files...', 'Processing your files...')} />
        )}
      </AnimatePresence>
    </div>
  );
}
