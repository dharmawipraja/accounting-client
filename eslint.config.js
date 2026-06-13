import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    // eslint-plugin-react-hooks v7.1.1 ships React Compiler checks in
    // configs.flat['recommended-latest'] (no separate 'react-compiler' rule id).
    ...reactHooks.configs.flat['recommended-latest'],
  },
  prettier,
);
