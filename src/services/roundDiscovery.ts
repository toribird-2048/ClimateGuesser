import { ALL_KOPPEN_CODES, KOPPEN_CLASSES } from '../data/koppen.ts';
import { SAMPLING_REGIONS, type SamplingRegion } from '../data/samplingRegions.ts';
import type { ClimateData, KoppenCode, ReverseGeocodeResult, RoundLocation } from '../types/game.ts';

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
function chooseSamplingRegion(usedCodes: KoppenCode[]): SamplingRegion {
  const usedCodeSet = new Set(usedCodes);
  const usedGroupSet = new Set(usedCodes.map((c) => KOPPEN_CLASSES[c].group));

  const freshGroupCodes = ALL_KOPPEN_CODES.filter(
    (code) => !usedCodeSet.has(code) && !usedGroupSet.has(KOPPEN_CLASSES[code].group)
  );
  const unusedCodes = ALL_KOPPEN_CODES.filter((code) => !usedCodeSet.has(code));

  const poolCodes =
    freshGroupCodes.length > 0
      ? freshGroupCodes
      : unusedCodes.length > 0
        ? unusedCodes
        : ALL_KOPPEN_CODES;

  const chosenCode = pickRandom(poolCodes);
  const matchingRegions = SAMPLING_REGIONS.filter((r) => r.targetCode === chosenCode);
  return matchingRegions.length > 0
    ? pickRandom(matchingRegions)
    : pickRandom(SAMPLING_REGIONS);
}

async function fetchClimateForCoords(lat: number, lng: number): Promise<ClimateData | null> {
  const res = await fetch(
    `/api/climate?lat=${encodeURIComponent(lat.toFixed(4))}&lng=${encodeURIComponent(lng.toFixed(4))}`
  );
  if (!res.ok) return null;
  return (await res.json()) as ClimateData;
}

export async function fetchReverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  try {
    const res = await fetch(
      `/api/reverse-geocode?lat=${encodeURIComponent(lat.toFixed(5))}&lng=${encodeURIComponent(lng.toFixed(5))}`
    );
    if (!res.ok) {
      return { placeName: null, countryName: null, formattedAddress: null };
    }
    const data = (await res.json()) as ReverseGeocodeResult;
    return {
      placeName: data.placeName ?? null,
      countryName: data.countryName ?? null,
      formattedAddress: data.formattedAddress ?? null,
    };
  } catch {
    return { placeName: null, countryName: null, formattedAddress: null };
  }
}

/**
 * Randomly samples an inland coordinate in a global climate belt and verifies its exact
 * 12-class Köppen classification from real 10-year monthly climate normals.
 */
export async function discoverRandomRound(
  usedCodes: KoppenCode[],
  usedCoordKeys: Set<string>,
  maxAttempts = 12
): Promise<RoundLocation> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const region = chooseSamplingRegion(usedCodes);
    const lat = Number(randomInRange(region.minLat, region.maxLat).toFixed(4));
    const lng = Number(randomInRange(region.minLng, region.maxLng).toFixed(4));
    const coordKey = `${Math.round(lat)},${Math.round(lng)}`;

    if (usedCoordKeys.has(coordKey)) {
      continue;
    }

    try {
      const climate = await fetchClimateForCoords(lat, lng);
      // Skip coordinates that resolve to Cw (outside the 12-class set) or failed lookup
      if (!climate || !climate.climateCode) {
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
  }

  throw new Error('気候データの取得に失敗しました。再試行してください。');
}
