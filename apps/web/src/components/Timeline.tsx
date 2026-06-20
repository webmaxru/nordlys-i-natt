import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  requiredKpForLatitude,
  sunElevationDeg,
  type CloudPoint,
  type KpForecastPoint,
} from '@nordlys/shared';
import { formatLocalHour, kpColor } from '../lib/format';
import { useAppState } from '../state/AppStateContext';
import './Timeline.css';

const hourMs = 60 * 60 * 1000;
const horizonHours = 72;
const viewBoxWidth = 720;
const viewBoxHeight = 300;
const chart = {
  left: 38,
  right: 12,
  top: 30,
  bottom: 238,
};
const chartWidth = viewBoxWidth - chart.left - chart.right;
const chartHeight = chart.bottom - chart.top;

type DarknessBand = {
  key: string;
  x: number;
  width: number;
  level: 'dark' | 'deep' | 'astro';
};

type KpBar = {
  point: KpForecastPoint;
  cloudPct: number;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

type CloudPlotPoint = CloudPoint & {
  x: number;
  y: number;
};

function xForTime(time: number, start: number, end: number): number {
  return chart.left + ((time - start) / (end - start)) * chartWidth;
}

function yForKp(kp: number): number {
  return chart.bottom - (Math.min(Math.max(kp, 0), 9) / 9) * chartHeight;
}

function yForCloud(cloudPct: number): number {
  return chart.bottom - (Math.min(Math.max(cloudPct, 0), 100) / 100) * chartHeight;
}

function nearestCloudPct(clouds: CloudPoint[], time: number): number {
  if (!clouds.length) {
    return 0;
  }

  return clouds.reduce((nearest, point) => {
    const nearestDelta = Math.abs(new Date(nearest.time).getTime() - time);
    const pointDelta = Math.abs(new Date(point.time).getTime() - time);
    return pointDelta < nearestDelta ? point : nearest;
  }).cloudPct;
}

function formatWeekday(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { weekday: 'short' });
}

