import type { FastifyPluginAsync } from 'fastify';

/** Liveness/readiness probe used by Azure Container Apps. */
const health: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => ({
    status: 'ok',
    time: new Date().toISOString(),
  }));
};

export default health;
