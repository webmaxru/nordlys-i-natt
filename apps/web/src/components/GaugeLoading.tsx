import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Cold starts (scale-to-zero) can keep the PWA shell waiting a few seconds, so
// rotate a few playful status lines to make the wait feel alive instead of stuck.
const ROTATE_MS = 2400;

export function GaugeLoading() {
  const { t } = useTranslation();
  const raw = t('gauge.loadingMessages', { returnObjects: true });
  const messages =
    Array.isArray(raw) && raw.length > 0 ? (raw as string[]) : [t('gauge.loading')];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) {
      return;
    }
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (reduceMotion) {
      return;
    }
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <section className="panel gauge">
      <div className="skeleton skeleton--badge" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line skeleton--short" />
      <p className="helper-text gauge__loading" key={index}>
        {messages[index % messages.length]}
      </p>
    </section>
  );
}
