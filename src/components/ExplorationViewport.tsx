import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { RoundLocation, ViewMode } from '../types/game.ts';

interface ExplorationViewportProps {
  location: RoundLocation;
  viewMode: ViewMode;
  resetCounter: number;
  onZoomChange: (zoom: number) => void;
}

const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_NOLABELS_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';

export function ExplorationViewport({
  location,
  viewMode,
  resetCounter,
  onZoomChange,
}: ExplorationViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const satLayerRef = useRef<L.TileLayer | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Leaflet map for each new round location
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const latDelta = 0.14;
    const cosLat = Math.max(0.2, Math.cos((location.lat * Math.PI) / 180));
    const lngDelta = Math.min(0.45, latDelta / cosLat);

    const bounds = L.latLngBounds(
      [Math.max(-85, location.lat - latDelta), Math.max(-180, location.lng - lngDelta)],
      [Math.min(85, location.lat + latDelta), Math.min(180, location.lng + lngDelta)]
    );

    const initialZoom = 13;

    const map = L.map(el, {
      center: [location.lat, location.lng],
      zoom: initialZoom,
      minZoom: 10,
      maxZoom: 17,
      maxBounds: bounds,
      maxBoundsViscosity: 0.9,
      zoomControl: false,
      attributionControl: true,
    });

    const satLayer = L.tileLayer(SATELLITE_TILE_URL, {
      maxZoom: 17,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    });

    const osmLayer = L.tileLayer(OSM_NOLABELS_TILE_URL, {
      subdomains: 'abcd',
      maxZoom: 17,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    });

    if (viewMode === 'satellite') {
      satLayer.addTo(map);
    } else {
      osmLayer.addTo(map);
    }

    // Crisp target marker at the exact climate measurement coordinate
    const targetIcon = L.divIcon({
      className: 'koppen-target-pin',
      html: `<div style="width:34px;height:34px;border-radius:9999px;background:rgba(16,185,129,0.18);border:2px solid rgba(52,211,153,0.9);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(11,17,32,0.45);"><div style="width:9px;height:9px;border-radius:9999px;background:#34D399;border:2px solid #0B1120;"></div></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    L.marker([location.lat, location.lng], {
      icon: targetIcon,
      interactive: false,
    }).addTo(map);

    map.on('zoomend', () => {
      onZoomChange(map.getZoom());
    });

    onZoomChange(initialZoom);

    mapRef.current = map;
    satLayerRef.current = satLayer;
    osmLayerRef.current = osmLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      satLayerRef.current = null;
      osmLayerRef.current = null;
    };
  }, [location.id]);

  // Swap tile layers seamlessly when user toggles Satellite <-> Label-free OSM
  useEffect(() => {
    const map = mapRef.current;
    const sat = satLayerRef.current;
    const osm = osmLayerRef.current;
    if (!map || !sat || !osm) return;

    if (viewMode === 'satellite') {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
  }, [viewMode]);

  // Return to initial target coordinate & default zoom
  useEffect(() => {
    if (resetCounter === 0) return;
    const map = mapRef.current;
    if (!map) return;
    map.setView([location.lat, location.lng], 13, { animate: true });
    onZoomChange(13);
  }, [resetCounter, location.lat, location.lng]);

  return (
    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden">
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
}
