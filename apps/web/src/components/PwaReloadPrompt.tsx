import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import './PwaReloadPrompt.css';

export function PwaReloadPrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <aside className="pwa-reload-prompt" role="alert" aria-live="polite">
      <p>{t('pwa.updateAvailable')}</p>
      <div className="pwa-reload-prompt__actions">
        <button
          className="primary-button pwa-reload-prompt__button"
          type="button"
          onClick={() => updateServiceWorker(true)}
        >
          {t('pwa.reload')}
        </button>
        <button
          className="secondary-button pwa-reload-prompt__button"
          type="button"
          onClick={() => setNeedRefresh(false)}
        >
          {t('pwa.dismiss')}
        </button>
      </div>
    </aside>
  );
}
