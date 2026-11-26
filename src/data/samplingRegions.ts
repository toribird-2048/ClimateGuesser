import type { KoppenCode } from '../types/game.ts';

export interface SamplingRegion {
  targetCode: KoppenCode;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Broad multi-continent & archipelago sampling regions (14 per biome × 14 Köppen biomes = 196 regions).
 * Combined with world-50m.json land-polygon masking and pure global land sampling,
 * coordinates can land anywhere across the full geographic extent of each climate on Earth.
 */
export const SAMPLING_REGIONS: SamplingRegion[] = [
  // =========================================================================
  // Af — Tropical Rainforest (South America, Central America, Africa, Asia, Oceania)
  // =========================================================================
  { targetCode: 'Af', minLat: -7.0, maxLat: 3.5, minLng: -76.5, maxLng: -62.0 }, // Western/Upper Amazon & Colombia
  { targetCode: 'Af', minLat: -4.5, maxLat: 2.0, minLng: -62.0, maxLng: -50.0 }, // Central Amazon & Amapa
  { targetCode: 'Af', minLat: 3.0, maxLat: 11.5, minLng: -85.0, maxLng: -76.0 }, // Choco / Panama / Costa Rica Caribbean
  { targetCode: 'Af', minLat: 4.5, maxLat: 8.5, minLng: -60.5, maxLng: -52.5 }, // Guianas interior
  { targetCode: 'Af', minLat: -4.0, maxLat: 3.5, minLng: 10.0, maxLng: 28.5 }, // Congo Basin & Gabon
  { targetCode: 'Af', minLat: -19.5, maxLat: -13.0, minLng: 48.0, maxLng: 50.4 }, // Eastern Madagascar Rainforest
  { targetCode: 'Af', minLat: -6.5, maxLat: 5.5, minLng: 95.5, maxLng: 108.5 }, // Sumatra & West Java
  { targetCode: 'Af', minLat: 1.0, maxLat: 7.0, minLng: 99.5, maxLng: 104.5 }, // Malay Peninsula
  { targetCode: 'Af', minLat: -3.5, maxLat: 6.5, minLng: 109.0, maxLng: 118.5 }, // Borneo
  { targetCode: 'Af', minLat: -4.5, maxLat: 2.5, minLng: 119.0, maxLng: 129.0 }, // Sulawesi & Moluccas
  { targetCode: 'Af', minLat: 5.5, maxLat: 13.5, minLng: 122.0, maxLng: 126.5 }, // Mindanao / Visayas East
  { targetCode: 'Af', minLat: -8.5, maxLat: -1.5, minLng: 132.0, maxLng: 150.5 }, // New Guinea & Bismarck
  { targetCode: 'Af', minLat: 6.0, maxLat: 8.2, minLng: 79.8, maxLng: 81.2 }, // Sri Lanka SW/Central
  { targetCode: 'Af', minLat: -18.5, maxLat: -15.5, minLng: 145.0, maxLng: 146.2 }, // Tropical N Queensland Coast

  // =========================================================================
  // Am — Tropical Monsoon
  // =========================================================================
  { targetCode: 'Am', minLat: -10.5, maxLat: -1.5, minLng: -66.0, maxLng: -47.0 }, // SW & Lower Amazon transition
  { targetCode: 'Am', minLat: 1.5, maxLat: 6.5, minLng: -55.0, maxLng: -50.5 }, // French Guiana & Suriname
  { targetCode: 'Am', minLat: 8.0, maxLat: 21.5, minLng: -93.0, maxLng: -77.5 }, // Central America / Belize / Tabasco
  { targetCode: 'Am', minLat: 17.5, maxLat: 22.5, minLng: -84.0, maxLng: -65.5 }, // Greater Antilles (Cuba/Hispaniola/PR)
  { targetCode: 'Am', minLat: 4.5, maxLat: 11.5, minLng: -15.0, maxLng: -7.5 }, // Guinea / Sierra Leone / Liberia
  { targetCode: 'Am', minLat: 2.5, maxLat: 6.5, minLng: 5.0, maxLng: 11.5 }, // Niger Delta & Cameroon Coast
  { targetCode: 'Am', minLat: 8.5, maxLat: 18.5, minLng: 73.0, maxLng: 76.5 }, // Konkan & Malabar Western Ghats
  { targetCode: 'Am', minLat: 19.0, maxLat: 24.5, minLng: 90.0, maxLng: 93.0 }, // Chittagong & Bengal Delta Coast
  { targetCode: 'Am', minLat: 11.0, maxLat: 20.0, minLng: 93.8, maxLng: 99.5 }, // Myanmar Rakhine/Tanintharyi & Ranong
  { targetCode: 'Am', minLat: 9.0, maxLat: 14.0, minLng: 102.0, maxLng: 105.5 }, // Gulf of Thailand East / Mekong Coast
  { targetCode: 'Am', minLat: 12.5, maxLat: 18.5, minLng: 119.5, maxLng: 122.5 }, // Western Luzon & Mindoro
  { targetCode: 'Am', minLat: -8.5, maxLat: -5.5, minLng: 106.0, maxLng: 114.5 }, // Central/East Java
  { targetCode: 'Am', minLat: -14.5, maxLat: -10.5, minLng: 130.5, maxLng: 143.5 }, // Arnhem Land & Cape York tip
  { targetCode: 'Am', minLat: -17.5, maxLat: -11.5, minLng: 48.5, maxLng: 50.2 }, // NE Madagascar transition

  // =========================================================================
  // Aw — Tropical Savanna
  // =========================================================================
  { targetCode: 'Aw', minLat: -21.0, maxLat: -6.0, minLng: -60.0, maxLng: -41.0 }, // Brazilian Cerrado & Pantanal
  { targetCode: 'Aw', minLat: 3.0, maxLat: 11.0, minLng: -75.0, maxLng: -61.5 }, // Orinoco Llanos (Colombia/Venezuela)
  { targetCode: 'Aw', minLat: 12.0, maxLat: 23.0, minLng: -105.5, maxLng: -87.0 }, // Yucatan & Pacific Mexico/Central America
  { targetCode: 'Aw', minLat: 18.0, maxLat: 23.2, minLng: -84.0, maxLng: -74.0 }, // Cuba & Hispaniola lowlands
  { targetCode: 'Aw', minLat: 6.5, maxLat: 13.5, minLng: -16.5, maxLng: 28.0 }, // Sudanian Savanna (Senegal to CAR/South Sudan)
  { targetCode: 'Aw', minLat: -15.0, maxLat: 2.0, minLng: 28.0, maxLng: 41.0 }, // East Africa (Tanzania/Uganda/Mozambique N)
  { targetCode: 'Aw', minLat: -14.0, maxLat: -5.0, minLng: 13.0, maxLng: 27.5 }, // Southern Congo Basin & Northern Angola
  { targetCode: 'Aw', minLat: -23.0, maxLat: -13.0, minLng: 43.5, maxLng: 47.0 }, // Western Madagascar Savanna
  { targetCode: 'Aw', minLat: 10.0, maxLat: 23.0, minLng: 74.0, maxLng: 86.5 }, // Peninsular & Eastern India
  { targetCode: 'Aw', minLat: 10.0, maxLat: 19.5, minLng: 95.5, maxLng: 108.5 }, // Indochina (Myanmar/Thailand/Cambodia/S Vietnam)
  { targetCode: 'Aw', minLat: -10.5, maxLat: -7.5, minLng: 114.5, maxLng: 127.0 }, // Lesser Sunda Islands (Bali to Timor)
  { targetCode: 'Aw', minLat: -20.0, maxLat: -12.0, minLng: 123.0, maxLng: 146.5 }, // Northern Australia (Kimberley to Queensland)
  { targetCode: 'Aw', minLat: -21.0, maxLat: -14.0, minLng: 31.0, maxLng: 40.5 }, // Mozambique / Zambezi lowlands
  { targetCode: 'Aw', minLat: -19.0, maxLat: -11.0, minLng: -67.0, maxLng: -58.0 }, // Eastern Bolivia Lowlands (Beni/Santa Cruz)

  // =========================================================================
  // BW — Desert
  // =========================================================================
  { targetCode: 'BW', minLat: 17.5, maxLat: 31.5, minLng: -16.5, maxLng: 10.0 }, // Western & Central Sahara
  { targetCode: 'BW', minLat: 16.5, maxLat: 31.0, minLng: 10.0, maxLng: 35.0 }, // Eastern Sahara (Libya/Egypt/Sudan)
  { targetCode: 'BW', minLat: 14.0, maxLat: 31.5, minLng: 36.0, maxLng: 59.0 }, // Arabian Peninsula & Rub' al Khali
  { targetCode: 'BW', minLat: 27.0, maxLat: 35.5, minLng: 42.0, maxLng: 66.0 }, // Mesopotamia / Iranian Plateau / Balochistan
  { targetCode: 'BW', minLat: 2.0, maxLat: 12.0, minLng: 41.0, maxLng: 51.0 }, // Horn of Africa / Ogaden / Somalia
  { targetCode: 'BW', minLat: -29.0, maxLat: -18.0, minLng: 12.5, maxLng: 22.0 }, // Namib & Kalahari Deserts
  { targetCode: 'BW', minLat: -31.5, maxLat: -16.0, minLng: -75.0, maxLng: -67.5 }, // Peruvian Coast, Atacama & Monte
  { targetCode: 'BW', minLat: -46.0, maxLat: -36.0, minLng: -70.0, maxLng: -64.5 }, // Patagonian Arid Core
  { targetCode: 'BW', minLat: 23.5, maxLat: 39.5, minLng: -118.0, maxLng: -103.5 }, // Baja, Sonora, Mojave, Chihuahua & Great Basin
  { targetCode: 'BW', minLat: 37.5, maxLat: 45.5, minLng: 53.0, maxLng: 76.0 }, // Karakum, Kyzylkum & Balkhash
  { targetCode: 'BW', minLat: 37.5, maxLat: 44.5, minLng: 77.0, maxLng: 107.0 }, // Taklamakan & Gobi Deserts
  { targetCode: 'BW', minLat: 24.5, maxLat: 30.5, minLng: 67.0, maxLng: 73.5 }, // Thar Desert & Indus Plain
  { targetCode: 'BW', minLat: -31.0, maxLat: -20.5, minLng: 115.0, maxLng: 141.0 }, // Australian Outback (Great Victoria/Gibson/Simpson)
  { targetCode: 'BW', minLat: 29.0, maxLat: 34.5, minLng: 35.0, maxLng: 41.5 }, // Syrian & Negev Deserts

  // =========================================================================
  // BS — Steppe / Semi-Arid
  // =========================================================================
  { targetCode: 'BS', minLat: 31.0, maxLat: 52.0, minLng: -114.0, maxLng: -98.5 }, // North American Great Plains & Canadian Prairies
  { targetCode: 'BS', minLat: 19.5, maxLat: 28.5, minLng: -105.0, maxLng: -98.5 }, // Mexican Altiplano Semi-Arid
  { targetCode: 'BS', minLat: -14.0, maxLat: -4.5, minLng: -43.0, maxLng: -36.5 }, // NE Brazil Caatinga
  { targetCode: 'BS', minLat: -49.0, maxLat: -23.0, minLng: -69.5, maxLng: -61.5 }, // Gran Chaco West & Patagonian Steppe
  { targetCode: 'BS', minLat: 12.0, maxLat: 17.0, minLng: -16.5, maxLng: 38.0 }, // Sahel Belt (Senegal to Sudan/Eritrea)
  { targetCode: 'BS', minLat: -5.5, maxLat: 5.5, minLng: 34.5, maxLng: 42.5 }, // East African Semi-Arid Rift (Kenya/Somalia border)
  { targetCode: 'BS', minLat: -33.0, maxLat: -18.5, minLng: 16.0, maxLng: 28.5 }, // Southern Africa Karoo / Highveld / Botswana
  { targetCode: 'BS', minLat: 37.5, maxLat: 42.0, minLng: -5.5, maxLng: -0.5 }, // Central & SE Spain Semi-Arid
  { targetCode: 'BS', minLat: 36.5, maxLat: 41.5, minLng: 30.0, maxLng: 49.0 }, // Central Anatolia, Armenia & Azerbaijan
  { targetCode: 'BS', minLat: 44.5, maxLat: 51.5, minLng: 32.0, maxLng: 82.0 }, // Pontic-Caspian & Kazakh Steppe
  { targetCode: 'BS', minLat: 40.5, maxLat: 48.0, minLng: 95.0, maxLng: 118.0 }, // Mongolian & Inner Mongolian Steppe
  { targetCode: 'BS', minLat: 31.0, maxLat: 38.5, minLng: 47.0, maxLng: 69.0 }, // Iranian & Afghan Semi-Arid Foothills
  { targetCode: 'BS', minLat: 14.0, maxLat: 26.5, minLng: 71.5, maxLng: 78.5 }, // Gujarat & Deccan Rainshadow
  { targetCode: 'BS', minLat: -35.0, maxLat: -18.5, minLng: 120.0, maxLng: 148.0 }, // Australian Semi-Arid Ring (Murray-Darling / Pilbara)

  // =========================================================================
  // Cfa — Humid Subtropical
  // =========================================================================
  { targetCode: 'Cfa', minLat: 31.0, maxLat: 38.0, minLng: 129.5, maxLng: 141.0 }, // Japan (Kyushu, Shikoku, Honshu)
  { targetCode: 'Cfa', minLat: 34.2, maxLat: 37.2, minLng: 126.2, maxLng: 129.4 }, // Southern South Korea & Jeju
  { targetCode: 'Cfa', minLat: 23.0, maxLat: 33.5, minLng: 103.5, maxLng: 122.0 }, // Central/East/South China & Sichuan
  { targetCode: 'Cfa', minLat: 22.0, maxLat: 25.3, minLng: 120.1, maxLng: 122.0 }, // Taiwan
  { targetCode: 'Cfa', minLat: 26.5, maxLat: 40.5, minLng: -98.5, maxLng: -74.5 }, // US South, Mid-Atlantic & Lower Midwest
  { targetCode: 'Cfa', minLat: -37.5, maxLat: -24.0, minLng: -63.5, maxLng: -48.5 }, // Pampas, Uruguay, Paraguay & Southern Brazil
  { targetCode: 'Cfa', minLat: 43.0, maxLat: 46.2, minLng: 7.5, maxLng: 15.5 }, // Po Valley & Northern Adriatic
  { targetCode: 'Cfa', minLat: 42.0, maxLat: 46.5, minLng: 16.0, maxLng: 28.5 }, // Balkans & Lower Danube Plain
  { targetCode: 'Cfa', minLat: 40.8, maxLat: 44.5, minLng: 37.0, maxLng: 44.5 }, // Eastern Black Sea (Georgia/Sochi/NE Turkey)
  { targetCode: 'Cfa', minLat: -33.0, maxLat: -26.5, minLng: 28.0, maxLng: 32.5 }, // KwaZulu-Natal & Eastern Cape Coast
  { targetCode: 'Cfa', minLat: -37.0, maxLat: -23.5, minLng: 148.5, maxLng: 153.6 }, // Eastern Australia (QLD/NSW Coast)
  { targetCode: 'Cfa', minLat: -39.0, maxLat: -34.5, minLng: 173.0, maxLng: 178.5 }, // Northern New Zealand
  { targetCode: 'Cfa', minLat: 28.5, maxLat: 32.5, minLng: 73.5, maxLng: 77.5 }, // Punjab / Northern Pakistan transition
  { targetCode: 'Cfa', minLat: 36.5, maxLat: 38.5, minLng: 49.0, maxLng: 54.0 }, // Southern Caspian Coast (Gilan/Mazandaran)

  // =========================================================================
  // Cfb — Oceanic / Marine West Coast / Tropical Highland Mild
  // =========================================================================
  { targetCode: 'Cfb', minLat: 43.0, maxLat: 51.0, minLng: -4.8, maxLng: 7.5 }, // France, Benelux & Cantabrian Spain
  { targetCode: 'Cfb', minLat: 50.0, maxLat: 58.5, minLng: -10.5, maxLng: 1.8 }, // Great Britain & Ireland
  { targetCode: 'Cfb', minLat: 47.0, maxLat: 57.5, minLng: 6.5, maxLng: 19.5 }, // Germany, Denmark, Czechia, Austria & W Poland
  { targetCode: 'Cfb', minLat: 58.5, maxLat: 64.0, minLng: 5.0, maxLng: 10.5 }, // Western Norwegian Fjord Coast
  { targetCode: 'Cfb', minLat: 42.5, maxLat: 47.5, minLng: 13.5, maxLng: 25.0 }, // Dinaric Alps & Carpathian Valleys
  { targetCode: 'Cfb', minLat: 41.5, maxLat: 54.5, minLng: -132.0, maxLng: -121.5 }, // Pacific Northwest (OR/WA/BC Coast)
  { targetCode: 'Cfb', minLat: 2.0, maxLat: 7.5, minLng: -76.8, maxLng: -72.5 }, // Colombian Mid-Andes (Bogota/Medellin belt)
  { targetCode: 'Cfb', minLat: -47.0, maxLat: -37.5, minLng: -75.0, maxLng: -71.5 }, // Southern Chile & Western Patagonia
  { targetCode: 'Cfb', minLat: -34.2, maxLat: -28.0, minLng: 22.0, maxLng: 29.5 }, // South Africa Garden Route & Drakensberg
  { targetCode: 'Cfb', minLat: -39.0, maxLat: -32.0, minLng: 141.0, maxLng: 151.0 }, // Victoria & NSW Tablelands
  { targetCode: 'Cfb', minLat: -43.6, maxLat: -40.7, minLng: 144.6, maxLng: 148.3 }, // Tasmania
  { targetCode: 'Cfb', minLat: -46.8, maxLat: -37.5, minLng: 166.5, maxLng: 178.0 }, // New Zealand North & South Islands
  { targetCode: 'Cfb', minLat: -7.0, maxLat: -4.0, minLng: 137.0, maxLng: 145.5 }, // New Guinea Central Highlands
  { targetCode: 'Cfb', minLat: -27.5, maxLat: -22.5, minLng: -52.5, maxLng: -48.5 }, // Serra Geral Highlands (S Brazil)

  // =========================================================================
  // Cs — Mediterranean
  // =========================================================================
  { targetCode: 'Cs', minLat: 32.5, maxLat: 44.5, minLng: -124.2, maxLng: -117.0 }, // California & Oregon/Washington West
  { targetCode: 'Cs', minLat: 36.0, maxLat: 42.5, minLng: -9.5, maxLng: 3.3 }, // Portugal & Mediterranean Spain
  { targetCode: 'Cs', minLat: 41.5, maxLat: 44.5, minLng: 2.5, maxLng: 9.5 }, // Southern France & Corsica
  { targetCode: 'Cs', minLat: 36.7, maxLat: 44.2, minLng: 8.1, maxLng: 18.5 }, // Italy, Sicily & Sardinia
  { targetCode: 'Cs', minLat: 35.0, maxLat: 44.5, minLng: 15.0, maxLng: 26.5 }, // Croatia Dalmatia, Albania & Greece
  { targetCode: 'Cs', minLat: 34.5, maxLat: 41.5, minLng: 26.5, maxLng: 36.5 }, // Western/Southern Turkey & Cyprus
  { targetCode: 'Cs', minLat: 31.5, maxLat: 36.5, minLng: 34.5, maxLng: 37.5 }, // Levant Coast (Lebanon/Israel/W Syria)
  { targetCode: 'Cs', minLat: 30.5, maxLat: 37.3, minLng: -9.8, maxLng: 11.2 }, // Maghreb Coast & Atlas (Morocco/Algeria/Tunisia)
  { targetCode: 'Cs', minLat: -38.0, maxLat: -31.0, minLng: -73.0, maxLng: -70.4 }, // Central Chile
  { targetCode: 'Cs', minLat: -34.8, maxLat: -31.8, minLng: 17.8, maxLng: 22.0 }, // Western Cape South Africa
  { targetCode: 'Cs', minLat: -35.1, maxLat: -30.0, minLng: 115.0, maxLng: 120.5 }, // SW Australia (Perth-Albany-Esperance)
  { targetCode: 'Cs', minLat: -37.5, maxLat: -32.5, minLng: 135.0, maxLng: 141.0 }, // South Australia (Adelaide/Eyre/Wimmera)
  { targetCode: 'Cs', minLat: 36.5, maxLat: 41.5, minLng: 66.0, maxLng: 72.5 }, // Uzbekistan/Tajikistan Foothills (Samarkand/Tashkent)
  { targetCode: 'Cs', minLat: 34.5, maxLat: 39.5, minLng: 45.5, maxLng: 50.0 }, // Zagros / Western Iran Highlands

  // =========================================================================
  // Cw — Monsoon-Influenced Humid Subtropical / Dry-Winter Temperate
  // =========================================================================
  { targetCode: 'Cw', minLat: 24.5, maxLat: 28.5, minLng: 76.5, maxLng: 88.5 }, // Northern India & Nepal Terai
  { targetCode: 'Cw', minLat: 24.5, maxLat: 27.5, minLng: 90.0, maxLng: 95.5 }, // Assam & NE India Hills
  { targetCode: 'Cw', minLat: 19.5, maxLat: 24.5, minLng: 96.5, maxLng: 102.5 }, // Myanmar Shan Plateau & Northern Laos/Thailand
  { targetCode: 'Cw', minLat: 20.5, maxLat: 26.5, minLng: 100.5, maxLng: 107.5 }, // Yunnan, Guangxi West & Northern Vietnam
  { targetCode: 'Cw', minLat: 25.5, maxLat: 31.5, minLng: 99.5, maxLng: 104.5 }, // Sichuan & Guizhou Highlands
  { targetCode: 'Cw', minLat: 16.5, maxLat: 22.5, minLng: -104.5, maxLng: -96.0 }, // Central & Southern Mexico Highlands
  { targetCode: 'Cw', minLat: 13.5, maxLat: 16.5, minLng: -92.5, maxLng: -86.5 }, // Chiapas, Guatemala & Honduras Highlands
  { targetCode: 'Cw', minLat: -16.5, maxLat: -10.5, minLng: 14.5, maxLng: 20.5 }, // Angola Bie Plateau
  { targetCode: 'Cw', minLat: -19.5, maxLat: -10.5, minLng: 24.0, maxLng: 35.5 }, // Zambia, Malawi & Zimbabwe Plateaus
  { targetCode: 'Cw', minLat: -10.5, maxLat: -3.5, minLng: 29.0, maxLng: 37.0 }, // Tanzania / Burundi / Rwanda Highlands
  { targetCode: 'Cw', minLat: -26.8, maxLat: -22.5, minLng: 27.5, maxLng: 31.2 }, // South Africa Gauteng / Mpumalanga Highveld
  { targetCode: 'Cw', minLat: -22.5, maxLat: -17.5, minLng: 46.2, maxLng: 48.2 }, // Madagascar Central Highlands
  { targetCode: 'Cw', minLat: -23.0, maxLat: -15.5, minLng: -49.5, maxLng: -42.5 }, // Brazilian Central/Minas Highlands
  { targetCode: 'Cw', minLat: 7.5, maxLat: 13.0, minLng: 35.5, maxLng: 40.5 }, // Ethiopian Mid-Highlands (< 2500m)

  // =========================================================================
  // Df — Subarctic / Humid Continental
  // =========================================================================
  { targetCode: 'Df', minLat: 57.5, maxLat: 68.5, minLng: 11.0, maxLng: 31.0 }, // Norway, Sweden & Finland
  { targetCode: 'Df', minLat: 46.5, maxLat: 57.5, minLng: 18.0, maxLng: 32.0 }, // Baltics, Poland East, Belarus & W Ukraine
  { targetCode: 'Df', minLat: 45.5, maxLat: 47.8, minLng: 6.5, maxLng: 16.5 }, // European Alps (Switzerland/Austria/Tyrol)
  { targetCode: 'Df', minLat: 52.0, maxLat: 65.0, minLng: 32.0, maxLng: 62.0 }, // European Russia & Urals
  { targetCode: 'Df', minLat: 55.0, maxLat: 66.5, minLng: 62.0, maxLng: 95.0 }, // Western & Central Siberia
  { targetCode: 'Df', minLat: 47.0, maxLat: 61.5, minLng: 135.0, maxLng: 162.0 }, // Russian Far East, Sakhalin & Kamchatka
  { targetCode: 'Df', minLat: 36.0, maxLat: 45.5, minLng: 137.0, maxLng: 145.5 }, // Japanese Alps, Tohoku & Hokkaido
  { targetCode: 'Df', minLat: 60.0, maxLat: 67.5, minLng: -162.0, maxLng: -140.0 }, // Interior Alaska & Yukon
  { targetCode: 'Df', minLat: 49.0, maxLat: 63.0, minLng: -130.0, maxLng: -90.0 }, // Western & Central Boreal Canada
  { targetCode: 'Df', minLat: 45.5, maxLat: 55.5, minLng: -89.0, maxLng: -54.0 }, // Ontario, Quebec, Labrador & Newfoundland
  { targetCode: 'Df', minLat: 41.5, maxLat: 48.5, minLng: -96.0, maxLng: -67.5 }, // US Upper Midwest & New England
  { targetCode: 'Df', minLat: 41.5, maxLat: 49.0, minLng: -120.5, maxLng: -106.0 }, // US/Canada Northern Rockies
  { targetCode: 'Df', minLat: 40.5, maxLat: 44.0, minLng: 41.0, maxLng: 47.0 }, // Lesser & Greater Caucasus Valleys
  { targetCode: 'Df', minLat: 42.5, maxLat: 45.5, minLng: 76.0, maxLng: 86.0 }, // Altai / Tarbagatai / Ili Mountains

  // =========================================================================
  // Dw — Dry-Winter Continental / Subarctic
  // =========================================================================
  { targetCode: 'Dw', minLat: 60.5, maxLat: 68.0, minLng: 122.0, maxLng: 145.0 }, // Central & North Yakutia
  { targetCode: 'Dw', minLat: 58.0, maxLat: 67.5, minLng: 145.0, maxLng: 168.0 }, // Kolyma / Indigirka / Magadan Interior
  { targetCode: 'Dw', minLat: 50.5, maxLat: 56.5, minLng: 105.0, maxLng: 122.0 }, // Lake Baikal East & Transbaikalia
  { targetCode: 'Dw', minLat: 50.0, maxLat: 55.5, minLng: 122.0, maxLng: 135.0 }, // Amur & Stanovoy Range
  { targetCode: 'Dw', minLat: 46.5, maxLat: 51.0, minLng: 98.0, maxLng: 116.0 }, // Northern & Eastern Mongolia
  { targetCode: 'Dw', minLat: 45.5, maxLat: 52.5, minLng: 118.0, maxLng: 132.5 }, // Heilongjiang & Greater Khingan
  { targetCode: 'Dw', minLat: 40.5, maxLat: 45.5, minLng: 120.0, maxLng: 130.5 }, // Jilin & Liaoning
  { targetCode: 'Dw', minLat: 36.5, maxLat: 41.5, minLng: 110.0, maxLng: 119.0 }, // Hebei, Beijing Mountains & Shanxi
  { targetCode: 'Dw', minLat: 34.5, maxLat: 42.5, minLng: 125.0, maxLng: 129.8 }, // Korean Peninsula North & Taebaek Highlands
  { targetCode: 'Dw', minLat: 34.5, maxLat: 39.5, minLng: 101.5, maxLng: 109.5 }, // Shaanxi / Gansu / Ningxia Hills
  { targetCode: 'Dw', minLat: 43.0, maxLat: 49.0, minLng: 131.0, maxLng: 136.5 }, // Sikhote-Alin & Primorye
  { targetCode: 'Dw', minLat: 51.0, maxLat: 55.5, minLng: 86.0, maxLng: 104.0 }, // Tuva / Sayan / Irkutsk South
  { targetCode: 'Dw', minLat: 41.0, maxLat: 44.5, minLng: 115.0, maxLng: 121.0 }, // SE Inner Mongolia
  { targetCode: 'Dw', minLat: 34.0, maxLat: 37.5, minLng: 101.0, maxLng: 104.5 }, // Eastern Qinghai / Southern Gansu Valleys

  // =========================================================================
  // ET — Tundra
  // =========================================================================
  { targetCode: 'ET', minLat: 76.5, maxLat: 80.5, minLng: 11.0, maxLng: 28.0 }, // Svalbard Archipelago
  { targetCode: 'ET', minLat: 63.5, maxLat: 66.5, minLng: -24.0, maxLng: -13.5 }, // Iceland
  { targetCode: 'ET', minLat: 69.5, maxLat: 71.2, minLng: 20.0, maxLng: 31.5 }, // Finnmark & North Cape
  { targetCode: 'ET', minLat: 70.5, maxLat: 77.0, minLng: 52.0, maxLng: 68.0 }, // Novaya Zemlya
  { targetCode: 'ET', minLat: 69.5, maxLat: 73.5, minLng: 66.5, maxLng: 79.0 }, // Yamal & Gydan Peninsulas
  { targetCode: 'ET', minLat: 72.5, maxLat: 77.5, minLng: 82.0, maxLng: 115.0 }, // Taymyr Peninsula
  { targetCode: 'ET', minLat: 66.5, maxLat: 71.5, minLng: 165.0, maxLng: 179.5 }, // Chukotka & Wrangel Island (East)
  { targetCode: 'ET', minLat: 69.5, maxLat: 71.4, minLng: -166.0, maxLng: -141.0 }, // Alaska North Slope
  { targetCode: 'ET', minLat: 67.5, maxLat: 74.0, minLng: -125.0, maxLng: -96.0 }, // Western Canadian Arctic (Banks/Victoria)
  { targetCode: 'ET', minLat: 63.0, maxLat: 74.0, minLng: -95.0, maxLng: -62.0 }, // Baffin Island & Nunavut
  { targetCode: 'ET', minLat: 74.5, maxLat: 82.5, minLng: -95.0, maxLng: -62.0 }, // Ellesmere & High Arctic Islands
  { targetCode: 'ET', minLat: 56.5, maxLat: 62.5, minLng: -78.0, maxLng: -62.0 }, // Ungava & Northern Quebec
  { targetCode: 'ET', minLat: 60.5, maxLat: 70.0, minLng: -54.0, maxLng: -22.0 }, // Greenland Coastal Rim
  { targetCode: 'ET', minLat: -65.0, maxLat: -53.5, minLng: -70.0, maxLng: -57.0 }, // Tierra del Fuego Peaks / South Georgia / Peninsula rim

  // =========================================================================
  // EF — Ice Cap
  // =========================================================================
  { targetCode: 'EF', minLat: 62.0, maxLat: 68.0, minLng: -49.0, maxLng: -40.0 }, // Southern Greenland Ice Sheet
  { targetCode: 'EF', minLat: 68.0, maxLat: 75.5, minLng: -48.0, maxLng: -31.0 }, // Central Greenland Ice Sheet
  { targetCode: 'EF', minLat: 75.5, maxLat: 81.5, minLng: -58.0, maxLng: -25.0 }, // Northern Greenland Ice Sheet
  { targetCode: 'EF', minLat: -84.0, maxLat: -70.0, minLng: 35.0, maxLng: 90.0 }, // East Antarctica (Lambert / Dome A)
  { targetCode: 'EF', minLat: -84.0, maxLat: -68.0, minLng: 90.0, maxLng: 145.0 }, // East Antarctica (Wilkes / Vostok)
  { targetCode: 'EF', minLat: -84.0, maxLat: -72.0, minLng: 145.0, maxLng: 175.0 }, // Victoria Land / Ross Ice Sheet
  { targetCode: 'EF', minLat: -83.0, maxLat: -71.0, minLng: -15.0, maxLng: 35.0 }, // Queen Maud Land
  { targetCode: 'EF', minLat: -82.0, maxLat: -73.0, minLng: -135.0, maxLng: -70.0 }, // West Antarctica (Byrd / Ellsworth)
  { targetCode: 'EF', minLat: -73.0, maxLat: -65.0, minLng: -67.0, maxLng: -61.0 }, // Antarctic Peninsula Ice Plateau
  { targetCode: 'EF', minLat: 76.0, maxLat: 81.5, minLng: -84.0, maxLng: -72.0 }, // Ellesmere Ice Caps

  // =========================================================================
  // H — Highland (Elevation >= 2,500m in |lat| < 55°)
  // =========================================================================
  { targetCode: 'H', minLat: -25.0, maxLat: -15.0, minLng: -70.5, maxLng: -66.5 }, // Bolivian & N Chilean Altiplano
  { targetCode: 'H', minLat: -15.0, maxLat: -7.5, minLng: -77.5, maxLng: -70.0 }, // Peruvian High Andes
  { targetCode: 'H', minLat: -3.5, maxLat: 1.5, minLng: -79.2, maxLng: -77.8 }, // Ecuadorian Andes
  { targetCode: 'H', minLat: -35.0, maxLat: -25.0, minLng: -70.5, maxLng: -68.2 }, // High Argentine-Chilean Andes (Aconcagua/Puna)
  { targetCode: 'H', minLat: 28.5, maxLat: 35.5, minLng: 79.0, maxLng: 96.5 }, // Western & Central Tibetan Plateau
  { targetCode: 'H', minLat: 32.0, maxLat: 36.5, minLng: 96.0, maxLng: 102.5 }, // Eastern Qinghai & Amdo Plateau
  { targetCode: 'H', minLat: 28.0, maxLat: 32.5, minLng: 96.5, maxLng: 101.5 }, // Hengduan & Western Sichuan High Mountains
  { targetCode: 'H', minLat: 32.5, maxLat: 36.5, minLng: 74.5, maxLng: 79.5 }, // Ladakh & Western Himalayas
  { targetCode: 'H', minLat: 35.5, maxLat: 39.5, minLng: 70.5, maxLng: 76.5 }, // Pamir, Karakoram & Hindu Kush
  { targetCode: 'H', minLat: 40.0, maxLat: 43.0, minLng: 72.0, maxLng: 82.0 }, // Tien Shan High Ridges (Kyrgyzstan)
  { targetCode: 'H', minLat: 6.5, maxLat: 13.5, minLng: 37.5, maxLng: 40.5 }, // Ethiopian Bale & Simien Massifs
  { targetCode: 'H', minLat: 36.5, maxLat: 41.0, minLng: -108.5, maxLng: -105.0 }, // Southern & Central Colorado Rockies
  { targetCode: 'H', minLat: 18.8, maxLat: 19.6, minLng: -99.8, maxLng: -97.2 }, // Trans-Mexican Volcanic Belt High Peaks
  { targetCode: 'H', minLat: 27.0, maxLat: 29.0, minLng: 83.0, maxLng: 92.0 }, // High Nepal & Bhutan Himalayas
];
