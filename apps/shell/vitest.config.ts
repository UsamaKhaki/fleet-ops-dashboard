import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'shell',
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup-dom.ts'],
  },
});
