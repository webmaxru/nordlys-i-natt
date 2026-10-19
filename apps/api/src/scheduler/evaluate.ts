import { inHourWindow } from '@nordlys/shared';
import { config } from '../config';
import { getCloudForecast } from '../services/met';
import { getKpForecast } from '../services/noaa';
import { sendPush, vapidConfigured } from '../services/push';
import { createStore, type Sub } from '../services/store';
import {
  emailSubs,
  links,
  listUnsubscribeHeaders,
  prunePending,
  type EmailSub,
} from '../services/email/subscribers';
import { emailTransport } from '../services/email/transport';
import { alertEmail } from '../services/email/templates';
import {
  apnsConfigured,
  devices,
  fcmConfigured,
  sendNative,
  type Device,
} from '../services/nativePush';
import { initTelemetry, trackEvent } from '../telemetry';
import { runAlerts, type ChannelAdapter, type RunStats } from './alerts';

/**
 * Kept for compatibility with older tests/docs: true when `hour` is inside [start, end).
 * The rule itself lives in packages/shared/src/alerts.ts (inHourWindow).
 */
export const isInQuietWindow = inHourWindow;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const abs = (path: string) => `${config.publicBaseUrl}${path}`;

export function webPushAdapter(store = createStore()): ChannelAdapter<Sub> {
  return {
    channel: 'web',
    enabled: () => vapidConfigured,
    list: () => store.list(),
    toRecipient: (s) => ({
      id: s.id,
      lat: s.lat,
      lon: s.lon,
      name: s.name,
      lang: s.lang,
      // Subscriptions made before the October 2026 rework signed up for "instant" alerts,
      // so they keep the short-notice alert and also get the new day-before heads-up.
      prefs: {
        dayBefore: s.alertDayBefore ?? true,
        now: s.alertNow ?? s.alertDayBefore === undefined,
        minChance: s.minChance ?? 'good',
      },
      state: { lastDayBeforeNight: s.lastDayBeforeNight, lastNowNight: s.lastNowNight },
    }),
    send: async (s, d, m) =>
      sendPush(
        s,
        { title: m.title, body: m.body, url: m.path, tag: d.dedupeKey },
        { ttlSeconds: d.ttlSeconds, urgency: d.kind === 'now' ? 'high' : 'normal', topic: d.kind },
      ),
    save: (s, st) => store.upsert({ ...s, ...st, lastNotifiedAt: new Date().toISOString() }),
    remove: (s) => store.remove(s.id),
  };
}

export function emailAdapter(): ChannelAdapter<EmailSub> {
  const store = emailSubs();
  const transport = emailTransport();
  let sentThisRun = 0;
  let throttledUntil = 0;
  return {
    channel: 'email',
    enabled: () => transport !== null,
    list: () => store.list(),
    toRecipient: (s) =>
      s.status !== 'active'
        ? null
        : {
            id: s.id,
            lat: s.lat,
            lon: s.lon,
            name: s.name,
            lang: s.lang,
            prefs: { dayBefore: s.alertDayBefore, now: s.alertNow, minChance: s.minChance },
            state: { lastDayBeforeNight: s.lastDayBeforeNight, lastNowNight: s.lastNowNight },
          },
    send: async (s, _d, m) => {
      if (!transport) return 'error';
      // Stay under the ACS quota (default 30/min and 100/h for a custom domain): the rest is
      // picked up by the next run, still inside the send window.
      if (sentThisRun >= config.email.maxPerRun || Date.now() < throttledUntil) return 'deferred';
      if (sentThisRun > 0) await sleep(config.email.sendIntervalMs);
      const l = links(s);
      const mail = alertEmail(s.lang, s.name, m, { ...l, open: abs(m.path) });
      const res = await transport.send({
        to: s.email,
        ...mail,
        headers: listUnsubscribeHeaders(s),
      });
      if (res.ok) {
        sentThisRun += 1;
        return 'ok';
      }
      if (res.retryAfterMs) {
        throttledUntil = Date.now() + res.retryAfterMs;
        return 'deferred';
      }
      console.error('[email] send failed', res.error);
      return 'error';
    },
    save: (s, st) => store.upsert({ ...s, ...st, lastSentAt: new Date().toISOString() }),
    remove: (s) => store.remove(s.id),
  };
}

export function nativeAdapter(): ChannelAdapter<Device> {
  const store = devices();
  return {
    channel: 'app',
    enabled: () => fcmConfigured() || apnsConfigured(),
    list: () => store.list(),
    toRecipient: (d) => ({
      id: d.id,
      lat: d.lat,
      lon: d.lon,
      name: d.name,
      lang: d.lang,
      prefs: { dayBefore: d.alertDayBefore, now: d.alertNow, minChance: d.minChance },
      state: { lastDayBeforeNight: d.lastDayBeforeNight, lastNowNight: d.lastNowNight },
    }),
    send: async (d, dec, m) => {
      const r = await sendNative(d, {
        title: m.title,
        body: m.body,
        url: m.path,
        ttlSeconds: dec.ttlSeconds,
        collapseKey: dec.dedupeKey,
      });
      return r === 'disabled' ? 'deferred' : r;
    },
    save: (d, st) => store.upsert({ ...d, ...st, lastSentAt: new Date().toISOString() }),
    remove: (d) => store.remove(d.id),
  };
}

export async function evaluateAndNotify(
  now = new Date(),
): Promise<RunStats & { prunedPending: number }> {
  initTelemetry();
  const stats = await runAlerts({
    now,
    adapters: [webPushAdapter(), emailAdapter(), nativeAdapter()],
    getKpForecast,
    getCloudForecast,
    rule: { quietHours: config.quietHours, dayBeforeWindow: config.dayBeforeWindow },
    log: (msg, data) => console.warn('[alerts]', msg, data ?? ''),
  });
  const prunedPending = emailTransport() ? await prunePending(now).catch(() => 0) : 0;
  for (const ch of ['web', 'email', 'app'] as const) {
    if (stats[ch].sent > 0) trackEvent('alert_sent', { channel: ch, count: stats[ch].sent });
  }
  if (stats.web.sent > 0) trackEvent('push_sent', { count: stats.web.sent });
  return { ...stats, prunedPending };
}
