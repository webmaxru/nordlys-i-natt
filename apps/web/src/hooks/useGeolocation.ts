import { useCallback, useState } from 'react';

type GeolocationStatus =
  | 'idle'
  | 'prompting'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type GeolocationErrorReason =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unknown';

interface Coordinates {
  lat: number;
  lon: number;
}

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

function getInitialStatus(): GeolocationStatus {
  return isSupported() ? 'idle' : 'unsupported';
}

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>(getInitialStatus);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [reason, setReason] = useState<GeolocationErrorReason | null>(null);

  const request = useCallback(() => {
    if (!isSupported()) {
      setStatus('unsupported');
      setReason('unsupported');
      return;
    }

    // iOS Safari silently rejects geolocation on non-secure origins (no prompt).
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setStatus('denied');
      setReason('insecure');
      return;
    }

    setStatus('prompting');
    setReason(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('granted');
        setReason(null);
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (positionError) => {
        let nextReason: GeolocationErrorReason = 'unknown';
        if (positionError.code === positionError.PERMISSION_DENIED) {
          nextReason = 'denied';
        } else if (positionError.code === positionError.POSITION_UNAVAILABLE) {
          nextReason = 'unavailable';
        } else if (positionError.code === positionError.TIMEOUT) {
          nextReason = 'timeout';
        }

        setStatus(nextReason === 'denied' ? 'denied' : 'idle');
        setReason(nextReason);
        setCoords(null);
      },
      // Regional accuracy is enough for aurora; high accuracy is slower and
      // times out more often on mobile. A generous timeout avoids false errors.
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return { status, coords, request, reason };
}