export function Timeline() {
  const { i18n, t } = useTranslation();
  const { selectedLocation, forecast } = useAppState();

  const timeline = useMemo(() => {
    if (!selectedLocation || !forecast.data) {
      return null;
    }

    const now = Date.now();
    const startDate = new Date(now);
    startDate.setMinutes(0, 0, 0);
    const start = startDate.getTime();
    const end = start + horizonHours * hourMs;
    const requiredKp = requiredKpForLatitude(selectedLocation.lat);
    const cloudForecast = forecast.data.inputs.cloudForecast.filter((point) => {
      const time = new Date(point.time).getTime();
      return time >= start && time <= end;
    });
    const kpForecast = forecast.data.inputs.kpForecast.filter((point) => {
      const time = new Date(point.time).getTime();
      return time < end && time + 3 * hourMs > start;
    });

    const darknessBands: DarknessBand[] = [];
    for (let time = start; time < end; time += hourMs) {
      const elevation = sunElevationDeg(new Date(time), selectedLocation.lat, selectedLocation.lon);

      if (elevation >= -6) {
        continue;
      }

      darknessBands.push({
        key: String(time),
        x: xForTime(time, start, end),
        width: xForTime(Math.min(time + hourMs, end), start, end) - xForTime(time, start, end),
        level: elevation < -18 ? 'astro' : elevation < -12 ? 'deep' : 'dark',
      });
    }

    const bars: KpBar[] = kpForecast.map((point, index) => {
      const time = new Date(point.time).getTime();
      const nextTime = kpForecast[index + 1]
        ? new Date(kpForecast[index + 1].time).getTime()
        : time + 3 * hourMs;
      const xStart = xForTime(Math.max(time, start), start, end);
      const xEnd = xForTime(Math.min(nextTime, end), start, end);
      const y = yForKp(point.kp);
      const cloudPct = nearestCloudPct(cloudForecast, time);
      const isDark =
        sunElevationDeg(
          new Date(Math.max(time, start)),
          selectedLocation.lat,
          selectedLocation.lon,
        ) < -6;

      return {
        point,
        cloudPct,
        x: xStart + 1,
        y,
        width: Math.max(xEnd - xStart - 2, 2),
        height: chart.bottom - y,
        visible: isDark && point.kp >= requiredKp && cloudPct <= 40,
      };
    });

    const clouds: CloudPlotPoint[] = cloudForecast.map((point) => ({
      ...point,
      x: xForTime(new Date(point.time).getTime(), start, end),
      y: yForCloud(point.cloudPct),
    }));

    const cloudLine = clouds
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(' ');
    const cloudArea = clouds.length
      ? `${cloudLine} L ${clouds[clouds.length - 1].x.toFixed(1)} ${chart.bottom} L ${clouds[0].x.toFixed(1)} ${chart.bottom} Z`
      : '';

    const dayTicks: { key: string; x: number; label: string }[] = [];
    const firstMidnight = new Date(start);
    firstMidnight.setHours(24, 0, 0, 0);

    for (let time = firstMidnight.getTime(); time < end; time += 24 * hourMs) {
      dayTicks.push({
        key: String(time),
        x: xForTime(time, start, end),
        label: formatWeekday(new Date(time), i18n.resolvedLanguage),
      });
    }

    return {
      bars,
      cloudArea,
      cloudLine,
      clouds,
      darknessBands,
      dayTicks,
      nowX: xForTime(now, start, end),
      requiredKp,
      requiredKpY: yForKp(requiredKp),
      start,
      end,
    };
  }, [forecast.data, i18n.resolvedLanguage, selectedLocation]);

  if (!selectedLocation) {
    return null;
  }

  if (forecast.isLoading) {
    return (
      <section className="panel timeline timeline--loading">
        <div className="skeleton skeleton--line skeleton--short" />
        <div className="skeleton timeline__skeleton-chart" />
      </section>
    );
  }

  if (!forecast.data || !timeline || (!timeline.bars.length && !timeline.clouds.length)) {
    return (
      <section className="panel timeline">
        <p className="eyebrow">{t('timeline.title')}</p>
        <p className="helper-text">{t('timeline.noData')}</p>
      </section>
    );
  }

  const locale = i18n.resolvedLanguage;

  return (
    <section className="panel timeline" aria-labelledby="timeline-title">
      <div className="timeline__header">
        <div>
          <p className="eyebrow">{t('timeline.chance')}</p>
          <h2 id="timeline-title">{t('timeline.title')}</h2>
        </div>
        <span className="timeline__required">
          {t('timeline.kp')} ≥ {timeline.requiredKp.toFixed(1)}
        </span>
      </div>

      <svg
        className="timeline__chart"
        role="img"
        aria-labelledby="timeline-svg-title timeline-svg-desc"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      >
        <title id="timeline-svg-title">{t('timeline.title')}</title>
        <desc id="timeline-svg-desc">
          {t('timeline.cloudPct', {
            pct: timeline.clouds.at(-1)?.cloudPct.toFixed(0) ?? 0,
          })}
        </desc>

        <g aria-hidden="true">
          <rect
            className="timeline__plot-bg"
            x={chart.left}
            y={chart.top}
            width={chartWidth}
            height={chartHeight}
            rx="14"
          />

          {timeline.darknessBands.map((band) => (
            <rect
              className={`timeline__darkness timeline__darkness--${band.level}`}
              key={band.key}
              x={band.x}
              y={chart.top}
              width={band.width}
              height={chartHeight}
            />
          ))}

          {[0, 3, 6, 9].map((kp) => (
            <g key={kp}>
              <line
                className="timeline__grid-line"
                x1={chart.left}
                x2={chart.left + chartWidth}
                y1={yForKp(kp)}
                y2={yForKp(kp)}
              />
              <text
                className="timeline__axis-label"
                x={chart.left - 8}
                y={yForKp(kp) + 4}
                textAnchor="end"
              >
                {kp}
              </text>
            </g>
          ))}

          {timeline.dayTicks.map((tick) => (
            <g key={tick.key}>
              <line
                className="timeline__day-line"
                x1={tick.x}
                x2={tick.x}
                y1={chart.top}
                y2={chart.bottom}
              />
              <text className="timeline__day-label" x={tick.x + 6} y={chart.bottom + 32}>
                {tick.label}
              </text>
            </g>
          ))}

          {timeline.cloudArea ? (
            <path className="timeline__cloud-area" d={timeline.cloudArea} />
          ) : null}
          {timeline.cloudLine ? (
            <path className="timeline__cloud-line" d={timeline.cloudLine} />
          ) : null}

          <line
            className="timeline__required-line"
            x1={chart.left}
            x2={chart.left + chartWidth}
            y1={timeline.requiredKpY}
            y2={timeline.requiredKpY}
          />
          <text
            className="timeline__required-label"
            x={chart.left + chartWidth - 4}
            y={timeline.requiredKpY - 7}
            textAnchor="end"
          >
            {t('timeline.kp')} {timeline.requiredKp.toFixed(1)}
          </text>
        </g>

        {timeline.bars.map((bar) => (
          <rect
            aria-label={t('timeline.hourAria', {
              time: formatLocalHour(bar.point.time, locale),
              kp: bar.point.kp.toFixed(1),
              cloud: bar.cloudPct.toFixed(0),
            })}
            className={`timeline__kp-bar${bar.visible ? ' timeline__kp-bar--visible' : ''}`}
            fill={kpColor(bar.point.kp)}
            height={bar.height}
            key={bar.point.time}
            role="img"
            rx="4"
            tabIndex={0}
            width={bar.width}
            x={bar.x}
            y={bar.y}
          />
        ))}

        <g aria-hidden="true">
          <line
            className="timeline__now-line"
            x1={timeline.nowX}
            x2={timeline.nowX}
            y1={chart.top - 6}
            y2={chart.bottom + 10}
          />
          <text className="timeline__axis-title" x={chart.left} y={chart.top - 12}>
            {t('timeline.kp')}
          </text>
          <text
            className="timeline__axis-title timeline__axis-title--clouds"
            x={chart.left + chartWidth}
            y={chart.top - 12}
            textAnchor="end"
          >
            {t('timeline.clouds')}
          </text>
        </g>
      </svg>

      <div className="timeline__legend" aria-hidden="true">
        <span>
          <i className="timeline__legend-bar" />
          {t('timeline.strengthLegend')}
        </span>
        <span>
          <i className="timeline__legend-bar timeline__legend-bar--visible" />
          {t('timeline.visibleLegend')}
        </span>
        <span>
          <i className="timeline__legend-line" />
          {t('timeline.clouds')}
        </span>
        <span>
          <i className="timeline__legend-band" />
          {t('timeline.darkLegend')}
        </span>
      </div>
      <p className="timeline__hint">{t('timeline.readHint')}</p>
    </section>
  );
}
