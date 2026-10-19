import 'dotenv/config';
import { parseHostList } from './hosting';

/** Centralised runtime configuration (read once at startup). */
export const config = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? '0.0.0.0',

  met: {
    /** REQUIRED identifying User-Agent for api.met.no (MET Terms of Service).
     *  MET 403s obvious placeholders (e.g. "example.com"). In production set a
     *  real contact via MET_USER_AGENT. */
    userAgent: process.env.MET_USER_AGENT ?? 'nordlys-i-natt/1.0 github.com/nordlys-i-natt',
    cacheTtlSeconds: Number(process.env.MET_CACHE_TTL_SECONDS ?? 900),
  },

  noaa: {
    cacheTtlSeconds: Number(process.env.NOAA_CACHE_TTL_SECONDS ?? 600),
  },

  /** Suppress "happening now" alerts during these Europe/Oslo hours [start, end). start === end disables. */
  quietHours: {
    start: Number(process.env.QUIET_HOURS_START ?? 2),
    end: Number(process.env.QUIET_HOURS_END ?? 6),
  },

  /** Local hours [start, end) in which the day-before heads-up may go out (see packages/shared/src/alerts.ts). */
  dayBeforeWindow: {
    start: Number(process.env.DAY_BEFORE_START ?? 15),
    end: Number(process.env.DAY_BEFORE_END ?? 21),
  },

  /** Public origin used in links inside e-mails and notifications. */
  publicBaseUrl: (
    process.env.PUBLIC_BASE_URL ||
    (process.env.CANONICAL_HOST
      ? `https://${process.env.CANONICAL_HOST}`
      : 'https://nordlys.salnikov.no')
  ).replace(/\/+$/, ''),

  /**
   * E-mail alerts (Azure Communication Services Email). Off unless EMAIL_ENABLED=true AND a
   * transport is configured. EMAIL_TRANSPORT: "acs" (default in Azure) or "outbox" (writes JSON
   * files to EMAIL_OUTBOX_DIR; local dev and tests).
   */
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    transport: (process.env.EMAIL_TRANSPORT ?? 'acs') as 'acs' | 'outbox',
    acsConnectionString: process.env.ACS_CONNECTION_STRING ?? '',
    sender: process.env.EMAIL_SENDER ?? '',
    senderName: process.env.EMAIL_SENDER_NAME ?? 'Nordlys i natt',
    replyTo: process.env.EMAIL_REPLY_TO ?? '',
    outboxDir: process.env.EMAIL_OUTBOX_DIR ?? './data/outbox',
    /** Pause between sends; ACS's default custom-domain quota is 30/min and 100/h. */
    sendIntervalMs: Number(process.env.EMAIL_SEND_INTERVAL_MS ?? 2100),
    maxPerRun: Number(process.env.EMAIL_MAX_PER_RUN ?? 90),
    maxPlacesPerAddress: 5,
  },

  /** Native push for the iOS/Android apps: FCM HTTP v1 (Android) + APNs token auth (iOS). */
  nativePush: {
    fcmServiceAccountJson: process.env.FCM_SERVICE_ACCOUNT_JSON ?? '',
    apnsKeyP8: process.env.APNS_KEY_P8 ?? '',
    apnsKeyId: process.env.APNS_KEY_ID ?? '',
    apnsTeamId: process.env.APNS_TEAM_ID ?? '',
    apnsBundleId: process.env.APNS_BUNDLE_ID ?? 'no.salnikov.nordlys',
    apnsProduction: process.env.APNS_PRODUCTION !== 'false',
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
    /** Directory for the "file" driver's other collections (e-mail subscribers, devices). */
    fileDir: process.env.STORE_FILE_DIR ?? './data',
  },

  appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? '',

  hosting: {
    /** Primary public hostname (e.g. nordlys.salnikov.no). Empty = no host redirects. */
    canonicalHost: process.env.CANONICAL_HOST ?? '',
    /** Comma-separated old hostnames whose page requests 301 to canonicalHost. */
    legacyHosts: parseHostList(process.env.LEGACY_HOSTS),
  },

  /** Absolute path to the built web app to serve; empty = auto-detect. */
  webDistPath: process.env.WEB_DIST_PATH ?? '',
} as const;
