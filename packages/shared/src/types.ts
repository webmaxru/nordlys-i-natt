/**
 * Shared domain types — the contract used by both the web app and the API/job.
 */

export type Verdict = 'GO' | 'MAYBE' | 'NO';

export type DarknessBand = 'day' | 'civil' | 'nautical' | 'astronomical';

export type LimitingReason = 'none' | 'not_dark' | 'kp_too_low' | 'too_cloudy';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface NamedLocation extends GeoPoint {
  name: string;
  region?: string;
}

/** A single Kp index sample (NOAA planetary K-index forecast, 3-hourly). */
export interface KpForecastPoint {
  /** ISO-8601 UTC timestamp. */
  time: string;
  kp: number;
  observed: 'observed' | 'estimated' | 'predicted';
}

/** Aurora intensity (0–100) sampled at a location from the NOAA OVATION grid. */
export interface OvationSample {
  forecastTime: string;
  intensity: number;
}

/** Hourly cloud cover from MET locationforecast (cloud_area_fraction, %). */
export interface CloudPoint {
  /** ISO-8601 UTC timestamp. */
  time: string;
  cloudPct: number;
}

/** Per-hour assessment produced by the verdict engine. */
export interface HourlyAssessment {
  /** ISO-8601 UTC timestamp. */
  time: string;
  kp: number;
  requiredKp: number;
  cloudPct: number;
  sunElevationDeg: number;
  darkness: DarknessBand;
  isDark: boolean;
  /** Aurora intensity at the location if OVATION was supplied (0–100). */
  ovationIntensity: number | null;
  /** Combined 0–100 desirability score for this hour. */
  score: number;
  /** True when dark AND Kp ≥ required AND cloud ≤ threshold. */
  visible: boolean;
}

export interface AuroraVerdict {
  verdict: Verdict;
  reason: LimitingReason;
  location: NamedLocation;
  requiredKp: number;
  /** Best hour to look (highest score among visible, else best dark hour). */
  bestHour: HourlyAssessment | null;
  /** Full hourly timeline across the evaluation horizon. */
  hours: HourlyAssessment[];
  /** ISO-8601 UTC timestamp the verdict was generated. */
  generatedAt: string;
}

export interface VerdictThresholds {
  /** Max cloud cover (%) for an hour to count as "clear". */
  maxCloudPct: number;
  /** Sun elevation (deg) below which it is "dark enough" (civil twilight). */
  civilDarkDeg: number;
  nauticalDarkDeg: number;
  astronomicalDarkDeg: number;
  /** Hours ahead of `now` to evaluate. */
  horizonHours: number;
}

export interface VerdictInputs {
  location: NamedLocation;
  kpForecast: KpForecastPoint[];
  cloudForecast: CloudPoint[];
  ovation?: OvationSample | null;
  /** Defaults to the current time. */
  now?: Date;
  thresholds?: Partial<VerdictThresholds>;
}
