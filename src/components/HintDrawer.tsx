import { ChevronDown, ChevronUp, Lightbulb, Lock, Unlock } from 'lucide-react';
import { getLatitudeBandJa } from '../data/koppen.ts';
import type { GameMode, HintTier, QuestionFormat, RoundLocation } from '../types/game.ts';
import { Climograph } from './Climograph.tsx';

export const STANDARD_HINT_PENALTIES: Record<HintTier, number> = {
  0: 0,
  1: 150,
  2: 250,
  3: 400,
};

interface HintDrawerProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  location: RoundLocation;
  mode: GameMode;
  questionFormat: QuestionFormat;
  unlockedTier: HintTier;
  onUnlockNextHint: () => void;
}

export function HintDrawer({
  isOpen,
  onToggleOpen,
  location,
  mode,
  questionFormat,
  unlockedTier,
  onUnlockNextHint,
}: HintDrawerProps) {
  const latInfo = getLatitudeBandJa(location.lat);
  const { climate } = location;
  const isHythergraph = questionFormat === 'hythergraph';
  const minPrecip = Math.min(...climate.monthlyPrecipMm);

  const nextTier = (unlockedTier + 1) as HintTier;
  const canUnlockMore = unlockedTier < 3;
  const isScoredMode = mode !== 'endless';

  const nextHintLabel = isHythergraph
    ? nextTier === 1
      ? 'ヒント1を開示（基準線ガイド表示）'
      : nextTier === 2
        ? 'ヒント2を開示（半球・緯度帯）'
        : 'ヒント3を開示（判定用サマリー数値）'
    : nextTier === 1
      ? 'ヒント1を開示（気温・降水量）'
      : nextTier === 2
        ? 'ヒント2を開示（緯度帯・標高）'
        : 'ヒント3を開示（雨温図グラフ）';

  const nextCostLabel = isScoredMode
    ? `-${STANDARD_HINT_PENALTIES[nextTier] - STANDARD_HINT_PENALTIES[unlockedTier]} pt`
    : '減点なし';

  return (
    <div
      className={`${
        isOpen ? 'w-[min(356px,calc(100vw-2rem))]' : 'w-auto'
      } bg-[#0F172A]/88 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden text-slate-100 transition-[width] duration-150`}
    >
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-100 whitespace-nowrap">
            任意ヒント
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
            {unlockedTier}/3
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
          <span className="hidden sm:inline font-mono">H</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-white/10 space-y-3 max-h-[60vh] overflow-y-auto">
          {isHythergraph ? (
            <>
              {/* Hythergraph Tier 1: Köppen Threshold Guide Overlay */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    {unlockedTier >= 1 ? (
                      <Unlock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    1. ケッペン判定基準線ガイド
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {isScoredMode ? '-150 pt' : '自由利用'}
                  </span>
                </div>
                {unlockedTier >= 1 ? (
                  <div className="bg-slate-950/60 border border-white/8 rounded-lg px-3 py-2 text-xs space-y-1 text-slate-200">
                    <div className="font-medium text-amber-300">
                      グラフ上に基準線をオーバーレイ表示中
                    </div>
                    <div className="text-slate-400 font-mono tabular-nums leading-relaxed">
                      気温: 18℃(A) · 10℃(E) · 0℃(EF) · -3℃(C/D)
                      <br />
                      降水: 60mm(Af最少雨月基準)
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    未開示 — グラフに 18℃ / 10℃ / 0℃ / -3℃ / 60mm の基準線を重ねて表示します
                  </p>
                )}
              </div>

              {/* Hythergraph Tier 2: Hemisphere & Latitude Band */}
              <div className="pt-2 border-t border-white/8">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    {unlockedTier >= 2 ? (
                      <Unlock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    2. 半球と緯度帯
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {isScoredMode ? '累計 -250 pt' : '自由利用'}
                  </span>
                </div>
                {unlockedTier >= 2 ? (
                  <div className="bg-slate-950/60 border border-white/8 rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="text-slate-100 font-medium">
                      {latInfo.hemisphere} · {latInfo.band}
                    </div>
                    <div className="text-slate-400 font-mono tabular-nums">
                      {latInfo.detail} / 標高 約 {climate.elevation.toLocaleString()} m
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    未開示 — 北半球・南半球の区別と緯度帯を確認できます
                  </p>
                )}
              </div>

              {/* Hythergraph Tier 3: Classification Summary Numbers */}
              <div className="pt-2 border-t border-white/8">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    {unlockedTier >= 3 ? (
                      <Unlock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    3. 判定用サマリー数値
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {isScoredMode ? '累計 -400 pt' : '自由利用'}
                  </span>
                </div>
                {unlockedTier >= 3 ? (
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-white/8 rounded-lg p-2.5 text-xs">
                    <div>
                      <div className="text-slate-400">最暖月（{climate.warmestMonth}月）</div>
                      <div className="font-mono tabular-nums text-sm font-semibold text-rose-300">
                        {climate.maxTemp.toFixed(1)} ℃
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">最寒月（{climate.coldestMonth}月）</div>
                      <div className="font-mono tabular-nums text-sm font-semibold text-sky-300">
                        {climate.minTemp.toFixed(1)} ℃
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">年平均気温</div>
                      <div className="font-mono tabular-nums text-slate-100 font-medium">
                        {climate.annualMeanTemp.toFixed(1)} ℃
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">年降水量</div>
                      <div className="font-mono tabular-nums text-slate-100 font-medium">
                        {climate.annualPrecip.toLocaleString()} mm
                      </div>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-white/8 flex items-center justify-between">
                      <span className="text-slate-400">最少雨月降水量</span>
                      <span className="font-mono tabular-nums text-amber-300 font-semibold">
                        {minPrecip} mm
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    未開示 — 年平均気温・年降水量・最暖月／最寒月・最少雨月の正確な値を確認できます
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Standard / Blank Map Tier 1: Warmest/Coldest Temp & Annual Precip */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    {unlockedTier >= 1 ? (
                      <Unlock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    1. 気温・降水量サマリー
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {isScoredMode ? '-150 pt' : '自由利用'}
                  </span>
                </div>
                {unlockedTier >= 1 ? (
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-white/8 rounded-lg p-2.5 text-xs">
                    <div>
                      <div className="text-slate-400">最暖月（{climate.warmestMonth}月）</div>
                      <div className="font-mono tabular-nums text-sm font-semibold text-rose-300">
                        {climate.maxTemp.toFixed(1)} ℃
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">最寒月（{climate.coldestMonth}月）</div>
                      <div className="font-mono tabular-nums text-sm font-semibold text-sky-300">
                        {climate.minTemp.toFixed(1)} ℃
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">年平均気温</div>
                      <div className="font-mono tabular-nums text-slate-100 font-medium">
                        {climate.annualMeanTemp.toFixed(1)} ℃
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">年降水量</div>
                      <div className="font-mono tabular-nums text-slate-100 font-medium">
                        {climate.annualPrecip.toLocaleString()} mm
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    未開示 — 最暖月・最寒月気温と年降水量を確認できます
                  </p>
                )}
              </div>

              {/* Tier 2: Latitude band & Elevation */}
              <div className="pt-2 border-t border-white/8">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    {unlockedTier >= 2 ? (
                      <Unlock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    2. 緯度帯と標高
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {isScoredMode ? '累計 -250 pt' : '自由利用'}
                  </span>
                </div>
                {unlockedTier >= 2 ? (
                  <div className="bg-slate-950/60 border border-white/8 rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="text-slate-100 font-medium">
                      {latInfo.hemisphere} · {latInfo.band}
                    </div>
                    <div className="text-slate-400 font-mono tabular-nums">
                      {latInfo.detail} / 標高 約 {climate.elevation.toLocaleString()} m
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    未開示 — 半球・緯度帯・標高を確認できます
                  </p>
                )}
              </div>

              {/* Tier 3: Full 12-month Climograph */}
              <div className="pt-2 border-t border-white/8">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                    {unlockedTier >= 3 ? (
                      <Unlock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    )}
                    3. 実測雨温図（12ヶ月）
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {isScoredMode ? '累計 -400 pt' : '自由利用'}
                  </span>
                </div>
                {unlockedTier >= 3 ? (
                  <div className="bg-slate-950/70 border border-white/8 rounded-lg p-2.5">
                    <Climograph
                      monthlyTempC={climate.monthlyTempC}
                      monthlyPrecipMm={climate.monthlyPrecipMm}
                      annualMeanTemp={climate.annualMeanTemp}
                      annualPrecip={climate.annualPrecip}
                      compact={true}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    未開示 — 月別気温と降水量のグラフを表示します
                  </p>
                )}
              </div>
            </>
          )}

          {/* Unlock Action Button */}
          {unlockedTier < 3 && (
            <button
              type="button"
              onClick={onUnlockNextHint}
              disabled={!canUnlockMore}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-colors whitespace-nowrap ${
                canUnlockMore
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/35 cursor-pointer'
                  : 'bg-slate-800/70 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              <span className="truncate">
                {canUnlockMore ? nextHintLabel : 'ヒントトークンを使い切りました'}
              </span>
              {canUnlockMore && (
                <span className="font-mono tabular-nums shrink-0 text-amber-300">
                  {nextCostLabel}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
