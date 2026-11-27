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
import { getKoppenZoneAtPoint } from '../utils/koppenMapLayer.ts';
import { addDebugLog } from '../utils/debugLogger.ts';

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

// Track when NASA POWER is slow or rate-limiting during continuous play so we hedge with Open-Meteo immediately
let nasaDegradedUntil = 0;
const NASA_HEDGE_DELAY_MS = 1200;
const SESSION_CODE_WINDOW = 5;

/**
 * Selects a sampling region biased toward:
 * 1) climate classes & groups unseen in the recent session window (last 5 rounds),
 * 2) climate classes not played in the last ~10 rounds across sessions (prevents H/EF dominance),
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
  // Use a sliding window of the most recent SESSION_CODE_WINDOW codes so continuous play never exhausts all 13-14 classes
  const activeUsedCodes = usedCodes.slice(-SESSION_CODE_WINDOW);
  const usedCodeSet = new Set(activeUsedCodes);
  const usedGroupSet = new Set(activeUsedCodes.map((c) => KOPPEN_CLASSES[c].group));

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

  // Cross-game anti-repeat: prefer codes not seen in the last 8 rounds
  const recentWindow = recentHistory.slice(-8);
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

  const recentRegionWindow = recentHistory.slice(-24);
  const recentRegionSet = new Set(recentRegionWindow.map((r) => r.regionIndex));
  const freshRegions = regionCandidates.filter((item) => !recentRegionSet.has(item.regionIndex));

  if (freshRegions.length > 0) {
    return pickRandom(freshRegions);
  }

  // If all boxes for this code were visited recently, pick from the oldest half
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
async function fetchClimateFromNasaPower(
  lat: number,
  lng: number,
  externalSignal?: AbortSignal
): Promise<ClimateData | null> {
  const url = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
  url.searchParams.set('parameters', 'T2M,PRECTOTCORR');
  url.searchParams.set('community', 'AG');
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('format', 'JSON');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3200);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
  const t0 = performance.now();

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    const elapsed = Math.round(performance.now() - t0);
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        nasaDegradedUntil = Date.now() + 45_000;
      }
      addDebugLog(
        'warn',
        'climate-api',
        `NASA POWER HTTP ${response.status} @ (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
        { durationMs: elapsed }
      );
      return null;
    }

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
        addDebugLog(
          'warn',
          'climate-api',
          `NASA POWER 欠損値 (-999) @ (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
          { durationMs: Math.round(performance.now() - t0) }
        );
        return null;
      }
      monthlyTempC.push(tVal);
      monthlyPrecipMm.push(Math.max(0, pVal * DAYS_PER_MONTH[i]));
    }

    const rawElev = payload.geometry?.coordinates?.[2];
    const elevation =
      typeof rawElev === 'number' && Number.isFinite(rawElev) && rawElev > -500 ? rawElev : 0;

    const totalElapsed = Math.round(performance.now() - t0);
    if (totalElapsed > 2200) {
      nasaDegradedUntil = Date.now() + 30_000;
    }

    const classified = classifyKoppen12(monthlyTempC, monthlyPrecipMm, lat, elevation);
    addDebugLog(
      'info',
      'climate-api',
      `NASA POWER OK @ (${lat.toFixed(2)}, ${lng.toFixed(2)}) -> ${classified.climateCode ?? classified.rawCode} (${Math.round(elevation)}m)`,
      { durationMs: totalElapsed }
    );
    return classified;
  } catch (err) {
    if (!externalSignal?.aborted) {
      nasaDegradedUntil = Date.now() + 45_000;
      addDebugLog(
        'warn',
        'climate-api',
        `NASA POWER 遅延/タイムアウト @ (${lat.toFixed(2)}, ${lng.toFixed(2)}) -> Open-Meteo併用モードへ切替`,
        {
          detail: err instanceof Error ? err.message : String(err),
          durationMs: Math.round(performance.now() - t0),
        }
      );
    }
    return null;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Direct client-side Open-Meteo Archive API fallback (CORS-enabled, keyless, 5-year daily normals).
 */
