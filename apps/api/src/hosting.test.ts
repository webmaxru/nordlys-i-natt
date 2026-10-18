import { describe, expect, it } from 'vitest';
import { legacyRedirectTarget, parseHostList } from './hosting';

const hosting = {
  canonicalHost: 'nordlys.salnikov.no',
  legacyHosts: parseHostList(' Nordlys.isainative.dev , other.example '),
};

describe('parseHostList', () => {
  it('normalises case, spaces and ports', () => {
    expect(parseHostList('A.example:443, ,b.example.')).toEqual(['a.example', 'b.example']);
    expect(parseHostList(undefined)).toEqual([]);
  });
});

describe('legacyRedirectTarget', () => {
  it('redirects pages on a legacy host to the canonical host, keeping path and query', () => {
    expect(
      legacyRedirectTarget('nordlys.isainative.dev', '/artikler/kp-indeksen/?x=1', hosting),
    ).toBe('https://nordlys.salnikov.no/artikler/kp-indeksen/?x=1');
    expect(legacyRedirectTarget('NORDLYS.isainative.dev:443', '/', hosting)).toBe(
      'https://nordlys.salnikov.no/',
    );
  });

  it('leaves the canonical host, unknown hosts and the default app host alone', () => {
    expect(legacyRedirectTarget('nordlys.salnikov.no', '/', hosting)).toBeNull();
    expect(
      legacyRedirectTarget('nordlys-app.norwayeast.azurecontainerapps.io', '/', hosting),
    ).toBeNull();
    expect(legacyRedirectTarget('127.0.0.1:8080', '/api/health', hosting)).toBeNull();
  });

  it('never redirects the API or service-worker files', () => {
    for (const p of [
      '/api/forecast?lat=1',
      '/api',
      '/sw.js',
      '/push-sw.js',
      '/registerSW.js',
      '/manifest.webmanifest',
      '/workbox-5ffe50d4.js',
    ]) {
      expect(legacyRedirectTarget('nordlys.isainative.dev', p, hosting)).toBeNull();
    }
  });

  it('is off until both settings are present', () => {
    expect(
      legacyRedirectTarget('nordlys.isainative.dev', '/', {
        canonicalHost: '',
        legacyHosts: ['nordlys.isainative.dev'],
      }),
    ).toBeNull();
    expect(
      legacyRedirectTarget('nordlys.isainative.dev', '/', {
        canonicalHost: 'nordlys.salnikov.no',
        legacyHosts: [],
      }),
    ).toBeNull();
  });
});
