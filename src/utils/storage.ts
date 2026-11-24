import type { BestRecords } from '../types/game.ts';

const STORAGE_KEY = 'koppen_guessr_records_v1';

const DEFAULT_RECORDS: BestRecords = {
  standard5BestScore: 0,
  endlessBestStreak: 0,
  endlessBestNoHintStreak: 0,
  gamesPlayed: 0,
};

export function loadBestRecords(): BestRecords {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RECORDS };
    const parsed = JSON.parse(raw) as Partial<BestRecords>;
    return {
      standard5BestScore: Number(parsed.standard5BestScore) || 0,
      endlessBestStreak: Number(parsed.endlessBestStreak) || 0,
      endlessBestNoHintStreak: Number(parsed.endlessBestNoHintStreak) || 0,
      gamesPlayed: Number(parsed.gamesPlayed) || 0,
    };
  } catch {
    return { ...DEFAULT_RECORDS };
  }
}

export function saveBestRecords(records: BestRecords): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors in restricted frames
  }
}
