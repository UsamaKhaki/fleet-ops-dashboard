import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'app-runtime',
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup-dom.ts'],
  },
});
