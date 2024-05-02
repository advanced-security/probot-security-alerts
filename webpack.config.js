/* eslint-disable @typescript-eslint/naming-convention */

import TerserPlugin from 'terser-webpack-plugin';
import nodeExternals from 'webpack-node-externals';

export default {
    mode: 'production',
    entry: {
        main: './src/main.ts'
    },

    externals: [nodeExternals({ importType: 'module' })],
    externalsPresets: { node: true },
    experiments: {
        outputModule: true,
    },
    output: {
        filename: '[name].mjs',
        clean: true,
    },
    resolve: {
        symlinks: true,
        extensions: ['.ts', '.tsx', '.js'],
        extensionAlias: {
          '.js': ['.ts', '.js'],
          '.mjs': ['.mts', '.mjs']
        },
      },
    module: {
        rules: [{
            test: /\.(ts|tsx|mts)$/i,
            use: 'ts-loader',
            exclude: ["/node_modules/"],

          },
        ],
      },
    performance: {
      hints: false
    },
    optimization:{
      usedExports: true,
      innerGraph: true,
      minimize: true,
      nodeEnv: 'production',
      providedExports: true,
      sideEffects: true,
      moduleIds: 'natural',
      mangleExports: 'deterministic',
      chunkIds: 'deterministic',

      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
            format: {
              comments: false
            },
            compress: {
              passes: 3
            }
          },
        }),
      ],
    }
};
