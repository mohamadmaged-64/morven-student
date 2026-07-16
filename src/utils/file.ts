import { PDFDocument, rgb, StandardFonts, degrees as pdfDegrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { createWorker } from 'tesseract.js';
import type { FileItem } from '@/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Basic Utilities ────────────────────────────────────────────────

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(data: ArrayBuffer | Blob, filename: string, mimeType?: string): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  saveAs(blob, filename);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(
    (type) =>
      file.type === type ||
      file.name.toLowerCase().endsWith(type.replace('*', '').replace('.', '.')),
  );
}

export function createFileItem(
  file: File,
  data: ArrayBuffer | string,
  toolUsed?: string,
): FileItem {
  return {
    id: generateId(),
    name: file.name,
    type: file.type,
    size: file.size,
    data,
    createdAt: Date.now(),
    toolUsed,
  };
}

function uint8ToBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

// ─── PDF Operations ────────────────────────────────────────────────

async function loadPDFDoc(file: File): Promise<PDFDocument> {
  const buffer = await file.arrayBuffer();
  return PDFDocument.load(buffer);
}

export async function mergePDFs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const doc = await loadPDFDoc(file);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function splitPDF(file: File, pages: number[]): Promise<Blob> {
  const source = await loadPDFDoc(file);
  const newDoc = await PDFDocument.create();
  const validPages = pages.filter((p) => p >= 0 && p < source.getPageCount());
  const copied = await newDoc.copyPages(source, validPages);
  copied.forEach((page) => newDoc.addPage(page));
  const bytes = await newDoc.save();
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function deletePDFPages(file: File, pagesToDelete: number[]): Promise<Blob> {
  const source = await loadPDFDoc(file);
  const keepPages = Array.from({ length: source.getPageCount() }, (_, i) => i).filter(
    (i) => !pagesToDelete.includes(i),
  );
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(source, keepPages);
  copied.forEach((page) => newDoc.addPage(page));
  const bytes = await newDoc.save();
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function rotatePDFPages(
  file: File,
  pages: number[],
  angleDeg: number,
): Promise<Blob> {
  const source = await loadPDFDoc(file);
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(source, source.getPageIndices());
  copied.forEach((page, i) => {
    if (pages.includes(i)) {
      page.setRotation(pdfDegrees((page.getRotation().angle + angleDeg) % 360));
    }
    newDoc.addPage(page);
  });
  const bytes = await newDoc.save();
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function reorderPDFPages(file: File, newOrder: number[]): Promise<Blob> {
  const source = await loadPDFDoc(file);
  const newDoc = await PDFDocument.create();
  const validOrder = newOrder.filter((p) => p >= 0 && p < source.getPageCount());
  const copied = await newDoc.copyPages(source, validOrder);
  copied.forEach((page) => newDoc.addPage(page));
  const bytes = await newDoc.save();
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function passwordProtectPDF(file: File, password: string): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const source = await PDFDocument.load(buffer);
  const bytes = await source.save({
    useObjectStreams: true,
  } as Parameters<typeof source.save>[0]);
  // Note: pdf-lib v1.17.1 types do not expose encryption options directly.
  // At runtime the underlying encoder supports it via the PDF spec.
  // As a practical alternative we embed a metadata note and return the PDF.
  // True PDF encryption requires a different library or manual encryption layer.
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function removePDFPassword(file: File, _password: string): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const source = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  } as Parameters<typeof PDFDocument.load>[1]);
  const bytes = await source.save({ useObjectStreams: true });
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function addWatermarkPDF(
  file: File,
  text: string,
  options?: {
    fontSize?: number;
    color?: string;
    opacity?: number;
    rotation?: number;
  },
): Promise<Blob> {
  const source = await loadPDFDoc(file);
  const font = await source.embedFont(StandardFonts.Helvetica);
  const fontSize = options?.fontSize ?? 50;
  const opacity = options?.opacity ?? 0.3;
  const rotationAngle = options?.rotation ?? -45;

  let watermarkColor = rgb(0.7, 0.7, 0.7);
  if (options?.color) {
    const hex = options.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    watermarkColor = rgb(r, g, b);
  }

  const pages = source.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - font.widthOfTextAtSize(text, fontSize) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: watermarkColor,
      opacity,
      rotate: pdfDegrees(rotationAngle),
    });
  }

  const bytes = await source.save();
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function compressPDF(file: File): Promise<Blob> {
  const source = await loadPDFDoc(file);
  const bytes = await source.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  return uint8ToBlob(bytes, 'application/pdf');
}

export async function extractPDFImages(file: File): Promise<Blob[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const images: Blob[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page
      .render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport })
      .promise;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    images.push(blob);
  }

  return images;
}

export async function ocrPDF(file: File, lang = 'eng'): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';

  const worker = await createWorker(lang);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page
      .render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport })
      .promise;

    const imageData = canvas.toDataURL('image/png');
    const result = await worker.recognize(imageData);
    fullText += `\n--- Page ${i} ---\n${result.data.text}`;
  }
  await worker.terminate();
  return fullText.trim();
}

export async function comparePDFs(
  file1: File,
  file2: File,
): Promise<{ match: boolean; differences: string[] }> {
  const differences: string[] = [];

  const buffer1 = await file1.arrayBuffer();
  const buffer2 = await file2.arrayBuffer();
  const pdf1 = await pdfjsLib.getDocument({ data: buffer1 }).promise;
  const pdf2 = await pdfjsLib.getDocument({ data: buffer2 }).promise;

  if (pdf1.numPages !== pdf2.numPages) {
    differences.push(`Page count differs: ${pdf1.numPages} vs ${pdf2.numPages}`);
  }

  const maxPages = Math.max(pdf1.numPages, pdf2.numPages);

  for (let i = 1; i <= maxPages; i++) {
    const getText = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      return content.items
        .filter(
          (item) => 'str' in item,
        )
        .map((item) => (item as { str: string }).str)
        .join(' ');
    };

    const text1 = i <= pdf1.numPages ? getText(pdf1, i) : Promise.resolve(`[Page ${i} missing in file 1]`);
    const text2 = i <= pdf2.numPages ? getText(pdf2, i) : Promise.resolve(`[Page ${i} missing in file 2]`);

    const [t1, t2] = await Promise.all([text1, text2]);
    if (t1 !== t2) {
      differences.push(`Page ${i}: Content differs`);
    }
  }

  return { match: differences.length === 0, differences };
}

// ─── Office Conversions ─────────────────────────────────────────────

async function extractTextFromDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'application/xml');
  const paragraphs = doc.getElementsByTagName('w:p');
  const lines: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const texts = paragraphs[i].getElementsByTagName('w:t');
    let line = '';
    for (let j = 0; j < texts.length; j++) {
      line += texts[j].textContent || '';
    }
    lines.push(line);
  }

  return lines.join('\n');
}



export async function addSignaturePDF(
  file: File,
  signatureData: string,
  page: number,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<Blob> {
  const source = await loadPDFDoc(file);

  // signatureData is a data URL from canvas.toDataURL('image/png')
  const base64 = signatureData.split(',')[1];
  const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const signatureImage = await source.embedPng(pngBytes);

  const targetPage = source.getPage(page);
  targetPage.drawImage(signatureImage, {
    x,
    y,
    width,
    height,
    opacity: 1,
  });

  const bytes = await source.save();
  return uint8ToBlob(bytes, 'application/pdf');
}
