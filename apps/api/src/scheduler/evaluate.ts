import { buildForecast } from '../services/forecast';
import { sendPush } from '../services/push';
import { createStore, type Sub } from '../services/store';

type EvaluateResult = {
  checked: number;
  sent: number;
  removed: number;
};

const sixHoursMs = 6 * 60 * 60 * 1000;

const messages = {
  nb: {
    title: 'Nordlys i natt? 🌌',
    body: (name: string, kp: number | null) =>
      `${name}: gode forhold nå${kp === null ? '' : ` (Kp ${kp})`}`,
  },
  en: {
    title: 'Aurora tonight? 🌌',
    body: (name: string, kp: number | null) =>
      `${name}: good conditions now${kp === null ? '' : ` (Kp ${kp})`}`,
  },
} satisfies Record<
  Sub['lang'],
  { title: string; body: (name: string, kp: number | null) => string }
>;

export async function evaluateAndNotify(): Promise<EvaluateResult> {
  const store = createStore();
  const subs = await store.list();
  const result: EvaluateResult = { checked: 0, sent: 0, removed: 0 };

  for (const sub of subs) {
    result.checked += 1;

    try {
      const forecast = await buildForecast({
        name: sub.name,
        lat: sub.lat,
        lon: sub.lon,
      });
      const verdict = forecast.verdict.verdict;
      const updatedSub: Sub = { ...sub, lastVerdict: verdict };

      if (verdict !== 'GO' || !shouldNotify(sub)) {
        await store.upsert(updatedSub);
        continue;
      }

      const bestKp = forecast.verdict.bestHour?.kp ?? null;
      const localized = messages[sub.lang];
      const pushResult = await sendPush(sub, {
        title: localized.title,
        body: localized.body(sub.name, bestKp),
        url: '/',
      });

      if (pushResult === 'expired') {
        await store.remove(sub.id);
        result.removed += 1;
        continue;
      }

      if (pushResult === 'ok') {
        updatedSub.lastNotifiedAt = new Date().toISOString();
        result.sent += 1;
      }

      await store.upsert(updatedSub);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[evaluate] subscription failed', { id: sub.id, err });
    }
  }

  return result;
}

function shouldNotify(sub: Sub): boolean {
  if (sub.lastVerdict !== 'GO') {
    return true;
  }

  if (!sub.lastNotifiedAt) {
    return true;
  }

  const lastNotified = Date.parse(sub.lastNotifiedAt);
  return (
    !Number.isFinite(lastNotified) ||
    Date.now() - lastNotified > sixHoursMs
  );
}
