import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config';

/**
 * App Links (Android) and universal links (iOS): lets https://nordlys.salnikov.no/... open in
 * the installed app. Served only once the store identity is configured (see docs/MOBILE-RELEASE.md):
 * - ANDROID_CERT_SHA256: comma-separated SHA-256 fingerprints of the app signing certificate(s)
 *   (Play Console → App integrity → App signing), plus APP_ID (default no.salnikov.nordlys).
 * - APNS_TEAM_ID + APNS_BUNDLE_ID: the Apple team and bundle ID.
 */
const routes: FastifyPluginAsync = async (app) => {
  app.get('/.well-known/assetlinks.json', async (_req, reply) => {
    const { appId, androidCertSha256 } = config.appLinks;
    if (androidCertSha256.length === 0) return reply.code(404).send({ error: 'Not configured' });
    reply.header('cache-control', 'public, max-age=3600');
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: appId,
          sha256_cert_fingerprints: androidCertSha256,
        },
      },
    ];
  });

  app.get('/.well-known/apple-app-site-association', async (_req, reply) => {
    const { apnsTeamId, apnsBundleId } = config.nativePush;
    if (!apnsTeamId) return reply.code(404).send({ error: 'Not configured' });
    reply.header('cache-control', 'public, max-age=3600').type('application/json');
    return {
      applinks: {
        details: [
          {
            appIDs: [`${apnsTeamId}.${apnsBundleId}`],
            // The app itself and alert links; e-mail pages (/varsel/...) and the API stay in the browser.
            components: [
              { '/': '/varsel/*', exclude: true },
              { '/': '/api/*', exclude: true },
              { '/': '/*' },
            ],
          },
        ],
      },
    };
  });
};

export default routes;
