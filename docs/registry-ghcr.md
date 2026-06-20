# Migrating the container registry to private GHCR

The deployed image is moving from Azure Container Registry Basic (`nordlysacreeyobitljk4fq.azurecr.io/nordlys/app`) to GitHub Container Registry at `ghcr.io/webmaxru/nordlys-i-natt`.

## Why migrate

ACR Basic has no free tier and costs about **53 NOK/month** for this app. GHCR has a free allowance for private packages, so it removes that always-on registry cost while keeping the repository and image private.

## Private vs public image

Keep the image **private**. A private GHCR image requires a GitHub PAT as the Azure Container App pull secret, but it avoids exposing the package. A public image would be credential-free for Azure pulls, but the owner already chose to keep the repo private.

No secrets should be baked into the image: VAPID keys, connection strings, and `MET_USER_AGENT` are injected at runtime through Container Apps secrets and environment variables.

## Create the PAT

Create a classic GitHub PAT at <https://github.com/settings/tokens> for the account that owns or can access `webmaxru/nordlys-i-natt`.

Required scopes for the migration script:

- `read:packages`
- `write:packages`

For CI deployments, add repository secret `GHCR_PULL_TOKEN` with at least `read:packages`; this becomes the long-lived Container Apps pull secret. The workflow uses `GITHUB_TOKEN` only for the build-and-push step.

## Run the one-time cutover

From Windows PowerShell in the repository root:

```powershell
./scripts/migrate-to-ghcr.ps1 -GitHubPat <classic-pat>
```

After confirming production is healthy and the old ACR is no longer needed:

```powershell
./scripts/migrate-to-ghcr.ps1 -GitHubPat <classic-pat> -DeleteAcr
```

`-DeleteAcr` prompts for confirmation unless `-Force` is also supplied. The script builds and pushes both `:<git-sha>` and `:latest`, configures the Container App and Container Apps Job to pull from private GHCR, updates their images, then verifies:

- <https://nordlys.isainative.dev/api/health>
- <https://nordlys.isainative.dev/>

## GHCR free-tier limits and pruning

Private GHCR packages count toward GitHub Packages storage and data-transfer quotas. GitHub Free currently includes a small private-package allowance (for example, 500 MB storage and 1 GB/month transfer for personal/free accounts), while paid plans include higher allowances. Public packages do not count the same way, but this project intentionally keeps the image private.

Prune old image versions regularly from the repository package page to stay within the free allowance:

- Repository package page: <https://github.com/webmaxru/nordlys-i-natt/pkgs/container/nordlys-i-natt>
- GitHub docs: <https://docs.github.com/en/packages/learn-github-packages/deleting-a-package-version>
- Billing/limits docs: <https://docs.github.com/en/billing/managing-billing-for-github-packages/about-billing-for-github-packages>

## Rollback

If health checks fail after switching to GHCR, re-point the Container App and Job to the previous ACR image and registry credentials. The old ACR should not be deleted until GHCR health is green.

Example rollback image updates, after restoring ACR registry credentials:

```powershell
az containerapp update -n nordlys-app-eeyobitljk4fq -g rg-nordlys --image nordlysacreeyobitljk4fq.azurecr.io/nordlys/app:<previous-tag>
az containerapp job update -n nordlys-job-eeyobitljk4fq -g rg-nordlys --image nordlysacreeyobitljk4fq.azurecr.io/nordlys/app:<previous-tag>
```
