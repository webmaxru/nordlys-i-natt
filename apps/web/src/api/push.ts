import type { NamedLocation } from '@nordlys/shared';
import { apiFetch } from './client';

const storageKey = 'nordlys.push.id';

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getPermission(): NotificationPermission {
  if (!isPushSupported()) {
    return 'denied';
  }

  return Notification.permission;
}

export function getLocalSubscriptionId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(storageKey);
}

export async function subscribeToPush(
  location: NamedLocation,
  lang: string,
): Promise<{ id: string }> {
  const key = await getPublicKey();
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  const result = await apiFetch<{ id: string }>('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: toPayload(subscription),
      location: {
        lat: location.lat,
        lon: location.lon,
        name: location.name,
      },
      lang: lang.startsWith('nb') ? 'nb' : 'en',
    }),
  });

  window.localStorage.setItem(storageKey, result.id);
  return result;
}

export async function unsubscribeFromPush(): Promise<void> {
  const id = getLocalSubscriptionId();
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  try {
    if (id) {
      await apiFetch<null>(`/api/subscriptions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
  } finally {
    window.localStorage.removeItem(storageKey);
  }
}

async function getPublicKey(): Promise<string> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) {
    return envKey;
  }

  const response = await apiFetch<{ publicKey: string }>('/api/push/public-key');
  if (!response.publicKey) {
    throw new Error('Missing VAPID public key');
  }

  return response.publicKey;
}

function toPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription');
  }

  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  };
}

function urlBase64ToUint8Array(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return buffer;
}
