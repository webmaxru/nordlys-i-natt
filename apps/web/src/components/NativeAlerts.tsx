import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppState } from '../state/AppStateContext';
import {
  disableNativePush,
  enableNativePush,
  getRegisteredDevice,
  nativePushAvailable,
  type NativePrefs,
} from '../native/push';

export type { NativePrefs };

/**
 * The alert channel inside the iOS/Android app: native push (APNs / FCM), never web push.
 * Same day-before rule and preferences as the website's channels.
 */
export function NativeAlerts({ prefs }: { prefs: NativePrefs }) {
  const { i18n, t } = useTranslation();
  const { selectedLocation } = useAppState();
  const [device, setDevice] = useState(getRegisteredDevice());
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setDevice(getRegisteredDevice()), []);

  if (!nativePushAvailable()) {
    return <p className="alerts-panel__note">{t('appChannel.unavailable')}</p>;
  }

  async function enable() {
    if (!selectedLocation) {
      setMessage(t('notify.needLocation'));
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      const result = await enableNativePush(
        selectedLocation,
        i18n.resolvedLanguage ?? i18n.language,
        prefs,
      );
      if (result === 'ok') {
        setDevice(getRegisteredDevice());
        setMessage(t('notify.success', { place: selectedLocation.name }));
      } else {
        setMessage(result === 'denied' ? t('appChannel.denied') : t('notify.error'));
      }
    } catch {
      setMessage(t('notify.error'));
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    setWorking(true);
    setMessage(null);
    try {
      await disableNativePush();
      setDevice(null);
    } finally {
      setWorking(false);
    }
  }

  const sameplace = device && selectedLocation && device.place === selectedLocation.name;

  return (
    <div className="alerts-panel__native" data-testid="native-alerts">
      {device ? (
        <p>
          <strong>{t('notify.enabled')}</strong>{' '}
          {t('notify.subscribedDetail', { place: device.place })}
        </p>
      ) : (
        <p>{t('appChannel.explain')}</p>
      )}
      <div className="alerts-panel__actions">
        {!device || !sameplace ? (
          <button
            className="primary-button"
            type="button"
            disabled={working}
            onClick={() => void enable()}
          >
            {working
              ? t('notify.working')
              : device
                ? t('appChannel.switchPlace')
                : t('appChannel.enable')}
          </button>
        ) : null}
        {device ? (
          <button
            className="secondary-button"
            type="button"
            disabled={working}
            onClick={() => void disable()}
          >
            {t('notify.disable')}
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="alerts-panel__feedback" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
