const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export function getBackendUrl(): string {
  return (import.meta.env.VITE_API_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}