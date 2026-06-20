# Deployment

The app deploys as **one Azure Container App** (serves web + API) plus a **Container Apps
cron Job** (notifications), with ACR, Azure Table Storage, Log Analytics, and Application
Insights. Region: `norwayeast`. IaC is **Bicep** (`infra/`). Two paths: CI/CD (GitHub Actions)
or a manual `az` runbook.

## Resources (`infra/main.bicep` + modules)

| Module | Creates |
|---|---|
| `monitoring.bicep` | Log Analytics workspace + workspace-based Application Insights (outputs customerId, **shared key**, connection string) |
| `storage.bicep` | Storage account + Table `subscriptions` (push store) |
| `registry.bicep` | Azure Container Registry (Basic) |
| `containerapp.bicep` | Managed environment + Container App (external ingress :8080, `minReplicas`/`maxReplicas`, HTTP scale rule, env + secrets) |
| `job.bicep` | Container Apps Job (Schedule, `cronExpression`, same image, `job` command) |

Names are derived deterministically from `namePrefix` + `uniqueString(resourceGroup().id)`
(e.g. ACR = `take('${safePrefix}acr${suffix}', 50)`). Key params: `containerImage`, `minReplicas`
(0 = scale-to-zero), `maxReplicas`, `cpu`, `memory`, `cronExpression`, and `@secure()`
`metUserAgent`, `vapidPublicKey/PrivateKey/Subject`.

> **Bicep gotcha (fixed):** never read a resource you didn't create symbolically. The shared
> key is emitted from `monitoring.bicep` (symbolic `workspace.listKeys()`) and consumed via
> `monitoring.outputs.workspaceSharedKey`. Using `listKeys(resourceId(...))` in `main.bicep`
> had no dependency edge and caused a `ResourceNotFound` race on fresh deploys. See
> [troubleshooting.md](./troubleshooting.md).

## Cost & scaling

- `minReplicas=0` → ≈ **€0 when idle** (cold start on first request after idle). Standing cost:
  ACR Basic + a little Table Storage + Application Insights free tier.
- For aurora season, set `minReplicas=1` (warm, no cold starts).
- The Job is billed only per run (seconds, every ~20 min).

## Manual deploy runbook (`az` + Docker)

This is the flow that was used to ship the first deployment (works without CI secrets).

```bash
RG=rg-nordlys; LOC=norwayeast; PREFIX=nordlys
az group create -n $RG -l $LOC

# 1) Resolve the Bicep-derived ACR + app names (deploy a tiny names-only template, or read main.bicep)
#    ACR  = take('${tolower(prefix)}acr${uniqueString(rg.id)}', 50)
#    APP  = '${prefix}-app-${uniqueString(rg.id)}'

# 2) Build & push the image. Prefer LOCAL Docker (BuildKit respects .dockerignore, handles
#    Windows long paths, and avoids the `az acr build` Windows Unicode-streaming crash):
az acr create -n $ACR -g $RG --sku Basic --admin-enabled true
CREDS=$(az acr credential show -n $ACR)            # username + password
docker login $ACR.azurecr.io -u <user> -p <pwd>
SHA=$(git rev-parse --short HEAD)
docker build -t $ACR.azurecr.io/nordlys/app:$SHA -t $ACR.azurecr.io/nordlys/app:latest .
docker push $ACR.azurecr.io/nordlys/app:$SHA

# 3) Deploy the infrastructure with the image + secrets
az deployment group create -g $RG -f infra/main.bicep -p @infra/main.parameters.json \
  location=$LOC namePrefix=$PREFIX \
  containerImage=$ACR.azurecr.io/nordlys/app:$SHA \
  metUserAgent="nordlys-i-natt/1.0 you@your-domain" \
  vapidPublicKey="..." vapidPrivateKey="..." vapidSubject="mailto:you@your-domain"

# 4) Subsequent code updates: rebuild/push, then roll a new revision (no full redeploy):
az containerapp update     -n $APP -g $RG --image $ACR.azurecr.io/nordlys/app:$SHA
az containerapp job update -n ${PREFIX}-job-... -g $RG --image $ACR.azurecr.io/nordlys/app:$SHA
```

> **`az acr build` note:** on Windows the az CLI can crash mid-build with a `UnicodeEncodeError`
> while streaming pnpm's log output (cp1252 vs UTF-8), which cancels the run. The local
> Docker build above avoids it. If you must use `az acr build`, build from a clean **directory**
> (e.g. extracted `git archive`) so its tar packer doesn't traverse `node_modules` and hit
> Windows `MAX_PATH`.

## CI/CD (`.github/workflows`)

- `ci.yml` (PRs): pnpm install → build shared → `-r typecheck` → test shared+api → web build.
- `deploy.yml` (push to `main`): OIDC `azure/login` → ensure RG/ACR → `az acr build` (cloud,
  no Windows issues) → `az deployment group create`. It resolves the ACR name with the **same**
  `uniqueString` formula as `main.bicep`.
- **Required secrets:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (OIDC
  federated credential), `MET_USER_AGENT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`. **Var:** `AZURE_RESOURCE_GROUP`. See `infra/README.md`.

## Post-deploy TODOs

- Point a **custom domain** at the Container App and update the SEO `og:url` / `canonical` in
  `apps/web/index.html` (currently the placeholder `nordlys-i-natt.no`).
- Switch **ACR pull** from admin credentials to a **managed identity + `AcrPull`** role (TODO
  noted in `main.bicep` / `infra/README.md`).
- Set a **daily cap** on the Log Analytics workspace to stay in the App Insights free tier.
