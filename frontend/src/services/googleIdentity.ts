// ---------------------------------------------------------------------------
// Google Identity Services loader + credential helpers.
//
// Concerns this module owns (and only this module):
//   * Loading the GIS script exactly once (no duplicate loaders).
//   * Exposing the configured client id from VITE_GOOGLE_CLIENT_ID.
//   * Mapping backend auth errors (e.g. GOOGLE_EMAIL_EXISTS) to clear Arabic
//     messages for the UI.
//
// The actual request to POST /api/auth/google lives in authApi (reusing the
// Morven auth store/session system). This module stays UI-agnostic so it can
// be unit tested without a DOM.
// ---------------------------------------------------------------------------

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const GIS_GLOBAL = 'google';

const gisLoadState = { promise: null as Promise<typeof google> | null };

/**
 * Loads the official Google Identity Services script exactly once and returns
 * the `google.accounts` global. Rejects with an Error if the script fails to
 * load so callers can surface a clear Arabic message.
 */
export function loadGoogleIdentityScript(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('google-identity: no window'));
  }

  // Already loaded globally.
  if ((window as unknown as Record<string, unknown>)[GIS_GLOBAL]) {
    return Promise.resolve((window as unknown as Record<string, unknown>)[GIS_GLOBAL] as typeof google);
  }

  if (!gisLoadState.promise) {
    gisLoadState.promise = new Promise<typeof google>((resolve, reject) => {
      if (!document.querySelector(`script[src="${GIS_SRC}"]`)) {
        const script = document.createElement('script');
        script.src = GIS_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          const g = (window as unknown as Record<string, unknown>)[GIS_GLOBAL] as typeof google;
          if (g && g.accounts) resolve(g);
          else reject(new Error('google-identity: loaded script without google.accounts'));
        };
        script.onerror = () => {
          gisLoadState.promise = null; // allow a later retry
          reject(new Error('google-identity: failed to load'));
        };
        document.head.appendChild(script);
      } else {
        // Script tag exists but the global is not present yet; wait for it.
        let attempts = 0;
        const poll = window.setInterval(() => {
          const g = (window as unknown as Record<string, unknown>)[GIS_GLOBAL] as typeof google;
          if (g && g.accounts) {
            window.clearInterval(poll);
            resolve(g);
          } else if (++attempts > 50) {
            window.clearInterval(poll);
            gisLoadState.promise = null;
            reject(new Error('google-identity: timeout waiting for global'));
          }
        }, 100);
      }
    });
  }

  return gisLoadState.promise;
}

/** Returns the configured public Google Client ID, or null when unset. */
export function getGoogleClientId(): string | null {
  const value = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  return value && value.length > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// Backend error-code → Arabic message mapping (surfaces as `code` when the
// backend returns a structured response). Mirrors the backend's controlled
// non-merge linking behavior (no automatic account merge/link).
// ---------------------------------------------------------------------------

export const GOOGLE_BACKEND_CODES: Record<string, string> = {
  GOOGLE_EMAIL_EXISTS:
    'هذا البريد الإلكتروني مسجل بالفعل بحساب بكلمة مرور. يرجى تسجيل الدخول بكلمة المرور ثم ربط حساب Google من إعدادات الحساب.',
  GOOGLE_EMAIL_UNVERIFIED:
    'البريد الإلكتروني لحساب Google غير موثق. يرجى التحقق من بريدك الإلكتروني في Google ثم المحاولة مجدداً.',
};

type AuthApiError = Error & { code?: string };

/**
 * Maps a thrown error from `POST /api/auth/google` into a clear Arabic
 * message. The backend returns `{ error, code }` on structured failures;
 * `authApi.request` exposes the code as `error.code`.
 */
export function mapGoogleAuthError(err: unknown): string {
  const code = (err as AuthApiError | null)?.code;
  if (code && GOOGLE_BACKEND_CODES[code]) {
    return GOOGLE_BACKEND_CODES[code];
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'تعذر تسجيل الدخول عبر Google. يرجى المحاولة لاحقاً أو إعادة شحن الصفحة.';
}