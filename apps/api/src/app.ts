import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { config } from './config';
import { legacyRedirectTarget } from './hosting';
import devicesRoutes from './routes/devices';
import emailRoutes from './routes/email';
import emailPagesRoutes from './routes/emailPages';
import forecastRoutes from './routes/forecast';
import healthRoutes from './routes/health';
import metRoutes from './routes/met';
import nightsRoutes from './routes/nights';
import noaaRoutes from './routes/noaa';
import subscriptionsRoutes from './routes/subscriptions';
import { initTelemetry, trackEvent } from './telemetry';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * A top-level page navigation (the HTML shell), as opposed to an asset, an
 * `/api` call or a `fetch`. `Sec-Fetch-Dest: document` is the reliable modern
 * signal; fall back to the `Accept` header + "no file extension" for older
 * browsers that don't send Sec-Fetch-* (e.g. older Safari).
 */
function isDocumentRequest(req: FastifyRequest, path: string): boolean {
  const dest = req.headers['sec-fetch-dest'];
  if (typeof dest === 'string') {
    return dest === 'document';
  }
  const accept = String(req.headers['accept'] ?? '');
  const lastSegment = path.split('/').pop() ?? '';
  const looksLikeAsset = /\.[a-z0-9]+$/i.test(lastSegment);
  return accept.includes('text/html') && !looksLikeAsset;
}

/**
 * Build the Fastify app. Each file in ./routes is a Fastify plugin; add new ones to the list
 * below.
 */
export async function buildServer(opts: { webDist?: string } = {}): Promise<FastifyInstance> {
  initTelemetry();

  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    // Azure Container Apps ingress sits in front: use X-Forwarded-For for rate limiting.
    trustProxy: true,
  });

  // Old domain -> new domain (only when CANONICAL_HOST + LEGACY_HOSTS are set; see
  // docs/CUSTOM-DOMAIN.md). Runs before everything else so the redirect is cheap.
  app.addHook('onRequest', async (req, reply) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return;
    const target = legacyRedirectTarget(req.headers.host, req.raw.url, config.hosting);
    if (target) {
      return reply.redirect(target, 301);
    }
  });

  await app.register(cors, { origin: true });
  // HTML forms on the e-mail pages and RFC 8058 one-click unsubscribe POST urlencoded bodies.
  await app.register(formbody);
  // Off by default; routes opt in with `config.rateLimit` (sign-up, unsubscribe, device registration).
  await app.register(rateLimit, { global: false });
  // Routes are registered explicitly (one plugin per file in ./routes) so the same app runs
  // under tsx in production and under vitest in the integration tests.
  for (const plugin of [
    healthRoutes,
    forecastRoutes,
    metRoutes,
    noaaRoutes,
    subscriptionsRoutes,
    nightsRoutes,
    emailRoutes,
    emailPagesRoutes,
    devicesRoutes,
  ]) {
    await app.register(plugin);
  }

  // Count page views server-side. This is fully cookieless — nothing is stored
  // on or read from the user's device — so it needs no consent banner. Only
  // top-level navigations (the HTML shell) are counted, never assets/api/fetch.
  app.addHook('onResponse', (req, reply, done) => {
    if (req.method === 'GET' && reply.statusCode < 400) {
      const path = (req.raw.url ?? '').split('?')[0];
      if (!path.startsWith('/api') && isDocumentRequest(req, path)) {
        trackEvent('page_view', { path });
      }
    }
    done();
  });

  // Serve the built SPA when present (single-container deployment).
  const webDist = opts.webDist ?? (config.webDistPath || resolve(here, '../../web/dist'));
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
    const has404Page = existsSync(join(webDist, '404.html'));
    app.setNotFoundHandler((req, reply) => {
      const url = req.raw.url ?? '/';
      const [path, query] = url.split('?');
      if (path.startsWith('/api')) {
        reply.code(404).send({ error: 'Not found' });
        return;
      }
      // "/artikler/kp-indeksen" -> "/artikler/kp-indeksen/" for the generated content pages.
      if (
        !path.endsWith('/') &&
        !path.includes('..') &&
        !/\.[a-z0-9]+$/i.test(path) &&
        existsSync(join(webDist, path, 'index.html'))
      ) {
        reply.redirect(`${path}/${query !== undefined ? `?${query}` : ''}`, 301);
        return;
      }
      // The app has no client-side routes besides "/", so anything else is a real 404
      // (a soft 404 that returns the app shell with 200 hurts search and ad review).
      if (has404Page) {
        reply.code(404).type('text/html; charset=utf-8').sendFile('404.html');
        return;
      }
      reply.sendFile('index.html');
    });
  }

  return app;
}
