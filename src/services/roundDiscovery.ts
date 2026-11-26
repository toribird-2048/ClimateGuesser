import { ALL_KOPPEN_CODES, KOPPEN_CLASSES, classifyKoppen12 } from '../data/koppen.ts';
import { SAMPLING_REGIONS, type SamplingRegion } from '../data/samplingRegions.ts';
import type {
  ClimateData,
  KoppenCode,
  RecentRoundEntry,
  ReverseGeocodeResult,
  RoundLocation,
} from '../types/game.ts';
import {
  sampleLandPointInBox,
  sampleRandomGlobalLandCoordinate,
} from '../utils/landMask.ts';

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

interface ChosenRegion {
  region: SamplingRegion;
  regionIndex: number;
}

/**
 * Selects a sampling region biased toward:
 * 1) climate classes & groups unseen in the current session,
 * 2) climate classes not played in the last ~12 rounds across sessions (prevents H/EF dominance),
 * 3) region boxes not recently visited across sessions (prevents hitting the same spot repeatedly).
 */
function chooseSamplingRegion(
  usedCodes: KoppenCode[],
  excludeCodes: KoppenCode[] = [],
  recentHistory: RecentRoundEntry[] = [],
  triedRegionIndices: Set<number> = new Set()
): ChosenRegion {
  const excludeSet = new Set(excludeCodes);
  const allowedCodes = ALL_KOPPEN_CODES.filter((code) => !excludeSet.has(code));
  const usedCodeSet = new Set(usedCodes);
  const usedGroupSet = new Set(usedCodes.map((c) => KOPPEN_CLASSES[c].group));

  const freshGroupCodes = allowedCodes.filter(
    (code) => !usedCodeSet.has(code) && !usedGroupSet.has(KOPPEN_CLASSES[code].group)
  );
  const unusedCodes = allowedCodes.filter((code) => !usedCodeSet.has(code));

  const baseCandidates =
    freshGroupCodes.length > 0
      ? freshGroupCodes
      : unusedCodes.length > 0
        ? unusedCodes
        : allowedCodes;

  // Cross-game anti-repeat: prefer codes not seen in the last 12 rounds
  const recentWindow = recentHistory.slice(-12);
  const recentCodeSet = new Set(recentWindow.map((r) => r.code));
  const notRecentlyPlayedCodes = baseCandidates.filter((code) => !recentCodeSet.has(code));

  let codePool: KoppenCode[];
  if (notRecentlyPlayedCodes.length > 0) {
    codePool = notRecentlyPlayedCodes;
  } else {
    // Otherwise pick randomly among the least-recently-seen half of candidates
    const lastIndexOfCode = new Map<KoppenCode, number>();
    recentHistory.forEach((entry, idx) => lastIndexOfCode.set(entry.code, idx));
    const sorted = [...baseCandidates].sort(
      (a, b) => (lastIndexOfCode.get(a) ?? -1) - (lastIndexOfCode.get(b) ?? -1)
    );
    codePool = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  }

  const chosenCode = pickRandom(codePool);

  // Within chosenCode, pick a region box not recently visited and not yet tried in this discovery loop
  const indexedRegions = SAMPLING_REGIONS.map((region, regionIndex) => ({
    region,
    regionIndex,
  })).filter((item) => item.region.targetCode === chosenCode);

  const untriedRegions = indexedRegions.filter((item) => !triedRegionIndices.has(item.regionIndex));
  const regionCandidates = untriedRegions.length > 0 ? untriedRegions : indexedRegions;

  const recentRegionWindow = recentHistory.slice(-30);
  const recentRegionSet = new Set(recentRegionWindow.map((r) => r.regionIndex));
  const freshRegions = regionCandidates.filter((item) => !recentRegionSet.has(item.regionIndex));

  if (freshRegions.length > 0) {
    return pickRandom(freshRegions);
  }

  // If all boxes for this code were visited in the last 30 rounds, pick from the oldest half
  const lastIndexOfRegion = new Map<number, number>();
  recentHistory.forEach((entry, idx) => lastIndexOfRegion.set(entry.regionIndex, idx));
  const sortedRegions = [...regionCandidates].sort(
    (a, b) => (lastIndexOfRegion.get(a.regionIndex) ?? -1) - (lastIndexOfRegion.get(b.regionIndex) ?? -1)
  );
  const oldestHalf = sortedRegions.slice(0, Math.max(1, Math.ceil(sortedRegions.length / 2)));
  return pickRandom(oldestHalf);
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
  const timeout = setTimeout(() => controller.abort(), 4500);

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
  const timeout = setTimeout(() => controller.abort(), 5500);

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

function isNearRecentLocation(
  lat: number,
  lng: number,
  recentHistory: RecentRoundEntry[]
): boolean {
  for (const entry of recentHistory) {
    if (Math.abs(lat - entry.lat) < 2.0 && Math.abs(lng - entry.lng) < 2.0) {
      return true;
    }
  }
  return false;
}

interface CandidatePoint {
  lat: number;
  lng: number;
  chosenTargetCode: KoppenCode | null;
  chosenRegionIndex: number;
  isUnconstrainedGlobal: boolean;
}

async function generateCandidatePoint(
  usedCodes: KoppenCode[],
  usedCoordKeys: Set<string>,
  excludeCodes: KoppenCode[],
  recentHistory: RecentRoundEntry[],
  triedRegionIndices: Set<number>,
  allowUnconstrainedGlobal: boolean
): Promise<CandidatePoint | null> {
  const tryUnconstrainedGlobal = allowUnconstrainedGlobal && Math.random() < 0.3;

  if (tryUnconstrainedGlobal) {
    for (let t = 0; t < 4; t++) {
      const pt = await sampleRandomGlobalLandCoordinate(-82, 81);
      if (!pt) break;
      const ck = `${Math.round(pt.lat)},${Math.round(pt.lng)}`;
      if (!usedCoordKeys.has(ck) && !isNearRecentLocation(pt.lat, pt.lng, recentHistory)) {
        return {
          lat: pt.lat,
          lng: pt.lng,
          chosenTargetCode: null,
          chosenRegionIndex: -1,
          isUnconstrainedGlobal: true,
        };
      }
    }
  }

  const { region, regionIndex } = chooseSamplingRegion(
    usedCodes,
    excludeCodes,
    recentHistory,
    triedRegionIndices
  );
  triedRegionIndices.add(regionIndex);

  let lat: number | null = null;
  let lng: number | null = null;

  for (let jitter = 0; jitter < 4; jitter++) {
    const pt = await sampleLandPointInBox(
      region.minLat,
      region.maxLat,
      region.minLng,
      region.maxLng
    );
    if (!pt) break;
    lat = pt.lat;
    lng = pt.lng;
    const ck = `${Math.round(lat)},${Math.round(lng)}`;
    if (!usedCoordKeys.has(ck) && !isNearRecentLocation(lat, lng, recentHistory)) {
      break;
    }
  }

  if (lat === null || lng === null) return null;
  const coordKey = `${Math.round(lat)},${Math.round(lng)}`;
  if (usedCoordKeys.has(coordKey)) return null;

  return {
    lat,
    lng,
    chosenTargetCode: region.targetCode,
    chosenRegionIndex: regionIndex,
    isUnconstrainedGlobal: false,
  };
}

/**
 * Randomly samples a land coordinate across Earth and verifies its exact
 * 14-class Köppen classification directly in the browser from real multi-decade climate normals.
 *
 * Uses parallel 2-candidate waves so network lookups resolve quickly without sequential retry stalls.
 */
export async function discoverRandomRound(
  usedCodes: KoppenCode[],
  usedCoordKeys: Set<string>,
  options: {
    maxAttempts?: number;
    excludeCodes?: KoppenCode[];
    recentHistory?: RecentRoundEntry[];
  } = {}
): Promise<RoundLocation> {
  const maxAttempts = options.maxAttempts ?? 18;
  const excludeCodes = options.excludeCodes ?? [];
  const recentHistory = options.recentHistory ?? [];
  const excludeSet = new Set(excludeCodes);
  const usedCodeSet = new Set(usedCodes);
  const recentCodeWindow = new Set(recentHistory.slice(-10).map((r) => r.code));
  const triedRegionIndices = new Set<number>();

  const concurrency = 2;
  const totalWaves = Math.ceil(maxAttempts / concurrency);
  let fallbackMatch: RoundLocation | null = null;

  for (let wave = 0; wave < totalWaves; wave++) {
    const candidates: CandidatePoint[] = [];
    for (let c = 0; c < concurrency; c++) {
      const attemptIdx = wave * concurrency + c;
      const cand = await generateCandidatePoint(
        usedCodes,
        usedCoordKeys,
        excludeCodes,
        recentHistory,
        triedRegionIndices,
        attemptIdx <= 2
      );
      if (cand) candidates.push(cand);
    }

    if (candidates.length === 0) continue;

    const evaluated = await Promise.all(
      candidates.map(async (cand, idx) => {
        try {
          const climate = await fetchClimateForCoords(cand.lat, cand.lng);
          if (!climate || !climate.climateCode || excludeSet.has(climate.climateCode)) {
            return null;
          }
          return { cand, climate, attemptIdx: wave * concurrency + idx };
        } catch {
          return null;
        }
      })
    );

    for (const item of evaluated) {
      if (!item) continue;
      const { cand, climate, attemptIdx } = item;
      const actualCode = climate.climateCode!;

      const loc: RoundLocation = {
        id: `${cand.lat.toFixed(4)}_${cand.lng.toFixed(4)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        lat: cand.lat,
        lng: cand.lng,
        regionIndex: cand.chosenRegionIndex,
        climate: climate as ClimateData & { climateCode: KoppenCode },
      };

      // Keep a valid fallback in case strict diversity filters reject early waves
      if (!fallbackMatch && !usedCodeSet.has(actualCode)) {
        fallbackMatch = loc;
      }

      if (attemptIdx < maxAttempts - 2 && usedCodeSet.has(actualCode)) {
        continue;
      }

      if (attemptIdx < 10) {
        if (cand.isUnconstrainedGlobal) {
          if (recentCodeWindow.has(actualCode)) continue;
        } else if (cand.chosenTargetCode && actualCode !== cand.chosenTargetCode) {
          if (recentCodeWindow.has(actualCode)) continue;
        }
      }

      return loc;
    }

    if (wave >= 3 && fallbackMatch) {
      return fallbackMatch;
    }
  }

  if (fallbackMatch) {
    return fallbackMatch;
  }

  throw new Error('気候データの取得に失敗しました。再試行してください。');
}
