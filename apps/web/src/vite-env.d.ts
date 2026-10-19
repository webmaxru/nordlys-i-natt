/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** Store listing URLs, shown on the website's "App" tab once the apps are live. */
  readonly VITE_APP_STORE_URL?: string;
  readonly VITE_PLAY_STORE_URL?: string;
  /** "native" for the Capacitor build (no service worker, no AdSense). */
  readonly VITE_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
