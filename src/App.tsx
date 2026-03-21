import { useState, useCallback, useEffect } from 'react';
import type { GridSize, Lair } from './generator/types';
import { buildConfig, DEFAULT_WALL_COUNT, WALL_RANGES } from './generator/config';
import { generateValidLair } from './generator/generator';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { LairGrid } from './components/LairGrid';
import { StatusBar } from './components/StatusBar';
import { Legend } from './components/Legend';
import styles from './App.module.css';

function encodeLair(lair: Lair): string {
  const { config, walls, features } = lair;
  const gs = config.gridSize === 'base' ? 'b' : 'B';
  const wc = config.wallCount;
  const fs = features
    .map(f => {
      const t = { start: 's', exit: 'x', chest: 'c', monster: 'm', trap: 't' }[f.type];
      return `${f.cell.row}${f.cell.col}${t}`;
    })
    .join('');
  const ws = walls
    .map(w => `${w.cell.row}${w.cell.col}${w.direction === 'south' ? 's' : 'e'}`)
    .join('');
  return `${gs}:${wc}:${fs}:${ws}`;
}

function decodeLair(hash: string): Lair | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const [gs, wcStr, fs, ws] = raw.split(':');
    const gridSize: GridSize = gs === 'b' ? 'base' : 'big';
    const wallCount = parseInt(wcStr, 10);
    const config = buildConfig(gridSize, wallCount);

    const featureTypeMap: Record<string, import('./generator/types').FeatureType> = {
      s: 'start', x: 'exit', c: 'chest', m: 'monster', t: 'trap',
    };
    const features: import('./generator/types').Feature[] = [];
    for (let i = 0; i + 2 < fs.length; i += 3) {
      const row = parseInt(fs[i], 10);
      const col = parseInt(fs[i + 1], 10);
      const type = featureTypeMap[fs[i + 2]];
      if (type) features.push({ type, cell: { row, col } });
    }

    const walls: import('./generator/types').Wall[] = [];
    if (ws) {
      for (let i = 0; i + 2 < ws.length; i += 3) {
        const row = parseInt(ws[i], 10);
        const col = parseInt(ws[i + 1], 10);
        const direction = ws[i + 2] === 's' ? 'south' : 'east';
        walls.push({ cell: { row, col }, direction });
      }
    }

    return { config, walls, features };
  } catch {
    return null;
  }
}

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
