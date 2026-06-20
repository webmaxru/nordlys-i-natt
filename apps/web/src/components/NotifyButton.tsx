import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLocalSubscriptionId,
  getPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../api/push';
import { useAppState } from '../state/AppStateContext';
import './NotifyButton.css';

export function NotifyButton() {
  const { i18n, t } = useTranslation();
  const { selectedLocation } = useAppState();
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(t('notify.description'));
  const supported = isPushSupported();

  useEffect(() => {
    if (!supported) {
      setEnabled(false);
      setMessage(t('notify.unsupported'));
      return;
    }

    const permission = getPermission();
    setEnabled(Boolean(getLocalSubscriptionId()) && permission === 'granted');
    setMessage(
      permission === 'denied' ? t('notify.blocked') : t('notify.description'),
    );
  }, [supported, t]);

  async function handleToggle() {
    if (!supported) {
      setMessage(t('notify.unsupported'));
      return;
    }

    if (!selectedLocation) {
      setMessage(t('notify.needLocation'));
      return;
    }

    setWorking(true);
    setMessage(t('notify.working'));

    try {
      if (enabled) {
        await unsubscribeFromPush();
        setEnabled(false);
        setMessage(t('notify.description'));
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setEnabled(false);
        setMessage(t('notify.blocked'));
        return;
      }

      await subscribeToPush(
        selectedLocation,
        i18n.resolvedLanguage ?? i18n.language,
      );
      setEnabled(true);
      setMessage(t('notify.success', { place: selectedLocation.name }));
    } catch {
      setEnabled(false);
      setMessage(t('notify.error'));
    } finally {
      setWorking(false);
    }
  }

  const buttonDisabled = working || !supported || !selectedLocation;
  const status = !supported
    ? t('notify.unsupported')
    : !selectedLocation
      ? t('notify.needLocation')
      : enabled
        ? t('notify.enabled')
        : t('notify.prompt');

  return (
    <section className="notify-button">
      <div>
        <strong>{status}</strong>
        <p>{message}</p>
      </div>
      <button
        className="secondary-button"
        disabled={buttonDisabled}
        type="button"
        onClick={() => {
          void handleToggle();
        }}
      >
        {working
          ? t('notify.working')
          : enabled
            ? t('notify.disable')
            : t('notify.enable')}
      </button>
    </section>
  );
}
