import path from "path";
import fs from "fs-extra";
import JSZip from "jszip";
import { PptError } from "./ppt-number-slides.service";

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

// Parts that are regenerated for every split package instead of copied.
const REGENERATED_PARTS = new Set([
  "[Content_Types].xml",
  "ppt/presentation.xml",
  "ppt/_rels/presentation.xml.rels",
]);

// Relationship types that are owned by a single slide and are dropped
// together with it.
const SLIDE_OWNED_TYPES = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentsExtensible",
]);

type RelEntry = {
  id: string;
  type: string;
  target: string;
  mode?: string;
};

type ContentTypes = {
  defaults: Map<string, string>;
  overrides: Map<string, string>;
};

function parseAttributes(element: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(element)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function parseRels(xml: string): RelEntry[] {
  const entries: RelEntry[] = [];
  const relRe = /<Relationship\b[^>]*?\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = relRe.exec(xml)) !== null) {
    const attrs = parseAttributes(match[0]);
    if (attrs.Id && attrs.Target) {
      entries.push({
        id: attrs.Id,
        type: attrs.Type,
        target: attrs.Target,
        mode: attrs.TargetMode,
      });
    }
  }
  return entries;
}

function serializeRels(entries: RelEntry[]): string {
  const body = entries
    .map((entry) => {
      const mode = entry.mode ? ` TargetMode="${entry.mode}"` : "";
      return `<Relationship Id="${entry.id}" Type="${entry.type}" Target="${entry.target}"${mode}/>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`
  );
}

function parseContentTypes(xml: string): ContentTypes {
  const defaults = new Map<string, string>();
  const overrides = new Map<string, string>();
  const elemRe = /<(Default|Override)\b[^>]*?\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = elemRe.exec(xml)) !== null) {
    const attrs = parseAttributes(match[0]);
    if (match[1] === "Default" && attrs.Extension && attrs.ContentType) {
      defaults.set(attrs.Extension.toLowerCase(), attrs.ContentType);
    } else if (match[1] === "Override" && attrs.PartName && attrs.ContentType) {
      overrides.set(attrs.PartName, attrs.ContentType);
    }
  }
  return { defaults, overrides };
}

function serializeContentTypes(
  defaults: Map<string, string>,
  overrides: Map<string, string>
): string {
  const defs = [...defaults.entries()]
    .map(([ext, ct]) => `<Default Extension="${ext}" ContentType="${ct}"/>`)
    .join("");
  const ovs = [...overrides.entries()]
    .map(([part, ct]) => `<Override PartName="${part}" ContentType="${ct}"/>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${defs}${ovs}</Types>`
  );
}

function decodePath(p: string): string {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

function resolveZipPath(fromDir: string, rel: string): string {
  const stack = fromDir ? fromDir.split("/").filter(Boolean) : [];
  for (const segment of rel.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") stack.pop();
    else stack.push(segment);
  }
  return stack.join("/");
}

function slideRelsPath(slidePath: string): string {
  const match = /^ppt\/slides\/([^/]+)$/.exec(slidePath);
  return match ? `ppt/slides/_rels/${match[1]}.rels` : "";
}

function partRelsPath(partPath: string): string {
  const slash = partPath.lastIndexOf("/");
  if (slash < 0) return `_rels/${partPath}.rels`;
  return `${partPath.slice(0, slash)}/_rels/${partPath.slice(slash + 1)}.rels`;
}

function isSlidePart(name: string): boolean {
  return /^ppt\/slides\/slide\d+\.xml$/.test(name);
}

async function getOrderedSlides(zip: JSZip): Promise<string[]> {
  const presXml = await zip.file("ppt/presentation.xml")?.async("string");
  if (!presXml) {
    throw new PptError(
      "INVALID_PPTX",
      "The file is missing the presentation part. Upload a valid .pptx file."
    );
  }

  const relsXml = await zip
    .file("ppt/_rels/presentation.xml.rels")
    ?.async("string");
  const rels = relsXml ? parseRels(relsXml) : [];
  const idToTarget = new Map(rels.map((rel) => [rel.id, rel.target]));

  const order: string[] = [];
  const listMatch = /<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/.exec(presXml);
  if (listMatch) {
    const idRe = /<p:sldId\b[^>]*r:id="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = idRe.exec(listMatch[1])) !== null) {
      const target = idToTarget.get(match[1]);
      if (target) {
        const absolute =
          target.startsWith("/") ? target.slice(1) : target;
        order.push(resolveZipPath("ppt", decodePath(absolute)));
      }
    }
  }

  // Fallback: include any slide part not already listed.
  for (const name of Object.keys(zip.files).sort()) {
    if (isSlidePart(name) && !order.includes(name)) order.push(name);
  }

  return order;
}

