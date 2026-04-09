import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.astro/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/build/**',
      '**/.next/**',
      '**/.nyc_output/**',
      '**/.DS_Store',
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
  {
    files: [
      '**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts}',
      '**/*.test.{js,mjs,cjs,ts,mts,cts}',
      'test-*.mjs',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['apps/api/src/discord/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['apps/api/src/scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
]);
