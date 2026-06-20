# Frontend (`apps/web`)

React 18 + Vite 5 + TypeScript, **PWA**, bilingual (nb/en). Mobile-first, one-screen, dark
"aurora night" theme. Data fetching via TanStack Query. Built to a static bundle that the API
container serves.

> Conventions: extensionless imports; one component per file with a co-located `.css`
> (don't edit the shared `styles.css` from feature components); read shared state via `useAppState()`.

## App shell & state

- `App.tsx` composes everything inside `<AppStateProvider><Layout>…</Layout></AppStateProvider>`
  plus a fixed `<ConsentBanner/>`. Feature components are rendered here once; later changes go
  into the component files, not `App.tsx`.
- `state/AppStateContext.tsx` — `useAppState()` exposes
  `{ selectedLocation, setSelectedLocation, forecast: { data, isLoading, isError, refetch } }`.
  `selectedLocation` is persisted to `localStorage` (`nordlys.location`).
- `state/consent.ts` — the cookie‑free consent source of truth:
  `getAnalyticsConsent()`, `setAnalyticsConsent()`, `onConsentChange()`, `isAnalyticsAllowed()`,
  key `nordlys.consent.analytics`. Analytics initialize **only** after consent.

## Data layer

- `api/client.ts` — `apiFetch<T>(path)`; base = `import.meta.env.VITE_API_BASE_URL ?? ''`
  (empty → same origin; dev uses Vite's `/api` proxy to `:8080`).
- `api/forecast.ts` — `getForecast(loc)` → `ForecastResponse`, `getOvationGrid(bbox)`.
- `api/kartverket.ts` — `searchPlaces(q)`, `reverseGeocode(lat,lon)` (direct, CORS-open).
- `api/push.ts` — subscribe/unsubscribe via the service worker's `pushManager`.
- `hooks/` — `useForecast(location)`, `useOvationGrid(bbox)`, `usePlaceSearch()` (debounced),
  `useGeolocation()` (fires only on explicit user action).

## Components (`components/`)

| Component | Role |
|---|---|
| `Layout`, `LanguageToggle`, `AttributionFooter` | shell, nb/en toggle, data credits + privacy link |
| `LocationPicker` | "Use my location" + Kartverket search + preset city chips |
| `VerdictGauge` | the hero GO/MAYBE/NO indicator, reason, best hour, `Kp x / needs Kp y`; loading/error/empty states |
| `Timeline` | 72h SVG: Kp bars + cloud area + darkness bands + required-Kp line + weekday ticks |
| `AuroraMap` | react-leaflet + Kartverket grayscale tiles + OVATION oval overlay + user marker |
| `ShareCard` | renders the verdict to a PNG (`html-to-image`) → Web Share / download |
| `NotifyButton` | push opt-in (permission + subscribe) |
| `ConsentBanner`, `PrivacyPolicy` | cookie-free consent (opt-out) + privacy view (toggled via `#personvern` hash) |

`data/presetLocations.ts` seeds the preset chips (Tromsø … Kristiansand). **Note:** this lives
under `src/data/` — keep `data` out of broad ignore globs (see [troubleshooting.md](./troubleshooting.md)).

## i18n

`i18n/index.ts` (i18next + browser language detector, persisted) with `locales/nb.json` (default)
and `locales/en.json`. **Both files must stay key-for-key in sync.** Add new strings under a
namespace (`timeline.*`, `map.*`, `share.*`, `notify.*`, `consent.*`, `privacy.*`).

## PWA & service worker

`vite-plugin-pwa` (generateSW) provides the offline shell and injects the manifest + SW
registration (`main.tsx` calls `registerSW`). Push handlers live in `public/push-sw.js` and are
merged into the generated SW via `workbox.importScripts`. Icons + `og-image.png` are in `public/`.

## SEO / social

`index.html` carries full SEO + Open Graph + Twitter Card meta + JSON-LD, and a generated
`public/og-image.png` (1200×630). The canonical / `og:url` / `og:image` point to the live domain
**`https://nordlys.isainative.dev`**.

## Analytics (`lib/analytics.ts`)

`@microsoft/applicationinsights-web`, **cookieless** (`disableCookiesUsage: true`), no PII,
gated on `isAnalyticsAllowed()`. No connection string → no-op. Events: `location_selected`,
`verdict_viewed`, `share_clicked`, `pwa_installed`, `notify_opt_in`.
