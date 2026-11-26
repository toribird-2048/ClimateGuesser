import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { GeoJsonObject, MultiLineString, MultiPolygon, Position } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { RoundLocation } from '../types/game.ts';
import { loadWorldAtlasTopology } from '../utils/landMask.ts';

interface BlankMapViewportProps {
  location: RoundLocation;
  resetCounter: number;
  focusPinCounter: number;
  onZoomChange: (zoom: number) => void;
}

interface BlankMapLayers {
  land: GeoJsonObject;
  borders: GeoJsonObject;
}

const WORLD_OFFSETS = [-360, 0, 360] as const;

let cachedLayersPromise: Promise<BlankMapLayers> | null = null;

/**
 * Unwraps antimeridian-crossing rings (e.g. Chukotka, Wrangel Island, Fiji) so Leaflet
 * never draws horizontal streak lines across the map, and closes polar-encircling rings
 * (Antarctica) cleanly along the southern Mercator boundary.
 */
function normalizeRing(rawRing: Position[]): Position[] | null {
  if (rawRing.length < 4) return null;

  // Discard degenerate polar-cap hole rings outside Web Mercator bounds (e.g. lat = -89.999)
  if (rawRing.every((pt) => pt[1] < -85 || pt[1] > 85)) {
    return null;
  }

  const openLen = rawRing.length - 1;
  const unwrapped: Position[] = [[rawRing[0][0], rawRing[0][1]]];

  for (let i = 1; i < openLen; i++) {
    const prevLng = unwrapped[i - 1][0];
    let lng = rawRing[i][0];
    const lat = rawRing[i][1];
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    unwrapped.push([lng, lat]);
  }

  const first = unwrapped[0];
  const last = unwrapped[unwrapped.length - 1];
  const netSpan = last[0] - first[0];

  // Polar-encircling landmass (Antarctica spans ~360° of longitude):
  // Close along lat = ±85° in small steps instead of jumping straight across the globe.
  if (Math.abs(netSpan) > 180) {
    const poleLat = first[1] < 0 ? -85 : 85;
    const clamped: Position[] = unwrapped.map(([lng, lat]) => [
      lng,
      Math.max(-85, Math.min(85, lat)),
    ]);
    const startLng = clamped[0][0];
    const endLng = netSpan > 0 ? startLng + 360 : startLng - 360;
    clamped.push([endLng, clamped[clamped.length - 1][1]]);
    clamped.push([endLng, poleLat]);

    const stepDir = startLng > endLng ? 10 : -10;
    for (
      let lng = endLng + stepDir;
      stepDir > 0 ? lng < startLng : lng > startLng;
      lng += stepDir
    ) {
      clamped.push([lng, poleLat]);
    }

    clamped.push([startLng, poleLat]);
    clamped.push([startLng, clamped[0][1]]);
    return clamped;
  }

  unwrapped.push([first[0], first[1]]);
  return unwrapped;
}

function normalizeLine(rawLine: Position[]): Position[] {
  if (rawLine.length < 2) return rawLine;
  const unwrapped: Position[] = [[rawLine[0][0], rawLine[0][1]]];
  for (let i = 1; i < rawLine.length; i++) {
    const prevLng = unwrapped[i - 1][0];
    let lng = rawLine[i][0];
    const lat = rawLine[i][1];
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    unwrapped.push([lng, lat]);
  }
  return unwrapped;
}

function shiftCoords(coords: Position[], offsetLng: number): Position[] {
  if (offsetLng === 0) return coords;
  return coords.map(([lng, lat]) => [lng + offsetLng, lat]);
}

