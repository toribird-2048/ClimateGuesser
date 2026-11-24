import { X } from 'lucide-react';
import { KOPPEN_CLASSES, KOPPEN_GROUPS } from '../data/koppen.ts';

interface KoppenReferenceModalProps {
  onClose: () => void;
}

export function KoppenReferenceModal({ onClose }: KoppenReferenceModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="koppen-ref-title"
    >
      <div className="w-full max-w-4xl max-h-[86vh] bg-[#0F172A] border border-white/12 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10">
          <div>
            <h2
              id="koppen-ref-title"
              className="text-lg font-bold text-slate-100"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ケッペン気候区分 早見表（全13区分）
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              出題対象の13区分（高山気候Hを含む）と、衛星写真・OpenStreetMap で注目すべき景観の手がかり
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {KOPPEN_GROUPS.map((group) => (
            <section key={group.group} className="space-y-2.5">
              <div className="flex items-center gap-2.5 pb-1.5 border-b border-white/8">
                <span
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{ backgroundColor: group.swatchHex }}
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-slate-100">
                  {group.group} · {group.nameJa}（{group.nameEn}）
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.codes.map((code) => {
                  const info = KOPPEN_CLASSES[code];
                  return (
                    <div
                      key={code}
                      className="bg-slate-900/70 border border-white/8 rounded-xl p-3.5 space-y-1.5"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-base font-bold text-white"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {info.code}
                          </span>
                          <span className="text-sm font-semibold text-slate-200">
                            {info.nameJa}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-slate-400 tabular-nums">
                        {info.criteriaSummary}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {info.landscapeClues}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
