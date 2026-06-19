import type {
  AuroraVerdict,
  CloudPoint,
  KpForecastPoint,
  NamedLocation,
  OvationSample,
} from '@nordlys/shared';
import { apiFetch } from './client';

export interface ForecastResponse {
  location: NamedLocation;
  inputs: {
    kpForecast: KpForecastPoint[];
    cloudForecast: CloudPoint[];
    ovation: OvationSample | null;
  };
  verdict: AuroraVerdict;
}

export interface OvationGrid {
  forecastTime: string;
  points: [number, number, number][];
}

export function getForecast(loc: {
  lat: number;
  lon: number;
  name?: string;
}): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    lat: String(loc.lat),
    lon: String(loc.lon),
  });

  if (loc.name) {
    params.set('name', loc.name);
  }

  return apiFetch<ForecastResponse>(`/api/forecast?${params.toString()}`);
}

export function getOvationGrid(
  bbox?: [number, number, number, number],
): Promise<OvationGrid> {
  const params = new URLSearchParams();

  if (bbox) {
    params.set('bbox', bbox.join(','));
  }

  const query = params.toString();
  return apiFetch<OvationGrid>(
    `/api/noaa/ovation/grid${query ? `?${query}` : ''}`,
  );
}
