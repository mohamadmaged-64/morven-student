import path from "path";
import fs from "fs-extra";
import JSZip from "jszip";
import { PptError } from "./ppt-number-slides.service";

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

const SLIDE_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
const MASTER_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster";
const NOTES_MASTER_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster";
const THEME_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
const OFFICE_DOCUMENT_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";

// Parts that are rebuilt for the merged package instead of copied verbatim.
const GLOBAL_PARTS = new Set([
  "[Content_Types].xml",
  "_rels/.rels",
  "ppt/presentation.xml",
  "ppt/_rels/presentation.xml.rels",
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

type SourceInfo = {
  index: number;
  zip: JSZip;
  orderedSlides: string[];
  masters: string[];
  notesMasters: string[];
  themes: string[];
  renameMap: Map<string, string>;
  isFirst: boolean;
};

function isGlobalPart(name: string): boolean {
  return GLOBAL_PARTS.has(name);
}

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

function encodePath(p: string): string {
  return p
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
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

function relativeZipPath(fromDir: string, toPath: string): string {
  const from = fromDir ? fromDir.split("/").filter(Boolean) : [];
  const to = toPath.split("/").filter(Boolean);
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i += 1;
  const ups = from.length - i;
  const rest = to.slice(i).join("/");
  if (ups === 0) return rest;
  const prefix = Array(ups).fill("..").join("/");
  return rest ? `${prefix}/${rest}` : prefix;
}

// For a rels file like "ppt/slides/_rels/slide1.xml.rels", returns the
// directory its targets resolve against ("ppt/slides").
function relsPartDir(relsPath: string): string {
  const match = /^(.*?)\/_rels\/[^/]+\.rels$/.exec(relsPath);
  return match ? match[1] : "";
}

function slideRelsPath(slidePath: string): string {
  const match = /^ppt\/slides\/([^/]+)$/.exec(slidePath);
  return match ? `ppt/slides/_rels/${match[1]}.rels` : "";
}

function rewriteRelsTargets(
  xml: string,
  renameMap: Map<string, string>,
  partDir: string
): string {
  return xml.replace(/<Relationship\b[^>]*?\/?>/g, (element) => {
    if (/TargetMode="External"/.test(element)) return element;
    const targetMatch = /Target="([^"]*)"/.exec(element);
    if (!targetMatch) return element;
    const target = targetMatch[1];
    // Skip absolute URI targets.
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) return element;

    const absoluteOld = target.startsWith("/")
      ? decodePath(target.slice(1))
      : resolveZipPath(partDir, decodePath(target));
    const renamed = renameMap.get(absoluteOld);
    if (!renamed) return element;

    const newTarget = target.startsWith("/")
      ? `/${encodePath(renamed)}`
      : encodePath(relativeZipPath(partDir, renamed));
    return element.replace(targetMatch[0], `Target="${newTarget}"`);
  });
}

function listParts(zip: JSZip, dir: string, prefix: string): string[] {
  return Object.keys(zip.files)
    .filter(
      (name) =>
        name.startsWith(`${dir}/${prefix}`) &&
        name.endsWith(".xml") &&
        !name.includes("/_rels/")
    )
    .sort((a, b) => numberSuffix(a) - numberSuffix(b));
}

function numberSuffix(name: string): number {
  const match = /\d+/.exec(name);
  return match ? Number(match[0]) : 0;
}

