import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { KOPPEN_CLASSES, KOPPEN_GROUPS } from '../data/koppen.ts';
import type { KoppenCode } from '../types/game.ts';

interface KoppenSelectorDockProps {
  selectedCode: KoppenCode | null;
  onSelectCode: (code: KoppenCode) => void;
  onSubmitGuess: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  excludedCodes?: KoppenCode[];
}

export function KoppenSelectorDock({
  selectedCode,
  onSelectCode,
  onSubmitGuess,
  isExpanded,
  onToggleExpanded,
  excludedCodes = [],
}: KoppenSelectorDockProps) {
  const excludeSet = new Set(excludedCodes);
  const visibleGroups = KOPPEN_GROUPS.map((group) => ({
    ...group,
    codes: group.codes.filter((code) => !excludeSet.has(code)),
  })).filter((group) => group.codes.length > 0);
  const totalCount = visibleGroups.reduce((sum, g) => sum + g.codes.length, 0);
  const selectedInfo = selectedCode ? KOPPEN_CLASSES[selectedCode] : null;

  return (
    <div className="w-[min(320px,calc(100vw-2rem))] md:w-[370px] lg:w-[420px] bg-[#0F172A]/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden text-slate-100">
      {/* Header / Collapse Toggle */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-100 whitespace-nowrap">
            ケッペン気候を選択
          </span>
          {selectedInfo ? (
            <span className="text-xs text-emerald-300 font-medium truncate">
              · {selectedInfo.code} {selectedInfo.nameJa}
            </span>
          ) : (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              · {totalCount}区分{excludeSet.has('H') ? '（H除外）' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          aria-label={isExpanded ? '回答パネルを折りたたむ' : '回答パネルを展開する'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-2.5 max-h-[min(50vh,calc(100vh-14.5rem))] overflow-y-auto">
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
                      className={`min-h-[46px] px-2.5 py-2 rounded-lg border text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
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
                          <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
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
      )}

      {/* Primary Submit Bar */}
      <div className="p-3 border-t border-white/10 bg-slate-950/50">
        <button
          type="button"
          disabled={!selectedCode}
          onClick={onSubmitGuess}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap ${
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
    </div>
  );
}
