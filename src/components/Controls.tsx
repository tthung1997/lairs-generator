import type { GridSize } from '../generator/types';
import { WALL_RANGES } from '../generator/config';
import styles from './Controls.module.css';

interface Props {
  gridSize: GridSize;
  wallCount: number;
  onGridSizeChange: (size: GridSize) => void;
  onWallCountChange: (count: number) => void;
  onGenerate: () => void;
}

export function Controls({
  gridSize,
  wallCount,
  onGridSizeChange,
  onWallCountChange,
  onGenerate,
}: Props) {
  const range = WALL_RANGES[gridSize];

  return (
    <div className={styles.controls}>
      {/* Grid size toggle */}
      <div className={styles.group}>
        <label className={styles.label}>Lair Size</label>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${gridSize === 'base' ? styles.active : ''}`}
            onClick={() => onGridSizeChange('base')}
          >
            6×6 Base
          </button>
          <button
            className={`${styles.toggleBtn} ${gridSize === 'big' ? styles.active : ''}`}
            onClick={() => onGridSizeChange('big')}
          >
            8×6 Big
          </button>
        </div>
      </div>

      {/* Wall count slider */}
      <div className={styles.group}>
        <label className={styles.label}>
          Walls: <strong>{wallCount}</strong>
          <span className={styles.range}> ({range.min}–{range.max})</span>
        </label>
        <input
          type="range"
          min={range.min}
          max={range.max}
          value={wallCount}
          onChange={e => onWallCountChange(Number(e.target.value))}
          className={styles.slider}
        />
      </div>

      {/* Generate button */}
      <button className={styles.generateBtn} onClick={onGenerate}>
        🎲 Generate New Lair
      </button>
    </div>
  );
}
