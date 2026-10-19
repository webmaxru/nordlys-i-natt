// Static content generator for Nordlys i natt?
//
// Reads Markdown from apps/web/content/{articles,pages}/{nb,en}/*.md and writes plain,
// JavaScript-free HTML pages (articles, topic pages, hubs, info pages, 404), sitemap.xml and
// robots.txt into the Vite output directory. Used by the Vite plugin in vite.config.ts and by
// `node scripts/content/build.mjs --check` (validation only).
//
// Link forms inside Markdown:
//   [text](id:kp-index)   -> the article with that id, in the same language
//   [text](page:privacy)  -> an info page (about | contact | privacy | terms), same language
//   [text](app:)          -> the forecast app on the home page

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import YAML from 'yaml';
import {
  SITE_URL,
  SITE_NAME,
  EDITOR,
  CONTACT_EMAIL,
  ADSENSE_CLIENT,
  ARTICLE_ORDER,
  LANGS,
  ROUTES,
  CATEGORIES,
  CATEGORY_INTRO,
  UI,
  GITHUB_URL,
} from './site.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const CONTENT_DIR = resolve(here, '../../content');

/**
 * Extra tags injected into every generated page's <head>. The SPA's index.html carries the
 * same agentprose tag literally (keep them identical).
 */
export const EXTRA_HEAD = [
  // agentprose: makes the pages readable/usable for AI agents (WebMCP). Public key.
  '<script src="https://agentprose.cloud/v/0/agentprose.min.js" data-key="pk_WEUJLvFOv75ICLN_" defer></script>',
];

