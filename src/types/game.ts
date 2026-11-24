export type KoppenGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'H';

export type KoppenCode =
  | 'Af'
  | 'Am'
  | 'Aw'
  | 'BW'
  | 'BS'
  | 'Cfa'
  | 'Cfb'
  | 'Cs'
  | 'Df'
  | 'Dw'
  | 'ET'
  | 'EF'
  | 'H';

export type GameMode = 'standard5' | 'endless' | 'versus';

export interface VersusConfig {
  playerNames: [string, string];
  roundsPerPlayer: 3 | 5;
}

export type GamePhase = 'TITLE' | 'LOADING' | 'PLAYING' | 'REVEAL' | 'SUMMARY';

export type ViewMode = 'satellite' | 'osm';

export type HintTier = 0 | 1 | 2 | 3;

export interface ClimateData {
  climateCode: KoppenCode | null;
  rawCode: string;
  monthlyTempC: number[];
  monthlyPrecipMm: number[];
  elevation: number;
  annualMeanTemp: number;
  annualPrecip: number;
  maxTemp: number;
  minTemp: number;
  warmestMonth: number; // 1-12
  coldestMonth: number; // 1-12
  reasonSteps: string[];
}

export interface RoundLocation {
  id: string;
  lat: number;
  lng: number;
  climate: ClimateData & { climateCode: KoppenCode };
}

export interface ReverseGeocodeResult {
  placeName: string | null;
  countryName: string | null;
  formattedAddress: string | null;
}

export type MatchQuality = 'exact' | 'group' | 'miss';

export interface RoundResult {
  roundNumber: number;
  playerIndex?: 0 | 1;
  playerName?: string;
  location: RoundLocation;
  guess: KoppenCode;
  correctCode: KoppenCode;
  matchQuality: MatchQuality;
  baseScore: number;
  hintPenalty: number;
  finalScore: number;
  hintTierUsed: HintTier;
  resolvedPlace: ReverseGeocodeResult | null;
}

export interface BestRecords {
  standard5BestScore: number;
  endlessBestStreak: number;
  endlessBestNoHintStreak: number;
  gamesPlayed: number;
}
