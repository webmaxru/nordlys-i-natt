import { describe, expect, it } from 'vitest';
import {
  addDays,
  assessHours,
  assessNights,
  cellKey,
  chanceFor,
  cloudAt,
  decideAlerts,
  inHourWindow,
  kpAt,
  localDateHour,
  markSent,
  nightOf,
  nightsFromHours,
  type AlertHour,
} from './alerts';
import { alertMessage, placePath } from './alertCopy';
import type { CloudPoint, KpForecastPoint, NamedLocation } from './types';
import noaa from './__fixtures__/noaa-kp-2026-10-19.json';
import metTromso from './__fixtures__/met-cloud-tromso-2026-10-19.json';

const TROMSO: NamedLocation = { name: 'Tromsø', lat: 69.6492, lon: 18.9553 };
const OSLO: NamedLocation = { name: 'Oslo', lat: 59.9139, lon: 10.7522 };
const H = 3_600_000;

function kpSeries(
  from: string,
  hours: number,
  kp: number | ((t: Date) => number),
): KpForecastPoint[] {
  const out: KpForecastPoint[] = [];
  const start = Date.parse(from);
  for (let h = 0; h < hours; h += 3) {
    const t = new Date(start + h * H);
    out.push({
      time: t.toISOString(),
      kp: typeof kp === 'number' ? kp : kp(t),
      observed: 'predicted',
    });
  }
  return out;
}

function cloudSeries(
  from: string,
  hours: number,
  cloud: number | ((t: Date) => number),
): CloudPoint[] {
  const out: CloudPoint[] = [];
  const start = Date.parse(from);
  for (let h = 0; h < hours; h++) {
    const t = new Date(start + h * H);
    out.push({ time: t.toISOString(), cloudPct: typeof cloud === 'number' ? cloud : cloud(t) });
  }
  return out;
}

describe('calendar helpers', () => {
  it('reads local date and hour in Europe/Oslo across the DST change', () => {
    // 2026-10-25 01:00 UTC is 02:00 CET (after the switch back from CEST at 03:00 CEST).
    expect(localDateHour(new Date('2026-10-24T22:30:00Z'), 'Europe/Oslo')).toEqual({
      date: '2026-10-25',
      hour: 0,
    });
    expect(localDateHour(new Date('2026-10-25T01:30:00Z'), 'Europe/Oslo')).toEqual({
      date: '2026-10-25',
      hour: 2,
    });
    expect(localDateHour(new Date('2026-07-01T10:00:00Z'), 'Europe/Oslo')).toEqual({
      date: '2026-07-01',
      hour: 12,
    });
  });

  it('names a night after the date of its evening', () => {
    expect(nightOf(new Date('2026-12-01T20:00:00Z'), 'Europe/Oslo')).toBe('2026-12-01'); // 21:00 local
    expect(nightOf(new Date('2026-12-02T02:00:00Z'), 'Europe/Oslo')).toBe('2026-12-01'); // 03:00 local
    expect(nightOf(new Date('2026-12-02T11:30:00Z'), 'Europe/Oslo')).toBe('2026-12-02'); // 12:30 local
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles hour windows, including wrap-around and disabled windows', () => {
    expect(inHourWindow(15, 15, 21)).toBe(true);
    expect(inHourWindow(21, 15, 21)).toBe(false);
    expect(inHourWindow(23, 22, 6)).toBe(true);
    expect(inHourWindow(5, 22, 6)).toBe(true);
    expect(inHourWindow(3, 4, 4)).toBe(false);
  });

  it('groups nearby places into one ~11 km cell', () => {
    expect(cellKey(69.6492, 18.9553)).toBe('69.6,19.0');
    expect(cellKey(69.62, 18.97)).toBe(cellKey(69.64, 18.96));
  });
});

