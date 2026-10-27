import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'maintenance',
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup-dom.ts'],
  },
});
