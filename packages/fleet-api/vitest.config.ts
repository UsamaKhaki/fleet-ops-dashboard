import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'fleet-api',
    environment: 'node',
  },
});
