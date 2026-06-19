import { describe, expect, it } from 'vitest';
import { computeVerdict } from './verdict';
import { requiredKpForLatitude } from './thresholds';
import type { CloudPoint, KpForecastPoint, NamedLocation } from './types';

const TROMSO: NamedLocation = { name: 'Tromsø', lat: 69.6492, lon: 18.9553 };
const OSLO: NamedLocation = { name: 'Oslo', lat: 59.9139, lon: 10.7522 };

/** Build a 48h constant Kp series starting 3h before `from`. */
function kpSeries(from: Date, kp: number): KpForecastPoint[] {
  const out: KpForecastPoint[] = [];
  for (let h = -3; h <= 48; h += 3) {
    out.push({
      time: new Date(from.getTime() + h * 3_600_000).toISOString(),
      kp,
      observed: 'predicted',
    });
  }
  return out;
}

/** Build a 48h constant cloud series. */
function cloudSeries(from: Date, cloudPct: number): CloudPoint[] {
  const out: CloudPoint[] = [];
  for (let h = -1; h <= 48; h += 1) {
    out.push({
      time: new Date(from.getTime() + h * 3_600_000).toISOString(),
      cloudPct,
    });
  }
  return out;
}

describe('requiredKpForLatitude', () => {
  it('decreases with latitude', () => {
    expect(requiredKpForLatitude(69.6)).toBe(1); // Tromsø
    expect(requiredKpForLatitude(63.4)).toBe(3); // Trondheim
    expect(requiredKpForLatitude(59.9)).toBe(5); // Oslo
    expect(requiredKpForLatitude(58.1)).toBe(5);
    expect(requiredKpForLatitude(57.0)).toBe(6);
  });
});

describe('computeVerdict', () => {
  // A dark winter evening so the 24h horizon contains real night hours.
  const winterNight = new Date('2026-01-15T18:00:00Z');

  it('returns GO for Tromsø with clear skies and sufficient Kp', () => {
    const v = computeVerdict({
      location: TROMSO,
      now: winterNight,
      kpForecast: kpSeries(winterNight, 3),
      cloudForecast: cloudSeries(winterNight, 10),
    });
    expect(v.verdict).toBe('GO');
    expect(v.reason).toBe('none');
    expect(v.bestHour).not.toBeNull();
    expect(v.bestHour?.visible).toBe(true);
    expect(v.requiredKp).toBe(1);
  });

  it('returns NO/too_cloudy for Oslo when Kp is high but it is overcast', () => {
    const v = computeVerdict({
      location: OSLO,
      now: winterNight,
      kpForecast: kpSeries(winterNight, 6),
      cloudForecast: cloudSeries(winterNight, 95),
    });
    expect(v.reason).toBe('too_cloudy');
    expect(v.verdict).toBe('NO'); // 95% > maxCloud+30 → not even a near-miss
  });

  it('returns MAYBE for Oslo with borderline clouds and enough Kp', () => {
    const v = computeVerdict({
      location: OSLO,
      now: winterNight,
      kpForecast: kpSeries(winterNight, 5),
      cloudForecast: cloudSeries(winterNight, 55),
    });
    expect(v.verdict).toBe('MAYBE');
    expect(v.reason).toBe('too_cloudy');
  });

  it('returns NO/kp_too_low for Oslo when Kp is far below the latitude need', () => {
    const v = computeVerdict({
      location: OSLO,
      now: winterNight,
      kpForecast: kpSeries(winterNight, 1),
      cloudForecast: cloudSeries(winterNight, 0),
    });
    expect(v.reason).toBe('kp_too_low');
    expect(v.verdict).toBe('NO');
  });

  it('returns NO/not_dark under the midnight sun (Tromsø in midsummer)', () => {
    const midsummer = new Date('2026-06-21T12:00:00Z');
    const v = computeVerdict({
      location: TROMSO,
      now: midsummer,
      kpForecast: kpSeries(midsummer, 7),
      cloudForecast: cloudSeries(midsummer, 0),
    });
    expect(v.reason).toBe('not_dark');
    expect(v.verdict).toBe('NO');
    expect(v.bestHour).toBeNull();
  });

  it('produces an hourly timeline across the horizon', () => {
    const v = computeVerdict({
      location: TROMSO,
      now: winterNight,
      kpForecast: kpSeries(winterNight, 3),
      cloudForecast: cloudSeries(winterNight, 10),
      thresholds: { horizonHours: 12 },
    });
    expect(v.hours).toHaveLength(12);
    expect(v.hours[0]).toHaveProperty('score');
    expect(v.hours[0]).toHaveProperty('darkness');
  });
});
