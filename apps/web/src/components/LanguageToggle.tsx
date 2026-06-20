import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'nb', label: 'NO' },
  { code: 'en', label: 'EN' },
] as const;

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div className="language-toggle" aria-label="Language">
      {languages.map((language) => (
        <button
          aria-pressed={activeLanguage.startsWith(language.code)}
          className="language-toggle__button"
          key={language.code}
          onClick={() => {
            void i18n.changeLanguage(language.code);
          }}
          type="button"
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}
