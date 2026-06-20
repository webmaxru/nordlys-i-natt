# Troubleshooting & top challenges

The bugs that cost the most iteration time, with root cause and fix. Most were **environment
gaps that only appeared at integration/deploy time** (a local build passing is not proof a
Linux/container build or a fresh Azure deploy will). Each entry: symptom → cause → fix → guardrail.

---

## 1. Build works locally but **fails in Docker/Linux** — a source file was git/Docker‑ignored

**Symptom:** `vite build` failed only inside Docker with
`Could not resolve "../data/presetLocations" from src/components/LocationPicker.tsx`. Locally it
built fine, and the file existed on disk.

**Cause:** `.gitignore` and `.dockerignore` contained a broad `data` / `**/data` pattern (intended
for the runtime store `apps/api/data/`). That pattern **also matched `apps/web/src/data/`**, so
`presetLocations.ts` was excluded from **git** *and* the **Docker build context**. Windows'
case-insensitive, file-present working tree masked it; Linux/container (committed source only)
broke.

**Fix:** scope the ignore to `apps/api/data/` (not bare `data`). Commit the missing file.

**Guardrail:** prefer **anchored** ignore patterns (`/apps/api/data/`) over bare directory names.
After changing ignores, run `git status` / `git ls-files <path>` to confirm intended files are
still tracked. Treat "works locally, fails in CI/Docker" as a **context/case-sensitivity** smell.

---

## 2. NOAA Kp parser silently returned **0 points**

**Symptom:** `/api/forecast` returned a verdict but `kpForecast` was empty; the timeline had no
bars. No error thrown.

**Cause:** the NOAA planetary‑K‑index endpoint now returns an **array of objects**
(`{ time_tag, kp, observed }`), not the historical **array‑of‑arrays‑with‑header**. The parser
assumed the old shape (`slice(1)`, index access) → every row rejected.

**Fix:** `parseKpForecast` handles **both** shapes; `time_tag` (UTC, no `Z`) gets a `Z` appended.

**Guardrail:** be defensive about third‑party JSON shapes; **smoke‑test against live endpoints**
(not just unit fixtures) — this was found by curling the deployed-style flow, not by tests.

---

## 3. MET Norway returns **403** on the default User-Agent

**Symptom:** `/api/forecast` → 502; the MET `locationforecast` upstream returned **403 Forbidden**.

**Cause:** MET requires an identifying `User-Agent` and **blocks obvious placeholders** — the
default contained `example.com`.

**Fix:** set a **real** contact via `MET_USER_AGENT` (e.g. `nordlys-i-natt/1.0 you@your-domain`).
This is also why MET is **proxied** (browsers can't set `User-Agent`; the proxy adds it + caches).

**Guardrail:** never ship `example.com`/placeholder UAs; document `MET_USER_AGENT` as required.

---

## 4. Bicep `ResourceNotFound` for the Log Analytics workspace on a **fresh** deploy

**Symptom:** `az deployment group create` failed with
`The Resource 'Microsoft.OperationalInsights/workspaces/...-law-...' was not found` — yet the
workspace existed afterward (a re-run "fixed" it).

**Cause:** `main.bicep` read the workspace shared key via
`listKeys(resourceId('...workspaces', name))`. `resourceId()` is just a string — it creates **no
dependency edge**, so ARM evaluated `listKeys` before the `monitoring` module created the
workspace.

**Fix:** emit the key from the module that owns the resource —
`output workspaceSharedKey = workspace.listKeys().primarySharedKey` in `monitoring.bicep` — and
consume `monitoring.outputs.workspaceSharedKey`. The output reference creates a real dependency.

**Guardrail:** in Bicep, only reference resources via **symbolic names / module outputs**, never
`listKeys(resourceId(...))` for something you create in the same deployment.

---

## 5. `az acr build` crashes on Windows + Docker context long paths

**Symptom A:** `az acr build .` aborted while "Packing source code into tar" with a Windows
`MAX_PATH` error deep inside `node_modules/.pnpm/...`.
**Symptom B:** when it did upload, the az CLI crashed mid-build with
`UnicodeEncodeError: 'charmap' codec can't encode...` while streaming pnpm's log output, which
**cancelled the cloud run** (it showed `Failed` after ~35s).

**Cause:** (A) the az packer traverses the directory (incl. local `node_modules`) before applying
`.dockerignore` and hits Windows path limits; (B) the bundled az CLI's colorama writes build logs
in cp1252, which can't encode pnpm's non‑ASCII progress output.

**Fix used:** build with **local Docker** instead (`docker build` + `docker push`). BuildKit
respects `.dockerignore` (skips `node_modules`) and handles long paths/UTF‑8. Docker Desktop's
Linux engine simply needed starting. *(CI runs `az acr build` on Ubuntu, where neither issue exists.)*

**Guardrail:** on Windows, prefer local Docker or CI for image builds. If you must use
`az acr build`, point it at a **clean directory** (e.g. extracted `git archive`) and set
`PYTHONUTF8=1`.

---

## 6. Timeline labels overlapped

**Symptom:** the 3‑day chart showed a collided "Kp indexNow"‑style label and cramped bottom labels.

**Cause:** the **"Now"** marker label sat at the chart's left edge (because *now* ≈ the chart
start) and overlapped the **"Kp index"** axis title; redundant start/end clock labels collided
with the weekday ticks.

**Fix:** removed the "Now" text (kept the now‑line) and the start/end clock labels (weekday ticks
convey the axis). Found via **headless‑browser screenshots** at desktop + mobile.

**Guardrail:** screenshot SVG/chart UIs at real viewports; beware labels anchored to dynamic
positions (like "now") colliding with static ones.

---

## Decisions that pre‑empted whole classes of problems

- **API on `tsx` (no compile):** keeps `@fastify/autoload` working at runtime and avoids ESM
  `.js`‑extension pain. Cost: minor startup overhead. (→ use **extensionless** imports.)
- **File‑based JSON store locally** (Azure Table in prod): avoids native `better-sqlite3`
  toolchain builds on Windows, behind one `SubscriptionStore` interface.
- **Verdict engine in `packages/shared`:** the browser and the notification job can't disagree.
- **Pre‑authored i18n keys before parallel UI work:** five agents editing the same `nb/en.json`
  would have raced; the shared keys were written once up front so components only *read* them.
