import path from "path";
import fs from "fs-extra";
import PptxGenJS from "pptxgenjs";
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

const MAX_BULLETS_PER_SLIDE = 6;
const MAX_BULLET_CHARS = 220;

const ARABIC_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

type Section = { title: string; bullets: string[] };

type PlannedSlide = {
  kind: "title" | "section";
  heading: string;
  bullets: string[];
};

function isRtlText(text: string): boolean {
  return ARABIC_RE.test(text);
}

function stripMarkers(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^[-*•\u2022]\s*/, "")
    .trim();
}

function parseSections(content: string): Section[] {
  return content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const title = stripMarkers(lines[0] || "") || "Untitled Slide";
      const bullets = lines.slice(1).map(stripMarkers).filter(Boolean);
      return { title, bullets };
    });
}

function chunkText(text: string, maxChars: number): string[] {
  const parts = text
    .split(/(?<=[.!?؟!،;:])\s+/)
    .flatMap((part) =>
      part.length > maxChars
        ? part.split(/(?<=[,،])\s+/).filter(Boolean)
        : [part]
    );

  const chunks: string[] = [];
  let current = "";

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (current.length + part.length + 1 <= maxChars) {
      current = current ? `${current} ${part}` : part;
      continue;
    }
    if (current) chunks.push(current);
    if (part.length <= maxChars) {
      current = part;
      continue;
    }
    // Hard-split an over-long part on word boundaries.
    let remaining = part;
    while (remaining.length > maxChars) {
      let cut = remaining.lastIndexOf(" ", maxChars);
      if (cut < maxChars / 2) cut = maxChars;
      const piece = remaining.slice(0, cut).trim();
      if (piece) chunks.push(piece);
      remaining = remaining.slice(cut).trim();
    }
    current = remaining;
  }

  if (current) chunks.push(current);
  return chunks;
}

function buildSlidePlan(title: string, sections: Section[]): PlannedSlide[] {
  const plan: PlannedSlide[] = [];

  if (title) {
    const count = sections.length;
    plan.push({
      kind: "title",
      heading: title,
      bullets:
        count > 0
          ? [count === 1 ? "1 Section" : `${count} Sections`]
          : [],
    });
  }

  for (const section of sections) {
    const bullets: string[] = [];
    for (const bullet of section.bullets) {
      bullets.push(...chunkText(bullet, MAX_BULLET_CHARS));
    }

    if (bullets.length === 0) {
      plan.push({ kind: "section", heading: section.title, bullets: [] });
      continue;
    }

    for (let i = 0; i < bullets.length; i += MAX_BULLETS_PER_SLIDE) {
      plan.push({
        kind: "section",
        heading: section.title,
        bullets: bullets.slice(i, i + MAX_BULLETS_PER_SLIDE),
      });
    }
  }

  return plan;
}

export class PptGenerateFromTextService {
  static async generateFromText(
    title: string,
    content: string,
    outputPath: string
  ): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

    const sections = parseSections(content);
    if (sections.length === 0) {
      throw new PptError(
        "PROCESS_FAILED",
        "No slide content found. Provide text separated by blank lines."
      );
    }

    const plan = buildSlidePlan(title, sections);
    if (plan.length === 0) {
      throw new PptError(
        "PROCESS_FAILED",
        "Could not build any slides from the provided text."
      );
    }

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT });
    pptx.layout = "WIDE";
    pptx.author = "Morven Student";
    pptx.title = title || "Generated Presentation";
    pptx.subject = "Generated from text by Morven Student";

    let slideNumber = 0;

    for (const slide of plan) {
      slideNumber += 1;
      const s = pptx.addSlide();
      s.background = { color: WHITE };

      if (slide.kind === "title") {
        renderTitleSlide(s, slide.heading, slide.bullets[0] ?? "");
      } else {
        renderSectionSlide(s, slide.heading, slide.bullets, slideNumber);
      }
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

function renderTitleSlide(
  slide: PptxGenJS.Slide,
  title: string,
  subtitle: string
): void {
  // Top accent band.
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: LAYOUT_WIDTH,
    h: 0.14,
    fill: { color: ACCENT },
  });

  slide.addText(title, {
    x: 1,
    y: 2.2,
    w: LAYOUT_WIDTH - 2,
    h: 1.8,
    align: "center",
    valign: "middle",
    bold: true,
    fontSize: 40,
    fontFace: BASE_FONT,
    color: ACCENT,
    rtlMode: isRtlText(title),
    lang: isRtlText(title) ? "ar-SA" : "en-US",
    wrap: true,
    shrinkText: true,
  });

  slide.addShape("rect", {
    x: LAYOUT_WIDTH / 2 - 1,
    y: 4.15,
    w: 2,
    h: 0.06,
    fill: { color: ACCENT_SOFT },
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 1,
      y: 4.4,
      w: LAYOUT_WIDTH - 2,
      h: 0.8,
      align: "center",
      valign: "middle",
      fontSize: 18,
      fontFace: BASE_FONT,
      color: TEXT_MUTED,
      rtlMode: isRtlText(subtitle),
      lang: isRtlText(subtitle) ? "ar-SA" : "en-US",
      wrap: true,
    });
  }
}

function renderSectionSlide(
  slide: PptxGenJS.Slide,
  heading: string,
  bullets: string[],
  slideNumber: number
): void {
  // Top accent band.
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: LAYOUT_WIDTH,
    h: 0.14,
    fill: { color: ACCENT },
  });

  slide.addText(heading, {
    x: 0.7,
    y: 0.55,
    w: LAYOUT_WIDTH - 1.4,
    h: 1.0,
    align: "left",
    valign: "middle",
    bold: true,
    fontSize: 28,
    fontFace: BASE_FONT,
    color: ACCENT,
    rtlMode: isRtlText(heading),
    lang: isRtlText(heading) ? "ar-SA" : "en-US",
    wrap: true,
    shrinkText: true,
  });

  slide.addShape("rect", {
    x: 0.7,
    y: 1.6,
    w: LAYOUT_WIDTH - 1.4,
    h: 0.03,
    fill: { color: ACCENT_SOFT },
  });

  if (bullets.length > 0) {
    const runs: PptxGenJS.TextProps[] = bullets.map((bullet) => {
      const rtl = isRtlText(bullet);
      return {
        text: bullet,
        options: {
          breakLine: true,
          bullet: { characterCode: "2022", indent: 14 },
          paraSpaceAfter: 12,
          fontSize: 18,
          fontFace: BASE_FONT,
      color: TEXT_DARK,
      rtlMode: rtl,
      lang: rtl ? "ar-SA" : "en-US",
          align: rtl ? "right" : "left",
          wrap: true,
        },
      };
    });

    slide.addText(runs, {
      x: 0.9,
      y: 1.9,
      w: LAYOUT_WIDTH - 1.8,
      h: LAYOUT_HEIGHT - 3.2,
      valign: "top",
    });
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
  slide.addText(String(slideNumber), {
    x: LAYOUT_WIDTH - 1.4,
    y: LAYOUT_HEIGHT - 0.55,
    w: 0.7,
    h: 0.4,
    align: "right",
    fontSize: 10,
    fontFace: BASE_FONT,
    color: TEXT_MUTED,
  });
}
