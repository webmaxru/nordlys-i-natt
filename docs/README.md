# Nordlys i natt? — Technical Documentation

Aurora go/no-go for Norway. The app answers one question for the user's location —
**"Can I see the northern lights tonight?"** — by combining aurora strength (NOAA),
cloud cover (MET Norway), and darkness (computed sun elevation).

> Live: **https://nordlys.isainative.dev** (Azure Container App, scale-to-zero, Azure managed TLS). Repo: private `webmaxru/nordlys-i-natt`.

## Documentation index

| Doc | What it covers |
|---|---|
| [architecture.md](./architecture.md) | System architecture, monorepo layout, data flow, single-container model |
| [verdict-engine.md](./verdict-engine.md) | The core domain logic: GO / MAYBE / NO from Kp × darkness × clouds |
| [external-apis.md](./external-apis.md) | MET Norway, NOAA SWPC, Kartverket integration **and their gotchas** |
| [backend.md](./backend.md) | Fastify API: proxy, caching, `/api/forecast`, push notifications, cron job |
| [frontend.md](./frontend.md) | React PWA: components, hooks, state, i18n, map, share, consent |
| [push-notifications.md](./push-notifications.md) | Web Push opt-in design, Edge auto-block findings, iOS constraints, backend cadence |
| [analytics.md](./analytics.md) | Telemetry & engagement: client (consent-gated) + server (cookieless) App Insights events, consent model, sampling, privacy posture, KQL cookbook |
| [deployment.md](./deployment.md) | Azure infra (Bicep), CI/CD, **manual deploy runbook**, secrets, cost |
| [registry-ghcr.md](./registry-ghcr.md) | Container registry: private GitHub Container Registry (GHCR), PAT pull secret, build/push/deploy, pruning |
| [subscriptions-admin.md](./subscriptions-admin.md) | Subscription administration and operational scripts |
| [local-development.md](./local-development.md) | Setup, run, test, environment variables |
| [troubleshooting.md](./troubleshooting.md) | **Top challenges & solutions** (the bugs that cost the most time) |

## TL;DR

- **Monorepo** (pnpm workspaces): `packages/shared` (verdict engine) · `apps/api` (Fastify) · `apps/web` (React PWA) · `infra` (Bicep).
- **One image, one Container App**: the Fastify server serves both the API **and** the built SPA (single origin → no web↔api CORS).
- **Scale-to-zero** by default (`minReplicas=0`); a separate **Container Apps cron Job** runs the push-notification evaluator so the app can sleep.
- **The verdict engine lives in `packages/shared`** and is used identically by the browser and the notification job — one source of truth.
- **The API runs via `tsx`** (no compile step) in every environment; internal imports are **extensionless**.

## Repository map

```
nor-api/
├─ packages/shared/        # @nordlys/shared — domain types + verdict engine (built to dist/)
│  └─ src/{types,thresholds,darkness,verdict,index}.ts (+ verdict.test.ts)
├─ apps/api/               # @nordlys/api — Fastify 5 (run via tsx)
│  └─ src/
│     ├─ server.ts config.ts job.ts telemetry.ts
│     ├─ routes/{health,forecast,noaa,met,subscriptions}.ts   # auto-loaded plugins
│     ├─ services/{cache,met,noaa,forecast,push,store}.ts (+ noaa.test.ts)
│     └─ scheduler/evaluate.ts
├─ apps/web/               # @nordlys/web — React 18 + Vite + PWA
│  └─ src/
│     ├─ main.tsx App.tsx styles.css
│     ├─ api/{client,forecast,kartverket,push}.ts
│     ├─ hooks/{useForecast,useOvationGrid,usePlaceSearch,useGeolocation}.ts
│     ├─ state/AppStateContext.tsx
│     ├─ components/*.tsx (+ co-located .css)
│     ├─ lib/format.ts
│     ├─ data/presetLocations.ts
│     └─ i18n/{index.ts,locales/{nb,en}.json}
├─ infra/                  # main.bicep + modules/{monitoring,storage,containerapp,job}.bicep (+ analytics-dashboard.json)
├─ scripts/                # subscriptions.ps1, analytics.ps1 (operational PowerShell tools)
├─ .github/workflows/      # ci.yml, deploy.yml
├─ Dockerfile .dockerignore
└─ pnpm-workspace.yaml package.json tsconfig.base.json
```

## Common commands

```bash
pnpm install
pnpm --filter @nordlys/shared build   # build the engine first (api/web import its dist)
pnpm dev                              # api :8080 + web :5173 (web proxies /api → :8080)
pnpm -r typecheck
pnpm --filter @nordlys/shared --filter @nordlys/api test
pnpm --filter @nordlys/web build
pnpm lint
```
