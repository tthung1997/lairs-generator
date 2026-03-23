import { useState, useCallback, useEffect, useMemo } from 'react';
import type { GridSize, Lair } from './generator/types';
import { buildConfig, DEFAULT_WALL_COUNT, WALL_RANGES } from './generator/config';
import { generateValidLair } from './generator/generator';
import { encodeLair, decodeLair, decodeExplorationState } from './generator/serializer';
import { getExplorableCells, getStartCellKey } from './generator/exploration';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { LairGrid } from './components/LairGrid';
import { StatusBar } from './components/StatusBar';
import { Legend } from './components/Legend';
import { Footer } from './components/Footer';
import styles from './App.module.css';

export default function App() {
  const [gridSize, setGridSize] = useState<GridSize>('base');
  const [wallCount, setWallCount] = useState(DEFAULT_WALL_COUNT['base']);
  const [lair, setLair] = useState<Lair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explorationMode, setExplorationMode] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const explorableCells = useMemo(
    () => explorationMode && lair ? getExplorableCells(lair, revealedCells) : new Set<string>(),
    [lair, explorationMode, revealedCells]
  );

  const generate = useCallback((size: GridSize, walls: number) => {
    try {
      const config = buildConfig(size, walls);
      const newLair = generateValidLair(config);
      setLair(newLair);
      setError(null);
      setSelectedCell(null);
      if (explorationMode) {
        const startKey = getStartCellKey(newLair);
        setRevealedCells(new Set([startKey]));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate lair.');
    }
  }, [explorationMode]);

  // Update URL whenever lair or exploration state changes
  useEffect(() => {
    if (lair) {
      window.location.hash = encodeLair(
        lair,
        explorationMode ? { explorationMode, revealedCells } : undefined
      );
    }
  }, [lair, explorationMode, revealedCells]);

  // On mount: try to decode URL hash, else generate fresh.
  // Multiple setState calls here are intentional one-time initialisation from URL;
  // React 18 batches them into a single render.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const decoded = decodeLair(hash);
      if (decoded) {
        /* eslint-disable react-hooks/set-state-in-effect */
        setGridSize(decoded.config.gridSize);
        setWallCount(decoded.config.wallCount);
        setLair(decoded);
        const expState = decodeExplorationState(hash);
        if (expState) {
          setExplorationMode(expState.explorationMode);
          // Fresh explore link: no revealed cells yet — auto-reveal start cell
          if (expState.revealedCells.size === 0 && decoded) {
            setRevealedCells(new Set([getStartCellKey(decoded)]));
          } else {
            setRevealedCells(expState.revealedCells);
          }
        }
        /* eslint-enable react-hooks/set-state-in-effect */
        return;
      }
    }
    generate('base', DEFAULT_WALL_COUNT['base']);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleExplorationModeChange = (enabled: boolean) => {
    setExplorationMode(enabled);
    setSelectedCell(null);
    if (enabled && lair) {
      const startKey = getStartCellKey(lair);
      setRevealedCells(new Set([startKey]));
    } else {
      setRevealedCells(new Set());
    }
  };

  const handleResetExploration = () => {
    setSelectedCell(null);
    if (lair) {
      const startKey = getStartCellKey(lair);
      setRevealedCells(new Set([startKey]));
    }
  };

  const handleRevealAll = () => {
    if (!lair) return;
    const { rows, cols } = lair.config;
    const all = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        all.add(`${r},${c}`);
      }
    }
    setRevealedCells(all);
    setSelectedCell(null);
  };

  const handleCellClick = (key: string) => {
    if (!explorationMode) return;
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
  };

  const totalCells = lair ? lair.config.rows * lair.config.cols : 0;

  // Base lair hash without exploration state — used for "Copy Lair Link"
  const lairHash = lair ? encodeLair(lair) : null;

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <Controls
          gridSize={gridSize}
          wallCount={wallCount}
          onGridSizeChange={handleGridSizeChange}
          onWallCountChange={handleWallCountChange}
          onGenerate={() => generate(gridSize, wallCount)}
          explorationMode={explorationMode}
          onExplorationModeChange={handleExplorationModeChange}
          onResetExploration={handleResetExploration}
          onRevealAll={handleRevealAll}
          lairHash={lairHash}
        />
        <StatusBar
          lair={lair}
          error={error}
          explorationMode={explorationMode}
          revealedCells={revealedCells}
          totalCells={totalCells}
        />
        {lair && (
          <LairGrid
            lair={lair}
            explorationMode={explorationMode}
            revealedCells={revealedCells}
            explorableCells={explorableCells}
            selectedCell={selectedCell}
            onCellClick={handleCellClick}
          />
        )}
        <Legend />
      </main>
      <Footer />
    </div>
  );
}