/** Tags for <head> that depend on site settings (AdSense, when configured). */
export function headTags({ includeExtra = true } = {}) {
  const tags = includeExtra ? [...EXTRA_HEAD] : [];
  if (ADSENSE_CLIENT) {
    if (!/^ca-pub-\d{10,20}$/.test(ADSENSE_CLIENT)) {
      throw new Error(
        `ADSENSE_CLIENT must look like ca-pub-1234567890123456, got "${ADSENSE_CLIENT}"`,
      );
    }
    tags.push(`<meta name="google-adsense-account" content="${ADSENSE_CLIENT}">`);
    tags.push(
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`,
    );
  }
  return tags;
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const abs = (path) => SITE_URL + path;

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFile(file) {
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const data = YAML.parse(m[1]) ?? {};
  return { data, body: m[2].trim(), file };
}

const toDate = (v) => (v instanceof Date ? v : new Date(`${String(v).slice(0, 10)}T00:00:00Z`));
const isoDate = (d) => toDate(d).toISOString().slice(0, 10);

export function wordCount(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Load and validate all content. Returns { articles, pages, problems }. */
export function loadContent(dir = CONTENT_DIR) {
  const problems = [];
  const articles = [];
  const pages = [];
  for (const lang of LANGS) {
    const adir = join(dir, 'articles', lang);
    if (existsSync(adir)) {
      for (const f of readdirSync(adir)
        .filter((n) => n.endsWith('.md'))
        .sort()) {
        try {
          const { data, body, file } = parseFile(join(adir, f));
          for (const k of ['id', 'slug', 'title', 'description', 'category', 'published']) {
            if (!data[k]) problems.push(`${file}: missing "${k}"`);
          }
          if (data.lang && data.lang !== lang)
            problems.push(`${file}: lang "${data.lang}" but folder "${lang}"`);
          if (data.slug && `${data.slug}.md` !== f)
            problems.push(`${file}: slug "${data.slug}" does not match file name`);
          if (!CATEGORIES.some((c) => c.id === data.category))
            problems.push(`${file}: unknown category "${data.category}"`);
          const dl = String(data.description ?? '').length;
          if (dl < 70 || dl > 170)
            problems.push(`${file}: description is ${dl} chars (want 70-170)`);
          articles.push({
            ...data,
            lang,
            body,
            file,
            faq: Array.isArray(data.faq) ? data.faq : [],
            sources: Array.isArray(data.sources) ? data.sources : [],
            published: toDate(data.published),
            updated: toDate(data.updated || data.published),
            words: wordCount(body),
          });
        } catch (e) {
          problems.push(String(e.message || e));
        }
      }
    }
    const pdir = join(dir, 'pages', lang);
    if (existsSync(pdir)) {
      for (const f of readdirSync(pdir)
        .filter((n) => n.endsWith('.md'))
        .sort()) {
        try {
          const { data, body, file } = parseFile(join(pdir, f));
          if (!ROUTES[lang].page[data.key])
            problems.push(`${file}: unknown page key "${data.key}"`);
          pages.push({ ...data, lang, body, file, updated: toDate(data.updated || '2026-10-18') });
        } catch (e) {
          problems.push(String(e.message || e));
        }
      }
    }
  }
  const rank = (id) => {
    const i = ARTICLE_ORDER.indexOf(id);
    return i === -1 ? ARTICLE_ORDER.length : i;
  };
  articles.sort((a, b) => rank(a.id) - rank(b.id) || String(a.id).localeCompare(String(b.id)));
  // ids unique per language
  for (const lang of LANGS) {
    const seen = new Set();
    for (const a of articles.filter((x) => x.lang === lang)) {
      if (seen.has(a.id)) problems.push(`duplicate id "${a.id}" in ${lang}`);
      seen.add(a.id);
    }
  }
  // links
  const ids = (lang) => new Set(articles.filter((a) => a.lang === lang).map((a) => a.id));
  for (const doc of [...articles, ...pages]) {
    const known = ids(doc.lang);
    for (const m of doc.body.matchAll(/\]\((id|page):([^)\s]*)\)/g)) {
      if (m[1] === 'id' && !known.has(m[2]))
        problems.push(`${doc.file}: link to unknown article id "${m[2]}"`);
      if (m[1] === 'page' && !ROUTES[doc.lang].page[m[2]])
        problems.push(`${doc.file}: link to unknown page "${m[2]}"`);
    }
  }
  return { articles, pages, problems };
}

function categoryOf(id) {
  return CATEGORIES.find((c) => c.id === id);
}

function articleUrl(a) {
  return ROUTES[a.lang].article(a.slug);
}

function counterpart(list, doc, key = 'id') {
  return list.find((x) => x.lang !== doc.lang && x[key] === doc[key]);
}

/** Markdown -> HTML with internal-link resolution, heading ids and safe external links. */
function renderMarkdown(md, lang, articles) {
  const byId = new Map(articles.filter((a) => a.lang === lang).map((a) => [a.id, a]));
  const headings = [];
  const used = new Set();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        let id = slugify(text) || `h-${headings.length + 1}`;
        while (used.has(id)) id += '-2';
        used.add(id);
        if (depth === 2) headings.push({ id, text });
        // Body headings start at h2; demote any stray h1.
        const level = Math.max(2, depth);
        return `<h${level} id="${id}">${text}</h${level}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        let url = href;
        let external = false;
        if (href.startsWith('id:')) {
          const a = byId.get(href.slice(3));
          url = a ? articleUrl(a) : '#';
        } else if (href.startsWith('page:')) {
          url = ROUTES[lang].page[href.slice(5)] ?? '#';
        } else if (href.startsWith('app:')) {
          url = lang === 'en' ? '/?lang=en' : '/';
        } else if (/^https?:\/\//.test(href)) {
          external = true;
        }
        const t = title ? ` title="${esc(title)}"` : '';
        const rel = external ? ' rel="noopener noreferrer" target="_blank"' : '';
        return `<a href="${esc(url)}"${t}${rel}>${text}</a>`;
      },
    },
  });
  let html = marked.parse(md);
  let tableNo = 0;
  html = html
    // Focusable + labelled so keyboard users can scroll wide tables (axe: scrollable-region-focusable).
    .replace(/<table>/g, () => {
      tableNo += 1;
      const label = lang === 'en' ? `Table ${tableNo}` : `Tabell ${tableNo}`;
      return `<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table>`;
    })
    .replace(/<\/table>/g, '</table></div>');
  return { html, headings };
}

