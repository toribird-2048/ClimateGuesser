import type {
  GameMode,
  GamePhase,
  KoppenCode,
  QuestionFormat,
  RoundLocation,
  RoundResult,
} from '../types/game.ts';
import { SAMPLING_REGIONS } from '../data/samplingRegions.ts';

export type DebugLogLevel = 'info' | 'warn' | 'error';

export type DebugLogCategory =
  | 'climate-api'
  | 'geocode-api'
  | 'discovery'
  | 'prefetch'
  | 'map'
  | 'runtime';

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  level: DebugLogLevel;
  category: DebugLogCategory;
  message: string;
  detail?: string;
  durationMs?: number;
}

const MAX_LOG_ENTRIES = 120;
const DEBUG_MODE_STORAGE_KEY = 'koppen_guessr_debug_mode_v1';

let logEntries: DebugLogEntry[] = [];
const listeners = new Set<() => void>();
let globalListenersAttached = false;

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

export function addDebugLog(
  level: DebugLogLevel,
  category: DebugLogCategory,
  message: string,
  options?: { detail?: string; durationMs?: number }
): void {
  const entry: DebugLogEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    level,
    category,
    message,
    detail: options?.detail,
    durationMs: options?.durationMs,
  };
  logEntries = [entry, ...logEntries].slice(0, MAX_LOG_ENTRIES);
  notifyListeners();
}

export function getDebugLogs(): DebugLogEntry[] {
  return logEntries;
}

export function clearDebugLogs(): void {
  logEntries = [];
  notifyListeners();
}

export function subscribeDebugLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadDebugModePreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1' || params.get('debug') === 'true') {
      return true;
    }
    return window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveDebugModePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEBUG_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

export function attachGlobalErrorListeners(): void {
  if (globalListenersAttached || typeof window === 'undefined') return;
  globalListenersAttached = true;

  window.addEventListener('error', (event) => {
    const msg = event.message || 'Uncaught window error';
    const loc = event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : '';
    const stack = event.error instanceof Error ? event.error.stack : undefined;
    addDebugLog('error', 'runtime', msg, {
      detail: [loc, stack].filter(Boolean).join('\n') || undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error
        ? `Unhandled Promise Rejection: ${reason.message}`
        : `Unhandled Promise Rejection: ${String(reason)}`;
    const stack = reason instanceof Error ? reason.stack : undefined;
    addDebugLog('error', 'runtime', msg, { detail: stack });
  });
}

export interface DiagnosticSnapshotInput {
  userNote?: string;
  phase: GamePhase;
  mode: GameMode;
  questionFormat: QuestionFormat;
  currentRoundNumber: number;
  currentLocation: RoundLocation | null;
  activeReveal: RoundResult | null;
  selectedGuess: KoppenCode | null;
  loadingError: string | null;
  usedCodes: KoppenCode[];
  usedCoordKeys: string[];
  bufferedLocations: RoundLocation[];
  recentHistoryCount: number;
}

export function buildDiagnosticReport(input: DiagnosticSnapshotInput): string {
  const nowIso = new Date().toISOString();
  const loc = input.activeReveal?.location ?? input.currentLocation;
  const regionInfo =
    loc && typeof loc.regionIndex === 'number' && loc.regionIndex >= 0
      ? SAMPLING_REGIONS[loc.regionIndex]
      : null;

  const errorAndWarnLogs = logEntries.filter((l) => l.level === 'error' || l.level === 'warn');
  const recentLogs = logEntries.slice(0, 25);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toISOString().slice(11, 23);
  };

  const lines: string[] = [];
  if (input.userNote && input.userNote.trim()) {
    lines.push(`【現象・修正指示メモ】`);
    lines.push(input.userNote.trim());
    lines.push('');
  }

  lines.push(`# Köppen Guessr デバッグ診断レポート`);
  lines.push(`- 出力日時: ${nowIso}`);
  if (typeof window !== 'undefined') {
    lines.push(`- URL: ${window.location.href}`);
    lines.push(`- BASE_URL: ${import.meta.env.BASE_URL}`);
    lines.push(`- 画面サイズ: ${window.innerWidth}x${window.innerHeight}`);
  }
  lines.push(
    `- ゲーム状態: phase=${input.phase}, mode=${input.mode}, format=${input.questionFormat}, round=${input.currentRoundNumber}`
  );
  lines.push(
    `- 選択中回答: ${input.selectedGuess ?? 'なし'} / 正解: ${loc?.climate.climateCode ?? 'なし'}`
  );
  if (input.loadingError) {
    lines.push(`- 表示中エラー: ${input.loadingError}`);
  }
  lines.push(
    `- セッション既出気候 (${input.usedCodes.length}): ${input.usedCodes.join(', ') || 'なし'}`
  );
  lines.push(
    `- 先読みバッファ (${input.bufferedLocations.length}件): ${
      input.bufferedLocations
        .map((b) => `${b.climate.climateCode}@(${b.lat.toFixed(2)},${b.lng.toFixed(2)})`)
        .join(', ') || '空'
    }`
  );
  lines.push(`- 保存済み直近履歴数: ${input.recentHistoryCount}件`);

  if (loc) {
    lines.push('');
    lines.push(`## 現在地点・気候データ`);
    lines.push(`- ID: ${loc.id}`);
    lines.push(`- 座標: lat=${loc.lat}, lng=${loc.lng} (標高 ${loc.climate.elevation}m)`);
    lines.push(
      `- サンプリング領域: ${
        regionInfo
          ? `#${loc.regionIndex} target=${regionInfo.targetCode} [${regionInfo.minLat}..${regionInfo.maxLat}, ${regionInfo.minLng}..${regionInfo.maxLng}]`
          : '地球全体ランダム抽選 (#-1)'
      }`
    );
    if (input.activeReveal?.resolvedPlace) {
      const rp = input.activeReveal.resolvedPlace;
      lines.push(`- 逆ジオコーディング地名: ${rp.placeName ?? 'null'} (${rp.formattedAddress ?? 'null'})`);
    }
    lines.push(
      `- 判定結果: climateCode=${loc.climate.climateCode}, rawCode=${loc.climate.rawCode}, 年平均気温=${loc.climate.annualMeanTemp}℃, 年降水量=${loc.climate.annualPrecip}mm`
    );
    lines.push(`- 月平均気温(℃): [${loc.climate.monthlyTempC.join(', ')}]`);
    lines.push(`- 月降水量(mm): [${loc.climate.monthlyPrecipMm.join(', ')}]`);
    lines.push(`- 判定ステップ:`);
    loc.climate.reasonSteps.forEach((step, idx) => {
      lines.push(`  ${idx + 1}. ${step}`);
    });
  }

  lines.push('');
  lines.push(`## エラー・警告ログ (${errorAndWarnLogs.length}件)`);
  if (errorAndWarnLogs.length === 0) {
    lines.push(`- エラー・警告はありません`);
  } else {
    errorAndWarnLogs.slice(0, 15).forEach((entry) => {
      const dur = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : '';
      lines.push(
        `- [${formatTime(entry.timestamp)}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}${dur}`
      );
      if (entry.detail) {
        lines.push(`  detail: ${entry.detail.replace(/\n/g, ' | ')}`);
      }
    });
  }

  lines.push('');
  lines.push(`## 直近イベント履歴 (最新${recentLogs.length}件)`);
  recentLogs.forEach((entry) => {
    const dur = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : '';
    lines.push(
      `- [${formatTime(entry.timestamp)}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}${dur}`
    );
  });

  return lines.join('\n');
}
