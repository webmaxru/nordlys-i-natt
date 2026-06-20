import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './LanguageToggle';

export function Layout({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{t('app.tagline')}</p>
          <h1>{t('app.title')}</h1>
        </div>
        <LanguageToggle />
      </header>
      <main className="app-main">{children}</main>
      {footer ? <footer className="app-footer">{footer}</footer> : null}
    </div>
  );
}
