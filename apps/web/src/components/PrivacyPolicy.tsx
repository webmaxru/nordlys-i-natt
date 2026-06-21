import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

  useEffect(() => {
    const handleHashChange = () => setIsOpen(isPrivacyHash());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

        <h3>{t('privacy.analyticsHeading')}</h3>
        <p>{t('privacy.analyticsBody')}</p>

        <h3>{t('privacy.retention')}</h3>
        <p>{t('privacy.retentionBody')}</p>
      </section>
    </div>
  );
}
