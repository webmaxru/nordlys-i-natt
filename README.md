# Nordlys i natt? 🌌

Aurora go/no-go for Norway. Tells you whether you can see the northern lights
**tonight, from your location**, by combining three open data sources:

1. **Aurora strength** — NOAA SWPC planetary Kp forecast + OVATION oval
2. **Cloud cover** — MET Norway `locationforecast` (via a caching proxy)
3. **Darkness window** — computed sun elevation (SunCalc), cross-checked with MET `sunrise`

Output: a **GO / MAYBE / NO** verdict + best hour + a 3-day timeline + an aurora-oval
map + a shareable result card, plus optional push notifications when conditions turn good.

## Monorepo layout

| Path | What |
|---|---|
| `packages/shared` | Domain types + the **verdict engine** (used by web *and* the notification job) |
| `apps/api` | Node.js / Fastify — MET proxy, NOAA cache, `/api/forecast`, push, scheduler job |
| `apps/web` | React + Vite + TypeScript PWA (map, gauge, timeline, share, i18n NO/EN) |
| `infra` | Dockerfile + Bicep for Azure Container Apps |

## Develop

```bash
pnpm install
pnpm --filter @nordlys/shared build   # build shared first
pnpm dev                              # runs api (:8080) + web (:5173)
```

Copy `.env.example` → `.env` and set `MET_USER_AGENT` (a real contact, required by
MET's terms) and VAPID keys (`npx web-push generate-vapid-keys`) for notifications.

## Test / typecheck

```bash
pnpm test        # all workspaces
pnpm typecheck
```

## Deploy

Single **Azure Container App** (serves web + API) + a **Container Apps cron Job**
(notification evaluator), scale-to-zero by default. See `infra/README.md`.

## Attribution

Data from **MET Norway**, **NOAA SWPC**, and **Kartverket** — see in-app footer.
