import type { Verdict } from '@nordlys/shared';

export function verdictColor(verdict: Verdict): string {
  switch (verdict) {
    case 'GO':
      return 'var(--go)';
    case 'MAYBE':
      return 'var(--maybe)';
    case 'NO':
      return 'var(--no)';
  }
}

export function formatLocalHour(iso: string, locale?: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// A user-friendly label for a raw coordinate (e.g. "69.65°N, 18.96°E"), used as
// a fallback location name when reverse geocoding can't find a nearby place.
// ~2 decimals ≈ 1 km — enough to read, no need for full precision in a name.
export function formatCoordinateName(lat: number, lon: number): string {
  const latLabel = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonLabel = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latLabel}, ${lonLabel}`;
}

export function kpColor(kp: number): string {
  if (kp >= 5) {
    return 'var(--go)';
  }

  if (kp >= 3) {
    return 'var(--maybe)';
  }

  return 'var(--no)';
}
