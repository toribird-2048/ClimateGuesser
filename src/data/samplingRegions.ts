import type { KoppenCode } from '../types/game.ts';

export interface SamplingRegion {
  targetCode: KoppenCode;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Strictly inland/continental bounding boxes distributed across all 12 Köppen biomes
 * so every randomly sampled coordinate lands on real terrain (never open ocean)
 * and is verified scientifically against live 10-year monthly climate normals.
 */
export const SAMPLING_REGIONS: SamplingRegion[] = [
  // Af — Tropical Rainforest (Amazon, Congo, Borneo, Sumatra, New Guinea)
  { targetCode: 'Af', minLat: -4.5, maxLat: -0.5, minLng: -70.0, maxLng: -55.0 },
  { targetCode: 'Af', minLat: -2.0, maxLat: 2.0, minLng: 18.0, maxLng: 27.0 },
  { targetCode: 'Af', minLat: -1.5, maxLat: 3.5, minLng: 111.5, maxLng: 116.5 },
  { targetCode: 'Af', minLat: -1.5, maxLat: 1.5, minLng: 100.8, maxLng: 103.0 },
  { targetCode: 'Af', minLat: -6.2, maxLat: -3.2, minLng: 138.0, maxLng: 143.5 },
  { targetCode: 'Af', minLat: 1.8, maxLat: 4.5, minLng: 101.6, maxLng: 103.2 },

  // Am — Tropical Monsoon (Amazon SE, Kerala/Western Ghats, Myanmar/Bangladesh, Luzon, NE Brazil)
  { targetCode: 'Am', minLat: -7.5, maxLat: -3.5, minLng: -54.0, maxLng: -46.0 },
  { targetCode: 'Am', minLat: 9.2, maxLat: 12.2, minLng: 76.2, maxLng: 76.9 },
  { targetCode: 'Am', minLat: 22.8, maxLat: 24.6, minLng: 89.5, maxLng: 91.8 },
  { targetCode: 'Am', minLat: 15.0, maxLat: 17.5, minLng: 120.8, maxLng: 122.0 },
  { targetCode: 'Am', minLat: 17.0, maxLat: 19.5, minLng: 96.0, maxLng: 97.6 },
  { targetCode: 'Am', minLat: 7.5, maxLat: 9.8, minLng: -12.0, maxLng: -9.5 },

  // Aw — Tropical Savanna (Brazilian Cerrado, Central/NE Thailand, Northern Australia, West/East Africa, Central India)
  { targetCode: 'Aw', minLat: -17.5, maxLat: -11.5, minLng: -53.0, maxLng: -45.0 },
  { targetCode: 'Aw', minLat: 14.5, maxLat: 17.2, minLng: 100.2, maxLng: 104.2 },
  { targetCode: 'Aw', minLat: -16.8, maxLat: -13.2, minLng: 131.5, maxLng: 135.5 },
  { targetCode: 'Aw', minLat: 8.0, maxLat: 11.5, minLng: -6.5, maxLng: 7.5 },
  { targetCode: 'Aw', minLat: 15.5, maxLat: 20.5, minLng: 76.0, maxLng: 81.5 },
  { targetCode: 'Aw', minLat: 7.5, maxLat: 9.5, minLng: -69.5, maxLng: -64.5 },

  // BW — Desert (Sahara, Arabian Desert, Australian Outback, Atacama, Mojave/Sonora, Namib/Kalahari)
  { targetCode: 'BW', minLat: 21.0, maxLat: 28.0, minLng: -5.0, maxLng: 25.0 },
  { targetCode: 'BW', minLat: 19.5, maxLat: 25.5, minLng: 43.0, maxLng: 54.0 },
  { targetCode: 'BW', minLat: -28.0, maxLat: -22.5, minLng: 123.0, maxLng: 138.0 },
  { targetCode: 'BW', minLat: -25.5, maxLat: -19.5, minLng: -70.0, maxLng: -68.8 },
  { targetCode: 'BW', minLat: 33.0, maxLat: 36.0, minLng: -116.5, maxLng: -112.0 },
  { targetCode: 'BW', minLat: 39.0, maxLat: 42.0, minLng: 58.0, maxLng: 65.0 },

  // BS — Steppe (US Great Plains, Patagonia, Kazakhstan Steppe, Central Anatolia, South Africa Highveld, Sahel)
  { targetCode: 'BS', minLat: 36.5, maxLat: 46.5, minLng: -104.8, maxLng: -100.5 },
  { targetCode: 'BS', minLat: -45.0, maxLat: -36.0, minLng: -69.5, maxLng: -66.5 },
  { targetCode: 'BS', minLat: 46.0, maxLat: 50.0, minLng: 66.0, maxLng: 78.0 },
  { targetCode: 'BS', minLat: 38.0, maxLat: 40.0, minLng: 32.0, maxLng: 35.5 },
  { targetCode: 'BS', minLat: -31.5, maxLat: -26.5, minLng: 22.5, maxLng: 26.8 },
  { targetCode: 'BS', minLat: 13.0, maxLat: 15.0, minLng: -12.0, maxLng: 12.0 },

  // Cfa — Humid Subtropical (Honshu/Kyushu, US Southeast, Argentine Pampas, Eastern Australia, Po Valley, Southern Brazil)
  { targetCode: 'Cfa', minLat: 35.2, maxLat: 36.8, minLng: 137.2, maxLng: 140.2 },
  { targetCode: 'Cfa', minLat: 31.2, maxLat: 35.5, minLng: -92.5, maxLng: -81.5 },
  { targetCode: 'Cfa', minLat: -36.5, maxLat: -32.0, minLng: -62.5, maxLng: -58.2 },
  { targetCode: 'Cfa', minLat: -31.5, maxLat: -27.5, minLng: 151.0, maxLng: 152.8 },
  { targetCode: 'Cfa', minLat: 44.8, maxLat: 45.6, minLng: 9.0, maxLng: 12.0 },
  { targetCode: 'Cfa', minLat: -29.5, maxLat: -25.5, minLng: -54.5, maxLng: -50.5 },

  // Cfb — Oceanic (France, UK, Germany, New Zealand South/North inland, Southern Chile, Victoria/Tasmania)
  { targetCode: 'Cfb', minLat: 46.5, maxLat: 50.0, minLng: -0.5, maxLng: 6.5 },
  { targetCode: 'Cfb', minLat: 51.5, maxLat: 54.5, minLng: -2.8, maxLng: -0.4 },
  { targetCode: 'Cfb', minLat: 49.5, maxLat: 52.8, minLng: 7.0, maxLng: 12.5 },
  { targetCode: 'Cfb', minLat: -45.8, maxLat: -42.5, minLng: 168.8, maxLng: 171.8 },
  { targetCode: 'Cfb', minLat: -41.5, maxLat: -38.8, minLng: -73.0, maxLng: -72.0 },
  { targetCode: 'Cfb', minLat: -42.4, maxLat: -41.2, minLng: 145.6, maxLng: 147.6 },

  // Cs — Mediterranean (California Central/Coast, Portugal/Andalusia, Greece/Peloponnese, Central Chile, Western Cape, SW Australia)
  { targetCode: 'Cs', minLat: 36.2, maxLat: 39.8, minLng: -122.2, maxLng: -119.5 },
  { targetCode: 'Cs', minLat: 37.5, maxLat: 40.5, minLng: -8.4, maxLng: -4.5 },
  { targetCode: 'Cs', minLat: 37.2, maxLat: 39.5, minLng: 21.5, maxLng: 23.0 },
  { targetCode: 'Cs', minLat: -35.8, maxLat: -33.2, minLng: -71.4, maxLng: -70.8 },
  { targetCode: 'Cs', minLat: -34.0, maxLat: -32.8, minLng: 18.6, maxLng: 19.6 },
  { targetCode: 'Cs', minLat: -34.2, maxLat: -32.0, minLng: 115.8, maxLng: 117.2 },

  // Df — Subarctic / Humid Continental (Finland, Sweden, Canada Boreal, Hokkaido, European Russia, Western Siberia)
  { targetCode: 'Df', minLat: 61.5, maxLat: 67.2, minLng: 23.0, maxLng: 29.0 },
  { targetCode: 'Df', minLat: 60.0, maxLat: 65.5, minLng: 14.5, maxLng: 19.5 },
  { targetCode: 'Df', minLat: 48.0, maxLat: 56.0, minLng: -112.0, maxLng: -75.0 },
  { targetCode: 'Df', minLat: 42.9, maxLat: 44.3, minLng: 141.8, maxLng: 144.2 },
  { targetCode: 'Df', minLat: 55.0, maxLat: 63.0, minLng: 35.0, maxLng: 68.0 },
  { targetCode: 'Df', minLat: 45.0, maxLat: 47.2, minLng: -93.5, maxLng: -88.0 },

  // Dw — Dry-Winter Continental / Subarctic (Eastern Siberia Yakutia, Transbaikalia, Amur, Mongolia, NE China)
  { targetCode: 'Dw', minLat: 56.0, maxLat: 64.5, minLng: 118.0, maxLng: 136.0 },
  { targetCode: 'Dw', minLat: 50.5, maxLat: 55.0, minLng: 110.0, maxLng: 128.0 },
  { targetCode: 'Dw', minLat: 47.5, maxLat: 49.8, minLng: 103.5, maxLng: 111.5 },
  { targetCode: 'Dw', minLat: 44.0, maxLat: 49.5, minLng: 122.0, maxLng: 130.0 },
  { targetCode: 'Dw', minLat: 37.3, maxLat: 38.0, minLng: 128.2, maxLng: 128.8 },

  // ET — Tundra (Svalbard, Arctic Alaska, Canadian Nunavut, Northern Siberia Yamal/Taymyr, Iceland Interior, Northern Norway/Kola)
  { targetCode: 'ET', minLat: 78.15, maxLat: 78.8, minLng: 15.5, maxLng: 17.5 },
  { targetCode: 'ET', minLat: 69.0, maxLat: 70.6, minLng: -158.0, maxLng: -146.0 },
  { targetCode: 'ET', minLat: 64.0, maxLat: 68.5, minLng: -108.0, maxLng: -92.0 },
  { targetCode: 'ET', minLat: 69.5, maxLat: 73.0, minLng: 82.0, maxLng: 105.0 },
  { targetCode: 'ET', minLat: 64.5, maxLat: 65.4, minLng: -19.5, maxLng: -16.5 },
  { targetCode: 'ET', minLat: 69.8, maxLat: 70.8, minLng: 25.0, maxLng: 30.2 },

  // EF — Ice Cap (Greenland Ice Sheet, East & West Antarctica Ice Sheet)
  { targetCode: 'EF', minLat: 67.5, maxLat: 76.5, minLng: -46.0, maxLng: -32.0 },
  { targetCode: 'EF', minLat: -82.0, maxLat: -73.0, minLng: 10.0, maxLng: 120.0 },
  { targetCode: 'EF', minLat: -79.5, maxLat: -75.0, minLng: -115.0, maxLng: -75.0 },
  { targetCode: 'EF', minLat: 71.0, maxLat: 75.5, minLng: -44.0, maxLng: -34.0 },

  // H — Highland (Andean Altiplano, Peruvian/Ecuadorian Andes, Tibetan Plateau, Pamir/Himalayas, Ethiopian Highlands, Colorado Rockies)
  { targetCode: 'H', minLat: -20.5, maxLat: -15.0, minLng: -70.0, maxLng: -67.0 },
  { targetCode: 'H', minLat: -13.8, maxLat: -9.5, minLng: -77.5, maxLng: -71.5 },
  { targetCode: 'H', minLat: 29.5, maxLat: 35.0, minLng: 83.0, maxLng: 96.5 },
  { targetCode: 'H', minLat: 36.5, maxLat: 39.2, minLng: 72.5, maxLng: 75.5 },
  { targetCode: 'H', minLat: 9.8, maxLat: 12.8, minLng: 38.2, maxLng: 39.6 },
  { targetCode: 'H', minLat: 38.0, maxLat: 40.0, minLng: -107.4, maxLng: -105.8 },
];
