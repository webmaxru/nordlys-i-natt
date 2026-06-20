# External APIs

All open, free APIs. NOAA + Kartverket are CORS-clean (browser-direct); **MET is proxied**
through our API. Read this before touching `apps/api/src/services/{met,noaa}.ts` or
`apps/web/src/api/kartverket.ts`.

## NOAA SWPC — aurora (Kp + OVATION)

No auth, CORS-open. We still cache server-side (`apps/api/src/services/noaa.ts`).

### Kp forecast — ⚠️ format gotcha
`GET https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json`

The live response is an **array of objects** today:
```json
[{ "time_tag": "2026-06-12T00:00:00", "kp": 3.33, "observed": "observed", "noaa_scale": null }, ...]
```
Historically it was an **array of arrays with a header row**
(`["time_tag","kp",...]`, `[...]`). **`parseKpForecast` handles both shapes** — do not assume
one. `time_tag` is UTC without a `Z`; we append `Z`. (This silently returned 0 points until
fixed — see [troubleshooting.md](./troubleshooting.md).)

### OVATION oval
`GET https://services.swpc.noaa.gov/json/ovation_aurora_latest.json` →
`{ "Forecast Time", "coordinates": [[lon(0–359), lat(-90–90), intensity(0–100)], ...] }`.
- `sampleOvation(lat, lon)` finds the nearest integer grid point.
- `getOvationGrid(bbox)` filters to a bbox (default Norway `0,55,35,72`) and converts
  longitudes back to `-180..180` for Leaflet. Exposed at `GET /api/noaa/ovation/grid`.

## MET Norway — weather (clouds + sun) — proxied

`apps/api/src/services/met.ts`, exposed via `/api/met/*` and used by `/api/forecast`.

- **`User-Agent` is required** by MET's Terms of Service. Browsers can't set it, and **MET
  403s obvious placeholders** (anything containing `example.com`). Set a *real* contact via
  `MET_USER_AGENT` (e.g. `nordlys-i-natt/1.0 you@your-domain`). This is the main reason MET is
  proxied rather than called from the browser.
- **Cache** responses (`MET_CACHE_TTL_SECONDS`, default 900) — MET asks high-traffic apps to.
- `locationforecast/2.0/compact?lat&lon` → `properties.timeseries[].data.instant.details.cloud_area_fraction` (%).
  Clamp lat/lon to **4 decimals** (more → 403).
- `sunrise/3.0/sun?lat&lon&date&offset` is also proxied; the verdict's darkness is computed
  client/server-side with SunCalc, so sunrise is supplementary.

## Kartverket / Geonorge — geocoding (browser-direct)

`apps/web/src/api/kartverket.ts`. No auth, CORS-open.
- **Search:** `GET https://ws.geonorge.no/stedsnavn/v1/navn?sok=&fuzzy=&utkoordsys=4258&treffPerSide=`.
- **Reverse:** `GET https://ws.geonorge.no/stedsnavn/v1/punkt?nord=&ost=&koordsys=4258&utkoordsys=4258&radius=&treffPerSide=`.
- Map `representasjonspunkt` (`nord`=lat, `øst`=lon), `skrivemåte`/`stedsnavn` → name, and
  kommune/fylke → region.

### Map tiles
The aurora map uses **Kartverket grayscale WMTS** (fits the dark theme):
`https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png`
(no auth). The user marker is a Leaflet `CircleMarker` to avoid Vite marker-icon asset issues.

## Our HTTP contract (the surface the frontend depends on)

| Endpoint | Returns |
|---|---|
| `GET /api/health` | `{ status, time }` |
| `GET /api/forecast?lat&lon&name` | `{ location, inputs: { kpForecast, cloudForecast, ovation }, verdict }` |
| `GET /api/noaa/kp` | `KpForecastPoint[]` |
| `GET /api/noaa/ovation/grid?bbox` | `{ forecastTime, points: [lon,lat,intensity][] }` |
| `GET /api/met/locationforecast?lat&lon` · `GET /api/met/sunrise?lat&lon&date` | raw cached MET JSON |
| `GET /api/push/public-key` | `{ publicKey }` |
| `POST /api/subscriptions` · `DELETE /api/subscriptions/:id` | push subscribe / unsubscribe |

## Attribution (required)
The footer credits **MET Norway · NOAA SWPC · Kartverket**. Keep it.
