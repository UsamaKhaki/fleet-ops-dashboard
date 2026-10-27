import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'assets',
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup-dom.ts'],
  },
});
