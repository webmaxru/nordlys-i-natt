import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/**
 * Deterministic WebMCP lifecycle tests.
 *
 * Headless Chromium has no real `document.modelContext`, so we inject a fake
 * model-context harness before the app boots. The app registers its imperative
 * tools into the harness; the tests then invoke those tools directly and assert
 * on their declared schemas and structured results, plus the on-screen effect.
 * Every backend/third-party request is mocked, so the suite is hermetic.
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

// A non-preset place so set_aurora_location exercises the Kartverket search path.
const SEARCH_FIXTURE = {
  metadata: { totaltAntallTreff: 1, treffPerSide: 8, side: 1 },
  navn: [
    {
      'skrivemåte': 'Andenes',
      navnestatus: 'hovednavn',
      'språk': 'Norsk',
      stedstatus: 'aktiv',
      kommuner: [{ kommunenavn: 'Andøy' }],
      fylker: [{ fylkesnavn: 'Nordland' }],
      representasjonspunkt: { nord: 69.3269, 'øst': 16.1198 },
    },
  ],
};

interface HarnessTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  execute: (
    input: Record<string, unknown>,
    client: { requestUserInteraction: <T>(cb: () => Promise<T>) => Promise<T> },
  ) => Promise<unknown> | unknown;
}

type ToolDescription = Pick<
  HarnessTool,
  'name' | 'title' | 'description' | 'inputSchema' | 'outputSchema' | 'annotations'
>;

interface WebMcpHarness {
  list: () => string[];
  describe: (name: string) => ToolDescription | null;
  invoke: (name: string, input?: Record<string, unknown>) => Promise<unknown>;
}

declare global {
  interface Window {
    __webmcp?: WebMcpHarness;
  }
}

async function mockApp(page: Page) {
  await page.route('**/api/forecast**', (route) =>
    route.fulfill({ path: forecastFixture }),
  );
  await page.route('**/api/noaa/ovation/grid**', (route) =>
    route.fulfill({
      json: { forecastTime: new Date().toISOString(), points: [] },
    }),
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

  await page.addInitScript(({ loc }) => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('nordlys.location', loc);
  }, { loc: TROMSO });
}

// Inject a fake `document.modelContext` and expose a `window.__webmcp` harness
// that the tests use to list/describe/invoke the tools the app registers.
async function installModelContextHarness(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, HarnessTool>();

    const context = {
      registerTool(tool: HarnessTool, options?: { signal?: AbortSignal }) {
        if (!tool || typeof tool.name !== 'string' || tool.name.length === 0) {
          return Promise.reject(
            new DOMException('name is required', 'InvalidStateError'),
          );
        }
        if (tools.has(tool.name)) {
          return Promise.reject(
            new DOMException('duplicate tool name', 'InvalidStateError'),
          );
        }
        tools.set(tool.name, tool);
        const signal = options?.signal;
        if (signal) {
          signal.addEventListener('abort', () => tools.delete(tool.name));
        }
        return Promise.resolve();
      },
      unregisterTool(name: string) {
        tools.delete(name);
      },
      getTools() {
        return Array.from(tools.values());
      },
    };

    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      get: () => context,
    });

    window.__webmcp = {
      list: () => Array.from(tools.keys()),
      describe: (name) => {
        const tool = tools.get(name);
        if (!tool) {
          return null;
        }
        return {
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
          annotations: tool.annotations,
        };
      },
      invoke: (name, input) => {
        const tool = tools.get(name);
        if (!tool) {
          return Promise.reject(new Error(`unknown tool: ${name}`));
        }
        return Promise.resolve(
          tool.execute(input ?? {}, {
            requestUserInteraction: (cb) => cb(),
          }),
        );
      },
    };
  });
}

async function gotoReady(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('section.gauge .gauge__badge');
  await expect
    .poll(() => page.evaluate(() => window.__webmcp?.list() ?? []))
    .toEqual(expect.arrayContaining(['get_aurora_verdict', 'set_aurora_location']));
}