function buildWrappedLand(rawLand: GeoJsonObject): MultiPolygon {
  const basePolygons: Position[][][] = [];

  const collectGeometry = (geom: GeoJsonObject) => {
    if (geom.type === 'FeatureCollection') {
      const fc = geom as GeoJSON.FeatureCollection;
      for (const f of fc.features) {
        if (f.geometry) collectGeometry(f.geometry);
      }
    } else if (geom.type === 'Feature') {
      const f = geom as GeoJSON.Feature;
      if (f.geometry) collectGeometry(f.geometry);
    } else if (geom.type === 'Polygon') {
      const p = geom as GeoJSON.Polygon;
      const rings = p.coordinates
        .map(normalizeRing)
        .filter((r): r is Position[] => r !== null);
      if (rings.length > 0) basePolygons.push(rings);
    } else if (geom.type === 'MultiPolygon') {
      const mp = geom as GeoJSON.MultiPolygon;
      for (const poly of mp.coordinates) {
        const rings = poly
          .map(normalizeRing)
          .filter((r): r is Position[] => r !== null);
        if (rings.length > 0) basePolygons.push(rings);
      }
    }
  };

  collectGeometry(rawLand);

  const wrappedPolygons: Position[][][] = [];
  for (const offset of WORLD_OFFSETS) {
    for (const poly of basePolygons) {
      wrappedPolygons.push(poly.map((ring) => shiftCoords(ring, offset)));
    }
  }

  return {
    type: 'MultiPolygon',
    coordinates: wrappedPolygons,
  };
}

function buildWrappedBorders(rawBorders: GeoJsonObject): MultiLineString {
  const baseLines: Position[][] = [];

  if (rawBorders.type === 'MultiLineString') {
    const ml = rawBorders as GeoJSON.MultiLineString;
    for (const line of ml.coordinates) {
      if (line.length >= 2) baseLines.push(normalizeLine(line));
    }
  } else if (rawBorders.type === 'LineString') {
    const l = rawBorders as GeoJSON.LineString;
    if (l.coordinates.length >= 2) baseLines.push(normalizeLine(l.coordinates));
  }

  const wrappedLines: Position[][] = [];
  for (const offset of WORLD_OFFSETS) {
    for (const line of baseLines) {
      wrappedLines.push(shiftCoords(line, offset));
    }
  }

  return {
    type: 'MultiLineString',
    coordinates: wrappedLines,
  };
}

function loadBlankMapLayers(): Promise<BlankMapLayers> {
  if (!cachedLayersPromise) {
    cachedLayersPromise = loadWorldAtlasTopology()
      .then((topology) => {
        const rawLand = feature(topology, topology.objects.land) as unknown as GeoJsonObject;
        const rawBorders = mesh(
          topology,
          topology.objects.countries,
          (a, b) => a !== b
        ) as unknown as GeoJsonObject;

        return {
          land: buildWrappedLand(rawLand),
          borders: buildWrappedBorders(rawBorders),
        };
      })
      .catch((err) => {
        cachedLayersPromise = null;
        throw err;
      });
  }
  return cachedLayersPromise;
}

function getInitialWorldCenter(lat: number, lng: number): [number, number] {
  // Keep high-latitude pins comfortably below the top HUD and clear of the bottom-right answer dock
  const centerLat = Math.max(-42, Math.min(50, lat * 0.52 + 2));
  const dockOffset = window.innerWidth >= 1024 ? 22 : window.innerWidth >= 640 ? 12 : 0;
  return [centerLat, lng + dockOffset];
}

