import { useState } from 'react';
import { ArrowRight, BookOpen, Compass, Flame, Globe2, Layers, Users } from 'lucide-react';
import { KOPPEN_GROUPS } from '../data/koppen.ts';
import type { BestRecords, GameMode, VersusConfig } from '../types/game.ts';

interface TitleScreenProps {
  records: BestRecords;
  defaultVersusConfig: VersusConfig;
  onStartMode: (mode: GameMode, versusConfig?: VersusConfig) => void;
  onOpenReference: () => void;
}

export function TitleScreen({
  records,
  defaultVersusConfig,
  onStartMode,
  onOpenReference,
}: TitleScreenProps) {
  const [p1Name, setP1Name] = useState(defaultVersusConfig.playerNames[0]);
  const [p2Name, setP2Name] = useState(defaultVersusConfig.playerNames[1]);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState<3 | 5>(
    defaultVersusConfig.roundsPerPlayer
  );

  const handleStartVersus = () => {
    const cleanP1 = p1Name.trim() || 'プレイヤー1';
    const cleanP2 = p2Name.trim() || 'プレイヤー2';
    onStartMode('versus', {
      playerNames: [cleanP1, cleanP2],
      roundsPerPlayer,
    });
  };

  return (
    <div className="min-h-screen w-full atlas-grid-bg text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="w-full max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-8 border-b border-white/10">
        <span
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Köppen Guessr
        </span>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a
            href="#modes"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            ゲームモード
          </a>
          <a
            href="#classes"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            対象13区分
          </a>
          <button
            type="button"
            onClick={onOpenReference}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            早見表ガイド
          </button>
        </nav>

        <button
          type="button"
          onClick={() => onStartMode('standard5')}
          className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          5ラウンド開始
        </button>
      </header>

      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 sm:py-12 flex-1 flex flex-col justify-center space-y-10">
        {/* Hero Section */}
        <section className="max-w-3xl space-y-5">
          <div className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-2">
            <span>衛星写真（ラベルなし）</span>
            <span aria-hidden="true">·</span>
            <span>OpenStreetMap 地形切替</span>
            <span aria-hidden="true">·</span>
            <span>実測10年気候データ自動判定</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] [text-wrap:balance]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            上空の風景から、
            <br />
            ケッペン気候を見抜け。
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            世界のランダムな陸地を、地名ラベルなしの衛星写真と OpenStreetMap 地図で観察し、植生・砂漠・河川・耕作地・山岳・氷雪の手がかりから13種類のケッペン気候区分（高山気候Hを含む）を推理します。API キー不要ですぐに遊べます。
          </p>

          {/* Unboxed Personal Records Strip */}
          <div className="pt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-400 font-mono tabular-nums">
            <span>
              5ラウンド最高:{' '}
              <strong className="text-slate-100">
                {records.standard5BestScore.toLocaleString()} pt
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              最長連続正解:{' '}
              <strong className="text-slate-100">{records.endlessBestStreak} 連続</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              プレイ回数: <strong className="text-slate-100">{records.gamesPlayed}</strong>
            </span>
          </div>
        </section>

        {/* 3-Column Mode Selection Grid */}
        <section id="modes" className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* 5-Round Mode */}
          <div className="bg-[#0F172A]/85 border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Globe2 className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">ソロ・スタンダード</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  全5問 · 5,000点満点
                </span>
              </div>

              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                5ラウンドチャレンジ
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                世界各地の多様な気候帯から5地点を出題。完全一致で1,000pt、大区分一致で400ptを獲得。迷ったときは減点ありで気温・緯度帯・雨温図ヒントを開示できます。
              </p>
            </div>

            <button
              type="button"
              onClick={() => onStartMode('standard5')}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>5ラウンド制で遊ぶ</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Alternating 2-Player Versus Mode */}
          <div className="bg-[#0F172A]/85 border border-sky-400/25 rounded-2xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sky-300">
                  <Users className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">2人交代対戦</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  計 {roundsPerPlayer * 2} 問
                </span>
              </div>

              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                ターン交代バトル
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                2人が1問ずつ交互にプレイして合計スコアを競うローカル対戦。ヒントの使いどころも勝負の鍵です。
              </p>

              {/* Compact Player Name & Round Selector */}
              <div className="pt-1 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="p1-name"
                      className="block text-[11px] text-emerald-300 font-medium mb-1"
                    >
                      先攻（P1）
                    </label>
                    <input
                      id="p1-name"
                      type="text"
                      value={p1Name}
                      maxLength={14}
                      onChange={(e) => setP1Name(e.target.value)}
                      placeholder="プレイヤー1"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/75 border border-white/12 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="p2-name"
                      className="block text-[11px] text-sky-300 font-medium mb-1"
                    >
                      後攻（P2）
                    </label>
                    <input
                      id="p2-name"
                      type="text"
                      value={p2Name}
                      maxLength={14}
                      onChange={(e) => setP2Name(e.target.value)}
                      placeholder="プレイヤー2"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/75 border border-white/12 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-950/75 border border-white/10 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRoundsPerPlayer(3)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      roundsPerPlayer === 3
                        ? 'bg-sky-400 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    各3問（計6問）
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoundsPerPlayer(5)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      roundsPerPlayer === 5
                        ? 'bg-sky-400 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    各5問（計10問）
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartVersus}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-sky-400 hover:bg-sky-300 text-slate-950 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>対戦を開始する</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Endless Mode */}
          <div className="bg-[#0F172A]/85 border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-300">
                  <Flame className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-semibold">ソロ・エンドレス</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  無制限 · いつでも終了可
                </span>
              </div>

              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                エンドレスモード
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                正解・不正解に関係なく、何ラウンドでも続けて遊べる無限モード。連続正解記録や正答率を追いかけながら、ヒントも自由に使って好きなタイミングで結果を振り返れます。
              </p>
            </div>

            <button
              type="button"
              onClick={() => onStartMode('endless')}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-white/15 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>エンドレスに挑戦</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* 13 Target Köppen Classes Overview & Controls */}
        <section
          id="classes"
          className="pt-4 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-400">出題対象のケッペン13区分</div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm">
              {KOPPEN_GROUPS.map((g) => (
                <div key={g.group} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: g.swatchHex }}
                    aria-hidden="true"
                  />
                  <span className="text-slate-400">{g.nameJa}</span>
                  <span className="font-mono font-semibold text-slate-100">
                    {g.codes.join(' / ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
              <span>Sキー: 衛星 / OSM切替</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
              <span>Space: 初期地点へ戻る</span>
            </span>
            <button
              type="button"
              onClick={onOpenReference}
              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-medium cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>13区分の早見表を見る</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
