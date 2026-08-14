export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

export class ApiError extends Error {
  code: string;
  cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.cause = cause;
  }
}

export function isNetworkError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  return (err as { code?: unknown }).code === NETWORK_ERROR_CODE;
}

export function toNetworkError(message: string, cause?: unknown): ApiError {
  return new ApiError(NETWORK_ERROR_CODE, message, cause);
}
