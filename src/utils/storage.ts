import type {
  BestRecords,
  FormatBestRecord,
  GameMode,
  GamePhase,
  GamePreferences,
  HintTier,
  KoppenCode,
  PersistedGameSession,
  QuestionFormat,
  RoundLocation,
  RoundResult,
  TimeLimitOption,
  VersusConfig,
  ViewMode,
} from '../types/game.ts';

const RECORDS_STORAGE_KEY = 'koppen_guessr_records_v1';
const PREFS_STORAGE_KEY = 'koppen_guessr_prefs_v1';
const SESSION_STORAGE_KEY = 'koppen_guessr_session_v1';

const VALID_PHASES: readonly GamePhase[] = ['TITLE', 'LOADING', 'PLAYING', 'REVEAL', 'SUMMARY'];
const VALID_MODES: readonly GameMode[] = ['standard5', 'endless', 'versus'];
const VALID_FORMATS: readonly QuestionFormat[] = ['satellite', 'blankMap', 'hythergraph'];
const VALID_VIEW_MODES: readonly ViewMode[] = ['satellite', 'osm'];
const VALID_TIME_LIMITS: readonly TimeLimitOption[] = [0, 30, 60, 90, 120];
const VALID_KOPPEN_CODES: readonly KoppenCode[] = [
  'Af',
  'Am',
  'Aw',
  'BW',
  'BS',
  'Cfa',
  'Cfb',
  'Cs',
  'Cw',
  'Df',
  'Dw',
  'ET',
  'EF',
  'H',
];

export const DEFAULT_VERSUS_CONFIG: VersusConfig = {
  playerNames: ['プレイヤー1', 'プレイヤー2'],
  roundsPerPlayer: 3,
};

export const DEFAULT_PREFERENCES: GamePreferences = {
  questionFormat: 'satellite',
  timeLimitSec: 0,
  versusConfig: DEFAULT_VERSUS_CONFIG,
  muted: false,
};

const EMPTY_FORMAT_RECORD: FormatBestRecord = {
  standard5BestScore: 0,
  endlessBestStreak: 0,
  endlessBestNoHintStreak: 0,
  gamesPlayed: 0,
};

function sanitizeFormatRecord(raw?: Partial<FormatBestRecord>): FormatBestRecord {
  return {
    standard5BestScore: Number(raw?.standard5BestScore) || 0,
    endlessBestStreak: Number(raw?.endlessBestStreak) || 0,
    endlessBestNoHintStreak: Number(raw?.endlessBestNoHintStreak) || 0,
    gamesPlayed: Number(raw?.gamesPlayed) || 0,
  };
}

function createDefaultRecords(): BestRecords {
  return {
    ...EMPTY_FORMAT_RECORD,
    byFormat: {
      satellite: { ...EMPTY_FORMAT_RECORD },
      blankMap: { ...EMPTY_FORMAT_RECORD },
      hythergraph: { ...EMPTY_FORMAT_RECORD },
    },
  };
}

function isKoppenCode(value: unknown): value is KoppenCode {
  return typeof value === 'string' && (VALID_KOPPEN_CODES as readonly string[]).includes(value);
}

function isQuestionFormat(value: unknown): value is QuestionFormat {
  return typeof value === 'string' && (VALID_FORMATS as readonly string[]).includes(value);
}

function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && (VALID_MODES as readonly string[]).includes(value);
}

function isGamePhase(value: unknown): value is GamePhase {
  return typeof value === 'string' && (VALID_PHASES as readonly string[]).includes(value);
}

function isViewMode(value: unknown): value is ViewMode {
  return typeof value === 'string' && (VALID_VIEW_MODES as readonly string[]).includes(value);
}

function isTimeLimitOption(value: unknown): value is TimeLimitOption {
  return typeof value === 'number' && (VALID_TIME_LIMITS as readonly number[]).includes(value);
}

function sanitizeHintTier(value: unknown): HintTier {
  if (value === 1 || value === 2 || value === 3) return value;
  return 0;
}

