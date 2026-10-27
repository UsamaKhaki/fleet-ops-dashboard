import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'live-map',
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup-dom.ts'],
  },
});
