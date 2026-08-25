import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement object URLs; the video tools rely on them for
// previews, so provide deterministic stubs.
if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => `blob:mock-${Math.random().toString(36).slice(2)}`,
    configurable: true,
    writable: true,
  });
}
if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: () => undefined,
    configurable: true,
    writable: true,
  });
}

window.HTMLElement.prototype.scrollIntoView = () => undefined;

// jsdom does not implement the Clipboard API; provide a minimal stub so
// components that call navigator.clipboard.writeText work in tests.
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
    configurable: true,
    writable: true,
  });
}
