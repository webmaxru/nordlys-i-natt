import appInsights from 'applicationinsights';
import { config } from './config';

type TelemetryProps = Record<string, string | number | boolean>;

let initialized = false;
let enabled = false;

export function initTelemetry(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  if (!config.appInsightsConnectionString) {
    return;
  }

  appInsights
    .setup(config.appInsightsConnectionString)
    .setAutoCollectConsole(false, false)
    .setAutoCollectDependencies(false)
    .setAutoCollectExceptions(false)
    .setAutoCollectHeartbeat(false)
    .setAutoCollectPerformance(false, false)
    .setAutoCollectPreAggregatedMetrics(false)
    .setAutoCollectRequests(false)
    .setSendLiveMetrics(false)
    .setUseDiskRetryCaching(false)
    .start();

  appInsights.defaultClient.config.samplingPercentage = 30;
  enabled = true;
}

export function trackEvent(name: string, props?: TelemetryProps): void {
  if (!enabled) {
    return;
  }

  appInsights.defaultClient.trackEvent({
    name,
    properties: stringifyProps(props),
  });
}

function stringifyProps(
  props: TelemetryProps | undefined,
): Record<string, string> | undefined {
  if (!props) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, String(value)]),
  );
}
