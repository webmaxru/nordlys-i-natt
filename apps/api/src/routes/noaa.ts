import type { FastifyPluginAsync } from 'fastify';
import type { BBox } from '../services/noaa';
import { getKpForecast, getOvationGrid } from '../services/noaa';

const DEFAULT_BBOX: BBox = { minLon: 0, minLat: 55, maxLon: 35, maxLat: 72 };

function parseBbox(value: unknown): BBox | null {
  if (value === undefined) {
    return DEFAULT_BBOX;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon > maxLon || minLat > maxLat || minLat < -90 || maxLat > 90) {
    return null;
  }

  return { minLon, minLat, maxLon, maxLat };
}

const noaa: FastifyPluginAsync = async (app) => {
  app.get('/api/noaa/kp', async (_request, reply) => {
    try {
      return await getKpForecast();
    } catch (err) {
      app.log.error({ err }, 'Failed to fetch NOAA Kp forecast');
      return reply.code(502).send({ error: 'Upstream fetch failed' });
    }
  });

  app.get('/api/noaa/ovation/grid', async (request, reply) => {
    const query = request.query as { bbox?: string };
    const bbox = parseBbox(query.bbox);
    if (!bbox) {
      return reply.code(400).send({ error: 'Invalid bbox' });
    }

    try {
      return await getOvationGrid(bbox);
    } catch (err) {
      app.log.error({ err }, 'Failed to fetch NOAA OVATION grid');
      return reply.code(502).send({ error: 'Upstream fetch failed' });
    }
  });
};

export default noaa;
