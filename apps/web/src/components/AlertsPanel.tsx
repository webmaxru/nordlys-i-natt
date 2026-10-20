import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAlertStatus,
  fetchNights,
  subscribeEmail,
  type EmailSignupResult,
  type NightSummary,
} from '../api/alerts';
import { isNativeApp } from '../lib/platform';
import { suppressAds } from '../native/ads';
import { useAppState } from '../state/AppStateContext';
import { NotifyButton } from './NotifyButton';
import { NativeAlerts } from './NativeAlerts';
import './AlertsPanel.css';

type Channel = 'browser' | 'email' | 'app';

const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL ?? '';
const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL ?? '';

/**
 * "Pick a place → choose a channel": the subscribe flow for the day-before alert.
 * On the website: browser push, e-mail or the app. Inside the iOS/Android app: native push only.
 */
export function AlertsPanel() {
  const { t } = useTranslation();
  const { selectedLocation } = useAppState();
  const native = isNativeApp();
  const [channel, setChannel] = useState<Channel>(native ? 'app' : 'browser');
  const [alertNow, setAlertNow] = useState(false);
  const [highOnly, setHighOnly] = useState(false);
  const status = useQuery({
    queryKey: ['alert-status'],
    queryFn: fetchAlertStatus,
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const tabsId = useId();
  const prefs = {
    dayBefore: true,
    now: alertNow,
    minChance: highOnly ? ('high' as const) : ('good' as const),
  };
  const channels: Channel[] = native ? ['app'] : ['browser', 'email', 'app'];

  // In the app: no ad banner while the alert set-up is on screen.
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!native || !panelRef.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) =>
      suppressAds('alerts-panel', entry.isIntersecting),
    );
    io.observe(panelRef.current);
    return () => {
      io.disconnect();
      suppressAds('alerts-panel', false);
    };
  }, [native]);

  return (
    <section
      ref={panelRef}
      className="alerts-panel panel"
      id="varsel"
      aria-labelledby="alerts-title"
    >
      <div className="alerts-panel__head">
        <h2 id="alerts-title">{t('alerts.title')}</h2>
        {selectedLocation ? (
          <p className="alerts-panel__place">
            {t('alerts.forPlace', { place: selectedLocation.name })}
          </p>
        ) : (
          <p className="alerts-panel__place alerts-panel__place--missing">
            {t('alerts.pickPlace')}
          </p>
        )}
      </div>

      {selectedLocation ? (
        <NightsStrip lat={selectedLocation.lat} lon={selectedLocation.lon} />
      ) : null}

      {channels.length > 1 ? (
        <>
          <p className="alerts-panel__label" id={`${tabsId}-label`}>
            {t('alerts.channels')}
          </p>
          <div className="alerts-panel__tabs" role="tablist" aria-labelledby={`${tabsId}-label`}>
            {channels.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                id={`${tabsId}-${c}`}
                aria-selected={channel === c}
                aria-controls={`${tabsId}-${c}-panel`}
                className={`alerts-panel__tab${channel === c ? ' is-active' : ''}`}
                onClick={() => setChannel(c)}
              >
                {t(`alerts.${c}`)}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <fieldset className="alerts-panel__prefs">
        <label>
          <input
            type="checkbox"
            checked={highOnly}
            onChange={(e) => setHighOnly(e.target.checked)}
          />
          <span>{t('alerts.highOnly')}</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={alertNow}
            onChange={(e) => setAlertNow(e.target.checked)}
          />
          <span>{t('alerts.nowOption')}</span>
        </label>
      </fieldset>

      <div
        role="tabpanel"
        id={`${tabsId}-${channel}-panel`}
        aria-labelledby={`${tabsId}-${channel}`}
        className="alerts-panel__body"
      >
        {channel === 'browser' ? <NotifyButton prefs={prefs} /> : null}
        {channel === 'email' ? (
          <EmailSignup enabled={status.data?.email.enabled ?? false} prefs={prefs} />
        ) : null}
        {channel === 'app' ? native ? <NativeAlerts prefs={prefs} /> : <AppStores /> : null}
      </div>

      <details className="alerts-panel__rule">
        <summary>{t('alerts.nightsNote')}</summary>
        <p>{t('alerts.rule')}</p>
      </details>
    </section>
  );
}

function NightsStrip({ lat, lon }: { lat: number; lon: number }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const q = useQuery({
    queryKey: ['nights', lat.toFixed(2), lon.toFixed(2), lang.startsWith('nb') ? 'nb' : 'en'],
    queryFn: () => fetchNights(lat, lon, lang),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const nights = (q.data?.nights ?? []).slice(0, 3);
  if (nights.length === 0) return null;
  const locale = lang.startsWith('nb') ? 'nb-NO' : 'en-GB';
  const plusDays = (ymd: string, d: number) => {
    const x = new Date(`${ymd}T12:00:00Z`);
    x.setUTCDate(x.getUTCDate() + d);
    return x.toISOString().slice(0, 10);
  };
  const name = (n: NightSummary) => {
    const { tonight, today } = q.data!;
    if (n.nightOf === tonight) return t('alerts.tonight');
    if (n.nightOf === today) return t('alerts.thisEvening');
    if (n.nightOf === plusDays(today, 1)) return t('alerts.tomorrow');
    const day = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
      new Date(`${n.nightOf}T12:00:00Z`),
    );
    return day.charAt(0).toUpperCase() + day.slice(1);
  };
  return (
    <div className="nights" aria-label={t('alerts.nightsTitle')}>
      {nights.map((n) => (
        <div key={n.nightOf} className={`nights__item nights__item--${n.chance}`}>
          <span className="nights__name">{name(n)}</span>
          <strong className="nights__chance">{n.label}</strong>
          {n.bestTime && (n.chance === 'good' || n.chance === 'high') ? (
            <span className="nights__best">
              {t('alerts.bestAt', {
                time: new Intl.DateTimeFormat(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Oslo',
                }).format(new Date(n.bestTime)),
              })}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EmailSignup({
  enabled,
  prefs,
}: {
  enabled: boolean;
  prefs: { dayBefore: boolean; now: boolean; minChance: 'good' | 'high' };
}) {
  const { t, i18n } = useTranslation();
  const { selectedLocation } = useAppState();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EmailSignupResult | null>(null);
  const shownAt = useRef(Date.now());
  const inputId = useId();
  useEffect(() => setResult(null), [selectedLocation?.lat, selectedLocation?.lon]);

  if (!enabled) {
    return <p className="alerts-panel__note">{t('email.disabled')}</p>;
  }
  if (result === 'check_inbox') {
    return (
      <p className="alerts-panel__success" role="status">
        {t('email.checkInbox')}
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedLocation) return;
    setBusy(true);
    setResult(
      await subscribeEmail({
        email,
        location: {
          lat: selectedLocation.lat,
          lon: selectedLocation.lon,
          name: selectedLocation.name,
        },
        lang: i18n.language,
        prefs,
        website,
        elapsedMs: Date.now() - shownAt.current,
      }),
    );
    setBusy(false);
  }

  const privacyHref = i18n.language.startsWith('nb') ? '/personvern/' : '/en/privacy/';
  const [before, after] = t('email.consent', { privacy: '\u0000' }).split('\u0000');
  const errorKey: Record<string, string> = {
    too_many_places: 'email.tooMany',
    disabled: 'email.disabled',
    invalid: 'email.invalid',
    rate_limited: 'email.rateLimited',
    error: 'email.error',
  };

  return (
    <form className="email-signup" onSubmit={onSubmit} noValidate={false}>
      <label htmlFor={inputId}>{t('email.label')}</label>
      <input
        id={inputId}
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder={t('email.placeholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {/* Honeypot for bots: hidden from people and assistive tech. */}
      <div className="email-signup__hp" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      <button className="primary-button" type="submit" disabled={busy || !selectedLocation}>
        {busy ? t('email.sending') : t('email.submit')}
      </button>
      {result ? (
        <p className="alerts-panel__error" role="alert">
          {t(errorKey[result])}
        </p>
      ) : null}
      <p className="email-signup__consent">
        {before}
        <a href={privacyHref}>{t('email.privacy')}</a>
        {after}
      </p>
    </form>
  );
}

function AppStores() {
  const { t } = useTranslation();
  return (
    <div className="app-channel">
      <strong>{t('appChannel.title')}</strong>
      <p>{t('appChannel.body')}</p>
      {APP_STORE_URL || PLAY_STORE_URL ? (
        <div className="app-channel__stores">
          {APP_STORE_URL ? (
            <a className="secondary-button" href={APP_STORE_URL} rel="noopener">
              {t('appChannel.appStore')}
            </a>
          ) : null}
          {PLAY_STORE_URL ? (
            <a className="secondary-button" href={PLAY_STORE_URL} rel="noopener">
              {t('appChannel.playStore')}
            </a>
          ) : null}
        </div>
      ) : (
        <p className="alerts-panel__note">{t('appChannel.soon')}</p>
      )}
    </div>
  );
}