export function BlankMapViewport({
  location,
  resetCounter,
  focusPinCounter,
  onZoomChange,
}: BlankMapViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    setMapError(null);

    const initialZoom = window.innerWidth >= 1280 ? 2.5 : 2;
    const initialCenter = getInitialWorldCenter(location.lat, location.lng);

    const map = L.map(el, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 8,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      worldCopyJump: true,
      maxBounds: [
        [-82, -540],
        [82, 540],
      ],
      maxBoundsViscosity: 0.9,
      zoomControl: false,
      attributionControl: true,
    });

    map.attributionControl.setPrefix('');
    map.attributionControl.addAttribution('Natural Earth 1:50m (白地図ベクター)');

    // High-contrast cartographic pin marker that stays unmistakable at world zoom and precise when zoomed in
    const pinIcon = L.divIcon({
      className: 'koppen-blankmap-pin',
      html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:2px;border-radius:9999px;background:rgba(16,185,129,0.22);border:2px solid #34D399;box-shadow:0 0 0 3px rgba(8,16,30,0.72),0 4px 14px rgba(0,0,0,0.5);"></div>
        <div style="position:relative;width:10px;height:10px;border-radius:9999px;background:#F8FAFC;border:2.5px solid #059669;"></div>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([location.lat, location.lng], {
      icon: pinIcon,
      interactive: false,
      zIndexOffset: 600,
    }).addTo(map);

    // Keep the single pin snapped to whichever wrapped world copy is closest to the viewport center
    const syncMarkerWorldCopy = () => {
      const centerLng = map.getCenter().lng;
      const wrappedLng = location.lng + Math.round((centerLng - location.lng) / 360) * 360;
      marker.setLatLng([location.lat, wrappedLng]);
    };

    syncMarkerWorldCopy();
    map.on('move', syncMarkerWorldCopy);

    void loadBlankMapLayers()
      .then(({ land, borders }) => {
        if (cancelled) return;

        // Land silhouette layer (zero biome coloring, zero labels, antimeridian-safe & 3x wrapped)
        L.geoJSON(land, {
          interactive: false,
          style: {
            fillColor: '#1E2D44',
            fillOpacity: 1,
            color: '#64748B',
            weight: 1.15,
            opacity: 0.92,
          },
        }).addTo(map);

        // Crisp country border mesh layer (strictly borders, no text, 3x wrapped)
        L.geoJSON(borders, {
          interactive: false,
          style: {
            color: '#4E6582',
            weight: 0.85,
            opacity: 0.85,
            fill: false,
          },
        }).addTo(map);
      })
      .catch((err) => {
        if (cancelled) return;
        setMapError(err instanceof Error ? err.message : '白地図の読み込みに失敗しました');
      });

    map.on('zoomend', () => {
      onZoomChange(map.getZoom());
    });

    onZoomChange(initialZoom);
    mapRef.current = map;

    const timer = setTimeout(() => map.invalidateSize(), 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [location.id, location.lat, location.lng]);

  // Reset to full world overview
  useEffect(() => {
    if (resetCounter === 0) return;
    const map = mapRef.current;
    if (!map) return;
    const worldZoom = window.innerWidth >= 1280 ? 2.5 : 2;
    const worldCenter = getInitialWorldCenter(location.lat, location.lng);
    map.setView(worldCenter, worldZoom, { animate: true });
    onZoomChange(worldZoom);
  }, [resetCounter, location.lat, location.lng]);

  // Focus smoothly onto the target pin at regional zoom
  useEffect(() => {
    if (focusPinCounter === 0) return;
    const map = mapRef.current;
    if (!map) return;
    const targetZoom = 5;
    // Offset slightly on desktop so the pin lands in the open left-center canvas away from the answer dock
    const lngShift = window.innerWidth >= 1024 ? 6 : window.innerWidth >= 640 ? 3 : 0;
    const centerLng = map.getCenter().lng;
    const wrappedPinLng = location.lng + Math.round((centerLng - location.lng) / 360) * 360;
    map.setView([location.lat, wrappedPinLng + lngShift], targetZoom, { animate: true });
    onZoomChange(targetZoom);
  }, [focusPinCounter, location.lat, location.lng]);

  return (
    <div className="relative w-full h-full bg-[#08101E] overflow-hidden">
      <div ref={containerRef} className="w-full h-full z-0 bg-[#08101E]" />
      {mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-6">
          <div className="rounded-xl border border-rose-500/40 bg-slate-950/90 px-4 py-3 text-sm text-rose-200 shadow-xl backdrop-blur-md">
            {mapError}
          </div>
        </div>
      )}
    </div>
  );
}
