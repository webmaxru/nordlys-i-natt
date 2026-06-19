# Nordlys i natt? Azure infrastructure

This Bicep deploys:

- Log Analytics + workspace-based Application Insights
- Storage account with the `subscriptions` table
- Azure Container Registry (Basic)
- Azure Container Apps managed environment
- Container App for the web/API
- Scheduled Container Apps Job for notifications

## Deploy

```powershell
az group create --name rg-nordlys --location norwayeast
az deployment group create `
  --resource-group rg-nordlys `
  --template-file infra/main.bicep `
  --parameters @infra/main.parameters.json
```

Build and push the image before deployment, then set `containerImage` to the full ACR image reference including tag.

## Scale-to-zero

`minReplicas=0` lets the web/API Container App scale to zero when idle, which is approximately €0 idle compute cost. Set `minReplicas=1` during aurora season if you want a warm instance and lower first-request latency.

The scheduled Container Apps Job handles notifications independently of the web/API app replicas, so notifications can run even when the web/API app is scaled to zero.

## Notes

The Docker image runs the API by default. The Job uses the same image and overrides the command with:

```json
["pnpm", "--filter", "@nordlys/api", "job"]
```

ACR pulls currently use ACR admin credentials stored as Container Apps secrets for one-pass deployment reliability. A TODO in `main.bicep` marks replacing this with managed identity + AcrPull.