/** Every character as an HTML entity: same link for people, a little less food for scrapers. */
function entities(str) {
  return [...str].map((c) => `&#${c.codePointAt(0)};`).join('');
}

/** mailto link for CONTACT_EMAIL, entity-encoded. */
function emailLink() {
  return `<a href="${entities(`mailto:${CONTACT_EMAIL}`)}">${entities(CONTACT_EMAIL)}</a>`;
}

function jsonLd(obj) {
  // Escape "<" so a string can never close the script element.
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

const ORG = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
  ...(CONTACT_EMAIL
    ? {
        email: CONTACT_EMAIL,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: CONTACT_EMAIL,
          availableLanguage: ['nb', 'en'],
        },
      }
    : {}),
};

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: abs(it.url) } : {}),
    })),
  };
}

function layout({
  lang,
  title,
  description,
  path,
  alternates,
  ogType = 'website',
  ld = [],
  body,
  crumbs,
  noindex = false,
  extraMeta = '',
}) {
  const ui = UI[lang];
  const other = lang === 'nb' ? 'en' : 'nb';
  const altLinks = [];
  if (alternates) {
    for (const [l, p] of Object.entries(alternates))
      altLinks.push(`<link rel="alternate" hreflang="${l}" href="${abs(p)}">`);
    if (alternates.nb)
      altLinks.push(`<link rel="alternate" hreflang="x-default" href="${abs(alternates.nb)}">`);
  }
  const switchHref = alternates?.[other] ?? ROUTES[other].hub;
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const crumbHtml = crumbs
    ? `<nav class="crumbs" aria-label="${ui.breadcrumb}"><ol>${crumbs
        .map((c, i) =>
          c.url && i < crumbs.length - 1
            ? `<li><a href="${esc(c.url)}">${esc(c.name)}</a></li>`
            : `<li aria-current="page">${esc(c.name)}</li>`,
        )
        .join('')}</ol></nav>`
    : '';
  const p = ROUTES[lang].page;
  return `<!doctype html>
<html lang="${ui.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
${noindex ? '' : `<link rel="canonical" href="${abs(path)}">`}
${altLinks.join('\n')}
<meta name="theme-color" content="#0b1020">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="stylesheet" href="/content.css">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(path)}">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(SITE_NAME)}">
<meta property="og:locale" content="${ui.locale}">
<meta property="og:locale:alternate" content="${UI[other].locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">
${extraMeta}${ld.map(jsonLd).join('\n')}
${headTags().join('\n')}
</head>
<body>
<a class="skip" href="#main">${ui.skip}</a>
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="${lang === 'en' ? '/?lang=en' : '/'}"><img src="/icon.svg" width="28" height="28" alt=""> <span>${SITE_NAME}</span></a>
    <nav class="site-nav" aria-label="${lang === 'en' ? 'Main' : 'Hovedmeny'}">
      <a href="${ROUTES[lang].hub}">${ui.navArticles}</a>
      <a href="${p.about}">${ui.navAbout}</a>
      <a href="${esc(switchHref)}" hreflang="${other}" lang="${other}" aria-label="${ui.otherLangLabel}">${ui.otherLang}</a>
      <a class="nav-cta" href="${lang === 'en' ? '/?lang=en' : '/'}">${ui.navApp}</a>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
${crumbHtml}
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <nav class="footer-links" aria-label="${lang === 'en' ? 'Site' : 'Nettsted'}">
      <a href="${ROUTES[lang].hub}">${ui.navArticles}</a>
      <a href="${p.about}">${ui.footerAbout}</a>
      <a href="${p.contact}">${ui.footerContact}</a>
      <a href="${p.privacy}">${ui.footerPrivacy}</a>
      <a href="${p.terms}">${ui.footerTerms}</a>
      <a href="${esc(switchHref)}" hreflang="${other}" lang="${other}">${ui.otherLang}</a>
    </nav>
    <p>${ui.footerData}</p>
    <p>${ui.footerMadeBy} <a href="${EDITOR.url}" rel="noopener noreferrer">${EDITOR.name}</a> · <a href="${GITHUB_URL}" rel="noopener noreferrer">GitHub</a> · © ${new Date().getUTCFullYear()} ${SITE_NAME}</p>
  </div>
</footer>
</body>
</html>
`;
}

