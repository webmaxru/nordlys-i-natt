import type { CloudPoint, KpForecastPoint, NamedLocation } from './types';
import { requiredKpForLatitude } from './thresholds';
import { sunElevationDeg } from './darkness';

/**
 * The alert rule — one module, used by every channel (web push, e-mail, native push).
 *
 * Promise to the user: "a heads-up the day before your best chance to see the aurora
 * at your saved place".
 *
 *  1. The forecast is split into NIGHTS at the saved place. A night is named after the local
 *     date of its evening (Europe/Oslo): every hour from 12:00 on day D to 11:59 on day D+1
 *     belongs to night D, and only its dark hours (sun below −6°) count.
 *  2. Each dark hour is "visible" when Kp ≥ the latitude requirement and cloud ≤ 40 %.
 *     Kp comes from the NOAA SWPC 3-day forecast (3-hour blocks), cloud from MET Norway.
 *  3. Each night gets a CHANCE level: high / good / low / none (see `chanceFor`).
 *  4. DAY-BEFORE alert: in the 15:00–21:00 local window on day D, if night D+1 reaches the
 *     subscriber's minimum chance (default "good"), send once for that night.
 *  5. NOW alert (separate opt-in): when the current hour is dark, clear and Kp is high enough,
 *     send once per night, never inside the quiet hours (default 02:00–06:00).
 *
 * Everything here is pure: same inputs → same decisions. The scheduler supplies the data,
 * the subscriber's preferences and what was already sent.
 */

export type ChanceLevel = 'none' | 'low' | 'good' | 'high';

export const CHANCE_RANK: Record<ChanceLevel, number> = { none: 0, low: 1, good: 2, high: 3 };

export type AlertKind = 'dayBefore' | 'now';

export interface AlertRuleConfig {
  /** IANA time zone used for "day", "night" and the send windows. */
  timeZone: string;
  /** Local hours [start, end) in which a day-before alert may go out. */
  dayBeforeWindow: { start: number; end: number };
  /** Local hours [start, end) in which NOW alerts are suppressed. start === end disables. */
  quietHours: { start: number; end: number };
  /** Max cloud cover (%) for an hour to count as clear. */
  maxCloudPct: number;
  /** Sun elevation (deg) below which an hour counts as dark. */
  darkSunDeg: number;
  /** Hours ahead of `now` to assess (NOAA's 3-day Kp forecast is the limit). */
  horizonHours: number;
}

export const DEFAULT_ALERT_RULE: AlertRuleConfig = {
  timeZone: 'Europe/Oslo',
  dayBeforeWindow: { start: 15, end: 21 },
  quietHours: { start: 2, end: 6 },
  maxCloudPct: 40,
  darkSunDeg: -6,
  horizonHours: 72,
};

