import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAnalyticsConsent,
  onConsentChange,
  setAnalyticsConsent,
  type ConsentState,
} from '../state/consent';
import './PrivacyPolicy.css';

const PRIVACY_HASH = '#personvern';

function isPrivacyHash() {
  return window.location.hash === PRIVACY_HASH;
}

function closePrivacyPolicy() {
  if (window.location.hash !== PRIVACY_HASH) {
    return;
  }

  window.history.pushState(
    '',
    document.title,
    `${window.location.pathname}${window.location.search}`,
  );
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function PrivacyPolicy() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(() => isPrivacyHash());
  const [consent, setConsent] = useState<ConsentState>(() => getAnalyticsConsent());
  const analyticsEnabled = consent === 'granted';

  useEffect(() => {
    const handleHashChange = () => setIsOpen(isPrivacyHash());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => onConsentChange(setConsent), []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="privacy-overlay" role="presentation">
      <section
        aria-labelledby="privacy-title"
        aria-modal="true"
        className="privacy-panel"
        role="dialog"
      >
        <div className="privacy-header">
          <h2 id="privacy-title">{t('privacy.title')}</h2>
          <button className="privacy-back" onClick={closePrivacyPolicy} type="button">
            {t('privacy.back')}
          </button>
        </div>

        <p>{t('privacy.intro')}</p>

        <h3>{t('privacy.whatWeUse')}</h3>
        <p>{t('privacy.whatWeUseBody')}</p>

        <h3>{t('privacy.whatWeDont')}</h3>
        <p>{t('privacy.whatWeDontBody')}</p>

        <h3>{t('privacy.retention')}</h3>
        <p>{t('privacy.retentionBody')}</p>

        <div className="privacy-analytics">
          <div>
            <h3>{t('privacy.analyticsHeading')}</h3>
            <p>{analyticsEnabled ? t('privacy.analyticsOn') : t('privacy.analyticsOff')}</p>
          </div>
          <button
            className="privacy-toggle"
            onClick={() => setAnalyticsConsent(analyticsEnabled ? 'denied' : 'granted')}
            type="button"
          >
            {analyticsEnabled ? t('privacy.toggleOff') : t('privacy.toggleOn')}
          </button>
        </div>
      </section>
    </div>
  );
}