function cta(lang) {
  const ui = UI[lang];
  return `<aside class="cta"><h2>${ui.ctaTitle}</h2><p>${ui.ctaBody}</p><a class="button" href="${lang === 'en' ? '/?lang=en' : '/'}">${ui.ctaButton} →</a></aside>`;
}

function card(a) {
  const ui = UI[a.lang];
  const mins = Math.max(1, Math.round(a.words / 200));
  return `<li class="card"><a href="${articleUrl(a)}"><h3>${esc(a.title)}</h3><p>${esc(a.summary || a.description)}</p><span class="meta">${mins} ${ui.minRead}</span></a></li>`;
}

function renderArticle(a, all) {
  const ui = UI[a.lang];
  const cat = categoryOf(a.category);
  const other = counterpart(all, a);
  const path = articleUrl(a);
  const alternates = { [a.lang]: path, ...(other ? { [other.lang]: articleUrl(other) } : {}) };
  const { html, headings } = renderMarkdown(a.body, a.lang, all);
  const mins = Math.max(1, Math.round(a.words / 200));
  const crumbs = [
    { name: ui.home, url: a.lang === 'en' ? '/?lang=en' : '/' },
    { name: ui.navArticles, url: ROUTES[a.lang].hub },
    { name: cat[a.lang].name, url: ROUTES[a.lang].category(cat[a.lang].slug) },
    { name: a.title },
  ];
  const related = (a.related || [])
    .map((id) => all.find((x) => x.lang === a.lang && x.id === id))
    .filter(Boolean);
  for (const x of all.filter(
    (x) => x.lang === a.lang && x.category === a.category && x.id !== a.id,
  )) {
    if (related.length >= 4) break;
    if (!related.includes(x)) related.push(x);
  }
  const toc =
    headings.length >= 3
      ? `<nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h">${ui.toc}</h2><ol>${headings.map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`).join('')}</ol></nav>`
      : '';
  const sources = a.sources.length
    ? `<section class="sources" aria-labelledby="sources-h"><h2 id="sources-h">${ui.sources}</h2><p class="muted">${ui.sourcesNote}</p><ol>${a.sources
        .map(
          (s) =>
            `<li><a href="${esc(s.url)}" rel="noopener noreferrer" target="_blank">${esc(s.title)}</a>${s.publisher ? ` – ${esc(s.publisher)}` : ''}</li>`,
        )
        .join('')}</ol></section>`
    : '';
  const datesLine = `${ui.published} <time datetime="${isoDate(a.published)}">${ui.dateFmt(a.published)}</time>${
    isoDate(a.updated) !== isoDate(a.published)
      ? ` · ${ui.updated} <time datetime="${isoDate(a.updated)}">${ui.dateFmt(a.updated)}</time>`
      : ''
  } · ${mins} ${ui.minRead}`;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.title,
      description: a.description,
      inLanguage: a.lang === 'nb' ? 'nb-NO' : 'en',
      datePublished: isoDate(a.published),
      dateModified: isoDate(a.updated),
      mainEntityOfPage: { '@type': 'WebPage', '@id': abs(path) },
      url: abs(path),
      image: [`${SITE_URL}/og-image.png`],
      articleSection: cat[a.lang].name,
      wordCount: a.words,
      author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
      editor: { '@type': 'Person', name: EDITOR.name, url: EDITOR.url },
      publisher: ORG,
      ...(a.sources.length ? { citation: a.sources.map((s) => s.url) } : {}),
    },
    breadcrumbLd(crumbs.map((c, i) => (i === crumbs.length - 1 ? { name: c.name, url: path } : c))),
  ];
  if (a.faq.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: a.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  const faqHtml =
    a.faq.length && a.id !== 'faq'
      ? `<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">${ui.faqTitle}</h2>${a.faq
          .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
          .join('')}</section>`
      : '';
  const body = `<article class="article">
