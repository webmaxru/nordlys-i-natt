import webPush from 'web-push';
import { config } from '../config';
import type { Sub } from './store';

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  /** Replaces an earlier notification with the same tag instead of stacking. */
  tag?: string;
};

export type PushOptions = {
  /** Seconds the push service keeps trying to deliver (web-push defaults to 4 weeks). */
  ttlSeconds?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  /** Replaces a not-yet-delivered message with the same topic (max 32 url-safe chars). */
  topic?: string;
};

export type PushResult = 'ok' | 'expired' | 'error';

export const vapidConfigured = Boolean(config.vapid.publicKey && config.vapid.privateKey);

if (vapidConfigured) {
  webPush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
}

export async function sendPush(
  sub: Sub,
  payload: PushPayload,
  options: PushOptions = {},
): Promise<PushResult> {
  if (!vapidConfigured) {
    return 'error';
  }

  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload),
      {
        TTL: options.ttlSeconds ?? 12 * 3600,
        urgency: options.urgency ?? 'normal',
        ...(options.topic ? { topic: options.topic } : {}),
      },
    );
    return 'ok';
  } catch (err) {
    const statusCode =
      err instanceof Error && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    if (statusCode === 404 || statusCode === 410) {
      return 'expired';
    }

    return 'error';
  }
}
