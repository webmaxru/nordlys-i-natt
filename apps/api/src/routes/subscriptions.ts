import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config';
import { createStore, subscriptionId, type Sub } from '../services/store';

type SubscriptionBody = {
  subscription?: {
    endpoint?: unknown;
    keys?: {
      p256dh?: unknown;
      auth?: unknown;
    };
  };
  location?: {
    lat?: unknown;
    lon?: unknown;
    name?: unknown;
  };
  lang?: unknown;
};

const subscriptions: FastifyPluginAsync = async (app) => {
  const store = createStore();

  app.get('/api/push/public-key', async () => ({
    publicKey: config.vapid.publicKey,
  }));

  app.post('/api/subscriptions', async (request, reply) => {
    const body = (request.body ?? {}) as SubscriptionBody;
    const parsed = parseBody(body);
    if (!parsed) {
      return reply.code(400).send({ error: 'Invalid subscription payload' });
    }

    const now = new Date().toISOString();
    const existing = await store.get(parsed.id);
    const sub: Sub = {
      ...parsed,
      createdAt: existing?.createdAt ?? now,
      lastNotifiedAt: existing?.lastNotifiedAt,
      lastVerdict: existing?.lastVerdict,
    };

    await store.upsert(sub);
    return { id: sub.id };
  });

  app.delete('/api/subscriptions/:id', async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.code(400).send({ error: 'Missing subscription id' });
    }

    await store.remove(params.id);
    return reply.code(204).send();
  });
};

export default subscriptions;

function parseBody(
  body: SubscriptionBody,
): Omit<Sub, 'createdAt' | 'lastNotifiedAt' | 'lastVerdict'> | null {
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  const lat = parseCoordinate(body.location?.lat, -90, 90);
  const lon = parseCoordinate(body.location?.lon, -180, 180);
  const name =
    typeof body.location?.name === 'string' ? body.location.name.trim() : '';
  const lang = body.lang === 'nb' ? 'nb' : body.lang === 'en' ? 'en' : null;

  if (
    typeof endpoint !== 'string' ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string' ||
    lat === null ||
    lon === null ||
    !name ||
    !lang
  ) {
    return null;
  }

  return {
    id: subscriptionId(endpoint),
    endpoint,
    keys: { p256dh, auth },
    lat,
    lon,
    name,
    lang,
  };
}

function parseCoordinate(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const parsed = typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}
