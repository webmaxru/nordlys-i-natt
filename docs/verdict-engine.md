# The verdict engine (`packages/shared`)

The heart of the app: a **pure, deterministic** function that turns raw forecast inputs
into a GO / MAYBE / NO verdict. It is used by the browser (server-side via `/api/forecast`)
**and** the notification job — one source of truth.

Files: `types.ts`, `thresholds.ts`, `darkness.ts`, `verdict.ts`, `index.ts` (+ `verdict.test.ts`).

## Inputs and output

```ts
computeVerdict(inputs: VerdictInputs): AuroraVerdict
```

`VerdictInputs` = `{ location, kpForecast, cloudForecast, ovation?, now?, thresholds? }`.

`AuroraVerdict` = `{ verdict, reason, location, requiredKp, bestHour, hours[], generatedAt }`,
where each `HourlyAssessment` carries `{ time, kp, requiredKp, cloudPct, sunElevationDeg,
darkness, isDark, ovationIntensity, score, visible }`.

## The three signals

For each hour in the horizon (`horizonHours`, default 24):

1. **Darkness** — `sunElevationDeg(date, lat, lon)` via **SunCalc** (no API call). An hour is
   "dark" when the sun is below the civil-twilight cutoff (`-6°`); deeper bands are nautical
   (`-12°`) and astronomical (`-18°`). If the sun never drops below `-6°` in the horizon →
   midnight sun → verdict is **NO / `not_dark`** (honest off-season handling).
2. **Aurora strength** — Kp for the hour (nearest 3-hourly NOAA sample) compared to a
   **latitude-derived requirement** (`requiredKpForLatitude`): higher latitudes need lower Kp.
   OVATION point intensity is carried through for display.
3. **Clouds** — `cloud_area_fraction` (nearest MET hourly sample). "Clear" = `< maxCloudPct`
   (default 40%).

## Required Kp by latitude (`thresholds.ts`)

| Latitude (°N) | Required Kp | Examples |
|---|---|---|
| ≥ 67 | 1 | Tromsø, Alta, Lofoten |
| 64–67 | 2–3 | Bodø |
| 62–64 | 3 | Trondheim |
| 60–62 | 4 | Bergen |
| 58–60 | 5 | Oslo, Stavanger |
| < 58 | 6 | Kristiansand |

These are tunable rules of thumb, not hard physics.

## Scoring & the verdict

Each dark hour gets a 0–100 **score** blending Kp margin (45%), clearness (35%), and darkness
depth (20%). The verdict:

- **GO** — there is a dark hour that is *visible* (`isDark && kp ≥ requiredKp && cloud ≤ maxCloud`).
  `bestHour` = highest-scoring visible hour.
- **MAYBE** — no fully-visible hour, but a **near miss** exists (Kp within 1 of required *and*
  cloud ≤ `maxCloud + 30`).
- **NO** — otherwise.

`reason` is the limiting factor: `not_dark` (no dark hours) · `kp_too_low` (no dark hour ever
reaches required Kp) · `too_cloudy` (Kp was enough but clouds blocked it) · `none` (GO).

## Why server-side?

`/api/forecast` computes the verdict on the server and returns both the **inputs** and the
**verdict**. The frontend renders the verdict directly and re-uses the raw `inputs` for the
timeline/map. The notification job calls `buildForecast()` (which calls `computeVerdict`)
per subscription. Identical logic everywhere.

## Tests

`verdict.test.ts` covers the meaningful states with deterministic fixtures:
GO (Tromsø, clear, Kp 3), `too_cloudy` (Oslo, Kp 6 but 95% cloud → NO), MAYBE (Oslo, Kp 5,
55% cloud), `kp_too_low` (Oslo, Kp 1), and midnight-sun `not_dark` (Tromsø in June), plus a
timeline-length check. Run: `pnpm --filter @nordlys/shared test`.

## Tuning

All thresholds live in `DEFAULT_THRESHOLDS` and `requiredKpForLatitude`. Callers can override
per-request via `inputs.thresholds`. Good first knobs: `maxCloudPct`, the civil/nautical
darkness cutoffs, and the latitude→Kp table.
