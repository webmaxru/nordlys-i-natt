import type { FastifyPluginAsync } from 'fastify';
import { assessNights, chanceLabel, localDateHour, tonightOf } from '@nordlys/shared';
import { getCloudForecast } from '../services/met';
import { getKpForecast } from '../services/noaa';
import { parseCoordinate } from '../lib/parse';

/**
 * GET /api/alerts/nights?lat=&lon= — the same night-by-night grading the alerts use, so the
 * page can show "tomorrow night: good chance" and explain when an alert would go out.
 */
const routes: FastifyPluginAsync = async (app) => {
  app.get('/api/alerts/nights', async (request, reply) => {
    const q = request.query as { lat?: string; lon?: string; lang?: string };
    const lat = parseCoordinate(q.lat, -90, 90);
    const lon = parseCoordinate(q.lon, -180, 180);
    if (lat === null || lon === null) return reply.code(400).send({ error: 'invalid' });
    const lang = q.lang === 'en' ? 'en' : 'nb';
    const [kpForecast, cloudForecast] = await Promise.all([
      getKpForecast(),
      getCloudForecast(lat, lon),
    ]);
    const now = new Date();
    const nights = assessNights({
      location: { name: '', lat, lon },
      kpForecast,
      cloudForecast,
      now,
    });
    const tonight = tonightOf(now, lat, lon);
    reply.header('cache-control', 'public, max-age=600');
    return {
      generatedAt: now.toISOString(),
      /** Local date of "tonight" and of today (Europe/Oslo), for labels like "tonight"/"tomorrow". */
      tonight,
      today: localDateHour(now, 'Europe/Oslo').date,
      nights: nights
        .filter((n) => n.nightOf >= tonight)
        .filter((n) => n.darkHours > 0 || n.chance !== 'none')
        .map((n) => ({
          nightOf: n.nightOf,
          chance: n.chance,
          label: chanceLabel(n.chance, lang),
          darkHours: n.darkHours,
          visibleHours: n.visibleHours,
          maxKp: n.maxKp,
          requiredKp: n.requiredKp,
          minCloudPct: n.minCloudPct,
          bestTime: n.bestHour?.time ?? null,
          complete: n.complete,
        })),
    };
  });
};

export default routes;