function sanitizeVersusConfig(raw?: Partial<VersusConfig>): VersusConfig {
  const names = Array.isArray(raw?.playerNames) ? raw.playerNames : [];
  const p1 = typeof names[0] === 'string' && names[0].length > 0 ? names[0].slice(0, 14) : 'プレイヤー1';
  const p2 = typeof names[1] === 'string' && names[1].length > 0 ? names[1].slice(0, 14) : 'プレイヤー2';
  const roundsPerPlayer = raw?.roundsPerPlayer === 5 ? 5 : 3;
  return {
    playerNames: [p1, p2],
    roundsPerPlayer,
  };
}

function isValidRoundLocation(raw: unknown): raw is RoundLocation {
  if (!raw || typeof raw !== 'object') return false;
  const loc = raw as Partial<RoundLocation>;
  if (
    typeof loc.id !== 'string' ||
    typeof loc.lat !== 'number' ||
    !Number.isFinite(loc.lat) ||
    typeof loc.lng !== 'number' ||
    !Number.isFinite(loc.lng) ||
    !loc.climate ||
    typeof loc.climate !== 'object'
  ) {
    return false;
  }
  const c = loc.climate;
  return (
    isKoppenCode(c.climateCode) &&
    Array.isArray(c.monthlyTempC) &&
    c.monthlyTempC.length === 12 &&
    Array.isArray(c.monthlyPrecipMm) &&
    c.monthlyPrecipMm.length === 12 &&
    Array.isArray(c.reasonSteps)
  );
}

function isValidRoundResult(raw: unknown): raw is RoundResult {
  if (!raw || typeof raw !== 'object') return false;
  const res = raw as Partial<RoundResult>;
  return (
    typeof res.roundNumber === 'number' &&
    isValidRoundLocation(res.location) &&
    isKoppenCode(res.correctCode) &&
    (res.guess === null || isKoppenCode(res.guess)) &&
    (res.matchQuality === 'exact' ||
      res.matchQuality === 'group' ||
      res.matchQuality === 'miss')
  );
}

export function loadBestRecords(): BestRecords {
  try {
    const raw = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) return createDefaultRecords();
    const parsed = JSON.parse(raw) as Partial<BestRecords>;

    const topLevel = sanitizeFormatRecord(parsed);
    const rawByFormat = parsed.byFormat;

    // Migrate legacy single-format records into `satellite` if `byFormat` did not exist yet
    const satellite = rawByFormat?.satellite
      ? sanitizeFormatRecord(rawByFormat.satellite)
      : { ...topLevel };
    const blankMap = sanitizeFormatRecord(rawByFormat?.blankMap);
    const hythergraph = sanitizeFormatRecord(rawByFormat?.hythergraph);

    return {
      ...topLevel,
      byFormat: {
        satellite,
        blankMap,
        hythergraph,
      },
    };
  } catch {
    return createDefaultRecords();
  }
}

export function getRecordsForFormat(
  records: BestRecords,
  format: QuestionFormat
): FormatBestRecord {
  return records.byFormat[format] ?? EMPTY_FORMAT_RECORD;
}

export function saveBestRecords(records: BestRecords): void {
  try {
    window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

export function loadGamePreferences(): GamePreferences {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES, versusConfig: { ...DEFAULT_VERSUS_CONFIG, playerNames: [...DEFAULT_VERSUS_CONFIG.playerNames] as [string, string] } };
    const parsed = JSON.parse(raw) as Partial<GamePreferences>;
    return {
      questionFormat: isQuestionFormat(parsed.questionFormat)
        ? parsed.questionFormat
        : DEFAULT_PREFERENCES.questionFormat,
      timeLimitSec: isTimeLimitOption(parsed.timeLimitSec)
        ? parsed.timeLimitSec
        : DEFAULT_PREFERENCES.timeLimitSec,
      versusConfig: sanitizeVersusConfig(parsed.versusConfig),
      muted: Boolean(parsed.muted),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, versusConfig: { ...DEFAULT_VERSUS_CONFIG, playerNames: [...DEFAULT_VERSUS_CONFIG.playerNames] as [string, string] } };
  }
}

