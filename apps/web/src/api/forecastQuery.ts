import type { NamedLocation } from '@nordlys/shared';

/**
 * The forecast query is keyed on rounded coordinates so nearby fixes reuse the
 * same cache entry. This factory is shared by the `useForecast` hook and the
 * WebMCP tools so both read and write the identical React Query cache entry
 * (no duplicate network requests, and the on-screen verdict stays in sync).
 */

export function roundCoord(value: number): number {
  return Number(value.toFixed(4));
}

export function forecastQueryKey(
  location: Pick<NamedLocation, 'lat' | 'lon'> | null,
): (string | number | null)[] {
  return [
    'forecast',
    location ? roundCoord(location.lat) : null,
    location ? roundCoord(location.lon) : null,
  ];
}
