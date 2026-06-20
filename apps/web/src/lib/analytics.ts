import { isAnalyticsAllowed, onConsentChange } from '../state/consent';

type AnalyticsProps = Record<string, string | number | boolean>;

let appInsights:
  | import('@microsoft/applicationinsights-web').ApplicationInsights
  | null = null;
let enabled = false;
let initPromise: Promise<void> | null = null;
let unsubscribeConsent: (() => void) | null = null;

const connectionString =
  import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING?.trim() ?? '';

export function initAnalytics(): void {
  if (typeof window === 'undefined' || !connectionString) {
    return;
  }

  subscribeToConsentChanges();

  if (isAnalyticsAllowed()) {
    void startAnalytics();
  }
}

export function trackEvent(name: string, props?: AnalyticsProps): void {
  if (!enabled || !appInsights) {
    return;
  }

  appInsights.trackEvent({ name }, props);
}

export function teardownAnalytics(): void {
  enabled = false;
  unsubscribeConsent?.();
  unsubscribeConsent = null;
  initPromise = null;
  appInsights?.unload(false);
  appInsights = null;
}

function subscribeToConsentChanges(): void {
  if (unsubscribeConsent) {
    return;
  }

  unsubscribeConsent = onConsentChange((consent) => {
    if (consent === 'granted') {
      void startAnalytics();
      return;
    }

    enabled = false;
  });
}

async function startAnalytics(): Promise<void> {
  if (enabled || !connectionString || !isAnalyticsAllowed()) {
    return;
  }

  if (!initPromise) {
    initPromise = import('@microsoft/applicationinsights-web').then(
      ({ ApplicationInsights }) => {
        appInsights = new ApplicationInsights({
          config: {
            connectionString,
            autoTrackPageVisitTime: false,
            disableAjaxTracking: true,
            disableCookiesUsage: true,
            disableExceptionTracking: true,
            disableFetchTracking: true,
            enableUnhandledPromiseRejectionTracking: false,
            enableAutoRouteTracking: false,
          },
        });
        appInsights.loadAppInsights();
      },
    );
  }

  await initPromise;
  enabled = isAnalyticsAllowed() && appInsights !== null;
}
