import { resolve } from 'path'
import { defineConfig, LibraryFormats, UserConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import dts from 'vite-plugin-dts'

// eslint-disable-next-line import/no-default-export
export default defineConfig(() => {
  const config: UserConfig = {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'Cosmos',
        formats: ['es', 'umd'] as LibraryFormats[],
        fileName: (format): string => format === 'umd' ? 'index.min.js' : 'index.js',
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
        '@cosmograph/cosmos': resolve(__dirname, 'src/'),
      },
    },
  }

  if (config?.build?.lib && config.build.rollupOptions && config.build.lib.formats && config.build.lib.formats.includes('umd')) {
    delete config.build.rollupOptions.external
  }

  return config
})
