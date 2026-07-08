import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Load env file from workspace root (two levels up)
const mode = process.env.NODE_ENV || 'development';
const env = loadEnv(mode, path.resolve(import.meta.dirname, '../..'), '');

const rawPort = env.PORT || process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = env.BASE_PATH || process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

// Resolve optional Replit plugins at top-level
const extraPlugins = [];
if (process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined) {
  const cartographer = await import('@replit/vite-plugin-cartographer').then((m) =>
    m.cartographer({
      root: path.resolve(import.meta.dirname, '..'),
    }),
  );
  const devBanner = await import('@replit/vite-plugin-dev-banner').then((m) =>
    m.devBanner(),
  );
  extraPlugins.push(cartographer, devBanner);
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...extraPlugins,
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
