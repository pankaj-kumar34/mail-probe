import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tailwind from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'bindings']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      tailwind.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      tailwindcss: {
        cssConfigPath: 'src/index.css',
      },
    },
    rules: {
      'tailwindcss/no-custom-classname': [
        'warn',
        {
          whitelist: [
            'sidebar-rail-boot',
            'sidebar-boot-container',
            'sidebar-boot-inner',
            'sidebar-boot-item',
            'shutdown',
          ],
        },
      ],
    },
  },
]);

