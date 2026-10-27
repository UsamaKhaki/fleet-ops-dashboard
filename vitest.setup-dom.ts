import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout engine; the virtualiser and Radix only need these to exist.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
Element.prototype.scrollTo = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
});
