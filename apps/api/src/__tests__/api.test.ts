import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../app';
import { OutboxTransport, setEmailTransport } from '../services/email/transport';
import { emailSubs } from '../services/email/subscribers';
import { devices } from '../services/nativePush';

let app: FastifyInstance;
let outbox: OutboxTransport;

const linkIn = (text: string, path: string) => {
  const m = text.match(new RegExp(`https://nordlys\\.test${path}\\?id=([\\w-]+)&t=([\\w-]+)`));
  if (!m) throw new Error(`no ${path} link in:\n${text}`);
  return { id: m[1], t: m[2] };
};

const signupBody = (email: string, extra: Record<string, unknown> = {}) => ({
  email,
  location: { lat: 69.6492, lon: 18.9553, name: 'Tromsø' },
  lang: 'nb',
  prefs: { dayBefore: true, now: false, minChance: 'good' },
  website: '',
  elapsedMs: 4000,
  ...extra,
});

let ip = 0;
const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  app.inject({
    method: 'POST',
    url,
    payload: payload as object,
    headers: { 'x-forwarded-for': `10.0.0.${++ip}`, ...headers },
  });

beforeAll(async () => {
  app = await buildServer({ webDist: '/nonexistent' });
  await app.ready();
});
afterAll(async () => {
  setEmailTransport(undefined);
  await app.close();
});
beforeEach(() => {
  outbox = new OutboxTransport(process.env.EMAIL_OUTBOX_DIR!);
  setEmailTransport(outbox);
});

describe('alert status', () => {
  it('reports which channels are configured', async () => {
    const res = await app.inject('/api/alerts/status');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      web: { enabled: false },
      email: { enabled: true },
      app: { android: false, ios: false },
    });
  });
});

describe('e-mail double opt-in', () => {
  it('signs up, confirms via the e-mail link, manages and unsubscribes', async () => {
    const res = await post('/api/email/subscribe', signupBody('Kari.Nordmann@Example.no'));
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ status: 'check_inbox' });
    expect(outbox.sent).toHaveLength(1);
    const mail = outbox.sent[0];
    expect(mail.to).toBe('kari.nordmann@example.no');
    expect(mail.subject).toBe('Bekreft nordlysvarsel for Tromsø');
    expect(mail.headers?.['List-Unsubscribe']).toMatch(
      /^<https:\/\/nordlys\.test\/api\/email\/unsubscribe\?id=/,
    );
    expect(mail.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(mail.html).toContain('lang="nb"');

    const { id, t } = linkIn(mail.text, '/varsel/bekreft');
    expect((await emailSubs().get(id))?.status).toBe('pending');

    // Opening the link alone (a link scanner) does not confirm.
    const page = await app.inject(`/varsel/bekreft?id=${id}&t=${t}`);
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('<form method="post" action="/varsel/bekreft">');
    expect((await emailSubs().get(id))?.status).toBe('pending');

    // A wrong token is rejected.
    const bad = await post('/varsel/bekreft', `id=${id}&t=nope`, {
      'content-type': 'application/x-www-form-urlencoded',
    });
    expect(bad.statusCode).toBe(404);

    const ok = await post('/varsel/bekreft', `id=${id}&t=${t}`, {
      'content-type': 'application/x-www-form-urlencoded',
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).toContain('Varselet er på');
    expect((await emailSubs().get(id))?.status).toBe('active');

    const manage = await post(
      '/varsel/innstillinger',
      `id=${id}&t=${t}&dayBefore=on&now=on&minHigh=on&lang=en`,
      { 'content-type': 'application/x-www-form-urlencoded' },
    );
    expect(manage.statusCode).toBe(200);
    expect(manage.body).toContain('Saved.');
    expect(await emailSubs().get(id)).toMatchObject({
      alertNow: true,
      minChance: 'high',
      lang: 'en',
    });

    const unsubPage = await app.inject(`/varsel/avmeld?id=${id}&t=${t}`);
    expect(unsubPage.body).toContain("document.getElementById('u').submit()");
    const gone = await post('/varsel/avmeld', `id=${id}&t=${t}`, {
      'content-type': 'application/x-www-form-urlencoded',
    });
    expect(gone.body).toContain("You're unsubscribed");
    expect(await emailSubs().get(id)).toBeNull();
  });

  it('supports RFC 8058 one-click unsubscribe from the mail client', async () => {
    await post('/api/email/subscribe', signupBody('oneclick@example.no'));
    const { id, t } = linkIn(outbox.sent[0].text, '/varsel/bekreft');
    const res = await post(`/api/email/unsubscribe?id=${id}&t=${t}`, 'List-Unsubscribe=One-Click', {
      'content-type': 'application/x-www-form-urlencoded',
    });
    expect(res.statusCode).toBe(200);
    expect(await emailSubs().get(id)).toBeNull();
  });

  it('does not reveal whether an address is subscribed, and tells an active subscriber instead', async () => {
    await post('/api/email/subscribe', signupBody('known@example.no'));
    const { id, t } = linkIn(outbox.sent[0].text, '/varsel/bekreft');
    await post('/varsel/bekreft', `id=${id}&t=${t}`, {
      'content-type': 'application/x-www-form-urlencoded',
    });
    const again = await post('/api/email/subscribe', signupBody('known@example.no'));
    expect(again.statusCode).toBe(202);
    expect(again.json()).toEqual({ status: 'check_inbox' });
    expect(outbox.sent[1].subject).toBe('Du har allerede nordlysvarsel for Tromsø');
  });

  it('throttles repeat confirmation e-mails to the same address', async () => {
    await post('/api/email/subscribe', signupBody('impatient@example.no'));
    const second = await post('/api/email/subscribe', signupBody('impatient@example.no'));
    expect(second.statusCode).toBe(202);
    expect(outbox.sent).toHaveLength(1);
  });

  it('caps places per address', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await post(
        '/api/email/subscribe',
        signupBody('many@example.no', { location: { lat: 60 + i, lon: 10, name: `P${i}` } }),
      );
      expect(r.statusCode).toBe(202);
    }
    const sixth = await post(
      '/api/email/subscribe',
      signupBody('many@example.no', { location: { lat: 66, lon: 10, name: 'P6' } }),
    );
    expect(sixth.statusCode).toBe(409);
  });

  it('quietly drops bots (honeypot, instant submit) and rejects bad input', async () => {
    const honeypot = await post(
      '/api/email/subscribe',
      signupBody('bot@example.no', { website: 'http://spam' }),
    );
    expect(honeypot.statusCode).toBe(202);
    const instant = await post(
      '/api/email/subscribe',
      signupBody('bot2@example.no', { elapsedMs: 50 }),
    );
    expect(instant.statusCode).toBe(202);
    expect(outbox.sent).toHaveLength(0);
    expect((await post('/api/email/subscribe', signupBody('not-an-email'))).statusCode).toBe(400);
    expect(
      (
        await post(
          '/api/email/subscribe',
          signupBody('a@b.no', { location: { lat: 999, lon: 0, name: 'x' } }),
        )
      ).statusCode,
    ).toBe(400);
  });

  it('rate-limits sign-ups per IP', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.9' };
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/email/subscribe',
        payload: signupBody(`rl${i}@example.no`),
        headers,
      });
      codes.push(r.statusCode);
    }
    expect(codes.slice(0, 5).every((c) => c === 202)).toBe(true);
    expect(codes[5]).toBe(429);
  });

  it('answers 503 when e-mail is switched off', async () => {
    setEmailTransport(null);
    const r = await post('/api/email/subscribe', signupBody('off@example.no'));
    expect(r.statusCode).toBe(503);
    expect((await app.inject('/api/alerts/status')).json().email.enabled).toBe(false);
  });

  it('shows a clear page for broken links', async () => {
    const r = await app.inject('/varsel/innstillinger?id=missing&t=x');
    expect(r.statusCode).toBe(404);
    expect(r.body).toContain('Lenken er ugyldig');
  });
});

