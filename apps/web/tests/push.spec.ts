import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const forecastFixture = fileURLToPath(
  new URL('./fixtures/forecast.json', import.meta.url),
);

const TROMSO = JSON.stringify({
  name: 'Tromsø',
  region: 'Troms',
  lat: 69.6492,
  lon: 18.9553,
});

const SEARCH_FIXTURE = {
  metadata: { totaltAntallTreff: 1, treffPerSide: 8, side: 1 },
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
  ],
};

const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa40HIhlyuZHdS5fkycUEnUspE-MA72HmY1Ew1M4aR9tW7UY6H5WzqkPqTFfo8';

declare global {
  interface Window {
    __permissionRequested?: boolean;
    __pushSubscribeCalled?: boolean;
  }
}

async function mockApp(
  page: Page,
  onSubscriptionPost?: () => void,
) {
  await page.route('**/api/forecast**', (route) =>
    route.fulfill({ path: forecastFixture }),
  );
  await page.route('**/api/noaa/ovation/grid**', (route) =>
    route.fulfill({ json: { forecastTime: new Date().toISOString(), points: [] } }),
  );
  await page.route('**/api/push/public-key**', (route) =>
    route.fulfill({ json: { publicKey: VAPID_PUBLIC_KEY } }),
  );
  await page.route('**/api/subscriptions**', (route) => {
    if (route.request().method() === 'POST') {
      onSubscriptionPost?.();
    }
    return route.fulfill({ json: { id: 'test-sub' } });
  });
  await page.route(/ws\.geonorge\.no/, (route) =>
    route.fulfill({ json: SEARCH_FIXTURE }),
  );

  await page.addInitScript(({ loc }) => {
    localStorage.setItem('nordlys.consent.analytics', 'denied');
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('nordlys.location', loc);
  }, { loc: TROMSO });
}

async function installPushSpies(
  page: Page,
  permissionResult: NotificationPermission = 'default',
) {
  await page.addInitScript((result) => {
    window.__permissionRequested = false;
    window.__pushSubscribeCalled = false;

    if ('Notification' in window) {
      // Headless Chromium reports Notification.permission === 'denied' even when
      // granted via the context, which would disable the notify button. Spoof a
      // realistic first-visit 'default' so the button is enabled and clickable.
      try {
        Object.defineProperty(Notification, 'permission', {
          configurable: true,
          get: () => 'default',
        });
      } catch {
        // Some engines disallow redefining the static getter; ignore.
      }

      Object.defineProperty(Notification, 'requestPermission', {
        configurable: true,
        value: () => {
          window.__permissionRequested = true;
          return Promise.resolve(result);
        },
      });
    }

    if ('PushManager' in window) {
      Object.defineProperty(PushManager.prototype, 'subscribe', {
        configurable: true,
        value: () => {
          window.__pushSubscribeCalled = true;
          return Promise.resolve({
            endpoint: 'https://push.example.test/subscription',
            toJSON: () => ({
              endpoint: 'https://push.example.test/subscription',
              keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
            }),
          });
        },
      });
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const fakePushManager = {
        subscribe: (options?: PushSubscriptionOptionsInit) =>
          PushManager.prototype.subscribe.call(fakePushManager, options),
        getSubscription: () => Promise.resolve(null),
      } as PushManager;

      try {
        Object.defineProperty(navigator.serviceWorker, 'ready', {
          configurable: true,
          get: () => Promise.resolve({ pushManager: fakePushManager }),
        });
      } catch {
        // If the browser does not allow overriding it, the production SW path is still used.
      }
    }
  }, permissionResult);
}

test.describe('push notifications', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('does not POST a push subscription on initial load', async ({ page }) => {
    let subscriptionPosted = false;
    await installPushSpies(page);
    await mockApp(page, () => {
      subscriptionPosted = true;
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('section.notify-button')).toBeVisible();
    await page.waitForTimeout(500);

    expect(subscriptionPosted).toBe(false);
  });

  test('does not request notification permission on initial load', async ({ page }) => {
    await installPushSpies(page);
    await mockApp(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('section.notify-button')).toBeVisible();
    await page.waitForTimeout(500);

    await expect
      .poll(() => page.evaluate(() => window.__permissionRequested))
      .toBe(false);
  });

  test('does not call PushManager.subscribe on initial load', async ({ page }) => {
    await installPushSpies(page);
    await mockApp(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('section.notify-button')).toBeVisible();
    await page.waitForTimeout(500);

    await expect
      .poll(() => page.evaluate(() => window.__pushSubscribeCalled))
      .toBe(false);
  });

  test('POSTs a push subscription only after the soft prompt allow button', async ({
    page,
    context,
  }) => {
    let subscriptionPosted = false;
    await context.grantPermissions(['notifications']);
    await installPushSpies(page, 'granted');
    await mockApp(page, () => {
      subscriptionPosted = true;
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('section.notify-button')).toBeVisible();
    await page.waitForTimeout(500);
    expect(subscriptionPosted).toBe(false);

    await page.getByRole('button', { name: /subscribe/i }).click();
    await page.getByRole('button', { name: /allow notifications/i }).click();

    await expect
      .poll(() => page.evaluate(() => window.__permissionRequested))
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => window.__pushSubscribeCalled))
      .toBe(true);
    await expect.poll(() => subscriptionPosted).toBe(true);
  });

  test('shows actionable guidance (not "blocked") when the browser quietly holds the request', async ({
    page,
  }) => {
    let subscriptionPosted = false;
    // Edge/Chrome quiet UI (or a dismissed prompt) resolves requestPermission to
    // 'default' — this must NOT be treated as a hard block.
    await installPushSpies(page, 'default');
    await mockApp(page, () => {
      subscriptionPosted = true;
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const section = page.locator('section.notify-button');
    await expect(section).toBeVisible();

    await section.getByRole('button', { name: /subscribe/i }).click();
    await section.getByRole('button', { name: /allow notifications/i }).click();

    await expect(section.getByRole('button', { name: /try again/i })).toBeVisible();
    await expect(section).not.toContainText(/notifications are blocked/i);
    expect(subscriptionPosted).toBe(false);
  });
});
