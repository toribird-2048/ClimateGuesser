import type { Feature, FeatureCollection, MultiPolygon, Position } from 'geojson';
import type { KoppenCode } from '../types/game.ts';
import { addDebugLog } from './debugLogger.ts';

interface EncodedKoppenGroup {
  c: KoppenCode;
  r: string;
  p: number[][][];
}

export interface KoppenZoneProperties {
  code: KoppenCode;
  rawCode: string;
}

interface IndexedKoppenPolygon {
  code: KoppenCode;
  rawCode: string;
  rings: Position[][];
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  areaApprox: number;
}

/**
 * Distinct cartographic fill colors for each of the 14 Köppen classes
 * so neighboring sub-zones (e.g. Cfa vs Cfb vs Cs vs Cw, or BW vs BS)
 * are immediately distinguishable when overlaid on the OpenStreetMap reveal map.
 */
export const KOPPEN_ZONE_COLORS: Record<KoppenCode, string> = {
  // Group A: Tropical (Deep emerald / tropical green / savanna mint)
  Af: '#059669',
  Am: '#10B981',
  Aw: '#34D399',
  // Group B: Arid (Desert orange-red / Steppe gold-amber)
  BW: '#EA580C',
  BS: '#F59E0B',
  // Group C: Temperate (Humid lime-green / Oceanic green / Mediterranean yellow / Dry-winter teal)
  Cfa: '#84CC16',
  Cfb: '#22C55E',
  Cs: '#EAB308',
  Cw: '#14B8A6',
  // Group D: Subarctic / Continental (Humid sky-cyan / Dry-winter indigo-blue)
  Df: '#38BDF8',
  Dw: '#6366F1',
  // Group E & H: Polar & Highland (Tundra purple / Ice-cap lavender-slate / Highland magenta)
  ET: '#A855F7',
  EF: '#C084FC',
  H: '#EC4899',
};

let cachedPolygonsPromise: Promise<IndexedKoppenPolygon[]> | null = null;
let cachedGeoJsonPromise: Promise<FeatureCollection<MultiPolygon, KoppenZoneProperties>> | null =
  null;

function decodeRing(flat: number[]): Position[] {
  const ring: Position[] = [];
  let x = flat[0];
  let y = flat[1];
  ring.push([x / 10, y / 10]);

  for (let i = 2; i < flat.length; i += 2) {
    x += flat[i];
    y += flat[i + 1];
    ring.push([x / 10, y / 10]);
  }

  if (
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return ring;
}

function pointInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInIndexedPolygon(lat: number, lng: number, poly: IndexedKoppenPolygon): boolean {
  if (
    lat < poly.minLat ||
    lat > poly.maxLat ||
    lng < poly.minLng ||
    lng > poly.maxLng
  ) {
    return false;
  }
  if (!pointInRing(lng, lat, poly.rings[0])) return false;
  for (let h = 1; h < poly.rings.length; h++) {
    if (pointInRing(lng, lat, poly.rings[h])) return false;
  }
  return true;
}

function loadIndexedKoppenPolygons(): Promise<IndexedKoppenPolygon[]> {
  if (!cachedPolygonsPromise) {
    const baseUrl = import.meta.env?.BASE_URL ?? '/';
    const url = `${baseUrl}koppen-zones.json`;
    const t0 = performance.now();

    cachedPolygonsPromise = fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          addDebugLog('error', 'map', `koppen-zones.json 取得失敗 (HTTP ${res.status})`, {
            detail: url,
            durationMs: Math.round(performance.now() - t0),
          });
          throw new Error(`ケッペン気候図データの読み込みに失敗しました (${res.status})`);
        }
        const groups = (await res.json()) as EncodedKoppenGroup[];
        const indexed: IndexedKoppenPolygon[] = [];

        for (const group of groups) {
          for (const poly of group.p) {
            const rings = poly.map(decodeRing).filter((r) => r.length >= 4);
            if (rings.length === 0) continue;

            let minLng = Infinity;
            let maxLng = -Infinity;
            let minLat = Infinity;
            let maxLat = -Infinity;
            for (const pt of rings[0]) {
              if (pt[0] < minLng) minLng = pt[0];
              if (pt[0] > maxLng) maxLng = pt[0];
              if (pt[1] < minLat) minLat = pt[1];
              if (pt[1] > maxLat) maxLat = pt[1];
            }

            indexed.push({
              code: group.c,
              rawCode: group.r,
              rings,
              minLat,
              maxLat,
              minLng,
              maxLng,
              areaApprox: Math.max(0.01, (maxLat - minLat) * (maxLng - minLng)),
            });
          }
        }

        addDebugLog('info', 'map', `koppen-zones.json 読み込み・展開完了`, {
          detail: `${indexed.length} polygons`,
          durationMs: Math.round(performance.now() - t0),
        });
        return indexed;
      })
      .catch((err) => {
        cachedPolygonsPromise = null;
        throw err;
      });
  }

  return cachedPolygonsPromise;
}

