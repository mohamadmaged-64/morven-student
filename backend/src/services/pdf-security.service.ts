import { execFile } from "child_process";
import path from "path";
import fs from "fs-extra";

const QPDF_PATH = process.env.QPDF_PATH || "qpdf";
const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

export type PdfSecurityErrorCode =
  | "INVALID_PASSWORD"
  | "PROCESS_FAILED";

export class PdfSecurityError extends Error {
  readonly code: PdfSecurityErrorCode;

  constructor(code: PdfSecurityErrorCode, message: string) {
    super(message);
    this.name = "PdfSecurityError";
    this.code = code;
  }
}

export class PdfSecurityService {
  static async isAvailable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      execFile(
        QPDF_PATH,
        ["--version"],
        { timeout: 10000 },
        (error) => {
          resolve(!error);
        }
      );
    });
  }

  static async protectPdf(
    inputPath: string,
    outputPath: string,
    password: string
  ): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

    const fileExists = await fs.pathExists(inputPath);
    if (!fileExists) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const args = [
      "--encrypt",
      password,
      password,
      "256",
      "--",
      inputPath,
      outputPath,
    ];

    return this.runQpdf(args, outputPath);
  }

  static async unlockPdf(
    inputPath: string,
    outputPath: string,
    password: string
  ): Promise<string> {
    await fs.ensureDir(OUTPUT_DIR);

    const fileExists = await fs.pathExists(inputPath);
    if (!fileExists) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const args = [
      `--password=${password}`,
      "--decrypt",
      inputPath,
      outputPath,
    ];

    return this.runQpdf(args, outputPath, { passwordProtected: true });
  }

  private static runQpdf(
    args: string[],
    outputPath: string,
    opts?: { passwordProtected?: boolean }
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      execFile(
        QPDF_PATH,
        args,
        { timeout: 120000, maxBuffer: 10 * 1024 * 1024 },
        async (error, _stdout, stderr) => {
          if (error) {
            const detail = `${error.message}${stderr ? "\n" + stderr : ""}`;

            if (
              opts?.passwordProtected &&
              /invalid password|incorrect password|password is incorrect|not the password/i.test(
                detail
              )
            ) {
              reject(
                new PdfSecurityError(
                  "INVALID_PASSWORD",
                  "Incorrect password. The file could not be unlocked."
                )
              );
              return;
            }

            // qpdf exits with 3 when the operation succeeded but produced warnings.
            if (typeof error.code === "number" && error.code === 3) {
              const generated = await fs.pathExists(outputPath);
              if (generated) {
                resolve(outputPath);
                return;
              }
            }

            reject(
              new PdfSecurityError(
                "PROCESS_FAILED",
                `qpdf operation failed: ${detail}`
              )
            );
            return;
          }

          const generated = await fs.pathExists(outputPath);
          if (!generated) {
            reject(
              new PdfSecurityError(
                "PROCESS_FAILED",
                `qpdf finished but no PDF was generated at ${outputPath}.`
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
