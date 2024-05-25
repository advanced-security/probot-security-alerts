import { dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const defaultBuildSettings = {
  tsconfig: 'tsconfig.json',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  minify: true,
  platform: 'node',
  format: 'esm',
  target: 'node20.0',
  outdir: './dist/',
  treeShaking: true,
  absWorkingDir: currentDir,
  inject: [`${currentDir}/utils/cjs-shim.ts`]
};

export default defaultBuildSettings;
