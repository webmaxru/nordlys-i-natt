import { DEFAULT_ALERT_PREFS, type AlertPrefs } from '@nordlys/shared';

export function parseCoordinate(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  // Two decimals (about 1 km) is all the alerts need, and all the privacy policy promises we keep.
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null;
}

export function parseLocation(raw: unknown): { lat: number; lon: number; name: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { lat?: unknown; lon?: unknown; name?: unknown };
  const lat = parseCoordinate(r.lat, -90, 90);
  const lon = parseCoordinate(r.lon, -180, 180);
  const name =
    typeof r.name === 'string'
      ? [...r.name]
          .filter((ch) => ch.charCodeAt(0) >= 32 && ch !== '<' && ch !== '>')
          .join('')
          .trim()
          .slice(0, 80)
      : '';
  if (lat === null || lon === null || !name) return null;
  return { lat, lon, name };
}

export function parsePrefs(raw: unknown): AlertPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<
    Record<keyof AlertPrefs, unknown>
  >;
  return {
    dayBefore: typeof r.dayBefore === 'boolean' ? r.dayBefore : DEFAULT_ALERT_PREFS.dayBefore,
    now: typeof r.now === 'boolean' ? r.now : DEFAULT_ALERT_PREFS.now,
    minChance: r.minChance === 'high' ? 'high' : 'good',
  };
}
