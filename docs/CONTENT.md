# Content section (guides, info pages, sitemap)

Besides the app (`/`), the site has a static content section: aurora guides in Norwegian and
English plus About/Contact/Privacy/Terms. It is plain, JavaScript-free HTML generated at build
time from Markdown, served by the same Fastify server.

## Where things live

```
apps/web/content/
├─ articles/nb/<slug>.md     # Norwegian guides (bokmål)
├─ articles/en/<slug>.md     # English versions (same `id`)
└─ pages/{nb,en}/*.md        # about / contact / privacy / terms
apps/web/scripts/content/
├─ site.mjs                  # SITE_URL, editor, contact e-mail, ADSENSE_CLIENT, routes, categories, UI strings
└─ build.mjs                 # Markdown -> HTML, topic pages, hubs, 404, sitemap.xml, robots.txt
apps/web/scripts/check-links.mjs   # link / anchor / JSON-LD checker for dist/
apps/web/public/content.css        # styles for the content pages
```

`vite build` runs the generator (Vite plugin in `vite.config.ts`), so `pnpm --filter @nordlys/web build`
produces the app **and** the content in `apps/web/dist/`. The plugin also fills `__SITE_URL__` in
`index.html` and injects the static "Lær mer om nordlyset" links block below the app.

## URLs

| Page | Norwegian | English |
|---|---|---|
| Guides hub | `/artikler/` | `/en/guides/` |
| Guide | `/artikler/<slug>/` | `/en/guides/<slug>/` |
| Topic | `/artikler/tema/<topic>/` | `/en/guides/topic/<topic>/` |
| Info pages | `/om/` `/kontakt/` `/personvern/` `/vilkar/` | `/en/about/` `/en/contact/` `/en/privacy/` `/en/terms/` |
| Not found | `/404.html` (served with status 404 for any unknown URL) | |

## Writing or editing a guide

Front matter (YAML):

```yaml
---
id: kp-index                 # same in nb and en; used for links and hreflang pairing
lang: nb
slug: kp-indeksen            # must equal the file name
title: "Kp-indeksen forklart: …"          # <= 70 chars
description: "…"             # 120-158 chars (meta description)
category: forecast           # science | forecast | where | photo | practical | reference
published: 2026-10-18
updated: 2026-10-18          # bump when you change facts
summary: "…"                 # teaser on listing pages
faq:                         # optional; becomes a FAQ block + FAQPage JSON-LD
  - q: "…"
    a: "…"
sources:                     # shown as "Kilder" / "Sources"
  - title: "…"
    publisher: "…"
    url: "https://…"
---
```

Body: Markdown starting at `##` (the title is the H1). Special links:

- `[tekst](id:kp-index)` → the guide with that id in the same language
- `[tekst](page:privacy)` → about | contact | privacy | terms
- `[tekst](app:)` → the forecast app

Rules of thumb: own words only, cite sources, mark anything unconfirmed as "(ikke verifisert)" /
"(unverified)", no hotlinked images.

## Checks

```bash
pnpm --filter @nordlys/web check:content   # front matter, slugs, descriptions, internal links
pnpm --filter @nordlys/web build           # fails on any content problem
pnpm --filter @nordlys/web check:links     # every internal href/src, #anchors, JSON-LD in dist/
pnpm --filter @nordlys/web test:e2e        # includes tests/content.spec.ts (mobile, every guide)
```

## Structured data

Each guide: `Article` (headline, dates, editor, publisher, citations), `BreadcrumbList`, and
`FAQPage` when it has FAQ items. Hubs and topic pages: `CollectionPage` + `ItemList`. Info pages:
`AboutPage` / `ContactPage` / `WebPage`.

## Settings (`site.mjs`)

| Setting | Purpose |
|---|---|
| `SITE_URL` | Absolute base for canonical, OG, sitemap, robots (`SITE_URL` env overrides) |
| `EDITOR` | Name + profile link in bylines and `Article.editor` |
| `CONTACT_EMAIL` | Shown on the contact page when set (empty = GitHub + LinkedIn only) |
| `ADSENSE_CLIENT` | Empty = no ads. See [ADSENSE-READINESS.md](./ADSENSE-READINESS.md) |
