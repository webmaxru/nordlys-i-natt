# Analytics & telemetry

How "Nordlys i natt?" measures usage. The app is **fully cookieless** and **has no consent
banner**: all usage analytics are collected **server-side**, where nothing is stored on or read
from the user's device, so the ePrivacy "cookie rule" (Art. 5(3)) is not triggered.

> **App Insights resource:** `nordlys-appi-eeyobitljk4fq` (resource group `rg-nordlys`,
> workspace-based Application Insights). All events land in the **`customEvents`** table.

## TL;DR

- **One pipeline, server-side only.** The Fastify backend sends a small set of custom events to
  Application Insights. There is **no client-side analytics SDK** and **no cookie/consent banner**.
- **Only the `customEvents` table is populated.** Page views, requests, dependencies, exceptions
  and traces are all **deliberately disabled** (no `pageViews`/`requests` tables).
- **Cookieless & consent-free:** counting happens on the server; App Insights doesn't store the
  full client IP by default; locations are coarsened to a ~111 km `latBand`.
- Connection string: server runtime `APPLICATIONINSIGHTS_CONNECTION_STRING` (Bicep secret, see
  [deployment.md](./deployment.md)). Locally it's a no-op when unset.

## Event catalogue (`apps/api/src/telemetry.ts`, all server-side)

| Event | Properties (`customDimensions`) | Fires when | Sampled? |
|---|---|---|---|
| `page_view` | `path` | Every top-level navigation (HTML shell) | **No (exact)** |
| `verdict_computed` | `verdict`, `reason`, `latBand` | Each `/api/forecast` call | 30% |
| `subscription_created` | – | Push opt-in stored | 30% |
| `subscription_deleted` | – | Push opt-out | 30% |
| `push_sent` | `count` | Notification batch sent (cron job) | 30% |

`latBand = Math.round(lat)` — a **coarse latitude band (~111 km)**, so the verdict mix can be
analysed by region without storing a precise location.

### `page_view` (visitor counting)

`apps/api/src/server.ts` adds an `onResponse` hook that emits one `page_view` per **top-level
navigation** (the HTML shell), excluding assets and `/api`:

- Primary signal: **`Sec-Fetch-Dest: document`** (a real page navigation, never an asset/`fetch`).
- Fallback for older browsers without `Sec-Fetch-*`: `GET` + `Accept` contains `text/html` + the
  path has no file extension.
- Only `status < 400` GETs to non-`/api` paths are counted.

### Telemetry config & exact counts

All Node-SDK auto-collection is **off** (`setAutoCollectRequests(false)`, console, deps,
exceptions, perf, heartbeat, live metrics), so the only telemetry sent is the explicit events
above. Global sampling is **30%**, but `page_view` is forced to **100%** via a telemetry
processor so visitor counts are exact:

```ts
appInsights.defaultClient.config.samplingPercentage = 30;
appInsights.defaultClient.addTelemetryProcessor((envelope) => {
  const data = envelope.data as { baseType?: string; baseData?: { name?: string } } | undefined;
  if (data?.baseType === 'EventData' && data.baseData?.name === 'page_view') {
    envelope.sampleRate = 100; // never sample → exact counts
  }
  return true;
});
```

For every **other** event (30%), always aggregate with **`sum(itemCount)`** in KQL — the SDK
records `itemCount` on retained items so the de-sampled estimate is correct. `count()` alone
under-reports by ~70%.

## Privacy & legal posture (no consent banner)

The app is **cookie-free**, and everything it stores on the device is **functional / strictly
necessary** (exempt from consent under ePrivacy Art. 5(3) — "strictly necessary to provide a
service the user explicitly requested"):

| Stored on device | Mechanism | Classification |
|---|---|---|
| `nordlys.location` | localStorage | Functional — the place the user chose → **exempt** |
| `i18nextLng` | localStorage | Functional — language preference → **exempt** |
| `nordlys.query-cache` | localStorage | Functional — caches the requested forecast → **exempt** |
| `nordlys.push.id` | localStorage | Functional — only after explicit notify opt-in → **exempt** |
| PWA caches | Cache API | Strictly necessary for the installed PWA → **exempt** |

There is **no non-essential client-side storage** (the client-side App Insights — whose
sessionStorage buffer used to require consent — was removed). With usage counted **server-side**
only, no consent prompt is required in the EU/EEA — including Norway, whose `ekomloven § 3-15`
requires opt-in consent for non-essential client storage since 1 Jan 2025. The `/personvern`
privacy page still discloses what's stored (transparency + legitimate interest for the aggregate
visit counts).

