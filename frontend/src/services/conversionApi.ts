console.log("[conversionApi] import.meta.env.VITE_API_URL =", import.meta.env.VITE_API_URL);

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

console.log("[conversionApi] API_BASE_URL =", API_BASE_URL);

export type CompressionLevel = "low" | "medium" | "high";

export async function convertToPdf(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/api/convert`;
  console.log("[convertToPdf] fetch URL:", url);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[convertToPdf] fetch threw:", error);
    throw error;
  }

  console.log("[convertToPdf] response status:", response.status);

  if (!response.ok) {
    let message = `Conversion failed (${response.status})`;

    try {
      const bodyText = await response.text();
      console.log("[convertToPdf] response body:", bodyText);

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
  console.log("[convertToPdf] content-type:", contentType);

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
  console.log("[compressPdf] fetch URL:", url);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[compressPdf] fetch threw:", error);
    throw error;
  }

  console.log("[compressPdf] response status:", response.status);

  if (!response.ok) {
    let message = `Compression failed (${response.status})`;

    try {
      const bodyText = await response.text();
      console.log("[compressPdf] response body:", bodyText);

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
  console.log("[compressPdf] content-type:", contentType);

  if (!contentType.includes("application/pdf")) {
    throw new Error("Invalid response. Expected a PDF file.");
  }

  return response.blob();
}