async function fetchClimateFromOpenMeteo(
  lat: number,
  lng: number,
  externalSignal?: AbortSignal
): Promise<ClimateData | null> {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('start_date', '2020-01-01');
  url.searchParams.set('end_date', '2024-12-31');
  url.searchParams.set('daily', 'temperature_2m_mean,precipitation_sum');
  url.searchParams.set('timezone', 'UTC');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3800);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
  const t0 = performance.now();

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      addDebugLog(
        'error',
        'climate-api',
        `Open-Meteo HTTP ${response.status} @ (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
        { durationMs: Math.round(performance.now() - t0) }
      );
      return null;
    }

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
    const classified = classifyKoppen12(monthlyTempC, monthlyPrecipMm, lat, elevation);
    addDebugLog(
      'info',
      'climate-api',
      `Open-Meteo OK @ (${lat.toFixed(2)}, ${lng.toFixed(2)}) -> ${classified.climateCode ?? classified.rawCode}`,
      { durationMs: Math.round(performance.now() - t0) }
    );
    return classified;
  } catch (err) {
    if (!externalSignal?.aborted) {
      addDebugLog(
        'error',
        'climate-api',
        `Open-Meteo 失敗 @ (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
        {
          detail: err instanceof Error ? err.message : String(err),
          durationMs: Math.round(performance.now() - t0),
        }
      );
    }
    return null;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Fetches climate data for (lat, lng) using a hedged request strategy:
 * - Starts NASA POWER immediately.
 * - If NASA POWER hasn't responded within 1.2s (or immediately if NASA POWER stalled recently),
 *   launches Open-Meteo in parallel and resolves as soon as EITHER returns valid ClimateData,
 *   aborting the slower in-flight request.
 */
