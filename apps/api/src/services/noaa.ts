import type { KpForecastPoint, OvationSample } from '@nordlys/shared';
import { config } from '../config';
import { fetchJsonCached } from './cache';

const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
const OVATION_URL = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';

type ObservedKind = KpForecastPoint['observed'];
type OvationCoordinate = [number, number, number];

type OvationRaw = {
  'Forecast Time'?: unknown;
  coordinates?: unknown;
};

export type BBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

/** Normalize a NOAA time_tag to an ISO-8601 UTC string with a trailing Z. */
function toIsoUtc(timeTag: string): string {
  const withT = timeTag.includes('T') ? timeTag : timeTag.replace(' ', 'T');
  return withT.endsWith('Z') ? withT : `${withT}Z`;
}

/**
 * Parse the NOAA planetary K-index forecast. Handles BOTH shapes NOAA has
 * served over time:
 *  - array of objects: `{ time_tag, kp, observed, noaa_scale }` (current)
 *  - array of arrays with a header row: `["time_tag","kp",...]`, `[...]`
 */
export function parseKpForecast(raw: unknown): KpForecastPoint[] {
  if (!Array.isArray(raw)) {
    throw new Error('NOAA Kp response is not an array');
  }
  if (raw.length === 0) {
    return [];
  }

  const objectShape = typeof raw[0] === 'object' && raw[0] !== null && !Array.isArray(raw[0]);
  const rows = objectShape ? raw : raw.slice(1); // skip header row for the array shape

  return rows.flatMap((row) => {
    let timeTag: unknown;
    let kpRaw: unknown;
    let observedRaw: unknown;

    if (objectShape) {
      const obj = row as Record<string, unknown>;
      timeTag = obj.time_tag;
      kpRaw = obj.kp;
      observedRaw = obj.observed;
    } else if (Array.isArray(row)) {
      [timeTag, kpRaw, observedRaw] = row;
    } else {
      return [];
    }

    const time = typeof timeTag === 'string' ? timeTag : null;
    const kp = Number(kpRaw);
    if (
      !time ||
      !Number.isFinite(kp) ||
      (observedRaw !== 'observed' && observedRaw !== 'estimated' && observedRaw !== 'predicted')
    ) {
      return [];
    }

    return [{ time: toIsoUtc(time), kp, observed: observedRaw as ObservedKind }];
  });
}

function ovationCoordinates(raw: OvationRaw): OvationCoordinate[] {
  if (!Array.isArray(raw.coordinates)) {
    return [];
  }

  return raw.coordinates.flatMap((point) => {
    if (!Array.isArray(point) || point.length < 3) {
      return [];
    }

    const lon = Number(point[0]);
    const lat = Number(point[1]);
    const intensity = Number(point[2]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(intensity)) {
      return [];
    }

    return [[lon, lat, intensity] satisfies OvationCoordinate];
  });
}

export function normalizeOvationLongitude(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

export function outputLongitude(lon: number): number {
  const normalized = normalizeOvationLongitude(lon);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function sampleOvationFromRaw(raw: OvationRaw, lat: number, lon: number): OvationSample {
  const forecastTime = typeof raw['Forecast Time'] === 'string' ? raw['Forecast Time'] : '';
  const targetLon = Math.round(normalizeOvationLongitude(lon)) % 360;
  const targetLat = Math.round(lat);
  const coordinate = ovationCoordinates(raw).find(
    ([gridLon, gridLat]) => Math.round(gridLon) === targetLon && Math.round(gridLat) === targetLat,
  );

  return {
    forecastTime,
    intensity: coordinate?.[2] ?? 0,
  };
}

export async function getKpForecast(): Promise<KpForecastPoint[]> {
  return parseKpForecast(await fetchJsonCached(KP_URL, config.noaa.cacheTtlSeconds));
}

export async function getOvationRaw(): Promise<OvationRaw> {
  return fetchJsonCached(OVATION_URL, config.noaa.cacheTtlSeconds);
}

export async function sampleOvation(lat: number, lon: number): Promise<OvationSample> {
  return sampleOvationFromRaw(await getOvationRaw(), lat, lon);
}

export async function getOvationGrid(
  bbox: BBox,
): Promise<{ forecastTime: string; points: Array<[number, number, number]> }> {
  const raw = await getOvationRaw();
  const forecastTime = typeof raw['Forecast Time'] === 'string' ? raw['Forecast Time'] : '';
  const points = ovationCoordinates(raw).flatMap(([rawLon, lat, intensity]) => {
    const lon = outputLongitude(rawLon);
    if (lon < bbox.minLon || lon > bbox.maxLon || lat < bbox.minLat || lat > bbox.maxLat) {
      return [];
    }

    return [[lon, lat, intensity] satisfies [number, number, number]];
  });

  return { forecastTime, points };
}
