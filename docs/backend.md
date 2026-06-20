# Backend (`apps/api`)

Fastify 5, TypeScript, ESM, **run via `tsx`** (no compile step) in dev and prod. Routes are
**auto-loaded** from `src/routes/*.ts` (each file default-exports a `FastifyPluginAsync`), so
new endpoints drop in without editing a central registry.

> Conventions: extensionless relative imports; config read once at startup from `config.ts`;
> never put secrets in source.

## Entry points

- `server.ts` — `buildServer()` registers CORS, autoloads routes, and serves the built SPA
  (`@fastify/static`) from `WEB_DIST_PATH` (or `../../web/dist`). Starts on `PORT` (8080).
  Calls `initTelemetry()` first (no-op without a connection string).
- `job.ts` — entry point for the **Container Apps cron Job**: runs `evaluateAndNotify()` and exits.

## Routes (`src/routes`)

| File | Endpoints |
|---|---|
| `health.ts` | `GET /api/health` (Container Apps probe) |
| `forecast.ts` | `GET /api/forecast?lat&lon&name` → builds inputs + verdict; emits `verdict_computed` telemetry |
| `noaa.ts` | `GET /api/noaa/kp`, `GET /api/noaa/ovation/grid?bbox` |
| `met.ts` | `GET /api/met/locationforecast?lat&lon`, `GET /api/met/sunrise?lat&lon&date` |
| `subscriptions.ts` | `POST /api/subscriptions`, `DELETE /api/subscriptions/:id`, `GET /api/push/public-key` |

## Services (`src/services`)

- `cache.ts` — tiny in-memory TTL cache + `fetchJsonCached(url, ttl, headers?)` (dedupes in-flight).
- `met.ts` — `getCloudForecast(lat,lon)` + raw passthroughs; sends the required `User-Agent`.
- `noaa.ts` — `getKpForecast()` (dual-shape parser), `sampleOvation()`, `getOvationGrid(bbox)`.
- `forecast.ts` — `buildForecast(location)`: fetch inputs → `computeVerdict()` → contract payload.
- `push.ts` — `web-push` (VAPID); `sendPush(sub, {title,body,url})` returns `ok | expired | error`.
- `store.ts` — `SubscriptionStore` interface with **`FileStore`** (local JSON) and **`TableStore`**
  (Azure Table Storage). `createStore()` picks one from `STORE_DRIVER`.

## Push notifications

1. Frontend (`apps/web/src/api/push.ts`) subscribes via the service worker's `pushManager`,
   then `POST /api/subscriptions` with `{ subscription, location, lang }`. Stored fields:
   endpoint, keys, **coarse** lat/lon (rounded ~2 dp), name, lang, timestamps, last verdict.
2. The cron **Job** runs `scheduler/evaluate.ts` `evaluateAndNotify()` every ~20 min: for each
   subscription it `buildForecast()`s and, when the verdict crosses to **GO** (and not recently
   notified, and outside **quiet hours** — Europe/Oslo `QUIET_HOURS_START..END`, default 02:00–06:00),
   sends a localized Web Push `{ title, body, url }`. Expired subscriptions (404/410)
   are deleted. Resilient per-subscription (one failure never aborts the loop).
3. The **service worker** (`apps/web/public/push-sw.js`, pulled in via `workbox.importScripts`)
   shows the notification and handles `notificationclick`. **Payload contract:** `{ title, body, url }`.

## Configuration (`config.ts`, env)

| Var | Purpose |
|---|---|
| `PORT` | listen port (8080) |
| `MET_USER_AGENT` | **required real contact** for api.met.no (placeholders get 403) |
| `MET_CACHE_TTL_SECONDS` / `NOAA_CACHE_TTL_SECONDS` | cache TTLs |
| `QUIET_HOURS_START` / `QUIET_HOURS_END` | suppress push during these Europe/Oslo hours `[start, end)` (default 2–6; set equal to disable) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push (`npx web-push generate-vapid-keys`) |
| `STORE_DRIVER` (`file`\|`table`) + `STORE_FILE_PATH` / `AZURE_TABLE_CONNECTION_STRING` / `AZURE_TABLE_NAME` | subscription store |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | server telemetry (no-op if unset) |
| `WEB_DIST_PATH` | absolute path to the built SPA to serve |

Local secrets live in `apps/api/.env` (gitignored). Never commit them.

## Telemetry (`telemetry.ts`)

`applicationinsights` Node SDK, initialized only when a connection string is present (else a
no-op). Sampled at 30%, noisy auto-collection disabled. Emits key events: `verdict_computed`,
`subscription_created/deleted`, `push_sent` (no PII; coarse latitude only). See
[deployment.md](./deployment.md) for the privacy posture.

## Why `tsx` (and the autoload coupling)

Running TS directly means Fastify's `@fastify/autoload` can discover route files at runtime.
A bundler (esbuild/tsup) would inline `server.ts` and **not** emit the route files autoload
needs. `tsx` also sidesteps ESM `.js`-extension requirements. Cost: a little startup overhead.
