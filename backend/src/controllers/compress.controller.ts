import { Request, Response } from "express";
import path from "path";
import fs from "fs-extra";
import {
  CompressionService,
  isCompressionLevel,
  type CompressionLevel,
} from "../services/compression.service";

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

export class CompressController {
  static async compress(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error: "No file uploaded. Send a PDF file as multipart/form-data with key 'file'.",
      });
      return;
    }

    if (path.extname(req.file.originalname).toLowerCase() !== ".pdf") {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: "Unsupported file type. Only PDF files are allowed.",
      });
      return;
    }

    const rawLevel = String(req.body?.level ?? "medium").toLowerCase();
    if (!isCompressionLevel(rawLevel)) {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: "Invalid compression level. Allowed values: low, medium, high.",
      });
      return;
    }
    const level: CompressionLevel = rawLevel;

    const filePath = req.file.path;
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputPdf = path.join(OUTPUT_DIR, `${baseName}-compressed.pdf`);

    try {
      const available = await CompressionService.isAvailable();
      if (!available) {
        await Promise.allSettled([fs.remove(filePath), fs.remove(outputPdf)]);
        res.status(503).json({
          error: "PDF compression is not available. Ghostscript is not installed on the server.",
        });
        return;
      }

      await CompressionService.compressPdf(filePath, outputPdf, level);

      const downloadName =
        path.basename(req.file.originalname, path.extname(req.file.originalname)) +
        "-compressed.pdf";

      res.download(outputPdf, downloadName, async (err) => {
        await Promise.allSettled([fs.remove(filePath), fs.remove(outputPdf)]);
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the compressed file." });
        }
      });
    } catch (err) {
      await Promise.allSettled([fs.remove(filePath), fs.remove(outputPdf)]);
      const message = err instanceof Error ? err.message : "Compression failed";
      res.status(500).json({ error: message });
    }
  }
}
