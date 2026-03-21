import type { Lair, Wall } from '../generator/types';
import { ROW_LABELS } from '../generator/config';
import styles from './LairGrid.module.css';

interface Props {
  lair: Lair;
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

export function LairGrid({ lair }: Props) {
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

              // Determine wall classes
              const classNames = [styles.cell];
              if (r === 0) classNames.push(styles.edgeNorth);
              if (r === rows - 1) classNames.push(styles.edgeSouth);
              if (c === 0) classNames.push(styles.edgeWest);
              if (c === cols - 1) classNames.push(styles.edgeEast);

              // Internal walls on this cell's south edge
              if (southWalls.has(cellKey)) classNames.push(styles.wallSouth);
              // Internal walls on this cell's east edge
              if (eastWalls.has(cellKey)) classNames.push(styles.wallEast);
              // Internal walls from the cell above (its south = this cell's north)
              if (r > 0 && southWalls.has(`${r - 1},${c}`)) classNames.push(styles.wallNorth);
              // Internal walls from the cell to the left (its east = this cell's west)
              if (c > 0 && eastWalls.has(`${r},${c - 1}`)) classNames.push(styles.wallWest);

              return (
                <div key={c} className={classNames.join(' ')}>
                  {featureType && (
                    <div className={`${styles.feature} ${FEATURE_STYLE[featureType]}`}>
                      {FEATURE_LABELS[featureType]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
