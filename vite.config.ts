import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import electron from 'vite-plugin-electron';
import type { UserConfig } from 'vite';
// import renderer from 'vite-plugin-electron-renderer'

const config: UserConfig = defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
    electron([
      {
        entry: 'index.ts',
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist-electron',
            rollupOptions: {
              external: [
                'electron',
                'node-hid',
                '@paymoapp/active-window',
                'active-win',
                'electron-store',
                'firebase',
                'node-fetch',
                'dotenv'
              ]
            }
          }
        }
      },
      {
        entry: 'preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
          options.reload();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist-electron',
            lib: {
              entry: 'preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.js'
            },
            rollupOptions: {
              external: [
                'electron',
                'node-hid',
                '@paymoapp/active-window',
                'active-win',
                'electron-store',
                'firebase',
                'node-fetch',
                'dotenv'
              ],
              output: {
                format: 'cjs'
              }
            }
          }
        }
      }
    ])
    // renderer()
  ],
  root: '.',
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html')
      }
    }
  },
  server: {
    port: 5173,
    host: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    postcss: './postcss.config.ts'
  }
});

export default config;