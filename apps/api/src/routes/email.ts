import type { FastifyPluginAsync } from 'fastify';
import { emailEnabled } from '../services/email/transport';
import { normaliseEmail, signup, unsubscribe } from '../services/email/subscribers';
import { vapidConfigured } from '../services/push';
import { apnsConfigured, fcmConfigured } from '../services/nativePush';
import { trackEvent } from '../telemetry';
import { parseLocation, parsePrefs } from '../lib/parse';

type SubscribeBody = {
  email?: unknown;
  location?: { lat?: unknown; lon?: unknown; name?: unknown };
  lang?: unknown;
  prefs?: unknown;
  /** Honeypot: a hidden field real people leave empty. */
  website?: unknown;
  /** ms since the form was shown; bots submit instantly. */
  elapsedMs?: unknown;
};

const email: FastifyPluginAsync = async (app) => {
  app.get('/api/alerts/status', async () => ({
    web: { enabled: vapidConfigured },
    email: { enabled: emailEnabled() },
    app: { android: fcmConfigured(), ios: apnsConfigured() },
  }));

  app.post(
    '/api/email/subscribe',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } },
    async (request, reply) => {
      if (!emailEnabled()) {
        return reply.code(503).send({ error: 'email_disabled' });
      }
      const body = (request.body ?? {}) as SubscribeBody;
      // Bots: pretend success so they learn nothing, but do nothing.
      if (
        (typeof body.website === 'string' && body.website.trim() !== '') ||
        Number(body.elapsedMs) < 1500
      ) {
        trackEvent('email_signup_blocked');
        return reply.code(202).send({ status: 'check_inbox' });
      }
      const address = normaliseEmail(body.email);
      const location = parseLocation(body.location);
      const lang = body.lang === 'en' ? 'en' : 'nb';
      if (!address || !location) {
        return reply.code(400).send({ error: 'invalid' });
      }
      const prefs = parsePrefs(body.prefs);
      const outcome = await signup({
        email: address,
        ...location,
        lang,
        alertDayBefore: prefs.dayBefore,
        alertNow: prefs.now,
        minChance: prefs.minChance,
      });
      if (outcome.status === 'too_many_places') {
        return reply.code(409).send({ error: 'too_many_places' });
      }
      if (outcome.status === 'send_failed') {
        request.log.error({ err: outcome.error }, 'confirmation e-mail failed');
        return reply.code(502).send({ error: 'send_failed' });
      }
      trackEvent('email_signup', { outcome: outcome.status });
      // Same answer whether the address was new, pending or already active.
      return reply.code(202).send({ status: 'check_inbox' });
    },
  );

  // RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). Mail providers POST here.
  app.post('/api/email/unsubscribe', async (request, reply) => {
    const q = request.query as { id?: string; t?: string };
    const b = (request.body ?? {}) as { id?: string; t?: string };
    const id = q.id ?? b.id;
    const t = q.t ?? b.t;
    if (id) {
      const removed = await unsubscribe(id, t);
      if (removed) trackEvent('email_unsubscribed', { via: 'one-click' });
    }
    // Always 200: a repeated or stale unsubscribe is still a success for the user.
    return reply.code(200).type('text/plain; charset=utf-8').send('Unsubscribed');
  });
};

export default email;
