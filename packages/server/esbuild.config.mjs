import esbuild from 'esbuild';
import fs from 'fs';
import {createRequire} from 'module';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import config from '../../esbuild.config.mjs';

var copyProbotPlugin = {
  name: 'copy-probot-static',
  setup(build) {
    build.onEnd(result => {
      const require = createRequire(import.meta.url);
      const srcFile = require.resolve('probot/static/primer.css');
      const src = dirname(srcFile);
      const dest = join(
        build.initialOptions.absWorkingDir,
        build.initialOptions.outdir,
        'static'
      );
      fs.cpSync(src, dest, {
        dereference: true,
        errorOnExist: false,
        force: true,
        preserveTimestamps: true,
        recursive: true
      });
    });
  }
};

const currentDir = dirname(fileURLToPath(import.meta.url));

const settings = {
  ...config,
  ...{
    entryPoints: ['./src/index.ts'],
    absWorkingDir: currentDir,
    plugins: [copyProbotPlugin]
  }
};

await esbuild.build(settings);
