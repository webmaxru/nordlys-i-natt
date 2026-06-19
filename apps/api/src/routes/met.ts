import type { FastifyPluginAsync } from 'fastify';
import { getLocationforecastRaw, getSunriseRaw } from '../services/met';

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

const met: FastifyPluginAsync = async (app) => {
  app.get('/api/met/locationforecast', async (request, reply) => {
    const query = request.query as { lat?: string; lon?: string };
    const lat = parseCoordinate(query.lat, -90, 90);
    const lon = parseCoordinate(query.lon, -180, 180);
    if (lat === null || lon === null) {
      return reply.code(400).send({ error: 'Invalid or missing lat/lon' });
    }

    try {
      return await getLocationforecastRaw(lat, lon);
    } catch (err) {
      app.log.error({ err }, 'Failed to fetch MET locationforecast');
      return reply.code(502).send({ error: 'Upstream fetch failed' });
    }
  });

  app.get('/api/met/sunrise', async (request, reply) => {
    const query = request.query as { lat?: string; lon?: string; date?: string };
    const lat = parseCoordinate(query.lat, -90, 90);
    const lon = parseCoordinate(query.lon, -180, 180);
    if (lat === null || lon === null || !query.date || !/^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
      return reply.code(400).send({ error: 'Invalid or missing lat/lon/date' });
    }

    try {
      return await getSunriseRaw(lat, lon, query.date);
    } catch (err) {
      app.log.error({ err }, 'Failed to fetch MET sunrise');
      return reply.code(502).send({ error: 'Upstream fetch failed' });
    }
  });
};

export default met;