describe('data lookup', () => {
  const kp = kpSeries('2026-12-01T00:00:00Z', 9, (t) => t.getUTCHours());
  it('takes Kp from the 3-hour block that contains the instant', () => {
    expect(kpAt(kp, Date.parse('2026-12-01T04:30:00Z'))?.kp).toBe(3);
    expect(kpAt(kp, Date.parse('2026-12-01T08:59:00Z'))?.kp).toBe(6);
    expect(kpAt(kp, Date.parse('2026-12-01T09:00:00Z'))).toBeNull(); // past the last block
  });
  it('treats cloud cover more than 3 h away as unknown', () => {
    const cloud: CloudPoint[] = [{ time: '2026-12-01T12:00:00Z', cloudPct: 10 }];
    expect(cloudAt(cloud, Date.parse('2026-12-01T14:30:00Z'))).toBe(10);
    expect(cloudAt(cloud, Date.parse('2026-12-01T16:00:00Z'))).toBeNull();
  });
});

describe('chance per night', () => {
  const now = new Date('2026-12-01T12:00:00Z'); // 13:00 Oslo

  it('grades a clear, active polar night in Tromsø as high', () => {
    const nights = assessNights({
      location: TROMSO,
      kpForecast: kpSeries('2026-12-01T00:00:00Z', 96, 3),
      cloudForecast: cloudSeries('2026-12-01T00:00:00Z', 96, 10),
      now,
    });
    const tonight = nights.find((n) => n.nightOf === '2026-12-01')!;
    expect(tonight.darkHours).toBeGreaterThan(12);
    expect(tonight.chance).toBe('high');
    expect(tonight.complete).toBe(true);
  });

  it('grades an overcast night as none, even with a storm', () => {
    const nights = assessNights({
      location: TROMSO,
      kpForecast: kpSeries('2026-12-01T00:00:00Z', 96, 7),
      cloudForecast: cloudSeries('2026-12-01T00:00:00Z', 96, 100),
      now,
    });
    expect(nights.find((n) => n.nightOf === '2026-12-01')!.chance).toBe('none');
  });

  it('needs a stronger Kp further south (Oslo needs Kp 5)', () => {
    const base = { location: OSLO, cloudForecast: cloudSeries('2026-12-01T00:00:00Z', 96, 0), now };
    const quiet = assessNights({ ...base, kpForecast: kpSeries('2026-12-01T00:00:00Z', 96, 3) });
    const nearMiss = assessNights({ ...base, kpForecast: kpSeries('2026-12-01T00:00:00Z', 96, 4) });
    const storm = assessNights({ ...base, kpForecast: kpSeries('2026-12-01T00:00:00Z', 96, 6) });
    expect(quiet.find((n) => n.nightOf === '2026-12-01')!.chance).toBe('none');
    expect(nearMiss.find((n) => n.nightOf === '2026-12-01')!.chance).toBe('low');
    expect(storm.find((n) => n.nightOf === '2026-12-01')!.chance).toBe('high');
  });

  it('never alerts under the midnight sun', () => {
    const nights = assessNights({
      location: TROMSO,
      kpForecast: kpSeries('2026-06-20T00:00:00Z', 96, 8),
      cloudForecast: cloudSeries('2026-06-20T00:00:00Z', 96, 0),
      now: new Date('2026-06-20T12:00:00Z'),
    });
    expect(nights.every((n) => n.darkHours === 0 && n.chance === 'none')).toBe(true);
  });

  it('counts a single clear hour as low and one strong clear hour as good', () => {
    const mk = (kp: number, cloud: number, isDark = true): AlertHour => ({
      time: '2026-12-01T20:00:00Z',
      nightOf: '2026-12-01',
      localHour: 21,
      sunElevationDeg: -30,
      isDark,
      kp,
      kpKind: 'predicted',
      cloudPct: cloud,
      requiredKp: 3,
      visible: isDark && kp >= 3 && cloud <= 40,
      score: 50,
    });
    expect(chanceFor([mk(3, 10), mk(3, 90), mk(3, 90)])).toBe('low');
    expect(chanceFor([mk(4, 10), mk(3, 90)])).toBe('good');
    expect(chanceFor([mk(3, 10), mk(3, 20)])).toBe('good');
    expect(chanceFor([mk(1, 0), mk(1, 0)])).toBe('none');
    expect(chanceFor([mk(2, 60)])).toBe('low'); // near miss
  });

  it('marks nights without Kp data as incomplete and never better than none', () => {
    const nights = assessNights({
      location: TROMSO,
      kpForecast: kpSeries('2026-12-01T00:00:00Z', 24, 4), // ends 2026-12-02 00:00Z
      cloudForecast: cloudSeries('2026-12-01T00:00:00Z', 96, 0),
      now,
    });
    const later = nights.find((n) => n.nightOf === '2026-12-03')!;
    expect(later.complete).toBe(false);
    expect(later.chance).toBe('none');
  });
});