export interface AlertPrefs {
  /** Day-before heads-up (the core promise). */
  dayBefore: boolean;
  /** Short-notice "it's happening now" alert. */
  now: boolean;
  /** Lowest chance level that triggers a day-before alert. */
  minChance: 'good' | 'high';
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = { dayBefore: true, now: false, minChance: 'good' };

/** What has already been sent to one subscriber (persisted by the scheduler). */
export interface AlertState {
  /** nightOf (YYYY-MM-DD) of the last day-before alert. */
  lastDayBeforeNight?: string;
  /** nightOf (YYYY-MM-DD) of the last NOW alert. */
  lastNowNight?: string;
}

export interface AlertHour {
  time: string;
  /** Local date (YYYY-MM-DD) of the night this hour belongs to. */
  nightOf: string;
  localHour: number;
  sunElevationDeg: number;
  isDark: boolean;
  /** null when no Kp forecast covers this hour. */
  kp: number | null;
  kpKind: KpForecastPoint['observed'] | null;
  /** null when no cloud forecast is within 3 h of this hour. */
  cloudPct: number | null;
  requiredKp: number;
  visible: boolean;
  /** 0–100, same blend as the verdict engine (Kp margin 45 %, clear sky 35 %, darkness 20 %). */
  score: number;
}

export interface NightAssessment {
  nightOf: string;
  location: NamedLocation;
  requiredKp: number;
  darkHours: number;
  visibleHours: number;
  /** Visible hours with Kp at least one above the requirement. */
  strongHours: number;
  maxKp: number | null;
  /** Lowest cloud cover (%) during the dark hours, null if unknown. */
  minCloudPct: number | null;
  /** Best hour (highest score among visible hours, else among dark hours). */
  bestHour: AlertHour | null;
  chance: ChanceLevel;
  /** False when part of the dark hours had no Kp or no cloud data. */
  complete: boolean;
}

export interface AlertDecision {
  kind: AlertKind;
  nightOf: string;
  night: NightAssessment;
  /** Hour that triggered a NOW alert, or the night's best hour for a day-before alert. */
  hour: AlertHour | null;
  /** How long a push service should keep trying to deliver it. */
  ttlSeconds: number;
  /** Stable id: one alert of each kind per night per subscriber. */
  dedupeKey: string;
}

const HOUR_MS = 3_600_000;
const KP_BLOCK_MS = 3 * HOUR_MS;
const CLOUD_MAX_GAP_MS = 3 * HOUR_MS;

const partsCache = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

/** Local calendar date (YYYY-MM-DD) and hour (0–23) of `date` in `timeZone`. */
export function localDateHour(date: Date, timeZone: string): { date: string; hour: number } {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

/** YYYY-MM-DD plus `days` (calendar arithmetic, no time zone involved). */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The night an instant belongs to: hours from 12:00 belong to that date's night, earlier hours to the previous date's. */
export function nightOf(date: Date, timeZone: string): string {
  const { date: ymd, hour } = localDateHour(date, timeZone);
  return hour >= 12 ? ymd : addDays(ymd, -1);
}

/**
 * The night a person means by "tonight": the night they are in while it is still dark before
 * noon, otherwise the coming night (named after today's date).
 */
export function tonightOf(
  now: Date,
  lat: number,
  lon: number,
  timeZone = 'Europe/Oslo',
  darkSunDeg = -6,
): string {
  const local = localDateHour(now, timeZone);
  const stillNight = local.hour < 12 && sunElevationDeg(now, lat, lon) < darkSunDeg;
  return stillNight ? nightOf(now, timeZone) : local.date;
}

export function inHourWindow(hour: number, start: number, end: number): boolean {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Kp for the NOAA 3-hour block containing `t`; null if no block covers it. */
export function kpAt(
  forecast: KpForecastPoint[],
  t: number,
): { kp: number; kind: KpForecastPoint['observed'] } | null {
  let hit: KpForecastPoint | null = null;
  let hitStart = Number.NEGATIVE_INFINITY;
  for (const p of forecast) {
    const start = Date.parse(p.time);
    if (!Number.isFinite(start)) continue;
    if (start <= t && t < start + KP_BLOCK_MS && start > hitStart) {
      hit = p;
      hitStart = start;
    }
  }
  return hit ? { kp: hit.kp, kind: hit.observed } : null;
}

/** Cloud cover nearest to `t`, or null when the nearest sample is more than 3 h away. */
export function cloudAt(forecast: CloudPoint[], t: number): number | null {
  let best: number | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const p of forecast) {
    const diff = Math.abs(Date.parse(p.time) - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p.cloudPct;
    }
  }
  return bestDiff <= CLOUD_MAX_GAP_MS ? best : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function scoreOf(
  kp: number | null,
  requiredKp: number,
  cloudPct: number | null,
  sunDeg: number,
  darkDeg: number,
): number {
  const kpC = kp === null ? 0 : clamp((kp - requiredKp + 2) / 4, 0, 1);
  const clearC = cloudPct === null ? 0 : clamp((100 - cloudPct) / 100, 0, 1);
  const darkC = sunDeg < darkDeg ? (sunDeg < -12 ? 1 : 0.6) : 0;
  return Math.round(100 * (0.45 * kpC + 0.35 * clearC + 0.2 * darkC));
}

export interface AssessInputs {
  location: NamedLocation;
  kpForecast: KpForecastPoint[];
  cloudForecast: CloudPoint[];
  now?: Date;
  config?: Partial<AlertRuleConfig>;
}

/** Hour-by-hour assessment from the start of the current hour to `horizonHours` ahead. */
export function assessHours(inputs: AssessInputs): AlertHour[] {
  const cfg = { ...DEFAULT_ALERT_RULE, ...inputs.config };
  const now = inputs.now ?? new Date();
  const start = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const { lat, lon } = inputs.location;
  const requiredKp = requiredKpForLatitude(lat);
  const out: AlertHour[] = [];
  for (let h = 0; h <= cfg.horizonHours; h++) {
    const t = start + h * HOUR_MS;
    // Sample the sun in the middle of the hour so an hour counts as dark when most of it is.
    const sun = sunElevationDeg(new Date(t + HOUR_MS / 2), lat, lon);
    const isDark = sun < cfg.darkSunDeg;
    const kp = kpAt(inputs.kpForecast, t + HOUR_MS / 2);
    const cloudPct = cloudAt(inputs.cloudForecast, t + HOUR_MS / 2);
    const visible =
      isDark &&
      kp !== null &&
      kp.kp >= requiredKp &&
      cloudPct !== null &&
      cloudPct <= cfg.maxCloudPct;
    const local = localDateHour(new Date(t), cfg.timeZone);
    out.push({
      time: new Date(t).toISOString(),
      nightOf: local.hour >= 12 ? local.date : addDays(local.date, -1),
      localHour: local.hour,
      sunElevationDeg: Math.round(sun * 10) / 10,
      isDark,
      kp: kp?.kp ?? null,
      kpKind: kp?.kind ?? null,
      cloudPct,
      requiredKp,
      visible,
      score: scoreOf(kp?.kp ?? null, requiredKp, cloudPct, sun, cfg.darkSunDeg),
    });
  }
  return out;
}

/**
 * Chance level of one night from its dark hours:
 *  - high: ≥ 2 visible hours, at least one with Kp ≥ requirement + 1
 *  - good: ≥ 2 visible hours, or 1 visible hour with Kp ≥ requirement + 1
 *  - low:  1 visible hour, or a near miss (Kp ≥ requirement − 1 and cloud ≤ 70 % in some dark hour)
 *  - none: anything else, including nights with no darkness (midnight sun) or no Kp data
 */
export function chanceFor(
  dark: AlertHour[],
  maxCloudPct = DEFAULT_ALERT_RULE.maxCloudPct,
): ChanceLevel {
  const visible = dark.filter((h) => h.visible);
  const strong = visible.filter((h) => h.kp !== null && h.kp >= h.requiredKp + 1);
  if (visible.length >= 2 && strong.length >= 1) return 'high';
  if (visible.length >= 2 || strong.length >= 1) return 'good';
  if (visible.length === 1) return 'low';
  const nearMiss = dark.some(
    (h) =>
      h.kp !== null &&
      h.kp >= h.requiredKp - 1 &&
      h.cloudPct !== null &&
      h.cloudPct <= maxCloudPct + 30,
  );
  return nearMiss ? 'low' : 'none';
}

/** Group hours into nights and grade each. Nights are returned in date order. */
export function assessNights(inputs: AssessInputs): NightAssessment[] {
  const cfg = { ...DEFAULT_ALERT_RULE, ...inputs.config };
  return nightsFromHours(assessHours(inputs), inputs.location, cfg.maxCloudPct);
}

export function nightsFromHours(
  hours: AlertHour[],
  location: NamedLocation,
  maxCloudPct = DEFAULT_ALERT_RULE.maxCloudPct,
): NightAssessment[] {
  const byNight = new Map<string, AlertHour[]>();
  for (const h of hours) {
    const list = byNight.get(h.nightOf) ?? [];
    list.push(h);
    byNight.set(h.nightOf, list);
  }
  const requiredKp = requiredKpForLatitude(location.lat);
  return [...byNight.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([night, list]) => {
      const dark = list.filter((h) => h.isDark);
      const visible = dark.filter((h) => h.visible);
      const pool = visible.length > 0 ? visible : dark;
      const best = pool.reduce<AlertHour | null>(
        (b, h) => (b === null || h.score > b.score ? h : b),
        null,
      );
      const kps = dark.map((h) => h.kp).filter((k): k is number => k !== null);
      const clouds = dark.map((h) => h.cloudPct).filter((c): c is number => c !== null);
      return {
        nightOf: night,
        location,
        requiredKp,
        darkHours: dark.length,
        visibleHours: visible.length,
        strongHours: visible.filter((h) => h.kp !== null && h.kp >= h.requiredKp + 1).length,
        maxKp: kps.length ? Math.max(...kps) : null,
        minCloudPct: clouds.length ? Math.min(...clouds) : null,
        bestHour: best,
        chance: dark.length === 0 ? 'none' : chanceFor(dark, maxCloudPct),
        complete: dark.every((h) => h.kp !== null && h.cloudPct !== null),
      } satisfies NightAssessment;
    });
}

export interface DecideInputs {
  hours: AlertHour[];
  nights: NightAssessment[];
  prefs?: Partial<AlertPrefs>;
  state?: AlertState;
  now?: Date;
  config?: Partial<AlertRuleConfig>;
}

/** Which alerts (0, 1 or 2) one subscriber should get right now. */
export function decideAlerts(inputs: DecideInputs): AlertDecision[] {
  const cfg = { ...DEFAULT_ALERT_RULE, ...inputs.config };
  const prefs = { ...DEFAULT_ALERT_PREFS, ...inputs.prefs };
  const state = inputs.state ?? {};
  const now = inputs.now ?? new Date();
  const local = localDateHour(now, cfg.timeZone);
  const out: AlertDecision[] = [];

  if (
    prefs.dayBefore &&
    inHourWindow(local.hour, cfg.dayBeforeWindow.start, cfg.dayBeforeWindow.end)
  ) {
    const target = addDays(local.date, 1);
    const night = inputs.nights.find((n) => n.nightOf === target);
    if (
      night &&
      CHANCE_RANK[night.chance] >= CHANCE_RANK[prefs.minChance] &&
      state.lastDayBeforeNight !== target
    ) {
      out.push({
        kind: 'dayBefore',
        nightOf: target,
        night,
        hour: night.bestHour,
        ttlSeconds: 12 * 3600,
        dedupeKey: `dayBefore:${target}`,
      });
    }
  }

  if (prefs.now && !inHourWindow(local.hour, cfg.quietHours.start, cfg.quietHours.end)) {
    const nowMs = now.getTime();
    const current = inputs.hours.find((h) => {
      const t = Date.parse(h.time);
      return t <= nowMs && nowMs < t + HOUR_MS;
    });
    if (current && current.visible && state.lastNowNight !== current.nightOf) {
      const night = inputs.nights.find((n) => n.nightOf === current.nightOf);
      if (night) {
        out.push({
          kind: 'now',
          nightOf: current.nightOf,
          night,
          hour: current,
          ttlSeconds: 3600,
          dedupeKey: `now:${current.nightOf}`,
        });
      }
    }
  }

  return out;
}

/** State after `decision` was delivered. */
export function markSent(state: AlertState, decision: AlertDecision): AlertState {
  return decision.kind === 'dayBefore'
    ? { ...state, lastDayBeforeNight: decision.nightOf }
    : { ...state, lastNowNight: decision.nightOf };
}

/** ~11 km grid cell so subscribers close to each other share one forecast fetch. */
export function cellKey(lat: number, lon: number): string {
  return `${(Math.round(lat * 10) / 10).toFixed(1)},${(Math.round(lon * 10) / 10).toFixed(1)}`;
}
