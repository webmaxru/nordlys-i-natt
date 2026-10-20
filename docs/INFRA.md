# Infrastructure: from an empty Azure subscription to a live site

Everything the site runs on is in `infra/` (Bicep) and is deployed by
`.github/workflows/deploy.yml` on every push to `main` (and on demand from the Actions tab).
This page is the one place to start from; details live in
[deployment.md](deployment.md), [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md),
[ALERTS.md](ALERTS.md) and [MOBILE-RELEASE.md](MOBILE-RELEASE.md).

## What gets created

All in one resource group (default `rg-nordlys`, region `norwayeast`). Names end in a
stable suffix derived from the resource group ID.

| Resource | Bicep | Purpose | Cost (estimate, Oct 2026) |
|---|---|---|---|
| Log Analytics + Application Insights | `modules/monitoring.bicep` | logs, telemetry | first 5 GB/month free, then about $2.8/GB |
| Storage account (Table Storage) | `modules/storage.bicep` | tables `subscriptions` (browser push), `emailsubs` (e-mail alerts), `devices` (app push) | well under $1/month |
| Container Apps environment + app `*-app-*` | `modules/containerapp.bicep` | the website and the API, scale to zero | inside the monthly free grant at today's traffic |
| Container Apps job `*-job-*` | `modules/job.bicep` | the alert scheduler, every 20 minutes (`*/20 * * * *`) | a few cents/month |
| Email Communication Service `*-email-*` + domain + sender | `modules/email.bicep` | e-mail alerts from `nordlys@varsel.salnikov.no` | free; e-mail is billed per message (below) |
| Communication Services `*-acs-*` | `modules/email.bicep` | sends the e-mail | about $0.25 per 1,000 e-mails (+ $0.12/GB) |
| Managed certificates + custom domains | `custom-domain.yml` workflow, re-bound by `deploy.yml` | `nordlys.salnikov.no` | free |

Container images live in GHCR (`ghcr.io/webmaxru/nordlys-i-natt`), not in an Azure registry.
Native app push goes straight to Google FCM and Apple APNs (both free); no Notification Hubs.

Rough total today: **$0–5/month**, plus e-mail at about 2.7 NOK per 1,000 messages.

## Settings (GitHub → Settings → Secrets and variables → Actions)

Secrets (values never live in the repo):

| Secret | Needed for |
|---|---|
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | OIDC login of the deploy workflow |
| `GHCR_PULL_TOKEN` | classic PAT with `read:packages`, so Container Apps can pull the image |
| `MET_USER_AGENT` | identifying User-Agent for api.met.no |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | browser push |
| `FCM_SERVICE_ACCOUNT_JSON` (optional) | Android push in the app |
| `APNS_KEY_P8` (optional) | iOS push in the app |

Variables:

| Variable | Value today | Effect |
|---|---|---|
| `AZURE_RESOURCE_GROUP` | `rg-nordlys` | target resource group |
| `LOCATION`, `NAME_PREFIX` | unset (`norwayeast`, `nordlys`) | region, name prefix |
| `CUSTOM_DOMAIN` | `nordlys.salnikov.no,nordlys.isainative.dev` | hostnames re-bound after each deploy |
| `CANONICAL_HOST`, `LEGACY_HOSTS` | `nordlys.salnikov.no`, `nordlys.isainative.dev` | 301 from the old host, links in e-mails |
| `EMAIL_DOMAIN` | `varsel.salnikov.no` | creates ACS Email; e-mail goes live once the domain is verified |
| `EMAIL_REPLY_TO` (optional) | unset | Reply-To on alert e-mails |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` (optional) | unset | iOS push |

## From an empty subscription (Windows PowerShell 5.1)

You need the [Azure CLI](https://aka.ms/installazurecliwindows) and the
[GitHub CLI](https://cli.github.com/). Run from a clone of the repo. Lines ending in a backtick
continue on the next line.

```powershell
# 0) Sign in
az login
az account set --subscription "<subscription name or id>"
gh auth login

# 1) Resource providers (once per subscription)
foreach ($ns in "Microsoft.App","Microsoft.OperationalInsights","Microsoft.Insights","Microsoft.Storage","Microsoft.Communication") { az provider register --namespace $ns --wait }

# 2) Resource group
$RG = "rg-nordlys"
az group create --name $RG --location norwayeast

# 3) An identity for GitHub Actions (OIDC, no stored password)
$Repo  = "webmaxru/nordlys-i-natt"
$AppId = az ad app create --display-name "nordlys-deploy" --query appId -o tsv
az ad sp create --id $AppId | Out-Null
$Sub    = az account show --query id -o tsv
$Tenant = az account show --query tenantId -o tsv
az role assignment create --assignee $AppId --role Contributor --scope "/subscriptions/$Sub/resourceGroups/$RG"
'{"name":"main","issuer":"https://token.actions.githubusercontent.com","subject":"repo:webmaxru/nordlys-i-natt:ref:refs/heads/main","audiences":["api://AzureADTokenExchange"]}' | Out-File -Encoding ascii fic.json
az ad app federated-credential create --id $AppId --parameters fic.json
Remove-Item fic.json

# 4) Secrets and variables
gh secret set AZURE_CLIENT_ID       -R $Repo --body $AppId
gh secret set AZURE_TENANT_ID       -R $Repo --body $Tenant
gh secret set AZURE_SUBSCRIPTION_ID -R $Repo --body $Sub
gh secret set GHCR_PULL_TOKEN       -R $Repo     # paste a classic PAT with read:packages
gh secret set MET_USER_AGENT        -R $Repo --body "NordlysINatt/1.0 (you@example.com)"
npx web-push generate-vapid-keys                 # then:
gh secret set VAPID_PUBLIC_KEY      -R $Repo
gh secret set VAPID_PRIVATE_KEY     -R $Repo
gh secret set VAPID_SUBJECT         -R $Repo --body "mailto:you@example.com"
gh variable set AZURE_RESOURCE_GROUP -R $Repo --body $RG

