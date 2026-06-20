# Local development

## Prerequisites

- **Node 22+**, **pnpm 9** (`corepack enable`)
- Optional for deploy: Docker Desktop (Linux engine), Azure CLI + Bicep

## Setup

```bash
pnpm install
pnpm --filter @nordlys/shared build        # build the engine FIRST (api/web import its dist)
cp .env.example apps/api/.env              # then fill in values (see below)
```

## Environment

Backend secrets live in **`apps/api/.env`** (gitignored). Frontend `VITE_*` vars (if any) live
in **`apps/web/.env`**. Minimum for a working local app:

```ini
# apps/api/.env
MET_USER_AGENT="nordlys-i-natt/1.0 you@your-domain"   # a REAL contact — placeholders get 403
STORE_DRIVER=file
STORE_FILE_PATH=./data/subscriptions.json
# For push (optional locally): npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT="mailto:you@your-domain"
```

```ini
# apps/web/.env (only if testing push locally)
VITE_VAPID_PUBLIC_KEY=...   # same as VAPID_PUBLIC_KEY
```

> The store uses a **file-based JSON** driver locally (no native `better-sqlite3` build). The
> verdict, weather, and aurora all work without VAPID; push just won't be available.

## Run

```bash
pnpm dev        # api :8080 + web :5173 (web proxies /api → :8080)
```

If `pnpm dev` (concurrently) buffers output or the API doesn't bind, run them separately:

```bash
# terminal 1
pnpm --filter @nordlys/api dev      # tsx watch, :8080
# terminal 2
pnpm --filter @nordlys/web dev      # vite, :5173
```

Open http://localhost:5173. Pick a preset city (e.g. Tromsø) to see a verdict without granting
geolocation.

## Quality gates

```bash
pnpm -r typecheck
pnpm --filter @nordlys/shared --filter @nordlys/api test   # web has no unit tests yet
pnpm --filter @nordlys/web build
pnpm lint
```

> Don't run `pnpm -r test` — `@nordlys/web` has no test files and Vitest exits non-zero. Target
> `shared` + `api` (as above) instead.

## Conventions

- **ESM + extensionless** relative imports (`import { x } from './y'`). The API runs on `tsx`.
- TypeScript **strict**; 2-space, single quotes (Prettier).
- One React component per file with a **co-located `.css`**; don't edit `styles.css` from feature components.
- `nb.json` / `en.json` must stay key-for-key in sync.
- Never commit `.env`. Keep `apps/web/src/data` (and any other source `data/` dirs) out of
  broad ignore globs — see [troubleshooting.md](./troubleshooting.md).

## Useful smoke tests

```bash
# backend end-to-end (hits live MET + NOAA)
curl "http://localhost:8080/api/health"
curl "http://localhost:8080/api/forecast?lat=69.6492&lon=18.9553&name=Tromso"
# notification job (0 subs locally → exits cleanly)
pnpm --filter @nordlys/api job
```