<header class="article-head">
<p class="eyebrow"><a href="${ROUTES[a.lang].category(cat[a.lang].slug)}">${esc(cat[a.lang].name)}</a></p>
<h1>${esc(a.title)}</h1>
<p class="byline">${ui.by} ${ui.editorial} · ${ui.editor}: <a href="${EDITOR.url}" rel="noopener noreferrer">${EDITOR.name}</a></p>
<p class="dates">${datesLine}</p>
</header>
${toc}
<div class="prose">
${html}
</div>
${faqHtml}
${cta(a.lang)}
${sources}
</article>
${related.length ? `<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">${ui.related}</h2><ul class="cards">${related.map(card).join('')}</ul></section>` : ''}`;
  return {
    path,
    html: layout({
      lang: a.lang,
      title: a.title,
      description: a.description,
      path,
      alternates,
      ogType: 'article',
      ld,
      body,
      crumbs,
      extraMeta: `<meta property="article:published_time" content="${isoDate(a.published)}">\n<meta property="article:modified_time" content="${isoDate(a.updated)}">\n<meta property="article:section" content="${esc(cat[a.lang].name)}">\n<meta name="author" content="${esc(SITE_NAME)}">\n`,
    }),
    lastmod: isoDate(a.updated),
    alternates,
  };
}

function itemListLd(name, path, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: abs(path),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: abs(articleUrl(a)),
        name: a.title,
      })),
    },
  };
}

function renderHub(lang, all) {
  const ui = UI[lang];
  const path = ROUTES[lang].hub;
  const other = lang === 'nb' ? 'en' : 'nb';
  const mine = all.filter((a) => a.lang === lang);
  const sections = CATEGORIES.map((c) => {
    const items = mine.filter((a) => a.category === c.id);
    if (!items.length) return '';
    return `<section class="topic" aria-labelledby="t-${c.id}"><h2 id="t-${c.id}"><a href="${ROUTES[lang].category(c[lang].slug)}">${esc(c[lang].name)}</a></h2><p class="muted">${esc(CATEGORY_INTRO[c.id][lang])}</p><ul class="cards">${items.map(card).join('')}</ul></section>`;
  }).join('\n');
  const crumbs = [
    { name: ui.home, url: lang === 'en' ? '/?lang=en' : '/' },
    { name: ui.navArticles },
  ];
  const body = `<header class="page-head"><h1>${ui.hubTitle}</h1><p class="lead">${ui.hubIntro}</p></header>\n${sections}\n${cta(lang)}`;
  return {
    path,
    html: layout({
      lang,
      title: ui.hubTitle,
      description: ui.hubIntro,
      path,
      alternates: { [lang]: path, [other]: ROUTES[other].hub },
      ld: [
        itemListLd(ui.hubTitle, path, mine),
        breadcrumbLd([crumbs[0], { name: ui.navArticles, url: path }]),
      ],
      body,
      crumbs,
    }),
    lastmod: isoDate(new Date(Math.max(...mine.map((a) => a.updated.getTime())))),
    alternates: { [lang]: path, [other]: ROUTES[other].hub },
  };
}

function renderCategory(lang, c, all) {
  const ui = UI[lang];
  const other = lang === 'nb' ? 'en' : 'nb';
  const items = all.filter((a) => a.lang === lang && a.category === c.id);
  const path = ROUTES[lang].category(c[lang].slug);
  const alternates = { [lang]: path, [other]: ROUTES[other].category(c[other].slug) };
  const crumbs = [
    { name: ui.home, url: lang === 'en' ? '/?lang=en' : '/' },
    { name: ui.navArticles, url: ROUTES[lang].hub },
    { name: c[lang].name },
  ];
  const desc = CATEGORY_INTRO[c.id][lang];
  const body = `<header class="page-head"><p class="eyebrow">${ui.articlesCount(items.length)}</p><h1>${esc(c[lang].name)}</h1><p class="lead">${esc(desc)}</p></header><ul class="cards">${items.map(card).join('')}</ul>${cta(lang)}`;
  return {
    path,
    html: layout({
      lang,
      title: c[lang].name,
      description: desc,
      path,
      alternates,
      ld: [
        itemListLd(c[lang].name, path, items),
        breadcrumbLd(crumbs.map((x, i) => (i === 2 ? { name: x.name, url: path } : x))),
      ],
      body,
      crumbs,
    }),
    lastmod: items.length
      ? isoDate(new Date(Math.max(...items.map((a) => a.updated.getTime()))))
      : undefined,
    alternates,
  };
}

function renderPage(pg, pages, articles) {
  const ui = UI[pg.lang];
  const path = ROUTES[pg.lang].page[pg.key];
  const other = pg.lang === 'nb' ? 'en' : 'nb';
  const alternates = { [pg.lang]: path, [other]: ROUTES[other].page[pg.key] };
  let { html } = renderMarkdown(pg.body, pg.lang, articles);
  // Contact e-mail (CONTACT_EMAIL in site.mjs): `<!--contact-email-->` becomes a paragraph,
  // `<!--email-->` an inline link. Both vanish (or fall back to the contact page) when it's unset.
  html = html.replace(
    '<!--contact-email-->',
    CONTACT_EMAIL ? `<p>${pg.lang === 'en' ? 'E-mail' : 'E-post'}: ${emailLink()}</p>` : '',
  );
  html = html.replaceAll(
    '<!--email-->',
    CONTACT_EMAIL
      ? emailLink()
      : `<a href="${ROUTES[pg.lang].page.contact}">${pg.lang === 'en' ? 'contact page' : 'kontaktsiden'}</a>`,
  );
  const crumbs = [{ name: ui.home, url: pg.lang === 'en' ? '/?lang=en' : '/' }, { name: pg.title }];
  const type = pg.key === 'about' ? 'AboutPage' : pg.key === 'contact' ? 'ContactPage' : 'WebPage';
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': type,
      name: pg.title,
      url: abs(path),
      inLanguage: pg.lang === 'nb' ? 'nb-NO' : 'en',
      dateModified: isoDate(pg.updated),
      publisher: ORG,
    },
    breadcrumbLd([crumbs[0], { name: pg.title, url: path }]),
  ];
  const body = `<article class="article page"><header class="article-head"><h1>${esc(pg.title)}</h1><p class="dates">${ui.updated} <time datetime="${isoDate(pg.updated)}">${ui.dateFmt(pg.updated)}</time></p></header><div class="prose">${html}</div></article>`;
  return {
    path,
    html: layout({
      lang: pg.lang,
      title: pg.title,
      description: pg.description,
      path,
      alternates,
      ld,
      body,
      crumbs,
    }),
    lastmod: isoDate(pg.updated),
    alternates,
  };
}

function render404(articles) {
  const nb = articles.filter((a) => a.lang === 'nb').slice(0, 6);
  const body = `<header class="page-head"><p class="eyebrow">404</p><h1>Fant ikke siden</h1><p class="lead">Siden du lette etter finnes ikke, eller den er flyttet. Prøv forsiden, artikkeloversikten eller en av guidene under.</p>
