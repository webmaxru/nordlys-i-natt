import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Nordlys i natt? native shell. The web app (apps/web) is built with VITE_TARGET=native into
 * apps/web/dist-native and bundled into the app; the API is https://nordlys.salnikov.no.
 *
 * APP_ID is the store identity (Android applicationId / iOS bundle ID). It is PERMANENT once the
 * app is published: changing it later means a new store listing. Default: no.salnikov.nordlys.
 */
const appId = process.env.APP_ID || 'no.salnikov.nordlys';

const config: CapacitorConfig = {
  appId,
  appName: 'Nordlys i natt',
  webDir: '../web/dist-native',
  // https://localhost on Android (secure context, same as iOS's capacitor://localhost).
  server: { androidScheme: 'https' },
  android: {
    // Release builds must not allow WebView debugging.
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
  ios: {
    contentInset: 'never',
    scheme: 'Nordlys i natt',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#0b1020',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b1020',
      overlaysWebView: false,
    },
  },
};

export default config;
