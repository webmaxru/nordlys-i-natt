import { useQuery } from '@tanstack/react-query';
import type { NamedLocation } from '@nordlys/shared';
import { getForecast } from '../api/forecast';

function roundCoord(value: number): number {
  return Number(value.toFixed(4));
}

export function useForecast(location: NamedLocation | null) {
  return useQuery({
    queryKey: [
      'forecast',
      location ? roundCoord(location.lat) : null,
      location ? roundCoord(location.lon) : null,
    ],
    queryFn: () => {
      if (!location) {
        throw new Error('Location is required');
      }

      return getForecast(location);
    },
    enabled: Boolean(location),
    staleTime: 10 * 60_000,
  });
}
