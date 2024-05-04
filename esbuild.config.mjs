import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./src/main.ts'],
  tsconfig: 'tsconfig.json',
  bundle: true,
  minify: true,
  platform: 'node',
  format: 'esm',
  target: 'node20.0',
  outdir: './dist/',
  treeShaking: true,
  inject: ['cjs-shim.ts']
});
