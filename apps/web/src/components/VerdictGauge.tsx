import { useEffect, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocalHour, verdictColor } from '../lib/format';
import { trackEvent } from '../lib/analytics';
import { useAppState } from '../state/AppStateContext';

export function VerdictGauge() {
  const { i18n, t } = useTranslation();
  const { selectedLocation, forecast } = useAppState();
  const telemetryVerdict = forecast.data?.verdict;

  useEffect(() => {
    if (!telemetryVerdict) {
      return;
    }

    trackEvent('verdict_viewed', {
      verdict: telemetryVerdict.verdict,
      reason: telemetryVerdict.reason,
    });
  }, [telemetryVerdict]);

  if (!selectedLocation) {
    return (
      <section className="panel gauge gauge--empty">
        <p className="eyebrow">{t('gauge.heading')}</p>
        <h2>{t('gauge.pickLocation')}</h2>
      </section>
    );
  }

  if (forecast.isLoading) {
    return (
      <section className="panel gauge">
        <div className="skeleton skeleton--badge" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
        <p className="helper-text">{t('gauge.loading')}</p>
      </section>
    );
  }

  if (forecast.isError || !forecast.data) {
    return (
      <section className="panel gauge gauge--error">
        <p className="eyebrow">{t('gauge.heading')}</p>
        <h2>{t('gauge.error')}</h2>
        <button
          className="secondary-button"
          onClick={forecast.refetch}
          type="button"
        >
          {t('gauge.retry')}
        </button>
      </section>
    );
  }

  const { verdict } = forecast.data;
  const bestHour = verdict.bestHour;
  const currentKp = bestHour?.kp ?? verdict.hours[0]?.kp;
  const color = verdictColor(verdict.verdict);

  return (
    <section
      className="panel gauge"
      style={{ '--verdict-color': color } as CSSProperties}
    >
      <div className="gauge__badge">
        <span>{t(`verdict.${verdict.verdict}.label`)}</span>
      </div>
      <div className="gauge__content">
        <p className="eyebrow">{t('gauge.heading')}</p>
        <h2>{t(`verdict.${verdict.verdict}.subtitle`)}</h2>
        <p className="gauge__reason">{t(`reason.${verdict.reason}`)}</p>
        {bestHour ? (
          <p className="gauge__detail">
            {t('gauge.bestHour', {
              hour: formatLocalHour(bestHour.time, i18n.resolvedLanguage),
            })}
          </p>
        ) : null}
        {typeof currentKp === 'number' ? (
          <p className="gauge__kp">
            {t('gauge.kpCurrentVsRequired', {
              kp: currentKp.toFixed(1),
              requiredKp: verdict.requiredKp.toFixed(1),
            })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
