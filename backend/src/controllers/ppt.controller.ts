import { Request, Response } from "express";
import path from "path";
import fs from "fs-extra";
import {
  PptNumberSlidesService,
  PptError,
  isSlideNumberPosition,
  type SlideNumberPosition,
} from "../services/ppt-number-slides.service";
import { PptGenerateFromTextService } from "../services/ppt-generate-from-text.service";
import { PptGenerateFromPdfService } from "../services/ppt-generate-from-pdf.service";
import { PptMergeService } from "../services/ppt-merge.service";
import { PptSplitService } from "../services/ppt-split.service";

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

export class PptController {
  static async numberSlides(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error:
          "No file uploaded. Send a PPTX file as multipart/form-data with key 'file'.",
      });
      return;
    }

    if (path.extname(req.file.originalname).toLowerCase() !== ".pptx") {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: "Unsupported file type. Only .pptx files are allowed.",
      });
      return;
    }

    const rawPosition = String(req.body?.position ?? "bottom-right").toLowerCase();
    if (!isSlideNumberPosition(rawPosition)) {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: "Invalid position. Allowed values: bottom-right, bottom-center, bottom-left.",
      });
      return;
    }
    const position: SlideNumberPosition = rawPosition;

    const rawStartNumber = String(req.body?.startNumber ?? "").trim();
    let startNumber = 1;
    if (rawStartNumber !== "") {
      if (!/^\d+$/.test(rawStartNumber)) {
        await fs.remove(req.file.path);
        res.status(400).json({
          error: "Invalid startNumber. Provide a positive whole number.",
        });
        return;
      }
      startNumber = Number(rawStartNumber);
      if (startNumber < 1) {
        await fs.remove(req.file.path);
        res.status(400).json({
          error: "Invalid startNumber. Provide a positive whole number.",
        });
        return;
      }
    }

    const filePath = req.file.path;
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputPptx = path.join(OUTPUT_DIR, `${baseName}-numbered.pptx`);

    try {
      await PptNumberSlidesService.addSlideNumbers(
        filePath,
        outputPptx,
        position,
        startNumber
      );

      const downloadName =
        path.basename(req.file.originalname, path.extname(req.file.originalname)) +
        "-numbered.pptx";

      res.download(outputPptx, downloadName, async (err) => {
        await Promise.allSettled([fs.remove(filePath), fs.remove(outputPptx)]);
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the processed file." });
        }
      });
    } catch (err) {
      await Promise.allSettled([fs.remove(filePath), fs.remove(outputPptx)]);
      if (err instanceof PptError && err.code === "INVALID_PPTX") {
        res.status(400).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "PPT processing failed";
      res.status(500).json({ error: message });
    }
  }

  static async generateFromText(req: Request, res: Response): Promise<void> {
    const title =
      typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!text) {
      res.status(400).json({
        error: "Missing text. Send a JSON body with a non-empty 'text' key.",
      });
      return;
    }

    const outputPptx = path.join(
      OUTPUT_DIR,
      `generate-${Date.now()}-${Math.round(Math.random() * 1e9)}.pptx`
    );

    try {
      await PptGenerateFromTextService.generateFromText(
        title,
        text,
        outputPptx
      );

      const slug = title
        .replace(/[^\w\u0600-\u06FF -]+/g, "")
        .trim()
        .replace(/\s+/g, "-");
      const downloadName = `${slug || "presentation"}.pptx`;

      res.download(outputPptx, downloadName, async (err) => {
        await fs.remove(outputPptx);
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the generated file." });
        }
      });
    } catch (err) {
      await fs.remove(outputPptx);
      if (err instanceof PptError) {
        res.status(500).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "PPT generation failed";
      res.status(500).json({ error: message });
    }
  }

  static async generateFromPdf(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error:
          "No file uploaded. Send a PDF file as multipart/form-data with key 'file'.",
      });
      return;
    }

    const isPdf =
      path.extname(req.file.originalname).toLowerCase() === ".pdf" ||
      (req.file.mimetype || "").includes("pdf");
    if (!isPdf) {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: "Unsupported file type. Only .pdf files are allowed.",
      });
      return;
    }

    const filePath = req.file.path;
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputPptx = path.join(OUTPUT_DIR, `${baseName}-presentation.pptx`);

    try {
      await PptGenerateFromPdfService.generateFromPdf(filePath, outputPptx);

      const downloadName =
        path.basename(req.file.originalname, path.extname(req.file.originalname)) +
        "-presentation.pptx";

      res.download(outputPptx, downloadName, async (err) => {
        await Promise.allSettled([fs.remove(filePath), fs.remove(outputPptx)]);
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the generated file." });
        }
      });
    } catch (err) {
      await Promise.allSettled([fs.remove(filePath), fs.remove(outputPptx)]);
      if (err instanceof PptError && err.code === "INVALID_PPTX") {
        res.status(400).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "PPT generation failed";
      res.status(500).json({ error: message });
    }
  }

  static async split(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error:
          "No file uploaded. Send a PPTX file as multipart/form-data with key 'file'.",
      });
      return;
    }

    if (path.extname(req.file.originalname).toLowerCase() !== ".pptx") {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: "Unsupported file type. Only .pptx files are allowed.",
      });
      return;
    }

    const filePath = req.file.path;
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputZip = path.join(
      OUTPUT_DIR,
      `split-${baseName}-${Date.now()}-${Math.round(Math.random() * 1e9)}.zip`
    );
    const ranges = typeof req.body?.ranges === "string" ? req.body.ranges : "";

    try {
      await PptSplitService.split(
        filePath,
        outputZip,
        ranges,
        path.basename(req.file.originalname, path.extname(req.file.originalname))
      );

      const downloadName =
        path.basename(req.file.originalname, path.extname(req.file.originalname)) +
        "-split.zip";

      res.download(outputZip, downloadName, async (err) => {
        await Promise.allSettled([fs.remove(filePath), fs.remove(outputZip)]);
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the split files." });
        }
      });
    } catch (err) {
      await Promise.allSettled([fs.remove(filePath), fs.remove(outputZip)]);
      if (err instanceof PptError && err.code === "INVALID_PPTX") {
        res.status(400).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "PPT split failed";
      res.status(500).json({ error: message });
    }
  }

  static async merge(req: Request, res: Response): Promise<void> {
    const files = (req.files ?? []) as Express.Multer.File[];
    const filePaths = files.map((f) => f.path);
    const outputPptx = path.join(
      OUTPUT_DIR,
      `merge-${Date.now()}-${Math.round(Math.random() * 1e9)}.pptx`
    );
    const cleanup = () =>
      Promise.allSettled([
        ...filePaths.map((p) => fs.remove(p)),
        fs.remove(outputPptx),
      ]);

    if (files.length < 2) {
      await Promise.allSettled(filePaths.map((p) => fs.remove(p)));
      res.status(400).json({
        error: "Upload at least two .pptx files to merge (field 'files').",
      });
      return;
    }

    const invalid = files.find(
      (f) => path.extname(f.originalname).toLowerCase() !== ".pptx"
    );
    if (invalid) {
      await Promise.allSettled(filePaths.map((p) => fs.remove(p)));
      res.status(400).json({
        error: "Unsupported file type. Only .pptx files are allowed.",
      });
      return;
    }

    try {
      await PptMergeService.merge(filePaths, outputPptx);

      res.download(outputPptx, "merged-presentation.pptx", async (err) => {
        await cleanup();
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the merged file." });
        }
      });
    } catch (err) {
      await cleanup();
      if (err instanceof PptError && err.code === "INVALID_PPTX") {
        res.status(400).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "PPT merge failed";
      res.status(500).json({ error: message });
    }
  }
}
