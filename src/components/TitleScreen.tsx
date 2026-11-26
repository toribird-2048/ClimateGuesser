import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Compass,
  Flame,
  Globe2,
  Layers,
  Map as MapIcon,
  Satellite,
  Timer,
  Users,
} from 'lucide-react';
import { KOPPEN_GROUPS } from '../data/koppen.ts';
import type {
  BestRecords,
  GameMode,
  QuestionFormat,
  TimeLimitOption,
  VersusConfig,
} from '../types/game.ts';
import { getRecordsForFormat } from '../utils/storage.ts';

const TIME_LIMIT_OPTIONS: { value: TimeLimitOption; label: string }[] = [
  { value: 0, label: '制限なし' },
  { value: 30, label: '30秒' },
  { value: 60, label: '60秒' },
  { value: 90, label: '90秒' },
  { value: 120, label: '2分' },
];

const FORMAT_OPTIONS: {
  value: QuestionFormat;
  title: string;
  shortTag: string;
  description: string;
  icon: typeof Satellite;
}[] = [
  {
    value: 'satellite',
    title: '衛星・OSM探索',
    shortTag: '14区分 · 風景推理',
    description: '地名ラベルなしの衛星写真とOSM地図で植生・地形・街並みから推理',
    icon: Satellite,
  },
  {
    value: 'blankMap',
    title: '白地図モード',
    shortTag: '14区分 · 地理分布暗記',
    description: '陸地輪郭と国境線のみの白地図に打たれたピンの位置から気候を推理',
    icon: MapIcon,
  },
  {
    value: 'hythergraph',
    title: 'ハイサーグラフモード',
    shortTag: '13区分（H除外）· グラフ判別',
    description: '月降水量×月平均気温の12ヶ月閉曲線グラフのみから気候区分を判別',
    icon: Activity,
  },
];

interface TitleScreenProps {
  records: BestRecords;
  initialQuestionFormat: QuestionFormat;
  initialVersusConfig: VersusConfig;
  initialTimeLimit: TimeLimitOption;
  onPreferencesChange?: (prefs: {
    questionFormat: QuestionFormat;
    timeLimitSec: TimeLimitOption;
    versusConfig: VersusConfig;
  }) => void;
  onStartMode: (
    mode: GameMode,
    options: {
      questionFormat: QuestionFormat;
      timeLimitSec: TimeLimitOption;
      versusConfig?: VersusConfig;
    }
  ) => void;
  onOpenReference: () => void;
}

