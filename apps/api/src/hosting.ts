/**
 * Host handling for the move to a new custom domain (see docs/CUSTOM-DOMAIN.md).
 *
 * When CANONICAL_HOST and LEGACY_HOSTS are set, page requests that arrive on a legacy host get a
 * permanent redirect to the same path on the canonical host. API calls and service-worker files
 * are deliberately NOT redirected: an installed PWA on the old origin keeps working (a service
 * worker script may not be served through a redirect, and a redirected POST would lose its body).
 */

export function parseHostList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((h) => normalizeHost(h))
    .filter(Boolean);
}

export function normalizeHost(host: string | undefined): string {
  return (host ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

const KEEP_ON_LEGACY_HOST = new Set([
  '/sw.js',
  '/push-sw.js',
  '/registerSW.js',
  '/manifest.webmanifest',
]);

export function isLegacyPassthroughPath(path: string): boolean {
  return (
    path === '/api' ||
    path.startsWith('/api/') ||
    KEEP_ON_LEGACY_HOST.has(path) ||
    /^\/workbox-[\w-]+\.js$/.test(path)
  );
}

export interface HostingConfig {
  canonicalHost: string;
  legacyHosts: string[];
}

/** The absolute URL to redirect to, or null when the request should be served as is. */
export function legacyRedirectTarget(
  hostHeader: string | undefined,
  url: string | undefined,
  hosting: HostingConfig,
): string | null {
  const canonical = normalizeHost(hosting.canonicalHost);
  if (!canonical || hosting.legacyHosts.length === 0) return null;
  const host = normalizeHost(hostHeader);
  if (!host || host === canonical || !hosting.legacyHosts.includes(host)) return null;
  const target = url && url.startsWith('/') ? url : '/';
  const path = target.split('?')[0];
  if (isLegacyPassthroughPath(path)) return null;
  return `https://${canonical}${target}`;
}
