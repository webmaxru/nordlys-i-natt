# Custom domain: moving to nordlys.salnikov.no

The app runs on **Azure Container Apps** (one container serves the web app, the guides and the
API). Today it answers on `nordlys.isainative.dev`; the new home is **`nordlys.salnikov.no`**,
whose DNS lives in **Cloudflare**. This page is the complete checklist.

What is already done in the repo:

- Canonical URLs, Open Graph URLs, `sitemap.xml` and `robots.txt` use `https://nordlys.salnikov.no`
  (one setting: `SITE_URL` in `apps/web/scripts/content/site.mjs`).
- The server can 301-redirect page requests from the old host to the new one. It is **off** until
  you set two repository variables (step 5), so nothing breaks before DNS exists.
- `deploy.yml` keeps **several** custom hostnames bound after every deploy (`CUSTOM_DOMAIN` is now a
  comma-separated list).
- A **Custom domain** workflow (`.github/workflows/custom-domain.yml`) prints the DNS records and
  binds the hostname with a free Azure managed certificate.

## The two DNS records

Read from Azure with the Custom domain workflow (`mode=info`, run 18 Oct 2026):

| Type | Name | Content | Proxy status | TTL |
|---|---|---|---|---|
| `CNAME` | `nordlys` | `nordlys-app-eeyobitljk4fq.mangosand-0af73e50.norwayeast.azurecontainerapps.io` | **DNS only** (grey cloud) | Auto |
| `TXT` | `asuid.nordlys` | `5BFCC063D1C3C26567C5CE072026BB5CE03258385AE700DF177521A0BEF0DA62` | – | Auto |

The `asuid` TXT proves to Azure that you own the name. The value is the Container Apps
environment's verification ID; it only changes if the environment is recreated (re-run the workflow
with `mode=info` to read it again).

### Why "DNS only" (grey cloud) matters

Azure issues and **renews** the free managed certificate by checking that `nordlys.salnikov.no`
is a CNAME to the app. With Cloudflare's proxy on (orange cloud), Cloudflare answers with its own
IP addresses instead of the CNAME, so issuance fails, and a later renewal would fail too. Keep the
record **DNS only**. HTTPS still works end to end: the browser talks directly to Azure, which
serves a valid certificate for `nordlys.salnikov.no` and redirects plain HTTP to HTTPS.

### Cloudflare SSL/TLS mode

The SSL/TLS encryption mode only applies to **proxied** records, so it does not affect this
grey-cloud record. Don't change the zone-wide mode for this; it also affects every other proxied
record on `salnikov.no`.

If you ever want the record proxied (orange cloud, for Cloudflare caching/WAF), the mode must be
**Full (strict)** for this hostname, and Azure needs a certificate it can't renew by itself:
create a Cloudflare **Origin CA** certificate for `nordlys.salnikov.no`, upload it to the
Container Apps environment as a certificate, bind it to the hostname, and add a Cloudflare
**Configuration Rule** (hostname equals `nordlys.salnikov.no` → SSL: Full (strict)). That's more
moving parts for no real gain on a site this size, so the recommendation is grey cloud.

## Status (19 Oct 2026, 23:00 UTC): done

- Both DNS records exist (CNAME DNS-only, `asuid.nordlys` TXT added ~22:42 UTC).
- `nordlys.salnikov.no` is bound to the Container App with a free managed certificate
  (GeoTrust/DigiCert, valid to Apr 2027, renewed by Azure).
- Repository variables: `CUSTOM_DOMAIN=nordlys.salnikov.no,nordlys.isainative.dev`,
  `CANONICAL_HOST=nordlys.salnikov.no`, `LEGACY_HOSTS=nordlys.isainative.dev`.
- The old host 301s page requests to the new one; `/api/*` and the PWA files are not redirected.
- Remaining: Search Console (step 7).

## Step by step

### 1. Cloudflare: add the records (Maxim)

Cloudflare dashboard → **salnikov.no** → **DNS** → **Records** → **Add record**:

1. Type **CNAME**, Name **`nordlys`**, Target
   **`nordlys-app-eeyobitljk4fq.mangosand-0af73e50.norwayeast.azurecontainerapps.io`**,
   Proxy status **DNS only**, TTL Auto → **Save**.
2. Type **TXT**, Name **`asuid.nordlys`**, Content
   **`5BFCC063D1C3C26567C5CE072026BB5CE03258385AE700DF177521A0BEF0DA62`**, TTL Auto → **Save**.

### 2. Check that DNS is visible (1–5 minutes)

```powershell
Resolve-DnsName nordlys.salnikov.no -Type CNAME -Server 1.1.1.1
Resolve-DnsName asuid.nordlys.salnikov.no -Type TXT -Server 1.1.1.1
```

The CNAME must show the `azurecontainerapps.io` name (not Cloudflare IPs) and the TXT the value
above. At this point `https://nordlys.salnikov.no` still shows a certificate warning; that's
expected until step 3.

### 3. Bind the hostname in Azure

GitHub → **Actions** → **Custom domain** → **Run workflow** → hostname `nordlys.salnikov.no`,
mode **bind**. The workflow re-checks both records, adds the hostname to the Container App and
binds a free managed certificate (CNAME validation). Issuing the certificate usually takes a few
minutes.

Portal alternative: Container App → **Custom domains** → **Add custom domain** → *Managed
certificate* → domain `nordlys.salnikov.no` → **Validate** → **Add**.

### 4. Keep it bound on every deploy

GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables**:

| Variable | Value |
|---|---|
| `CUSTOM_DOMAIN` | `nordlys.salnikov.no,nordlys.isainative.dev` |

(A Bicep deploy resets the app's custom domains; the deploy workflow re-binds every hostname in
this list.)

### 5. Turn on the redirect from the old domain

Same Variables page:

| Variable | Value |
|---|---|
| `CANONICAL_HOST` | `nordlys.salnikov.no` |
| `LEGACY_HOSTS` | `nordlys.isainative.dev` |

Then GitHub → **Actions** → **Deploy** → **Run workflow** (variables only take effect on the next
deploy). From then on, page requests on the old host get a **301** to the same path on the new
host. `/api/*` and the service-worker files are deliberately **not** redirected, so anyone who
installed the PWA from the old address keeps a working app.

Keep the old hostname's DNS record and binding for at least a year so links and bookmarks keep
redirecting.

### 6. Verify

```powershell
curl.exe -sI https://nordlys.salnikov.no/              # 200
curl.exe -sI https://nordlys.salnikov.no/artikler/     # 200
curl.exe -sI https://nordlys.isainative.dev/artikler/  # 301 -> https://nordlys.salnikov.no/artikler/
curl.exe -s  https://nordlys.isainative.dev/api/health # 200 (API is not redirected)
```

And open `https://nordlys.salnikov.no` in a browser: padlock, no warnings.

### 7. Tell Google

1. [Google Search Console](https://search.google.com/search-console) → add a **Domain** property
   for `salnikov.no` (verify with the TXT record it gives you, added in Cloudflare) or a URL-prefix
   property for `https://nordlys.salnikov.no/`.
2. Submit `https://nordlys.salnikov.no/sitemap.xml` under **Sitemaps**.
3. If the old domain is verified in Search Console too, use **Settings → Change of address** on the
   old property once the 301s are live.

## Changing the domain again later

1. `SITE_URL` in `apps/web/scripts/content/site.mjs` (or the `SITE_URL` env var at build time).
2. Repeat steps 1–6 with the new name; add the old one to `LEGACY_HOSTS`.
