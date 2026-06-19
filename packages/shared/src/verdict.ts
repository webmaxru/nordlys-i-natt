import type {
  AuroraVerdict,
  CloudPoint,
  HourlyAssessment,
  KpForecastPoint,
  LimitingReason,
  Verdict,
  VerdictInputs,
  VerdictThresholds,
} from './types';
import { DEFAULT_THRESHOLDS, requiredKpForLatitude } from './thresholds';
import { classifyDarkness, sunElevationDeg } from './darkness';

const HOUR_MS = 3_600_000;

/** Nearest Kp value to `time` (NOAA forecast is 3-hourly, so nearest is fine). */
function nearestKp(forecast: KpForecastPoint[], time: number): number {
  let best = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const p of forecast) {
    const diff = Math.abs(new Date(p.time).getTime() - time);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p.kp;
    }
  }
  return best;
}

/** Nearest cloud cover (%) to `time`; defaults to fully cloudy if unknown. */
function nearestCloud(forecast: CloudPoint[], time: number): number {
  let best = 100;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const p of forecast) {
    const diff = Math.abs(new Date(p.time).getTime() - time);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p.cloudPct;
    }
  }
  return best;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Combined 0–100 desirability score for an hour, blending:
 *  - Kp margin vs the latitude requirement (45%)
 *  - sky clearness (35%)
 *  - darkness depth (20%)
 */
function scoreHour(args: {
  kp: number;
  requiredKp: number;
  cloudPct: number;
  isDark: boolean;
  deepDark: boolean;
}): number {
  const kpComponent = clamp((args.kp - args.requiredKp + 2) / 4, 0, 1);
  const clearComponent = clamp((100 - args.cloudPct) / 100, 0, 1);
  const darkComponent = args.isDark ? (args.deepDark ? 1 : 0.6) : 0;
  return Math.round(100 * (0.45 * kpComponent + 0.35 * clearComponent + 0.2 * darkComponent));
}

/**
 * Core verdict engine. Pure and deterministic given its inputs (and `now`).
 * Used identically by the web app (instant client verdict) and the
 * notification job (server-side evaluation) — single source of truth.
 */
export function computeVerdict(inputs: VerdictInputs): AuroraVerdict {
  const t: VerdictThresholds = { ...DEFAULT_THRESHOLDS, ...inputs.thresholds };
  const now = inputs.now ?? new Date();
  const { lat, lon } = inputs.location;
  const requiredKp = requiredKpForLatitude(lat);

  const hours: HourlyAssessment[] = [];
  for (let h = 0; h < t.horizonHours; h++) {
    const date = new Date(now.getTime() + h * HOUR_MS);
    const time = date.getTime();
    const elevation = sunElevationDeg(date, lat, lon);
    const darkness = classifyDarkness(
      elevation,
      t.civilDarkDeg,
      t.nauticalDarkDeg,
      t.astronomicalDarkDeg,
    );
    const isDark = elevation < t.civilDarkDeg;
    const deepDark = elevation < t.nauticalDarkDeg;
    const kp = nearestKp(inputs.kpForecast, time);
    const cloudPct = nearestCloud(inputs.cloudForecast, time);
    const visible = isDark && kp >= requiredKp && cloudPct <= t.maxCloudPct;

    hours.push({
      time: date.toISOString(),
      kp,
      requiredKp,
      cloudPct,
      sunElevationDeg: Math.round(elevation * 10) / 10,
      darkness,
      isDark,
      ovationIntensity: inputs.ovation?.intensity ?? null,
      score: scoreHour({ kp, requiredKp, cloudPct, isDark, deepDark }),
      visible,
    });
  }

  const darkHours = hours.filter((h) => h.isDark);
  const visibleHours = darkHours.filter((h) => h.visible);

  let verdict: Verdict;
  let reason: LimitingReason;
  let bestHour: HourlyAssessment | null;

  if (darkHours.length === 0) {
    // No darkness in the horizon → midnight sun / wrong season.
    verdict = 'NO';
    reason = 'not_dark';
    bestHour = null;
  } else if (visibleHours.length > 0) {
    verdict = 'GO';
    reason = 'none';
    bestHour = pickBest(visibleHours);
  } else {
    bestHour = pickBest(darkHours);
    const kpEverEnough = darkHours.some((h) => h.kp >= requiredKp);
    reason = kpEverEnough ? 'too_cloudy' : 'kp_too_low';

    // MAYBE when close: Kp within 1 of required AND not hopelessly overcast.
    const nearMiss = darkHours.some(
      (h) => h.kp >= requiredKp - 1 && h.cloudPct <= t.maxCloudPct + 30,
    );
    verdict = nearMiss ? 'MAYBE' : 'NO';
  }

  return {
    verdict,
    reason,
    location: inputs.location,
    requiredKp,
    bestHour,
    hours,
    generatedAt: now.toISOString(),
  };
}

function pickBest(hours: HourlyAssessment[]): HourlyAssessment {
  return hours.reduce((best, h) => (h.score > best.score ? h : best), hours[0]);
}
