import { useTranslation } from 'react-i18next';

export type NativePrefs = { dayBefore: boolean; now: boolean; minChance: 'good' | 'high' };

/** Native push inside the iOS/Android app (filled in by the mobile build). */
export function NativeAlerts(_props: { prefs: NativePrefs }) {
  const { t } = useTranslation();
  return <p className="alerts-panel__note">{t('appChannel.soon')}</p>;
}
