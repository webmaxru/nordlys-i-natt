type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export async function fetchJsonCached<T>(
  url: string,
  ttlSeconds: number,
  headers?: Record<string, string>,
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const existing = inFlight.get(url);
  if (existing) {
    return (await existing) as T;
  }

  const request = fetch(url, { headers }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
    }

    const value = (await response.json()) as unknown;
    cache.set(url, { expiresAt: Date.now() + ttlSeconds * 1000, value });
    return value;
  });

  inFlight.set(url, request);
  try {
    return (await request) as T;
  } finally {
    inFlight.delete(url);
  }
}
