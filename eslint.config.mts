import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.astro/',
      '.wrangler/',
      'coverage/',
      'build/',
      '.next/',
      '**/*.generated.*',
      '**/vendor/**',
      '**/*.astro',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.worker,
      },
    },
    extends: [js.configs.recommended],
  },
  ...tseslint.configs.recommended,
  prettier,
]);
