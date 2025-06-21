import { resolve } from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vite';

const config: UserConfig = defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
    tailwindcss(),
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
                'electron-store',
                'node-fetch',
                'dotenv'
              ]
            }
          }
        }
      },
      {
        entry: 'notarize.ts',
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist-electron',
            lib: {
              entry: 'notarize.ts',
              formats: ['cjs'],
              fileName: (): string => 'notarize.cjs'
            },
            rollupOptions: {
              external: [
                '@electron/notarize',
                'dotenv'
              ],
              output: {
                format: 'cjs'
              }
            }
          }
        }
      },
      {
        entry: 'preload.ts',
        onstart(options): void {
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
              fileName: (): string => 'preload.js'
            },
            rollupOptions: {
              external: [
                'electron',
                'node-hid',
                '@paymoapp/active-window',
                'electron-store',
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
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['dayjs']
        }
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