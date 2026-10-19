import { useTranslation } from 'react-i18next';
import './Hero.css';

/** The pitch: what the app promises, in three steps, with one call to action. */
export function Hero() {
  const { t } = useTranslation();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h2 id="hero-title" className="hero__title">
        {t('hero.title')}
      </h2>
      <p className="hero__lead">{t('hero.lead')}</p>
      <ol className="hero__steps">
        <li>{t('hero.step1')}</li>
        <li>{t('hero.step2')}</li>
        <li>{t('hero.step3')}</li>
      </ol>
      <div className="hero__cta">
        <a className="primary-button" href="#varsel">
          {t('hero.cta')}
        </a>
        <span className="hero__free">{t('hero.free')}</span>
      </div>
    </section>
  );
}
