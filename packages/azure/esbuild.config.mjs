import esbuild from 'esbuild';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../../esbuild.config.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const settings = { ...config, ...{
  entryPoints: ['./src/index.mts'],
  absWorkingDir: currentDir,
  external: ['@azure/functions-core']
}};

await esbuild.build(settings);
