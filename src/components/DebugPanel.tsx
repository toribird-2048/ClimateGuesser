import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Play,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { ALL_KOPPEN_CODES, KOPPEN_CLASSES } from '../data/koppen.ts';
import { SAMPLING_REGIONS } from '../data/samplingRegions.ts';
import type {
  GameMode,
  GamePhase,
  KoppenCode,
  QuestionFormat,
  RoundLocation,
  RoundResult,
} from '../types/game.ts';
import {
  buildDiagnosticReport,
  clearDebugLogs,
  getDebugLogs,
  subscribeDebugLogs,
  type DebugLogEntry,
} from '../utils/debugLogger.ts';

interface DebugPanelProps {
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
  onForceLoadCode: (code: KoppenCode) => Promise<void>;
  onForceLoadCoords: (lat: number, lng: number) => Promise<void>;
  onRefillBuffer: () => void;
  onClearRecentHistory: () => void;
  onDisableDebugMode: () => void;
}

export function DebugPanel({
  phase,
  mode,
  questionFormat,
  currentRoundNumber,
  currentLocation,
  activeReveal,
  selectedGuess,
  loadingError,
  usedCodes,
  usedCoordKeys,
  bufferedLocations,
  recentHistoryCount,
  onForceLoadCode,
  onForceLoadCoords,
  onRefillBuffer,
  onClearRecentHistory,
  onDisableDebugMode,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'report' | 'logs' | 'actions'>('report');
  const [logs, setLogs] = useState<DebugLogEntry[]>(() => getDebugLogs());
  const [onlyErrors, setOnlyErrors] = useState<boolean>(false);
  const [userNote, setUserNote] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [customLat, setCustomLat] = useState<string>('35.68');
  const [customLng, setCustomLng] = useState<string>('139.76');
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    return subscribeDebugLogs(() => {
      setLogs([...getDebugLogs()]);
    });
  }, []);

  // Auto-expand debug panel if a loading error occurs while debug mode is enabled
  useEffect(() => {
    if (loadingError) {
      setIsOpen(true);
    }
  }, [loadingError]);

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;
  const activeLoc = activeReveal?.location ?? currentLocation;
  const regionInfo =
    activeLoc && typeof activeLoc.regionIndex === 'number' && activeLoc.regionIndex >= 0
      ? SAMPLING_REGIONS[activeLoc.regionIndex]
      : null;

  const handleCopyReport = async () => {
    const report = buildDiagnosticReport({
      userNote,
      phase,
      mode,
      questionFormat,
      currentRoundNumber,
      currentLocation,
      activeReveal,
      selectedGuess,
      loadingError,
      usedCodes,
      usedCoordKeys,
      bufferedLocations,
      recentHistoryCount,
    });

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback textarea copy for restricted iframe environments
      const ta = document.createElement('textarea');
      ta.value = report;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleForceCode = async (code: KoppenCode) => {
    setActionBusy(true);
    setActionFeedback(`${code} のテスト地点を取得中...`);
    try {
      await onForceLoadCode(code);
      setActionFeedback(`${code} をロードしました`);
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : '取得に失敗しました');
    } finally {
      setActionBusy(false);
    }
  };

  const handleForceCoords = async () => {
    const lat = Number(customLat);
    const lng = Number(customLng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setActionFeedback('有効な緯度(-90〜90)・経度(-180〜180)を入力してください');
      return;
    }
    setActionBusy(true);
    setActionFeedback(`座標 (${lat}, ${lng}) を取得中...`);
    try {
      await onForceLoadCoords(lat, lng);
      setActionFeedback(`座標 (${lat}, ${lng}) をロードしました`);
    } catch (err) {
      setActionFeedback(err instanceof Error ? err.message : '取得に失敗しました');
    } finally {
      setActionBusy(false);
    }
  };

  const filteredLogs = onlyErrors
    ? logs.filter((l) => l.level === 'error' || l.level === 'warn')
    : logs;

  const positionClass =
    phase === 'PLAYING' ? 'fixed top-16 left-4 z-50' : 'fixed bottom-3 left-3 z-50';

  if (!isOpen) {
    return (
      <div className={`${positionClass} flex items-center gap-1.5`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold shadow-2xl backdrop-blur-md inline-flex items-center gap-2 transition-colors cursor-pointer ${
            errorCount > 0 || loadingError
              ? 'bg-rose-950/92 border-rose-400/60 text-rose-200 hover:bg-rose-900'
              : warnCount > 0
                ? 'bg-amber-950/92 border-amber-400/50 text-amber-200 hover:bg-amber-900'
                : 'bg-slate-900/92 border-amber-400/40 text-amber-300 hover:bg-slate-800'
          }`}
          title="デバッグパネルを開く"
        >
          <Bug className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>DEBUG</span>
          {activeLoc && (
            <span className="text-emerald-300 font-bold">
              [{activeLoc.climate.climateCode}]
            </span>
          )}
          <span className="text-slate-400">Buf:{bufferedLocations.length}</span>
          {(errorCount > 0 || warnCount > 0) && (
            <span className="px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-200">
              E:{errorCount} W:{warnCount}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleCopyReport}
          className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-2xl inline-flex items-center gap-1 transition-colors cursor-pointer"
          title="現在の状態とエラーログを修正指示用にコピー"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>コピー済</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>レポートコピー</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${positionClass} w-[calc(100vw-2rem)] sm:w-[460px] max-h-[78dvh] bg-[#0B1120]/96 backdrop-blur-xl border border-amber-400/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100`}
    >
      {/* Header */}
      <div className="shrink-0 px-3.5 py-2.5 bg-amber-500/12 border-b border-amber-400/25 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Bug className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-bold text-amber-200 truncate">
            デバッグ・修正指示インスペクタ
          </span>
          {(errorCount > 0 || warnCount > 0) && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-400/30">
              Err:{errorCount} Warn:{warnCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onDisableDebugMode}
            className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-rose-300 hover:bg-white/10 transition-colors cursor-pointer"
            title="デバッグモードを無効化"
          >
            OFFにする
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="デバッグパネルを折りたたむ"
          >
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 grid grid-cols-3 border-b border-white/10 bg-slate-950/60 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`py-2 px-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'report'
              ? 'border-amber-400 text-amber-300 bg-amber-500/8'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          修正指示・現在値
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`py-2 px-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'logs'
              ? 'border-amber-400 text-amber-300 bg-amber-500/8'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          通信・エラー ({logs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('actions')}
          className={`py-2 px-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'actions'
              ? 'border-amber-400 text-amber-300 bg-amber-500/8'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          強制出題・操作
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 text-xs">
        {activeTab === 'report' && (
          <>
            {/* User Note + One-Click Copy */}
            <div className="space-y-2 bg-slate-900/80 border border-white/10 rounded-xl p-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-amber-200">
                  気になった点・エラー状況メモ（任意）
                </span>
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="例: この地点の気候判定がおかしい / 地図が表示されない"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/12 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </label>

              <button
                type="button"
                onClick={handleCopyReport}
                className="w-full py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>コピー完了！このままチャットに貼り付けてください</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>修正指示用デバッグレポートをコピー</span>
                  </>
                )}
              </button>
            </div>

            {loadingError && (
              <div className="bg-rose-950/60 border border-rose-400/40 rounded-xl p-3 flex items-start gap-2 text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-0.5">
                  <div className="font-semibold">現在発生中のエラー</div>
                  <div className="text-[11px] break-all">{loadingError}</div>
                </div>
              </div>
            )}

            {/* Current Location Inspector */}
            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-2 font-mono">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span className="font-semibold text-slate-200">現在の出題地点データ</span>
                <span>
                  Phase: <strong className="text-white">{phase}</strong> · R{currentRoundNumber}
                </span>
              </div>

              {activeLoc ? (
                <div className="space-y-1 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>
                      正解区分:{' '}
                      <strong className="text-emerald-300 text-xs">
                        {activeLoc.climate.climateCode}
                      </strong>{' '}
                      ({KOPPEN_CLASSES[activeLoc.climate.climateCode].shortNameJa})
                    </span>
                    <span>標高: {activeLoc.climate.elevation}m</span>
                  </div>
                  <div>
                    座標: {activeLoc.lat.toFixed(4)}, {activeLoc.lng.toFixed(4)}
                  </div>
                  <div>
                    抽選枠:{' '}
                    {regionInfo
                      ? `#${activeLoc.regionIndex} (狙い:${regionInfo.targetCode} / 範囲:${regionInfo.minLat}..${regionInfo.maxLat}, ${regionInfo.minLng}..${regionInfo.maxLng})`
                      : '地球全体ランダム陸地 (#-1)'}
                  </div>
                  <div>
                    年平均: {activeLoc.climate.annualMeanTemp}℃ (最暖{activeLoc.climate.maxTemp}℃ / 最寒
                    {activeLoc.climate.minTemp}℃) · 年降水: {activeLoc.climate.annualPrecip}mm
                  </div>
                  <div className="text-[10px] text-slate-400 break-all">
                    月気温: [{activeLoc.climate.monthlyTempC.join(', ')}]
                  </div>
                  <div className="text-[10px] text-slate-400 break-all">
                    月降水: [{activeLoc.climate.monthlyPrecipMm.join(', ')}]
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 font-sans">
                  現在アクティブな出題地点はありません（タイトル画面または読込中）
                </div>
              )}
            </div>

            {/* Prefetch Buffer Queue Status */}
            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  先読みバッファ ({bufferedLocations.length} / 4 問待機中)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  履歴:{recentHistoryCount}件
                </span>
              </div>
              {bufferedLocations.length === 0 ? (
                <div className="text-[11px] text-slate-500">バックグラウンドで探索中...</div>
              ) : (
                <div className="space-y-1 font-mono text-[11px]">
                  {bufferedLocations.map((b, i) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between bg-slate-950/70 px-2.5 py-1 rounded border border-white/6"
                    >
                      <span>
                        Next #{i + 1}: <strong className="text-emerald-300">{b.climate.climateCode}</strong>
                      </span>
                      <span className="text-slate-400">
                        ({b.lat.toFixed(2)}, {b.lng.toFixed(2)}) · region #{b.regionIndex ?? -1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyErrors}
                  onChange={(e) => setOnlyErrors(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900"
                />
                <span>エラー・警告のみ表示 ({errorCount + warnCount})</span>
              </label>

              <button
                type="button"
                onClick={() => clearDebugLogs()}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                <span>ログ消去</span>
              </button>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                該当するログはありません
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {filteredLogs.map((entry) => {
                  const badgeClass =
                    entry.level === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                      : entry.level === 'warn'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                        : 'bg-slate-800 text-slate-300 border-white/10';
                  const timeStr = new Date(entry.timestamp).toISOString().slice(11, 19);
                  return (
                    <div
                      key={entry.id}
                      className={`p-2 rounded-lg border ${badgeClass} space-y-0.5`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] opacity-80">
                        <span>
                          [{timeStr}] [{entry.category}]
                        </span>
                        {entry.durationMs !== undefined && <span>{entry.durationMs}ms</span>}
                      </div>
                      <div className="break-all leading-snug">{entry.message}</div>
                      {entry.detail && (
                        <div className="text-[10px] opacity-75 break-all pt-0.5">
                          {entry.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-3">
            {actionFeedback && (
              <div className="px-3 py-2 rounded-lg bg-slate-900 border border-amber-400/30 text-[11px] text-amber-200 flex items-center justify-between">
                <span>{actionFeedback}</span>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Force specific Köppen code */}
            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="font-semibold text-slate-200">
                特定の気候区分を強制ロードして検証
              </div>
              <div className="grid grid-cols-7 gap-1">
                {ALL_KOPPEN_CODES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleForceCode(code)}
                    className="py-1.5 px-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-mono font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Force custom coordinate */}
            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="font-semibold text-slate-200">
                任意の緯度・経度を指定して気候判定をテスト
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-0.5">
                  <span className="text-[10px] text-slate-400">緯度 (Lat)</span>
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-white/12 font-mono text-xs text-white"
                  />
                </label>
                <label className="block space-y-0.5">
                  <span className="text-[10px] text-slate-400">経度 (Lng)</span>
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-white/12 font-mono text-xs text-white"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleForceCoords()}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                <span>この座標で出題・気候判定を実行</span>
              </button>
            </div>

            {/* Buffer & History Maintenance */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onRefillBuffer();
                  setActionFeedback('先読みバッファを再構築しています...');
                }}
                className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
                <span>バッファ再取得</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearRecentHistory();
                  setActionFeedback('直近45問の出題履歴をリセットしました');
                }}
                className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" aria-hidden="true" />
                <span>直近履歴リセット</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
