# Frontend (`apps/web`)

React 18 + Vite 5 + TypeScript, **PWA**, bilingual (nb/en). Mobile-first, one-screen, dark
"aurora night" theme. Data fetching via TanStack Query. Built to a static bundle that the API
container serves.

> Conventions: extensionless imports; one component per file with a co-located `.css`
> (don't edit the shared `styles.css` from feature components); read shared state via `useAppState()`.

## App shell & state

- `App.tsx` composes everything inside `<AppStateProvider><Layout>…</Layout></AppStateProvider>`
  plus a `<PrivacyPolicy/>` overlay. Feature components are rendered here once; later changes go
  into the component files, not `App.tsx`.
- `state/AppStateContext.tsx` — `useAppState()` exposes
  `{ selectedLocation, setSelectedLocation, forecast: { data, isLoading, isError, refetch } }`.
  `selectedLocation` is persisted to `localStorage` (`nordlys.location`).

## Data layer

- `api/client.ts` — `apiFetch<T>(path)`; base = `import.meta.env.VITE_API_BASE_URL ?? ''`
  (empty → same origin; dev uses Vite's `/api` proxy to `:8080`).
- `api/forecast.ts` — `getForecast(loc)` → `ForecastResponse`, `getOvationGrid(bbox)`.
- `api/kartverket.ts` — `searchPlaces(q)`, `reverseGeocode(lat,lon)` (direct, CORS-open).
- `api/push.ts` — subscribe/unsubscribe via the service worker's `pushManager`.
- `hooks/` — `useForecast(location)`, `useOvationGrid(bbox)`, `usePlaceSearch()` (debounced),
  `useGeolocation()` (fires only on explicit user action; exposes a typed error `reason` so the
  UI can give actionable, iOS-aware guidance when location is blocked).
- **Cache persistence** — `main.tsx` wraps the app in `PersistQueryClientProvider`
  (`@tanstack/react-query-persist-client` + a localStorage sync persister, key
  `nordlys.query-cache`). On launch the last forecast is rehydrated synchronously so the verdict
  shows **immediately**, then revalidates in the background (stale-while-revalidate). Only
  `forecast` queries are persisted; `maxAge` 12h, `buster` `nordlys-forecast-v1`, `gcTime` 24h.
  `VerdictGauge` keeps showing cached data if a refresh fails (it only errors when there is no
  data at all), so a stale/offline start still shows the last-known status.

## Components (`components/`)

| Component | Role |
|---|---|
| `Layout`, `LanguageToggle`, `AttributionFooter` | shell, nb/en toggle, data credits + privacy link |
| `LocationPicker` | "Use my location" + Kartverket search + preset city chips |
| `VerdictGauge` | the hero GO/MAYBE/NO indicator, reason, best hour, `Kp x / needs Kp y`; error/empty states |
| `GaugeLoading` | the gauge loading state — rotating, on-brand status lines (cold-start friendly); pauses under reduced-motion |
| `Timeline` | 72h SVG: Kp bars + cloud area + darkness bands + required-Kp line + weekday ticks |
| `AuroraMap` | react-leaflet + Kartverket grayscale tiles + OVATION oval overlay + user marker |
| `ShareCard` | renders the verdict to a PNG (`html-to-image`) → Web Share / download |
| `NotifyButton` | soft-prompt push opt-in (permission + subscribe), surfaced prominently right under the verdict |
| `PrivacyPolicy` | privacy view (toggled via `#personvern` hash); **no cookie banner** — analytics are server-side |

`data/presetLocations.ts` seeds the preset chips (Tromsø … Kristiansand). **Note:** this lives
under `src/data/` — keep `data` out of broad ignore globs (see [troubleshooting.md](./troubleshooting.md)).

## i18n

`i18n/index.ts` (i18next + browser language detector, persisted) with `locales/nb.json` (default)
and `locales/en.json`. **Both files must stay key-for-key in sync.** Add new strings under a
namespace (`timeline.*`, `map.*`, `share.*`, `notify.*`, `privacy.*`).

## PWA & service worker

`vite-plugin-pwa` (generateSW) provides the offline shell and injects the manifest + SW
registration (`main.tsx` calls `registerSW`). Push handlers live in `public/push-sw.js` and are
merged into the generated SW via `workbox.importScripts`. Icons + `og-image.png` are in `public/`.

## SEO / social

`index.html` carries full SEO + Open Graph + Twitter Card meta + JSON-LD, and a generated
`public/og-image.png` (1200×630). The canonical / `og:url` / `og:image` point to the live domain
**`https://nordlys.isainative.dev`**.

## Analytics

The frontend has **no analytics SDK and no cookie/consent banner**. All usage analytics are
collected **server-side** (cookieless) by the Fastify backend — see **[analytics.md](./analytics.md)**.
Adding any client-side analytics/storage would re-introduce the EU consent-banner requirement.
