// ─── ESLint flat config ─────────────────────────────────────
// Lints the game (js/), the service worker (sw.js), and the tooling
// (serve.js, tests). JSDoc annotations are checked with
// eslint-plugin-jsdoc.
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'coverage/**'] },

  // Browser game code (ES modules loaded from index.html)
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs.recommended.rules,
      // Pragmatic overrides for a small, hand-written codebase:
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-description-complete-sentence': 'off',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/valid-types': 'error',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
    linterOptions: { reportUnusedDisableDirectives: true },
  },

  // Service worker (separate global scope)
  {
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      // Classic (non-module) service worker, registered without type: 'module'
      sourceType: 'script',
      globals: {
        ...globals.serviceworker,
      },
    },
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs.recommended.rules,
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-description-complete-sentence': 'off',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // Node tooling: static server, vitest config, tests
  {
    files: ['serve.js', 'vitest.config.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs.recommended.rules,
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-description-complete-sentence': 'off',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
