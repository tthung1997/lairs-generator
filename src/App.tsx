import { useState, useCallback, useEffect } from 'react';
import type { GridSize, Lair } from './generator/types';
import { buildConfig, DEFAULT_WALL_COUNT, WALL_RANGES } from './generator/config';
import { generateValidLair } from './generator/generator';
import { encodeLair, decodeLair } from './generator/serializer';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { LairGrid } from './components/LairGrid';
import { StatusBar } from './components/StatusBar';
import { Legend } from './components/Legend';
import styles from './App.module.css';

export default function App() {
  const [gridSize, setGridSize] = useState<GridSize>('base');
  const [wallCount, setWallCount] = useState(DEFAULT_WALL_COUNT['base']);
  const [lair, setLair] = useState<Lair | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback((size: GridSize, walls: number) => {
    try {
      const config = buildConfig(size, walls);
      const newLair = generateValidLair(config);
      setLair(newLair);
      setError(null);
      window.location.hash = encodeLair(newLair);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate lair.');
    }
  }, []);

  // On mount: try to decode URL hash, else generate fresh
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const decoded = decodeLair(hash);
      if (decoded) {
        setGridSize(decoded.config.gridSize);
        setWallCount(decoded.config.wallCount);
        setLair(decoded);
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
        />
        <StatusBar lair={lair} error={error} />
        {lair && <LairGrid lair={lair} />}
        <Legend />
      </main>
    </div>
  );
}
