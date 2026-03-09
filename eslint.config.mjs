import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
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
      '.claude/worktrees/**',
      'squads/**',
      'apps/**',
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
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'error',
      'react/no-unescaped-entities': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Test files: allow `as any` for mocks (PO decision on AC3 scope)
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Ban raw <button> elements in favor of design system Button component
  {
    files: ['**/*.tsx'],
    ignores: ['components/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            'Use <Button> from @/components/ui/Button instead of raw <button>. Design system components ensure consistent styling and accessibility.',
        },
      ],
    },
  },
];

export default eslintConfig;
