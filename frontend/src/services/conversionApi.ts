const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function convertToPdf(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/convert`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("Network error. Is the backend running on port 3001?");
  }

  if (!response.ok) {
    let message = `Conversion failed (${response.status})`;

    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // response wasn't JSON — keep default message
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/pdf")) {
    throw new Error("Invalid response. Expected a PDF file.");
  }

  return response.blob();
}
