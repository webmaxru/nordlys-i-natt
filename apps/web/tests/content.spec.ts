import { test, expect, type Page } from '@playwright/test';

/**
 * Static content section (articles, topic pages, info pages). These pages are plain HTML
 * generated at build time (scripts/content/build.mjs), so no API mocking is needed.
 */

const MOBILE = { width: 390, height: 844 };

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectValidJsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks.length).toBeGreaterThan(0);
  for (const block of blocks) {
    const data = JSON.parse(block);
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBeTruthy();
  }
}

for (const hub of ['/artikler/', '/en/guides/']) {
  test(`hub ${hub} lists articles and every article renders on mobile`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const errors = collectErrors(page);
    await page.goto(hub);
    await expect(page.locator('h1')).toBeVisible();
    await expectValidJsonLd(page);
    const hrefs = await page
      .locator('.cards .card a')
      .evaluateAll((as) =>
        Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''))),
      );
    expect(hrefs.length).toBeGreaterThanOrEqual(15);

    for (const href of hrefs) {
      const res = await page.goto(href);
      expect(res?.status(), href).toBe(200);
      await expect(page.locator('article h1')).toBeVisible();
      await expect(page.locator('.crumbs')).toBeVisible();
      await expect(page.locator('.sources li').first()).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
      await expectValidJsonLd(page);
      await expectNoHorizontalOverflow(page);
    }
    expect(errors).toEqual([]);
  });
}

test('info pages exist in both languages', async ({ page }) => {
  for (const path of [
    '/om/',
    '/kontakt/',
    '/personvern/',
    '/vilkar/',
    '/en/about/',
    '/en/contact/',
    '/en/privacy/',
    '/en/terms/',
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('privacy page carries the Google ads cookie disclosure', async ({ page }) => {
  await page.goto('/personvern/');
  await expect(
    page.locator('a[href="https://policies.google.com/technologies/partner-sites"]'),
  ).toHaveCount(1);
  await page.goto('/en/privacy/');
  await expect(
    page.locator('a[href="https://policies.google.com/technologies/partner-sites"]'),
  ).toHaveCount(1);
});

test('the app home page links to the guides without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.home-guides a[href="/artikler/"]')).toHaveCount(1);
  await expect(page.locator('.home-guides li a')).toHaveCount(6);
  await context.close();
});
