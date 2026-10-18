# Google AdSense readiness

Gap analysis of **Nordlys i natt?** against Google AdSense's eligibility rules, program policies
and site review, plus what changed in this repo and what only the account owner can do.
Checked against Google's own help pages on **18 October 2026** (links at the end).

## Summary

| Area | Before (Oct 2026) | Now | Owner action |
|---|---|---|---|
| Original, useful content | One app screen; almost no crawlable text | 23 sourced guides × 2 languages (nb + en), 900–1,500 words each, dated, with sources | Read through before applying |
| Clear navigation | No menu; no internal links | Header nav, breadcrumbs, topic pages, related guides, footer links on every page; the app links to the guides | – |
| About / Contact / Privacy / Terms | Privacy modal only | Full pages in nb + en | Choose a public contact e-mail (optional) |
| Ad-cookie disclosure in privacy policy | Missing ("no ads") | Google's required wording + opt-out links | Update the date when ads go live |
| EU/EEA/UK/CH consent (certified CMP) | None | Plan documented below | Create Google's consent message in AdSense |
| ads.txt | Missing | Placeholder at `/ads.txt`; auto-generated once the publisher ID is set | **Put the line on `salnikov.no/ads.txt` (root domain)** |
| sitemap.xml / robots.txt | Home page only, old domain | Generated: every page, hreflang alternates, new domain | Submit sitemap in Search Console |
| Custom 404 | Every unknown URL returned the app with **200** (soft 404) | Real **404** status with a helpful page; `/x` → `/x/` redirects | – |
| Own domain | `nordlys.isainative.dev` | Repo ready for `nordlys.salnikov.no` | DNS + bind ([CUSTOM-DOMAIN.md](./CUSTOM-DOMAIN.md)) |
| Mobile, speed, broken links | App only | Content pages are JS-free static HTML (~10 KB + one shared CSS); link checker and mobile Playwright tests in CI | – |
| Structured data | WebApplication only | Article, BreadcrumbList, FAQPage, CollectionPage/ItemList, AboutPage/ContactPage | – |
| AdSense code | – | **Not added** (by design). One setting turns it on: see "Switching ads on" | Apply, then set the ID |

## What Google requires (and how the site meets it)

### Eligibility and content

Google: you need **your own content that meets the policies**, and you must be **18 or over**.
Site review checks that you own the site and that it complies with the AdSense Program policies;
it "usually takes a few days, but in some cases can take 2–4 weeks". Common rejection reasons
("low value content", "site not ready") are thin pages, scraped or auto-generated filler, broken
navigation and under-construction sections.

What we did:

- **23 guides** in Norwegian (bokmål) and English. Topics: what the aurora is, its colours, the
  solar wind and Bz, the solar cycle, geomagnetic storms, the Kp index, reading a forecast, clouds,
  apps and data sources, how this site's verdict works, best season, best time of night, Tromsø,
  Lofoten/Vesterålen, Alta/Finnmark, Svalbard, southern Norway, phone and camera photography,
  myths and Sami traditions, safety and clothing, a glossary and an FAQ.
- Each guide is original text with a sources list (NOAA SWPC, MET Norway, UiT/Tromsø Geophysical
  Observatory, UNIS/KHO, Store norske leksikon, Lovdata, Visit Norway, …). Claims that could not be
  verified are marked "ikke verifisert" / "unverified" in the text.
- Every guide has a byline (editorial team + responsible editor), published/updated dates,
  reading time, table of contents, FAQ, related guides and a link back to the app.
- **Language choice.** The site is Norwegian-first (`.no` domain, Norwegian name, `nb` default UI)
  with an English toggle, so the guides are bokmål with English versions, linked with `hreflang`.
  English matters because many aurora visitors to Norway search in English.
- **Review before applying.** The guides were researched and drafted with AI assistance and
  fact-checked against the listed sources. Read them (or have someone read them) and fix anything
  that sounds off. The About page says how the guides are made.

### Navigation and required pages

- Header: Guides · About · language switch · "Check tonight" (the app).
- Footer on every page: Guides, About, Contact, Privacy and cookies, Terms, language switch.
- The app's own footer and a static "Lær mer om nordlyset" block below the app (works without
  JavaScript, so the ads crawler sees it) link to the guides and the info pages.
- Pages: `/om/`, `/kontakt/`, `/personvern/`, `/vilkar/` and `/en/about/`, `/en/contact/`,
  `/en/privacy/`, `/en/terms/`.

### Privacy policy: Google's required disclosures

AdSense's "Required content" policy says the privacy policy must state that third-party vendors,
including Google, use cookies to serve ads based on prior visits; that Google's advertising cookies
let it and its partners serve ads based on visits to this and other sites; and that users can opt
out via Ads Settings (or aboutads.info). The privacy pages now contain exactly that, plus a link
to Google's "How Google uses information from sites or apps that use our services", and say
plainly that **no ads are shown yet**. Update the date and the "no ads today" line when ads go live.

### EU/EEA, UK and Switzerland: certified consent (CMP)

Google requires a **Google-certified CMP integrated with the IAB TCF** when serving
**personalised** ads to users in the EEA and UK (since 16 January 2024) and Switzerland (since
31 July 2024). Traffic without a certified CMP can at most get non-personalised or limited ads.
Norway is in the EEA, so this applies to almost all of this site's visitors.

