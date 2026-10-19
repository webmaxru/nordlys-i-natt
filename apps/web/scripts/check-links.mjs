#!/usr/bin/env node
// Checks the built site in dist/ (run after `pnpm build`):
//   - every internal link/src in every HTML page points at a file that exists
//     ("/x/" -> x/index.html, "/x.css" -> x.css, "/" and "/?lang=en" -> index.html),
//   - every same-page "#fragment" exists as an id,
//   - every <script type="application/ld+json"> block parses and has @context/@type,
//   - every content page has a <title>, meta description and canonical link.
// Usage: node scripts/check-links.mjs [distDir]
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, posix } from 'node:path';

const dist = resolve(process.argv[2] || 'dist');
const problems = [];
const pages = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
}
walk(dist);

function urlPathOf(file) {
  const rel = '/' + relative(dist, file).split('\\').join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
}

function targetExists(path) {
  if (path === '/' || path === '') return existsSync(join(dist, 'index.html'));
  const fsPath = join(dist, decodeURI(path));
  if (path.endsWith('/')) return existsSync(join(fsPath, 'index.html'));
  return existsSync(fsPath) && statSync(fsPath).isFile();
}

let links = 0;
let ldBlocks = 0;
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const here = urlPathOf(file);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const isContent = !here.endsWith('/index.html') && here !== '/' && !here.endsWith('404.html');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const raw = m[1]
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&amp;/g, '&');
    if (!raw || /^(https?:|mailto:|tel:|data:|javascript:)/i.test(raw) || raw.startsWith('//'))
      continue;
    links++;
    const [beforeHash, hash] = raw.split('#');
    const pathOnly = beforeHash.split('?')[0];
    if (!pathOnly) {
      if (hash && !ids.has(hash)) problems.push(`${here}: missing anchor #${hash}`);
      continue;
    }
    const abs = pathOnly.startsWith('/')
      ? pathOnly
      : posix.join(posix.dirname(here.endsWith('/') ? here + 'x' : here), pathOnly);
    if (!targetExists(abs)) problems.push(`${here}: broken link ${raw}`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    ldBlocks++;
    try {
      const data = JSON.parse(m[1]);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (!item['@context'] || !item['@type'])
          problems.push(`${here}: JSON-LD without @context/@type`);
      }
    } catch (e) {
      problems.push(`${here}: invalid JSON-LD (${e.message})`);
    }
  }
  if (isContent || here.endsWith('/')) {
    if (!/<title>[^<]{5,}<\/title>/.test(html)) problems.push(`${here}: missing <title>`);
    if (!/<meta\s+name="description"\s+content="[^"]{50,}"/.test(html))
      problems.push(`${here}: missing/short meta description`);
    if (
      here !== '/' &&
      !here.endsWith('404.html') &&
      !/<link\s+rel="canonical"\s+href="https:\/\/[^"]+"/.test(html)
    ) {
      problems.push(`${here}: missing canonical`);
    }
  }
}

console.log(`checked ${pages.length} pages, ${links} internal links, ${ldBlocks} JSON-LD blocks`);
if (problems.length) {
  console.error(problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
