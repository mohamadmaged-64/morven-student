const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const res = await fetch(`${API_URL}${path}`, {
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

export function setAccessToken(token: string | null): void {
  // Stored in memory only — never persisted.
  (globalThis as Record<string, unknown>).__morven_access_token = token;
}

export function getAccessToken(): string | null {
  return ((globalThis as Record<string, unknown>).__morven_access_token as string) || null;
}

export async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

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
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
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
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
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