describe('day-before alert', () => {
  const kp = kpSeries('2026-12-01T00:00:00Z', 96, (t) =>
    t.getUTCDate() === 2 || t.getUTCDate() === 3 ? 4 : 0,
  );
  const cloud = cloudSeries('2026-12-01T00:00:00Z', 96, 5);
  function run(nowIso: string, state = {}, prefs = {}) {
    const now = new Date(nowIso);
    const hours = assessHours({ location: TROMSO, kpForecast: kp, cloudForecast: cloud, now });
    return decideAlerts({ hours, nights: nightsFromHours(hours, TROMSO), now, state, prefs });
  }

  it('fires in the afternoon window for tomorrow night', () => {
    const d = run('2026-12-01T14:20:00Z'); // 15:20 Oslo
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ kind: 'dayBefore', nightOf: '2026-12-02', ttlSeconds: 43200 });
    expect(d[0].night.chance).toBe('high');
  });

  it('stays quiet before 15:00 and from 21:00 local', () => {
    expect(run('2026-12-01T13:59:00Z')).toHaveLength(0); // 14:59
    expect(run('2026-12-01T20:00:00Z')).toHaveLength(0); // 21:00
  });

  it('sends at most once per night', () => {
    const first = run('2026-12-01T14:20:00Z');
    const state = markSent({}, first[0]);
    expect(state).toEqual({ lastDayBeforeNight: '2026-12-02' });
    expect(run('2026-12-01T14:40:00Z', state)).toHaveLength(0);
    expect(run('2026-12-01T19:40:00Z', state)).toHaveLength(0);
    // the next day it can fire for the following night
    expect(run('2026-12-02T14:20:00Z', state)[0]).toMatchObject({ nightOf: '2026-12-03' });
  });

  it('does not fire for a quiet tomorrow even if tonight is great', () => {
    // night of 12-01 is Kp 0 → nothing; the 12-04 night has no data (horizon) → nothing
    expect(run('2026-12-03T14:20:00Z')).toHaveLength(0);
  });

  it('respects the "high only" preference and the opt-out', () => {
    const goodOnly = kpSeries('2026-12-01T00:00:00Z', 96, (t) => (t.getUTCDate() === 2 ? 1 : 0));
    const now = new Date('2026-12-01T14:20:00Z');
    const hours = assessHours({
      location: TROMSO,
      kpForecast: goodOnly,
      cloudForecast: cloud,
      now,
    });
    const nights = nightsFromHours(hours, TROMSO);
    expect(nights.find((n) => n.nightOf === '2026-12-02')!.chance).toBe('good');
    expect(decideAlerts({ hours, nights, now })).toHaveLength(1);
    expect(decideAlerts({ hours, nights, now, prefs: { minChance: 'high' } })).toHaveLength(0);
    expect(decideAlerts({ hours, nights, now, prefs: { dayBefore: false } })).toHaveLength(0);
  });
});

