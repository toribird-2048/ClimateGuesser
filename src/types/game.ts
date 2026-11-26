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
  | 'Cw'
  | 'Df'
  | 'Dw'
  | 'ET'
  | 'EF'
  | 'H';

export type GameMode = 'standard5' | 'endless' | 'versus';

export type QuestionFormat = 'satellite' | 'blankMap' | 'hythergraph';

export type TimeLimitOption = 0 | 30 | 60 | 90 | 120;

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
  location: RoundLocation;
  guess: KoppenCode | null;
  correctCode: KoppenCode;
  matchQuality: MatchQuality;
  baseScore: number;
  hintPenalty: number;
  finalScore: number;
  hintTierUsed: HintTier;
  resolvedPlace: ReverseGeocodeResult | null;
  playerIndex?: 0 | 1;
  playerName?: string;
  timedOut?: boolean;
  questionFormat?: QuestionFormat;
}

export interface FormatBestRecord {
  standard5BestScore: number;
  endlessBestStreak: number;
  endlessBestNoHintStreak: number;
  gamesPlayed: number;
}

export interface BestRecords extends FormatBestRecord {
  byFormat: Record<QuestionFormat, FormatBestRecord>;
}

export interface GamePreferences {
  questionFormat: QuestionFormat;
  timeLimitSec: TimeLimitOption;
  versusConfig: VersusConfig;
  muted: boolean;
}

export interface PersistedGameSession {
  version: 1;
  savedAt: number;
  phase: GamePhase;
  mode: GameMode;
  questionFormat: QuestionFormat;
  viewMode: ViewMode;
  timeLimitSec: TimeLimitOption;
  timeLeftSec: number;
  versusConfig: VersusConfig;
  versusScores: [number, number];
  currentRoundNumber: number;
  currentLocation: RoundLocation | null;
  selectedGuess: KoppenCode | null;
  unlockedHintTier: HintTier;
  totalHintsUsed: number;
  isHintOpen: boolean;
  isSelectorExpanded: boolean;
  results: RoundResult[];
  activeReveal: RoundResult | null;
  totalScore: number;
  streakCount: number;
  bestSessionStreak: number;
  isNewBest: boolean;
  usedCoordKeys: string[];
  usedCodes: KoppenCode[];
}
