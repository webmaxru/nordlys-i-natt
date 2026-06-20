import webPush from 'web-push';
import { config } from '../config';
import type { Sub } from './store';

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export type PushResult = 'ok' | 'expired' | 'error';

const vapidConfigured = Boolean(
  config.vapid.publicKey && config.vapid.privateKey,
);

if (vapidConfigured) {
  webPush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey,
  );
}

export async function sendPush(
  sub: Sub,
  payload: PushPayload,
): Promise<PushResult> {
  if (!vapidConfigured) {
    return 'error';
  }

  try {
    await webPush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys,
      },
      JSON.stringify(payload),
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
