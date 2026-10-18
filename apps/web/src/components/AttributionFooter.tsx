import { useTranslation } from 'react-i18next';

export function AttributionFooter() {
  const { t } = useTranslation();

  return (
    <div className="attribution-footer">
      <nav className="attribution-footer__nav" aria-label={t('footer.guides')}>
        <a href={t('nav.guidesHref')}>{t('footer.guides')}</a>
        <a href={t('nav.aboutHref')}>{t('footer.about')}</a>
        <a href={t('nav.contactHref')}>{t('footer.contact')}</a>
        <a href={t('nav.privacyHref')}>{t('footer.privacy')}</a>
        <a href={t('nav.termsHref')}>{t('footer.terms')}</a>
      </nav>
      <span>{t('footer.attribution')}</span>
      <span className="attribution-footer__credit">
        <span>{t('footer.madeBy')}</span>
        <a
          href="https://www.linkedin.com/in/webmax/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Maxim Salnikov LinkedIn"
        >
          Maxim Salnikov
        </a>
      </span>
      <a
        href="https://github.com/webmaxru/nordlys-i-natt"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('footer.github')}
      >
        {t('footer.github')}
      </a>
    </div>
  );
}
