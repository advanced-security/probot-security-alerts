/**
 * Temporarily required to enable VS Code to use ESLint. VS Code
 * uses an older version of NodeJS in Electron that does not support
 * ESLint configuration in a module file.
 */
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '**/eslint.config.cjs',
      '**/jest.config.mjs',
      '**/esbuild.config.mjs',
      '**/dist/',
      '**/coverage/',
      '**/.yarn/'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.strict,
  {
    files: [
      'src/**/*.{ts,mts}', 
      'test/**/*.test.{ts,mts}'
    ]
  }
);
