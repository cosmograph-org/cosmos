import path from 'path'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import glslify from 'rollup-plugin-glslify'
import typescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'
import pkg from './package.json'

const libraryName = 'index'
const outputFolder = 'dist'

const externals = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
]
export default {
  input: 'src/index.ts',
  external: externals,
  output: [
    {
      file: `${outputFolder}/${libraryName}.js`,
      name: libraryName,
      format: 'es',
      sourcemap: true,
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
    }),
    alias({
      resolve: ['', '/index.ts', '.ts'],
      entries: [
        { find: '@/graph', replacement: path.resolve(__dirname, 'src/') },
      ],
    }),
  ],
}