export function saveGamePreferences(prefs: GamePreferences): void {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

export function loadGameSession(): PersistedGameSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedGameSession>;

    if (parsed.version !== 1) return null;
    if (!isGamePhase(parsed.phase) || parsed.phase === 'TITLE') return null;
    if (!isGameMode(parsed.mode)) return null;
    if (!isQuestionFormat(parsed.questionFormat)) return null;

    const currentLocation = isValidRoundLocation(parsed.currentLocation)
      ? parsed.currentLocation
      : null;
    const activeReveal = isValidRoundResult(parsed.activeReveal) ? parsed.activeReveal : null;
    const results = Array.isArray(parsed.results)
      ? parsed.results.filter(isValidRoundResult)
      : [];

    // Ensure phase invariants hold so restored UI never renders broken state
    if (parsed.phase === 'PLAYING' && !currentLocation) return null;
    if (parsed.phase === 'REVEAL' && !activeReveal) return null;

    const timeLimitSec = isTimeLimitOption(parsed.timeLimitSec) ? parsed.timeLimitSec : 0;
    const rawTimeLeft = Number(parsed.timeLeftSec);
    const timeLeftSec =
      timeLimitSec > 0
        ? Number.isFinite(rawTimeLeft)
          ? Math.max(1, Math.min(timeLimitSec, Math.floor(rawTimeLeft)))
          : timeLimitSec
        : 0;

    const rawScores = Array.isArray(parsed.versusScores) ? parsed.versusScores : [0, 0];
    const versusScores: [number, number] = [
      Number.isFinite(Number(rawScores[0])) ? Number(rawScores[0]) : 0,
      Number.isFinite(Number(rawScores[1])) ? Number(rawScores[1]) : 0,
    ];

    const usedCoordKeys = Array.isArray(parsed.usedCoordKeys)
      ? parsed.usedCoordKeys.filter((k): k is string => typeof k === 'string')
      : [];
    const usedCodes = Array.isArray(parsed.usedCodes)
      ? parsed.usedCodes.filter(isKoppenCode)
      : [];

    return {
      version: 1,
      savedAt: Number(parsed.savedAt) || Date.now(),
      phase: parsed.phase,
      mode: parsed.mode,
      questionFormat: parsed.questionFormat,
      viewMode: isViewMode(parsed.viewMode) ? parsed.viewMode : 'satellite',
      timeLimitSec,
      timeLeftSec,
      versusConfig: sanitizeVersusConfig(parsed.versusConfig),
      versusScores,
      currentRoundNumber: Math.max(1, Math.floor(Number(parsed.currentRoundNumber) || 1)),
      currentLocation,
      selectedGuess: isKoppenCode(parsed.selectedGuess) ? parsed.selectedGuess : null,
      unlockedHintTier: sanitizeHintTier(parsed.unlockedHintTier),
      totalHintsUsed: Math.max(0, Math.floor(Number(parsed.totalHintsUsed) || 0)),
      isHintOpen: Boolean(parsed.isHintOpen),
      isSelectorExpanded:
        typeof parsed.isSelectorExpanded === 'boolean' ? parsed.isSelectorExpanded : true,
      results,
      activeReveal,
      totalScore: Math.max(0, Math.floor(Number(parsed.totalScore) || 0)),
      streakCount: Math.max(0, Math.floor(Number(parsed.streakCount) || 0)),
      bestSessionStreak: Math.max(0, Math.floor(Number(parsed.bestSessionStreak) || 0)),
      isNewBest: Boolean(parsed.isNewBest),
      usedCoordKeys,
      usedCodes,
    };
  } catch {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    return null;
  }
}

export function saveGameSession(session: PersistedGameSession): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}

export function clearGameSession(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
