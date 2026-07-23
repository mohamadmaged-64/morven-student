import { execFile } from "child_process";
import path from "path";
import fs from "fs-extra";

const LIBREOFFICE_PATH =
  process.env.LIBREOFFICE_PATH ||
  (process.platform === "win32"
    ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
    : "soffice");
const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

export class ConversionService {
  static async convertToPdf(inputPath: string): Promise<string> {
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const outputPdf = path.join(OUTPUT_DIR, `${fileName}.pdf`);

    await fs.ensureDir(OUTPUT_DIR);

    const exists = await fs.pathExists(LIBREOFFICE_PATH);
    if (!exists) {
      throw new Error(
        `LibreOffice not found at ${LIBREOFFICE_PATH}. Install LibreOffice or set LIBREOFFICE_PATH in .env.`
      );
    }

    const fileExists = await fs.pathExists(inputPath);
    if (!fileExists) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Promise<string>((resolve, reject) => {
      const args = [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        OUTPUT_DIR,
        inputPath,
      ];

      execFile(
        LIBREOFFICE_PATH,
        args,
        { timeout: 60000 },
        async (error, _stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                `LibreOffice conversion failed: ${error.message}${stderr ? "\n" + stderr : ""}`
              )
            );
            return;
          }

          const generated = await fs.pathExists(outputPdf);
          if (!generated) {
            reject(
              new Error(
                `Conversion finished but PDF not found at ${outputPdf}. The document may be unsupported.`
              )
            );
            return;
          }

          resolve(outputPdf);
        }
      );
    });
  }
}
