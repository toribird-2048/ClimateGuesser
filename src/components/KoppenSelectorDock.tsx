import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { KOPPEN_CLASSES, KOPPEN_GROUPS } from '../data/koppen.ts';
import type { KoppenCode, KoppenGroup } from '../types/game.ts';

interface KoppenSelectorDockProps {
  selectedCode: KoppenCode | null;
  onSelectCode: (code: KoppenCode) => void;
  onSubmitGuess: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  excludedCodes?: KoppenCode[];
  onGroupTap?: () => void;
}

const COMPACT_GROUP_SHORT_JA: Record<KoppenGroup, string> = {
  A: '熱帯',
  B: '乾燥',
  C: '温帯',
  D: '冷帯',
  E: '寒帯',
  H: '高山',
};

export function KoppenSelectorDock({
  selectedCode,
  onSelectCode,
  onSubmitGuess,
  isExpanded,
  onToggleExpanded,
  excludedCodes = [],
  onGroupTap,
}: KoppenSelectorDockProps) {
  const excludedKey = excludedCodes.join(',');
  const visibleGroups = useMemo(() => {
    const excludeSet = new Set(excludedCodes);
    return KOPPEN_GROUPS.map((group) => ({
      ...group,
      codes: group.codes.filter((code) => !excludeSet.has(code)),
    })).filter((group) => group.codes.length > 0);
  }, [excludedKey]);

  const excludeH = excludedCodes.includes('H');
  const totalCount = visibleGroups.reduce((sum, g) => sum + g.codes.length, 0);
  const selectedInfo = selectedCode ? KOPPEN_CLASSES[selectedCode] : null;
  const [activeCompactGroup, setActiveCompactGroup] = useState<KoppenGroup | null>(() =>
    selectedInfo ? selectedInfo.group : null
  );

  // Sync active compact group when selection changes or resets between rounds
  useEffect(() => {
    if (selectedCode) {
      setActiveCompactGroup(KOPPEN_CLASSES[selectedCode].group);
    } else {
      setActiveCompactGroup(null);
    }
  }, [selectedCode]);

  // Clear active compact group if it becomes excluded (e.g., switching to Hythergraph Mode)
  useEffect(() => {
    if (activeCompactGroup && !visibleGroups.some((g) => g.group === activeCompactGroup)) {
      setActiveCompactGroup(null);
    }
  }, [activeCompactGroup, visibleGroups]);

  const activeGroupInfo = activeCompactGroup
    ? visibleGroups.find((g) => g.group === activeCompactGroup) ?? null
    : null;

  const lastGroupLetter = visibleGroups[visibleGroups.length - 1]?.group ?? 'E';

  const handleCompactGroupClick = (group: (typeof visibleGroups)[number]) => {
    // Single-code group (Highland H) selects immediately in one tap
    if (group.codes.length === 1) {
      setActiveCompactGroup(group.group);
      onSelectCode(group.codes[0]);
      return;
    }

    onGroupTap?.();
    setActiveCompactGroup((prev) => (prev === group.group ? null : group.group));
  };

  return (
    <div className="w-full md:w-[390px] lg:w-[420px] bg-[#0F172A]/92 backdrop-blur-md border border-white/10 rounded-2xl md:rounded-xl shadow-2xl overflow-hidden text-slate-100">
      {/* Header / Mode Toggle */}
      <div className="flex items-center justify-between gap-2 px-3.5 sm:px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          {selectedInfo ? (
            <>
              <span
                className="w-2 h-2 rounded-[2px] shrink-0"
                style={{
                  backgroundColor:
                    visibleGroups.find((g) => g.group === selectedInfo.group)?.swatchHex ??
                    '#10B981',
                }}
                aria-hidden="true"
              />
              <span className="text-xs sm:text-sm font-semibold text-emerald-300 truncate">
                {selectedInfo.code} · {selectedInfo.nameJa}
              </span>
            </>
          ) : !isExpanded && activeGroupInfo ? (
            <>
              <span
                className="w-2 h-2 rounded-[2px] shrink-0"
                style={{ backgroundColor: activeGroupInfo.swatchHex }}
                aria-hidden="true"
              />
              <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                {activeGroupInfo.group} {activeGroupInfo.nameJa}
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap">· 小分類を選択</span>
            </>
          ) : (
            <>
              <span className="text-xs sm:text-sm font-semibold text-slate-100 whitespace-nowrap">
                ケッペン気候を選択
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {isExpanded ? `· ${totalCount}区分` : `· A〜${lastGroupLetter}`}
                {excludeH ? '（H除外）' : ''}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 inline-flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          aria-label={isExpanded ? '2段階タブ表示に折りたたむ' : '全区分一覧を展開する'}
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? '2段階' : '一覧'}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Expanded Full-List View */}
      {isExpanded ? (
        <>
          <div className="p-3.5 space-y-2.5 max-h-[min(48vh,calc(100vh-14.5rem))] overflow-y-auto">
            {visibleGroups.map((group) => (
              <div key={group.group} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-400 px-0.5">
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: group.swatchHex }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-slate-300">
                    {group.group} {group.nameJa}
                  </span>
                  <span className="text-slate-500">{group.nameEn}</span>
                </div>

                <div
                  className={`grid gap-1.5 ${
                    group.codes.length === 3
                      ? 'grid-cols-3'
                      : group.codes.length === 1
                        ? 'grid-cols-1'
                        : 'grid-cols-2'
                  }`}
                >
                  {group.codes.map((code) => {
                    const info = KOPPEN_CLASSES[code];
                    const isSelected = selectedCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => onSelectCode(code)}
                        className={`min-h-[46px] px-2.5 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                            : 'bg-slate-900/75 border-white/10 text-slate-200 hover:bg-slate-800/90 hover:border-white/25'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-baseline justify-between gap-1">
                          <span
                            className="text-sm font-bold tracking-tight"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {code}
                          </span>
                          {isSelected && (
                            <Check
                              className="w-3.5 h-3.5 text-emerald-300 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                          {info.shortNameJa}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/10 bg-slate-950/50">
            <button
              type="button"
              disabled={!selectedCode}
              onClick={onSubmitGuess}
              className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors duration-150 flex items-center justify-center gap-2 whitespace-nowrap ${
                selectedCode
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>
                {selectedInfo
                  ? `${selectedInfo.code}（${selectedInfo.shortNameJa}）で回答する`
                  : '気候区分を1つ選択してください'}
              </span>
              {selectedCode && (
                <span className="hidden sm:inline text-xs font-mono opacity-75">Enter</span>
              )}
            </button>
          </div>
        </>
      ) : (
        /* Collapsed Mobile-Friendly 2-Step Picker: Step 1 (A-E/H) -> Step 2 (Subclasses) -> Submit */
        <div className="p-2.5 space-y-2">
          {/* Step 2: Sub-classification tray expands directly above the steady major-group row */}
          {activeGroupInfo && activeGroupInfo.codes.length > 1 && (
            <div className="rounded-xl bg-slate-950/75 border border-white/10 p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: activeGroupInfo.swatchHex }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold">
                    {activeGroupInfo.group} {activeGroupInfo.nameJa}
                  </span>
                  <span className="text-slate-500">· 小分類をタップ</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCompactGroup(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="小分類を閉じる"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <div
                className={`grid gap-1.5 ${
                  activeGroupInfo.codes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                {activeGroupInfo.codes.map((code) => {
                  const info = KOPPEN_CLASSES[code];
                  const isSelected = selectedCode === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onSelectCode(code)}
                      className={`min-h-[50px] px-2.5 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                        isSelected
                          ? 'bg-emerald-500/22 border-emerald-400 text-white shadow-sm'
                          : 'bg-slate-900/90 border-white/10 text-slate-100 hover:bg-slate-800 hover:border-white/25'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span
                          className="text-sm font-bold tracking-tight"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {code}
                        </span>
                        {isSelected && (
                          <Check
                            className="w-3.5 h-3.5 text-emerald-300 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate leading-tight mt-0.5">
                        {info.shortNameJa}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Fixed-position Major Group Row (A B C D E [H]) for effortless thumb tapping */}
          <div
            className={`grid gap-1.5 ${
              visibleGroups.length === 5 ? 'grid-cols-5' : 'grid-cols-6'
            }`}
            role="group"
            aria-label="気候の大区分を選択"
          >
            {visibleGroups.map((group) => {
              const isOpenGroup = activeCompactGroup === group.group;
              const hasSelectedCode = selectedInfo?.group === group.group;
              return (
                <button
                  key={group.group}
                  type="button"
                  onClick={() => handleCompactGroupClick(group)}
                  aria-pressed={isOpenGroup || hasSelectedCode}
                  className={`min-h-[50px] px-1 py-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                    hasSelectedCode
                      ? 'bg-emerald-500/20 border-emerald-400 text-white'
                      : isOpenGroup
                        ? 'bg-slate-800 border-white/35 text-white'
                        : 'bg-slate-900/80 border-white/10 text-slate-200 hover:bg-slate-800/90 hover:border-white/25'
                  }`}
                >
                  <span
                    className="w-4 h-[3px] rounded-full shrink-0"
                    style={{ backgroundColor: group.swatchHex }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-base font-bold leading-none tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {group.group}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-none whitespace-nowrap">
                    {COMPACT_GROUP_SHORT_JA[group.group]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary Submit CTA appears immediately once a climate class is picked */}
          {selectedInfo && (
            <button
              type="button"
              onClick={onSubmitGuess}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span>
                {selectedInfo.code}（{selectedInfo.shortNameJa}）で回答する
              </span>
              <span className="hidden sm:inline text-xs font-mono opacity-75">Enter</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
