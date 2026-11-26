import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock,
  Crosshair,
  Flame,
  Globe2,
  Home,
  Loader2,
  Map as MapIcon,
  RotateCcw,
  Satellite,
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
  QuestionFormat,
  RecentRoundEntry,
  RoundLocation,
  RoundResult,
  TimeLimitOption,
  VersusConfig,
  ViewMode,
} from './types/game.ts';
import {
  playClickSound,
  playExactMatchSound,
  playGroupMatchSound,
  playHintSound,
  playMissSound,
  playTickSound,
  playTimeoutSound,
} from './utils/sound.ts';
import {
  clearGameSession,
  loadBestRecords,
  loadGamePreferences,
  loadGameSession,
  loadRecentHistory,
  recordRecentRound,
  saveBestRecords,
  saveGamePreferences,
  saveGameSession,
} from './utils/storage.ts';
import { BlankMapViewport } from './components/BlankMapViewport.tsx';
import { ExplorationViewport } from './components/ExplorationViewport.tsx';
import { HintDrawer, STANDARD_HINT_PENALTIES } from './components/HintDrawer.tsx';
import { HythergraphViewport } from './components/HythergraphViewport.tsx';
import { KoppenReferenceModal } from './components/KoppenReferenceModal.tsx';
import { KoppenSelectorDock } from './components/KoppenSelectorDock.tsx';
import { RevealModal } from './components/RevealModal.tsx';
import { SummaryScreen } from './components/SummaryScreen.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';

const STANDARD_ROUNDS = 5;

