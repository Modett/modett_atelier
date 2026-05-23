import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['src/tests/setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    // Run only TypeScript sources — dist/ contains stale CommonJS builds that
    // Vitest cannot import.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
})
