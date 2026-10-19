import type { AlertDecision, ChanceLevel } from './alerts';

export type AlertLang = 'nb' | 'en';
export type AlertChannel = 'web' | 'email' | 'app';

export interface AlertMessage {
  title: string;
  body: string;
  /** Path + query on the site (no host), e.g. "/?lat=69.65&lon=18.96&name=Troms%C3%B8". */
  path: string;
  /** Short line for an e-mail preheader / notification subtitle. */
  summary: string;
}

const LOCALE: Record<AlertLang, string> = { nb: 'nb-NO', en: 'en-GB' };

function fmtTime(iso: string, lang: AlertLang, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** "tirsdag 21. oktober" / "Tuesday 21 October" for a YYYY-MM-DD night. */
export function fmtNight(nightOf: string, lang: AlertLang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${nightOf}T12:00:00Z`));
}

const CHANCE_WORD: Record<AlertLang, Record<ChanceLevel, string>> = {
  nb: { high: 'Stor sjanse', good: 'God sjanse', low: 'Liten sjanse', none: 'Ingen sjanse' },
  en: { high: 'High chance', good: 'Good chance', low: 'Low chance', none: 'No chance' },
};

export function chanceLabel(chance: ChanceLevel, lang: AlertLang): string {
  return CHANCE_WORD[lang][chance];
}

/** Link back to the forecast for the subscriber's place. */
export function placePath(
  place: { lat: number; lon: number; name: string },
  channel: AlertChannel,
): string {
  const q = new URLSearchParams({
    lat: place.lat.toFixed(4),
    lon: place.lon.toFixed(4),
    name: place.name,
    utm_source: 'alert',
    utm_medium: channel,
  });
  return `/?${q.toString()}`;
}

/**
 * The words of an alert, identical across web push, e-mail and native push.
 * Times are local (Europe/Oslo by default).
 */
export function alertMessage(
  decision: AlertDecision,
  opts: {
    lang: AlertLang;
    place: { lat: number; lon: number; name: string };
    channel: AlertChannel;
    timeZone?: string;
  },
): AlertMessage {
  const { lang, place, channel } = opts;
  const tz = opts.timeZone ?? 'Europe/Oslo';
  const path = placePath(place, channel);
  const hour = decision.hour;
  const kp = hour?.kp ?? decision.night.maxKp;
  const cloud = hour?.cloudPct ?? decision.night.minCloudPct;
  const at = hour ? fmtTime(hour.time, lang, tz) : null;
  const night = fmtNight(decision.nightOf, lang);
  const chance = chanceLabel(decision.night.chance, lang);

  if (decision.kind === 'dayBefore') {
    if (lang === 'nb') {
      const bits = [
        at ? `best rundt kl. ${at}` : null,
        kp !== null && kp !== undefined ? `Kp ${kp} ventet` : null,
        cloud !== null && cloud !== undefined ? `ca. ${Math.round(cloud)} % skydekke` : null,
      ].filter(Boolean);
      return {
        title: `🌌 ${chance} for nordlys i morgen kveld`,
        body: `${place.name}, kvelden ${night}: ${bits.join(', ')}. Sjekk igjen i morgen ettermiddag – skyvarselet kan endre seg.`,
        summary: `${chance} for nordlys over ${place.name} i morgen kveld (${night}).`,
        path,
      };
    }
    const bits = [
      at ? `best around ${at}` : null,
      kp !== null && kp !== undefined ? `Kp ${kp} forecast` : null,
      cloud !== null && cloud !== undefined ? `~${Math.round(cloud)}% cloud` : null,
    ].filter(Boolean);
    return {
      title: `🌌 ${chance} of aurora tomorrow night`,
      body: `${place.name}, the night of ${night}: ${bits.join(', ')}. Check again tomorrow afternoon – the cloud forecast can change.`,
      summary: `${chance} of aurora over ${place.name} tomorrow night (${night}).`,
      path,
    };
  }

  if (lang === 'nb') {
    return {
      title: '🌌 Nordlyset kan være synlig nå',
      body: `${place.name}: mørkt, klart${kp !== null && kp !== undefined ? ` og Kp ${kp}` : ''}. Gå ut, bort fra lys, og se mot nord.`,
      summary: `Nordlys kan være synlig over ${place.name} nå.`,
      path,
    };
  }
  return {
    title: '🌌 Aurora may be visible now',
    body: `${place.name}: dark, clear skies${kp !== null && kp !== undefined ? ` and Kp ${kp}` : ''}. Head outside, away from lights, and look north.`,
    summary: `The aurora may be visible over ${place.name} now.`,
    path,
  };
}
