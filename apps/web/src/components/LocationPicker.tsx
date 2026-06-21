import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NamedLocation } from '@nordlys/shared';
import { PRESET_LOCATIONS } from '../data/presetLocations';
import { reverseGeocode } from '../api/kartverket';
import { isIos } from '../api/push';
import { useGeolocation } from '../hooks/useGeolocation';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { useAppState } from '../state/AppStateContext';

function locationLabel(location: NamedLocation): string {
  return location.region
    ? `${location.name}, ${location.region}`
    : location.name;
}

export function LocationPicker() {
  const { t } = useTranslation();
  const { selectedLocation, setSelectedLocation } = useAppState();
  const { results, isLoading, query, setQuery } = usePlaceSearch();
  const geolocation = useGeolocation();
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(() => !selectedLocation);
  const controlsId = useId();

  useEffect(() => {
    if (!geolocation.coords) {
      return;
    }

    let active = true;
    setGeoMessage(t('location.resolving'));

    reverseGeocode(geolocation.coords.lat, geolocation.coords.lon)
      .then((location) => {
        if (!active) {
          return;
        }

        setSelectedLocation(
          location ?? {
            name: t('location.myLocationName'),
            lat: geolocation.coords!.lat,
            lon: geolocation.coords!.lon,
          },
        );
        setGeoMessage(null);
        setIsExpanded(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        // Reverse geocoding failed, but we already have a valid fix — use it
        // rather than discarding the location the user just granted.
        setSelectedLocation({
          name: t('location.myLocationName'),
          lat: geolocation.coords!.lat,
          lon: geolocation.coords!.lon,
        });
        setGeoMessage(null);
        setIsExpanded(false);
      });

    return () => {
      active = false;
    };
  }, [geolocation.coords, setSelectedLocation, t]);

  const chooseLocation = (location: NamedLocation) => {
    setSelectedLocation(location);
    setQuery('');
    setIsExpanded(false);
  };

  let geoError: string | null = null;
  switch (geolocation.reason) {
    case 'denied':
      geoError = isIos()
        ? t('location.geoDeniedIos')
        : t('location.geoDenied');
      break;
    case 'insecure':
      geoError = t('location.geoInsecure');
      break;
    case 'unsupported':
      geoError = t('location.geoUnsupported');
      break;
    case 'unavailable':
    case 'timeout':
      geoError = t('location.geoUnavailable');
      break;
    case 'unknown':
      geoError = t('location.geoError');
      break;
    default:
      geoError = null;
  }

  return (
    <section
      className={`panel location-picker ${isExpanded ? 'location-picker--expanded' : 'location-picker--compact'}`}
      aria-labelledby="location-title"
    >
      <div className="section-heading location-picker__heading">
        <p className="eyebrow">{t('location.heading')}</p>
        <h2 id="location-title">{t('location.title')}</h2>
      </div>

      <div className="location-picker__summary">
        <div className="selected-location" aria-live="polite">
          <span>{t('location.selected')}</span>
          <strong>
            {selectedLocation
              ? locationLabel(selectedLocation)
              : t('location.noneSelected')}
          </strong>
        </div>
        {selectedLocation ? (
          <button
            aria-controls={controlsId}
            aria-expanded={isExpanded}
            className="secondary-button location-picker__toggle"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            type="button"
          >
            {isExpanded ? t('location.done') : t('location.changeLocation')}
          </button>
        ) : null}
      </div>

      {geoMessage ? <p className="helper-text">{geoMessage}</p> : null}
      {geoError ? (
        <p className="helper-text helper-text--error">{geoError}</p>
      ) : null}

      {isExpanded ? (
        <div className="location-picker__controls" id={controlsId}>
          <button
            className="primary-button location-picker__geo"
            disabled={geolocation.status === 'prompting'}
            onClick={geolocation.request}
            type="button"
          >
            {geolocation.status === 'prompting'
              ? t('location.requesting')
              : t('location.useMyLocation')}
          </button>

          <div className="location-picker__search">
            <label className="search-field">
              <span>{t('location.searchLabel')}</span>
              <input
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('location.searchPlaceholder')}
                type="search"
                value={query}
              />
            </label>

            {query ? (
              <div
                aria-busy={isLoading}
                className="search-results"
                role="listbox"
              >
                {isLoading ? (
                  <div className="search-results__item">
                    {t('location.searching')}
                  </div>
                ) : null}
                {!isLoading && results.length === 0 ? (
                  <div className="search-results__item">
                    {t('location.noResults')}
                  </div>
                ) : null}
                {results.map((location) => (
                  <button
                    className="search-results__item"
                    key={`${location.name}-${location.lat}-${location.lon}`}
                    onClick={() => chooseLocation(location)}
                    type="button"
                  >
                    <span>{location.name}</span>
                    {location.region ? <small>{location.region}</small> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {!query ? (
            <div className="preset-locations">
              <h3>{t('location.presetsHeading')}</h3>
              <div className="chip-list">
                {PRESET_LOCATIONS.map((location) => (
                  <button
                    className="chip"
                    key={location.name}
                    onClick={() => chooseLocation(location)}
                    type="button"
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
