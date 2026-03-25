import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ExplorerCount, GridSize, Lair, MultiplayerLair } from './generator/types';
import {
  buildConfig,
  buildMultiplayerConfig,
  DEFAULT_MULTIPLAYER_WALL_COUNT,
  DEFAULT_WALL_COUNT,
  MULTIPLAYER_WALL_RANGES,
  WALL_RANGES,
} from './generator/config';
import { generateValidLair, generateValidMultiplayerLair } from './generator/generator';
import {
  decodeExplorationState,
  decodeLair,
  decodeMultiplayerExplorationState,
  decodeMultiplayerLair,
  encodeLair,
  encodeMultiplayerLair,
  isMultiplayerHash,
} from './generator/serializer';
import { getExplorableCells, getStartCellKey } from './generator/exploration';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { LairGrid } from './components/LairGrid';
import { MultiplayerView } from './components/MultiplayerView';
import { StatusBar } from './components/StatusBar';
import { Legend } from './components/Legend';
import { Footer } from './components/Footer';
import styles from './App.module.css';

export default function App() {
  // App mode
  const [appMode, setAppMode] = useState<'standard' | 'multiplayer'>('standard');

  // Standard mode state
  const [gridSize, setGridSize] = useState<GridSize>('base');
  const [wallCount, setWallCount] = useState(DEFAULT_WALL_COUNT['base']);
  const [lair, setLair] = useState<Lair | null>(null);

  // Multiplayer mode state
  const [explorerCount, setExplorerCount] = useState<ExplorerCount>(2);
  const [mpWallCount, setMpWallCount] = useState(DEFAULT_MULTIPLAYER_WALL_COUNT[2]);
  const [multiplayerLair, setMultiplayerLair] = useState<MultiplayerLair | null>(null);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [explorationMode, setExplorationMode] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  // Standard exploration state
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());

  // Multiplayer exploration state
  const [upperRevealedCells, setUpperRevealedCells] = useState<Set<string>>(new Set());
  const [lowerRevealedCells, setLowerRevealedCells] = useState<Set<string>>(new Set());

  // ── Derived state ──────────────────────────────────────────────────────────

  const explorableCells = useMemo(
    () => explorationMode && lair ? getExplorableCells(lair, revealedCells) : new Set<string>(),
    [lair, explorationMode, revealedCells]
  );

  const upperExplorableCells = useMemo(() => {
    if (!explorationMode || !multiplayerLair) return new Set<string>();
    const upperLair: Lair = {
      config: buildConfig(multiplayerLair.config.gridSize, multiplayerLair.upper.walls.length),
      walls: multiplayerLair.upper.walls,
      features: multiplayerLair.upper.features,
    };
    return getExplorableCells(upperLair, upperRevealedCells);
  }, [explorationMode, multiplayerLair, upperRevealedCells]);

  const lowerExplorableCells = useMemo(() => {
    if (!explorationMode || !multiplayerLair) return new Set<string>();
    const lowerLair: Lair = {
      config: buildConfig(multiplayerLair.config.gridSize, multiplayerLair.lower.walls.length),
      walls: multiplayerLair.lower.walls,
      features: multiplayerLair.lower.features,
    };
    return getExplorableCells(lowerLair, lowerRevealedCells);
  }, [explorationMode, multiplayerLair, lowerRevealedCells]);

  const ladderKeys = useMemo(
    () => new Set(multiplayerLair?.ladders.map(l => `${l.cell.row},${l.cell.col}`) ?? []),
    [multiplayerLair]
  );

  const totalCells = lair ? lair.config.rows * lair.config.cols : 0;

  const lairHash = lair ? encodeLair(lair) : null;

  // ── Generators ────────────────────────────────────────────────────────────

  const generate = useCallback((size: GridSize, walls: number) => {
    try {
      const config = buildConfig(size, walls);
      const newLair = generateValidLair(config);
      setLair(newLair);
      setError(null);
      setSelectedCell(null);
      if (explorationMode) {
        setRevealedCells(new Set([getStartCellKey(newLair)]));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate lair.');
    }
  }, [explorationMode]);

  const generateMpLair = useCallback((count: ExplorerCount, walls: number) => {
    try {
      const config = buildMultiplayerConfig(count, walls);
      const newLair = generateValidMultiplayerLair(config);
      setMultiplayerLair(newLair);
      setError(null);
      setSelectedCell(null);
      if (explorationMode) {
        setUpperRevealedCells(new Set(
          newLair.upper.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
        ));
        setLowerRevealedCells(new Set(
          newLair.lower.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
        ));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate multiplayer lair.');
    }
  }, [explorationMode]);

  // ── URL sync ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (appMode === 'multiplayer' && multiplayerLair) {
      window.location.hash = encodeMultiplayerLair(
        multiplayerLair,
        explorationMode ? { explorationMode, upperRevealedCells, lowerRevealedCells } : undefined
      );
    } else if (appMode === 'standard' && lair) {
      window.location.hash = encodeLair(
        lair,
        explorationMode ? { explorationMode, revealedCells } : undefined
      );
    }
  }, [appMode, lair, multiplayerLair, explorationMode, revealedCells, upperRevealedCells, lowerRevealedCells]);

  // ── On mount: decode URL hash or generate fresh ───────────────────────────

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      if (isMultiplayerHash(hash)) {
        const decoded = decodeMultiplayerLair(hash);
        if (decoded) {
          /* eslint-disable react-hooks/set-state-in-effect */
          setAppMode('multiplayer');
          setExplorerCount(decoded.config.explorerCount);
          setMpWallCount(decoded.config.wallCount);
          setMultiplayerLair(decoded);
          const expState = decodeMultiplayerExplorationState(hash);
          if (expState) {
            setExplorationMode(true);
            const { upperRevealedCells: urc, lowerRevealedCells: lrc } = expState;
            if (urc.size === 0 && lrc.size === 0) {
              setUpperRevealedCells(new Set(
                decoded.upper.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
              ));
              setLowerRevealedCells(new Set(
                decoded.lower.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
              ));
            } else {
              setUpperRevealedCells(urc);
              setLowerRevealedCells(lrc);
            }
          }
          /* eslint-enable react-hooks/set-state-in-effect */
          return;
        }
      } else {
        const decoded = decodeLair(hash);
        if (decoded) {
          setGridSize(decoded.config.gridSize);
          setWallCount(decoded.config.wallCount);
          setLair(decoded);
          const expState = decodeExplorationState(hash);
          if (expState) {
            setExplorationMode(expState.explorationMode);
            if (expState.revealedCells.size === 0) {
              setRevealedCells(new Set([getStartCellKey(decoded)]));
            } else {
              setRevealedCells(expState.revealedCells);
            }
          }
          return;
        }
      }
    }
    generate('base', DEFAULT_WALL_COUNT['base']);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAppModeChange = (mode: 'standard' | 'multiplayer') => {
    setAppMode(mode);
    setExplorationMode(false);
    setRevealedCells(new Set());
    setUpperRevealedCells(new Set());
    setLowerRevealedCells(new Set());
    setSelectedCell(null);
    if (mode === 'multiplayer') {
      generateMpLair(explorerCount, mpWallCount);
    } else {
      generate(gridSize, wallCount);
    }
  };

  const handleExplorerCountChange = (count: ExplorerCount) => {
    setExplorerCount(count);
    const range = MULTIPLAYER_WALL_RANGES[count];
    const newWalls = Math.min(Math.max(mpWallCount, range.min), range.max);
    setMpWallCount(newWalls);
    generateMpLair(count, newWalls);
  };

  const handleGridSizeChange = (size: GridSize) => {
    const range = WALL_RANGES[size];
    const newWallCount = Math.min(Math.max(wallCount, range.min), range.max);
    setGridSize(size);
    setWallCount(newWallCount);
    generate(size, newWallCount);
  };

  const handleWallCountChange = (count: number) => {
    setWallCount(count);
    generate(gridSize, count);
  };

  const handleMpWallCountChange = (count: number) => {
    setMpWallCount(count);
    generateMpLair(explorerCount, count);
  };

  const handleGenerate = () => {
    if (appMode === 'multiplayer') {
      generateMpLair(explorerCount, mpWallCount);
    } else {
      generate(gridSize, wallCount);
    }
  };

  const handleExplorationModeChange = (enabled: boolean) => {
    setExplorationMode(enabled);
    setSelectedCell(null);
    if (enabled) {
      if (appMode === 'multiplayer' && multiplayerLair) {
        setUpperRevealedCells(new Set(
          multiplayerLair.upper.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
        ));
        setLowerRevealedCells(new Set(
          multiplayerLair.lower.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
        ));
      } else if (lair) {
        setRevealedCells(new Set([getStartCellKey(lair)]));
      }
    } else {
      setRevealedCells(new Set());
      setUpperRevealedCells(new Set());
      setLowerRevealedCells(new Set());
    }
  };

  const handleResetExploration = () => {
    setSelectedCell(null);
    if (appMode === 'multiplayer' && multiplayerLair) {
      setUpperRevealedCells(new Set(
        multiplayerLair.upper.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
      ));
      setLowerRevealedCells(new Set(
        multiplayerLair.lower.features.filter(f => f.type === 'start').map(f => `${f.cell.row},${f.cell.col}`)
      ));
    } else if (lair) {
      setRevealedCells(new Set([getStartCellKey(lair)]));
    }
  };

  const handleRevealAll = () => {
    setSelectedCell(null);
    if (appMode === 'multiplayer' && multiplayerLair) {
      const { rows, cols } = multiplayerLair.config;
      const all = new Set<string>();
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          all.add(`${r},${c}`);
      setUpperRevealedCells(all);
      setLowerRevealedCells(new Set([...all]));
    } else if (lair) {
      const { rows, cols } = lair.config;
      const all = new Set<string>();
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          all.add(`${r},${c}`);
      setRevealedCells(all);
    }
  };

  const handleCellClick = (key: string) => {
    if (!explorationMode) return;

    if (appMode === 'multiplayer') {
      const isUpper = key.startsWith('u:');
      const bareKey = key.slice(2);
      const revealedSet = isUpper ? upperRevealedCells : lowerRevealedCells;
      const setRevealedSet = isUpper ? setUpperRevealedCells : setLowerRevealedCells;
      const setOtherRevealedSet = isUpper ? setLowerRevealedCells : setUpperRevealedCells;
      const explorableSet = isUpper ? upperExplorableCells : lowerExplorableCells;

      if (revealedSet.has(bareKey)) {
        setSelectedCell(null);
      } else if (key === selectedCell) {
        setRevealedSet(prev => new Set([...prev, bareKey]));
        if (ladderKeys.has(bareKey)) {
          setOtherRevealedSet(prev => new Set([...prev, bareKey]));
        }
        setSelectedCell(null);
      } else if (explorableSet.has(bareKey)) {
        setSelectedCell(key);
      } else {
        setSelectedCell(null);
      }
    } else {
      if (revealedCells.has(key)) {
        setSelectedCell(null);
      } else if (key === selectedCell) {
        setRevealedCells(prev => new Set([...prev, key]));
        setSelectedCell(null);
      } else if (explorableCells.has(key)) {
        setSelectedCell(key);
      } else {
        setSelectedCell(null);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <Controls
          appMode={appMode}
          explorerCount={explorerCount}
          onAppModeChange={handleAppModeChange}
          onExplorerCountChange={handleExplorerCountChange}
          gridSize={gridSize}
          wallCount={appMode === 'multiplayer' ? mpWallCount : wallCount}
          onGridSizeChange={handleGridSizeChange}
          onWallCountChange={appMode === 'multiplayer' ? handleMpWallCountChange : handleWallCountChange}
          onGenerate={handleGenerate}
          explorationMode={explorationMode}
          onExplorationModeChange={handleExplorationModeChange}
          onResetExploration={handleResetExploration}
          onRevealAll={handleRevealAll}
          lairHash={appMode === 'multiplayer'
            ? (multiplayerLair ? encodeMultiplayerLair(multiplayerLair) : null)
            : lairHash}
        />
        <StatusBar
          lair={appMode === 'standard' ? lair : null}
          error={error}
          explorationMode={explorationMode}
          multiplayerLair={appMode === 'multiplayer' ? multiplayerLair : null}
          revealedCells={appMode === 'multiplayer'
            ? new Set([...upperRevealedCells, ...lowerRevealedCells])
            : revealedCells}
          totalCells={appMode === 'multiplayer'
            ? (multiplayerLair ? multiplayerLair.config.rows * multiplayerLair.config.cols * 2 : 0)
            : totalCells}
        />
        {appMode === 'multiplayer' ? (
          multiplayerLair && (
            <MultiplayerView
              multiplayerLair={multiplayerLair}
              explorationMode={explorationMode}
              upperRevealedCells={explorationMode ? upperRevealedCells : undefined}
              lowerRevealedCells={explorationMode ? lowerRevealedCells : undefined}
              upperExplorableCells={explorationMode ? upperExplorableCells : undefined}
              lowerExplorableCells={explorationMode ? lowerExplorableCells : undefined}
              selectedCell={explorationMode ? selectedCell : null}
              onCellClick={handleCellClick}
            />
          )
        ) : (
          lair && (
            <LairGrid
              lair={lair}
              explorationMode={explorationMode}
              revealedCells={explorationMode ? revealedCells : undefined}
              explorableCells={explorationMode ? explorableCells : undefined}
              selectedCell={selectedCell}
              onCellClick={handleCellClick}
            />
          )
        )}
        <Legend appMode={appMode} />
      </main>
      <Footer />
    </div>
  );
}
