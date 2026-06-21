# Analytics & telemetry

How "Nordlys i natt?" measures usage. The guiding principle is **privacy-first**: the
site is cookie-free, and the only telemetry that needs consent is the optional
client-side analytics — everything operationally important is collected
**server-side without cookies or a consent prompt**.

> **App Insights resource:** `nordlys-appi-eeyobitljk4fq` (resource group `rg-nordlys`,
> workspace-based Application Insights). All events below land in the **`customEvents`**
> table — see [§ Querying engagement](#querying-engagement).

## TL;DR

- There are **two independent pipelines**, both pointing at the same App Insights resource:
  1. **Client-side** (browser) — opt-in, **consent-gated**, cookie-free. Rich product events.
  2. **Server-side** (Fastify) — **cookieless, consent-free**. Visit counts + domain events.
- **Only the `customEvents` table is populated.** Page views, requests, dependencies,
  exceptions and traces are all **deliberately disabled** on both sides (no `pageViews`,
  no `requests`, etc.).
- Client telemetry is **lazy-loaded only after the user accepts** the consent banner, so it
  covers *consenting* visitors only. Server telemetry covers **everyone**.
- Connection strings: client build-time `VITE_APPINSIGHTS_CONNECTION_STRING`; server runtime
  `APPLICATIONINSIGHTS_CONNECTION_STRING` (Bicep secret, see [deployment.md](./deployment.md)).

## Event catalogue

| Event | Side | Properties (`customDimensions`) | Fires when | Sampled? |
|---|---|---|---|---|
| `page_view` | server | `path` | Every top-level navigation (HTML shell) | **No (exact)** |
| `verdict_computed` | server | `verdict`, `reason`, `latBand` | Each `/api/forecast` call | 30% |
| `subscription_created` | server | – | Push opt-in stored | 30% |
| `subscription_deleted` | server | – | Push opt-out | 30% |
| `push_sent` | server (cron job) | `count` | Notification batch sent | 30% |
| `location_selected` | client | `source` (`geo` / `search` / `preset`) | User picks a place | 30% |
| `verdict_viewed` | client | `verdict`, `reason` | A verdict renders | 30% |
| `notify_opt_in` | client | – | Push subscribe succeeds | 30% |
| `share_clicked` | client | – | Share button used | 30% |
| `pwa_installed` | client | – | App installed to home screen | 30% |

`latBand = Math.round(lat)` — a **coarse latitude band (~111 km)**, so the verdict mix can
be analysed by region without ever storing a precise location.

## Client-side analytics (`apps/web/src/lib/analytics.ts`)

Uses the `@microsoft/applicationinsights-web` SDK, **lazy-imported only when analytics
consent is `granted`**. Configured to be as quiet and privacy-preserving as possible:

```ts
new ApplicationInsights({ config: {
  connectionString,
  disableCookiesUsage: true,            // no cookies
  autoTrackPageVisitTime: false,
  disableAjaxTracking: true,
  disableFetchTracking: true,
  disableExceptionTracking: true,
  enableUnhandledPromiseRejectionTracking: false,
  enableAutoRouteTracking: false,       // no automatic page views
}});
```

Because of this, the client emits **only the explicit custom events** above — no page
views, no dependency/exception/perf telemetry.

### Consent model (`apps/web/src/state/consent.ts`)

- localStorage key **`nordlys.consent.analytics`**, value `granted` | `denied` (absent = `unset`).
- `initAnalytics()` subscribes to consent changes and only calls `startAnalytics()` when
  `isAnalyticsAllowed()` (consent === `granted`). Revoking consent disables tracking and
  unloads the SDK.
- The `ConsentBanner` collects the choice; the privacy page (`/personvern`) lets users
  toggle it later.

**Why opt-in?** Even cookie-free, the App Insights web SDK uses **sessionStorage** (its send
buffer). Writing to the device is "storing information on terminal equipment" under
**ePrivacy Art. 5(3)**, and analytics aren't *strictly necessary*, so prior opt-in consent is
required. See [§ Privacy & legal posture](#privacy--legal-posture).

## Server-side analytics (`apps/api/src/telemetry.ts`)

Uses the `applicationinsights` Node SDK. **All auto-collection is turned off** so the only
telemetry sent is our explicit `trackEvent` calls:

```ts
appInsights.setup(connectionString)
  .setAutoCollectConsole(false, false)
  .setAutoCollectDependencies(false)
  .setAutoCollectExceptions(false)
  .setAutoCollectHeartbeat(false)
  .setAutoCollectPerformance(false, false)
  .setAutoCollectPreAggregatedMetrics(false)
  .setAutoCollectRequests(false)        // ← no `requests` table; we count page_view ourselves
  .setSendLiveMetrics(false)
  .setUseDiskRetryCaching(false)
  .start();
appInsights.defaultClient.config.samplingPercentage = 30;
```

This is **cookieless and needs no consent** — nothing is stored on or read from the user's
device. It runs whenever `APPLICATIONINSIGHTS_CONNECTION_STRING` is set (prod); locally it's
a no-op.

### `page_view` (server-side visitor counting)

`apps/api/src/server.ts` adds an `onResponse` hook that emits one `page_view` per **top-level
navigation** (the HTML shell), excluding assets and `/api`:

- Primary signal: **`Sec-Fetch-Dest: document`** (a real browser page navigation, never an
  asset/`fetch`).
- Fallback for older browsers without `Sec-Fetch-*` (e.g. old Safari): `GET` + `Accept`
  contains `text/html` + the path has no file extension.
- Only `status < 400` GETs to non-`/api` paths are counted.

This counts **every visitor** (not just consenting ones), cookie-free, at negligible cost.

### Exact counts (sampling override)

Global sampling is **30%**, but `page_view` is forced to **100%** via a telemetry processor
so visitor counts are exact rather than estimated:

```ts
appInsights.defaultClient.addTelemetryProcessor((envelope) => {
  const data = envelope.data as { baseType?: string; baseData?: { name?: string } } | undefined;
  if (data?.baseType === 'EventData' && data.baseData?.name === 'page_view') {
    envelope.sampleRate = 100;          // never sample → exact counts
  }
  return true;
});
```

For every **other** event (sampled at 30%), always aggregate with **`sum(itemCount)`** in
KQL — the SDK records `itemCount` on retained items so the de-sampled estimate is correct.
`count()` alone would under-report by ~70%.

## Privacy & legal posture

The app is **cookie-free**. What it does store on the device (and how it's classified under
ePrivacy Art. 5(3)):

| Stored on device | Mechanism | Classification |
|---|---|---|
| `nordlys.location` | localStorage | Functional — the place the user chose → **exempt** |
| `i18nextLng` | localStorage | Functional — language preference → **exempt** |
| `nordlys.query-cache` | localStorage | Functional — caches the requested forecast → **exempt** |
| `nordlys.consent.analytics` | localStorage | Strictly necessary — stores the consent itself → **exempt** |
| `nordlys.push.id` | localStorage | Functional — only after explicit notify opt-in → **exempt** |
| PWA caches | Cache API | Strictly necessary for the installed PWA → **exempt** |
| **Client App Insights** | **sessionStorage** | **Non-essential analytics → requires consent** |

So **the consent banner exists solely because of the client-side App Insights.** If that were
removed (and analytics done purely server-side), no non-essential device storage would remain
and the banner could be dropped while staying compliant in the EU/EEA — including Norway,
whose `ekomloven § 3-15` requires opt-in consent since 1 Jan 2025.

**IP / personal data:** Application Insights **does not store the full client IP by default** —
it derives coarse geo (`client_City` / `client_CountryOrRegion`) then zeroes the IP. Combined
with cookie-free collection and the coarse `latBand`, server-side counting processes minimal
personal data; disclose it on the privacy page under *legitimate interest*.

> This is engineering documentation, not legal advice. See the cookie-law discussion in your
> own records / counsel for the authoritative position.

## Querying engagement

App Insights → **Logs**, or `az monitor app-insights query --app nordlys-appi-eeyobitljk4fq -g rg-nordlys --analytics-query "<KQL>"`.

**Daily visitors (exact — page_view is unsampled)**
```kusto
customEvents
| where name == "page_view" and timestamp > ago(30d)
| summarize visits = sum(itemCount) by bin(timestamp, 1d)
| render timechart
```

**Engagement snapshot + opt-in/share rates** (use `sum(itemCount)` for the 30%-sampled events)
```kusto
customEvents
| where timestamp > ago(30d)
| summarize visits        = sumif(itemCount, name == "page_view"),
            forecasts     = sumif(itemCount, name == "verdict_computed"),
            verdictsViewed= sumif(itemCount, name == "verdict_viewed"),
            optIns        = sumif(itemCount, name == "notify_opt_in"),
            subsCreated   = sumif(itemCount, name == "subscription_created"),
            shares        = sumif(itemCount, name == "share_clicked"),
            installs      = sumif(itemCount, name == "pwa_installed")
| extend optInRate = round(100.0 * subsCreated / forecasts, 1)
```

**Verdict mix (server-side, covers everyone)**
```kusto
customEvents
| where name == "verdict_computed" and timestamp > ago(30d)
| extend verdict = tostring(customDimensions.verdict)
| summarize hits = sum(itemCount) by verdict
| render piechart
```

**How users choose a location** (client event — consenting users only)
```kusto
customEvents
| where name == "location_selected" and timestamp > ago(30d)
| extend source = tostring(customDimensions.source)
| summarize hits = sum(itemCount) by source | render barchart
```

**Subscriber growth (the truest retention signal)**
```kusto
customEvents
| where name in ("subscription_created", "subscription_deleted") and timestamp > ago(90d)
| summarize hits = sum(itemCount) by name, bin(timestamp, 1d) | render timechart
```

**Usage blades / dashboards:** the **Usage → Events / Funnels / User Flows** blades work off
these custom events (build a funnel `location_selected → verdict_viewed → notify_opt_in`).
Pin any Logs chart to an **Azure Dashboard**, or build a **Workbook** for a reusable report.

## Dashboard & terminal tools

Two ready-made ways to read these metrics without writing KQL:

### Azure dashboard (`infra/analytics-dashboard.json`)

A shared **Azure Portal Dashboard** `nordlys-engagement-dashboard` (in `rg-nordlys`) with tiles
for **daily visitors**, **verdict mix**, an **engagement snapshot**, **location source**, and
**subscriber growth** (all sampling-aware — `sum(itemCount)`). Open it from the
[portal](https://portal.azure.com/#dashboard/arm/subscriptions/d0b7d6ee-17bf-4c4f-b79d-4f6c2cb583fd/resourceGroups/rg-nordlys/providers/Microsoft.Portal/dashboards/nordlys-engagement-dashboard),
or (re)deploy it from the committed template:

```bash
az deployment group create -g rg-nordlys --template-file infra/analytics-dashboard.json
```

### Terminal report (`scripts/analytics.ps1`)

Pulls the key numbers straight to the terminal — no portal needed. Needs `az` logged in;
auto-adds the `application-insights` CLI extension if missing.

```powershell
pwsh scripts/analytics.ps1                 # last 30 days (default)
pwsh scripts/analytics.ps1 -Days 7         # last 7 days
pwsh scripts/analytics.ps1 -Days 90 -ResourceGroup rg-nordlys -AppName nordlys-appi-eeyobitljk4fq
```

It prints visitors (today / 7d / N days, exact), forecast loads, the GO/MAYBE/NO mix,
conversions (opt-ins, unsubscribes, shares, installs), the current push-subscriber count, and a
14-day daily-visits sparkline.

## Caveats & gotchas

- **Client events under-count** real usage — they only fire for visitors who accepted the
  consent banner. Server events (`page_view`, `verdict_computed`, `subscription_*`) cover all.
- **Unique users / retention are unreliable** in App Insights here: cookie-free means no stable
  `user_Id`/`session_Id` across reloads. Use event *volumes* and the **subscriber count**
  (`scripts/subscriptions.ps1 -Action Count`) for retention, not the Users/Retention blades.
- **Sampling:** everything except `page_view` is at 30% → always `sum(itemCount)`.
- **Latency:** ingestion is ~1–3 minutes.
- **No `requests`/`pageViews` tables** — request auto-collection is off by design; `page_view`
  is the page-load source of truth.

## Extending

- **New server event:** `trackEvent('name', { ...stringableProps })` from `apps/api/src/telemetry.ts`.
  If it must be exact, add its name to the sampling-override processor.
- **New client event:** `trackEvent('name', props)` from `apps/web/src/lib/analytics.ts` — it's
  a no-op unless analytics consent is granted, so it stays consent-safe automatically.
- Keep new client-side storage **functional/strictly-necessary**, or the consent banner becomes
  mandatory again.