async function getOrderedSlides(zip: JSZip): Promise<string[]> {
  const presXml = await zip.file("ppt/presentation.xml")?.async("string");
  if (!presXml) {
    throw new PptError(
      "INVALID_PPTX",
      "A file is missing the presentation part. Upload valid .pptx files."
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
  const slideRe = /^ppt\/slides\/slide\d+\.xml$/;
  for (const name of Object.keys(zip.files).sort()) {
    if (slideRe.test(name) && !order.includes(name)) order.push(name);
  }

  return order;
}

function buildRenameMap(
  info: SourceInfo,
  slideStartIndex: number
): Map<string, string> {
  const map = new Map<string, string>();

  // Slides get globally sequential names to preserve overall order.
  info.orderedSlides.forEach((slidePath, j) => {
    const global = slideStartIndex + j + 1;
    map.set(slidePath, `ppt/slides/slide${global}.xml`);
    const relsOld = slideRelsPath(slidePath);
    if (relsOld && info.zip.files[relsOld]) {
      map.set(relsOld, `ppt/slides/_rels/slide${global}.xml.rels`);
    }
  });

  // Every other part is prefixed with the source index to avoid collisions.
  // docProps are never prefixed: the first deck's docProps are kept under
  // their original names (root rels reference them), other decks' are dropped.
  for (const name of Object.keys(info.zip.files)) {
    if (name.endsWith("/")) continue;
    if (isGlobalPart(name)) continue;
    if (name.startsWith("docProps/")) continue;
    if (map.has(name)) continue;
    const slash = name.lastIndexOf("/");
    const newName =
      slash >= 0
        ? `${name.slice(0, slash + 1)}${info.index + 1}_${name.slice(slash + 1)}`
        : `${info.index + 1}_${name}`;
    map.set(name, newName);
  }

  return map;
}

async function copyParts(info: SourceInfo, out: JSZip): Promise<void> {
  for (const name of Object.keys(info.zip.files)) {
    if (name.endsWith("/")) continue;
    let newName = info.renameMap.get(name);
    if (!newName) {
      // First deck's docProps keep their original names and are copied as-is.
      if (info.isFirst && name.startsWith("docProps/")) newName = name;
      else continue;
    }
    const node = info.zip.files[name];
    if (name.endsWith(".rels")) {
      const xml = await node.async("string");
      const rewritten = rewriteRelsTargets(xml, info.renameMap, relsPartDir(name));
      out.file(newName, rewritten);
    } else {
      out.file(newName, await node.async("nodebuffer"));
    }
  }
}

function nextRelIdNumber(ids: string[]): number {
  let max = 0;
  for (const id of ids) {
    const match = /(\d+)$/.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function setElementInner(xml: string, tag: string, inner: string): string {
  const openTag = `<p:${tag}>`;
  const closeTag = `</p:${tag}>`;
  const selfTag = `<p:${tag}/>`;
  if (xml.includes(closeTag)) {
    const start = xml.indexOf(openTag) + openTag.length;
    const end = xml.indexOf(closeTag, start);
    return xml.slice(0, start) + inner + xml.slice(end);
  }
  if (xml.includes(selfTag)) {
    return xml.replace(
      selfTag,
      `<p:${tag}>${inner}</p:${tag}>`
    );
  }
  const endTag = "</p:presentation>";
  const idx = xml.indexOf(endTag);
  if (idx !== -1) {
    return xml.slice(0, idx) + `<p:${tag}>${inner}</p:${tag}>` + xml.slice(idx);
  }
  return xml;
}

function ensureNotesMasterIdLst(xml: string, inner: string): string {
  const tag = "notesMasterIdLst";
  const openTag = `<p:${tag}>`;
  const closeTag = `</p:${tag}>`;
  const rendered = inner ? `<p:${tag}>${inner}</p:${tag}>` : `<p:${tag}/>`;
  if (xml.includes(closeTag)) {
    const start = xml.indexOf(openTag) + openTag.length;
    const end = xml.indexOf(closeTag, start);
    return xml.slice(0, start) + inner + xml.slice(end);
  }
  if (xml.includes(`<p:${tag}/>`)) {
    return xml.replace(`<p:${tag}/>`, rendered);
  }
  const masterTag = /<p:sldMasterIdLst>/.exec(xml);
  if (masterTag) {
    return (
      xml.slice(0, masterTag.index) + rendered + xml.slice(masterTag.index)
    );
  }
  const endTag = "</p:presentation>";
  const idx = xml.indexOf(endTag);
  if (idx !== -1) {
    return xml.slice(0, idx) + rendered + xml.slice(idx);
  }
  return xml;
}

function stripEmbeddedFontLst(xml: string): string {
  return xml.replace(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/g, "");
}

export class PptMergeService {
  static async merge(inputPaths: string[], outputPath: string): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

    if (inputPaths.length < 2) {
      throw new PptError(
        "PROCESS_FAILED",
        "Provide at least two .pptx files to merge."
      );
    }

    const sources: SourceInfo[] = [];
    let slideStart = 0;

    for (let i = 0; i < inputPaths.length; i += 1) {
      const buffer = await fs.readFile(inputPaths[i]);

      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(buffer);
      } catch {
        throw new PptError(
          "INVALID_PPTX",
          `File ${i + 1} is invalid or corrupted. Upload valid .pptx files.`
        );
      }

      const orderedSlides = await getOrderedSlides(zip);
      if (orderedSlides.length === 0) {
        throw new PptError(
          "INVALID_PPTX",
          `File ${i + 1} does not contain any slides. Upload valid .pptx files.`
        );
      }

      const info: SourceInfo = {
        index: i,
        zip,
        orderedSlides,
        masters: listParts(zip, "ppt/slideMasters", "slideMaster"),
        notesMasters: listParts(zip, "ppt/notesMasters", "notesMaster"),
        themes: listParts(zip, "ppt/theme", "theme"),
        renameMap: new Map(),
        isFirst: i === 0,
      };
      info.renameMap = buildRenameMap(info, slideStart);
      slideStart += orderedSlides.length;
      sources.push(info);
    }

    const totalSlides = slideStart;
    const first = sources[0];

    // ---- Build the merged package ----
    const out = new JSZip();

    // Copy all parts (renamed) and rewrite per-part rels targets.
    for (const info of sources) {
      await copyParts(info, out);
    }

    // ---- Merged content types ----
    const mergedDefaults = new Map<string, string>();
    mergedDefaults.set("rels", "application/vnd.openxmlformats-package.relationships+xml");
    mergedDefaults.set("xml", "application/xml");
    const mergedOverrides = new Map<string, string>();

    for (const info of sources) {
      const ctXml = await info.zip.file("[Content_Types].xml")?.async("string");
      if (!ctXml) continue;
      const ct = parseContentTypes(ctXml);
      for (const [ext, type] of ct.defaults) {
        if (!mergedDefaults.has(ext)) mergedDefaults.set(ext, type);
      }
      for (const [partName, type] of ct.overrides) {
        const plain = decodePath(partName.replace(/^\//, ""));
        if (isGlobalPart(plain)) continue;
        if (!info.isFirst && plain.startsWith("docProps/")) continue;
        const renamed = info.renameMap.get(plain);
        if (renamed) {
          mergedOverrides.set(`/${renamed}`, type);
        } else {
          mergedOverrides.set(partName, type);
        }
      }
    }
    mergedOverrides.set(
      "/ppt/presentation.xml",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"
    );

    // ---- Merged presentation relationships ----
    const baseRelsXml = await first.zip
      .file("ppt/_rels/presentation.xml.rels")
      ?.async("string");
    const baseRels = baseRelsXml ? parseRels(baseRelsXml) : [];

    const pathToRId = new Map<string, string>();
    const mergedRels: RelEntry[] = [];

    for (const rel of baseRels) {
      if (rel.mode === "External") {
        mergedRels.push(rel);
        continue;
      }
      const absolute = resolveZipPath("ppt", decodePath(rel.target));
      const renamed = first.renameMap.get(absolute);
      if (!renamed) {
        mergedRels.push(rel);
        continue;
      }
      const entry: RelEntry = {
        ...rel,
        target: encodePath(relativeZipPath("ppt", renamed)),
      };
      mergedRels.push(entry);
      pathToRId.set(renamed, rel.id);
    }

    let nextId = nextRelIdNumber(mergedRels.map((rel) => rel.id));

    for (let i = 1; i < sources.length; i += 1) {
      const info = sources[i];
      for (const theme of info.themes) {
        const renamed = info.renameMap.get(theme);
        if (!renamed) continue;
        const id = `rId${nextId}`;
        nextId += 1;
        mergedRels.push({
          id,
          type: THEME_TYPE,
          target: encodePath(relativeZipPath("ppt", renamed)),
        });
        pathToRId.set(renamed, id);
      }
      for (const master of info.masters) {
        const renamed = info.renameMap.get(master);
        if (!renamed) continue;
        const id = `rId${nextId}`;
        nextId += 1;
        mergedRels.push({
          id,
          type: MASTER_TYPE,
          target: encodePath(relativeZipPath("ppt", renamed)),
        });
        pathToRId.set(renamed, id);
      }
      for (const notesMaster of info.notesMasters) {
        const renamed = info.renameMap.get(notesMaster);
        if (!renamed) continue;
        const id = `rId${nextId}`;
        nextId += 1;
        mergedRels.push({
          id,
          type: NOTES_MASTER_TYPE,
          target: encodePath(relativeZipPath("ppt", renamed)),
        });
        pathToRId.set(renamed, id);
      }
      for (const slide of info.orderedSlides) {
        const renamed = info.renameMap.get(slide);
        if (!renamed) continue;
        const id = `rId${nextId}`;
        nextId += 1;
        mergedRels.push({
          id,
          type: SLIDE_TYPE,
          target: encodePath(relativeZipPath("ppt", renamed)),
        });
        pathToRId.set(renamed, id);
      }
    }

    // ---- Merged presentation.xml ----
    let presXml = await first.zip.file("ppt/presentation.xml")?.async("string");
    if (!presXml) {
      throw new PptError(
        "INVALID_PPTX",
        "A file is missing the presentation part. Upload valid .pptx files."
      );
    }
    presXml = stripEmbeddedFontLst(presXml);

    let idCounter = 256;
    const sldIdEntries: string[] = [];
    for (const info of sources) {
      for (const slide of info.orderedSlides) {
        const renamed = info.renameMap.get(slide);
        const rid = renamed ? pathToRId.get(renamed) : undefined;
        if (!rid) continue;
        sldIdEntries.push(`<p:sldId id="${idCounter}" r:id="${rid}"/>`);
        idCounter += 1;
      }
    }
    presXml = setElementInner(presXml, "sldIdLst", sldIdEntries.join(""));

    const sldMasterEntries: string[] = [];
    for (const info of sources) {
      for (const master of info.masters) {
        const renamed = info.renameMap.get(master);
        const rid = renamed ? pathToRId.get(renamed) : undefined;
        if (!rid) continue;
        sldMasterEntries.push(`<p:sldMasterId id="${idCounter}" r:id="${rid}"/>`);
        idCounter += 1;
      }
    }
    presXml = setElementInner(presXml, "sldMasterIdLst", sldMasterEntries.join(""));

    const notesMasterEntries: string[] = [];
    for (const info of sources) {
      for (const notesMaster of info.notesMasters) {
        const renamed = info.renameMap.get(notesMaster);
        const rid = renamed ? pathToRId.get(renamed) : undefined;
        if (!rid) continue;
        notesMasterEntries.push(`<p:notesMasterId r:id="${rid}"/>`);
      }
    }
    presXml = ensureNotesMasterIdLst(presXml, notesMasterEntries.join(""));

    // ---- Merged root relationships ----
    const rootRelsXml = await first.zip.file("_rels/.rels")?.async("string");
    const rootRels = rootRelsXml ? parseRels(rootRelsXml) : [];
    const outRootRels: RelEntry[] = [];
    for (const rel of rootRels) {
      if (rel.mode === "External") {
        outRootRels.push(rel);
        continue;
      }
      const absolute = resolveZipPath("", decodePath(rel.target));
      if (absolute === "ppt/presentation.xml") {
        outRootRels.push({ ...rel, target: "ppt/presentation.xml" });
        continue;
      }
      if (absolute.startsWith("docProps/")) {
        // First deck's docProps are kept under their original names.
        if (first.zip.files[absolute]) outRootRels.push(rel);
        continue;
      }
      const renamed = first.renameMap.get(absolute);
      if (renamed) outRootRels.push({ ...rel, target: encodePath(renamed) });
    }
    if (
      !outRootRels.some((rel) => rel.type === OFFICE_DOCUMENT_TYPE)
    ) {
      outRootRels.unshift({
        id: "rId1",
        type: OFFICE_DOCUMENT_TYPE,
        target: "ppt/presentation.xml",
      });
    }

    // ---- Assemble ----
    out.file("_rels/.rels", serializeRels(outRootRels));
    out.file(
      "[Content_Types].xml",
      serializeContentTypes(mergedDefaults, mergedOverrides)
    );
    out.file("ppt/_rels/presentation.xml.rels", serializeRels(mergedRels));
    out.file("ppt/presentation.xml", presXml);

    const buffer = await out.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    await fs.writeFile(outputPath, buffer);

    const generated = await fs.pathExists(outputPath);
    if (!generated) {
      throw new Error(
        `Merge finished but no file was produced at ${outputPath}.`
      );
    }

    return outputPath;
  }
}
