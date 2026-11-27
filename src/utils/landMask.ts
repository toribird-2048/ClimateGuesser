import type { GeoJsonObject, Position } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Objects, Topology } from 'topojson-specification';
import { addDebugLog } from './debugLogger.ts';

export interface WorldAtlasObjects extends Objects {
  countries: GeometryCollection;
  land: GeometryCollection;
}

interface LandPolygon {
  rings: Position[][];
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

let cachedTopologyPromise: Promise<Topology<WorldAtlasObjects>> | null = null;
let cachedLandPolygonsPromise: Promise<LandPolygon[]> | null = null;

export function loadWorldAtlasTopology(): Promise<Topology<WorldAtlasObjects>> {
  if (!cachedTopologyPromise) {
    const baseUrl = import.meta.env?.BASE_URL ?? '/';
    const url = `${baseUrl}world-50m.json`;
    const t0 = performance.now();
    cachedTopologyPromise = fetch(url)
      .then((res) => {
        if (!res.ok) {
          addDebugLog('error', 'map', `world-50m.json 取得失敗 (HTTP ${res.status})`, {
            detail: url,
            durationMs: Math.round(performance.now() - t0),
          });
          throw new Error(`地図データの読み込みに失敗しました (${res.status})`);
        }
        addDebugLog('info', 'map', `world-50m.json 読み込み完了`, {
          detail: url,
          durationMs: Math.round(performance.now() - t0),
        });
        return res.json() as Promise<Topology<WorldAtlasObjects>>;
      })
      .catch((err) => {
        cachedTopologyPromise = null;
        addDebugLog('error', 'map', `world-50m.json 読み込み例外`, {
          detail: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
  }
  return cachedTopologyPromise;
}

function buildLandPolygons(geo: GeoJsonObject): LandPolygon[] {
  const polys: LandPolygon[] = [];

  const addPoly = (rawRings: Position[][]) => {
    if (rawRings.length === 0 || rawRings[0].length < 4) return;
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const pt of rawRings[0]) {
      if (pt[0] < minLng) minLng = pt[0];
      if (pt[0] > maxLng) maxLng = pt[0];
      if (pt[1] < minLat) minLat = pt[1];
      if (pt[1] > maxLat) maxLat = pt[1];
    }

    polys.push({ rings: rawRings, minLng, maxLng, minLat, maxLat });
  };

  const visit = (g: GeoJsonObject | null | undefined) => {
    if (!g) return;
    if (g.type === 'FeatureCollection') {
      (g as GeoJSON.FeatureCollection).features.forEach((f) => visit(f.geometry));
    } else if (g.type === 'Feature') {
      visit((g as GeoJSON.Feature).geometry);
    } else if (g.type === 'Polygon') {
      addPoly((g as GeoJSON.Polygon).coordinates);
    } else if (g.type === 'MultiPolygon') {
      (g as GeoJSON.MultiPolygon).coordinates.forEach(addPoly);
    }
  };

  visit(geo);
  return polys;
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

function isPointInLandPolygons(lat: number, lng: number, polys: LandPolygon[]): boolean {
  for (const poly of polys) {
    if (lng < poly.minLng || lng > poly.maxLng || lat < poly.minLat || lat > poly.maxLat) {
      continue;
    }
    if (!pointInRing(lng, lat, poly.rings[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.rings.length; h++) {
      if (pointInRing(lng, lat, poly.rings[h])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

async function getLandPolygons(): Promise<LandPolygon[] | null> {
  if (!cachedLandPolygonsPromise) {
    cachedLandPolygonsPromise = loadWorldAtlasTopology().then((topology) => {
      const landGeo = feature(topology, topology.objects.land) as unknown as GeoJsonObject;
      return buildLandPolygons(landGeo);
    });
  }
  try {
    return await cachedLandPolygonsPromise;
  } catch {
    cachedLandPolygonsPromise = null;
    return null;
  }
}

export async function isLandCoordinate(lat: number, lng: number): Promise<boolean> {
  const polys = await getLandPolygons();
  if (!polys) return true;
  return isPointInLandPolygons(lat, lng, polys);
}

/**
 * Samples a verified land point within [minLat..maxLat, minLng..maxLng] using world-50m polygons.
 * Runs locally in < 5ms so broad regional/archipelago boxes never waste API calls on ocean points.
 */
export async function sampleLandPointInBox(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  maxTries = 80
): Promise<{ lat: number; lng: number } | null> {
  const polys = await getLandPolygons();

  const pickInBox = () => ({
    lat: Number((minLat + Math.random() * (maxLat - minLat)).toFixed(4)),
    lng: Number((minLng + Math.random() * (maxLng - minLng)).toFixed(4)),
  });

  if (!polys) {
    return pickInBox();
  }

  for (let i = 0; i < maxTries; i++) {
    const pt = pickInBox();
    if (isPointInLandPolygons(pt.lat, pt.lng, polys)) {
      return pt;
    }
  }
  return null;
}

/**
 * Samples an area-weighted random land coordinate anywhere on Earth's continents or islands.
 */
export async function sampleRandomGlobalLandCoordinate(
  minLat = -82,
  maxLat = 81,
  maxTries = 120
): Promise<{ lat: number; lng: number } | null> {
  const polys = await getLandPolygons();
  if (!polys) return null;

  const sinMin = Math.sin((minLat * Math.PI) / 180);
  const sinMax = Math.sin((maxLat * Math.PI) / 180);

  for (let i = 0; i < maxTries; i++) {
    const sinLat = sinMin + Math.random() * (sinMax - sinMin);
    const lat = Number(((Math.asin(sinLat) * 180) / Math.PI).toFixed(4));
    const lng = Number((-180 + Math.random() * 360).toFixed(4));
    if (isPointInLandPolygons(lat, lng, polys)) {
      return { lat, lng };
    }
  }
  return null;
}
