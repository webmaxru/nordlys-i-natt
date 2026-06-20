export const CONSENT_KEY = 'nordlys.consent.analytics';

export type ConsentState = 'granted' | 'denied' | 'unset';

type StoredConsentState = Exclude<ConsentState, 'unset'>;

const CONSENT_CHANGE_EVENT = 'nordlys-consent-change';

function isStoredConsentState(value: string | null): value is StoredConsentState {
  return value === 'granted' || value === 'denied';
}

export function getAnalyticsConsent(): ConsentState {
  if (typeof window === 'undefined') {
    return 'unset';
  }

  const storedValue = window.localStorage.getItem(CONSENT_KEY);
  return isStoredConsentState(storedValue) ? storedValue : 'unset';
}

export function setAnalyticsConsent(v: 'granted' | 'denied'): void {
  window.localStorage.setItem(CONSENT_KEY, v);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: v }));
}

export function onConsentChange(cb: (v: ConsentState) => void): () => void {
  const listener = (event: Event) => {
    cb((event as CustomEvent<ConsentState>).detail);
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, listener);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
}

export function isAnalyticsAllowed(): boolean {
  return getAnalyticsConsent() === 'granted';
}
