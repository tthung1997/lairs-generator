import type { Lair, Wall } from '../generator/types';
import { ROW_LABELS } from '../generator/config';
import styles from './LairGrid.module.css';

interface Props {
  lair: Lair;
  explorationMode?: boolean;
  revealedCells?: Set<string>;
  explorableCells?: Set<string>;
  selectedCell?: string | null;
  onCellClick?: (key: string) => void;
  ladderCells?: Map<string, { direction: 'up' | 'down'; pairIndex: number }>;
}

function buildWallSets(walls: Wall[]): { south: Set<string>; east: Set<string> } {
  const south = new Set<string>();
  const east = new Set<string>();
  for (const w of walls) {
    const key = `${w.cell.row},${w.cell.col}`;
    if (w.direction === 'south') south.add(key);
    else east.add(key);
  }
  return { south, east };
}

const FEATURE_LABELS: Record<string, string> = {
  start: 'S', exit: 'X', chest: 'C', monster: 'M', trap: 'T',
};

const FEATURE_STYLE: Record<string, string> = {
  start:   styles.featureStart,
  exit:    styles.featureExit,
  chest:   styles.featureChest,
  monster: styles.featureMonster,
  trap:    styles.featureTrap,
};

export function LairGrid({ lair, explorationMode, revealedCells, explorableCells, selectedCell, onCellClick, ladderCells }: Props) {
  const { config, walls, features } = lair;
  const { rows, cols } = config;
  const { south: southWalls, east: eastWalls } = buildWallSets(walls);

  // Build feature lookup: "row,col" -> feature type
  const featureMap = new Map<string, string>();
  for (const f of features) {
    featureMap.set(`${f.cell.row},${f.cell.col}`, f.type);
  }

  const colNums = Array.from({ length: cols }, (_, i) => i + 1);
  const rowIndices = Array.from({ length: rows }, (_, i) => i);

  return (
    <div className={styles.wrapper}>
      {/* Column labels */}
      <div className={styles.columnLabels}>
        {colNums.map(col => (
          <div key={col} className={styles.columnLabel}>{col}</div>
        ))}
      </div>

      {/* Grid body */}
      <div className={styles.gridBody}>
        {rowIndices.map(r => (
          <div key={r} className={styles.gridRow}>
            <div className={styles.rowLabel}>{ROW_LABELS[r]}</div>
            {colNums.map((_, c) => {
              const cellKey = `${r},${c}`;
              const featureType = featureMap.get(cellKey);

              const isRevealed = !explorationMode || (revealedCells?.has(cellKey) ?? false);
              const isExplorable = explorationMode && (explorableCells?.has(cellKey) ?? false);
              const isSelected = explorationMode && cellKey === selectedCell;
              const isHidden = explorationMode && !isRevealed && !isExplorable;

              // Determine wall classes
              const classNames = [styles.cell];
              if (r === 0) classNames.push(styles.edgeNorth);
              if (r === rows - 1) classNames.push(styles.edgeSouth);
              if (c === 0) classNames.push(styles.edgeWest);
              if (c === cols - 1) classNames.push(styles.edgeEast);

              if (isHidden) {
                classNames.push(styles.cellHidden);
              } else if (isExplorable) {
                // Explorable cells show no internal walls — their contents are unknown
                classNames.push(styles.cellExplorable);
                if (isSelected) classNames.push(styles.cellSelected);
              } else {
                // Revealed cells: walls bordering another revealed cell are normal;
                // walls bordering fog (unexplored) are red.
                const southNeighborRevealed = !explorationMode || (revealedCells?.has(`${r + 1},${c}`) ?? true);
                const eastNeighborRevealed  = !explorationMode || (revealedCells?.has(`${r},${c + 1}`) ?? true);
                const northNeighborRevealed = !explorationMode || (revealedCells?.has(`${r - 1},${c}`) ?? true);
                const westNeighborRevealed  = !explorationMode || (revealedCells?.has(`${r},${c - 1}`) ?? true);

                if (southWalls.has(cellKey))
                  classNames.push(southNeighborRevealed ? styles.wallSouth : styles.wallSouthFog);
                if (eastWalls.has(cellKey))
                  classNames.push(eastNeighborRevealed ? styles.wallEast : styles.wallEastFog);
                if (r > 0 && southWalls.has(`${r - 1},${c}`))
                  classNames.push(northNeighborRevealed ? styles.wallNorth : styles.wallNorthFog);
                if (c > 0 && eastWalls.has(`${r},${c - 1}`))
                  classNames.push(westNeighborRevealed ? styles.wallWest : styles.wallWestFog);
              }

              const handleClick = onCellClick ? () => onCellClick(cellKey) : undefined;

              return (
                <div key={c} className={classNames.join(' ')} onClick={handleClick}>
                  {isHidden ? null : isExplorable ? (
                    <span className={isSelected ? styles.selectedLabel : styles.explorableLabel}>?</span>
                  ) : featureType && isRevealed ? (
                    <div className={`${styles.feature} ${FEATURE_STYLE[featureType]}`}>
                      {FEATURE_LABELS[featureType]}
                    </div>
                  ) : isRevealed && ladderCells?.has(cellKey) ? (() => {
                    const ladder = ladderCells.get(cellKey)!;
                    return (
                      <div className={`${styles.feature} ${styles.featureLadder} ${styles[`ladderColor${ladder.pairIndex}`]}`}>
                        {ladder.direction === 'up' ? '↑' : '↓'}
                      </div>
                    );
                  })() : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
