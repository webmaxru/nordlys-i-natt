import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
// Static content section (articles, info pages, sitemap): see docs/CONTENT.md.
import { buildContent, headTags, homeLinksHtml, loadContent } from './scripts/content/build.mjs';
import { SITE_URL } from './scripts/content/site.mjs';

const require = createRequire(import.meta.url);
const pwaPluginDir = dirname(require.resolve('vite-plugin-pwa/package.json'));
const workboxWindowPath = require.resolve(
  'workbox-window/build/workbox-window.prod.mjs',
  { paths: [pwaPluginDir] },
);

/** Fills the SPA's index.html: absolute site URL + a crawlable "learn more" block. */
function contentHtmlPlugin(): Plugin {
  return {
    name: 'nordlys-content-html',
    transformIndexHtml(html) {
      const { articles } = loadContent();
      return html
        .replaceAll('__SITE_URL__', SITE_URL)
        .replace('<!--home-guides-->', homeLinksHtml(articles))
        .replace('</head>', `${headTags({ includeExtra: false }).map((t) => `    ${t}`).join('\n')}\n  </head>`);
    },
  };
}

/** After the app bundle is written, generate the static content pages into the same dist/. */
function contentPagesPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'nordlys-content-pages',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      // CONTENT_STRICT=0 builds even with broken internal links (drafts); CI is always strict.
      const summary = buildContent(outDir, { strict: process.env.CONTENT_STRICT !== '0' });
      this.info?.(`content: ${summary.articles} articles, ${summary.pages} pages`);
    },
  };
}

// Content routes are plain server-rendered pages: never answer them with the SPA shell
// from the service worker, and don't precache them.
const CONTENT_DIRS = ['artikler', 'en', 'om', 'kontakt', 'personvern', 'vilkar'];

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'workbox-window': workboxWindowPath,
    },
  },
  plugins: [
    react(),
    contentHtmlPlugin(),
    contentPagesPlugin(),
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
        // Only the app itself ("/", with or without a query) falls back to the cached shell.
        navigateFallbackAllowlist: [/^\/(\?.*)?$/, /^\/index\.html/],
        globIgnores: ['**/node_modules/**', '404.html', ...CONTENT_DIRS.map((d) => `${d}/**`)],
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
