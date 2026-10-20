/**
 * AdMob in the iOS/Android app: the mobile counterpart of AdSense on the website.
 *
 * - Off unless an ad unit is configured: VITE_ADMOB_BANNER_ANDROID / VITE_ADMOB_BANNER_IOS
 *   (real IDs, from the AdMob console), or VITE_ADMOB_TESTING=true, which uses Google's
 *   official test units (debug builds). See docs/ADMOB.md.
 * - Consent first: Google's UMP form (EEA/UK/CH GDPR), then on iOS Apple's App Tracking
 *   Transparency prompt. Ads are only requested when UMP says canRequestAds.
 * - One adaptive banner at the bottom of the main screen. Hidden while the alert set-up panel
 *   is on screen (suppressAds), never on the notification flow.
 */
import { nativePlatform } from '../lib/platform';

// Google's published test ad units (https://developers.google.com/admob/android/test-ads,
// https://developers.google.com/admob/ios/test-ads).
const TEST_BANNER = {
  android: 'ca-app-pub-3940256099942544/9214589741',
  ios: 'ca-app-pub-3940256099942544/2435281174',
} as const;

const testing = import.meta.env.VITE_ADMOB_TESTING === 'true';

function bannerId(): string | null {
  const p = nativePlatform();
  if (p === 'web') return null;
  const real =
    p === 'android'
      ? import.meta.env.VITE_ADMOB_BANNER_ANDROID
      : import.meta.env.VITE_ADMOB_BANNER_IOS;
  if (real) return real;
  return testing ? TEST_BANNER[p] : null;
}

export function adsConfigured(): boolean {
  return bannerId() !== null;
}

let started = false;
let canShow = false;
let bannerUp = false;
const suppressors = new Set<string>();
let privacyOptionsRequired = false;

async function admob() {
  return (await import('@capacitor-community/admob')).AdMob;
}

/** Start AdMob once: consent, ATT, then the banner. Safe to call more than once. */
export async function startAds(): Promise<void> {
  if (started || !adsConfigured()) return;
  started = true;
  try {
    const AdMob = await admob();
    await AdMob.initialize({ initializeForTesting: testing });

    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') {
      consent = await AdMob.showConsentForm();
    }
    privacyOptionsRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';

    if (nativePlatform() === 'ios') {
      const att = await AdMob.trackingAuthorizationStatus();
      if (att.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }

    canShow = consent.canRequestAds;
    await refreshBanner();
  } catch (err) {
    console.warn('[ads] not started', err);
  }
}

async function refreshBanner(): Promise<void> {
  const id = bannerId();
  if (!canShow || !id) return;
  const AdMob = await admob();
  const shouldShow = suppressors.size === 0;
  if (shouldShow && !bannerUp) {
    const { BannerAdPosition, BannerAdSize } = await import('@capacitor-community/admob');
    await AdMob.showBanner({
      adId: id,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: testing,
    });
    bannerUp = true;
    document.documentElement.classList.add('has-native-banner');
  } else if (!shouldShow && bannerUp) {
    await AdMob.hideBanner();
    bannerUp = false;
    document.documentElement.classList.remove('has-native-banner');
  }
}

/** Hide the banner while `key` is active (e.g. the alert set-up panel is visible). */
export function suppressAds(key: string, on: boolean): void {
  if (on) suppressors.add(key);
  else suppressors.delete(key);
  void refreshBanner().catch(() => undefined);
}

/** True when the user must be offered a way to change their ad consent (EEA etc.). */
export function privacyOptionsAvailable(): boolean {
  return privacyOptionsRequired;
}

/** Re-open Google's consent form ("Ad privacy settings"). */
export async function showAdPrivacyOptions(): Promise<void> {
  const AdMob = await admob();
  await AdMob.showPrivacyOptionsForm();
}
