import { API_BASE } from './apiBase';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<{ data: T; res: Response }> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ غير متوقع');
  }

  return { data: data as T, res };
}

function parseCookies(res: Response): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookie = res.headers.getSetCookie?.();
  if (!setCookie) return cookies;
  for (const raw of setCookie) {
    const pair = raw.split(';')[0];
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[name] = value;
  }
  return cookies;
}

let csrfToken: string | null = null;

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)morven_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function resolveCsrfToken(): string | null {
  return csrfToken || getCsrfTokenFromCookie();
}

export function setAccessToken(token: string | null): void {
  // Stored in memory only — never persisted.
  (globalThis as Record<string, unknown>).__morven_access_token = token;
}

export function getAccessToken(): string | null {
  return ((globalThis as Record<string, unknown>).__morven_access_token as string) || null;
}

// ---------------------------------------------------------------------------
// Centralized 401 handling (H1)
//
// Access tokens are short-lived (15m) and stored only in memory. Every
// authenticated request must go through `authedFetch`, which transparently
// refreshes the access token (single-flight) and retries the original request
// once when it gets a 401 from an expired/invalid token. This keeps long
// sessions alive without a full page reload.
// ---------------------------------------------------------------------------

let tokenRotationHandler: (() => void) | null = null;

/** Register a callback fired whenever the access token is rotated (via refresh). */
export function setTokenRotationHandler(handler: (() => void) | null): void {
  tokenRotationHandler = handler;
}

function notifyTokenRotated(): void {
  tokenRotationHandler?.();
}

// Single-flight: only one refresh is ever in flight at a time. Concurrent 401s
// share the same refresh instead of spamming /api/auth/refresh.
let refreshPromise: Promise<boolean> | null = null;

/** Refreshes the access token once (single-flight). Resolves true if a fresh token is now available. */
function refreshAccessTokenSingleFlight(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refresh()
      .then(() => {
        notifyTokenRotated();
        return true;
      })
      .catch(() => {
        setAccessToken(null);
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Public wrapper for external consumers (e.g. the Socket.IO service) that need
 * a fresh access token on demand. Single-flight across all callers.
 */
export function refreshTokenIfNeeded(): Promise<boolean> {
  return refreshAccessTokenSingleFlight();
}

function buildAuthHeaders(existing: HeadersInit | undefined): Headers {
  const headers = new Headers(existing || {});
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

/**
 * Authenticated fetch with automatic 401 handling. On a 401 from an expired
 * access token it performs a single-flight token refresh and retries once.
 * Safe for multipart (FormData) bodies, which are reusable on retry.
 */
export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const perform = (): Promise<Response> =>
    fetch(input, {
      ...init,
      credentials: 'include',
      headers: buildAuthHeaders(init.headers),
    });

  let res = await perform();
  if (res.status === 401) {
    const refreshed = await refreshAccessTokenSingleFlight();
    if (refreshed) {
      res = await perform();
    }
  }
  return res;
}

export async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await authedFetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ غير متوقع');
  }

  return data as T;
}

export async function register(
  email: string,
  username: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const { data, res } = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password, displayName }),
  });
  setAccessToken(data.accessToken);
  const cookies = parseCookies(res);
  if (cookies['morven_csrf_token']) {
    csrfToken = cookies['morven_csrf_token'];
  }
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data, res } = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.accessToken);
  const cookies = parseCookies(res);
  if (cookies['morven_csrf_token']) {
    csrfToken = cookies['morven_csrf_token'];
  }
  return data;
}

export async function logout(): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = resolveCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    const { res } = await request('/api/auth/logout', { method: 'POST', headers });
    const cookies = parseCookies(res);
    if (cookies['morven_csrf_token'] === '') {
      csrfToken = null;
    }
  } finally {
    setAccessToken(null);
  }
}

export async function refresh(): Promise<AuthResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = resolveCsrfToken();
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  const { data, res } = await request<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
    headers,
  });
  setAccessToken(data.accessToken);
  const cookies = parseCookies(res);
  if (cookies['morven_csrf_token']) {
    csrfToken = cookies['morven_csrf_token'];
  }
  return data;
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const token = getAccessToken();
  if (!token) throw new Error('لا يوجد رمز وصول');

  return authRequest<{ user: AuthUser }>('/api/auth/me');
}
