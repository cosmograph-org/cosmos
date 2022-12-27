import path from 'path'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import glslify from 'rollup-plugin-glslify'
import typescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'

const outputFolder = 'lib'

// eslint-disable-next-line import/no-default-export
export default {
  input: 'src/index.ts',
  output: [
    {
      file: `${outputFolder}/cosmos.js`,
      name: 'cosmos',
      format: 'iife',
      footer: 'window.cosmos = cosmos',
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    glslify({
      include: [
        '**/*.vs',
        '**/*.fs',
        '**/*.vert',
        '**/*.frag',
        '**/*.glsl',
      ],
      exclude: 'node_modules/**',
    }),
    typescript({
      typescript: ttypescript,
      tsconfigOverride: {
        compilerOptions: {
          declaration: false,
        },
      },
    }),
    alias({
      resolve: ['', '/index.ts', '.ts'],
      entries: [
        { find: '@/graph', replacement: path.resolve(__dirname, 'src/') },
      ],
    }),
  ],
}
