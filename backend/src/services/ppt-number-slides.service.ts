import path from "path";
import fs from "fs-extra";
import JSZip from "jszip";
import xml2js from "xml2js";

export type SlideNumberPosition = "bottom-right" | "bottom-center" | "bottom-left";

const VALID_POSITIONS: SlideNumberPosition[] = [
  "bottom-right",
  "bottom-center",
  "bottom-left",
];

export function isSlideNumberPosition(
  value: string
): value is SlideNumberPosition {
  return (VALID_POSITIONS as string[]).includes(value);
}

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

// EMU (English Metric Units) = 1/914400 inch.
const EMU_PER_INCH = 914400;
const BOX_WIDTH = Math.round(1.5 * EMU_PER_INCH);
const BOX_HEIGHT = Math.round(0.6 * EMU_PER_INCH);
const MARGIN = Math.round(0.3 * EMU_PER_INCH);

// OOXML default slide size when presentation.xml cannot be parsed.
const DEFAULT_SLIDE_SIZE = { width: 12192000, height: 6858000 };

type SlideSize = { width: number; height: number };

export type PptErrorCode = "INVALID_PPTX" | "PROCESS_FAILED";

export class PptError extends Error {
  readonly code: PptErrorCode;

  constructor(code: PptErrorCode, message: string) {
    super(message);
    this.name = "PptError";
    this.code = code;
  }
}

type NumberShapeOptions = {
  number: number;
  width: number;
  height: number;
  position: SlideNumberPosition;
  shapeId: number;
};

function parseSlideSize(presentationXml?: string): Promise<SlideSize> {
  if (!presentationXml) return Promise.resolve(DEFAULT_SLIDE_SIZE);

  return new Promise<SlideSize>((resolve) => {
    xml2js.parseString(
      presentationXml,
      { explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] },
      (err, result: { presentation?: { sldSz?: { $?: { cx?: string; cy?: string } } } }) => {
        if (err) {
          resolve(DEFAULT_SLIDE_SIZE);
          return;
        }
        const sldSz = result?.presentation?.sldSz?.$;
        const cx = Number(sldSz?.cx);
        const cy = Number(sldSz?.cy);
        if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0) {
          resolve(DEFAULT_SLIDE_SIZE);
          return;
        }
        resolve({ width: cx, height: cy });
      }
    );
  });
}

function buildNumberShape(options: NumberShapeOptions): string {
  const { number, width, height, position, shapeId } = options;

  let x: number;
  let alignment: "l" | "ctr" | "r";
  switch (position) {
    case "bottom-right":
      x = width - BOX_WIDTH - MARGIN;
      alignment = "r";
      break;
    case "bottom-center":
      x = Math.floor((width - BOX_WIDTH) / 2);
      alignment = "ctr";
      break;
    case "bottom-left":
    default:
      x = MARGIN;
      alignment = "l";
      break;
  }
  const y = height - BOX_HEIGHT - MARGIN;

  return (
    `<p:sp>` +
    `<p:nvSpPr>` +
    `<p:cNvPr id="${shapeId}" name="Slide Number ${number}"/>` +
    `<p:cNvSpPr/>` +
    `<p:nvPr/>` +
    `</p:nvSpPr>` +
    `<p:spPr>` +
    `<a:xfrm>` +
    `<a:off x="${x}" y="${y}"/>` +
    `<a:ext cx="${BOX_WIDTH}" cy="${BOX_HEIGHT}"/>` +
    `</a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `<a:noFill/>` +
    `<a:ln><a:noFill/></a:ln>` +
    `</p:spPr>` +
    `<p:txBody>` +
    `<a:bodyPr rtlCol="0" anchor="ctr"/>` +
    `<a:lstStyle/>` +
    `<a:p>` +
    `<a:pPr algn="${alignment}"/>` +
    `<a:r>` +
    `<a:rPr lang="en-US" sz="1600" dirty="0">` +
    `<a:solidFill><a:schemeClr val="tx1"/></a:solidFill>` +
    `</a:rPr>` +
    `<a:t>${number}</a:t>` +
    `</a:r>` +
    `</a:p>` +
    `</p:txBody>` +
    `</p:sp>`
  );
}

function nextShapeId(slideXml: string): number {
  let max = 0;
  const re = /id="(\d+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(slideXml)) !== null) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max + 1;
}

function injectNumberShape(
  slideXml: string,
  number: number,
  size: SlideSize,
  position: SlideNumberPosition
): string {
  const shape = buildNumberShape({
    number,
    width: size.width,
    height: size.height,
    position,
    shapeId: nextShapeId(slideXml),
  });

  const closeTag = "</p:spTree>";
  const closeIndex = slideXml.indexOf(closeTag);
  if (closeIndex !== -1) {
    return slideXml.slice(0, closeIndex) + shape + slideXml.slice(closeIndex);
  }

  const selfClosingIndex = slideXml.indexOf("<p:spTree/>");
  if (selfClosingIndex !== -1) {
    return (
      slideXml.slice(0, selfClosingIndex) +
      `<p:spTree>${shape}</p:spTree>` +
      slideXml.slice(selfClosingIndex + "<p:spTree/>".length)
    );
  }

  throw new Error("Could not locate the slide shape tree (spTree).");
}

function slideNumber(fileName: string): number {
  const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(fileName);
  return match ? Number(match[1]) : 0;
}

export class PptNumberSlidesService {
  static async addSlideNumbers(
    inputPath: string,
    outputPath: string,
    position: SlideNumberPosition,
    startNumber: number
  ): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

    const fileExists = await fs.pathExists(inputPath);
    if (!fileExists) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const inputBuffer = await fs.readFile(inputPath);

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(inputBuffer);
    } catch {
      throw new PptError(
        "INVALID_PPTX",
        "Invalid or corrupted PowerPoint file. Upload a valid .pptx file."
      );
    }

    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => slideNumber(a) - slideNumber(b));

    if (slideFiles.length === 0) {
      throw new PptError(
        "INVALID_PPTX",
        "Invalid or corrupted PowerPoint file. No slides were found inside the .pptx archive."
      );
    }

    const presentationXml = await zip
      .file("ppt/presentation.xml")
      ?.async("string");
    const size = await parseSlideSize(presentationXml);

    for (let i = 0; i < slideFiles.length; i++) {
      const slideXml = await zip.files[slideFiles[i]].async("string");
      const numbered = injectNumberShape(
        slideXml,
        startNumber + i,
        size,
        position
      );
      zip.file(slideFiles[i], numbered);
    }

    const outputBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    await fs.writeFile(outputPath, outputBuffer);

    const generated = await fs.pathExists(outputPath);
    if (!generated) {
      throw new Error(`Numbering finished but no file was generated at ${outputPath}.`);
    }

    return outputPath;
  }
}
