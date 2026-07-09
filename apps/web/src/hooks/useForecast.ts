import { useQuery } from '@tanstack/react-query';
import type { NamedLocation } from '@nordlys/shared';
import { getForecast } from '../api/forecast';
import { forecastQueryKey } from '../api/forecastQuery';

export function useForecast(location: NamedLocation | null) {
  return useQuery({
    queryKey: forecastQueryKey(location),
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
