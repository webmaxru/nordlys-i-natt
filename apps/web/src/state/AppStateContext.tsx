import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { NamedLocation } from '@nordlys/shared';
import { useForecast } from '../hooks/useForecast';
import type { ForecastResponse } from '../api/forecast';

const storageKey = 'nordlys.location';

type ForecastState = {
  data: ForecastResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

interface AppState {
  selectedLocation: NamedLocation | null;
  setSelectedLocation: (loc: NamedLocation | null) => void;
  forecast: ForecastState;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

function readStoredLocation(): NamedLocation | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<NamedLocation>;
    if (
      typeof parsed.name === 'string' &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number'
    ) {
      return {
        name: parsed.name,
        region:
          typeof parsed.region === 'string' ? parsed.region : undefined,
        lat: parsed.lat,
        lon: parsed.lon,
      };
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }

  return null;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocation] =
    useState<NamedLocation | null>(readStoredLocation);
  const forecastQuery = useForecast(selectedLocation);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (selectedLocation) {
      window.localStorage.setItem(storageKey, JSON.stringify(selectedLocation));
      return;
    }

    window.localStorage.removeItem(storageKey);
  }, [selectedLocation]);

  const value = useMemo<AppState>(
    () => ({
      selectedLocation,
      setSelectedLocation,
      forecast: {
        data: forecastQuery.data,
        isLoading: forecastQuery.isLoading,
        isError: forecastQuery.isError,
        refetch: () => {
          void forecastQuery.refetch();
        },
      },
    }),
    [
      forecastQuery.data,
      forecastQuery.isError,
      forecastQuery.isLoading,
      forecastQuery.refetch,
      selectedLocation,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return context;
}
