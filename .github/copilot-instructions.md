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
  - `infra` — Bicep (Container App + cron Job + GHCR registry credentials + Table Storage + Log Analytics + App Insights).
- **One image, one Container App** serves the API **and** the built SPA (same origin → no web↔api CORS).
- **Scale-to-zero** (`minReplicas=0`); a separate **Container Apps cron Job** runs the push evaluator.
- Container registry is **private GHCR**: `ghcr.io/webmaxru/nordlys-i-natt`. Images are pulled with a PAT-based registry secret (repo secret `GHCR_PULL_TOKEN` in CI); keep the image private. See [docs/registry-ghcr.md](../docs/registry-ghcr.md).

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
- **Prominence:** `NotifyButton` renders in **position #2, directly under `VerdictGauge`** (first screen on
  mobile + desktop). Its idle state is a **slim accent CTA row** (`.notify-button--cta`: bell badge +
  `notify.ctaTitle` + `notify.ctaDetail` + `Subscribe`) that must stay one compact row so the verdict
  remains above it. Other states (explain/install/blocked/…) keep the original card layout.
- **Gotcha (idle CTA testing + layout):** headless Chromium reports `Notification.permission === 'denied'`,
  so the component renders the *blocked* card and the idle CTA row is never exercised — spoof
  `Object.defineProperty(Notification,'permission',{get:()=>'default'})` (or delete `Notification` for the
  iOS sim) to reach it. The idle flex row's `nowrap` content blew out the `.app-main` grid until it was
  pinned to `grid-template-columns: minmax(0, 1fr)`; keep that guard. `layout.spec.ts` has a regression
  test asserting the idle CTA causes no horizontal overflow at 390px.

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
5. **Windows image builds:** build with **local Docker** (Docker Desktop's Linux engine must be
   running); BuildKit respects `.dockerignore` (skips `node_modules`) and handles long paths/UTF-8.
   Set `PYTHONUTF8=1` for `az`. Images push to **GHCR**; CI builds on Ubuntu.
6. **Timeline label overlap** (the "Now" label collided with the "Kp index" axis title). →
   decluttered; **screenshot SVG/chart UIs at real viewports**.
7. **CI/CD deploy pitfalls (all hit in one session):** `deploy.yml` failed silently at parse time
   (0s `startup_failure`) because an inline `run: echo "…: https://…"` colon-space broke YAML — keep
   such values as block scalars (`run: |`). Actions can't push to a **pre-existing GHCR package**
   until the repo is granted **Write** (package → *Manage Actions access*). And a resource-group
   **Bicep deploy wipes `ingress.customDomains`**, dropping the custom domain every deploy → the
   workflow's *Re-bind custom domain* step restores it (the managed cert persists at the env level;
   gated on the `CUSTOM_DOMAIN` var). Push to `main` now auto-deploys via OIDC. See
   [docs/deployment.md](../docs/deployment.md).

## On-demand documentation

Load the relevant doc when working in that area:

- [docs/README.md](../docs/README.md) — index + repo map + commands
- [docs/architecture.md](../docs/architecture.md) — system design, data flow, single-container model, `tsx`/scale-to-zero rationale
- [docs/verdict-engine.md](../docs/verdict-engine.md) — GO/MAYBE/NO logic, thresholds, SunCalc, scoring
- [docs/external-apis.md](../docs/external-apis.md) — MET / NOAA / Kartverket integration **and gotchas**
- [docs/backend.md](../docs/backend.md) — Fastify routes/services, push notifications, cron job, config/env
- [docs/frontend.md](../docs/frontend.md) — components, hooks, state, i18n, PWA, SEO, analytics
- [docs/push-notifications.md](../docs/push-notifications.md) — Web Push soft prompt, Edge auto-block findings, iOS constraints, cadence
- [docs/analytics.md](../docs/analytics.md) — server-side cookieless App Insights events (no consent banner), `page_view` counting, sampling, privacy posture, KQL
- [docs/deployment.md](../docs/deployment.md) — Bicep, CI/CD, **manual `az` runbook**, secrets, cost
- [docs/registry-ghcr.md](../docs/registry-ghcr.md) — private GHCR migration, PAT setup, image pruning, rollback
- [docs/local-development.md](../docs/local-development.md) — setup, env vars, run, test
- [docs/troubleshooting.md](../docs/troubleshooting.md) — **top challenges & solutions** (full detail)
