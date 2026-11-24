import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Flame,
  Home,
  Loader2,
  Map as MapIcon,
  RotateCcw,
  Satellite,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { KOPPEN_CLASSES } from './data/koppen.ts';
import { discoverRandomRound, fetchReverseGeocode } from './services/roundDiscovery.ts';
import type {
  BestRecords,
  GameMode,
  GamePhase,
  HintTier,
  KoppenCode,
  MatchQuality,
  RoundLocation,
  RoundResult,
  VersusConfig,
  ViewMode,
} from './types/game.ts';
import {
  playClickSound,
  playExactMatchSound,
  playGroupMatchSound,
  playHintSound,
  playMissSound,
} from './utils/sound.ts';
import { loadBestRecords, saveBestRecords } from './utils/storage.ts';
import { ExplorationViewport } from './components/ExplorationViewport.tsx';
import { HintDrawer, STANDARD_HINT_PENALTIES } from './components/HintDrawer.tsx';
import { KoppenReferenceModal } from './components/KoppenReferenceModal.tsx';
import { KoppenSelectorDock } from './components/KoppenSelectorDock.tsx';
import { RevealModal } from './components/RevealModal.tsx';
import { SummaryScreen } from './components/SummaryScreen.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';

const STANDARD_ROUNDS = 5;

const DEFAULT_VERSUS_CONFIG: VersusConfig = {
  playerNames: ['プレイヤー1', 'プレイヤー2'],
  roundsPerPlayer: 5,
};