# 5) First deploy (builds the image, deploys all Bicep)
gh workflow run deploy.yml -R $Repo
gh run watch -R $Repo
```

The site is then live on the Container App's own `*.azurecontainerapps.io` address (printed in
the run log). Next: the custom domain ([CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md)) and e-mail (below).

The `Contributor` role on the resource group is enough for every deploy. Step 1 registers the
providers once, because that needs rights on the whole subscription.

## E-mail alerts (Azure Communication Services)

Sender: **`nordlys@varsel.salnikov.no`** ("Nordlys i natt").

The subdomain is used because `nordlys.salnikov.no` is a CNAME to the Container App, and a
CNAME cannot carry the TXT records e-mail needs. The root `salnikov.no` is left alone (it has
no mail setup, and a separate subdomain keeps the alert mail's reputation apart). A custom domain
also lifts ACS's sending limit: an Azure-managed `*.azurecomm.net` domain is capped at 5 e-mails
a minute and 10 an hour, which is too low for an alert that goes to every subscriber within the same
afternoon. A custom domain starts at 30/min and 100/h, and can be raised with a support request.
The scheduler paces itself to stay under it (see `EMAIL_SEND_INTERVAL_MS`, `EMAIL_MAX_PER_RUN`).

How it switches on:

1. `EMAIL_DOMAIN=varsel.salnikov.no` is set (done). The next deploy creates the Email service,
   the domain and the sender, and prints the DNS records in the run summary.
2. Add the DNS records below in Cloudflare (zone `salnikov.no`).
3. Run the deploy workflow once more (Actions → Deploy → Run workflow, or
   `gh workflow run deploy.yml -R webmaxru/nordlys-i-natt`). It asks Azure to verify the records,
   waits for the result, links the domain and starts the app with `EMAIL_ENABLED=true`.
   If a record is not visible yet, run it again later. Nothing breaks in the meantime: the site
   says e-mail alerts are "not switched on yet".

### DNS records for varsel.salnikov.no (Cloudflare, zone salnikov.no)

All **DNS only** (grey cloud). A proxied (orange) CNAME breaks DKIM.

| Type | Name (in Cloudflare) | Content | TTL | What it is |
|---|---|---|---|---|
| TXT | `varsel` | `ms-domain-verification=4bb5751b-52c1-457f-b5ba-457ab856ed3f` | Auto | proves the domain to Azure |
| TXT | `varsel` | `v=spf1 include:spf.protection.outlook.com -all` | Auto | SPF |
| CNAME | `selector1-azurecomm-prod-net._domainkey.varsel` | `selector1-azurecomm-prod-net._domainkey.azurecomm.net` | Auto | DKIM key 1 |
| CNAME | `selector2-azurecomm-prod-net._domainkey.varsel` | `selector2-azurecomm-prod-net._domainkey.azurecomm.net` | Auto | DKIM key 2 |
| TXT | `_dmarc.varsel` | `v=DMARC1; p=none` | Auto | DMARC (Gmail/Yahoo expect one; `p=none` only reports) |

The two TXT records on `varsel` are separate records with the same name. The values are this
deployment's own: a fresh environment prints its own `ms-domain-verification` value in the
deploy summary.

Check from PowerShell that they are visible:

```powershell
Resolve-DnsName varsel.salnikov.no -Type TXT
Resolve-DnsName selector1-azurecomm-prod-net._domainkey.varsel.salnikov.no -Type CNAME
Resolve-DnsName selector2-azurecomm-prod-net._domainkey.varsel.salnikov.no -Type CNAME
Resolve-DnsName _dmarc.varsel.salnikov.no -Type TXT
```

And the state in Azure:

```powershell
az extension add --name communication --upgrade
$Svc = az resource list -g rg-nordlys --resource-type Microsoft.Communication/emailServices --query "[0].name" -o tsv
az communication email domain show -g rg-nordlys --email-service-name $Svc --domain-name varsel.salnikov.no --query verificationStates
```

Once live, `https://nordlys.salnikov.no/api/alerts/status` shows `"email":{"enabled":true}`.

## Native app push

Set the `FCM_SERVICE_ACCOUNT_JSON` secret (Android) and/or `APNS_KEY_P8` + the `APNS_*`
variables (iOS), then run the deploy workflow. The values reach the app and the scheduler as
Container Apps secrets, and `/api/alerts/status` shows `"app":{"android":true,"ios":true}`.
Getting the keys: [MOBILE-RELEASE.md](MOBILE-RELEASE.md).

## Checking a change before it ships

- Every push and PR runs **Validate Bicep** in CI (`az bicep build` + `az bicep lint` over
  `infra/main.bicep` and all modules).
- What a deploy would change in the live resource group (read-only):

```powershell
az deployment group what-if -g rg-nordlys -f infra/main.bicep -p "@infra/main.parameters.json" `
  registryPassword="<PAT>" metUserAgent="<UA>" vapidPublicKey="<pub>" vapidPrivateKey="<priv>" vapidSubject="mailto:you@example.com" `
  canonicalHost=nordlys.salnikov.no legacyHosts=nordlys.isainative.dev emailDomain=varsel.salnikov.no
```

## Tearing it down

`az group delete --name rg-nordlys` removes everything above (and every subscriber). The
custom-domain DNS records in Cloudflare stay until you delete them.
