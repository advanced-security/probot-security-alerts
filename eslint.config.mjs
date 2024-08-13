import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/eslint.config.cjs',
      '**/jest.config.mjs',
      '**/esbuild.config.mjs',
      '**/.aws-sam/',
      '**/dist/',
      '**/coverage/',
      '**/.yarn/',
      '**/.pnp.cjs',
      '**/.pnp.loader.mjs'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.stylistic,
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.{ts,mts}', 'test/**/*.test.{ts,mts}']
  }
);
