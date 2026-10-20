#!/usr/bin/env node
// Store screenshots for the iOS/Android apps, rendered from the site in the app layout
// (the Capacitor bridge is simulated, so the alerts panel shows the in-app channel).
// Output: store-screenshots/<device>/<lang>-<n>-<scene>.png, plus the Play feature graphic and icon.
//
//   pnpm --filter @nordlys/web exec node scripts/store-screenshots.mjs
// Env: SCREENSHOT_BASE (default https://nordlys.salnikov.no), OUT_DIR (default ./store-screenshots),
//      PW_CHROMIUM_PATH (optional local Chromium). See docs/STORE-LISTING.md for the sizes.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.SCREENSHOT_BASE || 'https://nordlys.salnikov.no').replace(/\/$/, '');
const OUT = resolve(process.env.OUT_DIR || 'store-screenshots');

// CSS viewport × device scale factor = the store's pixel size.
const ONLY = process.env.ONLY_DEVICE;
const DEVICES = [
  { dir: 'ios-6.9', width: 440, height: 956, scale: 3, mobile: true }, // 1320 × 2868
  { dir: 'ios-ipad-13', width: 1032, height: 1376, scale: 2, mobile: true }, // 2064 × 2752
  { dir: 'android-phone', width: 360, height: 800, scale: 3, mobile: true }, // 1080 × 2400
  { dir: 'android-tablet-7', width: 600, height: 960, scale: 2, mobile: true }, // 1200 × 1920
  { dir: 'android-tablet-10', width: 800, height: 1280, scale: 2, mobile: true }, // 1600 × 2560
];

const PLACE = { name: 'Tromsø', region: 'Troms', lat: 69.6492, lon: 18.9553 };

const SCENES = [
  { name: 'verdict', path: '/', scrollTo: null },
  { name: 'alerts', path: '/', scrollTo: '#varsel' },
  { name: 'night', path: '/', scrollTo: '#timeline-title' },
  { name: 'map', path: '/', scrollTo: '#aurora-map-title' },
  { name: 'guide', path: { nb: '/artikler/', en: '/en/guides/' }, scrollTo: null },
];

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);

for (const device of DEVICES.filter((d) => !ONLY || d.dir === ONLY)) {
  mkdirSync(resolve(OUT, device.dir), { recursive: true });
  for (const lang of ['nb', 'en']) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      isMobile: device.mobile,
      hasTouch: true,
      locale: lang === 'nb' ? 'nb-NO' : 'en-GB',
      colorScheme: 'dark',
    });
    await context.addInitScript(
      ({ place, lang }) => {
        localStorage.setItem('nordlys.location', JSON.stringify(place));
        localStorage.setItem('i18nextLng', lang);
        window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' };
      },
      { place: PLACE, lang },
    );
    // The AI-agent snippet is irrelevant to screenshots and keeps the network busy.
    await context.route('https://agentprose.cloud/**', (r) => r.abort());
    const page = await context.newPage();
    let n = 0;
    for (const scene of SCENES) {
      n += 1;
      const path = typeof scene.path === 'string' ? scene.path : scene.path[lang];
      const url = `${BASE}${path}`;
      let res = null;
      for (let attempt = 1; attempt <= 3 && !res; attempt += 1) {
        res = await page.goto(url, { waitUntil: 'load', timeout: 45_000 }).catch((err) => {
          console.warn(`attempt ${attempt}: ${String(err).split('\n')[0]}`);
          return null;
        });
        if (!res) await page.waitForTimeout(3000);
      }
      if (!res || res.status() >= 400) {
        console.warn(
          `skip ${device.dir} ${lang} ${scene.name}: ${res?.status() ?? 'no response'} ${url}`,
        );
        continue;
      }
      await page.waitForTimeout(1500);
      if (scene.scrollTo) {
        await page
          .locator(scene.scrollTo)
          .first()
          .evaluate((el) => el.scrollIntoView({ block: 'start' }))
          .catch(() => undefined);
        await page.waitForTimeout(800);
      }
      const file = resolve(OUT, device.dir, `${lang}-${n}-${scene.name}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    await context.close();
  }
}

// Play feature graphic (1024 × 500) and the 512 × 512 icon.
const icon = readFileSync(resolve(here, '../../mobile/assets/icon-only.png')).toString('base64');
const fg = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await fg.setContent(`<!doctype html><html><body style="margin:0;width:1024px;height:500px;display:flex;align-items:center;gap:48px;padding:0 64px;box-sizing:border-box;background:radial-gradient(circle at 70% 20%,#183a66,#0b1020 60%,#05070f);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e9eefc">
<img src="data:image/png;base64,${icon}" style="width:260px;height:260px;border-radius:56px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
<div><div style="font-size:64px;font-weight:800;letter-spacing:-1px">Nordlys i natt</div>
<div style="font-size:34px;margin-top:12px;color:#84f7c8">Varsel dagen før nordlyset</div>
<div style="font-size:24px;margin-top:20px;color:#a8b3d1">Kp · skydekke · mørke – for ditt sted</div></div></body></html>`);
await fg.screenshot({ path: resolve(OUT, 'android-feature-graphic.png') });
await fg.setViewportSize({ width: 512, height: 512 });
await fg.setContent(
  `<html><body style="margin:0"><img src="data:image/png;base64,${icon}" style="width:512px;height:512px;display:block"></body></html>`,
);
await fg.screenshot({ path: resolve(OUT, 'play-icon-512.png') });
await browser.close();
console.log(`done: ${OUT}`);
