import { useTranslation } from 'react-i18next';

export function AttributionFooter() {
  const { t } = useTranslation();

  return (
    <div className="attribution-footer">
      <span>{t('footer.attribution')}</span>
      <a href="#privacy">{t('footer.privacy')}</a>
    </div>
  );
}
