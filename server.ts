import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { classifyKoppen12 } from './src/data/koppen.ts';
import type { ClimateData, ReverseGeocodeResult } from './src/types/game.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

// Bounded in-memory caches for climate normals and OSM Nominatim reverse geocoding
const climateCache = new Map<string, { data: ClimateData; cachedAt: number }>();
const geocodeCache = new Map<string, { data: ReverseGeocodeResult; cachedAt: number }>();
const CACHE_MAX = 400;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

function getGridKey(lat: number, lng: number): string {
  const qLat = Math.round(lat * 4) / 4;
  const qLng = Math.round(lng * 4) / 4;
  return `${qLat.toFixed(2)},${qLng.toFixed(2)}`;
}

async function fetchOpenMeteoClimate(lat: number, lng: number): Promise<ClimateData> {
  const key = getGridKey(lat, lng);
  const existing = climateCache.get(key);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing.data;
  }

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('start_date', '2015-01-01');
  url.searchParams.set('end_date', '2024-12-31');
  url.searchParams.set('daily', 'temperature_2m_mean,precipitation_sum');
  url.searchParams.set('timezone', 'UTC');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Open-Meteo returned HTTP ${response.status}`);
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

    if (!times || !temps || !precips || times.length === 0) {
      throw new Error('Climate series unavailable for coordinates');
    }

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

    if (climateCache.size >= CACHE_MAX) {
      const oldestKey = climateCache.keys().next().value;
      if (oldestKey) climateCache.delete(oldestKey);
    }
    climateCache.set(key, { data: classified, cachedAt: Date.now() });

    return classified;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNominatimReverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const existing = geocodeCache.get(key);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing.data;
  }

  // Antarctica interior fallback (Nominatim has minimal administrative boundaries on the Antarctic ice sheet)
  if (lat <= -60) {
    return {
      placeName: '南極大陸（氷床内陸部）',
      countryName: '南極',
      formattedAddress: `南極大陸 (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
    };
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', lat.toFixed(5));
  url.searchParams.set('lon', lng.toFixed(5));
  url.searchParams.set('zoom', '10');
  url.searchParams.set('accept-language', 'ja,en');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'KoppenGuessr/1.0 (OpenStreetMap Climate Education Game)',
      },
    });

    if (!response.ok) {
      return { placeName: null, countryName: null, formattedAddress: null };
    }

    const data = (await response.json()) as {
      error?: string;
      display_name?: string;
      name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        region?: string;
        country?: string;
      };
    };

    if (data.error) {
      // Greenland ice sheet fallback when outside named municipalities
      if (lat >= 60 && lng >= -55 && lng <= -20) {
        return {
          placeName: 'グリーンランド氷床',
          countryName: 'グリーンランド',
          formattedAddress: 'グリーンランド（内陸氷床）',
        };
      }
      return { placeName: null, countryName: null, formattedAddress: null };
    }

    const addr = data.address ?? {};
    const countryName = addr.country ?? null;
    const locality =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state ||
      addr.region ||
      data.name ||
      null;

    const placeName =
      locality && countryName && locality !== countryName
        ? `${locality}・${countryName}`
        : locality || countryName || data.display_name || null;

    const result: ReverseGeocodeResult = {
      placeName,
      countryName,
      formattedAddress: data.display_name ?? null,
    };

    if (geocodeCache.size >= CACHE_MAX) {
      const oldestKey = geocodeCache.keys().next().value;
      if (oldestKey) geocodeCache.delete(oldestKey);
    }
    geocodeCache.set(key, { data: result, cachedAt: Date.now() });

    return result;
  } catch (err) {
    console.error('Nominatim reverse geocode error:', err);
    return { placeName: null, countryName: null, formattedAddress: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function createServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Scientific 10-year monthly climate normals + deterministic Köppen-Geiger classification
  app.get('/api/climate', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ error: 'Invalid latitude or longitude.' });
      return;
    }

    try {
      const climate = await fetchOpenMeteoClimate(lat, lng);
      res.json(climate);
    } catch (err) {
      console.error('Climate lookup error:', err);
      res.status(502).json({
        error: 'Failed to retrieve climate normals for this coordinate.',
      });
    }
  });

  // OpenStreetMap Nominatim reverse geocoding proxy (zero API key required)
  app.get('/api/reverse-geocode', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ error: 'Invalid coordinates.' });
      return;
    }

    const result = await fetchNominatimReverseGeocode(lat, lng);
    res.json(result);
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer();
