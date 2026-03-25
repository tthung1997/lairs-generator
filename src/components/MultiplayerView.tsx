import { useMemo } from 'react';
import type { MultiplayerLair, MultiplayerLairConfig, LairLevel, Lair } from '../generator/types';
import { LairGrid } from './LairGrid';
import styles from './MultiplayerView.module.css';

function levelToLair(level: LairLevel, config: MultiplayerLairConfig): Lair {
  return {
    config: {
      gridSize: config.gridSize,
      rows: config.rows,
      cols: config.cols,
      wallCount: level.walls.length,
      monsters: config.monsters,
      traps: config.traps,
      chests: config.chests,
    },
    walls: level.walls,
    features: level.features,
  };
}

interface Props {
  multiplayerLair: MultiplayerLair;
  explorationMode?: boolean;
  upperRevealedCells?: Set<string>;
  lowerRevealedCells?: Set<string>;
  upperExplorableCells?: Set<string>;
  lowerExplorableCells?: Set<string>;
  selectedCell?: string | null;
  onCellClick?: (levelKey: string) => void;
}

export function MultiplayerView({
  multiplayerLair,
  explorationMode,
  upperRevealedCells,
  lowerRevealedCells,
  upperExplorableCells,
  lowerExplorableCells,
  selectedCell,
  onCellClick,
}: Props) {
  const { config, upper, lower, ladders } = multiplayerLair;

  const upperLair = useMemo(() => levelToLair(upper, config), [upper, config]);
  const lowerLair = useMemo(() => levelToLair(lower, config), [lower, config]);

  const upperLadderCells = useMemo(() => {
    const map = new Map<string, { direction: 'up' | 'down'; pairIndex: number }>();
    ladders.forEach((pair, i) => {
      map.set(`${pair.cell.row},${pair.cell.col}`, { direction: 'down', pairIndex: i });
    });
    return map;
  }, [ladders]);

  const lowerLadderCells = useMemo(() => {
    const map = new Map<string, { direction: 'up' | 'down'; pairIndex: number }>();
    ladders.forEach((pair, i) => {
      map.set(`${pair.cell.row},${pair.cell.col}`, { direction: 'up', pairIndex: i });
    });
    return map;
  }, [ladders]);

  const upperSelected = selectedCell?.startsWith('u:')
    ? selectedCell.slice(2)
    : null;

  const lowerSelected = selectedCell?.startsWith('l:')
    ? selectedCell.slice(2)
    : null;

  const handleUpperClick = onCellClick
    ? (key: string) => onCellClick(`u:${key}`)
    : undefined;

  const handleLowerClick = onCellClick
    ? (key: string) => onCellClick(`l:${key}`)
    : undefined;

  return (
    <div className={styles.container}>
      <div className={styles.levelSection}>
        <span className={styles.levelLabel}>🔼 Upper Level</span>
        <LairGrid
          lair={upperLair}
          explorationMode={explorationMode}
          revealedCells={upperRevealedCells}
          explorableCells={upperExplorableCells}
          selectedCell={upperSelected}
          onCellClick={handleUpperClick}
          ladderCells={upperLadderCells}
        />
      </div>
      <div className={styles.levelSection}>
        <span className={styles.levelLabel}>🔽 Lower Level</span>
        <LairGrid
          lair={lowerLair}
          explorationMode={explorationMode}
          revealedCells={lowerRevealedCells}
          explorableCells={lowerExplorableCells}
          selectedCell={lowerSelected}
          onCellClick={handleLowerClick}
          ladderCells={lowerLadderCells}
        />
      </div>
    </div>
  );
}
