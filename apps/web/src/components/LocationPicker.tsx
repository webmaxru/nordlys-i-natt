import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NamedLocation } from '@nordlys/shared';
import { PRESET_LOCATIONS } from '../data/presetLocations';
import { reverseGeocode } from '../api/kartverket';
import { useGeolocation } from '../hooks/useGeolocation';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { trackEvent } from '../lib/analytics';
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
        trackEvent('location_selected', { source: 'geo' });
        setGeoMessage(null);
      })
      .catch(() => {
        if (active) {
          setGeoMessage(t('location.geoError'));
        }
      });

    return () => {
      active = false;
    };
  }, [geolocation.coords, setSelectedLocation, t]);

  const chooseLocation = (
    location: NamedLocation,
    source: 'search' | 'preset',
  ) => {
    setSelectedLocation(location);
    trackEvent('location_selected', { source });
    setQuery('');
  };

  return (
    <section className="panel location-picker" aria-labelledby="location-title">
      <div className="section-heading">
        <p className="eyebrow">{t('location.heading')}</p>
        <h2 id="location-title">{t('location.title')}</h2>
      </div>

      <div className="selected-location">
        <span>{t('location.selected')}</span>
        <strong>
          {selectedLocation
            ? locationLabel(selectedLocation)
            : t('location.noneSelected')}
        </strong>
      </div>

      <button
        className="primary-button"
        disabled={geolocation.status === 'prompting'}
        onClick={geolocation.request}
        type="button"
      >
        {geolocation.status === 'prompting'
          ? t('location.requesting')
          : t('location.useMyLocation')}
      </button>
      {geoMessage ? <p className="helper-text">{geoMessage}</p> : null}
      {geolocation.error ? (
        <p className="helper-text helper-text--error">
          {t('location.geoError')}
        </p>
      ) : null}

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
        <div className="search-results" role="listbox">
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
              onClick={() => chooseLocation(location, 'search')}
              type="button"
            >
              <span>{location.name}</span>
              {location.region ? <small>{location.region}</small> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="preset-locations">
        <h3>{t('location.presetsHeading')}</h3>
        <div className="chip-list">
          {PRESET_LOCATIONS.map((location) => (
            <button
              className="chip"
              key={location.name}
              onClick={() => chooseLocation(location, 'preset')}
              type="button"
            >
              {location.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
