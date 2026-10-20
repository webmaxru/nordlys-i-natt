import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../app';
import { config } from '../config';

let app: FastifyInstance;
// config is `as const`; the tests flip these fields directly.
const links = config.appLinks as { appId: string; androidCertSha256: string[] };
const push = config.nativePush as { apnsTeamId: string; apnsBundleId: string };
const saved = { links: { ...config.appLinks }, push: { ...config.nativePush } };

beforeAll(async () => {
  app = await buildServer({ webDist: '/nonexistent' });
  await app.ready();
});
afterAll(async () => {
  Object.assign(links, saved.links);
  Object.assign(push, saved.push);
  await app.close();
});

describe('app link association files', () => {
  it('are 404 until the store identity is configured', async () => {
    links.androidCertSha256 = [];
    push.apnsTeamId = '';
    expect((await app.inject('/.well-known/assetlinks.json')).statusCode).toBe(404);
    expect((await app.inject('/.well-known/apple-app-site-association')).statusCode).toBe(404);
  });

  it('serve assetlinks.json for the Android package and certificate', async () => {
    links.appId = 'no.salnikov.nordlys';
    links.androidCertSha256 = ['AA:BB'];
    const res = await app.inject('/.well-known/assetlinks.json');
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].target).toEqual({
      namespace: 'android_app',
      package_name: 'no.salnikov.nordlys',
      sha256_cert_fingerprints: ['AA:BB'],
    });
  });

  it('serve apple-app-site-association as JSON, keeping e-mail pages in the browser', async () => {
    push.apnsTeamId = 'ABCDE12345';
    push.apnsBundleId = 'no.salnikov.nordlys';
    const res = await app.inject('/.well-known/apple-app-site-association');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const detail = res.json().applinks.details[0];
    expect(detail.appIDs).toEqual(['ABCDE12345.no.salnikov.nordlys']);
    expect(detail.components[0]).toEqual({ '/': '/varsel/*', exclude: true });
  });
});
