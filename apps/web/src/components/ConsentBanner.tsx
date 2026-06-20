import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAnalyticsConsent,
  onConsentChange,
  setAnalyticsConsent,
  type ConsentState,
} from '../state/consent';
import { PrivacyPolicy } from './PrivacyPolicy';
import './ConsentBanner.css';

export function ConsentBanner() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<ConsentState>(() => getAnalyticsConsent());

  useEffect(() => onConsentChange(setConsent), []);

  const chooseConsent = (value: 'granted' | 'denied') => {
    setAnalyticsConsent(value);
    setConsent(value);
  };

  return (
    <>
      {consent === 'unset' ? (
        <aside
          aria-label={t('consent.title')}
          className="consent-banner"
        >
          <div>
            <p className="consent-title">{t('consent.analytics')}</p>
            <p>{t('consent.message')}</p>
          </div>
          <div className="consent-actions">
            <a className="consent-link" href="#personvern">
              {t('consent.learnMore')}
            </a>
            <button onClick={() => chooseConsent('denied')} type="button">
              {t('consent.decline')}
            </button>
            <button
              className="consent-primary"
              onClick={() => chooseConsent('granted')}
              type="button"
            >
              {t('consent.accept')}
            </button>
          </div>
        </aside>
      ) : null}
      <PrivacyPolicy />
    </>
  );
}
