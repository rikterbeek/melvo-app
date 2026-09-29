import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Process bootstrap only; the behaviour it wires up is covered through
      // startServer in test/server.test.ts.
      exclude: ['src/main.ts'],
      thresholds: {
        lines: 95,
      },
    },
  },
});