function parseRanges(expression: string, totalSlides: number): number[][] {
  const trimmed = expression.trim();
  if (!trimmed) {
    // Default: one file per slide.
    return Array.from({ length: totalSlides }, (_, i) => [i]);
  }

  const tokens = trimmed.split(",").map((v) => v.trim()).filter(Boolean);
  if (tokens.length === 0) {
    throw new PptError(
      "INVALID_PPTX",
      "Enter at least one slide or slide range."
    );
  }

  const groups: number[][] = [];
  const occupied = new Set<number>();

  for (const token of tokens) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(token);
    let indices: number[];
    if (rangeMatch) {
      const from = Number(rangeMatch[1]);
      const to = Number(rangeMatch[2]);
      if (from < 1 || to > totalSlides || from > to) {
        throw new PptError(
          "INVALID_PPTX",
          `Range "${token}" is invalid. Slides are numbered 1-${totalSlides}.`
        );
      }
      indices = [];
      for (let p = from; p <= to; p += 1) indices.push(p - 1);
    } else if (/^\d+$/.test(token)) {
      const slide = Number(token);
      if (slide < 1 || slide > totalSlides) {
        throw new PptError(
          "INVALID_PPTX",
          `Slide ${slide} is outside this presentation (1-${totalSlides}).`
        );
      }
      indices = [slide - 1];
    } else {
      throw new PptError(
        "INVALID_PPTX",
        `"${token}" is not a valid slide number or range.`
      );
    }

    for (const index of indices) {
      if (occupied.has(index)) {
        throw new PptError(
          "INVALID_PPTX",
          `Slide ${index + 1} appears in more than one range.`
        );
      }
      occupied.add(index);
    }
    groups.push(indices);
  }

  return groups;
}

async function collectDroppedParts(
  zip: JSZip,
  keptSlideSet: Set<string>
): Promise<Set<string>> {
  const dropped = new Set<string>();

  for (const name of Object.keys(zip.files)) {
    if (!isSlidePart(name) || keptSlideSet.has(name)) continue;
    dropped.add(name);
    const relsPath = slideRelsPath(name);
    if (relsPath && zip.files[relsPath]) dropped.add(relsPath);
  }

  // Parts owned by dropped slides (notes, comments, ...) are dropped too.
  for (const slidePath of Object.keys(zip.files)) {
    if (!isSlidePart(slidePath) || keptSlideSet.has(slidePath)) continue;
    const relsPath = slideRelsPath(slidePath);
    if (!relsPath || !zip.files[relsPath]) continue;
    const relsXml = await zip.files[relsPath].async("string");
    for (const rel of parseRels(relsXml)) {
      if (rel.mode === "External") continue;
      if (!SLIDE_OWNED_TYPES.has(rel.type)) continue;
      const absolute = resolveZipPath("ppt/slides", decodePath(rel.target));
      if (!zip.files[absolute]) continue;
      dropped.add(absolute);
      const ownedRels = partRelsPath(absolute);
      if (zip.files[ownedRels]) dropped.add(ownedRels);
    }
  }

  return dropped;
}

function filterSldIdLst(presXml: string, keptRids: Set<string>): string {
  const listMatch = /<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/.exec(presXml);
  if (!listMatch) return presXml;
  const keptInner = listMatch[1].replace(/<p:sldId\b[^>]*\/?>/g, (el) => {
    const match = /r:id="([^"]+)"/.exec(el);
    return match && keptRids.has(match[1]) ? el : "";
  });
  return presXml.replace(listMatch[0], `<p:sldIdLst>${keptInner}</p:sldIdLst>`);
}

