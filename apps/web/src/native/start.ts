/**
 * Native-shell start-up (only runs inside the iOS/Android app, see main.tsx):
 * deep links, push taps and ads.
 */
import { listenForTaps } from './push';
import { startAds } from './ads';

const APP_HOSTS = new Set(['nordlys.salnikov.no', 'nordlys.isainative.dev']);

export async function startNative(): Promise<void> {
  document.documentElement.classList.add('is-native-app');

  // Universal links / App Links (https://nordlys.salnikov.no/...) open inside the app.
  const { App } = await import('@capacitor/app');
  await App.addListener('appUrlOpen', ({ url }) => {
    try {
      const u = new URL(url);
      if (APP_HOSTS.has(u.hostname)) {
        const path = `${u.pathname}${u.search}${u.hash}` || '/';
        if (path !== `${location.pathname}${location.search}${location.hash}`) {
          window.location.assign(path);
        }
      }
    } catch {
      /* not a URL we handle */
    }
  });

  await listenForTaps().catch(() => undefined);
  // Let the first screen render before the consent form / ATT prompt.
  window.setTimeout(() => void startAds(), 1500);
}
