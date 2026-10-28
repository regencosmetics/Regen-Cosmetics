import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.vitest } },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'no-empty': ['error', { allowEmptyCatch: true }], 'no-useless-catch': 'off' } },
];
