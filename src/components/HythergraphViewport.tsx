import type { HintTier, RoundLocation } from '../types/game.ts';
import { Hythergraph } from './Hythergraph.tsx';

interface HythergraphViewportProps {
  location: RoundLocation;
  unlockedHintTier: HintTier;
}

export function HythergraphViewport({
  location,
  unlockedHintTier,
}: HythergraphViewportProps) {
  const { climate } = location;
  const showGuides = unlockedHintTier >= 1;
  const showSummaryStats = unlockedHintTier >= 3;

  return (
    <div className="w-full h-full atlas-grid-bg overflow-y-auto flex items-start sm:items-center justify-center pt-20 pb-44 md:pb-12 px-4 sm:px-8 lg:pr-[464px]">
      <div className="w-full max-w-[700px] bg-[#0F172A]/92 border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h2
              className="text-lg sm:text-xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ハイサーグラフ判別
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              横軸（月降水量）と縦軸（月平均気温）の12ヶ月軌跡から気候区分を推理してください
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap">
            {showGuides ? (
              <span className="text-amber-300 font-semibold">基準線ガイド表示中</span>
            ) : (
              <span>12区分 · 高山H除外</span>
            )}
          </div>
        </div>

        <Hythergraph
          monthlyTempC={climate.monthlyTempC}
          monthlyPrecipMm={climate.monthlyPrecipMm}
          annualMeanTemp={climate.annualMeanTemp}
          annualPrecip={climate.annualPrecip}
          showGuides={showGuides}
          hideSummaryStats={!showSummaryStats}
        />
      </div>
    </div>
  );
}