export default function App() {
  const prefetchPromiseRef = useRef<Promise<RoundLocation | null> | null>(null);
  const prefetchedRoundRef = useRef<RoundLocation | null>(null);
  const usedCoordKeysRef = useRef<Set<string>>(new Set());
  const usedCodesRef = useRef<KoppenCode[]>([]);

  const [records, setRecords] = useState<BestRecords>(() => loadBestRecords());
  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [mode, setMode] = useState<GameMode>('standard5');
  const [versusConfig, setVersusConfig] = useState<VersusConfig>(DEFAULT_VERSUS_CONFIG);
  const [versusScores, setVersusScores] = useState<[number, number]>([0, 0]);
  const [viewMode, setViewMode] = useState<ViewMode>('satellite');
  const [muted, setMuted] = useState(false);

  const [currentRoundNumber, setCurrentRoundNumber] = useState(1);
  const [currentLocation, setCurrentLocation] = useState<RoundLocation | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<KoppenCode | null>(null);
  const [unlockedHintTier, setUnlockedHintTier] = useState<HintTier>(0);
  const [totalHintsUsed, setTotalHintsUsed] = useState(0);

  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isSelectorExpanded, setIsSelectorExpanded] = useState(true);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  const [currentZoom, setCurrentZoom] = useState(13);
  const [resetCounter, setResetCounter] = useState(0);

  const [results, setResults] = useState<RoundResult[]>([]);
  const [activeReveal, setActiveReveal] = useState<RoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [bestSessionStreak, setBestSessionStreak] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isPrefetchingNext, setIsPrefetchingNext] = useState(false);

  const activePlayerIndex: 0 | 1 = currentRoundNumber % 2 === 1 ? 0 : 1;
  const activePlayerName = versusConfig.playerNames[activePlayerIndex];
  const activePlayerTurnNumber = Math.ceil(currentRoundNumber / 2);
  const versusTotalRounds = versusConfig.roundsPerPlayer * 2;
  const nextPlayerName = versusConfig.playerNames[activePlayerIndex === 0 ? 1 : 0];

  const startBackgroundPrefetch = useCallback(() => {
    setIsPrefetchingNext(true);
    prefetchedRoundRef.current = null;
    const promise = discoverRandomRound(usedCodesRef.current, usedCoordKeysRef.current)
      .then((loc) => {
        prefetchedRoundRef.current = loc;
        return loc;
      })
      .catch(() => null)
      .finally(() => {
        setIsPrefetchingNext(false);
      });
    prefetchPromiseRef.current = promise;
  }, []);

  const loadRound = useCallback(
    async (roundNum: number, activeMode: GameMode, totalPlannedRounds?: number) => {
      setCurrentRoundNumber(roundNum);
      setPhase('LOADING');
      setLoadingError(null);
      setSelectedGuess(null);
      setUnlockedHintTier(0);
      setIsHintOpen(false);
      setViewMode('satellite');
      setResetCounter(0);

      try {
        let nextLoc: RoundLocation | null = prefetchedRoundRef.current;
        if (!nextLoc && prefetchPromiseRef.current) {
          nextLoc = await prefetchPromiseRef.current;
        }
        prefetchedRoundRef.current = null;
        prefetchPromiseRef.current = null;

        if (!nextLoc) {
          nextLoc = await discoverRandomRound(usedCodesRef.current, usedCoordKeysRef.current);
        }

        usedCoordKeysRef.current.add(`${Math.round(nextLoc.lat)},${Math.round(nextLoc.lng)}`);
        usedCodesRef.current = [...usedCodesRef.current, nextLoc.climate.climateCode];

        setCurrentLocation(nextLoc);
        setCurrentZoom(13);
        setPhase('PLAYING');

        // Prefetch the next round in the background while the player explores
        const hasMoreRounds =
          activeMode === 'endless' ||
          (activeMode === 'standard5' && roundNum < STANDARD_ROUNDS) ||
          (activeMode === 'versus' &&
            roundNum < (totalPlannedRounds ?? versusTotalRounds));

        if (hasMoreRounds) {
          startBackgroundPrefetch();
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : '地点データの取得中にエラーが発生しました。';
        setLoadingError(msg);
      }
    },
    [startBackgroundPrefetch, versusTotalRounds]
  );

  const handleStartMode = useCallback(
    (chosenMode: GameMode, incomingVersusConfig?: VersusConfig) => {
      playClickSound(muted);
      usedCoordKeysRef.current = new Set();
      usedCodesRef.current = [];
      prefetchedRoundRef.current = null;
      prefetchPromiseRef.current = null;

      const resolvedVersus = incomingVersusConfig ?? versusConfig;
      if (incomingVersusConfig) {
        setVersusConfig(incomingVersusConfig);
      }

      setMode(chosenMode);
      setResults([]);
      setActiveReveal(null);
      setTotalScore(0);
      setVersusScores([0, 0]);
      setStreakCount(0);
      setBestSessionStreak(0);
      setIsNewBest(false);
      setTotalHintsUsed(0);
      setIsSelectorExpanded(true);

      const plannedTotal =
        chosenMode === 'versus' ? resolvedVersus.roundsPerPlayer * 2 : STANDARD_ROUNDS;

      void loadRound(1, chosenMode, plannedTotal);
    },
    [loadRound, muted, versusConfig]
  );

  const handleUnlockNextHint = useCallback(() => {
    if (unlockedHintTier >= 3) return;

    playHintSound(muted);
    const nextTier = (unlockedHintTier + 1) as HintTier;
    setUnlockedHintTier(nextTier);
    setTotalHintsUsed((prev) => prev + 1);
  }, [unlockedHintTier, muted]);

  const handleSubmitGuess = useCallback(() => {
    if (!currentLocation || !selectedGuess || phase !== 'PLAYING') return;

    const correctCode = currentLocation.climate.climateCode;
    const isExact = selectedGuess === correctCode;
    const isGroupMatch =
      !isExact &&
      KOPPEN_CLASSES[selectedGuess].group === KOPPEN_CLASSES[correctCode].group;

    const matchQuality: MatchQuality = isExact
      ? 'exact'
      : isGroupMatch
        ? 'group'
        : 'miss';

    const isScoredMode = mode !== 'endless';
    const hintPenalty = isScoredMode ? STANDARD_HINT_PENALTIES[unlockedHintTier] : 0;

    let baseScore = 0;
    let finalScore = 0;
    if (isScoredMode) {
      if (isExact) {
        baseScore = 1000;
        finalScore = Math.max(100, baseScore - hintPenalty);
      } else if (isGroupMatch) {
        baseScore = 400;
        finalScore = Math.max(50, baseScore - Math.floor(hintPenalty * 0.5));
      }
    }

    if (isExact) {
      playExactMatchSound(muted);
    } else if (isGroupMatch && isScoredMode) {
      playGroupMatchSound(muted);
    } else {
      playMissSound(muted);
    }

    const roundResult: RoundResult = {
      roundNumber: currentRoundNumber,
      playerIndex: mode === 'versus' ? activePlayerIndex : undefined,
      playerName: mode === 'versus' ? activePlayerName : undefined,
      location: currentLocation,
      guess: selectedGuess,
      correctCode,
      matchQuality,
      baseScore,
      hintPenalty,
      finalScore,
      hintTierUsed: unlockedHintTier,
      resolvedPlace: null,
    };

    const nextScore = totalScore + finalScore;
    const nextStreak = mode === 'endless' ? (isExact ? streakCount + 1 : 0) : streakCount;
    const nextBestSessionStreak = Math.max(bestSessionStreak, nextStreak);

    setTotalScore(nextScore);
    if (mode === 'versus') {
      setVersusScores((prev) =>
        activePlayerIndex === 0
          ? [prev[0] + finalScore, prev[1]]
          : [prev[0], prev[1] + finalScore]
      );
    }
    setStreakCount(nextStreak);
    setBestSessionStreak(nextBestSessionStreak);
    setActiveReveal(roundResult);
    setResults((prev) => [...prev, roundResult]);
    setPhase('REVEAL');

    // Resolve place name via OpenStreetMap Nominatim proxy on reveal
    void fetchReverseGeocode(currentLocation.lat, currentLocation.lng).then((geo) => {
      setActiveReveal((curr) =>
        curr && curr.location.id === currentLocation.id
          ? { ...curr, resolvedPlace: geo }
          : curr
      );
      setResults((prev) =>
        prev.map((item) =>
          item.location.id === currentLocation.id ? { ...item, resolvedPlace: geo } : item
        )
      );
    });
  }, [
    currentLocation,
    selectedGuess,
    phase,
    mode,
    unlockedHintTier,
    muted,
    currentRoundNumber,
    activePlayerIndex,
    activePlayerName,
    totalScore,
    streakCount,
    bestSessionStreak,
  ]);

  const finishGame = useCallback(
    (finalScoreValue: number, finalStreakValue: number, hintsUsedValue: number) => {
      const prev = loadBestRecords();
      let beatBest = false;
      const updated: BestRecords = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
      };

      if (mode === 'standard5' && finalScoreValue > prev.standard5BestScore) {
        updated.standard5BestScore = finalScoreValue;
        beatBest = true;
      }

      if (mode === 'endless') {
        if (finalStreakValue > prev.endlessBestStreak) {
          updated.endlessBestStreak = finalStreakValue;
          beatBest = true;
        }
        if (hintsUsedValue === 0 && finalStreakValue > prev.endlessBestNoHintStreak) {
          updated.endlessBestNoHintStreak = finalStreakValue;
        }
      }

      saveBestRecords(updated);
      setRecords(updated);
      setIsNewBest(beatBest);
      setPhase('SUMMARY');
    },
    [mode]
  );

  // Endless mode always continues regardless of correctness; user can end anytime
  const isFinalRevealStep =
    activeReveal !== null &&
    ((mode === 'standard5' && currentRoundNumber >= STANDARD_ROUNDS) ||
      (mode === 'versus' && currentRoundNumber >= versusTotalRounds));

  const handleEndEndlessNow = useCallback(() => {
    playClickSound(muted);
    setActiveReveal(null);
    finishGame(totalScore, bestSessionStreak, totalHintsUsed);
  }, [muted, finishGame, totalScore, bestSessionStreak, totalHintsUsed]);

  const handleContinueAfterReveal = useCallback(() => {
    playClickSound(muted);
    if (isFinalRevealStep) {
      finishGame(totalScore, bestSessionStreak, totalHintsUsed);
      return;
    }
    setActiveReveal(null);
    void loadRound(currentRoundNumber + 1, mode, versusTotalRounds);
  }, [
    muted,
    isFinalRevealStep,
    finishGame,
    totalScore,
    bestSessionStreak,
    totalHintsUsed,
    loadRound,
    currentRoundNumber,
    mode,
    versusTotalRounds,
  ]);

  // Keyboard shortcuts during PLAYING and REVEAL
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isReferenceOpen) {
        if (e.key === 'Escape') setIsReferenceOpen(false);
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (phase === 'PLAYING') {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          playClickSound(muted);
          setViewMode((v) => (v === 'satellite' ? 'osm' : 'satellite'));
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          playClickSound(muted);
          setIsHintOpen((open) => !open);
        } else if (e.code === 'Space') {
          e.preventDefault();
          playClickSound(muted);
          setResetCounter((c) => c + 1);
        } else if (e.key === 'Enter' && selectedGuess) {
          e.preventDefault();
          handleSubmitGuess();
        }
      } else if (phase === 'REVEAL' && e.key === 'Enter') {
        e.preventDefault();
        handleContinueAfterReveal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    muted,
    selectedGuess,
    isReferenceOpen,
    handleSubmitGuess,
    handleContinueAfterReveal,
  ]);

  if (phase === 'TITLE') {
    return (
      <>
        <TitleScreen
          records={records}
          defaultVersusConfig={versusConfig}
          onStartMode={handleStartMode}
          onOpenReference={() => setIsReferenceOpen(true)}
        />
        {isReferenceOpen && (
          <KoppenReferenceModal onClose={() => setIsReferenceOpen(false)} />
        )}
      </>
    );
  }

  if (phase === 'SUMMARY') {
    return (
      <>
        <SummaryScreen
          mode={mode}
          results={results}
          totalScore={totalScore}
          streakCount={bestSessionStreak}
          totalHintsUsed={totalHintsUsed}
          isNewBest={isNewBest}
          records={records}
          versusConfig={mode === 'versus' ? versusConfig : undefined}
          versusScores={mode === 'versus' ? versusScores : undefined}
          onPlayAgain={() => handleStartMode(mode, mode === 'versus' ? versusConfig : undefined)}
          onGoHome={() => setPhase('TITLE')}
          onOpenReference={() => setIsReferenceOpen(true)}
        />
        {isReferenceOpen && (
          <KoppenReferenceModal onClose={() => setIsReferenceOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B1120] select-none">
      {/* Full-bleed Satellite / Label-free OpenStreetMap Exploration Viewport */}
      {currentLocation && (
        <ExplorationViewport
          location={currentLocation}
          viewMode={viewMode}
          resetCounter={resetCounter}
          onZoomChange={setCurrentZoom}
        />
      )}

      {/* Loading / Error State Overlay */}
      {phase === 'LOADING' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B1120]/95 backdrop-blur-sm p-6">
          <div className="max-w-md w-full bg-[#0F172A] border border-white/10 rounded-2xl p-6 text-center space-y-4">
            {loadingError ? (
              <>
                <div className="text-base font-semibold text-rose-300">
                  地点の読み込みに失敗しました
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {loadingError}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPhase('TITLE')}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    タイトルへ戻る
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadRound(currentRoundNumber, mode, versusTotalRounds)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    別の地点を再探索
                  </button>
                </div>
              </>
            ) : (
              <>
                <Loader2
                  className="w-8 h-8 text-emerald-400 animate-spin mx-auto"
                  aria-hidden="true"
                />
                <div className="space-y-1.5">
                  {mode === 'versus' && (
                    <div
                      className={`text-sm font-semibold ${
                        activePlayerIndex === 0 ? 'text-emerald-300' : 'text-sky-300'
                      }`}
                    >
                      P{activePlayerIndex + 1} · {activePlayerName} のターン（第
                      {activePlayerTurnNumber}問 / {versusConfig.roundsPerPlayer}）
                    </div>
                  )}
                  <div
                    className="text-base font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    世界のランダム地点を準備中...
                  </div>
                  <p className="text-xs text-slate-400">
                    10年分の実測気候データからケッペン気候を照合しています
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Active Playing Dark HUD Overlays */}
      {phase === 'PLAYING' && currentLocation && (
        <>
          {/* Top-Left Minimal Status HUD */}
          <div className="fixed top-4 left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
            <div className="bg-[#0F172A]/88 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3.5 shadow-xl">
              <button
                type="button"
                onClick={() => setPhase('TITLE')}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="タイトルへ戻る"
                title="タイトルへ戻る"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
              </button>

              <div className="h-4 w-px bg-white/10 shrink-0" aria-hidden="true" />

              {mode === 'standard5' ? (
                <div className="flex items-center gap-3.5 text-xs sm:text-sm font-mono tabular-nums">
                  <span className="text-slate-300 whitespace-nowrap">
                    Round <strong className="text-white">{currentRoundNumber}</strong>/{STANDARD_ROUNDS}
                  </span>
                  <span className="text-slate-500" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-emerald-300 font-semibold whitespace-nowrap">
                    {totalScore.toLocaleString()} pt
                  </span>
                </div>
              ) : mode === 'versus' ? (
                <div className="flex items-center gap-3 text-xs sm:text-sm min-w-0">
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${
                      activePlayerIndex === 0 ? 'text-emerald-300' : 'text-sky-300'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate max-w-[120px]">{activePlayerName}</span>
                    <span className="text-slate-400 font-normal">の番</span>
                  </span>
                  <span className="text-slate-500" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-slate-300 whitespace-nowrap">
                    {activePlayerTurnNumber}/{versusConfig.roundsPerPlayer}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs sm:text-sm font-mono tabular-nums">
                  <span className="text-slate-300 whitespace-nowrap">
                    Round <strong className="text-white">{currentRoundNumber}</strong>
                  </span>
                  <span className="text-slate-500" aria-hidden="true">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold whitespace-nowrap">
                    <Flame className="w-4 h-4" aria-hidden="true" />
                    {streakCount}連続
                  </span>
                  {results.length > 0 && (
                    <>
                      <span className="text-slate-500" aria-hidden="true">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={handleEndEndlessNow}
                        className="text-xs font-sans font-medium text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer whitespace-nowrap"
                      >
                        終了して結果を見る
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="h-4 w-px bg-white/10 shrink-0" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label={muted ? '効果音をオンにする' : '効果音をミュートする'}
                title={muted ? '効果音オン' : 'ミュート'}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Compact Live Score Comparison Strip for Versus Mode */}
            {mode === 'versus' && (
              <div className="bg-[#0F172A]/84 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs font-mono tabular-nums shadow-lg w-fit">
                <span
                  className={
                    activePlayerIndex === 0 ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                  }
                >
                  P1 {versusConfig.playerNames[0]}: {versusScores[0].toLocaleString()}pt
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  /
                </span>
                <span
                  className={
                    activePlayerIndex === 1 ? 'text-sky-300 font-semibold' : 'text-slate-400'
                  }
                >
                  P2 {versusConfig.playerNames[1]}: {versusScores[1].toLocaleString()}pt
                </span>
              </div>
            )}
          </div>

          {/* Top-Center Compact View & Zoom Readout */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 hidden lg:flex items-center gap-2.5 bg-[#0F172A]/82 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 shadow-lg pointer-events-none">
            <span className="text-slate-200 font-medium">
              {viewMode === 'satellite' ? '衛星写真（ラベルなし）' : 'OpenStreetMap（ラベルなし）'}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              Zoom {currentZoom} / 17
            </span>
          </div>

          {/* Top-Right Hint Drawer */}
          <div className="fixed top-16 sm:top-4 right-4 z-20">
            <HintDrawer
              isOpen={isHintOpen}
              onToggleOpen={() => {
                playClickSound(muted);
                setIsHintOpen((o) => !o);
              }}
              location={currentLocation}
              mode={mode}
              unlockedTier={unlockedHintTier}
              onUnlockNextHint={handleUnlockNextHint}
            />
          </div>

          {/* Bottom-Left View Switcher (Satellite <-> Label-free OSM) & Return to Center */}
          <div className="fixed bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
            <div
              className="bg-[#0F172A]/88 backdrop-blur-md border border-white/10 rounded-xl p-1 flex items-center gap-1 shadow-xl"
              role="group"
              aria-label="表示モード切替"
            >
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setViewMode('satellite');
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'satellite'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                }`}
                aria-pressed={viewMode === 'satellite'}
              >
                <Satellite className="w-3.5 h-3.5" aria-hidden="true" />
                <span>衛星写真</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound(muted);
                  setViewMode('osm');
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'osm'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                }`}
                aria-pressed={viewMode === 'osm'}
              >
                <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>OSM地図</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound(muted);
                setResetCounter((c) => c + 1);
              }}
              className="bg-[#0F172A]/88 backdrop-blur-md border border-white/10 hover:bg-slate-800/90 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-xl whitespace-nowrap cursor-pointer"
              title="初期地点へ戻る (Space)"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">初期地点へ戻る</span>
            </button>
          </div>

          {/* Bottom-Right 13-Class Köppen Selector Dock */}
          <div className="fixed bottom-4 right-4 z-20">
            <KoppenSelectorDock
              selectedCode={selectedGuess}
              onSelectCode={(code) => {
                playClickSound(muted);
                setSelectedGuess(code);
              }}
              onSubmitGuess={handleSubmitGuess}
              isExpanded={isSelectorExpanded}
              onToggleExpanded={() => {
                playClickSound(muted);
                setIsSelectorExpanded((e) => !e);
              }}
            />
          </div>
        </>
      )}

      {/* Post-Round Reveal Modal */}
      {phase === 'REVEAL' && activeReveal && (
        <RevealModal
          result={activeReveal}
          mode={mode}
          isFinalStep={isFinalRevealStep}
          isPrefetchingNext={isPrefetchingNext}
          onContinue={handleContinueAfterReveal}
          onEndEndless={mode === 'endless' ? handleEndEndlessNow : undefined}
          versusNames={mode === 'versus' ? versusConfig.playerNames : undefined}
          versusScores={mode === 'versus' ? versusScores : undefined}
          nextPlayerName={mode === 'versus' ? nextPlayerName : undefined}
        />
      )}
    </div>
  );
}
