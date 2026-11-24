import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { BookOpen, Home, RotateCcw, Trophy } from 'lucide-react';
import { getGroupForCode, KOPPEN_CLASSES } from '../data/koppen.ts';
import type { BestRecords, GameMode, RoundResult, VersusConfig } from '../types/game.ts';
import { Climograph } from './Climograph.tsx';

interface SummaryScreenProps {
  mode: GameMode;
  results: RoundResult[];
  totalScore: number;
  streakCount: number;
  totalHintsUsed: number;
  isNewBest: boolean;
  records: BestRecords;
  versusConfig?: VersusConfig;
  versusScores?: [number, number];
  onPlayAgain: () => void;
  onGoHome: () => void;
  onOpenReference: () => void;
}

export function SummaryScreen({
  mode,
  results,
  totalScore,
  streakCount,
  totalHintsUsed,
  isNewBest,
  records,
  versusConfig,
  versusScores,
  onPlayAgain,
  onGoHome,
  onOpenReference,
}: SummaryScreenProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const activeResult = results[selectedIdx] ?? results[0];
  const exactMatches = results.filter((r) => r.matchQuality === 'exact').length;

  // Mount interactive OpenStreetMap world overview map
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [18, 12],
      zoom: 2,
      minZoom: 1,
      maxZoom: 15,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    const timer = setTimeout(() => map.invalidateSize(), 60);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  // Render numbered pins and highlight active pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    results.forEach((item, idx) => {
      const group = getGroupForCode(item.correctCode);
      const isActive = idx === selectedIdx;
      const bg = isActive ? '#FFFFFF' : group.swatchHex;
      const size = isActive ? 30 : 24;

      const icon = L.divIcon({
        className: 'koppen-summary-pin',
        html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#0B1120;border:2px solid #0B1120;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${isActive ? 13 : 11}px;font-family:Outfit,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,0.45);cursor:pointer;">${item.roundNumber}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([item.location.lat, item.location.lng], {
        icon,
        zIndexOffset: isActive ? 500 : 100,
      })
        .on('click', () => setSelectedIdx(idx))
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [results, selectedIdx]);

  return (
    <div className="min-h-screen w-full atlas-grid-bg text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="w-full max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-8 border-b border-white/10">
        <button
          type="button"
          onClick={onGoHome}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Köppen Guessr
        </button>

        <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-400">
          <button
            type="button"
            onClick={onOpenReference}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>13区分早見表</span>
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>モード選択</span>
          </button>
        </nav>

        <button
          type="button"
          onClick={onPlayAgain}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>もう一度プレイ</span>
        </button>
      </header>

      <main className="w-full max-w-[1200px] mx-auto px-6 py-8 space-y-6 flex-1">
        {/* Headline Result Strip */}
        <section className="bg-[#0F172A]/85 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>
                  {mode === 'standard5'
                    ? '5ラウンド制 最終結果'
                    : mode === 'versus'
                      ? '2人交代対戦 最終結果'
                      : 'エンドレスモード 結果'}
                </span>
                {isNewBest && mode !== 'versus' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-semibold inline-flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                      自己ベスト更新
                    </span>
                  </>
                )}
              </div>

              {mode === 'standard5' ? (
                <div className="flex items-baseline gap-3">
                  <h1
                    className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {totalScore.toLocaleString()}
                  </h1>
                  <span className="text-lg text-slate-400 font-mono tabular-nums">/ 5,000 pt</span>
                </div>
              ) : mode === 'versus' && versusConfig && versusScores ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <Trophy className="w-8 h-8 text-amber-300 shrink-0" aria-hidden="true" />
                  <h1
                    className="text-3xl sm:text-4xl font-extrabold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {versusScores[0] === versusScores[1]
                      ? '引き分け！'
                      : versusScores[0] > versusScores[1]
                        ? `${versusConfig.playerNames[0]} の勝利！`
                        : `${versusConfig.playerNames[1]} の勝利！`}
                  </h1>
                  {versusScores[0] !== versusScores[1] && (
                    <span className="text-sm font-mono tabular-nums text-slate-400">
                      （点差 +{Math.abs(versusScores[0] - versusScores[1]).toLocaleString()} pt）
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1
                    className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {exactMatches}
                    <span className="text-2xl text-slate-400 font-normal"> / {results.length}</span>
                  </h1>
                  <span className="text-lg text-slate-300">
                    完全一致（正答率{' '}
                    <strong className="font-mono tabular-nums text-emerald-300">
                      {results.length > 0 ? Math.round((exactMatches / results.length) * 100) : 0}%
                    </strong>
                    ）
                  </span>
                </div>
              )}

              {mode !== 'versus' && (
                <div className="text-xs sm:text-sm text-slate-400 font-mono tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                  {mode === 'standard5' ? (
                    <span>完全一致 {exactMatches}/{results.length}</span>
                  ) : (
                    <span>今回の最長連続 {streakCount} 連続</span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>ヒント使用 {totalHintsUsed}回</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    自己ベスト:{' '}
                    {mode === 'standard5'
                      ? `${records.standard5BestScore.toLocaleString()} pt`
                      : `${records.endlessBestStreak} 連続`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                モード選択に戻る
              </button>
              <button
                type="button"
                onClick={onPlayAgain}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{mode === 'versus' ? 'もう一度対戦' : 'もう一度プレイ'}</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Versus Score Cards */}
          {mode === 'versus' && versusConfig && versusScores && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              {([0, 1] as const).map((idx) => {
                const pResults = results.filter((r) => r.playerIndex === idx);
                const pExact = pResults.filter((r) => r.matchQuality === 'exact').length;
                const pGroup = pResults.filter((r) => r.matchQuality === 'group').length;
                const pHints = pResults.reduce((sum, r) => sum + r.hintTierUsed, 0);
                const maxPts = versusConfig.roundsPerPlayer * 1000;
                const isWinner =
                  versusScores[idx] > versusScores[idx === 0 ? 1 : 0];
                return (
                  <div
                    key={idx}
                    className={`rounded-xl p-4 border ${
                      isWinner
                        ? idx === 0
                          ? 'bg-emerald-500/10 border-emerald-400/40'
                          : 'bg-sky-500/10 border-sky-400/40'
                        : 'bg-slate-950/50 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-sm font-semibold ${
                          idx === 0 ? 'text-emerald-300' : 'text-sky-300'
                        }`}
                      >
                        P{idx + 1} · {versusConfig.playerNames[idx]}
                      </span>
                      {isWinner && (
                        <span className="text-xs font-semibold text-amber-300">WIN</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-3xl font-extrabold font-mono tabular-nums text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {versusScores[idx].toLocaleString()}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-400">
                        / {maxPts.toLocaleString()} pt
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span>完全一致 {pExact}/{pResults.length}</span>
                      <span>·</span>
                      <span>大区分一致 {pGroup}</span>
                      <span>·</span>
                      <span>ヒント計 Lv.{pHints}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* World Overview Map + Selected Round Climograph Inspector */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 bg-[#0F172A]/85 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold">出題地点マップ（ピンをクリックして詳細を表示）</span>
              <span className="text-slate-400 font-mono tabular-nums">{results.length} 地点</span>
            </div>
            <div className="w-full h-[340px] lg:flex-1 lg:min-h-[360px]">
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            </div>
          </div>

          {activeResult && (
            <div className="lg:col-span-5 bg-[#0F172A]/85 border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    Round {activeResult.roundNumber}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-emerald-300 font-semibold">
                    {activeResult.correctCode} · {KOPPEN_CLASSES[activeResult.correctCode].nameJa}
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {activeResult.resolvedPlace?.placeName ||
                    activeResult.resolvedPlace?.formattedAddress ||
                    `座標 (${activeResult.location.lat.toFixed(2)}°, ${activeResult.location.lng.toFixed(2)}°)`}
                </div>
                <div className="bg-slate-950/60 border border-white/8 rounded-xl p-3">
                  <Climograph
                    monthlyTempC={activeResult.location.climate.monthlyTempC}
                    monthlyPrecipMm={activeResult.location.climate.monthlyPrecipMm}
                    annualMeanTemp={activeResult.location.climate.annualMeanTemp}
                    annualPrecip={activeResult.location.climate.annualPrecip}
                    compact={true}
                  />
                </div>
                <ul className="space-y-1 text-xs text-slate-300 leading-relaxed">
                  {activeResult.location.climate.reasonSteps.map((step, i) => (
                    <li key={i}>• {step}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Round-by-Round Table */}
        <section className="bg-[#0F172A]/85 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/10">
            <h2 className="text-sm font-semibold text-slate-100">ラウンド別リザルト</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs">
                  <th className="py-3 px-4 font-medium">R</th>
                  {mode === 'versus' && <th className="py-3 px-4 font-medium">プレイヤー</th>}
                  <th className="py-3 px-4 font-medium">地点</th>
                  <th className="py-3 px-4 font-medium">回答</th>
                  <th className="py-3 px-4 font-medium">正解</th>
                  <th className="py-3 px-4 font-medium">ヒント</th>
                  <th className="py-3 px-4 font-medium text-right">結果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {results.map((r, idx) => {
                  const isActive = idx === selectedIdx;
                  const label =
                    r.resolvedPlace?.placeName ||
                    r.resolvedPlace?.formattedAddress ||
                    `${r.location.lat.toFixed(2)}°, ${r.location.lng.toFixed(2)}°`;
                  const statusText =
                    r.matchQuality === 'exact'
                      ? '完全一致'
                      : r.matchQuality === 'group'
                        ? '大区分一致'
                        : '不正解';
                  const statusColor =
                    r.matchQuality === 'exact'
                      ? 'text-emerald-300'
                      : r.matchQuality === 'group'
                        ? 'text-amber-300'
                        : 'text-rose-300';

                  return (
                    <tr
                      key={r.location.id}
                      onClick={() => setSelectedIdx(idx)}
                      className={`cursor-pointer transition-colors ${
                        isActive ? 'bg-white/8' : 'hover:bg-white/4'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                        {r.roundNumber}
                      </td>
                      {mode === 'versus' && (
                        <td
                          className={`py-3 px-4 font-semibold whitespace-nowrap ${
                            r.playerIndex === 0 ? 'text-emerald-300' : 'text-sky-300'
                          }`}
                        >
                          {r.playerName}
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-100 font-medium max-w-[240px] truncate">
                        {label}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{r.guess}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-white">{r.correctCode}</span>{' '}
                        <span className="text-xs text-slate-400">
                          {KOPPEN_CLASSES[r.correctCode].shortNameJa}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                        {r.hintTierUsed > 0 ? `Lv.${r.hintTierUsed}` : 'なし'}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${statusColor}`}>
                        {mode !== 'endless'
                          ? `${statusText} · +${r.finalScore} pt`
                          : statusText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
