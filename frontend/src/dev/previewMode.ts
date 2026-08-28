/**
 * DEV-ONLY: UI Preview Mode
 *
 * This module controls a development-only preview mode that allows
 * inspecting the Morven Connect UI without a running backend.
 *
 * How to enable:
 *   - Add ?preview=true to any URL in dev mode
 *   - Or run: localStorage.setItem('morven_preview', '1') in dev tools
 *
 * How to disable:
 *   - Remove the query param or localStorage key
 *   - Or navigate to any URL without ?preview=true
 *
 * This file is ONLY imported in development builds. In production,
 * import.meta.env.DEV is always false, so all checks short-circuit.
 */

const PREVIEW_STORAGE_KEY = 'morven_preview';

/** Returns true only when import.meta.env.DEV is true AND preview is requested. */
export function isPreviewMode(): boolean {
  if (!import.meta.env.DEV) return false;

  // Check URL query param
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'true') {
      // Persist so it works across client-side navigations
      try { localStorage.setItem(PREVIEW_STORAGE_KEY, '1'); } catch { /* noop */ }
      return true;
    }

    // Check localStorage
    try {
      if (localStorage.getItem(PREVIEW_STORAGE_KEY) === '1') return true;
    } catch { /* noop */ }
  }

  return false;
}
