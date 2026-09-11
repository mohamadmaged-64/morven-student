// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authRequest, setAccessToken, getAccessToken, refreshTokenIfNeeded } from './authApi';

/**
 * H1 — centralized 401 handling (single-flight token refresh + retry).
 *
 * Verifies that an expired access token is transparently refreshed (once) and
 * the original request is retried, and that concurrent 401s share a single
 * refresh instead of hammering /api/auth/refresh.
 */

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  const h = new Headers({ 'Content-Type': 'application/json', ...headers });
  return new Response(JSON.stringify(body), { status, headers: h });
}

const REFRESH_URL = '/api/auth/refresh';

describe('authApi centralized 401 handling', () => {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ error: 'unexpected' })));

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('expired-access-token');
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('refreshes the token and retries once on a 401 from an expired access token', async () => {
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes(REFRESH_URL)) {
        return Promise.resolve(
          jsonResponse(
            {
              user: { id: 'u1' },
              accessToken: 'fresh-access-token',
            },
            200,
            { 'Set-Cookie': 'morven_csrf_token=freshcsrf; Path=/' },
          ),
        );
      }
      if (url.includes('/api/kittens')) {
        if (getAccessToken() === 'expired-access-token') {
          return Promise.resolve(jsonResponse({ error: 'رمز الوصول غير صالح أو منتهي الصلاحية' }, 401));
        }
        return Promise.resolve(jsonResponse({ ok: true, token: getAccessToken() }));
      }
      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });

    const result = await authRequest<{ ok: boolean; token: string | null }>('/api/kittens');

    expect(result.ok).toBe(true);
    expect(result.token).toBe('fresh-access-token'); // retried with the new token
    expect(getAccessToken()).toBe('fresh-access-token');
    // One refresh + two attempts of the protected call (first 401, then retried).
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes(REFRESH_URL))).toHaveLength(1);
  });

  it('does NOT retry when a 401 cannot be refreshed (no valid refresh session)', async () => {
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes(REFRESH_URL)) {
        return Promise.resolve(jsonResponse({ error: 'رمز التحديث غير صالح' }, 401));
      }
      if (url.includes('/api/kittens')) {
        return Promise.resolve(jsonResponse({ error: 'غير مصرح' }, 401));
      }
      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    });

    let threw = false;
    try {
      await authRequest<unknown>('/api/kittens');
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(getAccessToken()).toBeNull(); // token cleared on hard failure
  });

  it('is single-flight: concurrent 401s trigger exactly one refresh', async () => {
    let refreshCalls = 0;
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes(REFRESH_URL)) {
        refreshCalls += 1;
        return Promise.resolve(
          jsonResponse({ user: { id: 'u1' }, accessToken: 'fresh-token-after-singleflight' }, 200),
        );
      }
      const token = getAccessToken();
      if (token === 'expired-access-token') {
        return Promise.resolve(jsonResponse({ error: 'expired' }, 401));
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    const [a, b] = await Promise.all([
      authRequest<{ ok: boolean }>('/api/a'),
      authRequest<{ ok: boolean }>('/api/b'),
    ]);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(refreshCalls).toBe(1); // single flight — one refresh despite two 401s
  });

  it('refreshTokenIfNeeded resolves true with a fresh token available', async () => {
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes(REFRESH_URL)) {
        return Promise.resolve(
          jsonResponse({ user: { id: 'u1' }, accessToken: 'refreshed-via-helper' }, 200),
        );
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    const ok = await refreshTokenIfNeeded();
    expect(ok).toBe(true);
    expect(getAccessToken()).toBe('refreshed-via-helper');
  });
});