export function TitleScreen({
  records,
  initialQuestionFormat,
  initialVersusConfig,
  initialTimeLimit,
  onPreferencesChange,
  onStartMode,
  onOpenReference,
}: TitleScreenProps) {
  const [questionFormat, setQuestionFormat] = useState<QuestionFormat>(initialQuestionFormat);
  const [timeLimitSec, setTimeLimitSec] = useState<TimeLimitOption>(initialTimeLimit);
  const [p1Name, setP1Name] = useState(initialVersusConfig.playerNames[0]);
  const [p2Name, setP2Name] = useState(initialVersusConfig.playerNames[1]);
  const [roundsPerPlayer, setRoundsPerPlayer] = useState<3 | 5>(
    initialVersusConfig.roundsPerPlayer
  );

  useEffect(() => {
    onPreferencesChange?.({
      questionFormat,
      timeLimitSec,
      versusConfig: {
        playerNames: [p1Name.trim() || 'プレイヤー1', p2Name.trim() || 'プレイヤー2'],
        roundsPerPlayer,
      },
    });
  }, [questionFormat, timeLimitSec, p1Name, p2Name, roundsPerPlayer, onPreferencesChange]);

  const formatRecords = getRecordsForFormat(records, questionFormat);
  const activeFormatMeta = FORMAT_OPTIONS.find((f) => f.value === questionFormat)!;
  const visibleGroups =
    questionFormat === 'hythergraph'
      ? KOPPEN_GROUPS.filter((g) => g.group !== 'H')
      : KOPPEN_GROUPS;
  const classCount = questionFormat === 'hythergraph' ? 13 : 14;

  const handleStartVersus = () => {
    const cleanP1 = p1Name.trim() || 'プレイヤー1';
    const cleanP2 = p2Name.trim() || 'プレイヤー2';
    onStartMode('versus', {
      questionFormat,
      timeLimitSec,
      versusConfig: {
        playerNames: [cleanP1, cleanP2],
        roundsPerPlayer,
      },
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
            出題・モード
          </a>
          <a
            href="#classes"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            対象気候区分
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
          onClick={() => onStartMode('standard5', { questionFormat, timeLimitSec })}
          className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          5ラウンド開始
        </button>
      </header>

      <main className="w-full max-w-[1200px] mx-auto px-6 py-8 sm:py-10 flex-1 flex flex-col justify-center space-y-8">
        {/* Hero Section */}
        <section className="max-w-3xl space-y-4">
          <div className="text-xs sm:text-sm text-slate-400 flex flex-wrap items-center gap-2">
            <span>衛星・OSM探索</span>
            <span aria-hidden="true">·</span>
            <span>白地図ポジション暗記</span>
            <span aria-hidden="true">·</span>
            <span>ハイサーグラフ判別</span>
            <span aria-hidden="true">·</span>
            <span>実測気候データ自動判定</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] [text-wrap:balance]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            風景・白地図・グラフから、
            <br />
            ケッペン気候を見抜け。
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            実測の長期気候データをもとに、衛星写真、地名なしの白地図、ハイサーグラフの3つの出題形式でケッペン気候区分を推理できます。5ラウンド制・エンドレス・2人交代対戦と制限時間を自由に組み合わせて遊べます。
          </p>

          {/* Unboxed Personal Records Strip (scoped to currently selected question format) */}
          <div className="pt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-400 font-mono tabular-nums">
            <span className="font-sans text-emerald-300 font-medium">
              {activeFormatMeta.title}の記録
            </span>
            <span aria-hidden="true">·</span>
            <span>
              5ラウンド最高:{' '}
              <strong className="text-slate-100">
                {formatRecords.standard5BestScore.toLocaleString()} pt
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              最長連続正解:{' '}
              <strong className="text-slate-100">{formatRecords.endlessBestStreak} 連続</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              プレイ回数: <strong className="text-slate-100">{formatRecords.gamesPlayed}</strong>
            </span>
          </div>
        </section>

        {/* Format Selector + Time Limit Bar + 3-Mode Grid */}
        <section id="modes" className="space-y-4">
          {/* Step 1: Question Format Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
              <span className="font-semibold text-slate-200">1. 出題形式を選ぶ</span>
              <span>全ルール（5問・エンドレス・2人対戦）に対応</span>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
              role="radiogroup"
              aria-label="出題形式"
            >
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = questionFormat === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setQuestionFormat(opt.value)}
                    className={`text-left rounded-xl p-4 border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                      active
                        ? 'bg-emerald-500/12 border-emerald-400/70 shadow-lg'
                        : 'bg-[#0F172A]/85 border-white/10 hover:border-white/25 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center gap-2 text-sm font-bold whitespace-nowrap ${
                          active ? 'text-white' : 'text-slate-200'
                        }`}
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-emerald-300' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                        {opt.title}
                      </span>
                      <span
                        className={`text-[11px] font-mono tabular-nums whitespace-nowrap ${
                          active ? 'text-emerald-300' : 'text-slate-500'
                        }`}
                      >
                        {opt.shortTag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Global Round Time Limit Selector */}
          <div className="bg-[#0F172A]/85 border border-white/10 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Timer className="w-4 h-4 text-sky-300 shrink-0" aria-hidden="true" />
              <div className="text-xs sm:text-sm">
                <span className="font-semibold text-slate-100">2. 1ラウンドの制限時間</span>
                <span className="text-slate-400 ml-2 hidden md:inline">
                  全モード共通 · 時間切れ時は選択中なら自動確定
                </span>
              </div>
            </div>

            <div
              className="grid grid-cols-5 sm:flex items-center gap-1 bg-slate-950/75 border border-white/10 rounded-lg p-1"
              role="radiogroup"
              aria-label="1ラウンドの制限時間"
            >
              {TIME_LIMIT_OPTIONS.map((opt) => {
                const active = timeLimitSec === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTimeLimitSec(opt.value)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold font-mono tabular-nums transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:text-white hover:bg-white/6'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: 3 Game Mode Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {/* 5-Round Mode */}
            <div className="bg-[#0F172A]/85 border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Globe2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-semibold">スタンダード</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    全5問 · 5,000点満点
                  </span>
                </div>

                <h2
                  className="text-xl sm:text-2xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  5ラウンドチャレンジ
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  選択中の「{activeFormatMeta.title}」で5問に挑戦。完全一致で1,000pt、大区分一致で400ptを獲得。迷ったときは減点ありで3段階ヒントを開示できます。
                </p>
              </div>

              <button
                type="button"
                onClick={() => onStartMode('standard5', { questionFormat, timeLimitSec })}
                className="w-full py-3 px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>5ラウンド制で遊ぶ</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Endless Mode */}
            <div className="bg-[#0F172A]/85 border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Flame className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-semibold">エンドレス</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    無制限 · いつでも終了可
                  </span>
                </div>

                <h2
                  className="text-xl sm:text-2xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  エンドレスモード
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  正解・不正解に関係なく何問でも続けて反復練習できる無限モード。白地図での分布暗記やハイサーグラフの特訓に最適です。ヒントも減点なしで利用できます。
                </p>
              </div>

              <button
                type="button"
                onClick={() => onStartMode('endless', { questionFormat, timeLimitSec })}
                className="w-full py-3 px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-white/15 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>エンドレスに挑戦</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* 2-Player Alternating Versus Mode */}
            <div className="bg-[#0F172A]/85 border border-cyan-400/25 rounded-2xl p-6 flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Users className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-semibold">2人交代対戦</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    各{roundsPerPlayer}問 · 計{roundsPerPlayer * 2}問
                  </span>
                </div>

                <h2
                  className="text-xl sm:text-2xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  ターン交代バトル
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  1台の画面で交互に回答して合計スコアを競う対戦モード。白地図バトルやハイサーグラフ対決にも対応します。
                </p>

                {/* Inline Player Name Inputs & Round Toggle */}
                <div className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-cyan-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" aria-hidden="true" />
                        P1 名前
                      </span>
                      <input
                        type="text"
                        value={p1Name}
                        onChange={(e) => setP1Name(e.target.value)}
                        maxLength={14}
                        placeholder="プレイヤー1"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/12 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/70"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-violet-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-400" aria-hidden="true" />
                        P2 名前
                      </span>
                      <input
                        type="text"
                        value={p2Name}
                        onChange={(e) => setP2Name(e.target.value)}
                        maxLength={14}
                        placeholder="プレイヤー2"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/12 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400/70"
                      />
                    </label>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-1.5 bg-slate-950/75 border border-white/10 rounded-lg p-1"
                    role="group"
                    aria-label="1人あたりの問題数"
                  >
                    <button
                      type="button"
                      onClick={() => setRoundsPerPlayer(3)}
                      aria-pressed={roundsPerPlayer === 3}
                      className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        roundsPerPlayer === 3
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      各3問（計6問）
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoundsPerPlayer(5)}
                      aria-pressed={roundsPerPlayer === 5}
                      className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        roundsPerPlayer === 5
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
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
                className="w-full py-3 px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>2人対戦を始める</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* Target Köppen Classes Overview & Controls */}
        <section
          id="classes"
          className="pt-4 border-t border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-400">
              出題対象のケッペン{classCount}区分
              {questionFormat === 'hythergraph' ? '（ハイサーグラフでは高山気候Hを除外）' : ''}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm">
              {visibleGroups.map((g) => (
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
            {questionFormat === 'satellite' && (
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                <span>Sキー: 衛星 / OSM切替</span>
              </span>
            )}
            {questionFormat === 'blankMap' && (
              <span className="inline-flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                <span>Space: 世界全体 / Z: ピンへズーム</span>
              </span>
            )}
            {questionFormat === 'satellite' && (
              <span className="inline-flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                <span>Space: 初期地点へ戻る</span>
              </span>
            )}
            <button
              type="button"
              onClick={onOpenReference}
              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-medium cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>14区分の早見表を見る</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