function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  const initialBootRef = useRef<{
    prefs: ReturnType<typeof loadGamePreferences>;
    session: ReturnType<typeof loadGameSession>;
  } | null>(null);
  if (!initialBootRef.current) {
    initialBootRef.current = {
      prefs: loadGamePreferences(),
      session: loadGameSession(),
    };
  }
  const bootPrefs = initialBootRef.current.prefs;
  const bootSession = initialBootRef.current.session;

  const prefetchBufferRef = useRef<RoundLocation[]>([]);
  const prefetchInFlightRef = useRef<Promise<RoundLocation | null> | null>(null);
  const prefetchWorkerActiveRef = useRef<boolean>(false);
  const prefetchGenerationRef = useRef<number>(0);
  const usedCoordKeysRef = useRef<Set<string>>(new Set(bootSession?.usedCoordKeys ?? []));
  const usedCodesRef = useRef<KoppenCode[]>(bootSession?.usedCodes ?? []);
  const recentHistoryRef = useRef<RecentRoundEntry[]>(loadRecentHistory());
  const timeoutHandledRoundRef = useRef<string | null>(null);
  const hasResumedSessionRef = useRef(false);

  const [records, setRecords] = useState<BestRecords>(() => loadBestRecords());
  const [phase, setPhase] = useState<GamePhase>(bootSession?.phase ?? 'TITLE');
  const [mode, setMode] = useState<GameMode>(bootSession?.mode ?? 'standard5');
  const [questionFormat, setQuestionFormat] = useState<QuestionFormat>(
    bootSession?.questionFormat ?? bootPrefs.questionFormat
  );
  const [viewMode, setViewMode] = useState<ViewMode>(bootSession?.viewMode ?? 'satellite');
  const [muted, setMuted] = useState<boolean>(bootPrefs.muted);

  const [timeLimitSec, setTimeLimitSec] = useState<TimeLimitOption>(
    bootSession?.timeLimitSec ?? bootPrefs.timeLimitSec
  );
  const [timeLeftSec, setTimeLeftSec] = useState<number>(bootSession?.timeLeftSec ?? 0);

  const [versusConfig, setVersusConfig] = useState<VersusConfig>(
    bootSession?.versusConfig ?? bootPrefs.versusConfig
  );
  const [versusScores, setVersusScores] = useState<[number, number]>(
    bootSession?.versusScores ?? [0, 0]
  );

  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(
    bootSession?.currentRoundNumber ?? 1
  );
  const [currentLocation, setCurrentLocation] = useState<RoundLocation | null>(
    bootSession?.currentLocation ?? null
  );
  const [selectedGuess, setSelectedGuess] = useState<KoppenCode | null>(
    bootSession?.selectedGuess ?? null
  );
  const [unlockedHintTier, setUnlockedHintTier] = useState<HintTier>(
    bootSession?.unlockedHintTier ?? 0
  );
  const [totalHintsUsed, setTotalHintsUsed] = useState<number>(bootSession?.totalHintsUsed ?? 0);

  const [isHintOpen, setIsHintOpen] = useState<boolean>(bootSession?.isHintOpen ?? false);
  const [isSelectorExpanded, setIsSelectorExpanded] = useState<boolean>(
    bootSession?.isSelectorExpanded ?? (typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  );
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  const [currentZoom, setCurrentZoom] = useState(
    (bootSession?.questionFormat ?? bootPrefs.questionFormat) === 'blankMap' ? 2 : 13
  );
  const [resetCounter, setResetCounter] = useState(0);
  const [focusPinCounter, setFocusPinCounter] = useState(0);

  const [results, setResults] = useState<RoundResult[]>(bootSession?.results ?? []);
  const [activeReveal, setActiveReveal] = useState<RoundResult | null>(
    bootSession?.activeReveal ?? null
  );
  const [totalScore, setTotalScore] = useState<number>(bootSession?.totalScore ?? 0);
  const [streakCount, setStreakCount] = useState<number>(bootSession?.streakCount ?? 0);
  const [bestSessionStreak, setBestSessionStreak] = useState<number>(
    bootSession?.bestSessionStreak ?? 0
  );
  const [isNewBest, setIsNewBest] = useState<boolean>(bootSession?.isNewBest ?? false);

  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isPrefetchingNext, setIsPrefetchingNext] = useState(false);

  const excludedCodes: KoppenCode[] = questionFormat === 'hythergraph' ? ['H'] : [];

  const versusTotalRounds = versusConfig.roundsPerPlayer * 2;
  const activePlayerIndex = ((currentRoundNumber - 1) % 2) as 0 | 1;
  const activePlayerName = versusConfig.playerNames[activePlayerIndex];
  const activePlayerTurnNumber = Math.floor((currentRoundNumber - 1) / 2) + 1;
  const nextPlayerIndex = (currentRoundNumber % 2) as 0 | 1;
  const nextPlayerName = versusConfig.playerNames[nextPlayerIndex];

  const PREFETCH_BUFFER_CAPACITY = 3;

  const ensurePrefetchBuffer = useCallback(
    (activeFormat: QuestionFormat, targetDepth = PREFETCH_BUFFER_CAPACITY) => {
      const excludeCodes: KoppenCode[] = activeFormat === 'hythergraph' ? ['H'] : [];
      const excludeSet = new Set(excludeCodes);

      // Prune any buffered items that conflict with current format exclusions or already used coords
      prefetchBufferRef.current = prefetchBufferRef.current.filter((item) => {
        const ck = `${Math.round(item.lat)},${Math.round(item.lng)}`;
        return !excludeSet.has(item.climate.climateCode) && !usedCoordKeysRef.current.has(ck);
      });

      if (prefetchBufferRef.current.length >= targetDepth || prefetchWorkerActiveRef.current) {
        setIsPrefetchingNext(
          prefetchBufferRef.current.length === 0 && prefetchWorkerActiveRef.current
        );
        return;
      }

      const gen = prefetchGenerationRef.current;
      prefetchWorkerActiveRef.current = true;
      setIsPrefetchingNext(prefetchBufferRef.current.length === 0);

      void (async () => {
        try {
          while (
            gen === prefetchGenerationRef.current &&
            prefetchBufferRef.current.length < targetDepth
          ) {
            // Project session state across already-buffered rounds so all buffered items are diverse
            const buffered = prefetchBufferRef.current;
            const projectedUsedCodes: KoppenCode[] = [
              ...usedCodesRef.current,
              ...buffered.map((b) => b.climate.climateCode),
            ];
            const projectedCoordKeys = new Set<string>(usedCoordKeysRef.current);
            for (const b of buffered) {
              projectedCoordKeys.add(`${Math.round(b.lat)},${Math.round(b.lng)}`);
            }
            const projectedRecentHistory: RecentRoundEntry[] = [
              ...recentHistoryRef.current,
              ...buffered.map((b, i) => ({
                lat: b.lat,
                lng: b.lng,
                code: b.climate.climateCode,
                regionIndex: b.regionIndex ?? -1,
                playedAt: Date.now() + i,
              })),
            ];

            const singlePromise = discoverRandomRound(projectedUsedCodes, projectedCoordKeys, {
              excludeCodes,
              recentHistory: projectedRecentHistory,
            }).catch(() => null);

            prefetchInFlightRef.current = singlePromise;
            const loc = await singlePromise;
            if (prefetchInFlightRef.current === singlePromise) {
              prefetchInFlightRef.current = null;
            }

            if (gen !== prefetchGenerationRef.current) {
              break;
            }

            if (!loc) {
              // Avoid tight retry loop on transient network outage
              await new Promise((r) => setTimeout(r, 400));
              continue;
            }

            const ck = `${Math.round(loc.lat)},${Math.round(loc.lng)}`;
            const alreadyBuffered = prefetchBufferRef.current.some(
              (b) => `${Math.round(b.lat)},${Math.round(b.lng)}` === ck
            );
            if (!usedCoordKeysRef.current.has(ck) && !alreadyBuffered) {
              prefetchBufferRef.current.push(loc);
              // Pre-warm reverse geocoding cache in the background so Reveal shows place name immediately
              void fetchReverseGeocode(loc.lat, loc.lng);
            }

            setIsPrefetchingNext(false);
          }
        } finally {
          if (gen === prefetchGenerationRef.current) {
            prefetchWorkerActiveRef.current = false;
            setIsPrefetchingNext(false);
          }
        }
      })();
    },
    []
  );

  // Keep the 3-round prefetch buffer warm even on TITLE and SUMMARY screens
  useEffect(() => {
    if (phase === 'TITLE' || phase === 'SUMMARY') {
      ensurePrefetchBuffer(questionFormat, PREFETCH_BUFFER_CAPACITY);
    }
  }, [phase, questionFormat, ensurePrefetchBuffer]);

  const popNextBufferedLocation = useCallback(
    (excludeCodes: KoppenCode[]): RoundLocation | null => {
      const excludeSet = new Set(excludeCodes);
      const usedCodeSet = new Set(usedCodesRef.current);

      // Filter out any invalid/colliding items first
      prefetchBufferRef.current = prefetchBufferRef.current.filter((item) => {
        const ck = `${Math.round(item.lat)},${Math.round(item.lng)}`;
        return !excludeSet.has(item.climate.climateCode) && !usedCoordKeysRef.current.has(ck);
      });

      if (prefetchBufferRef.current.length === 0) {
        return null;
      }

      // Prefer a buffered location whose climate code has not yet been used in this game session
      const freshIdx = prefetchBufferRef.current.findIndex(
        (item) => !usedCodeSet.has(item.climate.climateCode)
      );
      const pickIdx = freshIdx >= 0 ? freshIdx : 0;
      const [picked] = prefetchBufferRef.current.splice(pickIdx, 1);
      return picked ?? null;
    },
    []
  );

  const loadRound = useCallback(
    async (
      roundNum: number,
      activeMode: GameMode,
      activeFormat: QuestionFormat,
      activeTimeLimit: TimeLimitOption,
      activeVersusTotalRounds = versusTotalRounds
    ) => {
      setLoadingError(null);
      setSelectedGuess(null);
      setUnlockedHintTier(0);
      setIsHintOpen(false);
      setViewMode('satellite');
      setResetCounter(0);
      setFocusPinCounter(0);
      setCurrentRoundNumber(roundNum);
      setTimeLeftSec(activeTimeLimit);
      timeoutHandledRoundRef.current = null;

      const excludeCodes: KoppenCode[] = activeFormat === 'hythergraph' ? ['H'] : [];

      try {
        // 1. Try popping immediately from our multi-round prefetch buffer (0ms instant transition!)
        let nextLoc: RoundLocation | null = popNextBufferedLocation(excludeCodes);

        // 2. If buffer was empty, show LOADING overlay and await in-flight prefetch or discover now
        if (!nextLoc) {
          setPhase('LOADING');
          if (prefetchInFlightRef.current) {
            const candidate = await prefetchInFlightRef.current;
            nextLoc = popNextBufferedLocation(excludeCodes);
            if (
              !nextLoc &&
              candidate &&
              !excludeCodes.includes(candidate.climate.climateCode) &&
              !usedCoordKeysRef.current.has(
                `${Math.round(candidate.lat)},${Math.round(candidate.lng)}`
              )
            ) {
              nextLoc = candidate;
            }
          }
        }

        if (!nextLoc) {
          setPhase('LOADING');
          nextLoc = await discoverRandomRound(usedCodesRef.current, usedCoordKeysRef.current, {
            excludeCodes,
            recentHistory: recentHistoryRef.current,
          });
        }

        usedCoordKeysRef.current.add(`${Math.round(nextLoc.lat)},${Math.round(nextLoc.lng)}`);
        usedCodesRef.current = [...usedCodesRef.current, nextLoc.climate.climateCode];
        recentHistoryRef.current = recordRecentRound({
          lat: nextLoc.lat,
          lng: nextLoc.lng,
          code: nextLoc.climate.climateCode,
          regionIndex: nextLoc.regionIndex ?? -1,
          playedAt: Date.now(),
        });

        // Ensure reverse geocode is warmed for the active round while the user plays
        void fetchReverseGeocode(nextLoc.lat, nextLoc.lng);

        setCurrentLocation(nextLoc);
        setCurrentZoom(activeFormat === 'blankMap' ? 2 : 13);
        setTimeLeftSec(activeTimeLimit);
        setPhase('PLAYING');

        // Continuously replenish the 3-round background buffer while the player explores
        ensurePrefetchBuffer(activeFormat, PREFETCH_BUFFER_CAPACITY);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : '地点データの取得中にエラーが発生しました。';
        setLoadingError(msg);
        setPhase('LOADING');
      }
    },
    [ensurePrefetchBuffer, popNextBufferedLocation, versusTotalRounds]
  );

  const handleStartMode = useCallback(
    (
      chosenMode: GameMode,
      options: {
        questionFormat: QuestionFormat;
        timeLimitSec: TimeLimitOption;
        versusConfig?: VersusConfig;
      }
    ) => {
      playClickSound(muted);
      usedCoordKeysRef.current = new Set();
      usedCodesRef.current = [];

      const resolvedVersus = options.versusConfig ?? versusConfig;
      if (options.versusConfig) {
        setVersusConfig(options.versusConfig);
      }

      setMode(chosenMode);
      setQuestionFormat(options.questionFormat);
      setTimeLimitSec(options.timeLimitSec);
      setVersusScores([0, 0]);
      setResults([]);
      setActiveReveal(null);
      setTotalScore(0);
      setStreakCount(0);
      setBestSessionStreak(0);
      setIsNewBest(false);
      setTotalHintsUsed(0);
      setIsSelectorExpanded(window.innerWidth >= 768);

      void loadRound(
        1,
        chosenMode,
        options.questionFormat,
        options.timeLimitSec,
        resolvedVersus.roundsPerPlayer * 2
      );
    },
    [loadRound, muted, versusConfig]
  );

  const handlePreferencesChange = useCallback(
    (next: {
      questionFormat: QuestionFormat;
      timeLimitSec: TimeLimitOption;
      versusConfig: VersusConfig;
    }) => {
      setQuestionFormat(next.questionFormat);
      setTimeLimitSec(next.timeLimitSec);
      setVersusConfig(next.versusConfig);
    },
    []
  );

  // Save user preferences (format, timer, versus names/rounds, mute) to localStorage
  useEffect(() => {
    saveGamePreferences({
      questionFormat,
      timeLimitSec,
      versusConfig,
      muted,
    });
  }, [questionFormat, timeLimitSec, versusConfig, muted]);

  // Save active game session to localStorage so reloading restores exact progress
  useEffect(() => {
    if (phase === 'TITLE') {
      clearGameSession();
      return;
    }

    saveGameSession({
      version: 1,
      savedAt: Date.now(),
      phase,
      mode,
      questionFormat,
      viewMode,
      timeLimitSec,
      timeLeftSec,
      versusConfig,
      versusScores,
      currentRoundNumber,
      currentLocation,
      selectedGuess,
      unlockedHintTier,
      totalHintsUsed,
      isHintOpen,
      isSelectorExpanded,
      results,
      activeReveal,
      totalScore,
      streakCount,
      bestSessionStreak,
      isNewBest,
      usedCoordKeys: Array.from(usedCoordKeysRef.current),
      usedCodes: usedCodesRef.current,
    });
  }, [
    phase,
    mode,
    questionFormat,
    viewMode,
    timeLimitSec,
    timeLeftSec,
    versusConfig,
    versusScores,
    currentRoundNumber,
    currentLocation,
    selectedGuess,
    unlockedHintTier,
    totalHintsUsed,
    isHintOpen,
    isSelectorExpanded,
    results,
    activeReveal,
    totalScore,
    streakCount,
    bestSessionStreak,
    isNewBest,
  ]);

  // Resume async tasks (round loading, reverse geocode, prefetch) when restoring a cached session
  useEffect(() => {
    if (hasResumedSessionRef.current) return;
    hasResumedSessionRef.current = true;
    const saved = initialBootRef.current?.session;
    if (!saved) return;

    const savedVersusTotal = saved.versusConfig.roundsPerPlayer * 2;

    if (saved.phase === 'LOADING') {
      void loadRound(
        saved.currentRoundNumber,
        saved.mode,
        saved.questionFormat,
        saved.timeLimitSec,
        savedVersusTotal
      );
      return;
    }

    if (saved.phase === 'PLAYING') {
      if (saved.currentLocation) {
        void fetchReverseGeocode(saved.currentLocation.lat, saved.currentLocation.lng);
      }
      ensurePrefetchBuffer(saved.questionFormat, PREFETCH_BUFFER_CAPACITY);
      return;
    }

    if (saved.phase === 'REVEAL' && saved.activeReveal) {
      if (!saved.activeReveal.resolvedPlace) {
        const targetLoc = saved.activeReveal.location;
        void fetchReverseGeocode(targetLoc.lat, targetLoc.lng).then((geo) => {
          setActiveReveal((curr) =>
            curr && curr.location.id === targetLoc.id ? { ...curr, resolvedPlace: geo } : curr
          );
          setResults((prev) =>
            prev.map((item) =>
              item.location.id === targetLoc.id ? { ...item, resolvedPlace: geo } : item
            )
          );
        });
      }
      ensurePrefetchBuffer(saved.questionFormat, PREFETCH_BUFFER_CAPACITY);
    }
  }, [loadRound, ensurePrefetchBuffer]);

  const handleUnlockNextHint = useCallback(() => {
    if (unlockedHintTier >= 3) return;

    playHintSound(muted);
    const nextTier = (unlockedHintTier + 1) as HintTier;
    setUnlockedHintTier(nextTier);
    setTotalHintsUsed((prev) => prev + 1);
  }, [unlockedHintTier, muted]);

  const resolveRound = useCallback(
    (guessToLock: KoppenCode | null, timedOut: boolean) => {
      if (!currentLocation || phase !== 'PLAYING') return;
      if (!timedOut && !guessToLock) return;

      const correctCode = currentLocation.climate.climateCode;
      const isExact = guessToLock !== null && guessToLock === correctCode;
      const isGroupMatch =
        guessToLock !== null &&
        !isExact &&
        KOPPEN_CLASSES[guessToLock].group === KOPPEN_CLASSES[correctCode].group;

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

      if (timedOut && !guessToLock) {
        playTimeoutSound(muted);
      } else if (isExact) {
        playExactMatchSound(muted);
      } else if (isGroupMatch && isScoredMode) {
        playGroupMatchSound(muted);
      } else {
        playMissSound(muted);
      }

      const roundResult: RoundResult = {
        roundNumber: currentRoundNumber,
        location: currentLocation,
        guess: guessToLock,
        correctCode,
        matchQuality,
        baseScore,
        hintPenalty,
        finalScore,
        hintTierUsed: unlockedHintTier,
        resolvedPlace: null,
        timedOut,
        questionFormat,
        ...(mode === 'versus'
          ? {
              playerIndex: activePlayerIndex,
              playerName: activePlayerName,
            }
          : {}),
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
    },
    [
      currentLocation,
      phase,
      mode,
      questionFormat,
      unlockedHintTier,
      muted,
      currentRoundNumber,
      activePlayerIndex,
      activePlayerName,
      totalScore,
      streakCount,
      bestSessionStreak,
    ]
  );

  const handleSubmitGuess = useCallback(() => {
    resolveRound(selectedGuess, false);
  }, [resolveRound, selectedGuess]);

  // Countdown tick loop during PLAYING when a time limit is active
  useEffect(() => {
    if (phase !== 'PLAYING' || timeLimitSec === 0) return;

    const timer = window.setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, timeLimitSec, currentLocation?.id]);

  // Subtle audio cue for the final 10 seconds (only fires when remaining seconds change)
  useEffect(() => {
    if (phase !== 'PLAYING' || timeLimitSec === 0) return;
    if (timeLeftSec > 0 && timeLeftSec <= 10) {
      playTickSound(muted, timeLeftSec <= 5);
    }
  }, [phase, timeLimitSec, timeLeftSec, muted]);

  // Automatic lock-in when the countdown reaches 0
  useEffect(() => {
    if (phase !== 'PLAYING' || timeLimitSec === 0 || !currentLocation) return;
    if (timeLeftSec === 0 && timeoutHandledRoundRef.current !== currentLocation.id) {
      timeoutHandledRoundRef.current = currentLocation.id;
      resolveRound(selectedGuess, true);
    }
  }, [phase, timeLimitSec, timeLeftSec, currentLocation, selectedGuess, resolveRound]);

  const finishGame = useCallback(
    (finalScoreValue: number, finalStreakValue: number, hintsUsedValue: number) => {
      const prev = loadBestRecords();
      const prevFmt = prev.byFormat[questionFormat];
      let beatBest = false;

      const updatedFmt = {
        ...prevFmt,
        gamesPlayed: prevFmt.gamesPlayed + 1,
      };

      const updated: BestRecords = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        byFormat: {
          ...prev.byFormat,
          [questionFormat]: updatedFmt,
        },
      };

      if (mode === 'standard5') {
        if (finalScoreValue > prevFmt.standard5BestScore) {
          updatedFmt.standard5BestScore = finalScoreValue;
          beatBest = true;
        }
        if (finalScoreValue > prev.standard5BestScore) {
          updated.standard5BestScore = finalScoreValue;
        }
      }

      if (mode === 'endless') {
        if (finalStreakValue > prevFmt.endlessBestStreak) {
          updatedFmt.endlessBestStreak = finalStreakValue;
          beatBest = true;
        }
        if (hintsUsedValue === 0 && finalStreakValue > prevFmt.endlessBestNoHintStreak) {
          updatedFmt.endlessBestNoHintStreak = finalStreakValue;
        }
        if (finalStreakValue > prev.endlessBestStreak) {
          updated.endlessBestStreak = finalStreakValue;
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
    [mode, questionFormat]
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
    void loadRound(currentRoundNumber + 1, mode, questionFormat, timeLimitSec);
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
    questionFormat,
    timeLimitSec,
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
        if ((e.key === 's' || e.key === 'S') && questionFormat === 'satellite') {
          e.preventDefault();
          playClickSound(muted);
          setViewMode((v) => (v === 'satellite' ? 'osm' : 'satellite'));
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          playClickSound(muted);
          setIsHintOpen((open) => !open);
        } else if (e.code === 'Space' && questionFormat !== 'hythergraph') {
          e.preventDefault();
          playClickSound(muted);
          setResetCounter((c) => c + 1);
        } else if ((e.key === 'z' || e.key === 'Z') && questionFormat === 'blankMap') {
          e.preventDefault();
          playClickSound(muted);
          setFocusPinCounter((c) => c + 1);
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
    questionFormat,
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
          initialQuestionFormat={questionFormat}
          initialVersusConfig={versusConfig}
          initialTimeLimit={timeLimitSec}
          onPreferencesChange={handlePreferencesChange}
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
          questionFormat={questionFormat}
          results={results}
          totalScore={totalScore}
          streakCount={bestSessionStreak}
          totalHintsUsed={totalHintsUsed}
          timeLimitSec={timeLimitSec}
          isNewBest={isNewBest}
          records={records}
          versusConfig={mode === 'versus' ? versusConfig : undefined}
          versusScores={mode === 'versus' ? versusScores : undefined}
          onPlayAgain={() =>
            handleStartMode(mode, {
              questionFormat,
              timeLimitSec,
              versusConfig: mode === 'versus' ? versusConfig : undefined,
            })
          }
          onGoHome={() => setPhase('TITLE')}
          onOpenReference={() => setIsReferenceOpen(true)}
        />
        {isReferenceOpen && (
          <KoppenReferenceModal onClose={() => setIsReferenceOpen(false)} />
        )}
      </>
    );
  }

  const timeProgressRatio =
    timeLimitSec > 0 ? Math.max(0, Math.min(1, timeLeftSec / timeLimitSec)) : 1;
  const isTimeUrgent = timeLimitSec > 0 && timeLeftSec <= 10;
  const isTimeWarning = timeLimitSec > 0 && timeLeftSec > 10 && timeLeftSec <= 20;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B1120] select-none">
      {/* Main Format-Specific Viewport */}
      {currentLocation && questionFormat === 'satellite' && (
        <ExplorationViewport
          location={currentLocation}
          viewMode={viewMode}
          resetCounter={resetCounter}
          onZoomChange={setCurrentZoom}
        />
      )}

      {currentLocation && questionFormat === 'blankMap' && (
        <BlankMapViewport
          location={currentLocation}
          resetCounter={resetCounter}
          focusPinCounter={focusPinCounter}
          onZoomChange={setCurrentZoom}
        />
      )}

      {currentLocation && questionFormat === 'hythergraph' && (
        <HythergraphViewport
          location={currentLocation}
          unlockedHintTier={unlockedHintTier}
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
                    onClick={() =>
                      void loadRound(currentRoundNumber, mode, questionFormat, timeLimitSec)
                    }
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
                <div className="space-y-1">
                  {mode === 'versus' && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 pb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activePlayerIndex === 0 ? 'bg-cyan-400' : 'bg-violet-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        {activePlayerName} のターン（{activePlayerTurnNumber} /{' '}
                        {versusConfig.roundsPerPlayer}問目）
                      </span>
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
          {/* Top-Left Minimal Status HUD + Optional Countdown Timer */}
          <div className="fixed top-4 left-4 z-20 flex flex-col items-start gap-2 max-w-[calc(100vw-2rem)]">
            <div className="relative overflow-hidden bg-[#0F172A]/86 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3 sm:gap-4 shadow-xl">
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
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-mono tabular-nums">
                  <span className="text-slate-300 whitespace-nowrap">
                    Round <strong className="text-white">{currentRoundNumber}</strong>/
                    {STANDARD_ROUNDS}
                  </span>
                  <span className="text-slate-500" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-emerald-300 font-semibold whitespace-nowrap">
                    {totalScore.toLocaleString()} pt
                  </span>
                </div>
              ) : mode === 'versus' ? (
                <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-white whitespace-nowrap">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        activePlayerIndex === 0 ? 'bg-cyan-400' : 'bg-violet-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="max-w-[110px] truncate">{activePlayerName}</span>
                  </span>
                  <span className="font-mono tabular-nums text-slate-400 whitespace-nowrap">
                    {activePlayerTurnNumber}/{versusConfig.roundsPerPlayer}
                  </span>
                  <span className="hidden sm:inline text-slate-600" aria-hidden="true">
                    |
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 font-mono tabular-nums text-xs text-slate-300 whitespace-nowrap">
                    <span className="text-cyan-300">{versusScores[0].toLocaleString()}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-violet-300">{versusScores[1].toLocaleString()}</span>
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

              {timeLimitSec > 0 && (
                <>
                  <div className="h-4 w-px bg-white/10 shrink-0" aria-hidden="true" />
                  <div
                    className={`inline-flex items-center gap-1.5 font-mono tabular-nums text-xs sm:text-sm font-bold whitespace-nowrap ${
                      isTimeUrgent
                        ? 'text-rose-400 animate-pulse'
                        : isTimeWarning
                          ? 'text-amber-300'
                          : 'text-sky-300'
                    }`}
                    aria-label={`残り時間 ${formatCountdown(timeLeftSec)}`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{formatCountdown(timeLeftSec)}</span>
                  </div>
                </>
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

              {/* Subtle bottom countdown progress bar when time limit is enabled */}
              {timeLimitSec > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-[width] duration-1000 linear ${
                      isTimeUrgent
                        ? 'bg-rose-400'
                        : isTimeWarning
                          ? 'bg-amber-400'
                          : 'bg-sky-400'
                    }`}
                    style={{ width: `${timeProgressRatio * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Top-Center Compact View & Zoom Readout */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 hidden xl:flex items-center gap-2.5 bg-[#0F172A]/82 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 shadow-lg pointer-events-none">
            {questionFormat === 'satellite' ? (
              <>
                <span className="text-slate-200 font-medium">
                  {viewMode === 'satellite'
                    ? '衛星写真（ラベルなし）'
                    : 'OpenStreetMap（ラベルなし）'}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-slate-400">
                  Zoom {currentZoom} / 17
                </span>
              </>
            ) : questionFormat === 'blankMap' ? (
              <>
                <span className="text-slate-200 font-medium">
                  白地図モード（陸地輪郭・国境線）
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-slate-400">
                  Zoom {currentZoom.toFixed(1).replace(/\.0$/, '')} / 8
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-200 font-medium">ハイサーグラフモード</span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-slate-400">13区分（H除外）</span>
              </>
            )}
          </div>

          {/* Top-Right Hint Drawer */}
          <div className="fixed top-16 min-[500px]:top-4 right-4 z-30">
            <HintDrawer
              isOpen={isHintOpen}
              onToggleOpen={() => {
                playClickSound(muted);
                setIsHintOpen((o) => !o);
              }}
              location={currentLocation}
              mode={mode}
              questionFormat={questionFormat}
              unlockedTier={unlockedHintTier}
              onUnlockNextHint={handleUnlockNextHint}
            />
          </div>

          {/* Bottom Controls & Selector Dock: stacked cleanly on mobile (< md), split corners on desktop (>= md) */}
          <div className="fixed bottom-3 inset-x-3 z-20 flex flex-col gap-2 pointer-events-none md:inset-0 md:block">
            {questionFormat === 'satellite' && (
              <div className="pointer-events-auto flex flex-wrap items-center gap-2 md:fixed md:bottom-4 md:left-4">
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
            )}

            {questionFormat === 'blankMap' && (
              <div className="pointer-events-auto flex items-center gap-2 md:fixed md:bottom-4 md:left-4">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound(muted);
                    setResetCounter((c) => c + 1);
                  }}
                  className="bg-[#0F172A]/88 backdrop-blur-md border border-white/10 hover:bg-slate-800/90 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-xl whitespace-nowrap cursor-pointer"
                  title="世界全体を表示 (Space)"
                >
                  <Globe2 className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
                  <span>世界全体</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound(muted);
                    setFocusPinCounter((c) => c + 1);
                  }}
                  className="bg-[#0F172A]/88 backdrop-blur-md border border-white/10 hover:bg-slate-800/90 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-xl whitespace-nowrap cursor-pointer"
                  title="ピンの周辺へズーム (Z)"
                >
                  <Crosshair className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  <span>ピンへズーム</span>
                </button>
              </div>
            )}

            {/* Köppen Selector Dock (Compact 2-step A-E/H picker when collapsed, full grid when expanded) */}
            <div className="pointer-events-auto w-full md:w-auto md:fixed md:bottom-4 md:right-4">
              <KoppenSelectorDock
                selectedCode={selectedGuess}
                onSelectCode={(code) => {
                  playClickSound(muted);
                  setSelectedGuess(code);
                }}
                onGroupTap={() => playClickSound(muted)}
                onSubmitGuess={handleSubmitGuess}
                isExpanded={isSelectorExpanded}
                onToggleExpanded={() => {
                  playClickSound(muted);
                  setIsSelectorExpanded((e) => !e);
                }}
                excludedCodes={excludedCodes}
              />
            </div>
          </div>
        </>
      )}

      {/* Post-Round Reveal Modal */}
      {phase === 'REVEAL' && activeReveal && (
        <RevealModal
          result={activeReveal}
          mode={mode}
          questionFormat={questionFormat}
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
