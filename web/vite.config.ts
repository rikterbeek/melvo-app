import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    cssMinify: true,
    // One CSS file and one JS file keeps the critical path inside the request
    // budget in performance-budget.json.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/support/global-setup.ts'],
    testTimeout: 20_000,
  },
})
