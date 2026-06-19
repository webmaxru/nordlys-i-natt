import type { FastifyPluginAsync } from 'fastify';
import { buildForecast } from '../services/forecast';

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return Math.round(parsed * 10_000) / 10_000;
}

const forecast: FastifyPluginAsync = async (app) => {
  app.get('/api/forecast', async (request, reply) => {
    const query = request.query as { lat?: string; lon?: string; name?: string };
    const lat = parseCoordinate(query.lat, -90, 90);
    const lon = parseCoordinate(query.lon, -180, 180);
    if (lat === null || lon === null) {
      return reply.code(400).send({ error: 'Invalid or missing lat/lon' });
    }

    try {
      return await buildForecast({
        lat,
        lon,
        name: query.name?.trim() || `${lat}, ${lon}`,
      });
    } catch (err) {
      app.log.error({ err }, 'Failed to build forecast');
      return reply.code(502).send({ error: 'Upstream fetch failed' });
    }
  });
};

export default forecast;
