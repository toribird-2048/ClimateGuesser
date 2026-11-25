import { ALL_KOPPEN_CODES, KOPPEN_CLASSES, classifyKoppen12 } from '../data/koppen.ts';
import { SAMPLING_REGIONS, type SamplingRegion } from '../data/samplingRegions.ts';
import type { ClimateData, KoppenCode, ReverseGeocodeResult, RoundLocation } from '../types/game.ts';

const MONTH_KEYS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

const DAYS_PER_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

// Bounded browser-side in-memory caches for climate normals and reverse geocoding
const climateCache = new Map<string, { data: ClimateData; cachedAt: number }>();
const geocodeCache = new Map<string, { data: ReverseGeocodeResult; cachedAt: number }>();
const CACHE_MAX = 400;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

function getGridKey(lat: number, lng: number): string {
  const qLat = Math.round(lat * 4) / 4;
  const qLng = Math.round(lng * 4) / 4;
  return `${qLat.toFixed(2)},${qLng.toFixed(2)}`;
}

function setBoundedCache<T>(
  cache: Map<string, { data: T; cachedAt: number }>,
  key: string,
  data: T
): void {
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, cachedAt: Date.now() });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Selects a sampling region biased toward unseen climate codes and unseen major groups
 * so each 5-round session explores diverse biomes across Earth.
 */
function chooseSamplingRegion(
  usedCodes: KoppenCode[],
  excludeCodes: KoppenCode[] = []
): SamplingRegion {
  const excludeSet = new Set(excludeCodes);
  const allowedCodes = ALL_KOPPEN_CODES.filter((code) => !excludeSet.has(code));
  const usedCodeSet = new Set(usedCodes);
  const usedGroupSet = new Set(usedCodes.map((c) => KOPPEN_CLASSES[c].group));

  const freshGroupCodes = allowedCodes.filter(
    (code) => !usedCodeSet.has(code) && !usedGroupSet.has(KOPPEN_CLASSES[code].group)
  );
  const unusedCodes = allowedCodes.filter((code) => !usedCodeSet.has(code));

  const poolCodes =
    freshGroupCodes.length > 0
      ? freshGroupCodes
      : unusedCodes.length > 0
        ? unusedCodes
        : allowedCodes;

  const chosenCode = pickRandom(poolCodes);
  const matchingRegions = SAMPLING_REGIONS.filter((r) => r.targetCode === chosenCode);
  if (matchingRegions.length > 0) {
    return pickRandom(matchingRegions);
  }
  const fallbackRegions = SAMPLING_REGIONS.filter((r) => !excludeSet.has(r.targetCode));
  return pickRandom(fallbackRegions.length > 0 ? fallbackRegions : SAMPLING_REGIONS);
}

/**
 * Direct client-side NASA POWER 25-year Climatology API lookup (CORS-enabled, keyless).
 */
async function fetchClimateFromNasaPower(lat: number, lng: number): Promise<ClimateData | null> {
  const url = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
  url.searchParams.set('parameters', 'T2M,PRECTOTCORR');
  url.searchParams.set('community', 'AG');
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('format', 'JSON');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      geometry?: { coordinates?: number[] };
      properties?: {
        parameter?: {
          T2M?: Record<string, number>;
          PRECTOTCORR?: Record<string, number>;
        };
      };
    };

    const t2m = payload.properties?.parameter?.T2M;
    const prec = payload.properties?.parameter?.PRECTOTCORR;
    if (!t2m || !prec) return null;

    const monthlyTempC: number[] = [];
    const monthlyPrecipMm: number[] = [];

    for (let i = 0; i < 12; i++) {
      const mKey = MONTH_KEYS[i];
      const tVal = t2m[mKey];
      const pVal = prec[mKey];
      if (
        typeof tVal !== 'number' ||
        typeof pVal !== 'number' ||
        !Number.isFinite(tVal) ||
        !Number.isFinite(pVal) ||
        tVal <= -900 ||
        pVal <= -900
      ) {
        return null;
      }
      monthlyTempC.push(tVal);
      monthlyPrecipMm.push(Math.max(0, pVal * DAYS_PER_MONTH[i]));
    }

    const rawElev = payload.geometry?.coordinates?.[2];
    const elevation =
      typeof rawElev === 'number' && Number.isFinite(rawElev) && rawElev > -500 ? rawElev : 0;

    return classifyKoppen12(monthlyTempC, monthlyPrecipMm, lat, elevation);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Direct client-side Open-Meteo Archive API fallback (CORS-enabled, keyless, 5-year daily normals).
 */
