import 'dotenv/config';

/** Centralised runtime configuration (read once at startup). */
export const config = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? '0.0.0.0',

  met: {
    /** REQUIRED identifying User-Agent for api.met.no (MET Terms of Service). */
    userAgent: process.env.MET_USER_AGENT ?? 'NordlysINatt/1.0 (contact@example.com)',
    cacheTtlSeconds: Number(process.env.MET_CACHE_TTL_SECONDS ?? 900),
  },

  noaa: {
    cacheTtlSeconds: Number(process.env.NOAA_CACHE_TTL_SECONDS ?? 600),
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:contact@example.com',
  },

  store: {
    /** "file" (local JSON, no native deps) or "table" (Azure Table Storage). */
    driver: (process.env.STORE_DRIVER ?? 'file') as 'file' | 'table',
    filePath: process.env.STORE_FILE_PATH ?? './data/subscriptions.json',
    tableConnectionString: process.env.AZURE_TABLE_CONNECTION_STRING ?? '',
    tableName: process.env.AZURE_TABLE_NAME ?? 'subscriptions',
  },

  appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? '',

  /** Absolute path to the built web app to serve; empty = auto-detect. */
  webDistPath: process.env.WEB_DIST_PATH ?? '',
} as const;
