/**
 * DEV-ONLY: Preview mode banner component.
 * Shows a visible indicator that UI Preview Mode is active.
 */

import { useState } from 'react';
import { isPreviewMode } from './previewMode';

export function PreviewBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!isPreviewMode() || dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium shadow-lg shadow-amber-500/30">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>وضع المعاينة — البيانات وهمية</span>
        <button
          onClick={() => setDismissed(true)}
          className="ms-2 p-0.5 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="إغلاق"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
