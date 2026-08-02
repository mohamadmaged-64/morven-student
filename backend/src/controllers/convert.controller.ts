import { Request, Response } from "express";
import path from "path";
import fs from "fs-extra";
import { ConversionService } from "../services/conversion.service";

const ALLOWED_EXTENSIONS = new Set([
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
]);

function isAllowedFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export class ConvertController {
  static async convert(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error: "No file uploaded. Send a file as multipart/form-data with key 'file'.",
      });
      return;
    }

    if (!isAllowedFile(req.file.originalname)) {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: `Unsupported file type. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`,
      });
      return;
    }

    const filePath = req.file.path;

    try {
      const pdfPath = await ConversionService.convertToPdf(filePath);

      res.download(pdfPath, path.basename(pdfPath), async (err) => {
        await Promise.allSettled([fs.remove(filePath)]);
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the converted file." });
        }
      });
    } catch (err) {
      await Promise.allSettled([fs.remove(filePath)]);
      const message = err instanceof Error ? err.message : "Conversion failed";
      const isNotFound =
        message.includes("not found") || message.includes("not found at");
      res.status(isNotFound ? 404 : 500).json({ error: message });
    }
  }
}
