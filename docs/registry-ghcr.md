# Container registry (GHCR)

The deployed image lives in **GitHub Container Registry**: `ghcr.io/webmaxru/nordlys-i-natt`.
The package is **private** — it contains the app source, but **no secrets** are baked in (VAPID keys,
the Table Storage connection string, and `MET_USER_AGENT` are injected at runtime as Container Apps
secrets). GHCR has a free allowance for private packages, so there is **no always-on registry cost**.

## Pull credentials (private image)

Because the image is private, Azure Container Apps pull it with a **GitHub Personal Access Token**
stored as a registry secret:

- The **Container App** and the **Container Apps Job** each have a `ghcr.io` registry entry with
  username `webmaxru` and a `registry-password` secret holding the PAT.
- In CI (`.github/workflows/deploy.yml`), the pull token comes from the repo secret
  **`GHCR_PULL_TOKEN`** (a classic PAT with `read:packages`); the build-and-push step uses the
  built-in `GITHUB_TOKEN`.

Create a token at <https://github.com/settings/tokens> — a classic PAT with `read:packages` (and
`write:packages` too if you also push images from your machine).

## Build, push, deploy (manual, from PowerShell)

```powershell
$Image = "ghcr.io/webmaxru/nordlys-i-natt"; $SHA = git rev-parse --short HEAD
$Pat | docker login ghcr.io -u webmaxru --password-stdin
docker build -t "${Image}:$SHA" -t "${Image}:latest" .
docker push "${Image}:$SHA"; docker push "${Image}:latest"

# point the live Container App + Job at the new image
az containerapp update     -n nordlys-app-eeyobitljk4fq -g rg-nordlys --image "${Image}:$SHA"
az containerapp job update  -n nordlys-job-eeyobitljk4fq -g rg-nordlys --image "${Image}:$SHA"
```

If a Container App/Job registry credential ever needs (re)setting:

```powershell
az containerapp registry set     -n nordlys-app-eeyobitljk4fq -g rg-nordlys --server ghcr.io --username webmaxru --password <pat>
az containerapp job registry set  -n nordlys-job-eeyobitljk4fq -g rg-nordlys --server ghcr.io --username webmaxru --password <pat>
```

## Free-tier limits and pruning

Private GHCR packages count toward GitHub Packages storage and data-transfer quotas (GitHub Free
includes a small allowance — roughly 500 MB storage and 1 GB/month transfer; paid plans include
more). Prune old image versions regularly to stay within the free allowance:

- Package page: <https://github.com/webmaxru/nordlys-i-natt/pkgs/container/nordlys-i-natt>
- Deleting versions: <https://docs.github.com/en/packages/learn-github-packages/deleting-a-package-version>
- Billing/limits: <https://docs.github.com/en/billing/managing-billing-for-github-packages/about-billing-for-github-packages>
