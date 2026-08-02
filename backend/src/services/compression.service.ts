import { execFile } from "child_process";
import path from "path";
import fs from "fs-extra";

export type CompressionLevel = "low" | "medium" | "high";

const PDF_SETTINGS: Record<CompressionLevel, string> = {
  low: "/printer",
  medium: "/ebook",
  high: "/screen",
};

export function isCompressionLevel(value: string): value is CompressionLevel {
  return value === "low" || value === "medium" || value === "high";
}

function resolveWindowsGhostscript(): string {
  const programFiles = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    "C:\\Program Files",
    "C:\\Program Files (x86)",
  ].filter(Boolean) as string[];

  const candidates: string[] = [];
  for (const pf of programFiles) {
    const gsRoot = path.join(pf, "gs");
    if (!fs.existsSync(gsRoot)) continue;
    try {
      const versions = fs.readdirSync(gsRoot).sort().reverse();
      for (const version of versions) {
        candidates.push(path.join(gsRoot, version, "bin", "gswin64c.exe"));
        candidates.push(path.join(gsRoot, version, "bin", "gswin32c.exe"));
      }
    } catch {
      // Ignore unreadable Ghostscript version directories.
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "gswin64c";
}

const GHOSTSCRIPT_PATH =
  process.env.GHOSTSCRIPT_PATH ||
  (process.platform === "win32" ? resolveWindowsGhostscript() : "gs");
const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

export class CompressionService {
  static async isAvailable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      execFile(
        GHOSTSCRIPT_PATH,
        ["--version"],
        { timeout: 10000 },
        (error) => {
          resolve(!error);
        }
      );
    });
  }

  static async compressPdf(
    inputPath: string,
    outputPath: string,
    level: CompressionLevel = "medium"
  ): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

    const fileExists = await fs.pathExists(inputPath);
    if (!fileExists) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Promise<string>((resolve, reject) => {
      const args = [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        `-dPDFSETTINGS=${PDF_SETTINGS[level]}`,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${outputPath}`,
        inputPath,
      ];

      execFile(
        GHOSTSCRIPT_PATH,
        args,
        { timeout: 120000, maxBuffer: 10 * 1024 * 1024 },
        async (error, _stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                `Ghostscript compression failed: ${error.message}${stderr ? "\n" + stderr : ""}`
              )
            );
            return;
          }

          const generated = await fs.pathExists(outputPath);
          if (!generated) {
            reject(
              new Error(
                `Compression finished but PDF not found at ${outputPath}.`
              )
            );
            return;
          }

          resolve(outputPath);
        }
      );
    });
  }
}