describe('native app devices', () => {
  it('registers, updates and removes a device token with its place', async () => {
    const body = {
      token: 'fcm-token_abc:123',
      platform: 'android',
      location: { lat: 69.65, lon: 18.96, name: 'Tromsø' },
      lang: 'en',
      prefs: { now: true },
    };
    const r = await post('/api/devices', body);
    expect(r.statusCode).toBe(200);
    const { id } = r.json();
    expect(await devices().get(id)).toMatchObject({
      platform: 'android',
      alertDayBefore: true,
      alertNow: true,
      lang: 'en',
    });
    const moved = await post('/api/devices', {
      ...body,
      location: { lat: 59.91, lon: 10.75, name: 'Oslo' },
    });
    expect(moved.json().id).toBe(id);
    expect((await devices().get(id))?.name).toBe('Oslo');
    expect((await app.inject({ method: 'DELETE', url: `/api/devices/${id}` })).statusCode).toBe(
      204,
    );
    expect(await devices().get(id)).toBeNull();
  });

  it('rejects junk', async () => {
    expect((await post('/api/devices', { token: '', platform: 'android' })).statusCode).toBe(400);
    expect(
      (
        await post('/api/devices', {
          token: 'x',
          platform: 'windows',
          location: { lat: 1, lon: 1, name: 'a' },
        })
      ).statusCode,
    ).toBe(400);
  });
});

describe('web push subscriptions', () => {
  it('stores alert preferences with the subscription', async () => {
    const r = await post('/api/subscriptions', {
      subscription: { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } },
      location: { lat: 69.65, lon: 18.96, name: 'Tromsø' },
      lang: 'nb',
      prefs: { dayBefore: true, now: true, minChance: 'high' },
    });
    expect(r.statusCode).toBe(200);
  });
});