async function fetchClimateFromOpenMeteo(lat: number, lng: number): Promise<ClimateData | null> {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('start_date', '2020-01-01');
  url.searchParams.set('end_date', '2024-12-31');
  url.searchParams.set('daily', 'temperature_2m_mean,precipitation_sum');
  url.searchParams.set('timezone', 'UTC');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      elevation?: number;
      daily?: {
        time?: string[];
        temperature_2m_mean?: (number | null)[];
        precipitation_sum?: (number | null)[];
      };
    };

    const times = payload.daily?.time;
    const temps = payload.daily?.temperature_2m_mean;
    const precips = payload.daily?.precipitation_sum;

    if (!times || !temps || !precips || times.length === 0) return null;

    const tempSum = new Array<number>(12).fill(0);
    const tempCount = new Array<number>(12).fill(0);
    const precipSum = new Array<number>(12).fill(0);
    const yearMonthSeen: Array<Set<string>> = Array.from({ length: 12 }, () => new Set());

    for (let i = 0; i < times.length; i++) {
      const dateStr = times[i];
      const monthIdx = Number(dateStr.slice(5, 7)) - 1;
      const yearKey = dateStr.slice(0, 4);
      if (monthIdx < 0 || monthIdx > 11) continue;

      const t = temps[i];
      if (typeof t === 'number' && Number.isFinite(t)) {
        tempSum[monthIdx] += t;
        tempCount[monthIdx] += 1;
      }

      const p = precips[i];
      if (typeof p === 'number' && Number.isFinite(p)) {
        precipSum[monthIdx] += p;
        yearMonthSeen[monthIdx].add(yearKey);
      }
    }

    const monthlyTempC = tempSum.map((sum, idx) =>
      tempCount[idx] > 0 ? sum / tempCount[idx] : 0
    );
    const monthlyPrecipMm = precipSum.map((sum, idx) => {
      const years = Math.max(1, yearMonthSeen[idx].size);
      return sum / years;
    });

    const elevation = typeof payload.elevation === 'number' ? payload.elevation : 0;
    return classifyKoppen12(monthlyTempC, monthlyPrecipMm, lat, elevation);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchClimateForCoords(lat: number, lng: number): Promise<ClimateData | null> {
  const key = getGridKey(lat, lng);
  const existing = climateCache.get(key);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing.data;
  }

  const climate =
    (await fetchClimateFromNasaPower(lat, lng)) ?? (await fetchClimateFromOpenMeteo(lat, lng));

  if (climate) {
    setBoundedCache(climateCache, key, climate);
  }
  return climate;
}

async function fetchNominatimDirect(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', lat.toFixed(5));
  url.searchParams.set('lon', lng.toFixed(5));
  url.searchParams.set('zoom', '10');
  url.searchParams.set('accept-language', 'ja,en');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      error?: string;
      display_name?: string;
      name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state?: string;
        region?: string;
        country?: string;
      };
    };

    if (data.error) return null;

    const addr = data.address ?? {};
    const countryName = addr.country ?? null;
    const locality =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state ||
      addr.region ||
      data.name ||
      null;

    const placeName =
      locality && countryName && locality !== countryName
        ? `${locality}・${countryName}`
        : locality || countryName || data.display_name || null;

    if (!placeName) return null;

    return {
      placeName,
      countryName,
      formattedAddress: data.display_name ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPhotonDirect(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const url = new URL('https://photon.komoot.io/reverse');
  url.searchParams.set('lat', lat.toFixed(5));
  url.searchParams.set('lon', lng.toFixed(5));
  url.searchParams.set('radius', '50');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        properties?: {
          name?: string;
          city?: string;
          district?: string;
          county?: string;
          state?: string;
          country?: string;
        };
      }>;
    };

    const props = data.features?.[0]?.properties;
    if (!props) return null;

    const countryName = props.country ?? null;
    const locality =
      props.city || props.district || props.county || props.state || props.name || null;
    const placeName =
      locality && countryName && locality !== countryName
        ? `${locality}・${countryName}`
        : locality || countryName || null;

    if (!placeName) return null;

    const parts = [props.name, props.city, props.state, props.country].filter(
      (v, idx, arr): v is string => Boolean(v) && arr.indexOf(v) === idx
    );

    return {
      placeName,
      countryName,
      formattedAddress: parts.length > 0 ? parts.join(', ') : placeName,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchReverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const existing = geocodeCache.get(key);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing.data;
  }

  if (lat <= -60) {
    const result: ReverseGeocodeResult = {
      placeName: '南極大陸（氷床内陸部）',
      countryName: '南極',
      formattedAddress: `南極大陸 (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
    };
    setBoundedCache(geocodeCache, key, result);
    return result;
  }

  const resolved =
    (await fetchNominatimDirect(lat, lng)) ?? (await fetchPhotonDirect(lat, lng));

  if (resolved) {
    setBoundedCache(geocodeCache, key, resolved);
    return resolved;
  }

  if (lat >= 60 && lng >= -55 && lng <= -20) {
    const result: ReverseGeocodeResult = {
      placeName: 'グリーンランド氷床',
      countryName: 'グリーンランド',
      formattedAddress: 'グリーンランド（内陸氷床）',
    };
    setBoundedCache(geocodeCache, key, result);
    return result;
  }

  return { placeName: null, countryName: null, formattedAddress: null };
}

/**
 * Randomly samples an inland coordinate in a global climate belt and verifies its exact
 * 13-class Köppen classification directly in the browser from real multi-decade climate normals.
 */
export async function discoverRandomRound(
  usedCodes: KoppenCode[],
  usedCoordKeys: Set<string>,
  options: { maxAttempts?: number; excludeCodes?: KoppenCode[] } = {}
): Promise<RoundLocation> {
  const maxAttempts = options.maxAttempts ?? 14;
  const excludeCodes = options.excludeCodes ?? [];
  const excludeSet = new Set(excludeCodes);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const region = chooseSamplingRegion(usedCodes, excludeCodes);
    const lat = Number(randomInRange(region.minLat, region.maxLat).toFixed(4));
    const lng = Number(randomInRange(region.minLng, region.maxLng).toFixed(4));
    const coordKey = `${Math.round(lat)},${Math.round(lng)}`;

    if (usedCoordKeys.has(coordKey)) {
      continue;
    }

    try {
      const climate = await fetchClimateForCoords(lat, lng);
      // Skip coordinates that resolve to Cw or any excluded class (e.g., H in Hythergraph Mode)
      if (!climate || !climate.climateCode || excludeSet.has(climate.climateCode)) {
        continue;
      }

      return {
        id: `${lat.toFixed(4)}_${lng.toFixed(4)}_${Date.now()}`,
        lat,
        lng,
        climate: climate as ClimateData & { climateCode: KoppenCode },
      };
    } catch {
      // Retry with another sample point
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error('気候データの取得に失敗しました。再試行してください。');
}
