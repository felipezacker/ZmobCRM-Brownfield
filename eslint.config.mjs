import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const compat = new FlatCompat({
  baseDir: dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  // Use flat compat to handle eslint-config-next which is CommonJS-based
  ...compat.config({
    extends: ['next/core-web-vitals'],
  }),

  // Global ignores
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'testsprite_tests/**',
      'tmp/**',
      '**/*.bak',
      'public/sw.js',
      'coverage/**',
      '.aios-core/**',
      '.antigravity/**',
      '.gemini/**',
      '.claude/hooks/**',
      'squads/**',
    ],
  },

  // Scripts are CommonJS by design; allow require() there
  {
    files: ['scripts/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Project-level rule tuning
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];

export default eslintConfig;
