import type { FastifyPluginAsync } from 'fastify';
import { deviceId, devices, type Device } from '../services/nativePush';
import { trackEvent } from '../telemetry';
import { parseLocation, parsePrefs } from '../lib/parse';

const routes: FastifyPluginAsync = async (app) => {
  // The iOS/Android app registers its push token together with the saved place.
  app.post(
    '/api/devices',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const b = (request.body ?? {}) as {
        token?: unknown;
        platform?: unknown;
        location?: unknown;
        lang?: unknown;
        prefs?: unknown;
      };
      const token = typeof b.token === 'string' ? b.token.trim() : '';
      const platform = b.platform === 'ios' || b.platform === 'android' ? b.platform : null;
      const location = parseLocation(b.location);
      if (!token || token.length > 4096 || !/^[\w:.-]+$/.test(token) || !platform || !location) {
        return reply.code(400).send({ error: 'invalid' });
      }
      const prefs = parsePrefs(b.prefs);
      const id = deviceId(token);
      const store = devices();
      const existing = await store.get(id);
      const now = new Date().toISOString();
      const device: Device = {
        ...(existing ?? {}),
        id,
        platform,
        token,
        ...location,
        lang: b.lang === 'en' ? 'en' : 'nb',
        alertDayBefore: prefs.dayBefore,
        alertNow: prefs.now,
        minChance: prefs.minChance,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await store.upsert(device);
      trackEvent(existing ? 'device_updated' : 'device_registered', { platform });
      return { id };
    },
  );

  app.delete(
    '/api/devices/:id',
    { config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await devices().remove(id);
      trackEvent('device_removed');
      return reply.code(204).send();
    },
  );
};

export default routes;