<p lang="en" class="muted">Page not found. Try the <a href="/?lang=en">forecast</a> or the <a href="${ROUTES.en.hub}">aurora guides in English</a>.</p>
<p><a class="button" href="/">Sjekk nordlysvarselet</a> <a class="button button--ghost" href="${ROUTES.nb.hub}">Alle artikler</a></p></header>
<ul class="cards">${nb.map(card).join('')}</ul>`;
  return layout({
    lang: 'nb',
    title: UI.nb.notFoundTitle,
    description: 'Siden finnes ikke.',
    path: '/404.html',
    body,
    noindex: true,
  });
}

function sitemap(entries) {
  const urls = entries
    .map((e) => {
      const alts = e.alternates
        ? Object.entries(e.alternates)
            .map(([l, p]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(p)}"/>`)
            .join('') +
          (e.alternates.nb
            ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(e.alternates.nb)}"/>`
            : '')
        : '';
      return `  <url>\n    <loc>${abs(e.path)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}${alts}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

function robots() {
  return `# robots.txt for ${SITE_NAME}\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

/** Featured-articles block injected into the SPA's index.html (crawlable, works without JS). */
export function homeLinksHtml(articles) {
  const pick = [
    'what-is-aurora',
    'kp-index',
    'best-time-of-night',
    'tromso',
    'southern-norway',
    'phone-photo',
  ];
  const nb = pick.map((id) => articles.find((a) => a.lang === 'nb' && a.id === id)).filter(Boolean);
  if (!nb.length) return '';
  // lang="nb": the SPA switches <html lang> to "en" with the language toggle; this block stays Norwegian.
  return `<section class="home-guides" lang="nb" aria-labelledby="home-guides-h">
      <h2 id="home-guides-h">Lær mer om nordlyset</h2>
      <p>Uavhengige guider om hvordan nordlyset oppstår, hvordan du leser varselet og hvor i Norge du bør stå.</p>
      <ul>${nb.map((a) => `<li><a href="${articleUrl(a)}">${esc(a.title)}</a></li>`).join('')}</ul>
      <p><a href="${ROUTES.nb.hub}">Alle artikler</a> · <a href="${ROUTES.en.hub}" hreflang="en" lang="en">Aurora guides in English</a></p>
      <nav aria-label="Om nettstedet"><a href="${ROUTES.nb.page.about}">Om</a> · <a href="${ROUTES.nb.page.contact}">Kontakt</a> · <a href="${ROUTES.nb.page.privacy}">Personvern</a> · <a href="${ROUTES.nb.page.terms}">Vilkår</a></nav>
    </section>`;
}