async function buildSplitPart(
  zip: JSZip,
  keptPaths: string[]
): Promise<Buffer> {
  const keptSet = new Set(keptPaths);
  const dropped = await collectDroppedParts(zip, keptSet);

  // Which r:ids in the presentation rels still point at kept slides.
  const presRelsXml = await zip
    .file("ppt/_rels/presentation.xml.rels")
    ?.async("string");
  const presRels = presRelsXml ? parseRels(presRelsXml) : [];
  const ridToTarget = new Map(
    presRels.map((rel) => [
      rel.id,
      resolveZipPath("ppt", decodePath(rel.target)),
    ])
  );
  const keptRids = new Set<string>();
  for (const rel of presRels) {
    const absolute = resolveZipPath("ppt", decodePath(rel.target));
    if (keptSet.has(absolute)) keptRids.add(rel.id);
  }

  // presentation.xml: keep only the slide ids that survive.
  const presXml = await zip.file("ppt/presentation.xml")?.async("string");
  if (!presXml) {
    throw new PptError(
      "INVALID_PPTX",
      "The file is missing the presentation part. Upload a valid .pptx file."
    );
  }
  const newPresXml = filterSldIdLst(presXml, keptRids);

  // presentation.xml.rels: keep every relationship except those pointing
  // at dropped parts.
  const keptRels: RelEntry[] = [];
  for (const rel of presRels) {
    const absolute = resolveZipPath("ppt", decodePath(rel.target));
    if (rel.mode !== "External" && dropped.has(absolute)) continue;
    keptRels.push(rel);
  }

  // [Content_Types].xml: drop overrides for removed parts.
  const ctXml = await zip.file("[Content_Types].xml")?.async("string");
  const defaults = new Map<string, string>();
  const overrides = new Map<string, string>();
  if (ctXml) {
    const parsed = parseContentTypes(ctXml);
    for (const [ext, type] of parsed.defaults) defaults.set(ext, type);
    for (const [partName, type] of parsed.overrides) {
      const plain = decodePath(partName.replace(/^\//, ""));
      if (!dropped.has(plain)) overrides.set(partName, type);
    }
  }
  if (!defaults.has("rels")) {
    defaults.set(
      "rels",
      "application/vnd.openxmlformats-package.relationships+xml"
    );
  }
  if (!defaults.has("xml")) defaults.set("xml", "application/xml");

  const out = new JSZip();

  for (const name of Object.keys(zip.files)) {
    if (name.endsWith("/")) continue;
    if (dropped.has(name)) continue;
    if (REGENERATED_PARTS.has(name)) continue;
    const node = zip.files[name];
    out.file(name, await node.async("nodebuffer"));
  }

  out.file(
    "[Content_Types].xml",
    serializeContentTypes(defaults, overrides)
  );
  out.file("ppt/presentation.xml", newPresXml);
  out.file("ppt/_rels/presentation.xml.rels", serializeRels(keptRels));

  return out.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

function sanitizeBaseName(name: string): string {
  return name.replace(/[^\w\u0600-\u06FF -]+/g, "").trim().replace(/\s+/g, "-") || "presentation";
}

export class PptSplitService {
  static async split(
    inputPath: string,
    outputZipPath: string,
    ranges: string,
    baseName: string
  ): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

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

    const orderedSlides = await getOrderedSlides(zip);
    if (orderedSlides.length === 0) {
      throw new PptError(
        "INVALID_PPTX",
        "Invalid or corrupted PowerPoint file. No slides were found inside the .pptx archive."
      );
    }

    const groups = parseRanges(ranges, orderedSlides.length);

    const label = sanitizeBaseName(baseName);
    const archive = new JSZip();

    for (let i = 0; i < groups.length; i += 1) {
      const kept = groups[i].map((index) => orderedSlides[index]);
      const partBuffer = await buildSplitPart(zip, kept);
      archive.file(`${label}-part-${i + 1}.pptx`, partBuffer);
    }

    const archiveBuffer = await archive.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      mimeType: "application/zip",
    });

    await fs.writeFile(outputZipPath, archiveBuffer);

    const generated = await fs.pathExists(outputZipPath);
    if (!generated) {
      throw new Error(
        `Split finished but no archive was produced at ${outputZipPath}.`
      );
    }

    return outputZipPath;
  }
}
