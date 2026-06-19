import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import autoload from '@fastify/autoload';
import fastifyStatic from '@fastify/static';
import { config } from './config';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Build the Fastify app. Routes are auto-loaded from ./routes (each file is a
 * Fastify plugin) so feature phases can drop in routes without editing a
 * central registration file.
 */
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
  });

  await app.register(cors, { origin: true });
  await app.register(autoload, { dir: join(here, 'routes') });

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
