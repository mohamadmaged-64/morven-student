import { toNetworkError } from './apiError';

console.log("[mediaApi] import.meta.env.VITE_API_URL =", import.meta.env.VITE_API_URL);

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// Must stay in sync with the backend limits (MAX_VIDEO_SIZE_MB env var).
export const MAX_VIDEO_SIZE_MB = Number(
  import.meta.env.VITE_MAX_VIDEO_SIZE_MB || 500
);

export const ACCEPTED_VIDEO_EXTENSIONS = [
  '.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v',
  '.wmv', '.flv', '.3gp', '.mpg', '.mpeg', '.ts', '.ogv',
];

export type AudioFormat = 'mp3' | 'wav' | 'm4a';
export type AudioQuality = 'high' | 'standard';
export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'mkv';
export type CompressionPreset = 'light' | 'medium' | 'strong';

export type MediaPhase = 'uploading' | 'processing' | 'downloading';

export interface MediaProgress {
  phase: MediaPhase;
  /** 0..100 when measurable; null means indeterminate. */
  percent: number | null;
}

export type MediaProgressHandler = (progress: MediaProgress) => void;

export interface MediaResult {
  blob: Blob;
  filename: string;
}

/** Backend error carrying a machine-readable code for Arabic mapping. */
export class MediaApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'MediaApiError';
    this.code = code;
  }
}

const OFFLINE_MESSAGE_AR =
  'أنت غير متصل بالإنترنت أو لا يمكن الوصول إلى خادم المعالجة. تتطلب معالجة الفيديو اتصالاً بالخادم.';

/**
 * Map backend error codes/messages to clear Arabic messages.
 * Raw technical details (FFmpeg stderr etc.) are never shown to users.
 */
export function toArabicMediaError(err: unknown): string {
  if (typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'NETWORK_ERROR') {
    return OFFLINE_MESSAGE_AR;
  }

  let code = '';
  let detail = '';
  if (err instanceof MediaApiError) {
    code = err.code;
    detail = err.message;
  } else if (err instanceof Error) {
    detail = err.message;
  } else if (typeof err === 'object' && err !== null) {
    const e = err as { code?: string; error?: string };
    code = e.code || '';
    detail = e.error || '';
  }

  switch (code) {
    case 'UNSUPPORTED_FILE_TYPE':
      return 'نوع الملف غير مدعوم. يرجى اختيار ملف فيديو صالح.';
    case 'FILE_TOO_LARGE':
      return `حجم الملف أكبر من الحد المسموح به (${MAX_VIDEO_SIZE_MB} ميغابايت).`;
    case 'INVALID_CONVERSION':
      return 'التحويل المطلوب غير مدعوم. تأكد من اختيار صيغة مختلفة عن صيغة الملف الحالية.';
    case 'PROCESSING_TIMEOUT':
      return 'استغرقت المعالجة وقتًا أطول من المسموح فتم إيقافها. جرّب ملفًا أصغر أو مستوى ضغط أخف.';
    case 'FFMPEG_NOT_AVAILABLE':
      return 'خدمة معالجة الفيديو غير متوفرة على الخادم حاليًا. حاول لاحقًا.';
    case 'STORAGE_ERROR':
      return 'لا توجد مساحة تخزين كافية على خادم المعالجة حاليًا.';
    case 'JOB_NOT_FOUND':
      return 'انتهت صلاحية مهمة المعالجة. يرجى إعادة المحاولة.';
    case 'JOB_PROCESSING':
      return 'ما زالت المعالجة جارية. انتظر حتى اكتمالها قبل التنزيل.';
  }

  if (detail.includes('corrupted')) {
    return 'يبدو أن ملف الفيديو تالف أو غير قابل للقراءة.';
  }
  if (detail.includes('no audio') || detail.includes('no audio track')) {
    return 'الملف لا يحتوي على مسار صوتي قابل للاستخراج.';
  }
  if (detail.includes('busy')) {
    return 'الخادم مشغول حاليًا بمعالجة ملفات أخرى. حاول بعد قليل.';
  }

  return 'حدث خطأ أثناء معالجة الملف. قد يكون الملف تالفًا أو بصيغة غير مدعومة.';
}

function parseDispositionFilename(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // fall through to plain parsing
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : fallback;
}

interface JobDonePayload {
  status: 'done';
  fileName?: string;
  originalSize?: number;
  outputSize?: number;
}

type JobStatusResponse =
  | { status: 'processing'; progress: number }
  | { status: 'error'; code: string; error: string }
  | JobDonePayload;

