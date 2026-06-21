import { test, expect, devices, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/**
 * Hermetic visual / layout regression tests.
 *
 * Every backend and third-party request is mocked so the suite is deterministic
 * and never depends on MET Norway, NOAA or Kartverket being reachable from CI.
 */

const forecastFixture = fileURLToPath(
  new URL('./fixtures/forecast.json', import.meta.url),
);

const TROMSO = JSON.stringify({
  name: 'Tromsø',
  region: 'Troms',
  lat: 69.6492,
  lon: 18.9553,
});

// Matches the current Kartverket "stedsnavn" schema (name fields at top level).
const SEARCH_FIXTURE = {
  metadata: { totaltAntallTreff: 3, treffPerSide: 8, side: 1 },
  navn: [
    {
      'skrivemåte': 'Tromsø',
      navnestatus: 'hovednavn',
      'språk': 'Norsk',
      stedstatus: 'aktiv',
      kommuner: [{ kommunenavn: 'Tromsø' }],
      fylker: [{ fylkesnavn: 'Troms' }],
      representasjonspunkt: { nord: 69.6492, 'øst': 18.9553 },
    },
    {
      'skrivemåte': 'Tromsø bru',
      navnestatus: 'hovednavn',
      'språk': 'Norsk',
      stedstatus: 'aktiv',
      kommuner: [{ kommunenavn: 'Tromsø' }],
      fylker: [{ fylkesnavn: 'Troms' }],
      representasjonspunkt: { nord: 69.652, 'øst': 18.962 },
    },
    {
      'skrivemåte': 'Tromsøya',
      navnestatus: 'hovednavn',
      'språk': 'Norsk',
      stedstatus: 'aktiv',
      kommuner: [{ kommunenavn: 'Tromsø' }],
      fylker: [{ fylkesnavn: 'Troms' }],
      representasjonspunkt: { nord: 69.66, 'øst': 18.94 },
    },
  ],
};

async function mockApp(
  page: Page,
  { seedLocation = true, lang = 'en' }: { seedLocation?: boolean; lang?: string } = {},
) {
  await page.route('**/api/forecast**', (route) =>
    route.fulfill({ path: forecastFixture }),
  );
  await page.route('**/api/noaa/ovation/grid**', (route) =>
    route.fulfill({ json: { forecastTime: new Date().toISOString(), points: [] } }),
  );
  await page.route('**/api/push/public-key**', (route) =>
    route.fulfill({ json: { publicKey: 'BPlaceholderVapidKeyForTests' } }),
  );
  await page.route('**/api/subscriptions**', (route) =>
    route.fulfill({ json: { id: 'test-subscription' } }),
  );
  await page.route(/ws\.geonorge\.no/, (route) =>
    route.fulfill({ json: SEARCH_FIXTURE }),
  );

  await page.addInitScript(
    ({ loc, lang, seed }) => {
      localStorage.setItem('i18nextLng', lang);
      if (seed) localStorage.setItem('nordlys.location', loc);
    },
    { loc: TROMSO, lang, seed: seedLocation },
  );
}

function hasHorizontalOverflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
}

// `defaultBrowserType` cannot be set in a describe-level test.use(), so pick
// only the layout-relevant fields from the device profile.
const IPHONE_13 = {
  viewport: devices['iPhone 13'].viewport,
  userAgent: devices['iPhone 13'].userAgent,
  deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
  isMobile: devices['iPhone 13'].isMobile,
  hasTouch: devices['iPhone 13'].hasTouch,
};

