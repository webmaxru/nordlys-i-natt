import { describe, expect, it } from 'vitest';
import type { AlertState, CloudPoint, KpForecastPoint } from '@nordlys/shared';
import {
  runAlerts,
  type ChannelAdapter,
  type DeliveryResult,
  type Recipient,
} from '../scheduler/alerts';

const H = 3_600_000;
function kp(from: string, hours: number, value: number): KpForecastPoint[] {
  return Array.from({ length: Math.ceil(hours / 3) }, (_, i) => ({
    time: new Date(Date.parse(from) + i * 3 * H).toISOString(),
    kp: value,
    observed: 'predicted' as const,
  }));
}
function cloud(from: string, hours: number, pct: number): CloudPoint[] {
  return Array.from({ length: hours }, (_, i) => ({
    time: new Date(Date.parse(from) + i * H).toISOString(),
    cloudPct: pct,
  }));
}

type Row = Recipient & { result?: DeliveryResult };

function fakeAdapter(rows: Row[], channel: 'web' | 'email' | 'app' = 'web') {
  const sent: { id: string; kind: string; title: string; path: string }[] = [];
  const saved = new Map<string, AlertState>();
  const removed: string[] = [];
  const adapter: ChannelAdapter<Row> = {
    channel,
    enabled: () => true,
    list: async () => rows,
    toRecipient: (r) => ({ ...r, state: saved.get(r.id) ?? r.state }),
    send: async (r, d, m) => {
      sent.push({ id: r.id, kind: d.kind, title: m.title, path: m.path });
      return r.result ?? 'ok';
    },
    save: async (r, st) => {
      saved.set(r.id, st);
    },
    remove: async (r) => {
      removed.push(r.id);
    },
  };
  return { adapter, sent, saved, removed };
}

const tromso = (id: string, extra: Partial<Row> = {}): Row => ({
  id,
  lat: 69.6492,
  lon: 18.9553,
  name: 'Tromsø',
  lang: 'nb',
  prefs: { dayBefore: true, now: false, minChance: 'good' },
  state: {},
  ...extra,
});

describe('runAlerts (scheduler)', () => {
  const kpForecast = kp('2026-12-01T00:00:00Z', 96, 3);
  it('sends one day-before alert per subscriber, fetches cloud once per cell, and records it', async () => {
    let cloudCalls = 0;
    const f = fakeAdapter([
      tromso('a'),
      tromso('b', { lat: 69.62, lon: 18.97 }),
      tromso('c', { lang: 'en' }),
    ]);
    const deps = {
      now: new Date('2026-12-01T14:20:00Z'),
      adapters: [f.adapter],
      getKpForecast: async () => kpForecast,
      getCloudForecast: async () => {
        cloudCalls += 1;
        return cloud('2026-12-01T00:00:00Z', 96, 10);
      },
    };
    const stats = await runAlerts(deps);
    expect(stats.web).toMatchObject({ checked: 3, sent: 3, removed: 0 });
    expect(stats.cells).toBe(1);
    expect(cloudCalls).toBe(1);
    expect(f.sent.map((s) => s.kind)).toEqual(['dayBefore', 'dayBefore', 'dayBefore']);
    expect(f.sent[2].title).toMatch(/aurora tomorrow night/);
    expect(f.saved.get('a')).toEqual({ lastDayBeforeNight: '2026-12-02' });

    // The next run 20 minutes later sends nothing.
    const again = await runAlerts({ ...deps, now: new Date('2026-12-01T14:40:00Z') });
    expect(again.web.sent).toBe(0);
    expect(f.sent).toHaveLength(3);
  });

  it('removes subscriptions the push service reports as gone, and keeps state on failures', async () => {
    const f = fakeAdapter([
      tromso('gone', { result: 'expired' }),
      tromso('flaky', { result: 'error' }),
      tromso('later', { result: 'deferred' }),
    ]);
    const stats = await runAlerts({
      now: new Date('2026-12-01T14:20:00Z'),
      adapters: [f.adapter],
      getKpForecast: async () => kpForecast,
      getCloudForecast: async () => cloud('2026-12-01T00:00:00Z', 96, 10),
    });
    expect(f.removed).toEqual(['gone']);
    expect(stats.web).toMatchObject({ removed: 1, failed: 1, deferred: 1, sent: 0 });
    expect(f.saved.size).toBe(0); // nothing marked as sent → retried on the next run
  });

  it('keeps going when one place has no cloud data', async () => {
    const f = fakeAdapter([
      tromso('north'),
      tromso('oslo', { lat: 59.91, lon: 10.75, name: 'Oslo' }),
    ]);
    const stats = await runAlerts({
      now: new Date('2026-12-01T14:20:00Z'),
      adapters: [f.adapter],
      getKpForecast: async () => kp('2026-12-01T00:00:00Z', 96, 6),
      getCloudForecast: async (lat) => {
        if (lat < 65) throw new Error('MET 503');
        return cloud('2026-12-01T00:00:00Z', 96, 0);
      },
    });
    expect(stats.errors).toBe(1);
    expect(f.sent.map((s) => s.id)).toEqual(['north']);
  });

  it('skips channels that are not configured', async () => {
    const f = fakeAdapter([tromso('a')]);
    f.adapter.enabled = () => false;
    const stats = await runAlerts({
      now: new Date('2026-12-01T14:20:00Z'),
      adapters: [f.adapter],
      getKpForecast: async () => kpForecast,
      getCloudForecast: async () => cloud('2026-12-01T00:00:00Z', 96, 0),
    });
    expect(stats.web.checked).toBe(0);
  });
});