/** POST the upload via XHR so we get real byte-level upload progress. */
function startMediaJob(
  endpoint: string,
  file: File,
  fields: Record<string, string>,
  onProgress?: MediaProgressHandler,
  cancelRef?: { jobId?: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${endpoint}`);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          phase: 'uploading',
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      const body = (xhr.response || {}) as { jobId?: string; code?: string; error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && body.jobId) {
        if (cancelRef) cancelRef.jobId = body.jobId;
        resolve();
        return;
      }
      if (xhr.status === 0) {
        reject(toNetworkError(OFFLINE_MESSAGE_AR));
        return;
      }
      reject(new MediaApiError(body.code || 'PROCESSING_FAILED', body.error || `فشل بدء المعالجة (${xhr.status}).`));
    };

    xhr.onerror = () => reject(toNetworkError(OFFLINE_MESSAGE_AR));
    xhr.onabort = () => reject(toNetworkError(OFFLINE_MESSAGE_AR));

    const formData = new FormData();
    formData.append('file', file);
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    xhr.send(formData);
  });
}

const POLL_INTERVAL_MS = 1200;
const POLL_DEADLINE_MS = 25 * 60 * 1000;

/** Poll the job status endpoint, reporting REAL FFmpeg-derived progress. */
async function pollMediaJob(
  jobId: string,
  onProgress?: MediaProgressHandler
): Promise<JobDonePayload> {
  const deadline = Date.now() + POLL_DEADLINE_MS;
  let lastReported: number | null = -2;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/media/jobs/${encodeURIComponent(jobId)}/status`);
    } catch (error) {
      throw toNetworkError(OFFLINE_MESSAGE_AR, error);
    }

    let payload: JobStatusResponse;
    try {
      payload = (await response.json()) as JobStatusResponse;
    } catch {
      throw new MediaApiError('PROCESSING_FAILED', 'تعذر قراءة حالة المعالجة من الخادم.');
    }

    if (payload.status === 'error') {
      throw new MediaApiError(payload.code, payload.error);
    }

    if (payload.status === 'done') {
      return payload;
    }

    if (onProgress) {
      // progress < 0 means FFmpeg could not determine duration yet.
      const percent =
        payload.progress >= 0 ? Math.min(99, Math.round(payload.progress * 100)) : null;
      if (percent !== lastReported) {
        lastReported = percent;
        onProgress({ phase: 'processing', percent });
      }
    }
  }

  throw new MediaApiError('PROCESSING_TIMEOUT', 'انتهت مهلة انتظار المعالجة.');
}

/** Stream the finished file back, reporting real download progress. */
async function fetchMediaResult(
  jobId: string,
  fallbackName: string,
  onProgress?: MediaProgressHandler
): Promise<MediaResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/media/jobs/${encodeURIComponent(jobId)}/download`);
  } catch (error) {
    throw toNetworkError(OFFLINE_MESSAGE_AR, error);
  }

  if (!response.ok) {
    let code = 'PROCESSING_FAILED';
    let message = `تعذر تنزيل الناتج (${response.status}).`;
    try {
      const body = (await response.json()) as { code?: string; error?: string };
      if (body.code) code = body.code;
      if (body.error) message = body.error;
    } catch {
      // non-JSON error body
    }
    throw new MediaApiError(code, message);
  }

  const disposition = response.headers.get('content-disposition');
  const total = Number(response.headers.get('content-length')) || 0;

  let blob: Blob;
  if (response.body && total > 0 && onProgress) {
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value as unknown as BlobPart);
        received += value.byteLength;
        onProgress({
          phase: 'downloading',
          percent: Math.min(99, Math.round((received / total) * 100)),
        });
      }
    }
    onProgress({ phase: 'downloading', percent: 100 });
    blob = new Blob(chunks, { type: response.headers.get('content-type') || undefined });
  } else {
    blob = await response.blob();
    onProgress?.({ phase: 'downloading', percent: 100 });
  }

  return { blob, filename: parseDispositionFilename(disposition, fallbackName) };
}

async function runMediaOperation(
  endpoint: string,
  file: File,
  fields: Record<string, string>,
  fallbackName: string,
  onProgress?: MediaProgressHandler,
  cancelRef?: { jobId?: string }
): Promise<MediaResult> {
  onProgress?.({ phase: 'uploading', percent: 0 });
  await startMediaJob(endpoint, file, fields, onProgress, cancelRef);
  onProgress?.({ phase: 'uploading', percent: 100 });
  onProgress?.({ phase: 'processing', percent: null });
  const done = await pollMediaJob(cancelRef?.jobId || '', onProgress);
  const result = await fetchMediaResult(
    cancelRef?.jobId || '',
    done.fileName || fallbackName,
    onProgress
  );
  return result;
}

export async function extractAudioFromVideo(
  file: File,
  options: { format: AudioFormat; quality: AudioQuality },
  onProgress?: MediaProgressHandler,
  cancelRef?: { jobId?: string }
): Promise<MediaResult> {
  return runMediaOperation(
    '/api/media/extract-audio',
    file,
    { format: options.format, quality: options.quality },
    `${file.name.replace(/\.[^.]+$/, '')}-audio.${options.format}`,
    onProgress,
    cancelRef
  );
}

export async function compressVideoFile(
  file: File,
  preset: CompressionPreset,
  onProgress?: MediaProgressHandler,
  cancelRef?: { jobId?: string }
): Promise<MediaResult> {
  return runMediaOperation(
    '/api/media/compress-video',
    file,
    { preset },
    `${file.name.replace(/\.[^.]+$/, '')}-compressed.mp4`,
    onProgress,
    cancelRef
  );
}

export async function convertVideoFile(
  file: File,
  target: VideoFormat,
  onProgress?: MediaProgressHandler,
  cancelRef?: { jobId?: string }
): Promise<MediaResult> {
  return runMediaOperation(
    '/api/media/convert-video',
    file,
    { target },
    `${file.name.replace(/\.[^.]+$/, '')}-converted.${target}`,
    onProgress,
    cancelRef
  );
}

export async function cancelMediaJob(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/media/jobs/${encodeURIComponent(jobId)}`,
      { method: 'DELETE' }
    );
    return response.ok;
  } catch {
    return false;
  }
}
