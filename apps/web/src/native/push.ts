/**
 * Native push inside the iOS/Android app (Capacitor). Never used on the website, where
 * browser push (src/api/push.ts) is the channel. The device token is registered with the
 * saved place at POST /api/devices; the server sends through FCM (Android) or APNs (iOS)
 * with the same day-before rule as every other channel (packages/shared/src/alerts.ts).
 */
import type { NamedLocation } from '@nordlys/shared';
import { apiFetch } from '../api/client';
import { nativePlatform } from '../lib/platform';

export type NativePrefs = { dayBefore: boolean; now: boolean; minChance: 'good' | 'high' };

const DEVICE_KEY = 'nordlys.native-device';

type StoredDevice = { id: string; place: string };

export function getRegisteredDevice(): StoredDevice | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? (JSON.parse(raw) as StoredDevice) : null;
  } catch {
    return null;
  }
}

/**
 * Android push needs Firebase (google-services.json) in the native build; without it,
 * registering would crash the app. The mobile build sets VITE_ANDROID_PUSH=1 when the file
 * is present (apps/mobile/scripts/build-web.mjs). iOS needs only the APNs entitlement.
 */
export function nativePushAvailable(): boolean {
  const p = nativePlatform();
  if (p === 'ios') return true;
  if (p === 'android') return import.meta.env.VITE_ANDROID_PUSH === '1';
  return false;
}

async function plugin() {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  return PushNotifications;
}

/** Ask for permission (the OS dialog), get a token and register it with the place. */
export async function enableNativePush(
  location: NamedLocation,
  lang: string,
  prefs: NativePrefs,
): Promise<'ok' | 'denied' | 'error'> {
  const PushNotifications = await plugin();
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return 'denied';

  const token = await new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('registration timed out')), 20_000);
    void PushNotifications.addListener('registration', (t) => {
      window.clearTimeout(timer);
      resolve(t.value);
    });
    void PushNotifications.addListener('registrationError', (e) => {
      window.clearTimeout(timer);
      reject(new Error(e.error));
    });
    void PushNotifications.register();
  }).finally(() => {
    void PushNotifications.removeAllListeners().then(() => listenForTaps());
  });

  try {
    const { id } = await apiFetch<{ id: string }>('/api/devices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: nativePlatform(),
        location: { lat: location.lat, lon: location.lon, name: location.name },
        lang: lang.startsWith('en') ? 'en' : 'nb',
        prefs,
      }),
    });
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ id, place: location.name }));
    return 'ok';
  } catch {
    return 'error';
  }
}

export async function disableNativePush(): Promise<void> {
  const device = getRegisteredDevice();
  if (device) {
    await apiFetch(`/api/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' }).catch(
      () => undefined,
    );
  }
  localStorage.removeItem(DEVICE_KEY);
  const PushNotifications = await plugin();
  await PushNotifications.unregister().catch(() => undefined);
}

/** Tapping an alert opens the forecast for its place (the alert carries a path like /?lat=..). */
export async function listenForTaps(): Promise<void> {
  if (!nativePushAvailable()) return;
  const PushNotifications = await plugin();
  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = (action.notification.data ?? {}) as { url?: string };
    if (typeof data.url === 'string' && data.url.startsWith('/')) {
      window.location.assign(data.url);
    }
  });
}
