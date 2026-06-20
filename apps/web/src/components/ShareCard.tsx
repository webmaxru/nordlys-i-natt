import { useRef, useState, type CSSProperties } from 'react';
import { toPng } from 'html-to-image';
import { useTranslation } from 'react-i18next';
import { formatLocalHour, verdictColor } from '../lib/format';
import { trackEvent } from '../lib/analytics';
import { useAppState } from '../state/AppStateContext';
import './ShareCard.css';

type ShareStatus = 'idle' | 'generating' | 'copied' | 'downloaded' | 'error' | 'na';

function downloadPng(dataUrl: string, fileName: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const anchor = document.createElement('a');
  if (!('download' in anchor)) {
    return false;
  }

  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

async function dataUrlToFile(
  dataUrl: string,
  fileName: string,
): Promise<File | undefined> {
  if (typeof File === 'undefined') {
    return undefined;
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: 'image/png' });
}

export function ShareCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const { i18n, t } = useTranslation();
  const { selectedLocation, forecast } = useAppState();

  if (!selectedLocation || !forecast.data) {
    return null;
  }

  const { verdict } = forecast.data;
  const bestHour = verdict.bestHour;
  const verdictLabel = t(`verdict.${verdict.verdict}.label`);
  const reason = t(`reason.${verdict.reason}`);
  const caption = t('share.caption', {
    verdict: verdictLabel,
    place: selectedLocation.name,
  });
  const generatedDate = new Date(verdict.generatedAt).toLocaleDateString(
    i18n.resolvedLanguage,
    { day: 'numeric', month: 'long', weekday: 'long' },
  );
  const bestHourText = bestHour
    ? formatLocalHour(bestHour.time, i18n.resolvedLanguage)
    : '—';
  const fileName = `nordlys-${selectedLocation.name
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/gi, '-')}.png`;
  const color = verdictColor(verdict.verdict);
  const statusText =
    status === 'generating'
      ? t('share.generating')
      : status === 'copied'
        ? t('share.copied')
        : status === 'downloaded'
          ? t('share.downloaded')
          : status === 'error'
            ? t('share.shareError')
            : status === 'na'
              ? t('share.na')
              : '';

  async function handleShare() {
    trackEvent('share_clicked');

    if (!cardRef.current) {
      setStatus('na');
      return;
    }

    setStatus('generating');

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0b1020',
      });
      const shareUrl =
        typeof window === 'undefined' ? undefined : window.location.href;
      const file = await dataUrlToFile(dataUrl, fileName);

      if (
        file &&
        navigator.canShare?.({ files: [file] }) &&
        navigator.share
      ) {
        await navigator.share({
          files: [file],
          title: t('share.title'),
          text: caption,
        });
        setStatus('idle');
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: t('share.title'),
          text: caption,
          url: shareUrl,
        });
        setStatus('idle');
        return;
      }

      if (downloadPng(dataUrl, fileName)) {
        setStatus('downloaded');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${caption}${shareUrl ? ` ${shareUrl}` : ''}`);
        setStatus('copied');
        return;
      }

      setStatus('na');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="share-card">
      <button
        className="share-card__button"
        disabled={status === 'generating'}
        onClick={() => {
          void handleShare();
        }}
        type="button"
      >
        {status === 'generating' ? t('share.generating') : t('share.button')}
      </button>
      {statusText ? (
        <span className="share-card__status" role="status">
          {statusText}
        </span>
      ) : null}
      <div className="share-card__stage" aria-hidden="true">
        <div
          ref={cardRef}
          className="share-card-image"
          style={{ '--share-verdict-color': color } as CSSProperties}
        >
          <p className="share-card-image__eyebrow">{t('share.title')}</p>
          <h2>{selectedLocation.name}</h2>
          <strong className="share-card-image__verdict">{verdictLabel}</strong>
          <p className="share-card-image__reason">{reason}</p>
          <dl className="share-card-image__meta">
            <div>
              <dt>{t('share.title')}</dt>
              <dd>{t('gauge.bestHour', { hour: bestHourText })}</dd>
            </div>
            <div>
              <dt>{generatedDate}</dt>
              <dd>{caption}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
