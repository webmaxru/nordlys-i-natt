import type { CloudPoint } from '@nordlys/shared';
import { config } from '../config';
import { fetchJsonCached } from './cache';

const LOCATIONFORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const SUNRISE_URL = 'https://api.met.no/weatherapi/sunrise/3.0/sun';

type MetTimeseriesPoint = {
  time?: unknown;
  data?: {
    instant?: {
      details?: {
        cloud_area_fraction?: unknown;
      };
    };
  };
};

type MetLocationforecastRaw = {
  properties?: {
    timeseries?: MetTimeseriesPoint[];
  };
};

function metHeaders(): Record<string, string> {
  return { 'User-Agent': config.met.userAgent };
}

function clampCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function formatCoordinate(value: number): string {
  return clampCoordinate(value).toString();
}

export async function getLocationforecastRaw(lat: number, lon: number): Promise<unknown> {
  const url = `${LOCATIONFORECAST_URL}?lat=${formatCoordinate(lat)}&lon=${formatCoordinate(lon)}`;
  return fetchJsonCached(url, config.met.cacheTtlSeconds, metHeaders());
}

export async function getCloudForecast(lat: number, lon: number): Promise<CloudPoint[]> {
  const raw = (await getLocationforecastRaw(lat, lon)) as MetLocationforecastRaw;
  return (raw.properties?.timeseries ?? []).flatMap((point) => {
    const time = typeof point.time === 'string' ? point.time : null;
    const cloudPct = Number(point.data?.instant?.details?.cloud_area_fraction);
    if (!time || !Number.isFinite(cloudPct)) {
      return [];
    }

    return [{ time, cloudPct }];
  });
}

export async function getSunriseRaw(lat: number, lon: number, date: string): Promise<unknown> {
  const url =
    `${SUNRISE_URL}?lat=${formatCoordinate(lat)}&lon=${formatCoordinate(lon)}` +
    `&date=${encodeURIComponent(date)}&offset=%2B00%3A00`;
  return fetchJsonCached(url, config.met.cacheTtlSeconds, metHeaders());
}