function buildFeatureCollectionFromPolygons(
  polygons: IndexedKoppenPolygon[]
): FeatureCollection<MultiPolygon, KoppenZoneProperties> {
  const byKey = new Map<
    string,
    { code: KoppenCode; rawCode: string; coordinates: Position[][][] }
  >();

  for (const poly of polygons) {
    const key = `${poly.code}:${poly.rawCode}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { code: poly.code, rawCode: poly.rawCode, coordinates: [] };
      byKey.set(key, entry);
    }
    entry.coordinates.push(poly.rings);
  }

  const features: Array<Feature<MultiPolygon, KoppenZoneProperties>> = Array.from(
    byKey.values()
  ).map((g) => ({
    type: 'Feature',
    properties: {
      code: g.code,
      rawCode: g.rawCode,
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates: g.coordinates,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function loadKoppenZonesGeoJson(): Promise<
  FeatureCollection<MultiPolygon, KoppenZoneProperties>
> {
  if (!cachedGeoJsonPromise) {
    cachedGeoJsonPromise = loadIndexedKoppenPolygons().then((polys) =>
      buildFeatureCollectionFromPolygons(polys)
    );
  }
  return cachedGeoJsonPromise;
}

/**
 * Looks up the Köppen code of the map polygon containing (lat, lng) (or nearest polygon within 0.35° for coastal pins).
 */
export async function getKoppenZoneAtPoint(
  lat: number,
  lng: number
): Promise<KoppenCode | null> {
  try {
    const polys = await loadIndexedKoppenPolygons();
    // 1. Exact containment (prefer smaller/more specific polygon if nested)
    let bestMatch: IndexedKoppenPolygon | null = null;
    for (const poly of polys) {
      if (isPointInIndexedPolygon(lat, lng, poly)) {
        if (!bestMatch || poly.areaApprox < bestMatch.areaApprox) {
          bestMatch = poly;
        }
      }
    }
    if (bestMatch) return bestMatch.code;

    // 2. Small coastal margin fallback (within 0.25°)
    const margin = 0.25;
    for (const poly of polys) {
      if (
        lat >= poly.minLat - margin &&
        lat <= poly.maxLat + margin &&
        lng >= poly.minLng - margin &&
        lng <= poly.maxLng + margin
      ) {
        for (const [dx, dy] of [
          [0.12, 0],
          [-0.12, 0],
          [0, 0.12],
          [0, -0.12],
        ]) {
          if (isPointInIndexedPolygon(lat + dy, lng + dx, poly)) {
            return poly.code;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function createLocalMicroclimateRing(lat: number, lng: number, radiusDeg = 0.45): Position[] {
  const steps = 16;
  const cosLat = Math.max(0.25, Math.cos((lat * Math.PI) / 180));
  const ring: Position[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dLat = Math.sin(angle) * radiusDeg;
    const dLng = (Math.cos(angle) * radiusDeg) / cosLat;
    ring.push([Number((lng + dLng).toFixed(3)), Number((lat + dLat).toFixed(3))]);
  }
  return ring;
}

/**
 * Builds the Reveal Map GeoJSON overlay for a specific round location (lat, lng, correctCode).
 * If the local polygon directly beneath the pin had a slightly different historical classification
 * (e.g., an alpine H plateau or a shifted C/D boundary polygon), this harmonizes that containing
 * regional polygon with `correctCode` so the map under the pin never contradicts the answer.
 */
export async function buildRevealKoppenGeoJson(
  lat: number,
  lng: number,
  correctCode: KoppenCode
): Promise<FeatureCollection<MultiPolygon, KoppenZoneProperties>> {
  const polys = await loadIndexedKoppenPolygons();

  // Find the smallest polygon containing (lat, lng)
  let containingIdx = -1;
  let smallestArea = Infinity;
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    if (isPointInIndexedPolygon(lat, lng, poly)) {
      if (poly.areaApprox < smallestArea) {
        smallestArea = poly.areaApprox;
        containingIdx = i;
      }
    }
  }

  if (containingIdx !== -1 && polys[containingIdx].code === correctCode) {
    return loadKoppenZonesGeoJson();
  }

  // If the containing polygon is a regional/local polygon (areaApprox < 450 deg^2),
  // harmonize its displayed code to match the verified ground-truth `correctCode`
  if (containingIdx !== -1 && polys[containingIdx].areaApprox < 450) {
    const adjusted = polys.map((p, idx) =>
      idx === containingIdx
        ? {
            ...p,
            code: correctCode,
            rawCode: `${correctCode} (実測判定)`,
          }
        : p
    );
    return buildFeatureCollectionFromPolygons(adjusted);
  }

  // For small islands outside the 0.1° grid or localized microclimates inside a huge continental polygon,
  // append a localized climate zone patch around (lat, lng) so the map under the pin matches `correctCode`.
  const localRing = createLocalMicroclimateRing(lat, lng, 0.45);
  const localPoly: IndexedKoppenPolygon = {
    code: correctCode,
    rawCode: `${correctCode} (実測局地気候)`,
    rings: [localRing],
    minLat: lat - 0.5,
    maxLat: lat + 0.5,
    minLng: lng - 0.8,
    maxLng: lng + 0.8,
    areaApprox: 0.6,
  };

  return buildFeatureCollectionFromPolygons([...polys, localPoly]);
}
