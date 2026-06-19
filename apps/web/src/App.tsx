import { useTranslation } from 'react-i18next';

/**
 * Placeholder shell — replaced by the core-UI phase with the location picker,
 * verdict gauge, timeline, map, etc.
 */
export default function App() {
  const { t } = useTranslation();
  return (
    <main className="app">
      <h1>{t('app.title')}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  );
}