/** Generate everything into outDir. Returns a summary. Throws on validation problems. */
export function buildContent(outDir, { strict = true } = {}) {
  const { articles, pages, problems } = loadContent();
  if (problems.length && strict) {
    throw new Error(`Content validation failed:\n  - ${problems.join('\n  - ')}`);
  }
  const out = [];
  const write = (path, html) => {
    const file = path.endsWith('/') ? join(outDir, path, 'index.html') : join(outDir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
  };
  for (const a of articles) out.push(renderArticle(a, articles));
  for (const lang of LANGS) {
    if (!articles.some((a) => a.lang === lang)) continue;
    out.push(renderHub(lang, articles));
    for (const c of CATEGORIES)
      if (articles.some((a) => a.lang === lang && a.category === c.id))
        out.push(renderCategory(lang, c, articles));
  }
  for (const pg of pages) out.push(renderPage(pg, pages, articles));
  for (const o of out) write(o.path, o.html);
  writeFileSync(join(outDir, '404.html'), render404(articles));
  const home = { path: '/', lastmod: isoDate(new Date()), alternates: undefined };
  writeFileSync(join(outDir, 'sitemap.xml'), sitemap([home, ...out]));
  writeFileSync(join(outDir, 'robots.txt'), robots());
  if (ADSENSE_CLIENT) {
    // Replaces the placeholder from public/ads.txt with the real seller line.
    writeFileSync(
      join(outDir, 'ads.txt'),
      `google.com, ${ADSENSE_CLIENT.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`,
    );
  }
  return { pages: out.length + 1, articles: articles.length, problems };
}

// CLI: `node scripts/content/build.mjs --check` validates; `node scripts/content/build.mjs <outDir>` builds.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (!arg || arg === '--check') {
    const { articles, pages, problems } = loadContent();
    for (const lang of LANGS) {
      const list = articles.filter((a) => a.lang === lang);
      console.log(
        `${lang}: ${list.length} articles, ${pages.filter((p) => p.lang === lang).length} pages, ${list.reduce((n, a) => n + a.words, 0)} words`,
      );
    }
    if (problems.length) {
      console.error(problems.map((p) => `  - ${p}`).join('\n'));
      process.exit(1);
    }
  } else {
    console.log(buildContent(resolve(arg)));
  }
}
