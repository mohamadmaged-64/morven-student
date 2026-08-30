// ---------------------------------------------------------------------------
// API base URL resolution.
//
// PRODUCTION: same-origin. Vercel rewrites "/api/*" and "/uploads/*" to the
// Railway backend, so the app talks to "/api/..." on its own origin. This
// keeps auth cookies first-party (required for the CSRF double-submit + the
// httpOnly refresh-token flow) and avoids mixed content from an http backend.
//
// DEVELOPMENT/TEST: use VITE_API_URL, defaulting to the local backend.
// ---------------------------------------------------------------------------
const ENV_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '';

export const API_BASE = import.meta.env.PROD
  ? ''
  : ENV_URL || 'http://localhost:3001';