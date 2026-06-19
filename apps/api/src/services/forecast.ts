import {
  computeVerdict,
  type CloudPoint,
  type KpForecastPoint,
  type NamedLocation,
  type OvationSample,
} from '@nordlys/shared';
import { getCloudForecast } from './met';
import { getKpForecast, sampleOvation } from './noaa';

export type ForecastPayload = {
  location: NamedLocation;
  inputs: {
    kpForecast: KpForecastPoint[];
    cloudForecast: CloudPoint[];
    ovation: OvationSample | null;
  };
  verdict: ReturnType<typeof computeVerdict>;
};

export async function buildForecast(location: NamedLocation): Promise<ForecastPayload> {
  const [kpForecast, cloudForecast, ovation] = await Promise.all([
    getKpForecast(),
    getCloudForecast(location.lat, location.lon),
    sampleOvation(location.lat, location.lon),
  ]);

  return {
    location,
    inputs: { kpForecast, cloudForecast, ovation },
    verdict: computeVerdict({ location, kpForecast, cloudForecast, ovation }),
  };
}