describe('happening-now alert (opt-in)', () => {
  const kp = kpSeries('2026-12-01T00:00:00Z', 48, 3);
  const cloud = cloudSeries('2026-12-01T00:00:00Z', 48, (t) =>
    t.getUTCHours() >= 21 || t.getUTCHours() < 1 ? 5 : 95,
  );

  function run(nowIso: string, prefs: object = { now: true, dayBefore: false }, state = {}) {
    const now = new Date(nowIso);
    const hours = assessHours({ location: TROMSO, kpForecast: kp, cloudForecast: cloud, now });
    return decideAlerts({ hours, nights: nightsFromHours(hours, TROMSO), now, prefs, state });
  }

  it('fires when it is dark, clear and Kp is high enough right now', () => {
    const d = run('2026-12-01T21:10:00Z'); // 22:10 Oslo
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ kind: 'now', nightOf: '2026-12-01', ttlSeconds: 3600 });
  });

  it('is off unless opted in', () => {
    expect(run('2026-12-01T21:10:00Z', {})).toHaveLength(0);
  });

  it('stays silent when cloudy, in quiet hours, or after one alert that night', () => {
    expect(run('2026-12-01T18:10:00Z')).toHaveLength(0); // cloudy
    const sent = markSent({}, run('2026-12-01T21:10:00Z')[0]);
    expect(run('2026-12-01T23:30:00Z', { now: true, dayBefore: false }, sent)).toHaveLength(0);
    // 02:30 Oslo is inside the default quiet hours even though it's clear
    const quiet = cloudSeries('2026-12-01T00:00:00Z', 48, 0);
    const now = new Date('2026-12-02T01:30:00Z');
    const hours = assessHours({ location: TROMSO, kpForecast: kp, cloudForecast: quiet, now });
    expect(
      decideAlerts({ hours, nights: nightsFromHours(hours, TROMSO), now, prefs: { now: true } }),
    ).toHaveLength(0);
  });
});

describe('real data fixture: Tromsø, captured 2026-10-19 23:08 UTC', () => {
  const kpForecast = noaa.points as KpForecastPoint[];
  const cloudForecast = metTromso.points as CloudPoint[];

  it('rates tonight (overcast) low and tomorrow night (clear, Kp 3–4) high', () => {
    const nights = assessNights({
      location: TROMSO,
      kpForecast,
      cloudForecast,
      now: new Date('2026-10-19T23:08:00Z'),
    });
    const tonight = nights.find((n) => n.nightOf === '2026-10-19')!;
    const tomorrow = nights.find((n) => n.nightOf === '2026-10-20')!;
    expect(tonight.visibleHours).toBe(0);
    expect(['none', 'low']).toContain(tonight.chance);
    expect(tomorrow.chance).toBe('high');
    expect(tomorrow.bestHour?.cloudPct).toBeLessThanOrEqual(5);
  });

  it('would have sent the day-before alert at 15:00 Oslo on 19 October', () => {
    // Same inputs, evaluated as if the job ran at 15:00 local (13:00 UTC); the forecast for
    // the 20th was already in the data.
    const now = new Date('2026-10-19T13:00:00Z');
    const hours = assessHours({ location: TROMSO, kpForecast, cloudForecast, now });
    const decisions = decideAlerts({ hours, nights: nightsFromHours(hours, TROMSO), now });
    expect(decisions.map((d) => [d.kind, d.nightOf])).toEqual([['dayBefore', '2026-10-20']]);
    const nb = alertMessage(decisions[0], { lang: 'nb', place: TROMSO, channel: 'email' });
    const en = alertMessage(decisions[0], { lang: 'en', place: TROMSO, channel: 'web' });
    expect(nb.title).toBe('🌌 Stor sjanse for nordlys i morgen kveld');
    expect(nb.body).toMatch(
      /^Tromsø, kvelden tirsdag 20\. oktober: best rundt kl\. \d\d:\d\d, Kp [\d.]+ ventet/,
    );
    expect(en.title).toBe('🌌 High chance of aurora tomorrow night');
    expect(en.body).toMatch(/^Tromsø, the night of Tuesday 20 October: best around \d\d:\d\d/);
    expect(en.path).toContain('utm_medium=web');
  });
});

describe('copy', () => {
  it('links back to the place with campaign tags', () => {
    expect(placePath({ lat: 69.6492, lon: 18.9553, name: 'Tromsø' }, 'app')).toBe(
      '/?lat=69.6492&lon=18.9553&name=Troms%C3%B8&utm_source=alert&utm_medium=app',
    );
  });
});
