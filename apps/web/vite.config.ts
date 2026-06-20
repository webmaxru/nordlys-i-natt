import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const pwaPluginDir = dirname(require.resolve('vite-plugin-pwa/package.json'));
const workboxWindowPath = require.resolve(
  'workbox-window/build/workbox-window.prod.mjs',
  { paths: [pwaPluginDir] },
);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'workbox-window': workboxWindowPath,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Nordlys i natt?',
        short_name: 'Nordlys',
        description: 'Kan du se nordlyset i natt? Aurora go/no-go for din posisjon.',
        lang: 'no',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        importScripts: ['push-sw.js'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Dev convenience: forward API calls to the local Fastify server.
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
