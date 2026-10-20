#!/usr/bin/env node
// Builds apps/web for the native shell (VITE_TARGET=native) into apps/web/dist-native, which
// capacitor.config.ts uses as webDir. Run via `pnpm --filter @nordlys/mobile build:web`.
//
// Environment (all optional):
//   API_BASE_URL               API origin baked into the app (default https://nordlys.salnikov.no)
//   ADMOB_BANNER_ANDROID       real AdMob banner unit for Android (ca-app-pub-.../...)
//   ADMOB_BANNER_IOS           real AdMob banner unit for iOS
//   ADMOB_TESTING=true         use Google's test ad units (debug builds)
// Android push is switched on when android/app/google-services.json exists (Firebase).
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mobile = resolve(here, '..');
const root = resolve(mobile, '../..');

const env = {
  ...process.env,
  VITE_TARGET: 'native',
  VITE_API_BASE_URL: process.env.API_BASE_URL || 'https://nordlys.salnikov.no',
  VITE_ANDROID_PUSH: existsSync(resolve(mobile, 'android/app/google-services.json')) ? '1' : '',
  VITE_ADMOB_BANNER_ANDROID: process.env.ADMOB_BANNER_ANDROID || '',
  VITE_ADMOB_BANNER_IOS: process.env.ADMOB_BANNER_IOS || '',
  VITE_ADMOB_TESTING: process.env.ADMOB_TESTING === 'true' ? 'true' : '',
  // AdSense is for the website only.
  ADSENSE_CLIENT: '',
};

console.log(
  `[build-web] api=${env.VITE_API_BASE_URL} androidPush=${env.VITE_ANDROID_PUSH || 'off'} ` +
    `ads=${env.VITE_ADMOB_BANNER_ANDROID || env.VITE_ADMOB_BANNER_IOS ? 'real' : env.VITE_ADMOB_TESTING ? 'test' : 'off'}`,
);
const run = (cmd) => execSync(cmd, { cwd: root, env, stdio: 'inherit' });
run('pnpm --filter @nordlys/shared build');
run('pnpm --filter @nordlys/web build');
