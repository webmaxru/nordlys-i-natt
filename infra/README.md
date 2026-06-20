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

## GitHub Actions setup

The deployment workflow in `.github/workflows/deploy.yml` uses GitHub OIDC with `azure/login@v2`, builds the root `Dockerfile` in Azure Container Registry Tasks, and deploys `infra/main.bicep` at resource-group scope.

Create a Microsoft Entra app/service principal with permission to create resources in the target subscription/resource group, then add a federated credential for this repository and workflow. Example:

```powershell
az ad app federated-credential create `
  --id <app-client-id> `
  --parameters '{
    "name": "github-nordlys-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<owner>/<repo>:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

Configure these GitHub secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `MET_USER_AGENT` for the Bicep `metUserAgent` secure parameter
- `VAPID_PUBLIC_KEY` for the Bicep `vapidPublicKey` secure parameter
- `VAPID_PRIVATE_KEY` for the Bicep `vapidPrivateKey` secure parameter
- `VAPID_SUBJECT` for the Bicep `vapidSubject` secure parameter

Configure these GitHub variables:

- `AZURE_RESOURCE_GROUP` for the target resource group
- `LOCATION` (optional, defaults to `norwayeast`)
- `NAME_PREFIX` (optional, defaults to `nordlys`)
- `ACR_NAME` (optional safety override; if set, it must equal the Bicep-derived registry name)

The workflow derives the ACR name with the same expression as `main.bicep`: `take('${toLower(replace(namePrefix, '-', ''))}acr${uniqueString(resourceGroup().id)}', 50)`.