**Plan (recommended): Google's own CMP, "Privacy & messaging".** It is free, certified, and is
delivered by the same AdSense script, so nothing extra goes into the repo:

1. AdSense → **Privacy & messaging** → **European regulations** → **Create message**.
2. Select the site, languages **Norwegian (Bokmål)** and **English**, keep "Consent" + "Do not
   consent" (and "Manage options") buttons, link the privacy policy
   `https://nordlys.salnikov.no/personvern/`.
3. Publish the message. It starts showing once the AdSense script is on the pages.
4. Add a "Privacy and cookie settings" link to the footer so users can change their choice
   (Google's CMP provides `googlefc.showRevocationMessage()`; ask Tab to add it when ads go live).

Until ads are switched on the site sets **no cookies**, so no banner is shown today.

### ads.txt (important: root domain)

Google: upload ads.txt to the **root directory of your site**, e.g. `example.com/ads.txt`.
Google crawls ads.txt on a subdomain only when the root domain's ads.txt references it with a
`subdomain=` line. AdSense also verifies sites at the root-domain level (you add `salnikov.no`, not
`nordlys.salnikov.no`, to Sites; this follows from Google's root-directory rule and is how the
AdSense "Add site" form behaves; confirm in the form).

So, for `nordlys.salnikov.no`:

1. **Required:** serve `https://salnikov.no/ads.txt` (the root domain, outside this repo) with
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   Today `https://salnikov.no/ads.txt` returns an HTML page (checked 18 Oct 2026), so this needs
   fixing wherever salnikov.no is hosted.
2. **This repo:** `apps/web/public/ads.txt` is a comment-only placeholder. When `ADSENSE_CLIENT` is
   set (below), the build writes the real line to `https://nordlys.salnikov.no/ads.txt`
   automatically. Only needed if you add `subdomain=nordlys.salnikov.no` to the root file.

Never invent the publisher ID; copy it from AdSense → Account → Settings → Account information.

### Sitemap, robots, 404, speed

- `sitemap.xml` and `robots.txt` are generated at build time from `SITE_URL`. The sitemap lists every
  article, topic page, hub and info page with `lastmod` and `hreflang` alternates; robots allows
  everything except `/api/`.
- Unknown URLs now return **HTTP 404** with a real "page not found" page (links to the app and the
  guides). Directory URLs without a trailing slash redirect (301) to the slash version.
- Guides are server-rendered static HTML: no JavaScript, system fonts, one ~7 KB stylesheet, so
  they load fast on mobile. The service worker never intercepts them.
- CI runs a link checker (`pnpm --filter @nordlys/web check:links`) over the built site and
  Playwright tests that open every guide at phone width (no console errors, no horizontal
  overflow, valid JSON-LD).

## Switching ads on (after approval steps)

1. Apply in AdSense with the site `salnikov.no` (see ads.txt note). Use the **meta tag** or
   **ads.txt** verification method if you want to apply before any ad code is live.
2. Set the publisher ID in **one place**: `ADSENSE_CLIENT` in
   `apps/web/scripts/content/site.mjs` (e.g. `'ca-pub-1234567890123456'`), or as a build-time
   environment variable. On the next build every page (the app and all guides) gets, in `<head>`:
   ```html
   <meta name="google-adsense-account" content="ca-pub-…">
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…" crossorigin="anonymous"></script>
   ```
   and `/ads.txt` gets the seller line.
3. In AdSense turn on **Auto ads** for the site (no manual ad units needed), and publish the
   consent message (above).
4. Update `/personvern/` and `/en/privacy/`: date, and replace "no ads today" with the live state.
5. If a Content-Security-Policy is ever added, it must allow Google's ad domains.

## Owner checklist

- [ ] DNS + bind `nordlys.salnikov.no` ([CUSTOM-DOMAIN.md](./CUSTOM-DOMAIN.md)), then turn on the redirect.
- [ ] Read the guides; correct anything you disagree with.
- [ ] Decide on a public contact e-mail (`CONTACT_EMAIL` in `site.mjs`) or keep GitHub + LinkedIn.
- [ ] Search Console: verify, submit the sitemap, change of address from the old domain.
- [ ] AdSense account (18+), add site `salnikov.no`, get the publisher ID.
- [ ] `https://salnikov.no/ads.txt` with the Google line.
- [ ] Privacy & messaging → European regulations message (nb + en) → publish.
- [ ] Set `ADSENSE_CLIENT`, update the privacy pages, deploy, request review.
- [ ] Optional but helpful: let the new domain collect some organic traffic before applying.

## Sources (Google)

- Eligibility requirements: https://support.google.com/adsense/answer/9724
- AdSense Program policies: https://support.google.com/adsense/answer/48182
- Required content (privacy policy wording): https://support.google.com/adsense/answer/1348695
- Connect your site / site review and verification methods: https://support.google.com/adsense/answer/12169212
- Ads.txt guide: https://support.google.com/adsense/answer/12171612
- Ads.txt FAQs (subdomains): https://support.google.com/adsense/answer/9785052
- Consent management requirements for EEA, UK and Switzerland: https://support.google.com/adsense/answer/13554116
