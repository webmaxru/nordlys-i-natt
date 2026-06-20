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
import { trackEvent } from '../lib/analytics';
import { useAppState } from '../state/AppStateContext';
import './NotifyButton.css';

type NotifyStep = 'idle' | 'explain' | 'install' | 'unsupported';

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
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setEnabled(false);
        setPermission('denied');
        setStep('idle');
        return;
      }

      await subscribeToPush(selectedLocation, i18n.resolvedLanguage ?? i18n.language);
      setEnabled(true);
      setStep('idle');
      trackEvent('notify_opt_in');
      setFeedback(t('notify.success', { place: selectedLocation.name }));
    } catch {
      setEnabled(false);
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

  return (
    <section className="notify-button">
      <div className="notify-button__content">
        <strong>{t('notify.prompt')}</strong>
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
