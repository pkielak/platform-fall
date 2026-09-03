import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // jsdom + browser globals are installed once per file before any js/*.js
    // module is imported (game code reads document/window/localStorage and
    // calls canvas.getContext at import time).
    setupFiles: ['test/helpers/setup.js'],
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['js/**/*.js'],
      exclude: ['js/main.js', 'js/pwa.js', 'js/sw.js'],
      reporter: ['text', 'html'],
      thresholds: {
        // Functional tests focus on behavior; these are guardrails, not gate.
        lines: 60,
        functions: 60,
        branches: 40,
        statements: 60,
      },
    },
  },
});
