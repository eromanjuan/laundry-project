import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // A context provider conventionally lives beside the hooks that read it.
    // Splitting them would churn dozens of import paths across the app for a
    // fast-refresh nicety only, so those hooks are allowed explicitly. This is
    // a deliberate exception for that pattern — not a blanket suppression:
    // `react-hooks/*` correctness rules stay fully enforced everywhere.
    files: ['src/context/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuth', 'useShop', 'useShopId', 'usePermissions'] },
      ],
    },
  },
])
