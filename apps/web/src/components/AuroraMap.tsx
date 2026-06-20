import 'leaflet/dist/leaflet.css';
import './AuroraMap.css';

import { useEffect, useMemo } from 'react';
import type { LatLngExpression } from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { useOvationGrid } from '../hooks/useOvationGrid';
import { useAppState } from '../state/AppStateContext';

const norwayCenter: LatLngExpression = [65, 15];
const norwayZoom = 4;
const selectedZoom = 6;
const intensityThreshold = 2;

function RecenterMap({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
}

function getOvalColor(intensity: number) {
  if (intensity >= 70) {
    return '#f5c451';
  }

  if (intensity >= 40) {
    return '#8fea74';
  }

  return '#38d39f';
}

function getOvalOpacity(intensity: number) {
  return Math.min(0.78, Math.max(0.14, intensity / 100));
}

export function AuroraMap() {
  const { t } = useTranslation();
  const { selectedLocation } = useAppState();
  const ovationGrid = useOvationGrid();
  const center = useMemo<LatLngExpression>(
    () =>
      selectedLocation
        ? [selectedLocation.lat, selectedLocation.lon]
        : norwayCenter,
    [selectedLocation],
  );
  const visiblePoints = useMemo(
    () =>
      (ovationGrid.data?.points ?? []).filter(
        ([, , intensity]) => intensity > intensityThreshold,
      ),
    [ovationGrid.data?.points],
  );

  return (
    <section className="aurora-map panel" aria-labelledby="aurora-map-title">
      <div className="aurora-map__header">
        <div>
          <p className="eyebrow">{t('map.oval')}</p>
          <h2 id="aurora-map-title">{t('map.title')}</h2>
        </div>
        {ovationGrid.isLoading ? (
          <span className="aurora-map__loading">{t('map.loading')}</span>
        ) : null}
      </div>

      <div className="aurora-map__canvas">
        <MapContainer
          center={center}
          zoom={selectedLocation ? selectedZoom : norwayZoom}
          minZoom={3}
          maxZoom={18}
          scrollWheelZoom={false}
          className="aurora-map__leaflet"
        >
          <RecenterMap
            center={center}
            zoom={selectedLocation ? selectedZoom : norwayZoom}
          />
          <TileLayer
            url="https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png"
            attribution="Kartverket"
            maxZoom={18}
          />
          {visiblePoints.map(([lon, lat, intensity]) => {
            const opacity = getOvalOpacity(intensity);

            return (
              <CircleMarker
                key={`${lon}:${lat}:${intensity}`}
                center={[lat, lon]}
                radius={Math.max(4, Math.min(12, intensity / 8))}
                stroke={false}
                pathOptions={{
                  color: getOvalColor(intensity),
                  fillColor: getOvalColor(intensity),
                  fillOpacity: opacity,
                }}
              />
            );
          })}
          {selectedLocation ? (
            <CircleMarker
              center={[selectedLocation.lat, selectedLocation.lon]}
              radius={8}
              pathOptions={{
                color: '#e7ecf5',
                fillColor: '#6ea8fe',
                fillOpacity: 0.95,
                opacity: 1,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {t('map.you')}
              </Tooltip>
            </CircleMarker>
          ) : null}
        </MapContainer>
      </div>

      <div className="aurora-map__legend">
        <span>{t('map.intensity')}</span>
        <div className="aurora-map__scale" aria-hidden="true" />
        <span>{t('map.attribution')}</span>
      </div>
    </section>
  );
}
