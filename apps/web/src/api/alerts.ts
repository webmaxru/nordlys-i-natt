import { apiFetch } from './client';

export type ChanceLevel = 'none' | 'low' | 'good' | 'high';

export interface NightSummary {
  nightOf: string;
  chance: ChanceLevel;
  label: string;
  darkHours: number;
  visibleHours: number;
  maxKp: number | null;
  requiredKp: number;
  minCloudPct: number | null;
  bestTime: string | null;
  complete: boolean;
}

export interface AlertStatus {
  web: { enabled: boolean };
  email: { enabled: boolean };
  app: { android: boolean; ios: boolean };
}

export interface AlertPrefsInput {
  dayBefore: boolean;
  now: boolean;
  minChance: 'good' | 'high';
}

export function fetchAlertStatus(): Promise<AlertStatus> {
  return apiFetch<AlertStatus>('/api/alerts/status');
}

export interface NightsResponse {
  tonight: string;
  today: string;
  nights: NightSummary[];
}

export function fetchNights(lat: number, lon: number, lang: string): Promise<NightsResponse> {
  const q = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    lang: lang.startsWith('nb') ? 'nb' : 'en',
  });
  return apiFetch<NightsResponse>(`/api/alerts/nights?${q.toString()}`);
}

export type EmailSignupResult =
  | 'check_inbox'
  | 'too_many_places'
  | 'disabled'
  | 'invalid'
  | 'rate_limited'
  | 'error';

export async function subscribeEmail(input: {
  email: string;
  location: { lat: number; lon: number; name: string };
  lang: string;
  prefs: AlertPrefsInput;
  website: string;
  elapsedMs: number;
}): Promise<EmailSignupResult> {
  try {
    await apiFetch('/api/email/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, lang: input.lang.startsWith('nb') ? 'nb' : 'en' }),
    });
    return 'check_inbox';
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 409) return 'too_many_places';
    if (status === 503) return 'disabled';
    if (status === 400) return 'invalid';
    if (status === 429) return 'rate_limited';
    return 'error';
  }
}