> ⚠️ **If you ever re-add any non-essential client-side storage** (a third-party script, a
> marketing pixel, fingerprinting, or a client analytics SDK), the consent-banner requirement
> returns. Keep new client-side storage functional/strictly-necessary.

**IP / personal data:** Application Insights **does not store the full client IP by default** — it
derives coarse geo (`client_City` / `client_CountryOrRegion`) then zeroes the IP. Combined with
cookie-free collection and the coarse `latBand`, server-side counting processes minimal personal
data.

> This is engineering documentation, not legal advice.

## Querying engagement

App Insights → **Logs**, or `az monitor app-insights query --app nordlys-appi-eeyobitljk4fq -g rg-nordlys --analytics-query "<KQL>"`.

**Daily visitors (exact — page_view is unsampled)**
```kusto
customEvents
| where name == "page_view" and timestamp > ago(30d)
| summarize visits = sum(itemCount) by bin(timestamp, 1d)
| render timechart
```

**Engagement snapshot** (use `sum(itemCount)` for the 30%-sampled events)
```kusto
customEvents
| where timestamp > ago(30d)
| summarize visits      = sumif(itemCount, name == "page_view"),
            forecasts   = sumif(itemCount, name == "verdict_computed"),
            optIns      = sumif(itemCount, name == "subscription_created"),
            unsubs      = sumif(itemCount, name == "subscription_deleted")
| extend optInRate = round(100.0 * optIns / forecasts, 1)
```

**Verdict mix**
```kusto
customEvents
| where name == "verdict_computed" and timestamp > ago(30d)
| extend verdict = tostring(customDimensions.verdict)
| summarize hits = sum(itemCount) by verdict
| render piechart
```

**Subscriber growth (the truest retention signal)**
```kusto
customEvents
| where name in ("subscription_created", "subscription_deleted") and timestamp > ago(90d)
| summarize hits = sum(itemCount) by name, bin(timestamp, 1d) | render timechart
```

## Dashboard & terminal tools

Two ready-made ways to read these metrics without writing KQL:

### Azure dashboard (`infra/analytics-dashboard.json`)

A shared **Azure Portal Dashboard** `nordlys-engagement-dashboard` (in `rg-nordlys`) with tiles
for **daily visitors**, **verdict mix**, an **engagement snapshot**, and **subscriber growth**
(all sampling-aware). Open it from the
[portal](https://portal.azure.com/#dashboard/arm/subscriptions/d0b7d6ee-17bf-4c4f-b79d-4f6c2cb583fd/resourceGroups/rg-nordlys/providers/Microsoft.Portal/dashboards/nordlys-engagement-dashboard),
or (re)deploy it from the committed template:

```bash
az deployment group create -g rg-nordlys --template-file infra/analytics-dashboard.json
```

### Terminal report (`scripts/analytics.ps1`)

Pulls the key numbers straight to the terminal. Needs `az` logged in; auto-adds the
`application-insights` CLI extension if missing.

```powershell
pwsh scripts/analytics.ps1                 # last 30 days (default)
pwsh scripts/analytics.ps1 -Days 7
```

Prints visitors (today / 7d / N days, exact), forecast loads, the GO/MAYBE/NO mix, conversions
(opt-ins/unsubscribes), the current push-subscriber count, and a 14-day daily-visits sparkline.

## Caveats & gotchas

- **No client-side events.** Things only the browser knows (e.g. which share/install button was
  tapped, or which location-picker source was used) are **not** tracked anymore — that was the
  client App Insights, removed to drop the consent banner. Server events cover visits, forecast
  loads, verdict mix and push opt-ins. To recover a client signal without a banner, add a
  **server-side beacon** (a POST that stores nothing on the device).
- **Unique users / retention are unreliable** in App Insights (cookie-free → no stable
  `user_Id`/`session_Id`). Use event volumes and the **subscriber count**
  (`scripts/subscriptions.ps1 -Action Count`) for retention.
- **Sampling:** everything except `page_view` is at 30% → always `sum(itemCount)`.
- **Latency:** ingestion is ~1–3 minutes.
- **No `requests`/`pageViews` tables** — request auto-collection is off by design; `page_view`
  is the page-load source of truth.

## Extending

- **New server event:** `trackEvent('name', { ...stringableProps })` from
  `apps/api/src/telemetry.ts`. If it must be exact, add its name to the sampling-override
  processor.
- **Avoid client-side storage** for analytics — doing so re-introduces the consent-banner
  requirement. Prefer a server-side hook/beacon instead.
