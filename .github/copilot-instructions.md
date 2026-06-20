# Copilot instructions — Nordlys i natt?

Aurora go/no-go for Norway. Tells a user whether they can see the northern lights **tonight,
from their location**, by combining aurora strength (NOAA SWPC), cloud cover (MET Norway), and
darkness (computed sun elevation). React PWA + Node/Fastify, deployed to Azure Container Apps.
**Live: https://nordlys.isainative.dev**

## Stack & layout

- **pnpm workspaces monorepo**, TypeScript strict, ESM.
  - `packages/shared` (`@nordlys/shared`) — domain types + the **verdict engine** (built to `dist/`).
  - `apps/api` (`@nordlys/api`) — **Fastify 5, run via `tsx` (no compile)**; routes auto-loaded from `src/routes/*.ts`.
  - `apps/web` (`@nordlys/web`) — React 18 + Vite + PWA + TanStack Query + react-i18next (nb/en).
  - `infra` — Bicep (Container App + cron Job + ACR + Table Storage + Log Analytics + App Insights).
- **One image, one Container App** serves the API **and** the built SPA (same origin → no web↔api CORS).
- **Scale-to-zero** (`minReplicas=0`); a separate **Container Apps cron Job** runs the push evaluator.

## Conventions (follow these)

- **Extensionless** relative imports (`./x`, not `./x.js`) — the API runs on `tsx` + autoload.
- The **verdict engine lives in `packages/shared`** and is the single source of truth for
  GO/MAYBE/NO; the browser (via `/api/forecast`) and the cron job both use it. Don't duplicate it.
- Build `@nordlys/shared` **before** api/web (`pnpm --filter @nordlys/shared build`).
- One React component per file with a **co-located `.css`**; don't edit shared `styles.css` from
  feature components. Keep `i18n/locales/nb.json` and `en.json` key-for-key in sync.
- Secrets live in gitignored `.env` files (`apps/api/.env`, `apps/web/.env`) — never commit them.
- Local subscription store = **file JSON**; prod = **Azure Table Storage** (one `SubscriptionStore` interface).

## Push notifications

- Push opt-in uses a **soft prompt / double opt-in** in `NotifyButton`: keep the initial idle UI
  consistent on every platform (short sentence + `Subscribe`). Never call
  `Notification.requestPermission()` or `subscribeToPush()` on load; call them only from the explicit
  user-gesture `Allow notifications` button after the in-UI explanation.
- Edge/Chromium can quiet or auto-block notification requests because of quiet-request settings,
  abusive/crowd-deny heuristics, low engagement, missing user gesture, or prior denials. See
  [docs/push-notifications.md](../docs/push-notifications.md).
- `requestPermission()` has THREE results: `granted` → subscribe; `denied` → blocked state; `default`
  → the request was dismissed/quietly held (Edge/Chrome quiet UI) — this is NOT a hard block, so show
  "try again" guidance, never the blocked message (treating `default` as `denied` was a real bug).
- The browser's lock-icon flyout only lists a **Notifications** row after a decision exists; re-enable
  guidance must point to **Site settings → Notifications → Allow** (or `edge://`/`chrome://settings/content/notifications`),
  not the quick lock list.
- iOS/iPadOS Web Push requires an installed PWA on 16.4+; a normal Safari/Chrome tab cannot subscribe
  and should show Add-to-Home-Screen guidance.
- Backend cadence lives in `apps/api/src/scheduler/evaluate.ts` + `config.quietHours`: Container Apps
  cron `*/20 * * * *`, send only `GO`, at most once per 6h, quiet by default 02:00–06:00 Europe/Oslo.

## Commands

```bash
pnpm install && pnpm --filter @nordlys/shared build
pnpm dev                              # api :8080 + web :5173
pnpm -r typecheck
pnpm --filter @nordlys/shared --filter @nordlys/api test   # NOT `pnpm -r test` (web has no tests)
pnpm --filter @nordlys/web build
pnpm lint
```

## Top challenges & solutions (learn from these)

Most pain came from **"works locally, breaks at integration/deploy"**. Highlights (full detail in
[docs/troubleshooting.md](../docs/troubleshooting.md)):

1. **Ignore-glob hid a source file.** A broad `data`/`**/data` ignore (for the runtime store
   `apps/api/data/`) also matched `apps/web/src/data/`, so `presetLocations.ts` was missing from
   git **and** the Docker context → Linux/container build failed (local Windows build masked it).
   → **Anchor ignore patterns** (`/apps/api/data/`); after editing ignores, verify with `git ls-files`.
2. **NOAA Kp format changed** to an array of objects (was array-of-arrays + header) → parser
   returned 0 points silently. → `parseKpForecast` handles **both** shapes; **smoke-test live APIs**.
3. **MET 403** on placeholder `User-Agent` (`example.com`). → set a **real** `MET_USER_AGENT`; MET
   is proxied + cached (browsers can't set `User-Agent`).
4. **Bicep `ResourceNotFound` race:** `listKeys(resourceId(...))` creates no dependency. → emit the
   Log Analytics shared key from the module via **`workspace.listKeys()` output**; reference
   `module.outputs.*`. Only reference resources symbolically.
5. **`az acr build` on Windows** crashes (long `node_modules` paths during tar; cp1252 Unicode in
   log streaming cancels the run). → build with **local Docker** (or CI on Ubuntu); if forced,
   use a clean `git archive` dir + `PYTHONUTF8=1`.
6. **Timeline label overlap** (the "Now" label collided with the "Kp index" axis title). →
   decluttered; **screenshot SVG/chart UIs at real viewports**.

## On-demand documentation

Load the relevant doc when working in that area:

- [docs/README.md](../docs/README.md) — index + repo map + commands
- [docs/architecture.md](../docs/architecture.md) — system design, data flow, single-container model, `tsx`/scale-to-zero rationale
- [docs/verdict-engine.md](../docs/verdict-engine.md) — GO/MAYBE/NO logic, thresholds, SunCalc, scoring
- [docs/external-apis.md](../docs/external-apis.md) — MET / NOAA / Kartverket integration **and gotchas**
- [docs/backend.md](../docs/backend.md) — Fastify routes/services, push notifications, cron job, config/env
- [docs/frontend.md](../docs/frontend.md) — components, hooks, state, i18n, PWA, SEO, analytics
- [docs/push-notifications.md](../docs/push-notifications.md) — Web Push soft prompt, Edge auto-block findings, iOS constraints, cadence
- [docs/deployment.md](../docs/deployment.md) — Bicep, CI/CD, **manual `az` runbook**, secrets, cost
- [docs/local-development.md](../docs/local-development.md) — setup, env vars, run, test
- [docs/troubleshooting.md](../docs/troubleshooting.md) — **top challenges & solutions** (full detail)
