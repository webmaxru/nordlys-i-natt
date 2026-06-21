import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import autoload from '@fastify/autoload';
import fastifyStatic from '@fastify/static';
import { config } from './config';
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
 * Build the Fastify app. Routes are auto-loaded from ./routes (each file is a
 * Fastify plugin) so feature phases can drop in routes without editing a
 * central registration file.
 */
export async function buildServer(): Promise<FastifyInstance> {
  initTelemetry();

  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
  });

  await app.register(cors, { origin: true });
  await app.register(autoload, { dir: join(here, 'routes') });

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
  const webDist = config.webDistPath || resolve(here, '../../web/dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url?.startsWith('/api')) {
        reply.code(404).send({ error: 'Not found' });
        return;
      }
      reply.sendFile('index.html'); // SPA fallback
    });
  }

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
