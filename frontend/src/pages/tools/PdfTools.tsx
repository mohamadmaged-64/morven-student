import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  getPDFPageCount,
  splitPDF,
  createPDFPageGroups,
  parsePDFPageRanges,
  parsePDFPageExpression,
  splitEveryPage,
  splitEveryNPages,
  splitByRanges,
  extractPages,
  deletePDFPages,
  rotatePDFPages,
  reorderPDFPages,
  addWatermarkPDF,
  extractPDFImages,
  ocrPDF,
  comparePDFs,
  addSignaturePDF,
  validatePageExpression,
  validatePageRanges,
  type PDFPageGroup,
} from '@/utils/file';
import { convertToPdf, compressPdf, protectPdf, unlockPdf } from '@/services/conversionApi';
import { isNetworkError } from '@/services/apiError';

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
  Upload,
  FilePlus2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Download,
  CheckCircle2,
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
  

};

// ─── Types ──────────────────────────────────────────────────────────

type ProcessState = 'idle' | 'processing' | 'done' | 'error';

interface UploadedFileData {
  id?: string;
  file: File;
  data: ArrayBuffer | string;
  pageCount?: number;
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
  originalFileName,
}: {
  result: Blob | string;
  toolName: string;
  originalSize?: number;
  onReset: () => void;
  isDark: boolean;
  isRtl: boolean;
  originalFileName?: string;
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
  onClick={() => downloadBlob(result, originalFileName ? originalFileName.replace(/\.[^.]+$/, '') + '.pdf' : toolName + '.pdf')}
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

function MergePdfWorkspace({ files, processing, progress, result, error, onAdd, onMove, onRemove, onMerge, onReset }: { files: UploadedFileData[]; processing: boolean; progress: number; result: Blob | string | null; error: string | null; onAdd: (files: File[]) => void; onMove: (from: number, to: number) => void; onRemove: (index: number) => void; onMerge: () => void; onReset: () => void }) {
  const { t } = useTranslation();
  const [dragged, setDragged] = useState<number | null>(null);
  const totalSize = files.reduce((total, item) => total + item.file.size, 0);
  if (result instanceof Blob) return <Card className="max-w-2xl mx-auto p-6 sm:p-8 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="h-8 w-8" /></div><h2 className="text-xl font-bold text-gray-900 dark:text-white">
  {t('pdf.merge.ready')}
</h2>

<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
  {t('pdf.merge.mergedCount', { count: files.length })}
</p>
<div className="mt-6 flex items-center gap-3 rounded-xl border border-light-border bg-gray-50 p-4 text-left dark:border-dark-border dark:bg-dark-surface"><FileText className="h-5 w-5 text-primary-600" /><div><p className="text-sm font-semibold text-gray-900 dark:text-white">merged-pdfs.pdf</p><p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(result.size)}</p></div></div><div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row"><Button variant="ghost" onClick={onReset}>
  {t('common.startAgain')}
</Button><Button
  variant="primary"
  onClick={() => downloadBlob(result, 'merged-pdfs.pdf')}
  icon={<Download className="h-4 w-4" />}
>
  {t('pdf.merge.download')}
</Button>
</div>
</Card>;
  return <div className="space-y-5"> {files.length > 0 && <Card className="p-4 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-gray-900 dark:text-white">
  {t('pdf.merge.arrange')}
</h2>

<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
  {t('pdf.merge.orderHint')}
</p>
</div>
</div>
<div className="space-y-2">
  {files.map((item, index) => <motion.div key={item.id || item.file.name + index} layout draggable={!processing} onDragStart={() => setDragged(index)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragged !== null && dragged !== index) onMove(dragged, index); setDragged(null); }} className={'flex items-center gap-2 rounded-xl border p-3 sm:gap-3 ' + (dragged === index ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-light-border dark:border-dark-border dark:bg-dark-surface')}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30">{index + 1}</span><GripVertical className="hidden h-4 w-4 text-gray-400 sm:block" /><FileText className="h-6 w-6 shrink-0 text-red-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.file.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(item.file.size)}{item.pageCount ? ' · ' + item.pageCount + ' pages' : ' · Reading pages…'}</p></div><button disabled={index === 0 || processing} onClick={() => onMove(index, index - 1)} className="p-2 text-gray-400 hover:text-primary-600 disabled:opacity-30" aria-label="Move up"><ChevronUp className="h-4 w-4" /></button><button disabled={index === files.length - 1 || processing} onClick={() => onMove(index, index + 1)} className="p-2 text-gray-400 hover:text-primary-600 disabled:opacity-30" aria-label="Move down"><ChevronDown className="h-4 w-4" /></button><button disabled={processing} onClick={() => onRemove(index)} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30" aria-label="Remove file"><Trash2 className="h-4 w-4" /></button></motion.div>)}</div></Card>}
  <Card className="p-0 overflow-hidden">
  <div className="p-6">
    <FileUpload
      accept={['.pdf', 'application/pdf']}
      multiple
      maxFiles={20}
      onFilesSelected={(selected) => onAdd(selected.map((s) => s.file))}
      label={t('fileUpload.dropPdf')}
      description={t('fileUpload.pdfOnly')}
    />
  </div>
</Card>{error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400">{error}</div>}

  {files.length > 0 && (
 <div className="flex items-center gap-3 w-full">
    {processing && (
      <ProgressBar
        value={progress}
        color="gradient"
        size="sm"
        showLabel
        label={t('pdf.merge.merging')}
        className="w-full mb-2"
      />
    )}

    <Button
      variant="primary"
      size="md"
      loading={processing}
      disabled={files.length < 2 || processing}
      onClick={onMerge}
      icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  }
    >
     {processing
 ? t('pdf.merge.mergingButton')
 : t('pdf.merge.mergeButton')}
    </Button>
     <Button variant="ghost" onClick={onReset}>
                  {t('Cancel', 'Cancel')}
                </Button>
  </div>
)}
</div>;
}
type SplitMode = 'every-page' | 'every-n' | 'ranges' | 'extract';

const SPLIT_MODES: [SplitMode, string, string][] = [
  ['every-page', 'Split every page', 'فصل كل صفحة'],
  ['every-n', 'Split every n pages', 'فصل عدد مخصص من الصفحات'],
  ['ranges', 'Split by page ranges', 'فصل حسب نطاق الصفحات'],
  ['extract', 'Extract specific pages', 'استخراج صفحات محددة'],
];
 
function SplitPdfWorkspace({
  file, pageCount, mode, every, ranges, preview,
  processing, progress, status, error, result,
  validationError,
  onFile, onRemove, onMode, onEvery, onRanges, onProcess, onReset,
}: {
  file: UploadedFileData | null;
  pageCount: number;
  mode: SplitMode;
  every: number;
  ranges: string;
  preview: PDFPageGroup[];
  processing: boolean;
  progress: number;
  status: string;
  error: string | null;
  result: { blob: Blob; count: number; pages: number; duration: number } | null;
  validationError: string | null;
  
  onFile: (file: File) => void;
  onRemove: () => void;
  onMode: (mode: SplitMode) => void;
  onEvery: (value: number) => void;
  onRanges: (value: string) => void;
  onProcess: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const { direction } = useLanguageStore();
  const isRtl = direction === 'rtl';

  const handleFileDrop = (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return;
    onFile(f);
  };

  if (result) {
    return (
      <Card className="max-w-2xl mx-auto p-6 sm:p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('pdf.split.ready')}
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('pdf.split.resultHint', '{{count}} files were created from {{pages}} pages.', { count: result.count, pages: result.pages })}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-left">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.split.files')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{result.count}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.split.pages')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{result.pages}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.split.time')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{(result.duration / 1000).toFixed(1)} {t('common.seconds')}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button variant="ghost" onClick={onReset}>
            {t('common.startAgain')}
          </Button>
          <Button
            variant="primary"
            onClick={() => downloadBlob(result.blob, 'split-pdfs.zip')}
            icon={<Download className="h-4 w-4" />}
          >
            {t('pdf.split.download')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {/* Upload area */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6">
          {!file ? (
            <FileUpload
              accept={['.pdf', 'application/pdf']}
              onFilesSelected={(selected) => { if (selected[0]) handleFileDrop(selected[0].file); }}
              label={t('fileUpload.dropPdf')}
              description={t('fileUpload.pdfOnly')}
            />
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pageCount} {t(pageCount === 1 ? 'pdf.split.page' : 'pdf.split.pages')}</p>
              </div>
              <button
                type="button"
                className="text-xs text-primary-600 hover:underline dark:text-primary-400"
                onClick={() => onRemove()}
              >
                {t('pdf.split.replace')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Split method + options */}
      {file && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('pdf.split.method')}
          </h2>
          <div className="mt-4 grid gap-2">
            {SPLIT_MODES.map(([value, label, labelAr]) => (
              <button
                key={value}
                type="button"
                disabled={processing}
                onClick={() => onMode(value)}
                dir={isRtl ? 'rtl' : 'ltr'}
                className={
                    `rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                   isRtl ? 'text-right' : 'text-left'
                    } `+
                    (mode === value
                    ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'border-light-border text-gray-600 hover:border-primary-300 dark:border-dark-border dark:text-gray-300')
                }
              >
                {isRtl ? labelAr : t('pdf.split.' + value)}
              </button>
            ))}
          </div>

          {mode === 'every-n' && (
            <div className="mt-4">
              <Input
                label={t('pdf.split.nLabel')}
                type="number"
                min={1}
                max={pageCount || 1}
                value={every}
                onChange={(e) => onEvery(Number(e.target.value))}
              />
            </div>
          )}

          {(mode === 'ranges' || mode === 'extract') && (
            <div className="mt-4">
              <TextArea
                label={mode === 'ranges' ? t('pdf.split.rangeLabel') : t('pdf.split.extractLabel')}
                value={ranges}
                onChange={(e) => onRanges(e.target.value)}
               placeholder={
                mode === 'ranges'
                   ? t('pdf.split.rangePlaceholder')
                   : t('pdf.split.extractPlaceholder')
                  }
                />
              {validationError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{validationError}</p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Preview + action */}
      {file && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('pdf.split.preview')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('pdf.split.previewHint')}
              </p>
            </div>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30">
             {preview.length} {t(preview.length === 1 ? 'pdf.split.file' : 'pdf.split.files')}
             </span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={mode + ranges + every}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              {preview.slice(0, 6).map((group, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-light-border bg-gray-50 p-3 dark:border-dark-border dark:bg-dark-surface"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('pdf.split.file')} {index + 1}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{group.label}</p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {preview.length > 6 && (
            <p className="mt-3 text-xs text-gray-500">
              +{preview.length - 6} {t('pdf.split.more')}
            </p>
          )}

          {processing && (
            <ProgressBar
              value={progress}
              color="gradient"
              showLabel
              label={status}
              className="mt-5"
            />
          )}
        </Card>
      )}
      { file && (
      <div className="flex items-center gap-3 w-full">
            <Button
              variant="primary"
              size="md"
              loading={processing}
              disabled={ !preview.length || !!validationError || processing}
              onClick={onProcess}
              icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  }
            >
              {processing ? status : t('pdf.split.action')}
            </Button>
             <Button variant="ghost" onClick={onReset}>
                  {t('Cancel', 'Cancel')}
                </Button>
          </div>
      )}
    </div>
  );}


// ─── Delete PDF Workspace ──────────────────────────────────────────

function DeletePdfWorkspace({
  file, pageCount, selectedPages, processing, progress, status, error, result,
  onFile, onRemove, onTogglePage, onSelectAll, onClearSelection, onProcess, onReset,
}: {
  file: UploadedFileData | null;
  pageCount: number;
  selectedPages: number[];
  processing: boolean;
  progress: number;
  status: string;
  error: string | null;
  result: { blob: Blob; remaining: number; deleted: number; duration: number } | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  onTogglePage: (page: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onProcess: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const { direction } = useLanguageStore();
  const isRtl = direction === 'rtl';

  const handleFileDrop = (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return;
    onFile(f);
  };

  const hasSelection = selectedPages.length > 0;

  if (result) {
    return (
      <Card className="max-w-2xl mx-auto p-6 sm:p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('pdf.delete.ready')}
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('pdf.delete.resultHint', '{{deleted}} pages deleted, {{remaining}} remaining.', { deleted: result.deleted, remaining: result.remaining })}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-left">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.delete.remaining')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{result.remaining}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.delete.deletedLabel')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{result.deleted}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.split.time')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{(result.duration / 1000).toFixed(1)} {t('common.seconds')}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button variant="ghost" onClick={onReset}>
            {t('common.startAgain')}
          </Button>
          <Button
            variant="primary"
            onClick={() => downloadBlob(result.blob, file?.file.name?.replace(/\.pdf$/i, '') + '_pages.pdf' || 'deleted-pages.pdf')}
            icon={<Download className="h-4 w-4" />}
          >
            {t('pdf.delete.download')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {/* Upload area */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6">
          {!file ? (
            <FileUpload
              accept={['.pdf', 'application/pdf']}
              onFilesSelected={(selected) => { if (selected[0]) handleFileDrop(selected[0].file); }}
              label={t('fileUpload.dropPdf')}
              description={t('fileUpload.pdfOnly')}
            />
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pageCount} {pageCount === 1 ? t('pdf.split.page') : t('pdf.split.pages')}</p>
              </div>
              <button
                type="button"
                className="text-xs text-primary-600 hover:underline dark:text-primary-400"
                onClick={() => onRemove()}
              >
                {t('pdf.split.replace')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Page selection */}
      {file && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('pdf.delete.selectTitle')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('pdf.delete.selectHint')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={processing}>
                {t('pdf.delete.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={processing}>
                {t('pdf.delete.clear')}
              </Button>
            </div>
          </div>
          <PDFPageThumbnails
            file={file.file}
            selectedPages={selectedPages}
            onTogglePage={onTogglePage}
            selectMode="multiple"
          />
        </Card>
      )}

      {/* Preview + action */}
      {file && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('pdf.delete.preview')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {hasSelection
                  ? t('pdf.delete.previewHint', '{{remaining}} pages will remain after deletion.', { remaining: pageCount - selectedPages.length })
                  : t('pdf.delete.noSelection')}
              </p>
            </div>
            {hasSelection && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {selectedPages.length} {t('pdf.delete.toDelete')}
              </span>
            )}
          </div>

          {hasSelection && (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPages.join(',')}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-light-border bg-gray-50 p-4 dark:border-dark-border dark:bg-dark-surface"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('pdf.delete.pagesWillBeRemoved')}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedPages.sort((a, b) => a - b).map((p) => p + 1).join(', ')}
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400">
              {error}
            </div>
          )}

          {processing && (
            <ProgressBar
              value={progress}
              color="gradient"
              showLabel
              label={status}
              className="mt-5"
            />
          )}
          
        </Card>
      )}
 { file && (
      <div className="flex items-center gap-3 w-full">
            <Button
              variant="primary"
              size="md"
              loading={processing}
              onClick={onProcess}
              icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  }
            >
              {processing ? status : t('pdf.delete.action')}
            </Button>
             <Button variant="ghost" onClick={onReset}>
                  {t('Cancel', 'Cancel')}
                </Button>
          </div>
      )}
    </div>
  );}

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

// ─── Reorder PDF Workspace ─────────────────────────────────────────

function ReorderPdfWorkspace({
  file, pageCount, order, processing, progress, status, error, result,
  onFile, onRemove, onMove, onResetOrder, onProcess, onReset,
}: {
  file: UploadedFileData | null;
  pageCount: number;
  order: number[];
  processing: boolean;
  progress: number;
  status: string;
  error: string | null;
  result: { blob: Blob; pages: number; duration: number } | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
  onResetOrder: () => void;
  onProcess: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const { direction } = useLanguageStore();
  const isRtl = direction === 'rtl';
  const [dragged, setDragged] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setThumbnails(new Map());
    if (!file) return;
    const load = async () => {
      const pdfjsLib = await import('pdfjs-dist');
      const buffer = await file.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      if (cancelled) return;
      const indices = Array.from({ length: pdf.numPages }, (_, i) => i);
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

  const handleFileDrop = (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return;
    onFile(f);
  };

  const isDefaultOrder = order.length === pageCount && order.every((p, i) => p === i);

  if (result) {
    return (
      <Card className="max-w-2xl mx-auto p-6 sm:p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('pdf.reorder.ready')}
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('pdf.reorder.resultHint', '{{pages}} pages were reordered successfully.', { pages: result.pages })}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-left">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.reorder.files')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">1</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.reorder.pages')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{result.pages}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-dark-surface">
            <p className="text-xs text-gray-500">{t('pdf.split.time')}</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{(result.duration / 1000).toFixed(1)} {t('common.seconds')}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button variant="ghost" onClick={onReset}>
            {t('common.startAgain')}
          </Button>
          <Button
            variant="primary"
            onClick={() => downloadBlob(result.blob, file?.file.name?.replace(/\.pdf$/i, '') + '_reordered.pdf' || 'reordered-pages.pdf')}
            icon={<Download className="h-4 w-4" />}
          >
            {t('pdf.reorder.download')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {/* Upload area */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6">
          {!file ? (
            <FileUpload
              accept={['.pdf', 'application/pdf']}
              onFilesSelected={(selected) => { if (selected[0]) handleFileDrop(selected[0].file); }}
              label={t('fileUpload.dropPdf')}
              description={t('fileUpload.pdfOnly')}
            />
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pageCount} {pageCount === 1 ? t('pdf.split.page') : t('pdf.split.pages')}</p>
              </div>
              <button
                type="button"
                className="text-xs text-primary-600 hover:underline dark:text-primary-400"
                onClick={() => onRemove()}
              >
                {t('pdf.split.replace')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Reorder pages */}
      {file && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('pdf.reorder.title')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('pdf.reorder.hint')}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onResetOrder} disabled={processing || isDefaultOrder}>
              {t('pdf.reorder.reset')}
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {order.map((pageIdx, position) => (
              <motion.div
                key={pageIdx}
                layout
                draggable={!processing}
                onDragStart={() => setDragged(position)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragged !== null && dragged !== position) onMove(dragged, position);
                  setDragged(null);
                }}
                className={[
                  'relative rounded-xl border-2 overflow-hidden transition-all select-none cursor-grab active:cursor-grabbing',
                  dragged === position
                    ? 'border-primary-500 ring-2 ring-primary-500/30 shadow-md'
                    : 'border-light-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600',
                ].join(' ')}
              >
                {thumbnails.get(pageIdx) ? (
                  <img
                    src={thumbnails.get(pageIdx)}
                    alt={`Page ${pageIdx + 1}`}
                    className="w-full aspect-[1/1.41] object-contain bg-white"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full aspect-[1/1.41] bg-gray-100 dark:bg-dark-surface flex items-center justify-center">
                    <Spinner size={16} />
                  </div>
                )}
                <div className="absolute top-0 inset-x-0 flex items-center justify-between bg-gradient-to-b from-black/40 to-transparent px-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-white/90">{position + 1}</span>
                  <GripVertical className="h-3.5 w-3.5 text-white/80" />
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5 font-medium">
                  {pageIdx + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Preview + action */}
      {file && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('pdf.reorder.preview')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('pdf.reorder.previewHint')}
              </p>
            </div>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30">
              {order.length} {t('pdf.reorder.pages')}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={order.join(',')}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-light-border bg-gray-50 p-4 dark:border-dark-border dark:bg-dark-surface"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('pdf.reorder.newOrder')}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {order.map((p) => p + 1).join(', ')}
              </p>
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400">
              {error}
            </div>
          )}

          {processing && (
            <ProgressBar
              value={progress}
              color="gradient"
              showLabel
              label={status}
              className="mt-5"
            />
          )}
        </Card>
      )}

      {file && (
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="primary"
            size="md"
            loading={processing}
            disabled={!order.length || processing || isDefaultOrder}
            onClick={onProcess}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            }
          >
            {processing ? status : t('pdf.reorder.action')}
          </Button>
          <Button variant="ghost" onClick={onReset}>
            {t('Cancel', 'Cancel')}
          </Button>
        </div>
      )}
    </div>
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
  const [splitMode, setSplitMode] = useState<SplitMode>('every-page');
  const [splitEvery, setSplitEvery] = useState(1);
  const [splitRanges, setSplitRanges] = useState('');
  const [splitPageCount, setSplitPageCount] = useState(0);
  const [splitStatus, setSplitStatus] = useState('');
  const [splitResult, setSplitResult] = useState<{ blob: Blob; count: number; pages: number; duration: number } | null>(null);
  const [splitValidationError, setSplitValidationError] = useState<string | null>(null);

  // Delete-specific state
  const [deletePageCount, setDeletePageCount] = useState(0);
  const [deleteSelectedPages, setDeleteSelectedPages] = useState<number[]>([]);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [deleteResult, setDeleteResult] = useState<{ blob: Blob; remaining: number; deleted: number; duration: number } | null>(null);

  // Reorder-specific state
  const [reorderPageCount, setReorderPageCount] = useState(0);
  const [reorderStatus, setReorderStatus] = useState('');
  const [reorderResult, setReorderResult] = useState<{ blob: Blob; pages: number; duration: number } | null>(null);

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
    setSplitMode('every-page');
    setSplitEvery(1);
    setSplitRanges('');
    setSplitPageCount(0);
    setSplitStatus('');
    setSplitResult(null);
    setSplitValidationError(null);
    setDeletePageCount(0);
    setDeleteSelectedPages([]);
    setDeleteStatus('');
    setDeleteResult(null);
    setReorderPageCount(0);
    setReorderStatus('');
    setReorderResult(null);
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
          if (selectedPages.length === 0) throw new Error(t('pdf.delete.selectAtLeastOnePage'));
          output = await splitPDF(firstFile, selectedPages);
          break;

        case 'compress-pdf':
          setProgress(20);
          output = await compressPdf(firstFile, 'medium');
          break;

        case 'delete-pages':
          setProgress(30);
          if (selectedPages.length === 0) throw new Error(t('pdf.delete.selectPages'));
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
          output = await protectPdf(firstFile, password);
          break;

        case 'remove-password':
          setProgress(20);
          if (!password) throw new Error('Enter the current password');
          output = await unlockPdf(firstFile, password);
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
        case 'ppt-to-pdf': {
          setProgress(30);
          output = await convertToPdf(firstFile);
          break;
        }
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
      let msg = err instanceof Error ? err.message : 'An error occurred';
      if (isNetworkError(err)) {
        msg = isRtl
          ? 'أنت غير متصل بالإنترنت. تتطلب هذه الأداة اتصالاً بالإنترنت. حاول مرة أخرى عند توفر الاتصال.'
          : 'You are offline. This tool requires an internet connection. Try again once you are back online.';
      }
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

  const splitPreview = useMemo(() => {
    if (!splitPageCount) return [];
    try {
      if (splitMode === 'every-page')
  return createPDFPageGroups(splitPageCount, 1, t('pdf.split.pages'));
      if (splitMode === 'every-n')
  return createPDFPageGroups(splitPageCount, splitEvery, t('pdf.split.pages'));
      if (splitMode === 'ranges')
  return parsePDFPageRanges(splitRanges, splitPageCount, t('pdf.split.pages'));
      const pages = parsePDFPageExpression(splitRanges, splitPageCount);
      return pages.length
  ? [{
      label: `${isRtl ? 'الصفحات' : 'Pages'} ${pages.map((page) => page + 1).join(', ')}`,
      pages,
    }]
  : [];}
     catch {
      return [];
    }
  }, [splitEvery, splitMode, splitPageCount, splitRanges, isRtl]);

  const addSplitFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.');
      return;
    }
    try {
      setError(null);
      setSplitResult(null);
      setSplitStatus('Reading PDF…');
      const data = await fileToArrayBuffer(file);
      const pageCount = await getPDFPageCount(file);
      setFiles([{ id: 'split-' + Date.now(), file, data, pageCount }]);
      setSplitPageCount(pageCount);
    } catch {
      setError('This PDF could not be read. Please choose another file.');
    }
  };

  const processSplit = async () => {
    const source = files[0]?.file;
    if (!source || !splitPreview.length) return;

    // Validate ranges/extract input before processing
    if ((splitMode === 'ranges' || splitMode === 'extract') && splitPageCount > 0) {
      const err = splitMode === 'ranges'
        ? validatePageRanges(splitRanges, splitPageCount)
        : validatePageExpression(splitRanges, splitPageCount);
      if (err) {
        setSplitValidationError(err.message);
        setError(err.message);
        return;
      }
    }

    const started = performance.now();
    setError(null);
    setSplitValidationError(null);
    setProcessState('processing');
    try {
      setSplitStatus('Preparing…');
      setProgress(10);
      let outputs;
      setSplitStatus('Splitting PDF…');
      setProgress(35);
      if (splitMode === 'every-page') outputs = await splitEveryPage(source, splitPageCount);
      else if (splitMode === 'every-n') outputs = await splitEveryNPages(source, splitPageCount, splitEvery);
      else if (splitMode === 'ranges') outputs = await splitByRanges(source, splitPageCount, splitRanges);
      else outputs = await extractPages(source, splitPageCount, splitRanges);
      setSplitStatus('Generating files…');
      setProgress(70);
      const zip = new JSZip();
      outputs.forEach((output) => zip.file(output.name, output.blob));
      setSplitStatus('Compressing ZIP…');
      const blob = await zip.generateAsync({ type: 'blob' });
      setProgress(100);
      setSplitStatus('Done');
      setSplitResult({ blob, count: outputs.length, pages: outputs.reduce((total, output) => total + output.pages.length, 0), duration: performance.now() - started });
      setProcessState('done');
      addNotification(t('PDF split successfully', 'تم تقسيم الملف بنجاح'), 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to split this PDF.';
      setError(message);
      setProcessState('error');
      addNotification(message, 'error');
    }
  };

  const addDeleteFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;
    try {
      setError(null);
      setDeleteResult(null);
      setDeleteStatus(t('pdf.delete.reading'));
      const data = await fileToArrayBuffer(file);
      const pageCount = await getPDFPageCount(file);
      setFiles([{ id: 'delete-' + Date.now(), file, data, pageCount }]);
      setDeletePageCount(pageCount);
      setDeleteSelectedPages([]);
    } catch {
      setError(t('pdf.delete.readError'));
    }
  };

  const handleDeleteTogglePage = (page: number) => {
    setDeleteSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page],
    );
  };

  const selectAllDeletePages = () => {
    setDeleteSelectedPages(Array.from({ length: deletePageCount }, (_, i) => i));
  };

  const processDelete = async () => {
    const source = files[0]?.file;
    if (!source || deleteSelectedPages.length === 0) return;
    const started = performance.now();
    setError(null);
    setProcessState('processing');
    try {
      setDeleteStatus(t('pdf.delete.processing'));
      setProgress(30);
      const output = await deletePDFPages(source, deleteSelectedPages);
      setProgress(100);
      setDeleteStatus('Done');
      setDeleteResult({
        blob: output,
        remaining: deletePageCount - deleteSelectedPages.length,
        deleted: deleteSelectedPages.length,
        duration: performance.now() - started,
      });
      setProcessState('done');
      addNotification(t('pdf.delete.success'), 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('pdf.delete.error');
      setError(message);
      setProcessState('error');
      addNotification(message, 'error');
    }
  };

  const addReorderFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;
    try {
      setError(null);
      setReorderResult(null);
      setReorderStatus(t('pdf.reorder.reading'));
      const data = await fileToArrayBuffer(file);
      const pageCount = await getPDFPageCount(file);
      setFiles([{ id: 'reorder-' + Date.now(), file, data, pageCount }]);
      setReorderPageCount(pageCount);
      setPageOrder(Array.from({ length: pageCount }, (_, i) => i));
    } catch {
      setError(t('pdf.reorder.readError'));
    }
  };

  const handleReorderMove = (from: number, to: number) => {
    setPageOrder((current) => {
      if (to < 0 || to >= current.length) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      return reordered;
    });
  };

  const processReorder = async () => {
    const source = files[0]?.file;
    if (!source || pageOrder.length === 0) return;
    const started = performance.now();
    setError(null);
    setProcessState('processing');
    try {
      setReorderStatus(t('pdf.reorder.processing'));
      setProgress(30);
      const output = await reorderPDFPages(source, pageOrder);
      setProgress(100);
      setReorderStatus('Done');
      setReorderResult({
        blob: output,
        pages: pageOrder.length,
        duration: performance.now() - started,
      });
      setProcessState('done');
      addNotification(t('pdf.reorder.success'), 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('pdf.reorder.error');
      setError(message);
      setProcessState('error');
      addNotification(message, 'error');
    }
  };

  const addMergeFiles = async (selected: File[]) => {
    const remainingSlots = (tool.maxFiles || 20) - files.length;
    if (remainingSlots <= 0) {
      setError('A maximum of ' + (tool.maxFiles || 20) + ' PDFs can be merged at once.');
      return;
    }
    const validFiles = selected
      .filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
      .slice(0, remainingSlots);
    if (validFiles.length === 0) {
      setError('Please choose PDF files only.');
      return;
    }

    setError(null);
    const uploaded = await Promise.all(validFiles.map(async (file, index) => {
      const data = await fileToArrayBuffer(file);
      let pageCount: number | undefined;
      try {
        pageCount = await getPDFPageCount(file);
      } catch {
       
      }
      return { id: 'merge-' + Date.now() + '-' + index + '-' + file.name, file, data, pageCount };
    }));
    setFiles((current) => [...current, ...uploaded]);
    setStep('configure');
  };

  const moveMergeFile = (from: number, to: number) => {
    setFiles((current) => {
      if (to < 0 || to >= current.length) return current;
      const reordered = [...current];
      const [file] = reordered.splice(from, 1);
      reordered.splice(to, 0, file);
      return reordered;
    });
  };

  if (tool.id === 'merge-pdfs') {
    return (
      <div className={'min-h-screen bg-light-bg dark:bg-dark-bg ' + (isRtl ? 'rtl' : 'ltr')}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ToolHeader tool={tool} isDark={isDark} isRtl={isRtl} />
          <MergePdfWorkspace
            files={files}
            processing={processState === 'processing'}
            progress={progress}
            result={result}
            error={error}
            onAdd={addMergeFiles}
            onMove={moveMergeFile}
            onRemove={(index) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
            onMerge={processFile}
            onReset={reset}
          />
        </div>
      </div>
    );
  }

  if (tool.id === 'split-pdf') {
    return (
      <div className={'min-h-screen bg-light-bg dark:bg-dark-bg ' + (isRtl ? 'rtl' : 'ltr')}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ToolHeader tool={tool} isDark={isDark} isRtl={isRtl} />
          <SplitPdfWorkspace
            file={files[0] || null}
            pageCount={splitPageCount}
            mode={splitMode}
            every={splitEvery}
            ranges={splitRanges}
            preview={splitPreview}
            processing={processState === 'processing'}
            progress={progress}
            status={splitStatus}
            error={error}
            result={splitResult}
            validationError={splitValidationError}
            onFile={addSplitFile}
            onRemove={() => { setFiles([]); setSplitPageCount(0); setSplitRanges(''); setError(null); setSplitValidationError(null); }}
            onMode={(mode) => { setSplitMode(mode); setError(null); setSplitValidationError(null); }}
            onEvery={(value) => { setSplitEvery(value); setError(null); }}
            onRanges={(value) => {
              setSplitRanges(value);
              setError(null);
              if (splitPageCount > 0) {
                const err = splitMode === 'ranges'
                  ? validatePageRanges(value, splitPageCount)
                  : validatePageExpression(value, splitPageCount);
                setSplitValidationError(err?.message ?? null);
              }
            }}
            onProcess={processSplit}
            onReset={reset}
          />
        </div>
      </div>
    );
  }

  if (tool.id === 'delete-pages') {
    return (
      <div className={'min-h-screen bg-light-bg dark:bg-dark-bg ' + (isRtl ? 'rtl' : 'ltr')}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ToolHeader tool={tool} isDark={isDark} isRtl={isRtl} />
          <DeletePdfWorkspace
            file={files[0] || null}
            pageCount={deletePageCount}
            selectedPages={deleteSelectedPages}
            processing={processState === 'processing'}
            progress={progress}
            status={deleteStatus}
            error={error}
            result={deleteResult}
            onFile={addDeleteFile}
            onRemove={() => { setFiles([]); setDeletePageCount(0); setDeleteSelectedPages([]); setError(null); }}
            onTogglePage={handleDeleteTogglePage}
            onSelectAll={selectAllDeletePages}
            onClearSelection={() => setDeleteSelectedPages([])}
            onProcess={processDelete}
            onReset={reset}
          />
        </div>
      </div>
    );
  }

  if (tool.id === 'reorder-pages') {
    return (
      <div className={'min-h-screen bg-light-bg dark:bg-dark-bg ' + (isRtl ? 'rtl' : 'ltr')}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ToolHeader tool={tool} isDark={isDark} isRtl={isRtl} />
          <ReorderPdfWorkspace
            file={files[0] || null}
            pageCount={reorderPageCount}
            order={pageOrder}
            processing={processState === 'processing'}
            progress={progress}
            status={reorderStatus}
            error={error}
            result={reorderResult}
            onFile={addReorderFile}
            onRemove={() => { setFiles([]); setReorderPageCount(0); setPageOrder([]); setError(null); }}
            onMove={handleReorderMove}
            onResetOrder={() => setPageOrder(Array.from({ length: reorderPageCount }, (_, i) => i))}
            onProcess={processReorder}
            onReset={reset}
          />
        </div>
      </div>
    );
  }

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
                  label={tool.accepts.includes('.pdf') ? t('fileUpload.dropPdf') : t('fileUpload.dropLabel', 'Drop files here or click to browse')}
                  description={tool.accepts.includes('.pdf') ? t('fileUpload.pdfOnly') : tool.accepts.map((a) => a.toUpperCase()).join(', ')}
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
                  originalFileName={files[0]?.file.name}
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
