# Deployment

The app deploys as **one Azure Container App** (serves web + API) plus a **Container Apps
cron Job** (notifications), with a private **GHCR** image, Azure Table Storage, Log Analytics, and Application
Insights. Region: `norwayeast`. IaC is **Bicep** (`infra/`). Two paths: CI/CD (GitHub Actions)
or a manual `az` runbook.

## Resources (`infra/main.bicep` + modules)

| Module | Creates |
|---|---|
| `monitoring.bicep` | Log Analytics workspace + workspace-based Application Insights (outputs customerId, **shared key**, connection string) |
| `storage.bicep` | Storage account + Table `subscriptions` (push store) |
| `containerapp.bicep` | Managed environment + Container App (external ingress :8080, `minReplicas`/`maxReplicas`, HTTP scale rule, env + secrets) |
| `job.bicep` | Container Apps Job (Schedule, `cronExpression`, same image, `job` command) |

Names are derived deterministically from `namePrefix` + `uniqueString(resourceGroup().id)`
(e.g. app = `'${namePrefix}-app-${suffix}'`). Key params: `containerImage`, `minReplicas`
(0 = scale-to-zero), `maxReplicas`, `cpu`, `memory`, `cronExpression`, and `@secure()`
`metUserAgent`, `vapidPublicKey/PrivateKey/Subject`.

> **Bicep gotcha (fixed):** never read a resource you didn't create symbolically. The shared
> key is emitted from `monitoring.bicep` (symbolic `workspace.listKeys()`) and consumed via
> `monitoring.outputs.workspaceSharedKey`. Using `listKeys(resourceId(...))` in `main.bicep`
> had no dependency edge and caused a `ResourceNotFound` race on fresh deploys. See
> [troubleshooting.md](./troubleshooting.md).

## Cost & scaling

- `minReplicas=0` → ≈ **€0 when idle** (cold start on first request after idle). Standing cost:
  ≈ **0** — the **GHCR** registry is free; just a little Table Storage + Application Insights free tier.
- For aurora season, set `minReplicas=1` (warm, no cold starts).
- The Job is billed only per run (seconds, every ~20 min).

## Manual deploy runbook (`az` + Docker)

This is the manual flow (works without CI). The image lives in **private GHCR**
(`ghcr.io/webmaxru/nordlys-i-natt`); see [registry-ghcr.md](./registry-ghcr.md) for pull-secret details.

```powershell
$RG = "rg-nordlys"; $PREFIX = "nordlys"
$Image = "ghcr.io/webmaxru/nordlys-i-natt"; $SHA = git rev-parse --short HEAD

# 1) Build & push with LOCAL Docker (BuildKit respects .dockerignore + Windows long paths/UTF-8).
#    $Pat = a classic GitHub PAT with write:packages.
$Pat | docker login ghcr.io -u webmaxru --password-stdin
docker build -t "${Image}:$SHA" -t "${Image}:latest" .
docker push "${Image}:$SHA"; docker push "${Image}:latest"

# 2) First deploy via Bicep (registryPassword = a PAT with read:packages for the pull secret).
az deployment group create -g $RG -f infra/main.bicep -p "@infra/main.parameters.json" `
  namePrefix=$PREFIX containerImage="${Image}:$SHA" `
  registryServer=ghcr.io registryUsername=webmaxru registryPassword=<read-packages-pat> `
  metUserAgent="nordlys-i-natt/1.0 you@your-domain" `
  vapidPublicKey="..." vapidPrivateKey="..." vapidSubject="mailto:you@your-domain"

# 3) Subsequent code updates: rebuild/push, then roll a new revision (no full redeploy):
az containerapp update     -n nordlys-app-eeyobitljk4fq -g $RG --image "${Image}:$SHA"
az containerapp job update  -n nordlys-job-eeyobitljk4fq -g $RG --image "${Image}:$SHA"
```

> **Windows build note:** on Windows the az CLI can crash mid-build with a `UnicodeEncodeError`
> while streaming pnpm's non-ASCII log output (cp1252 vs UTF-8). Build with **local Docker** (as
> above) and make sure Docker Desktop's Linux engine is running; set `PYTHONUTF8=1` for `az`.

## CI/CD (`.github/workflows`)

- `ci.yml` (PRs): pnpm install → build shared → `-r typecheck` → test shared+api → web build.
- `deploy.yml` (push to `main`): OIDC `azure/login` → build & push the image to **GHCR** (via the
  built-in `GITHUB_TOKEN`) → `az deployment group create` (the Container App pulls the private image
  with the `GHCR_PULL_TOKEN` secret).
- **Required secrets:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (OIDC
  federated credential), `GHCR_PULL_TOKEN` (classic PAT, `read:packages`), `MET_USER_AGENT`,
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. **Var:** `AZURE_RESOURCE_GROUP`. See
  `infra/README.md`.

## Custom domain & TLS (live)

Live at **https://nordlys.isainative.dev** with an Azure **managed certificate** (auto-renews).
The DNS provider is Cloudflare; the setup that was used:

1. In Cloudflare DNS for the zone, add two records:
   - **CNAME** `nordlys` → the Container App default FQDN, **DNS only (grey cloud)** — Azure must
     reach the real origin to validate ownership and issue the cert; Cloudflare's proxy would
     intercept and present its own certificate.
   - **TXT** `asuid.nordlys` → the app's `customDomainVerificationId`
     (`az containerapp show -n <app> -g <rg> --query properties.customDomainVerificationId -o tsv`).
2. Bind the hostname + a managed cert:
   ```bash
   az containerapp hostname add  -n <app> -g <rg> --hostname nordlys.isainative.dev
   az containerapp hostname bind -n <app> -g <rg> --hostname nordlys.isainative.dev \
     --environment <env> --validation-method CNAME
   ```
3. The SEO `canonical` / `og:url` / `og:image` / `sitemap.xml` already point to this domain.

*Optional:* to front it with Cloudflare's CDN/WAF, switch the CNAME to **Proxied (orange)** **and**
set Cloudflare **SSL/TLS → Full (strict)**. Currently DNS-only (Azure serves HTTPS directly).

## Post-deploy TODOs

- Set a **daily cap** on the Log Analytics workspace to stay in the App Insights free tier.
- Prune old **GHCR** image versions periodically to stay within the free package allowance.
