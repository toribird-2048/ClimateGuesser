import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  MinusCircle,
  XCircle,
} from 'lucide-react';
import { getGroupForCode, KOPPEN_CLASSES } from '../data/koppen.ts';
import type { GameMode, KoppenCode, QuestionFormat, RoundResult } from '../types/game.ts';
import {
  buildRevealKoppenGeoJson,
  KOPPEN_ZONE_COLORS,
  type KoppenZoneProperties,
} from '../utils/koppenMapLayer.ts';
import { Climograph } from './Climograph.tsx';
import { Hythergraph } from './Hythergraph.tsx';

const FORMAT_LABELS: Record<QuestionFormat, string> = {
  satellite: '衛星・OSM探索',
  blankMap: '白地図モード',
  hythergraph: 'ハイサーグラフモード',
};

interface RevealModalProps {
  result: RoundResult;
  mode: GameMode;
  questionFormat: QuestionFormat;
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
  questionFormat,
  isFinalStep,
  isPrefetchingNext,
  onContinue,
  onEndEndless,
  versusNames,
  versusScores,
  nextPlayerName,
}: RevealModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const koppenLayerRef = useRef<L.GeoJSON<KoppenZoneProperties> | null>(null);

  const [chartTab, setChartTab] = useState<'climograph' | 'hythergraph'>(() =>
    questionFormat === 'hythergraph' ? 'hythergraph' : 'climograph'
  );
  const [showKoppenOverlay, setShowKoppenOverlay] = useState<boolean>(true);
  const [overlayFilter, setOverlayFilter] = useState<'all' | 'focus'>('all');
  const [hoveredZone, setHoveredZone] = useState<{
    code: KoppenCode;
    rawCode: string;
  } | null>(null);

  const {
    location,
    guess,
    correctCode,
    matchQuality,
    finalScore,
    hintPenalty,
    resolvedPlace,
    playerName,
    playerIndex,
    timedOut,
  } = result;

  const correctInfo = KOPPEN_CLASSES[correctCode];
  const guessInfo = guess ? KOPPEN_CLASSES[guess] : null;
  const groupInfo = getGroupForCode(correctCode);
  const isScoredMode = mode !== 'endless';

  const displayPlace =
    resolvedPlace?.placeName ||
    resolvedPlace?.formattedAddress ||
    '地名を取得中...';

  // Mount full-labeled OpenStreetMap reveal map + Köppen climate zone overlay
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    let cancelled = false;
    const canvasRenderer = L.canvas({ padding: 0.5 });

    const map = L.map(el, {
      center: [location.lat, location.lng],
      zoom: 4,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: true,
      attributionControl: true,
      renderer: canvasRenderer,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const pinColor = KOPPEN_ZONE_COLORS[correctCode] ?? groupInfo.swatchHex;
    const pinIcon = L.divIcon({
      className: 'koppen-reveal-pin',
      html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-14px);">
        <div style="padding:3px 8px;border-radius:8px;background:${pinColor};color:#0B1120;font-weight:800;font-size:12px;font-family:Outfit,sans-serif;border:2px solid #0B1120;box-shadow:0 4px 12px rgba(0,0,0,0.45);white-space:nowrap;">${correctCode}</div>
        <div style="width:2px;height:10px;background:#0B1120;"></div>
        <div style="width:10px;height:10px;border-radius:9999px;background:${pinColor};border:2px solid #0B1120;"></div>
      </div>`,
      iconSize: [48, 44],
      iconAnchor: [24, 38],
    });

    L.marker([location.lat, location.lng], { icon: pinIcon, zIndexOffset: 1000 }).addTo(map);

    void buildRevealKoppenGeoJson(location.lat, location.lng, correctCode)
      .then((geojson) => {
        if (cancelled || !mapInstanceRef.current) return;

        const layer = L.geoJSON<KoppenZoneProperties>(geojson, {
          style: (feature) => {
            const code = feature?.properties?.code ?? 'Cfa';
            const fillColor = KOPPEN_ZONE_COLORS[code] ?? '#22C55E';
            const isCorrect = code === correctCode;
            const isGuess = guess !== null && code === guess;

            return {
              fillColor,
              fillOpacity: isCorrect ? 0.64 : isGuess ? 0.56 : 0.44,
              color: isCorrect ? '#FFFFFF' : isGuess ? '#FDE047' : fillColor,
              weight: isCorrect ? 1.5 : isGuess ? 1.2 : 0.4,
              opacity: isCorrect ? 0.9 : isGuess ? 0.85 : 0.55,
            };
          },
          onEachFeature: (feature, featureLayer) => {
            featureLayer.on({
              mouseover: () => {
                setHoveredZone({
                  code: feature.properties.code,
                  rawCode: feature.properties.rawCode,
                });
              },
              mouseout: () => {
                setHoveredZone((curr) =>
                  curr?.rawCode === feature.properties.rawCode ? null : curr
                );
              },
              click: () => {
                setHoveredZone({
                  code: feature.properties.code,
                  rawCode: feature.properties.rawCode,
                });
              },
            });
          },
        });

        koppenLayerRef.current = layer;
        layer.addTo(map);
      })
      .catch(() => {
        // Ignore overlay load error so base OSM map still works
      });

    const timer = setTimeout(() => map.invalidateSize(), 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      koppenLayerRef.current = null;
      mapInstanceRef.current = null;
      map.remove();
    };
  }, [location.id, location.lat, location.lng, correctCode, guess, groupInfo.swatchHex]);

  // Dynamically toggle overlay visibility and All vs Focus styling without remounting the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = koppenLayerRef.current;
    if (!map || !layer) return;

    if (!showKoppenOverlay) {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
      return;
    }

    if (!map.hasLayer(layer)) {
      layer.addTo(map);
    }

    layer.setStyle((feature) => {
      const code = feature?.properties?.code ?? 'Cfa';
      const fillColor = KOPPEN_ZONE_COLORS[code] ?? '#22C55E';
      const isCorrect = code === correctCode;
      const isGuess = guess !== null && code === guess;
      const isFocused = isCorrect || isGuess;

      if (overlayFilter === 'focus') {
        return {
          fillColor,
          fillOpacity: isCorrect ? 0.72 : isGuess ? 0.65 : 0.08,
          color: isCorrect ? '#FFFFFF' : isGuess ? '#FDE047' : fillColor,
          weight: isCorrect ? 1.8 : isGuess ? 1.4 : 0.2,
          opacity: isFocused ? 0.95 : 0.2,
        };
      }

      return {
        fillColor,
        fillOpacity: isCorrect ? 0.64 : isGuess ? 0.56 : 0.44,
        color: isCorrect ? '#FFFFFF' : isGuess ? '#FDE047' : fillColor,
        weight: isCorrect ? 1.5 : isGuess ? 1.2 : 0.4,
        opacity: isCorrect ? 0.9 : isGuess ? 0.85 : 0.55,
      };
    });
  }, [showKoppenOverlay, overlayFilter, correctCode, guess]);

  const verdictConfig =
    timedOut && !guessInfo
      ? {
          icon: Clock,
          title: '時間切れ（未回答）',
          subtitle:
            mode === 'endless'
              ? '制限時間内に回答できませんでした（連続記録はリセットされます）。'
              : '制限時間内に回答を選べませんでした。実際の気候データを確認しましょう。',
          colorClass: 'text-rose-300',
          bgClass: 'bg-rose-500/14',
        }
      : matchQuality === 'exact'
        ? {
            icon: CheckCircle2,
            title: timedOut ? '完全一致（時間切れ自動確定）' : '完全一致',
            subtitle: 'お見事！気候区分を正確に当てました。',
            colorClass: 'text-emerald-300',
            bgClass: 'bg-emerald-500/12',
          }
        : matchQuality === 'group'
          ? {
              icon: MinusCircle,
              title:
                mode === 'endless'
                  ? timedOut
                    ? '大区分一致（自動確定）'
                    : '大区分一致'
                  : timedOut
                    ? '大区分一致（部分点・自動確定）'
                    : '大区分一致（部分点）',
              subtitle:
                mode === 'endless'
                  ? `大区分「${groupInfo.group} ${groupInfo.nameJa}」が一致しました（連続記録はリセットされます）。`
                  : `大区分「${groupInfo.group} ${groupInfo.nameJa}」が一致し、部分点を獲得しました。`,
              colorClass: 'text-amber-300',
              bgClass: 'bg-amber-500/12',
            }
          : {
              icon: XCircle,
              title: timedOut ? '不正解（時間切れ自動確定）' : '不正解',
              subtitle:
                mode === 'endless'
                  ? '連続記録はリセットされました。そのまま次のラウンドへ進めます。'
                  : '実際の気候データと雨温図で判定根拠を確認しましょう。',
              colorClass: 'text-rose-300',
              bgClass: 'bg-rose-500/12',
            };

  const VerdictIcon = verdictConfig.icon;
  const answerLabel =
    mode === 'versus' && playerName ? `${playerName} の回答 → 正解` : 'あなたの回答 → 正解';

  const continueLabel = isFinalStep
    ? '最終結果を見る'
    : mode === 'versus' && nextPlayerName
      ? `${nextPlayerName} に交代して次へ`
      : '次のラウンドへ';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/82 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-verdict-title"
    >
      <div className="w-full max-w-5xl max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-3rem)] bg-[#0F172A] border border-white/12 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Pinned Verdict Header */}
        <div
          className={`shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 sm:gap-4 ${verdictConfig.bgClass}`}
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
              <div className="text-[11px] text-slate-400">{answerLabel}</div>
              <div
                className="text-base sm:text-lg font-bold tracking-tight flex items-center justify-end gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span className={guessInfo ? 'text-slate-300' : 'text-rose-300 text-sm font-sans'}>
                  {guessInfo ? guessInfo.code : '時間切れ'}
                </span>
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

            {isScoredMode && (
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

        {/* Pinned Versus Live Scoreboard Strip */}
        {mode === 'versus' && versusNames && versusScores && (
          <div className="shrink-0 px-4 sm:px-6 py-2 bg-slate-950/70 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span
                className={`inline-flex items-center gap-1.5 ${
                  playerIndex === 0 ? 'text-cyan-300 font-semibold' : 'text-slate-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400" aria-hidden="true" />
                <span className="font-sans">{versusNames[0]}</span>
                <span>{versusScores[0].toLocaleString()} pt</span>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                vs
              </span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  playerIndex === 1 ? 'text-violet-300 font-semibold' : 'text-slate-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-violet-400" aria-hidden="true" />
                <span className="font-sans">{versusNames[1]}</span>
                <span>{versusScores[1].toLocaleString()} pt</span>
              </span>
            </div>

            {!isFinalStep && nextPlayerName && (
              <span className="text-xs text-slate-300">
                次の手番: <strong className="text-white">{nextPlayerName}</strong>
              </span>
            )}
          </div>
        )}

        {/* Scrollable 2-Column Reveal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-white/10">
            {/* Left: Interactive OpenStreetMap + Köppen Climate Overlay Reveal Map & Place Info */}
            <div className="flex flex-col">
              <div className="relative w-full h-[230px] sm:h-[265px] lg:h-[310px] bg-slate-900">
                <div ref={mapContainerRef} className="w-full h-full z-0" />

                {/* Top-Right Köppen Climate Map Overlay Controls */}
                <div className="absolute top-2.5 right-2.5 z-[500] flex items-center gap-1.5">
                  {showKoppenOverlay && (
                    <div
                      className="inline-flex items-center bg-slate-950/88 backdrop-blur-md border border-white/15 rounded-lg p-0.5 shadow-lg"
                      role="group"
                      aria-label="気候マップ強調切替"
                    >
                      <button
                        type="button"
                        onClick={() => setOverlayFilter('all')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          overlayFilter === 'all'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        全区分
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlayFilter('focus')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          overlayFilter === 'focus'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        正解・回答のみ
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowKoppenOverlay((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold shadow-lg backdrop-blur-md inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showKoppenOverlay
                        ? 'bg-slate-950/88 border-emerald-400/50 text-emerald-300 hover:bg-slate-900'
                        : 'bg-slate-950/82 border-white/15 text-slate-300 hover:text-white'
                    }`}
                    aria-pressed={showKoppenOverlay}
                  >
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{showKoppenOverlay ? '気候図 ON' : '気候図 OFF'}</span>
                  </button>
                </div>

                {/* Bottom-Left Active / Hovered Climate Zone Legend Badge */}
                {showKoppenOverlay && (
                  <div className="absolute bottom-2.5 left-2.5 z-[500] max-w-[calc(100%-6rem)] bg-slate-950/88 backdrop-blur-md border border-white/15 rounded-lg px-2.5 py-1.5 shadow-lg text-[11px] text-slate-200 pointer-events-none">
                    {hoveredZone ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/40"
                          style={{
                            backgroundColor: KOPPEN_ZONE_COLORS[hoveredZone.code],
                          }}
                        />
                        <span className="font-mono font-bold text-white">
                          {hoveredZone.code}
                        </span>
                        <span className="truncate">
                          {KOPPEN_CLASSES[hoveredZone.code]?.shortNameJa}
                        </span>
                        {hoveredZone.rawCode !== hoveredZone.code && (
                          <span className="text-[10px] font-mono text-slate-400">
                            (細分:{hoveredZone.rawCode})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white"
                            style={{ backgroundColor: KOPPEN_ZONE_COLORS[correctCode] }}
                          />
                          <span>
                            正解: <strong className="font-mono text-white">{correctCode}</strong>
                          </span>
                        </span>
                        {guess && guess !== correctCode && (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0 border border-yellow-300"
                              style={{ backgroundColor: KOPPEN_ZONE_COLORS[guess] }}
                            />
                            <span>
                              回答: <strong className="font-mono text-amber-200">{guess}</strong>
                            </span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          ※色領域にカーソル/タップで区分表示
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
                    実測気候グラフ（2015–2024年平均）
                  </h3>
                  <div
                    className="inline-flex items-center gap-0.5 bg-slate-950/80 border border-white/10 rounded-lg p-0.5"
                    role="tablist"
                    aria-label="気候グラフ表示切替"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={chartTab === 'climograph'}
                      onClick={() => setChartTab('climograph')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        chartTab === 'climograph'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      雨温図
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={chartTab === 'hythergraph'}
                      onClick={() => setChartTab('hythergraph')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        chartTab === 'hythergraph'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ハイサーグラフ
                    </button>
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-white/8 rounded-xl p-3.5">
                  {chartTab === 'climograph' ? (
                    <Climograph
                      monthlyTempC={location.climate.monthlyTempC}
                      monthlyPrecipMm={location.climate.monthlyPrecipMm}
                      annualMeanTemp={location.climate.annualMeanTemp}
                      annualPrecip={location.climate.annualPrecip}
                    />
                  ) : (
                    <Hythergraph
                      monthlyTempC={location.climate.monthlyTempC}
                      monthlyPrecipMm={location.climate.monthlyPrecipMm}
                      annualMeanTemp={location.climate.annualMeanTemp}
                      annualPrecip={location.climate.annualPrecip}
                      compact={true}
                      showGuides={true}
                    />
                  )}
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
            </div>
          </div>
        </div>

        {/* Pinned Bottom Action Bar (always visible without scrolling on all screen sizes) */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-white/10 bg-[#0B1224]/95 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="hidden sm:block text-xs text-slate-400">
            {!isFinalStep && isPrefetchingNext
              ? '次の地点をバックグラウンドで準備中...'
              : `Round ${result.roundNumber} · ${FORMAT_LABELS[questionFormat]}`}
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {mode === 'endless' && onEndEndless && (
              <button
                type="button"
                onClick={onEndEndless}
                className="min-h-[44px] px-4 py-2.5 rounded-xl sm:rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                結果を見て終了
              </button>
            )}
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl sm:rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{continueLabel}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline text-xs font-mono opacity-75">Enter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
