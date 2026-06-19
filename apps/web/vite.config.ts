import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The push service worker is layered in during the notifications phase
      // (strategies: 'injectManifest' with a custom sw) — autoUpdate for now.
      manifest: {
        name: 'Nordlys i natt?',
        short_name: 'Nordlys',
        description: 'Kan du se nordlyset i natt? Aurora go/no-go for din posisjon.',
        lang: 'no',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
      workbox: {
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
