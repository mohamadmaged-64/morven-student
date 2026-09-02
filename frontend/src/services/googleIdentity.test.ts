import { describe, it, expect } from 'vitest';
import { mapGoogleAuthError, GOOGLE_BACKEND_CODES } from './googleIdentity';

/**
 * googleIdentity — error mapping for Google Sign-In.
 * Verifies that backend error codes (e.g. GOOGLE_EMAIL_EXISTS) are surfaced as
 * clear Arabic messages with no real Google account involved.
 */

describe('mapGoogleAuthError', () => {
  it('maps a structured back-end code (GOOGLE_EMAIL_EXISTS) to a clear Arabic message', () => {
    const err = new Error('some backend error') as Error & { code?: string };
    err.code = 'GOOGLE_EMAIL_EXISTS';
    expect(mapGoogleAuthError(err)).toBe(GOOGLE_BACKEND_CODES.GOOGLE_EMAIL_EXISTS);
  });

  it('maps a structured back-end code (GOOGLE_EMAIL_UNVERIFIED) to a clear Arabic message', () => {
    const err = new Error('some backend error') as Error & { code?: string };
    err.code = 'GOOGLE_EMAIL_UNVERIFIED';
    expect(mapGoogleAuthError(err)).toBe(GOOGLE_BACKEND_CODES.GOOGLE_EMAIL_UNVERIFIED);
  });

  it('falls back to the error message when there is no known code', () => {
    const err = new Error('تعذر تسجيل الدخول عبر Google');
    expect(mapGoogleAuthError(err)).toBe('تعذر تسجيل الدخول عبر Google');
  });

  it('provides a generic Arabic fallback for unknown failures', () => {
    expect(mapGoogleAuthError(undefined)).toContain('Google');
    expect(mapGoogleAuthError(null)).toContain('Google');
  });
});