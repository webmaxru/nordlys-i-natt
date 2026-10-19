import {
  alertMessage,
  assessHours,
  cellKey,
  decideAlerts,
  DEFAULT_ALERT_RULE,
  markSent,
  nightsFromHours,
  type AlertChannel,
  type AlertDecision,
  type AlertMessage,
  type AlertPrefs,
  type AlertRuleConfig,
  type AlertState,
  type CloudPoint,
  type KpForecastPoint,
} from '@nordlys/shared';

/** One subscriber as the rule sees it, whatever the channel. */
export interface Recipient {
  id: string;
  lat: number;
  lon: number;
  name: string;
  lang: 'nb' | 'en';
  prefs: AlertPrefs;
  state: AlertState;
}

export type DeliveryResult = 'ok' | 'expired' | 'error' | 'deferred';

/** Each channel (web push, e-mail, native app) plugs into the same scheduler through this. */
export interface ChannelAdapter<T> {
  channel: AlertChannel;
  list(): Promise<T[]>;
  /** null = skip this row (e.g. an unconfirmed e-mail address). */
  toRecipient(row: T): Recipient | null;
  send(row: T, decision: AlertDecision, message: AlertMessage): Promise<DeliveryResult>;
  save(row: T, state: AlertState): Promise<void>;
  remove(row: T): Promise<void>;
  /** False when the channel isn't configured; its rows are then left untouched. */
  enabled(): boolean;
}

export interface RunDeps {
  now?: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each adapter has its own row type
  adapters: ChannelAdapter<any>[];
  getKpForecast(): Promise<KpForecastPoint[]>;
  getCloudForecast(lat: number, lon: number): Promise<CloudPoint[]>;
  rule?: Partial<AlertRuleConfig>;
  log?: (msg: string, data?: unknown) => void;
}

export interface ChannelStats {
  checked: number;
  sent: number;
  removed: number;
  failed: number;
  deferred: number;
}

export type RunStats = Record<AlertChannel, ChannelStats> & { cells: number; errors: number };

const emptyStats = (): ChannelStats => ({
  checked: 0,
  sent: 0,
  removed: 0,
  failed: 0,
  deferred: 0,
});

/**
 * One scheduler pass for every channel. Called every 20 minutes by the Container Apps Job.
 * The rule (packages/shared/src/alerts.ts) decides; this function only fetches data once per
 * ~11 km cell, asks the rule about each subscriber, delivers, and records what was sent.
 */
export async function runAlerts(deps: RunDeps): Promise<RunStats> {
  const now = deps.now ?? new Date();
  const rule = { ...DEFAULT_ALERT_RULE, ...deps.rule };
  const log = deps.log ?? (() => undefined);
  const stats: RunStats = {
    web: emptyStats(),
    email: emptyStats(),
    app: emptyStats(),
    cells: 0,
    errors: 0,
  };

  const kpForecast = await deps.getKpForecast();
  const cellHours = new Map<string, Promise<ReturnType<typeof assessHours> | null>>();

  const hoursFor = (r: Recipient) => {
    const key = cellKey(r.lat, r.lon);
    let p = cellHours.get(key);
    if (!p) {
      stats.cells += 1;
      const [lat, lon] = key.split(',').map(Number);
      p = deps
        .getCloudForecast(lat, lon)
        .then((cloudForecast) =>
          assessHours({
            location: { name: key, lat, lon },
            kpForecast,
            cloudForecast,
            now,
            config: rule,
          }),
        )
        .catch((err) => {
          stats.errors += 1;
          log('cloud forecast failed', { cell: key, err: String(err) });
          return null;
        });
      cellHours.set(key, p);
    }
    return p;
  };

  for (const adapter of deps.adapters) {
    if (!adapter.enabled()) continue;
    const s = stats[adapter.channel];
    let rows: unknown[];
    try {
      rows = await adapter.list();
    } catch (err) {
      stats.errors += 1;
      log(`${adapter.channel}: list failed`, String(err));
      continue;
    }
    for (const row of rows) {
      const r = adapter.toRecipient(row);
      if (!r) continue;
      s.checked += 1;
      try {
        const hours = await hoursFor(r);
        if (!hours) continue;
        const location = { name: r.name, lat: r.lat, lon: r.lon };
        const nights = nightsFromHours(hours, location, rule.maxCloudPct);
        const decisions = decideAlerts({
          hours,
          nights,
          prefs: r.prefs,
          state: r.state,
          now,
          config: rule,
        });
        let state = r.state;
        for (const d of decisions) {
          const msg = alertMessage(d, {
            lang: r.lang,
            place: location,
            channel: adapter.channel,
            timeZone: rule.timeZone,
          });
          const result = await adapter.send(row, d, msg);
          if (result === 'ok') {
            s.sent += 1;
            state = markSent(state, d);
          } else if (result === 'expired') {
            await adapter.remove(row);
            s.removed += 1;
            state = r.state;
            break;
          } else if (result === 'deferred') {
            s.deferred += 1;
          } else {
            s.failed += 1;
          }
        }
        if (state !== r.state) await adapter.save(row, state);
      } catch (err) {
        stats.errors += 1;
        log(`${adapter.channel}: recipient failed`, { id: r.id, err: String(err) });
      }
    }
  }
  return stats;
}
