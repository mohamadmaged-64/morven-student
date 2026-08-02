import { Request, Response } from "express";
import path from "path";
import fs from "fs-extra";
import {
  PdfSecurityService,
  PdfSecurityError,
} from "../services/pdf-security.service";

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

type SecurityMode = "protect" | "unlock";

export class PdfSecurityController {
  static protect(req: Request, res: Response): Promise<void> {
    return PdfSecurityController.process(req, res, "protect");
  }

  static unlock(req: Request, res: Response): Promise<void> {
    return PdfSecurityController.process(req, res, "unlock");
  }

  private static async process(
    req: Request,
    res: Response,
    mode: SecurityMode
  ): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error:
          "No file uploaded. Send a PDF file as multipart/form-data with key 'file'.",
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

    const password = String(req.body?.password ?? "");
    if (!password) {
      await fs.remove(req.file.path);
      res.status(400).json({
        error: "Password is required.",
      });
      return;
    }

    const filePath = req.file.path;
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputPdf = path.join(OUTPUT_DIR, `${baseName}-${mode}.pdf`);

    try {
      const available = await PdfSecurityService.isAvailable();
      if (!available) {
        await Promise.allSettled([fs.remove(filePath), fs.remove(outputPdf)]);
        res.status(503).json({
          error:
            "PDF security operations are not available. qpdf is not installed on the server.",
        });
        return;
      }

      if (mode === "protect") {
        await PdfSecurityService.protectPdf(filePath, outputPdf, password);
      } else {
        await PdfSecurityService.unlockPdf(filePath, outputPdf, password);
      }

      const originalBase = path.basename(
        req.file.originalname,
        path.extname(req.file.originalname)
      );
      const downloadName = `${originalBase}-${
        mode === "protect" ? "protected" : "unlocked"
      }.pdf`;

      res.download(outputPdf, downloadName, async (err) => {
        await Promise.allSettled([fs.remove(filePath), fs.remove(outputPdf)]);
        if (err && !res.headersSent) {
          res.status(500).json({ error: "Failed to send the processed file." });
        }
      });
    } catch (err) {
      await Promise.allSettled([fs.remove(filePath), fs.remove(outputPdf)]);
      if (err instanceof PdfSecurityError && err.code === "INVALID_PASSWORD") {
        res.status(400).json({ error: err.message });
        return;
      }
      const message =
        err instanceof Error ? err.message : "PDF processing failed";
      res.status(500).json({ error: message });
    }
  }
}
