import type { NamedLocation } from '@nordlys/shared';

const stedsnavnBaseUrl = 'https://ws.geonorge.no/stedsnavn/v1';

interface KartverketPlaceName {
  navnestatus?: string;
  'skrivemåte'?: string;
  'språk'?: string;
}

interface KartverketRegion {
  kommunenavn?: string;
  fylkesnavn?: string;
}

interface KartverketPoint {
  nord?: number;
  'øst'?: number;
}

interface KartverketPlace {
  kommuner?: KartverketRegion[];
  fylker?: KartverketRegion[];
  navnestatus?: string;
  representasjonspunkt?: KartverketPoint;
  stedsnavn?: KartverketPlaceName[];
  'skrivemåte'?: string;
  'språk'?: string;
  stedstatus?: string;
}

interface KartverketResponse {
  navn?: KartverketPlace[];
}

function firstParamValue(value: string | undefined): string | undefined {
  return value?.split(' - ')[0]?.trim() || undefined;
}

function chooseName(place: KartverketPlace): string | undefined {
  const placeName = place['skrivemåte']?.trim();
  if (placeName) {
    return placeName;
  }

  const names = place.stedsnavn ?? [];
  const preferred =
    names.find(
      (name) =>
        name.navnestatus === 'hovednavn' &&
        name['språk']?.toLowerCase() === 'norsk',
    ) ??
    names.find((name) => name.navnestatus === 'hovednavn') ??
    names[0];

  return preferred?.['skrivemåte']?.trim() || undefined;
}

function formatRegion(place: KartverketPlace): string | undefined {
  const municipality = firstParamValue(place.kommuner?.[0]?.kommunenavn);
  const county = firstParamValue(place.fylker?.[0]?.fylkesnavn);

  if (municipality && county && municipality !== county) {
    return `${municipality}, ${county}`;
  }

  return municipality ?? county;
}

function toNamedLocation(place: KartverketPlace): NamedLocation | null {
  const name = chooseName(place);
  const lat = place.representasjonspunkt?.nord;
  const lon = place.representasjonspunkt?.['øst'];

  if (
    !name ||
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    (place.stedstatus !== undefined && place.stedstatus !== 'aktiv')
  ) {
    return null;
  }

  return {
    name,
    lat,
    lon,
    region: formatRegion(place),
  };
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('nb-NO')
    .replaceAll('æ', 'ae')
    .replaceAll('ø', 'o')
    .replaceAll('å', 'a')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function relevanceRank(place: NamedLocation, normalizedQuery: string): number {
  const normalizedName = normalizeSearchText(place.name);

  if (normalizedName === normalizedQuery) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }

  return 2;
}

async function fetchKartverket(path: string): Promise<KartverketResponse> {
  const response = await fetch(`${stedsnavnBaseUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Kartverket request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as KartverketResponse;
}

export async function searchPlaces(query: string): Promise<NamedLocation[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const params = new URLSearchParams({
    sok: trimmed,
    fuzzy: 'true',
    utkoordsys: '4258',
    treffPerSide: '8',
  });
  const data = await fetchKartverket(`/navn?${params.toString()}`);
  const seen = new Set<string>();
  const normalizedQuery = normalizeSearchText(trimmed);

  return (data.navn ?? [])
    .map(toNamedLocation)
    .filter((place): place is NamedLocation => {
      if (!place) {
        return false;
      }

      const key = `${place.name}:${place.lat.toFixed(5)}:${place.lon.toFixed(5)}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((place, index) => ({
      index,
      place,
      rank: relevanceRank(place, normalizedQuery),
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ place }) => place);
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<NamedLocation | null> {
  const params = new URLSearchParams({
    nord: String(lat),
    ost: String(lon),
    koordsys: '4258',
    utkoordsys: '4258',
    radius: '5000',
    treffPerSide: '1',
  });
  const data = await fetchKartverket(`/punkt?${params.toString()}`);

  return toNamedLocation(data.navn?.[0] ?? {}) ?? null;
}
