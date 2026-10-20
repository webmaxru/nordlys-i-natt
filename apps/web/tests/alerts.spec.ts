import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const forecastFixture = fileURLToPath(new URL('./fixtures/forecast.json', import.meta.url));
const TROMSO = JSON.stringify({ name: 'Tromsø', region: 'Troms', lat: 69.6492, lon: 18.9553 });

const NIGHTS = {
  tonight: '2026-12-01',
  today: '2026-12-01',
  nights: [
    {
      nightOf: '2026-12-01',
      chance: 'low',
      label: 'Liten sjanse',
      darkHours: 18,
      visibleHours: 1,
      maxKp: 2,
      requiredKp: 1,
      minCloudPct: 30,
      bestTime: '2026-12-01T21:00:00Z',
      complete: true,
    },
    {
      nightOf: '2026-12-02',
      chance: 'high',
      label: 'Stor sjanse',
      darkHours: 18,
      visibleHours: 9,
      maxKp: 4,
      requiredKp: 1,
      minCloudPct: 0,
      bestTime: '2026-12-02T21:00:00Z',
      complete: true,
    },
  ],
};

async function mock(
  page: Page,
  opts: { email: boolean; onEmail?: (body: unknown) => number } = { email: true },
) {
  await page.route('https://agentprose.cloud/**', (r) => r.abort());
  await page.route('**/api/forecast**', (r) => r.fulfill({ path: forecastFixture }));
  await page.route('**/api/noaa/ovation/grid**', (r) =>
    r.fulfill({ json: { forecastTime: new Date().toISOString(), points: [] } }),
  );
  await page.route('**/api/alerts/status', (r) =>
    r.fulfill({
      json: {
        web: { enabled: true },
        email: { enabled: opts.email },
        app: { android: false, ios: false },
      },
    }),
  );
  await page.route('**/api/alerts/nights**', (r) => r.fulfill({ json: NIGHTS }));
  await page.route('**/api/email/subscribe', async (r) => {
    const status = opts.onEmail ? opts.onEmail(r.request().postDataJSON()) : 202;
    await r.fulfill({ status, json: status === 202 ? { status: 'check_inbox' } : { error: 'x' } });
  });
  await page.addInitScript((loc) => {
    window.localStorage.setItem('nordlys.location', loc);
    window.localStorage.setItem('i18nextLng', 'nb');
  }, TROMSO);
}

test.describe('pitch and subscribe flow', () => {
  test('the pitch leads with the day-before promise and the CTA jumps to the alerts', async ({
    page,
  }) => {
    await mock(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dagen før din beste sjanse/i })).toBeVisible();
    await page.getByRole('link', { name: 'Få nordlysvarsel' }).click();
    await expect(page).toHaveURL(/#varsel$/);
    const panel = page.locator('#varsel');
    await expect(panel.getByText('For Tromsø')).toBeVisible();
    await expect(panel.getByText('Stor sjanse', { exact: true })).toBeVisible();
    await expect(panel.getByRole('tab', { name: 'E-post' })).toBeVisible();
  });

  test('e-mail sign-up sends place, language, preferences and bot fields, then asks to check the inbox', async ({
    page,
  }) => {
    let body: Record<string, unknown> | null = null;
    await mock(page, {
      email: true,
      onEmail: (b) => {
        body = b as Record<string, unknown>;
        return 202;
      },
    });
    await page.goto('/');
    await page.getByRole('tab', { name: 'E-post' }).click();
    await page.getByLabel('Bare når sjansen er stor').check();
    await page.waitForTimeout(1600); // real people take a moment; instant submits are treated as bots
    await page.getByLabel('E-postadresse').fill('kari@example.no');
    await page.getByRole('button', { name: 'Send meg varsel på e-post' }).click();
    await expect(page.getByRole('status')).toContainText('Sjekk innboksen');
    expect(body).toMatchObject({
      email: 'kari@example.no',
      location: { name: 'Tromsø', lat: 69.6492, lon: 18.9553 },
      lang: 'nb',
      prefs: { dayBefore: true, now: false, minChance: 'high' },
      website: '',
    });
    expect(Number((body as unknown as { elapsedMs: number }).elapsedMs)).toBeGreaterThan(1500);
  });

  test('shows a clear message when e-mail alerts are not switched on yet', async ({ page }) => {
    await mock(page, { email: false });
    await page.goto('/');
    await page.getByRole('tab', { name: 'E-post' }).click();
    await expect(page.getByText('E-postvarsel kommer snart')).toBeVisible();
  });

  test('explains a full address book (five places)', async ({ page }) => {
    await mock(page, { email: true, onEmail: () => 409 });
    await page.goto('/');
    await page.getByRole('tab', { name: 'E-post' }).click();
    await page.waitForTimeout(1600);
    await page.getByLabel('E-postadresse').fill('many@example.no');
    await page.getByRole('button', { name: 'Send meg varsel på e-post' }).click();
    await expect(page.getByRole('alert')).toContainText('fem steder');
  });

  test('a place in the URL (from an alert link) is selected and the URL is cleaned', async ({
    page,
  }) => {
    await mock(page);
    await page.goto('/?lat=59.9139&lon=10.7522&name=Oslo&utm_source=alert&utm_medium=email');
    await expect(page.locator('#varsel').getByText('For Oslo')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('the app tab says the apps are coming when no store links are set', async ({ page }) => {
    await mock(page);
    await page.goto('/');
    await page.getByRole('tab', { name: 'App' }).click();
    await expect(page.getByText('Appene kommer snart')).toBeVisible();
  });

  test('inside the iOS/Android app only native alerts are offered, never web push', async ({
    page,
  }) => {
    await mock(page);
    // The Capacitor bridge as the native shell injects it (Android build without Firebase).
    await page.addInitScript(() => {
      (window as unknown as { Capacitor: unknown }).Capacitor = {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      };
    });
    let webPushCalls = 0;
    await page.route('**/api/push/public-key', (r) => {
      webPushCalls += 1;
      return r.fulfill({ json: { publicKey: 'x' } });
    });
    await page.goto('/');
    await expect(page.getByRole('tab', { name: 'Nettleser' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'E-post' })).toHaveCount(0);
    await expect(
      page.getByText('Varsler i appen er ikke slått på i denne versjonen ennå.'),
    ).toBeVisible();
    expect(webPushCalls).toBe(0);
  });
});
