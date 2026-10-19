import { createHash, createSign, sign as edSign, createPrivateKey } from 'node:crypto';
import { connect } from 'node:http2';
import { config } from '../config';
import { collection } from './tables';

/** A phone running the iOS/Android app, registered with one saved place. */
export interface Device {
  id: string;
  platform: 'ios' | 'android';
  /** APNs device token (iOS) or FCM registration token (Android). */
  token: string;
  lat: number;
  lon: number;
  name: string;
  lang: 'nb' | 'en';
  alertDayBefore: boolean;
  alertNow: boolean;
  minChance: 'good' | 'high';
  createdAt: string;
  updatedAt: string;
  lastDayBeforeNight?: string;
  lastNowNight?: string;
  lastSentAt?: string;
}

export const devices = () => collection<Device>('devices');
export const deviceId = (token: string) =>
  createHash('sha256').update(token).digest('base64url').slice(0, 43);

export interface NativeMessage {
  title: string;
  body: string;
  url: string;
  ttlSeconds: number;
  /** Collapses alerts of the same kind for the same night. */
  collapseKey: string;
}

export type NativeResult = 'ok' | 'expired' | 'error' | 'disabled';

export function fcmConfigured(): boolean {
  return Boolean(config.nativePush.fcmServiceAccountJson);
}
export function apnsConfigured(): boolean {
  const c = config.nativePush;
  return Boolean(c.apnsKeyP8 && c.apnsKeyId && c.apnsTeamId && c.apnsBundleId);
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');

// ---------- FCM HTTP v1 (Android) ----------

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}
let fcmToken: { value: string; exp: number } | null = null;

function serviceAccount(): ServiceAccount {
  const raw = config.nativePush.fcmServiceAccountJson.trim();
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(json) as ServiceAccount;
}

async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (fcmToken && fcmToken.exp - 60 > now) return fcmToken.value;
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64u(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64u(signer.sign(sa.private_key))}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM token ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  fcmToken = { value: body.access_token, exp: now + body.expires_in };
  return body.access_token;
}

export async function sendFcm(token: string, msg: NativeMessage): Promise<NativeResult> {
  if (!fcmConfigured()) return 'disabled';
  try {
    const sa = serviceAccount();
    const access = await fcmAccessToken(sa);
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: msg.title, body: msg.body },
            data: { url: msg.url },
            android: {
              ttl: `${msg.ttlSeconds}s`,
              priority: 'HIGH',
              collapse_key: msg.collapseKey,
              notification: { channel_id: 'aurora-alerts', tag: msg.collapseKey },
            },
          },
        }),
      },
    );
    if (res.ok) return 'ok';
    const text = await res.text();
    if (res.status === 404 || /UNREGISTERED|registration-token-not-registered/i.test(text))
      return 'expired';
    if (res.status === 400 && /INVALID_ARGUMENT/.test(text) && /token/i.test(text))
      return 'expired';
    console.error('[fcm] send failed', res.status, text.slice(0, 300));
    return 'error';
  } catch (err) {
    console.error('[fcm] send error', err);
    return 'error';
  }
}

// ---------- APNs token-based auth (iOS) ----------

let apnsJwt: { value: string; iat: number } | null = null;

function apnsAuth(): string {
  const now = Math.floor(Date.now() / 1000);
  // Apple wants the token refreshed at most every 20 min and at least every 60 min.
  if (apnsJwt && now - apnsJwt.iat < 40 * 60) return apnsJwt.value;
  const c = config.nativePush;
  const key = createPrivateKey(
    c.apnsKeyP8.includes('BEGIN')
      ? c.apnsKeyP8
      : Buffer.from(c.apnsKeyP8, 'base64').toString('utf8'),
  );
  const header = b64u(JSON.stringify({ alg: 'ES256', kid: c.apnsKeyId }));
  const claims = b64u(JSON.stringify({ iss: c.apnsTeamId, iat: now }));
  const sig = edSign('sha256', Buffer.from(`${header}.${claims}`), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  apnsJwt = { value: `${header}.${claims}.${b64u(sig)}`, iat: now };
  return apnsJwt.value;
}

export function sendApns(token: string, msg: NativeMessage): Promise<NativeResult> {
  if (!apnsConfigured()) return Promise.resolve('disabled');
  const c = config.nativePush;
  const host = c.apnsProduction
    ? 'https://api.push.apple.com'
    : 'https://api.sandbox.push.apple.com';
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: NativeResult) => {
      if (!settled) {
        settled = true;
        session.close();
        resolve(r);
      }
    };
    const session = connect(host);
    session.on('error', (err) => {
      console.error('[apns] session error', err);
      done('error');
    });
    let auth: string;
    try {
      auth = apnsAuth();
    } catch (err) {
      console.error('[apns] key error', err);
      done('error');
      return;
    }
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${auth}`,
      'apns-topic': c.apnsBundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + msg.ttlSeconds),
      'apns-collapse-id': msg.collapseKey.slice(0, 64),
      'content-type': 'application/json',
    });
    let status = 0;
    let body = '';
    req.setTimeout(15_000, () => {
      req.close();
      done('error');
    });
    req.on('response', (h) => {
      status = Number(h[':status']);
    });
    req.on('data', (d: Buffer) => {
      body += d.toString();
    });
    req.on('end', () => {
      if (status === 200) return done('ok');
      if (status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(body))
        return done('expired');
      console.error('[apns] send failed', status, body.slice(0, 300));
      done('error');
    });
    req.on('error', () => done('error'));
    req.end(
      JSON.stringify({
        aps: { alert: { title: msg.title, body: msg.body }, sound: 'default' },
        url: msg.url,
      }),
    );
  });
}

export function sendNative(
  device: Pick<Device, 'platform' | 'token'>,
  msg: NativeMessage,
): Promise<NativeResult> {
  return device.platform === 'ios' ? sendApns(device.token, msg) : sendFcm(device.token, msg);
}
