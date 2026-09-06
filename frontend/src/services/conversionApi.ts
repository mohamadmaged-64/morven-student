import { toNetworkError } from './apiError';
import { API_BASE } from './apiBase';

const API_BASE_URL = API_BASE;

export type CompressionLevel = "low" | "medium" | "high";

export type SlideNumberPosition = "bottom-right" | "bottom-center" | "bottom-left";

const PPTX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function convertToPdf(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/api/convert`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[convertToPdf] fetch threw:", error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `Conversion failed (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error("[convertToPdf] failed to read response body:", error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/pdf")) {
    throw new Error("Invalid response. Expected a PDF file.");
  }

  return response.blob();
}

export async function compressPdf(
  file: File,
  level: CompressionLevel = "medium",
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("level", level);

  const url = `${API_BASE_URL}/api/compress`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[compressPdf] fetch threw:", error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `Compression failed (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error("[compressPdf] failed to read response body:", error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/pdf")) {
    throw new Error("Invalid response. Expected a PDF file.");
  }

  return response.blob();
}

async function postPdfSecurity(
  tag: string,
  url: string,
  file: File,
  password: string,
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("password", password);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error(`[${tag}] fetch threw:`, error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `PDF operation failed (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error(`[${tag}] failed to read response body:`, error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/pdf")) {
    throw new Error("Invalid response. Expected a PDF file.");
  }

  return response.blob();
}

export async function protectPdf(file: File, password: string): Promise<Blob> {
  return postPdfSecurity(
    "protectPdf",
    `${API_BASE_URL}/api/protect`,
    file,
    password,
  );
}

export async function unlockPdf(file: File, password: string): Promise<Blob> {
  return postPdfSecurity(
    "unlockPdf",
    `${API_BASE_URL}/api/unlock`,
    file,
    password,
  );
}

export async function numberSlides(
  file: File,
  position: SlideNumberPosition = "bottom-right",
  startNumber: number = 1,
): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("position", position);
  formData.append("startNumber", String(startNumber));

  const url = `${API_BASE_URL}/api/ppt/number-slides`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[numberSlides] fetch threw:", error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `Failed to add slide numbers (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error("[numberSlides] failed to read response body:", error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes(PPTX_CONTENT_TYPE)) {
    throw new Error("Invalid response. Expected a PowerPoint file.");
  }

  return response.blob();
}

export async function generatePptFromText(
  title: string,
  text: string,
): Promise<Blob> {
  const url = `${API_BASE_URL}/api/ppt/generate-from-text`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text }),
    });
  } catch (error) {
    console.error("[generatePptFromText] fetch threw:", error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `Failed to generate presentation (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error("[generatePptFromText] failed to read response body:", error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes(PPTX_CONTENT_TYPE)) {
    throw new Error("Invalid response. Expected a PowerPoint file.");
  }

  return response.blob();
}

export async function generatePptFromPdf(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/api/ppt/generate-from-pdf`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[generatePptFromPdf] fetch threw:", error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `Failed to convert PDF to presentation (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error("[generatePptFromPdf] failed to read response body:", error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes(PPTX_CONTENT_TYPE)) {
    throw new Error("Invalid response. Expected a PowerPoint file.");
  }

  return response.blob();
}

export async function mergePowerPoint(files: File[]): Promise<Blob> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const url = `${API_BASE_URL}/api/ppt/merge`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[mergePowerPoint] fetch threw:", error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `Failed to merge presentations (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error("[mergePowerPoint] failed to read response body:", error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes(PPTX_CONTENT_TYPE)) {
    throw new Error("Invalid response. Expected a PowerPoint file.");
  }

  return response.blob();
}

export async function splitPowerPoint(file: File, ranges = ""): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("ranges", ranges);

  const url = `${API_BASE_URL}/api/ppt/split`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[splitPowerPoint] fetch threw:", error);
    throw toNetworkError("Could not reach the conversion server.", error);
  }

  if (!response.ok) {
    let message = `Failed to split presentation (${response.status})`;

    try {
      const bodyText = await response.text();

      try {
        const body = JSON.parse(bodyText);
        if (body.error) message = body.error;
      } catch {
        // body wasn't JSON — keep default message
      }
    } catch (error) {
      console.error("[splitPowerPoint] failed to read response body:", error);
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/zip")) {
    throw new Error("Invalid response. Expected a ZIP archive.");
  }

  return response.blob();
}