test.describe('WebMCP tools', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('registers exactly the two aurora tools', async ({ page }) => {
    await installModelContextHarness(page);
    await mockApp(page);
    await gotoReady(page);

    const names = await page.evaluate(() => window.__webmcp!.list());
    expect(names.sort()).toEqual(['get_aurora_verdict', 'set_aurora_location']);
  });

  test('each tool declares an input and result (output) schema', async ({
    page,
  }) => {
    await installModelContextHarness(page);
    await mockApp(page);
    await gotoReady(page);

    const get = await page.evaluate(
      () => window.__webmcp!.describe('get_aurora_verdict')!,
    );
    expect(get.annotations).toMatchObject({ readOnlyHint: true });
    expect(get.inputSchema).toMatchObject({ type: 'object' });
    expect(get.outputSchema).toMatchObject({ type: 'object' });
    expect(
      (get.outputSchema as { required: string[] }).required,
    ).toEqual(
      expect.arrayContaining(['location', 'verdict', 'reason', 'requiredKp']),
    );

    const set = await page.evaluate(
      () => window.__webmcp!.describe('set_aurora_location')!,
    );
    expect(set.inputSchema).toMatchObject({ type: 'object' });
    expect(set.outputSchema).toMatchObject({ type: 'object' });
    expect(
      (set.outputSchema as { required: string[] }).required,
    ).toEqual(expect.arrayContaining(['location', 'source', 'verdict']));
  });

  test('get_aurora_verdict returns the current structured verdict', async ({
    page,
  }) => {
    await installModelContextHarness(page);
    await mockApp(page);
    await gotoReady(page);

    const result = (await page.evaluate(() =>
      window.__webmcp!.invoke('get_aurora_verdict', {}),
    )) as {
      verdict: string;
      reason: string;
      requiredKp: number;
      currentKp: number | null;
      location: { name: string };
      generatedAt: string;
    };

    expect(result.verdict).toBe('NO');
    expect(result.reason).toBe('not_dark');
    expect(result.requiredKp).toBe(1);
    expect(result.currentKp).toBeCloseTo(1.67, 2);
    expect(result.location.name).toBe('Tromsø');
    expect(typeof result.generatedAt).toBe('string');
  });

  test('set_aurora_location resolves a preset and updates the UI', async ({
    page,
  }) => {
    await installModelContextHarness(page);
    await mockApp(page);
    await gotoReady(page);

    const result = (await page.evaluate(() =>
      window.__webmcp!.invoke('set_aurora_location', { name: 'Bodø' }),
    )) as {
      source: string;
      location: { name: string; lat: number; lon: number };
      verdict: { verdict: string; requiredKp: number };
    };

    expect(result.source).toBe('preset');
    expect(result.location.name).toBe('Bodø');
    expect(result.verdict.verdict).toBe('NO');
    await expect(page.locator('.selected-location strong')).toContainText(
      'Bodø',
    );
  });

  test('set_aurora_location falls back to place search for non-presets', async ({
    page,
  }) => {
    await installModelContextHarness(page);
    await mockApp(page);
    await gotoReady(page);

    const result = (await page.evaluate(() =>
      window.__webmcp!.invoke('set_aurora_location', { name: 'Andenes' }),
    )) as { source: string; location: { name: string } };

    expect(result.source).toBe('search');
    expect(result.location.name).toBe('Andenes');
    await expect(page.locator('.selected-location strong')).toContainText(
      'Andenes',
    );
  });

  test('set_aurora_location accepts explicit coordinates', async ({ page }) => {
    await installModelContextHarness(page);
    await mockApp(page);
    await gotoReady(page);

    const result = (await page.evaluate(() =>
      window.__webmcp!.invoke('set_aurora_location', { lat: 70, lon: 25 }),
    )) as { source: string; location: { name: string; lat: number; lon: number } };

    expect(result.source).toBe('coordinates');
    expect(result.location.lat).toBe(70);
    expect(result.location.lon).toBe(25);
  });

  test('set_aurora_location returns a corrective error for empty input', async ({
    page,
  }) => {
    await installModelContextHarness(page);
    await mockApp(page);
    await gotoReady(page);

    const message = await page.evaluate(async () => {
      try {
        await window.__webmcp!.invoke('set_aurora_location', {});
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });

    expect(message).toMatch(/name|lat/i);
  });
});
