import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import nb from './locales/nb.json';
import en from './locales/en.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nb: { translation: nb },
      en: { translation: en },
    },
    fallbackLng: 'nb',
    supportedLngs: ['nb', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      // `?lang=en` (used by links from the English guides) wins, then the saved choice.
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
    },
  });

// Keep <html lang> in step with the UI language (screen readers, hyphenation, translation
// prompts and search engines all read it). index.html ships lang="nb".
function syncHtmlLang(lng: string | undefined) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng?.toLowerCase().startsWith('en') ? 'en' : 'nb';
}
syncHtmlLang(i18n.resolvedLanguage ?? i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
