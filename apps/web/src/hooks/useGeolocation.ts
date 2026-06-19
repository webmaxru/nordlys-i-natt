import { useCallback, useState } from 'react';

type GeolocationStatus =
  | 'idle'
  | 'prompting'
  | 'granted'
  | 'denied'
  | 'unsupported';

interface Coordinates {
  lat: number;
  lon: number;
}

function getInitialStatus(): GeolocationStatus {
  return typeof navigator === 'undefined' || !navigator.geolocation
    ? 'unsupported'
    : 'idle';
}

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>(getInitialStatus);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [error, setError] = useState<GeolocationPositionError | Error | null>(
    null,
  );

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      setError(new Error('Geolocation is not supported'));
      return;
    }

    setStatus('prompting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('granted');
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (positionError) => {
        setStatus(
          positionError.code === positionError.PERMISSION_DENIED
            ? 'denied'
            : 'idle',
        );
        setError(positionError);
        setCoords(null);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return { status, coords, request, error };
}