async function fetchClimateForCoords(
  lat: number,
  lng: number,
  waveSignal?: AbortSignal
): Promise<ClimateData | null> {
  const key = getGridKey(lat, lng);
  const existing = climateCache.get(key);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing.data;
  }

  const nasaController = new AbortController();
  const meteoController = new AbortController();
  const abortBoth = () => {
    nasaController.abort();
    meteoController.abort();
  };
  waveSignal?.addEventListener('abort', abortBoth, { once: true });

  const isNasaDegraded = Date.now() < nasaDegradedUntil;
  const hedgeDelay = isNasaDegraded ? 0 : NASA_HEDGE_DELAY_MS;

  try {
    const climate = await new Promise<ClimateData | null>((resolve) => {
      let settled = false;
      let pendingCount = 1; // NASA starts immediately
      let meteoStarted = false;
      let hedgeTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = (result: ClimateData | null) => {
        if (settled) return;
        settled = true;
        if (hedgeTimer) clearTimeout(hedgeTimer);
        nasaController.abort();
        meteoController.abort();
        resolve(result);
      };

      const startMeteo = () => {
        if (meteoStarted || settled || waveSignal?.aborted) return;
        meteoStarted = true;
        pendingCount += 1;
        void fetchClimateFromOpenMeteo(lat, lng, meteoController.signal).then((res) => {
          if (res) {
            finish(res);
          } else {
            pendingCount -= 1;
            if (pendingCount <= 0) finish(null);
          }
        });
      };

      if (hedgeDelay === 0) {
        startMeteo();
      } else {
        hedgeTimer = setTimeout(startMeteo, hedgeDelay);
      }

      void fetchClimateFromNasaPower(lat, lng, nasaController.signal).then((res) => {
        if (res) {
          finish(res);
        } else {
          pendingCount -= 1;
          // NASA failed early (< 1.2s): trigger Open-Meteo right away instead of waiting for timer
          if (!meteoStarted) {
            if (hedgeTimer) clearTimeout(hedgeTimer);
            startMeteo();
          } else if (pendingCount <= 0) {
            finish(null);
          }
        }
      });
    });

    if (climate) {
      setBoundedCache(climateCache, key, climate);
    }
    return climate;
  } finally {
    waveSignal?.removeEventListener('abort', abortBoth);
  }
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
  const tryUnconstrainedGlobal = allowUnconstrainedGlobal && Math.random() < 0.28;

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

  for (let jitter = 0; jitter < 10; jitter++) {
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
    if (usedCoordKeys.has(ck) || isNearRecentLocation(lat, lng, recentHistory)) {
      continue;
    }
    const mapZone = await getKoppenZoneAtPoint(lat, lng);
    if (!mapZone || mapZone === region.targetCode) {
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
 * Uses parallel candidate waves with first-acceptable early resolution + hedged NASA/Open-Meteo
 * requests so a single slow API call or exhausted code pool never stalls continuous play.
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
  const maxAttempts = options.maxAttempts ?? 15;
  const excludeCodes = options.excludeCodes ?? [];
  const recentHistory = options.recentHistory ?? [];
  const excludeSet = new Set(excludeCodes);
  // Bound session code exclusion to the last SESSION_CODE_WINDOW rounds so continuous Endless/Versus play never starves
  const activeUsedCodes = usedCodes.slice(-SESSION_CODE_WINDOW);
  const usedCodeSet = new Set(activeUsedCodes);
  const recentCodeWindow = new Set(recentHistory.slice(-6).map((r) => r.code));
  const triedRegionIndices = new Set<number>();

  const concurrency = 3;
  const totalWaves = Math.ceil(maxAttempts / concurrency);
  let alignedUnusedFallback: RoundLocation | null = null;
  let unusedFallbackMatch: RoundLocation | null = null;
  let anyFallbackMatch: RoundLocation | null = null;

  for (let wave = 0; wave < totalWaves; wave++) {
    const candidates: CandidatePoint[] = [];
    for (let c = 0; c < concurrency; c++) {
      const attemptIdx = wave * concurrency + c;
      const cand = await generateCandidatePoint(
        activeUsedCodes,
        usedCoordKeys,
        excludeCodes,
        recentHistory,
        triedRegionIndices,
        attemptIdx <= 2
      );
      if (cand) candidates.push(cand);
    }

    if (candidates.length === 0) continue;

    const waveAbort = new AbortController();

    // Resolve as soon as the FIRST acceptable candidate in this wave finishes
    // instead of blocking on the slowest candidate via Promise.all
    const acceptedInWave = await new Promise<RoundLocation | null>((resolveWave) => {
      let settled = false;
      let remaining = candidates.length;

      candidates.forEach((cand) => {
        void Promise.all([
          fetchClimateForCoords(cand.lat, cand.lng, waveAbort.signal),
          getKoppenZoneAtPoint(cand.lat, cand.lng),
        ])
          .then(([climate, mapZoneCode]) => {
            if (settled) return;
            if (climate && climate.climateCode && !excludeSet.has(climate.climateCode)) {
              const actualCode = climate.climateCode;
              const matchesMapZone = !mapZoneCode || mapZoneCode === actualCode;

              const loc: RoundLocation = {
                id: `${cand.lat.toFixed(4)}_${cand.lng.toFixed(4)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                lat: cand.lat,
                lng: cand.lng,
                regionIndex: cand.chosenRegionIndex,
                climate: climate as ClimateData & { climateCode: KoppenCode },
              };

              if (!anyFallbackMatch) {
                anyFallbackMatch = loc;
              }
              if (!unusedFallbackMatch && !usedCodeSet.has(actualCode)) {
                unusedFallbackMatch = loc;
              }
              if (!alignedUnusedFallback && !usedCodeSet.has(actualCode) && matchesMapZone) {
                alignedUnusedFallback = loc;
              }

              const isUsedInWindow = usedCodeSet.has(actualCode);
              const isRecentMismatch =
                wave === 0 &&
                recentCodeWindow.has(actualCode) &&
                (cand.isUnconstrainedGlobal ||
                  (cand.chosenTargetCode !== null && actualCode !== cand.chosenTargetCode));

              if (!isUsedInWindow && !isRecentMismatch && matchesMapZone) {
                settled = true;
                waveAbort.abort();
                resolveWave(loc);
                return;
              }
            }

            remaining -= 1;
            if (remaining <= 0 && !settled) {
              settled = true;
              resolveWave(null);
            }
          })
          .catch(() => {
            remaining -= 1;
            if (remaining <= 0 && !settled) {
              settled = true;
              resolveWave(null);
            }
          });
      });
    });

    if (acceptedInWave) {
      return acceptedInWave;
    }

    if (alignedUnusedFallback) {
      return alignedUnusedFallback;
    }

    // After wave 1 (6 parallel candidates), return unusedFallbackMatch or anyFallbackMatch so we never stall
    if (wave >= 1) {
      if (unusedFallbackMatch) return unusedFallbackMatch;
      if (anyFallbackMatch) return anyFallbackMatch;
    }
  }

  if (alignedUnusedFallback) return alignedUnusedFallback;
  if (unusedFallbackMatch) return unusedFallbackMatch;
  if (anyFallbackMatch) return anyFallbackMatch;

  addDebugLog('error', 'discovery', `最大試行回数 (${maxAttempts}) 内に地点を確定できませんでした`);
  throw new Error('気候データの取得に失敗しました。再試行してください。');
}

/**
 * Debug helper: loads a specific coordinate or forces a specific target Köppen class
 * so the user can test any location or biome directly from Debug Mode.
 */
export async function discoverDebugRound(options: {
  lat?: number;
  lng?: number;
  targetCode?: KoppenCode;
}): Promise<RoundLocation> {
  if (typeof options.lat === 'number' && typeof options.lng === 'number') {
    const lat = Number(options.lat.toFixed(4));
    const lng = Number(options.lng.toFixed(4));
    const climate = await fetchClimateForCoords(lat, lng);
    if (!climate || !climate.climateCode) {
      addDebugLog('error', 'discovery', `指定座標 (${lat}, ${lng}) の気候データ取得に失敗`);
      throw new Error(`指定座標 (${lat}, ${lng}) の気候データを取得できませんでした。`);
    }
    addDebugLog(
      'info',
      'discovery',
      `デバッグ座標指定ロード: (${lat}, ${lng}) -> ${climate.climateCode}`
    );
    return {
      id: `debug_${lat.toFixed(4)}_${lng.toFixed(4)}_${Date.now()}`,
      lat,
      lng,
      regionIndex: -1,
      climate: climate as ClimateData & { climateCode: KoppenCode },
    };
  }

  const targetCode = options.targetCode ?? 'Cfa';
  const candidateRegions = SAMPLING_REGIONS.map((region, regionIndex) => ({
    region,
    regionIndex,
  })).filter((item) => item.region.targetCode === targetCode);

  for (let attempt = 0; attempt < 12; attempt++) {
    const picked = pickRandom(candidateRegions);
    const pt = await sampleLandPointInBox(
      picked.region.minLat,
      picked.region.maxLat,
      picked.region.minLng,
      picked.region.maxLng
    );
    if (!pt) continue;
    const climate = await fetchClimateForCoords(pt.lat, pt.lng);
    if (!climate || !climate.climateCode) continue;
    if (attempt < 9 && climate.climateCode !== targetCode) continue;

    addDebugLog(
      'info',
      'discovery',
      `デバッグ気候指定ロード (${targetCode}): (${pt.lat}, ${pt.lng}) [region #${picked.regionIndex}] -> ${climate.climateCode}`
    );
    return {
      id: `debug_${pt.lat.toFixed(4)}_${pt.lng.toFixed(4)}_${Date.now()}`,
      lat: pt.lat,
      lng: pt.lng,
      regionIndex: picked.regionIndex,
      climate: climate as ClimateData & { climateCode: KoppenCode },
    };
  }

  throw new Error(`${targetCode} のテスト地点取得に失敗しました。もう一度お試しください。`);
}
