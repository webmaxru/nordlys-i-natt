import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cellKey } from '@nordlys/shared';
import { config } from '../../config';
import { collection } from '../tables';
import { emailTransport, type SendResult } from './transport';
import { alreadyEmail, confirmEmail, type Lang } from './templates';

export interface EmailSub {
  id: string;
  /** Lower-cased address. */
  email: string;
  /** sha256 of the address, so "same address" lookups don't need the address itself. */
  emailHash: string;
  /** Random secret in every link (confirm, manage, unsubscribe). */
  token: string;
  status: 'pending' | 'active';
  lat: number;
  lon: number;
  name: string;
  lang: Lang;
  alertDayBefore: boolean;
  alertNow: boolean;
  minChance: 'good' | 'high';
  createdAt: string;
  confirmedAt?: string;
  lastConfirmSentAt?: string;
  confirmSends?: number;
  lastDayBeforeNight?: string;
  lastNowNight?: string;
  lastSentAt?: string;
}

export const emailSubs = () => collection<EmailSub>('emailsubs');

export const hashEmail = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

export function tokenMatches(sub: EmailSub | null, token: unknown): sub is EmailSub {
  if (!sub || typeof token !== 'string') return false;
  const a = Buffer.from(sub.token);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function links(sub: Pick<EmailSub, 'id' | 'token' | 'lang' | 'lat' | 'lon' | 'name'>) {
  const base = config.publicBaseUrl;
  const q = `id=${encodeURIComponent(sub.id)}&t=${encodeURIComponent(sub.token)}`;
  return {
    confirm: `${base}/varsel/bekreft?${q}`,
    manage: `${base}/varsel/innstillinger?${q}`,
    unsubscribe: `${base}/varsel/avmeld?${q}`,
    /** Target of List-Unsubscribe-Post (RFC 8058 one-click). */
    oneClick: `${base}/api/email/unsubscribe?${q}`,
  };
}

export function listUnsubscribeHeaders(sub: EmailSub): Record<string, string> {
  return {
    'List-Unsubscribe': `<${links(sub).oneClick}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

const CONFIRM_COOLDOWN_MS = 10 * 60_000;
const MAX_CONFIRM_SENDS = 3;

export type SignupOutcome =
  | { status: 'confirmation_sent'; id: string }
  | { status: 'already_active'; id: string }
  | { status: 'cooldown'; id: string }
  | { status: 'too_many_places' }
  | { status: 'send_failed'; error: string };

/**
 * Double opt-in signup. Every outcome looks the same to the caller's user ("check your inbox"),
 * so the API never reveals whether an address is already subscribed.
 */
export async function signup(input: {
  email: string;
  lat: number;
  lon: number;
  name: string;
  lang: Lang;
  alertDayBefore: boolean;
  alertNow: boolean;
  minChance: 'good' | 'high';
  now?: Date;
}): Promise<SignupOutcome> {
  const transport = emailTransport();
  if (!transport) return { status: 'send_failed', error: 'email disabled' };
  const now = input.now ?? new Date();
  const store = emailSubs();
  const emailHash = hashEmail(input.email);
  const mine = (await store.list()).filter((s) => s.emailHash === emailHash);
  const cell = cellKey(input.lat, input.lon);
  let sub = mine.find((s) => cellKey(s.lat, s.lon) === cell) ?? null;

  if (!sub && mine.length >= config.email.maxPlacesPerAddress) return { status: 'too_many_places' };

  if (sub && sub.status === 'active') {
    const msg = alreadyEmail(sub.lang, sub.name, links(sub));
    const sent = await transport.send({
      to: sub.email,
      ...msg,
      headers: listUnsubscribeHeaders(sub),
    });
    return sent.ok
      ? { status: 'already_active', id: sub.id }
      : { status: 'send_failed', error: sent.error };
  }

  if (sub?.lastConfirmSentAt) {
    const since = now.getTime() - Date.parse(sub.lastConfirmSentAt);
    if (
      since < CONFIRM_COOLDOWN_MS ||
      ((sub.confirmSends ?? 0) >= MAX_CONFIRM_SENDS && since < 24 * 3600_000)
    ) {
      return { status: 'cooldown', id: sub.id };
    }
  }

  const fresh = !sub;
  sub = {
    ...(sub ?? {
      id: randomBytes(12).toString('base64url'),
      token: randomBytes(24).toString('base64url'),
      createdAt: now.toISOString(),
      status: 'pending' as const,
      confirmSends: 0,
    }),
    email: input.email,
    emailHash,
    lat: input.lat,
    lon: input.lon,
    name: input.name,
    lang: input.lang,
    alertDayBefore: input.alertDayBefore,
    alertNow: input.alertNow,
    minChance: input.minChance,
  } as EmailSub;
  if (
    !fresh &&
    sub.lastConfirmSentAt &&
    now.getTime() - Date.parse(sub.lastConfirmSentAt) >= 24 * 3600_000
  ) {
    sub.confirmSends = 0;
  }

  const l = links(sub);
  const msg = confirmEmail(sub.lang, sub.name, { ...l, confirm: l.confirm });
  const sent: SendResult = await transport.send({
    to: sub.email,
    ...msg,
    headers: listUnsubscribeHeaders(sub),
  });
  if (!sent.ok) return { status: 'send_failed', error: sent.error };
  sub.lastConfirmSentAt = now.toISOString();
  sub.confirmSends = (sub.confirmSends ?? 0) + 1;
  await store.upsert(sub);
  return { status: 'confirmation_sent', id: sub.id };
}

export async function confirm(
  id: string,
  token: unknown,
  now = new Date(),
): Promise<EmailSub | null> {
  const store = emailSubs();
  const sub = await store.get(id);
  if (!tokenMatches(sub, token)) return null;
  if (sub.status !== 'active') {
    sub.status = 'active';
    sub.confirmedAt = now.toISOString();
    await store.upsert(sub);
  }
  return sub;
}

export async function unsubscribe(id: string, token: unknown): Promise<EmailSub | null> {
  const store = emailSubs();
  const sub = await store.get(id);
  if (!tokenMatches(sub, token)) return null;
  await store.remove(id);
  return sub;
}

export async function updatePrefs(
  id: string,
  token: unknown,
  prefs: Partial<Pick<EmailSub, 'alertDayBefore' | 'alertNow' | 'minChance' | 'lang'>>,
): Promise<EmailSub | null> {
  const store = emailSubs();
  const sub = await store.get(id);
  if (!tokenMatches(sub, token)) return null;
  const next = { ...sub, ...prefs };
  await store.upsert(next);
  return next;
}

/** Pending signups that were never confirmed are deleted after 7 days. */
export async function prunePending(now = new Date()): Promise<number> {
  const store = emailSubs();
  let removed = 0;
  for (const s of await store.list()) {
    if (
      s.status === 'pending' &&
      now.getTime() - Date.parse(s.lastConfirmSentAt ?? s.createdAt) > 7 * 24 * 3600_000
    ) {
      await store.remove(s.id);
      removed += 1;
    }
  }
  return removed;
}
