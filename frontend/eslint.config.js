import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

// ESLint 9 flat config. `npm run lint` runs this; CI consumes it via the existing
// `npm run lint --if-present` step in .github/workflows/ci.yml.
export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  // ── Application source + root config files (browser-ish ESM) ────────────────
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules, // new JSX transform — no React import needed
      'react/prop-types': 'off', // this codebase doesn't use prop-types
      // ignoreRestSiblings: `const { omit, ...rest } = obj` is the idiom for
      // stripping a field (see migrateCalcData.js) — not a real unused var.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // Apostrophes/quotes in prose (legal + marketing pages) render fine and
      // escaping them hurts readability — this is cosmetic, not correctness.
      'react/no-unescaped-entities': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ── Root-level config + Vercel edge middleware (Node/edge globals) ──────────
  {
    files: ['*.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  // ── CLAUDE.md Hard Rule #4 — no raw fetch in feature modules ────────────────
  // All HTTP goes through httpClient.createApi() in src/api/ (where CSRF is
  // injected). The api/ directory itself is exempt.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'No raw fetch in feature modules (CLAUDE.md Hard Rule #4). Use httpClient.createApi() via src/api/.',
        },
      ],
    },
  },

  // ── Vitest test files — test globals ────────────────────────────────────────
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Must be last: disables stylistic rules that would fight Prettier.
  prettier,
]
