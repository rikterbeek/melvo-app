import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Process bootstrap only (listen + env defaults); covered by running the built server.
      exclude: ['src/main.ts'],
      thresholds: { lines: 95, statements: 95, branches: 95, functions: 95 },
    },
  },
});
