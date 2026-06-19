import type { VerdictThresholds } from './types';

export const DEFAULT_THRESHOLDS: VerdictThresholds = {
  maxCloudPct: 40,
  civilDarkDeg: -6,
  nauticalDarkDeg: -12,
  astronomicalDarkDeg: -18,
  horizonHours: 24,
};

/**
 * Minimum Kp index needed for aurora to be plausibly visible at a given
 * geographic latitude in Norway. Derived from auroral-oval rules of thumb.
 * Tunable — these are sensible defaults, not hard physics.
 */
export function requiredKpForLatitude(lat: number): number {
  const a = Math.abs(lat);
  if (a >= 67) return 1; // Tromsø, Alta, Finnmark, Lofoten
  if (a >= 64) return 2; // Bodø, Helgeland
  if (a >= 62) return 3; // Trondheim
  if (a >= 60) return 4; // Bergen, Sogn
  if (a >= 58) return 5; // Oslo, Stavanger
  return 6; // Kristiansand and further south
}
