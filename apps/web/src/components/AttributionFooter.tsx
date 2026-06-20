import { useTranslation } from 'react-i18next';

export function AttributionFooter() {
  const { t } = useTranslation();

  return (
    <div className="attribution-footer">
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
      <a href="#personvern">{t('footer.privacy')}</a>
    </div>
  );
}
