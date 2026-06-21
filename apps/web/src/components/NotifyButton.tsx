import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLocalSubscriptionId,
  getPermission,
  isIos,
  isPushSupported,
  isStandalone,
  subscribeToPush,
  unsubscribeFromPush,
} from '../api/push';
import { useAppState } from '../state/AppStateContext';
import './NotifyButton.css';

type NotifyStep = 'idle' | 'explain' | 'install' | 'unsupported' | 'dismissed';

export function NotifyButton() {
  const { i18n, t } = useTranslation();
  const { selectedLocation } = useAppState();

  const supported = isPushSupported();
  // iOS only allows Web Push from an installed (home-screen) PWA, never a browser tab.
  const iosNeedsInstall = !supported && isIos() && !isStandalone();

  const [permission, setPermission] = useState<NotificationPermission>(getPermission());
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<NotifyStep>('idle');
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const current = getPermission();
    setPermission(current);
    setEnabled(Boolean(getLocalSubscriptionId()) && current === 'granted');
  }, []);

  // Re-check on mount and whenever the user returns (they may have changed
  // browser/OS notification settings in another tab/window).
  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  function handleSubscribeClick() {
    if (!selectedLocation) {
      setFeedback(t('notify.needLocation'));
      return;
    }

    setFeedback(null);
    if (iosNeedsInstall) {
      setStep('install');
    } else if (supported) {
      setStep('explain');
    } else {
      setStep('unsupported');
    }
  }

  async function handleAllowClick() {
    if (!selectedLocation) {
      setFeedback(t('notify.needLocation'));
      setStep('idle');
      return;
    }

    setWorking(true);
    setFeedback(null);
    try {
      // The native dialog resolves 'granted', 'denied', or 'default'. Edge and
      // Chrome "quiet" the request (no modal, just a bell icon) and resolve
      // 'default' when the user doesn't act — that is NOT a hard block, so we
      // must not treat it as 'denied'.
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPush(selectedLocation, i18n.resolvedLanguage ?? i18n.language);
        setEnabled(true);
        setStep('idle');
        setFeedback(t('notify.success', { place: selectedLocation.name }));
        return;
      }

      setEnabled(false);
      // 'denied' renders the blocked state (gated on permission === 'denied');
      // 'default' (dismissed / quietly held by the browser) gets its own
      // actionable guidance instead of a misleading "blocked" message.
      setStep(result === 'denied' ? 'idle' : 'dismissed');
    } catch {
      setEnabled(false);
      setStep('idle');
      setFeedback(t('notify.error'));
    } finally {
      setWorking(false);
    }
  }

  async function handleUnsubscribeClick() {
    setWorking(true);
    setFeedback(null);
    try {
      await unsubscribeFromPush();
      setEnabled(false);
      setStep('idle');
    } catch {
      setFeedback(t('notify.error'));
    } finally {
      setWorking(false);
    }
  }

  const statusText = working ? t('notify.working') : feedback;

  if (enabled) {
    return (
      <section className="notify-button notify-button--subscribed">
        <div className="notify-button__content">
          <strong>{t('notify.enabled')}</strong>
          <p>{t('notify.subscribedDetail', { place: selectedLocation?.name ?? '' })}</p>
          <p>{t('notify.subscribedCadence')}</p>
          {statusText ? <p className="notify-button__feedback">{statusText}</p> : null}
        </div>
        <div className="notify-button__actions">
          <button
            className="secondary-button"
            disabled={working}
            type="button"
            onClick={() => {
              void handleUnsubscribeClick();
            }}
          >
            {working ? t('notify.working') : t('notify.disable')}
          </button>
        </div>
      </section>
    );
  }

  if (permission === 'denied') {
    return (
      <section className="notify-button notify-button--blocked">
        <div className="notify-button__content">
          <strong>{t('notify.blocked')}</strong>
          <p>{t('notify.blockedHint')}</p>
          {statusText ? <p className="notify-button__feedback">{statusText}</p> : null}
        </div>
      </section>
    );
  }

  if (step === 'explain') {
    return (
      <section className="notify-button notify-button--explain">
        <div className="notify-button__content">
          <strong>{t('notify.enable')}</strong>
          <p>{t('notify.explain')}</p>
          {statusText ? <p className="notify-button__feedback">{statusText}</p> : null}
        </div>
        <div className="notify-button__actions">
          <button
            className="primary-button"
            disabled={working}
            type="button"
            onClick={() => {
              void handleAllowClick();
            }}
          >
            {working ? t('notify.working') : t('notify.allow')}
          </button>
          <button
            className="secondary-button"
            disabled={working}
            type="button"
            onClick={() => {
              setFeedback(null);
              setStep('idle');
            }}
          >
            {t('notify.notNow')}
          </button>
        </div>
      </section>
    );
  }

  if (step === 'install') {
    return (
      <section className="notify-button notify-button--install">
        <div className="notify-button__content">
          <strong>{t('notify.iosTitle')}</strong>
          <p>{t('notify.ios')}</p>
        </div>
        <div className="notify-button__actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setFeedback(null);
              setStep('idle');
            }}
          >
            {t('notify.notNow')}
          </button>
        </div>
      </section>
    );
  }

  if (step === 'unsupported') {
    return (
      <section className="notify-button notify-button--unsupported">
        <div className="notify-button__content">
          <strong>{t('notify.unsupported')}</strong>
          {statusText ? <p className="notify-button__feedback">{statusText}</p> : null}
        </div>
        <div className="notify-button__actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setFeedback(null);
              setStep('idle');
            }}
          >
            {t('notify.notNow')}
          </button>
        </div>
      </section>
    );
  }

  if (step === 'dismissed') {
    return (
      <section className="notify-button notify-button--dismissed">
        <div className="notify-button__content">
          <strong>{t('notify.dismissedTitle')}</strong>
          <p>{t('notify.dismissedHint')}</p>
          {statusText ? <p className="notify-button__feedback">{statusText}</p> : null}
        </div>
        <div className="notify-button__actions">
          <button
            className="primary-button"
            disabled={working}
            type="button"
            onClick={() => {
              setFeedback(null);
              setStep('explain');
            }}
          >
            {t('notify.tryAgain')}
          </button>
          <button
            className="secondary-button"
            disabled={working}
            type="button"
            onClick={() => {
              setFeedback(null);
              setStep('idle');
            }}
          >
            {t('notify.notNow')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="notify-button notify-button--cta">
      <span className="notify-button__icon" aria-hidden="true">
        🔔
      </span>
      <div className="notify-button__content">
        <strong>{t('notify.ctaTitle')}</strong>
        <p className="notify-button__detail">{t('notify.ctaDetail')}</p>
        {statusText ? <p className="notify-button__feedback">{statusText}</p> : null}
      </div>
      <div className="notify-button__actions">
        <button
          className="primary-button"
          disabled={working}
          type="button"
          onClick={handleSubscribeClick}
        >
          {t('notify.enable')}
        </button>
      </div>
    </section>
  );
}
