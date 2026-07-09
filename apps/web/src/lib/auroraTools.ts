import type {
  AuroraVerdict,
  HourlyAssessment,
  NamedLocation,
} from '@nordlys/shared';
import type { QueryClient } from '@tanstack/react-query';
import { getForecast } from '../api/forecast';
import { forecastQueryKey } from '../api/forecastQuery';
import { searchPlaces } from '../api/kartverket';
import { PRESET_LOCATIONS } from '../data/presetLocations';
import { formatCoordinateName } from './format';
import type { JsonSchema, ModelContextTool } from './webmcp';

/**
 * The two WebMCP tools exposed by the app, built with the imperative API:
 *
 *  - `get_aurora_verdict`  — read-only; returns tonight's go/no-go verdict for
 *    the currently selected location.
 *  - `set_aurora_location` — mutating; changes the evaluated location (by name
 *    or coordinates) and returns the fresh verdict.
 *
 * Both declare an explicit `outputSchema` (result schema) so an agent knows the
 * exact shape of what it gets back.
 */

export interface AuroraToolsDeps {
  getSelectedLocation: () => NamedLocation | null;
  setSelectedLocation: (location: NamedLocation) => void;
  queryClient: QueryClient;
}

const FORECAST_STALE_TIME = 10 * 60_000;

/* ------------------------------------------------------------------ schemas */

const locationSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'lat', 'lon'],
  properties: {
    name: { type: 'string', description: 'Human-readable place name.' },
    region: {
      type: 'string',
      description: 'County / municipality, when known.',
    },
    lat: { type: 'number', description: 'Latitude in decimal degrees.' },
    lon: { type: 'number', description: 'Longitude in decimal degrees.' },
  },
};

const bestHourSchema: JsonSchema = {
  type: ['object', 'null'],
  additionalProperties: false,
  description:
    'Best hour to look tonight (highest desirability score), or null when no hour is viable.',
  properties: {
    time: {
      type: 'string',
      format: 'date-time',
      description: 'ISO-8601 UTC start of the hour.',
    },
    kp: { type: 'number', description: 'Forecast Kp index for the hour.' },
    cloudPct: {
      type: 'number',
      description: 'Cloud cover percentage (0–100).',
    },
    sunElevationDeg: {
      type: 'number',
      description: 'Sun elevation in degrees (negative = below the horizon).',
    },
    darkness: {
      type: 'string',
      enum: ['day', 'civil', 'nautical', 'astronomical'],
      description: 'Twilight / darkness band for the hour.',
    },
    isDark: {
      type: 'boolean',
      description: 'True when it is dark enough to see aurora.',
    },
    score: {
      type: 'number',
      description: 'Combined 0–100 desirability score for the hour.',
    },
    visible: {
      type: 'boolean',
      description: 'True when dark AND Kp ≥ required AND not too cloudy.',
    },
  },
};

const verdictSummaryProps: Record<string, JsonSchema> = {
  verdict: {
    type: 'string',
    enum: ['GO', 'MAYBE', 'NO'],
    description: 'GO = go out now, MAYBE = marginal, NO = not tonight.',
  },
  reason: {
    type: 'string',
    enum: ['none', 'not_dark', 'kp_too_low', 'too_cloudy'],
    description: 'The single most limiting factor behind the verdict.',
  },
  requiredKp: {
    type: 'number',
    description: 'Minimum Kp index needed for visibility at this latitude.',
  },
  currentKp: {
    type: ['number', 'null'],
    description: 'Kp index at the best/first hour of the horizon, or null.',
  },
  bestHour: bestHourSchema,
  generatedAt: {
    type: 'string',
    format: 'date-time',
    description: 'ISO-8601 UTC time the verdict was computed.',
  },
};

const verdictSummaryRequired = [
  'verdict',
  'reason',
  'requiredKp',
  'currentKp',
  'bestHour',
  'generatedAt',
];

const verdictSummarySchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: verdictSummaryRequired,
  properties: verdictSummaryProps,
};

/* --------------------------------------------------------------- result maps */

type BestHourOut = Pick<
  HourlyAssessment,
  | 'time'
  | 'kp'
  | 'cloudPct'
  | 'sunElevationDeg'
  | 'darkness'
  | 'isDark'
  | 'score'
  | 'visible'
>;

interface LocationOut {
  name: string;
  lat: number;
  lon: number;
  region?: string;
}

interface VerdictSummary {
  verdict: AuroraVerdict['verdict'];
  reason: AuroraVerdict['reason'];
  requiredKp: number;
  currentKp: number | null;
  bestHour: BestHourOut | null;
  generatedAt: string;
}

function toLocationOut(location: NamedLocation): LocationOut {
  const out: LocationOut = {
    name: location.name,
    lat: location.lat,
    lon: location.lon,
  };
  if (location.region) {
    out.region = location.region;
  }
  return out;
}

function toBestHour(hour: HourlyAssessment | null): BestHourOut | null {
  if (!hour) {
    return null;
  }
  return {
    time: hour.time,
    kp: hour.kp,
    cloudPct: hour.cloudPct,
    sunElevationDeg: hour.sunElevationDeg,
    darkness: hour.darkness,
    isDark: hour.isDark,
    score: hour.score,
    visible: hour.visible,
  };
}

