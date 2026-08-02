import path from "path";
import fs from "fs-extra";
import PptxGenJS from "pptxgenjs";
import { inflateSync, deflateSync } from "zlib";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFRef,
  PDFRawStream,
  PDFContext,
} from "pdf-lib";
import { PptError } from "./ppt-number-slides.service";

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

// 16:9 layout in inches.
const LAYOUT_WIDTH = 13.333;
const LAYOUT_HEIGHT = 7.5;

const ACCENT = "1F4E79"; // Deep professional blue
const ACCENT_SOFT = "DEEBF7"; // Light blue band
const TEXT_DARK = "333333";
const TEXT_MUTED = "595959";
const WHITE = "FFFFFF";

const BASE_FONT = "Arial";

const ARABIC_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const MAX_IMAGES_PER_PAGE = 4;
const MAX_PARAGRAPHS = 14;
const MAX_PARAGRAPH_CHARS = 200;

type ExtractedImage = {
  data: Buffer;
  ext: "jpeg" | "png";
  width: number;
  height: number;
};

type PageContent = {
  paragraphs: string[];
  images: ExtractedImage[];
};

type PlacedImage = {
  data: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function isRtlText(text: string): boolean {
  return ARABIC_RE.test(text);
}

function resolvePdfValue(context: PDFContext, obj: unknown): unknown {
  if (obj instanceof PDFRef) return context.lookup(obj);
  return obj;
}

function getFilterNames(context: PDFContext, dict: PDFDict): string[] {
  const filter = dict.get(PDFName.of("Filter"));
  if (!filter) return [];
  const items = Array.isArray(filter) ? filter : [filter];
  const names: string[] = [];
  for (const item of items) {
    const resolved = resolvePdfValue(context, item);
    if (resolved instanceof PDFName) names.push(resolved.asString());
  }
  return names;
}

function dictNumber(context: PDFContext, dict: PDFDict, name: string): number {
  const value = dict.get(PDFName.of(name));
  const resolved = resolvePdfValue(context, value);
  if (typeof resolved === "number") return resolved;
  const num = Number(resolved);
  return Number.isFinite(num) ? num : NaN;
}

function getColorChannels(context: PDFContext, dict: PDFDict): number {
  const colorSpace = dict.get(PDFName.of("ColorSpace"));
  if (!colorSpace) return 3; // PDF default is DeviceRGB.
  const resolved = resolvePdfValue(context, colorSpace);
  const name = resolved instanceof PDFName ? resolved.asString() : "";
  if (name === "/DeviceGray") return 1;
  if (name === "/DeviceRGB") return 3;
  if (name === "/DeviceCMYK") return 0; // Unsupported for raw reconstruction.
  if (Array.isArray(resolved) && resolved.length > 0) {
    const inner = resolvePdfValue(context, resolved[0]);
    const innerName = inner instanceof PDFName ? inner.asString() : "";
    if (innerName === "/DeviceGray") return 1;
    if (innerName === "/DeviceRGB") return 3;
  }
  return 0;
}

function getPredictor(context: PDFContext, dict: PDFDict): number {
  const parms = dict.get(PDFName.of("DecodeParms"));
  if (!parms) return 1;
  const first = Array.isArray(parms) ? parms[0] : parms;
  const resolved = resolvePdfValue(context, first);
  if (resolved instanceof PDFDict) {
    const value = resolved.get(PDFName.of("Predictor"));
    const num = Number(value);
    return Number.isFinite(num) ? num : 1;
  }
  return 1;
}

function unfilterRow(
  row: Uint8Array,
  prev: Uint8Array | null,
  bpp: number,
  filter: number
): Uint8Array {
  const out = new Uint8Array(row.length);
  for (let i = 0; i < row.length; i++) {
    const a = row[i];
    const left = i >= bpp ? out[i - bpp] : 0;
    const up = prev ? prev[i] : 0;
    const upLeft = i >= bpp && prev ? prev[i - bpp] : 0;
    let x: number;
    switch (filter) {
      case 0:
        x = a;
        break;
      case 1:
        x = a + left;
        break;
      case 2:
        x = a + up;
        break;
      case 3:
        x = a + Math.floor((left + up) / 2);
        break;
      case 4: {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        x = a + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
        break;
      }
      default:
        throw new Error(`Unsupported PNG filter type ${filter}`);
    }
    out[i] = x & 0xff;
  }
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function buildPng(
  width: number,
  height: number,
  channels: number,
  raw: Buffer
): Buffer {
  const colorType = channels === 1 ? 0 : 2;
  const stride = width * channels;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth.
  ihdr[9] = colorType;
  ihdr[10] = 0; // Compression.
  ihdr[11] = 0; // Filter.
  ihdr[12] = 0; // Interlace.

  const idat = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    idat[y * (stride + 1)] = 0; // Filter type: none.
    raw.copy(idat, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(idat)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function tryBuildPng(
  decoded: Uint8Array,
  width: number,
  height: number,
  channels: number,
  predictor: number
): Buffer | null {
  try {
    const stride = width * channels;
    const rows: Uint8Array[] = [];
    if (predictor >= 10 && predictor <= 15) {
      // Each scanline is prefixed with a 1-byte filter type.
      let offset = 0;
      let prev: Uint8Array | null = null;
      for (let y = 0; y < height; y++) {
        const filter = decoded[offset];
        const rowData = decoded.subarray(offset + 1, offset + 1 + stride);
        if (rowData.length !== stride) return null;
        const out = unfilterRow(rowData, prev, channels, filter);
        rows.push(out);
        prev = out;
        offset += 1 + stride;
      }
    } else {
      if (decoded.length !== stride * height) return null;
      for (let y = 0; y < height; y++) {
        rows.push(decoded.subarray(y * stride, y * stride + stride));
      }
    }
    return buildPng(width, height, channels, Buffer.concat(rows as Buffer[]));
  } catch {
    return null;
  }
}

function extractImages(doc: PDFDocument, pageIndex: number): ExtractedImage[] {
  const page = doc.getPage(pageIndex);
  const resources = page.node.Resources();
  const xobjs = resources
    ? resources.lookupMaybe(PDFName.of("XObject"), PDFDict)
    : undefined;
  if (!xobjs) return [];

  const found: ExtractedImage[] = [];
  const context = doc.context;

  for (const key of xobjs.keys()) {
    const obj = resolvePdfValue(doc.context, xobjs.get(key));
    if (!(obj instanceof PDFRawStream) || !obj.dict) continue;

    const subtype = obj.dict.get(PDFName.of("Subtype"));
    const subtypeName =
      subtype instanceof PDFName ? subtype.asString() : "";
    if (subtypeName !== "/Image") continue;

    const width = dictNumber(context, obj.dict, "Width");
    const height = dictNumber(context, obj.dict, "Height");
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      continue;
    }

    const filters = getFilterNames(context, obj.dict);

    try {
      if (filters.some((f) => f === "/DCTDecode")) {
        // DCTDecode streams hold the raw JPEG bytes directly.
        found.push({
          data: Buffer.from(obj.getContents()),
          ext: "jpeg",
          width,
          height,
        });
      } else if (filters.length === 1 && filters[0] === "/FlateDecode") {
        // Reconstruct a PNG from the (possibly predictor-encoded) pixel data.
        const channels = getColorChannels(context, obj.dict);
        if (channels === 1 || channels === 3) {
          const predictor = getPredictor(context, obj.dict);
          const decoded = inflateSync(Buffer.from(obj.getContents()));
          const png = tryBuildPng(decoded, width, height, channels, predictor);
          if (png) {
            found.push({ data: png, ext: "png", width, height });
          }
        }
      }
    } catch {
      // Skip images we cannot decode cleanly.
    }
  }

  // Deduplicate identical images and keep only the largest ones.
  const seen = new Set<string>();
  const unique: ExtractedImage[] = [];
  for (const image of found.sort(
    (a, b) => b.width * b.height - a.width * a.height
  )) {
    const key = `${image.ext}:${image.data.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(image);
  }

  return unique.slice(0, MAX_IMAGES_PER_PAGE);
}

function layoutImages(images: ExtractedImage[]): {
  items: PlacedImage[];
  height: number;
} {
  const availableWidth = LAYOUT_WIDTH - 1.0;
  const maxHeight = 3.2;
  const n = images.length;

  const scaled = images.map((image) => {
    const maxW = availableWidth / n;
    const scale = Math.min(1, maxHeight / image.height, maxW / image.width);
    return { image, w: image.width * scale, h: image.height * scale };
  });

  let totalWidth = scaled.reduce((sum, item) => sum + item.w, 0);
  if (totalWidth > availableWidth) {
    const factor = availableWidth / totalWidth;
    for (const item of scaled) {
      item.w *= factor;
      item.h *= factor;
    }
    totalWidth = availableWidth;
  }

  const items: PlacedImage[] = [];
  let x = (LAYOUT_WIDTH - totalWidth) / 2;
  for (const item of scaled) {
    const ext = item.image.ext === "jpeg" ? "image/jpeg" : "image/png";
    items.push({
      data: `data:${ext};base64,${item.image.data.toString("base64")}`,
      x,
      y: 0,
      w: item.w,
      h: item.h,
    });
    x += item.w;
  }

  const height = scaled.reduce((max, item) => Math.max(max, item.h), 0);
  return { items, height };
}

function renderPageSlide(
  slide: PptxGenJS.Slide,
  content: PageContent,
  pageNumber: number,
  totalPages: number
): void {
  // Top accent band.
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: LAYOUT_WIDTH,
    h: 0.14,
    fill: { color: ACCENT },
  });

  let contentY = 0.55;

  if (content.images.length > 0) {
    const { items, height } = layoutImages(content.images);
    for (const item of items) {
      slide.addImage({
        data: item.data,
        x: item.x,
        y: contentY,
        w: item.w,
        h: item.h,
      });
    }
    contentY += height + 0.35;
  }

  if (content.paragraphs.length > 0) {
    const runs: PptxGenJS.TextProps[] = content.paragraphs.map((text) => {
      const rtl = isRtlText(text);
      return {
        text,
        options: {
          breakLine: true,
          paraSpaceAfter: 8,
          fontSize: 16,
          fontFace: BASE_FONT,
          color: TEXT_DARK,
          rtlMode: rtl,
          lang: rtl ? "ar-SA" : "en-US",
          align: rtl ? "right" : "left",
          wrap: true,
        },
      };
    });

    const textY = contentY;
    slide.addText(runs, {
      x: 0.9,
      y: textY,
      w: LAYOUT_WIDTH - 1.8,
      h: Math.max(LAYOUT_HEIGHT - textY - 0.6, 1),
      valign: "top",
    });
  } else if (content.images.length === 0) {
    slide.addText(
      "No extractable content found on this page.",
      {
        x: 1,
        y: contentY + 0.5,
        w: LAYOUT_WIDTH - 2,
        h: 1,
        align: "center",
        valign: "middle",
        fontSize: 16,
        fontFace: BASE_FONT,
        color: TEXT_MUTED,
      }
    );
  }

  // Footer.
  slide.addText("Morven Student", {
    x: 0.7,
    y: LAYOUT_HEIGHT - 0.55,
    w: 5,
    h: 0.4,
    align: "left",
    fontSize: 10,
    fontFace: BASE_FONT,
    color: TEXT_MUTED,
  });
  slide.addText(`Page ${pageNumber} / ${totalPages}`, {
    x: LAYOUT_WIDTH - 2.2,
    y: LAYOUT_HEIGHT - 0.55,
    w: 1.5,
    h: 0.4,
    align: "right",
    fontSize: 10,
    fontFace: BASE_FONT,
    color: TEXT_MUTED,
  });
}

export class PptGenerateFromPdfService {
  static async generateFromPdf(
    inputPath: string,
    outputPath: string
  ): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

    const exists = await fs.pathExists(inputPath);
    if (!exists) {
      throw new PptError(
        "INVALID_PPTX",
        "PDF file not found after upload."
      );
    }

    const pdfBytes = await fs.readFile(inputPath);

    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

    let pdfDoc;
    try {
      pdfDoc = await getDocument({
        data: new Uint8Array(pdfBytes),
        useSystemFonts: true,
        isEvalSupported: false,
      }).promise;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown PDF parse error";
      throw new PptError("INVALID_PPTX", `Failed to read the PDF: ${message}`);
    }

    let pdfLibDoc: PDFDocument;
    try {
      pdfLibDoc = await PDFDocument.load(pdfBytes);
    } catch (err) {
      await pdfDoc.destroy();
      const message =
        err instanceof Error ? err.message : "Unknown PDF parse error";
      throw new PptError("INVALID_PPTX", `Failed to parse the PDF: ${message}`);
    }

    const totalPages = pdfDoc.numPages;
    const contents: PageContent[] = [];

    try {
      for (let i = 1; i <= totalPages; i += 1) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        let pageText = "";
        for (const item of textContent.items) {
          pageText += item.str ?? "";
          if (item.hasEOL) pageText += "\n";
        }

        const paragraphs = pageText
          .replace(/\uFEFF/g, "")
          .split(/\n+/)
          .map((p) => p.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .map((p) =>
            p.length > MAX_PARAGRAPH_CHARS
              ? `${p.slice(0, MAX_PARAGRAPH_CHARS)}…`
              : p
          )
          .slice(0, MAX_PARAGRAPHS);

        const images = extractImages(pdfLibDoc, i - 1);
        contents.push({ paragraphs, images });
      }
    } catch (err) {
      await pdfDoc.destroy();
      const message =
        err instanceof Error ? err.message : "Unknown PDF extraction error";
      throw new PptError("PROCESS_FAILED", `Failed to read PDF pages: ${message}`);
    }

    await pdfDoc.destroy();

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT });
    pptx.layout = "WIDE";
    pptx.author = "Morven Student";
    pptx.title = "Converted Presentation";
    pptx.subject = "Converted from PDF by Morven Student";

    for (let i = 0; i < contents.length; i += 1) {
      const slide = pptx.addSlide();
      slide.background = { color: WHITE };
      renderPageSlide(slide, contents[i], i + 1, totalPages);
    }

    let buffer: Buffer;
    try {
      buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "PPTX generation failed";
      throw new PptError("PROCESS_FAILED", message);
    }

    await fs.writeFile(outputPath, buffer);

    const generated = await fs.pathExists(outputPath);
    if (!generated) {
      throw new Error(
        `Generation finished but no file was produced at ${outputPath}.`
      );
    }

    return outputPath;
  }
}
