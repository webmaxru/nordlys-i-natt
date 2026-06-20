import type { NamedLocation } from '@nordlys/shared';

/**
 * Popular aurora-watching spots in Norway, north → south.
 * Used to seed the location picker so the app is useful before the user
 * grants geolocation or searches.
 */
export const PRESET_LOCATIONS: NamedLocation[] = [
  { name: 'Tromsø', region: 'Troms', lat: 69.6492, lon: 18.9553 },
  { name: 'Alta', region: 'Finnmark', lat: 69.9689, lon: 23.2716 },
  { name: 'Kirkenes', region: 'Finnmark', lat: 69.7273, lon: 30.045 },
  { name: 'Svolvær', region: 'Lofoten', lat: 68.2342, lon: 14.568 },
  { name: 'Bodø', region: 'Nordland', lat: 67.2804, lon: 14.4049 },
  { name: 'Trondheim', region: 'Trøndelag', lat: 63.4305, lon: 10.3951 },
  { name: 'Bergen', region: 'Vestland', lat: 60.3913, lon: 5.3221 },
  { name: 'Oslo', region: 'Oslo', lat: 59.9139, lon: 10.7522 },
  { name: 'Stavanger', region: 'Rogaland', lat: 58.97, lon: 5.7331 },
  { name: 'Kristiansand', region: 'Agder', lat: 58.1599, lon: 8.0182 },
];
