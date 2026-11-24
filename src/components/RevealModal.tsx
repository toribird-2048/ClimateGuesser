import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ArrowRight, CheckCircle2, MapPin, MinusCircle, XCircle } from 'lucide-react';
import { getGroupForCode, KOPPEN_CLASSES } from '../data/koppen.ts';
import type { GameMode, RoundResult } from '../types/game.ts';
import { Climograph } from './Climograph.tsx';

interface RevealModalProps {
  result: RoundResult;
  mode: GameMode;
  isFinalStep: boolean;
  isPrefetchingNext: boolean;
  onContinue: () => void;
  onEndEndless?: () => void;
  versusNames?: [string, string];
  versusScores?: [number, number];
  nextPlayerName?: string;
}

export function RevealModal({
  result,
  mode,
  isFinalStep,
  isPrefetchingNext,
  onContinue,
  onEndEndless,
  versusNames,
  versusScores,
  nextPlayerName,
}: RevealModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { location, guess, correctCode, matchQuality, finalScore, hintPenalty, resolvedPlace } =
    result;
  const correctInfo = KOPPEN_CLASSES[correctCode];
  const guessInfo = KOPPEN_CLASSES[guess];
  const groupInfo = getGroupForCode(correctCode);

  const displayPlace =
    resolvedPlace?.placeName ||
    resolvedPlace?.formattedAddress ||
    '地名を取得中...';

  // Mount full-labeled OpenStreetMap reveal map
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [location.lat, location.lng],
      zoom: 5,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'koppen-reveal-pin',
      html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-14px);">
        <div style="padding:3px 8px;border-radius:8px;background:${groupInfo.swatchHex};color:#0B1120;font-weight:800;font-size:12px;font-family:Outfit,sans-serif;border:2px solid #0B1120;box-shadow:0 4px 12px rgba(0,0,0,0.45);white-space:nowrap;">${correctCode}</div>
        <div style="width:2px;height:10px;background:#0B1120;"></div>
        <div style="width:10px;height:10px;border-radius:9999px;background:${groupInfo.swatchHex};border:2px solid #0B1120;"></div>
      </div>`,
      iconSize: [48, 44],
      iconAnchor: [24, 38],
    });

    L.marker([location.lat, location.lng], { icon: pinIcon }).addTo(map);

    const timer = setTimeout(() => map.invalidateSize(), 60);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, [location.id, location.lat, location.lng, correctCode, groupInfo.swatchHex]);

  const verdictConfig =
    matchQuality === 'exact'
      ? {
          icon: CheckCircle2,
          title: '完全一致',
          subtitle: 'お見事！気候区分を正確に当てました。',
          colorClass: 'text-emerald-300',
          bgClass: 'bg-emerald-500/12',
        }
      : matchQuality === 'group'
        ? {
            icon: MinusCircle,
            title: mode === 'endless' ? '大区分一致' : '大区分一致（部分点）',
            subtitle:
              mode === 'endless'
                ? `大区分「${groupInfo.group} ${groupInfo.nameJa}」が一致しました（連続記録はリセットされます）。`
                : `大区分「${groupInfo.group} ${groupInfo.nameJa}」が一致し、部分点を獲得しました。`,
            colorClass: 'text-amber-300',
            bgClass: 'bg-amber-500/12',
          }
        : {
            icon: XCircle,
            title: '不正解',
            subtitle:
              mode === 'endless'
                ? '連続記録はリセットされました。そのまま次のラウンドへ進めます。'
                : '実際の気候データと雨温図で判定根拠を確認しましょう。',
            colorClass: 'text-rose-300',
            bgClass: 'bg-rose-500/12',
          };

  const VerdictIcon = verdictConfig.icon;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/82 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-verdict-title"
    >
      <div className="w-full max-w-5xl bg-[#0F172A] border border-white/12 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Verdict Header */}
        <div
          className={`px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 ${verdictConfig.bgClass}`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <VerdictIcon
              className={`w-7 h-7 shrink-0 ${verdictConfig.colorClass}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="reveal-verdict-title"
                className={`text-lg sm:text-xl font-bold ${verdictConfig.colorClass}`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {verdictConfig.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">{verdictConfig.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-slate-400">
                {mode === 'versus' && result.playerName
                  ? `${result.playerName} の回答 → 正解`
                  : 'あなたの回答 → 正解'}
              </div>
              <div
                className="text-base sm:text-lg font-bold tracking-tight flex items-center justify-end gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span className="text-slate-300">{guessInfo.code}</span>
                <span className="text-slate-500" aria-hidden="true">
                  →
                </span>
                <span className="text-white">
                  {correctInfo.code}{' '}
                  <span className="text-xs font-sans font-medium text-slate-300">
                    {correctInfo.nameJa}
                  </span>
                </span>
              </div>
            </div>

            {mode !== 'endless' && (
              <div className="text-right pl-5 border-l border-white/10">
                <div className="text-[11px] text-slate-400">獲得スコア</div>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                  +{finalScore.toLocaleString()} pt
                </div>
                {hintPenalty > 0 && (
                  <div className="text-[11px] font-mono tabular-nums text-amber-300/80">
                    ヒント減点 -{hintPenalty} pt
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Versus Scoreboard Bar */}
        {mode === 'versus' && versusNames && versusScores && (
          <div className="px-6 py-2.5 border-b border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span
                className={
                  result.playerIndex === 0 ? 'text-emerald-300 font-semibold' : 'text-slate-300'
                }
              >
                P1 {versusNames[0]}: {versusScores[0].toLocaleString()} pt
              </span>
              <span className="text-slate-600" aria-hidden="true">
                vs
              </span>
              <span
                className={
                  result.playerIndex === 1 ? 'text-sky-300 font-semibold' : 'text-slate-300'
                }
              >
                P2 {versusNames[1]}: {versusScores[1].toLocaleString()} pt
              </span>
            </div>
            {!isFinalStep && nextPlayerName && (
              <span className="text-slate-400">
                次は <strong className="text-slate-100">{nextPlayerName}</strong> の番です
              </span>
            )}
          </div>
        )}

        {/* 2-Column Reveal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* Left: Interactive OpenStreetMap Reveal Map & Place Info */}
          <div className="flex flex-col">
            <div className="relative w-full h-[260px] lg:h-[310px] bg-slate-900">
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            </div>

            <div className="p-5 space-y-2 flex-1 bg-slate-950/35">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100 leading-snug">
                    {displayPlace}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-400 mt-1">
                    {location.lat >= 0
                      ? `北緯 ${location.lat.toFixed(3)}°`
                      : `南緯 ${Math.abs(location.lat).toFixed(3)}°`}{' '}
                    ·{' '}
                    {location.lng >= 0
                      ? `東経 ${location.lng.toFixed(3)}°`
                      : `西経 ${Math.abs(location.lng).toFixed(3)}°`}{' '}
                    · 標高 {location.climate.elevation.toLocaleString()} m
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-white/8">
                <span className="font-semibold text-slate-200">
                  {correctInfo.code}（{correctInfo.nameJa}）の特徴:{' '}
                </span>
                {correctInfo.landscapeClues}
              </p>
            </div>
          </div>

          {/* Right: Real Climograph & Scientific Decision Breakdown */}
          <div className="p-5 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    実測データに基づく雨温図（2015–2024年平均）
                  </h3>
                </div>
                <div className="bg-slate-950/60 border border-white/8 rounded-xl p-3.5">
                  <Climograph
                    monthlyTempC={location.climate.monthlyTempC}
                    monthlyPrecipMm={location.climate.monthlyPrecipMm}
                    annualMeanTemp={location.climate.annualMeanTemp}
                    annualPrecip={location.climate.annualPrecip}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">
                  ケッペン気候 判定ステップ
                </h4>
                <ol className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  {location.climate.reasonSteps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 bg-slate-900/60 border border-white/6 rounded-lg px-3 py-2"
                    >
                      <span className="font-mono text-emerald-400 font-semibold shrink-0">
                        {idx + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {!isFinalStep && isPrefetchingNext
                  ? '次の地点をバックグラウンドで準備中...'
                  : `Round ${result.roundNumber}`}
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {mode === 'endless' && onEndEndless && (
                  <button
                    type="button"
                    onClick={onEndEndless}
                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    結果を見て終了
                  </button>
                )}
                <button
                  type="button"
                  onClick={onContinue}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>
                    {isFinalStep
                      ? '最終結果を見る'
                      : mode === 'versus' && nextPlayerName
                        ? `${nextPlayerName} に交代して次へ`
                        : '次のラウンドへ'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline text-xs font-mono opacity-75">Enter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
