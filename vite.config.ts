import { resolve } from 'path'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import dts from 'vite-plugin-dts'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Cosmos',
      formats: ['es', 'umd'],
      fileName: (format) => format === 'umd' ? 'index.min.js' : 'index.js',
    },
    sourcemap: true,
    minify: true,
    rollupOptions: {
      external: ['d3-array', 'd3-color', 'd3-drag', 'd3-ease', 'd3-scale', 'd3-selection', 'd3-transition', 'd3-zoom', 'regl'],
      output: {
        globals: {
          'd3-selection': 'd3',
          'd3-ease': 'd3',
          regl: 'createREGL',
          'd3-color': 'd3',
          'd3-scale': 'd3',
          'd3-array': 'd3',
          'gl-matrix': 'glMatrix',
          random: 'random',
          'd3-zoom': 'd3',
          'd3-drag': 'd3',
          'd3-transition': 'd3',
        },
      },
    },
  },
  plugins: [
    glsl(),
    dts(),
  ],
  resolve: {
    alias: {
      '@/graph': resolve(__dirname, 'src/'),
    },
  },
})