function toVerdictSummary(verdict: AuroraVerdict): VerdictSummary {
  const currentKp = verdict.bestHour?.kp ?? verdict.hours[0]?.kp ?? null;
  return {
    verdict: verdict.verdict,
    reason: verdict.reason,
    requiredKp: verdict.requiredKp,
    currentKp,
    bestHour: toBestHour(verdict.bestHour),
    generatedAt: verdict.generatedAt,
  };
}

async function loadVerdict(
  deps: AuroraToolsDeps,
  location: NamedLocation,
): Promise<AuroraVerdict> {
  // fetchQuery shares the same cache entry as the useForecast hook, so the tool
  // and the on-screen gauge never diverge and never double-fetch.
  const response = await deps.queryClient.fetchQuery({
    queryKey: forecastQueryKey(location),
    queryFn: () => getForecast(location),
    staleTime: FORECAST_STALE_TIME,
  });
  return response.verdict;
}

/* -------------------------------------------------------------- input helpers */

function readString(
  input: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = input[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(
  input: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = input[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function findPreset(name: string): NamedLocation | undefined {
  const needle = name.trim().toLowerCase();
  return (
    PRESET_LOCATIONS.find((preset) => preset.name.toLowerCase() === needle) ??
    PRESET_LOCATIONS.find((preset) =>
      preset.name.toLowerCase().startsWith(needle),
    )
  );
}

type LocationSource = 'coordinates' | 'preset' | 'search';

async function resolveLocation(
  input: Record<string, unknown>,
): Promise<{ location: NamedLocation; source: LocationSource }> {
  const name = readString(input, 'name')?.trim();
  const lat = readNumber(input, 'lat');
  const lon = readNumber(input, 'lon');

  if (lat !== undefined || lon !== undefined) {
    if (lat === undefined || lon === undefined) {
      throw new Error(
        'Provide both "lat" and "lon" together, or use "name" instead.',
      );
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(
        'Coordinates out of range: "lat" must be −90..90 and "lon" −180..180.',
      );
    }
    return {
      location: {
        name: name && name.length > 0 ? name : formatCoordinateName(lat, lon),
        lat,
        lon,
      },
      source: 'coordinates',
    };
  }

  if (!name) {
    throw new Error(
      'Provide a place "name" (e.g. "Tromsø") or both "lat" and "lon".',
    );
  }

  const preset = findPreset(name);
  if (preset) {
    return { location: preset, source: 'preset' };
  }

  const results = await searchPlaces(name);
  const match = results[0];
  if (!match) {
    throw new Error(
      `No place in Norway matched "${name}". Try a different spelling, or provide "lat"/"lon".`,
    );
  }
  return { location: match, source: 'search' };
}

/* --------------------------------------------------------------------- tools */

export function createAuroraTools(
  getDeps: () => AuroraToolsDeps,
): ModelContextTool[] {
  const getAuroraVerdict: ModelContextTool = {
    name: 'get_aurora_verdict',
    title: 'Get tonight’s aurora verdict',
    description:
      'Return the current northern-lights go/no-go verdict for the location the app is showing: whether to head out tonight (GO / MAYBE / NO), the limiting factor, the required versus current Kp index, and the best hour to look. Call set_aurora_location first if no location is selected.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['location', ...verdictSummaryRequired],
      properties: {
        location: locationSchema,
        ...verdictSummaryProps,
      },
    },
    annotations: { readOnlyHint: true },
    async execute() {
      const deps = getDeps();
      const location = deps.getSelectedLocation();
      if (!location) {
        throw new Error(
          'No location is selected yet. Call set_aurora_location first, then retry.',
        );
      }
      const verdict = await loadVerdict(deps, location);
      return { location: toLocationOut(location), ...toVerdictSummary(verdict) };
    },
  };

  const setAuroraLocation: ModelContextTool = {
    name: 'set_aurora_location',
    title: 'Set aurora location',
    description:
      'Change the place the app evaluates for aurora visibility, then return the fresh verdict. Accepts a Norwegian place name (e.g. "Tromsø", "Bodø", "Alta") — matched against popular aurora spots first, then Kartverket place search — or explicit "lat"/"lon" coordinates. Updates the on-screen location and forecast.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      description: 'Provide either "name", or both "lat" and "lon".',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          description: 'Norwegian place name to look up, e.g. "Tromsø".',
        },
        lat: {
          type: 'number',
          minimum: -90,
          maximum: 90,
          description:
            'Latitude in decimal degrees (EUREF89 / WGS84). Provide with "lon" to set exact coordinates and skip name lookup.',
        },
        lon: {
          type: 'number',
          minimum: -180,
          maximum: 180,
          description:
            'Longitude in decimal degrees (EUREF89 / WGS84). Provide with "lat".',
        },
      },
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['location', 'source', 'verdict'],
      properties: {
        location: locationSchema,
        source: {
          type: 'string',
          enum: ['coordinates', 'preset', 'search'],
          description: 'How the input was resolved to a location.',
        },
        verdict: verdictSummarySchema,
      },
    },
    // Place names/regions come from the external Kartverket geocoder.
    annotations: { untrustedContentHint: true },
    async execute(input) {
      const deps = getDeps();
      const { location, source } = await resolveLocation(input);
      deps.setSelectedLocation(location);
      const verdict = await loadVerdict(deps, location);
      return {
        location: toLocationOut(location),
        source,
        verdict: toVerdictSummary(verdict),
      };
    },
  };

  return [getAuroraVerdict, setAuroraLocation];
}