test.describe('mobile layout (iPhone)', () => {
  test.use(IPHONE_13);

  test('no horizontal overflow when a location is set', async ({ page }) => {
    await mockApp(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section.gauge .gauge__badge');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('clicking "Change location" does not break the layout', async ({ page }) => {
    await mockApp(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section.gauge .gauge__badge');

    await page.getByRole('button', { name: /change location/i }).click();
    await page.waitForSelector('.location-picker__controls');

    // Regression guard: the expandable controls (incl. the no-wrap Quick Picks
    // chip row) must scroll internally and never widen the page.
    expect(await hasHorizontalOverflow(page)).toBe(false);
    const controlsFit = await page.evaluate(() => {
      const c = document.querySelector('.location-picker__controls')!;
      return c.getBoundingClientRect().width <= document.documentElement.clientWidth;
    });
    expect(controlsFit).toBe(true);
  });

  test('header renders on a single line', async ({ page }) => {
    await mockApp(page, { seedLocation: false });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const lines = await page.evaluate(() => {
      const h1 = document.querySelector('.app-header h1')!;
      const cs = getComputedStyle(h1);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      return Math.round(h1.getBoundingClientRect().height / lineHeight);
    });
    expect(lines).toBe(1);
  });

  test('result (verdict) is above the fold when a location is set', async ({ page }) => {
    await mockApp(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section.gauge .gauge__badge');
    const aboveFold = await page.evaluate(() => {
      const r = document.querySelector('section.gauge')!.getBoundingClientRect();
      return r.top >= 0 && r.top < window.innerHeight;
    });
    expect(aboveFold).toBe(true);
  });

  test('place search returns results', async ({ page }) => {
    await mockApp(page, { seedLocation: false });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.search-field input').fill('Tromsø');
    const first = page.locator('.search-results__item').first();
    await expect(first).toContainText('Tromsø');
    expect(await page.locator('.search-results__item').count()).toBeGreaterThan(0);
  });

  test('iOS browser tab starts with Subscribe, then shows Add to Home Screen', async ({
    page,
  }) => {
    // Simulate an iOS Safari tab where Web Push is unavailable.
    await page.addInitScript(() => {
      // @ts-expect-error - intentionally removing for the simulation
      delete window.PushManager;
      // @ts-expect-error - intentionally removing for the simulation
      delete window.Notification;
    });
    await mockApp(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for the forecast to settle so the gauge reaches its final height
    // before we interact — the notify CTA now sits directly under the gauge, so
    // clicking mid-load would chase a shifting target.
    await page.waitForSelector('section.gauge .gauge__badge');
    const section = page.locator('section.notify-button');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText(/free aurora alerts/i);
    await expect(section.getByRole('button', { name: /subscribe/i })).toBeVisible();

    await section.getByRole('button', { name: /subscribe/i }).click();

    await expect(section.locator('strong')).toContainText(/add to home screen/i);
    await expect(section).toContainText(/add this app to your home screen/i);
    await expect(section.getByRole('button', { name: /not now/i })).toBeVisible();
  });

  test('notify opt-in CTA (idle) fits the viewport with no horizontal overflow', async ({
    page,
  }) => {
    // Force the first-visit idle opt-in CTA. Headless Chromium otherwise reports
    // Notification.permission === 'denied' and renders the blocked card, so the
    // idle row (a flex layout that previously blew out the grid track) is never
    // exercised. This guards the regression where the CTA overflowed 390px.
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Notification, 'permission', {
          configurable: true,
          get: () => 'default',
        });
      } catch {
        // Some engines disallow redefining the static getter; ignore.
      }
    });
    await mockApp(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section.gauge .gauge__badge');

    const cta = page.locator('section.notify-button');
    await expect(cta.getByRole('button', { name: /subscribe/i })).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    const fits = await page.evaluate(() => {
      const el = document.querySelector('section.notify-button')!;
      return (
        el.getBoundingClientRect().right <= document.documentElement.clientWidth + 1
      );
    });
    expect(fits).toBe(true);
  });
});

test.describe('desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('no horizontal overflow on desktop', async ({ page }) => {
    await mockApp(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section.gauge .gauge__badge');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('clicking "Change location" does not break the desktop layout', async ({ page }) => {
    await mockApp(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section.gauge .gauge__badge');
    await page.getByRole('button', { name: /change location/i }).click();
    await page.waitForSelector('.location-picker__controls');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});
