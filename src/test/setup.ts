import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom lacks a few browser APIs the app touches.
const noop = () => undefined;
if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop, dispatchEvent: () => false })) as never;
  window.scrollTo = noop as never;
  window.ResizeObserver ??= class {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
  } as never;
}
