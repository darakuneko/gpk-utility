import { resolve } from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vite';
import type { ElectronOptions } from 'vite-plugin-electron';

const isDarwin = process.platform === 'darwin';

const electronConfigs: ElectronOptions[] = [
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
    entry: isDarwin ? 'notarize.ts' : 'notarize-stub.ts',
    vite: {
      build: {
        sourcemap: true,
        minify: false,
        outDir: 'dist-electron',
        lib: {
          entry: isDarwin ? 'notarize.ts' : 'notarize-stub.ts',
          formats: ['cjs' as const],
          fileName: (): string => 'notarize.cjs'
        },
        rollupOptions: {
          external: isDarwin ? ['@electron/notarize', 'dotenv'] : [],
          output: {
            format: 'cjs' as const
          }
        }
      }
    }
  },
  {
    entry: 'preload.ts',
    onstart(options: { reload: () => void }): void {
      options.reload();
    },
    vite: {
      build: {
        sourcemap: true,
        minify: false,
        outDir: 'dist-electron',
        lib: {
          entry: 'preload.ts',
          formats: ['cjs' as const],
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
            format: 'cjs' as const
          }
        }
      }
    }
  }
];

const config: UserConfig = defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
    tailwindcss(),
    electron(electronConfigs)
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
