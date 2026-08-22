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
