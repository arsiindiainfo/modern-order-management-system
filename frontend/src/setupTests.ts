import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia — MUI's useMediaQuery (used by the
// responsive DataTable) needs it defined even in the "always desktop" case.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}
