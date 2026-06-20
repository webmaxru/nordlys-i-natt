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

export function NotifyButton() {
  const { i18n, t } = useTranslation();
  const { selectedLocation } = useAppState();

  const supported = isPushSupported();
  // iOS only allows Web Push from an installed (home-screen) PWA, never a browser tab.
  const iosNeedsInstall = !supported && isIos() && !isStandalone();

  const [permission, setPermission] = useState<NotificationPermission>(getPermission());
  const [enabled, setEnabled] = useState(false);
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

  async function handleToggle() {
    if (!selectedLocation) {
      setFeedback(t('notify.needLocation'));
      return;
    }

    setWorking(true);
    setFeedback(null);
    try {
      if (enabled) {
        await unsubscribeFromPush();
        setEnabled(false);
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setEnabled(false);
        return;
      }

      await subscribeToPush(selectedLocation, i18n.resolvedLanguage ?? i18n.language);
      setEnabled(true);
      trackEvent('notify_opt_in');
      setFeedback(t('notify.success', { place: selectedLocation.name }));
    } catch {
      setEnabled(false);
      setFeedback(t('notify.error'));
    } finally {
      setWorking(false);
    }
  }

  let heading: string;
  let detail = '';
  if (iosNeedsInstall) {
    heading = t('notify.iosTitle');
    detail = t('notify.ios');
  } else if (!supported) {
    heading = t('notify.unsupported');
  } else if (!selectedLocation) {
    heading = t('notify.needLocation');
    detail = t('notify.description');
  } else if (permission === 'denied') {
    heading = t('notify.blocked');
    detail = t('notify.blockedHint');
  } else if (enabled) {
    heading = t('notify.enabled');
    detail = t('notify.description');
  } else {
    heading = t('notify.prompt');
    detail = t('notify.description');
  }

  if (working) detail = t('notify.working');
  else if (feedback) detail = feedback;

  const showButton = supported && !iosNeedsInstall;
  const buttonDisabled = working || !selectedLocation || (permission === 'denied' && !enabled);

  return (
    <section className="notify-button">
      <div>
        <strong>{heading}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
      {showButton ? (
        <button
          className="secondary-button"
          disabled={buttonDisabled}
          type="button"
          onClick={() => {
            void handleToggle();
          }}
        >
          {working ? t('notify.working') : enabled ? t('notify.disable') : t('notify.enable')}
        </button>
      ) : null}
    </section>
  );
}
