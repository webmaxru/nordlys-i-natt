import { describe, expect, it } from 'vitest';
import { parseKpForecast, sampleOvationFromRaw } from './noaa';

describe('parseKpForecast', () => {
  it('skips the header and converts UTC timestamps to ISO', () => {
    const parsed = parseKpForecast([
      ['time_tag', 'kp', 'observed', 'noaa_scale'],
      ['2026-06-20 00:00:00', '2.67', 'predicted', null],
      ['2026-06-20 03:00:00', '3', 'estimated', null],
    ]);

    expect(parsed).toEqual([
      { time: '2026-06-20T00:00:00Z', kp: 2.67, observed: 'predicted' },
      { time: '2026-06-20T03:00:00Z', kp: 3, observed: 'estimated' },
    ]);
  });

  it('parses the array-of-objects shape NOAA currently serves', () => {
    const parsed = parseKpForecast([
      { time_tag: '2026-06-12T00:00:00', kp: 3.33, observed: 'observed', noaa_scale: null },
      { time_tag: '2026-06-12T03:00:00', kp: 3.67, observed: 'predicted', noaa_scale: null },
    ]);

    expect(parsed).toEqual([
      { time: '2026-06-12T00:00:00Z', kp: 3.33, observed: 'observed' },
      { time: '2026-06-12T03:00:00Z', kp: 3.67, observed: 'predicted' },
    ]);
  });
});

describe('sampleOvationFromRaw', () => {
  it('normalizes longitude and samples the nearest integer grid point', () => {
    const sample = sampleOvationFromRaw(
      {
        'Forecast Time': '2026-06-20T00:10:00Z',
        coordinates: [
          [342, 70, 42],
          [343, 70, 88],
          [10, 60, 12],
        ],
      },
      69.6,
      -17.4,
    );

    expect(sample).toEqual({ forecastTime: '2026-06-20T00:10:00Z', intensity: 88 });
  });
});
