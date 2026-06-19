import SunCalc from 'suncalc';
import type { DarknessBand } from './types';

/** Sun elevation (degrees above horizon) at a given time and location. */
export function sunElevationDeg(date: Date, lat: number, lon: number): number {
  const pos = SunCalc.getPosition(date, lat, lon);
  return (pos.altitude * 180) / Math.PI;
}

/**
 * Classify how dark the sky is from the sun's elevation.
 * - day: sun above the civil-twilight cutoff (not dark enough for aurora)
 * - civil / nautical / astronomical: progressively darker
 */
export function classifyDarkness(
  elevationDeg: number,
  civilDeg = -6,
  nauticalDeg = -12,
  astronomicalDeg = -18,
): DarknessBand {
  if (elevationDeg >= civilDeg) return 'day';
  if (elevationDeg >= nauticalDeg) return 'civil';
  if (elevationDeg >= astronomicalDeg) return 'nautical';
  return 'astronomical';
}
