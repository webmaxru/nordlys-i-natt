import { useTranslation } from 'react-i18next';
import { isNativeApp } from '../lib/platform';
import { adsConfigured, showAdPrivacyOptions } from '../native/ads';

/** "Ad privacy settings" in the app (Google UMP requires a way to change consent). */
export function AdPrivacyLink() {
  const { t } = useTranslation();
  if (!isNativeApp() || !adsConfigured()) return null;
  return (
    <button
      type="button"
      className="link-button"
      onClick={() => void showAdPrivacyOptions().catch(() => undefined)}
    >
      {t('footer.adPrivacy')}
    </button>
  );
}
