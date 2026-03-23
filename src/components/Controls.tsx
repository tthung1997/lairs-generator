import { useState } from 'react';
import type { GridSize } from '../generator/types';
import { WALL_RANGES } from '../generator/config';
import styles from './Controls.module.css';

interface Props {
  gridSize: GridSize;
  wallCount: number;
  onGridSizeChange: (size: GridSize) => void;
  onWallCountChange: (count: number) => void;
  onGenerate: () => void;
  explorationMode: boolean;
  onExplorationModeChange: (enabled: boolean) => void;
  onResetExploration: () => void;
  onRevealAll: () => void;
  lairHash: string | null; // base lair hash without exploration state, for copying
}

export function Controls({
  gridSize,
  wallCount,
  onGridSizeChange,
  onWallCountChange,
  onGenerate,
  explorationMode,
  onExplorationModeChange,
  onResetExploration,
  onRevealAll,
  lairHash,
}: Props) {
  const range = WALL_RANGES[gridSize];
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedType, setCopiedType] = useState<'full' | 'explore' | null>(null);

  const handleCopy = (type: 'full' | 'explore') => {
    if (!lairHash) return;
    const hash = type === 'explore' ? `${lairHash}:e:` : lairHash;
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    setShowDropdown(false);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {
      window.prompt('Copy this link:', url);
    });
  };

  const shareLabel = copiedType === 'full'
    ? '✓ Full View Copied!'
    : copiedType === 'explore'
      ? '✓ Explore Copied!'
      : '📋 Share';

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

      {/* Generate + Share buttons */}
      <div className={styles.group}>
        <label className={styles.label}>&nbsp;</label>
        <div className={styles.buttonRow}>
          <button className={styles.generateBtn} onClick={onGenerate}>
            🎲 Generate New Lair
          </button>
          {lairHash && (
            <div
              className={styles.shareWrapper}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            >
              <button
                className={`${styles.copyBtn} ${copiedType ? styles.copyBtnCopied : ''}`}
                onClick={() => setShowDropdown(prev => !prev)}
                title="Share this lair"
              >
                {shareLabel} ▾
              </button>
              {showDropdown && (
                <div className={styles.dropdown}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => handleCopy('full')}
                  >
                    👁 Copy Full View Link
                  </button>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => handleCopy('explore')}
                  >
                    🗺 Copy Explore Link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className={styles.group}>
        <label className={styles.label}>Mode</label>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${!explorationMode ? styles.active : ''}`}
            onClick={() => onExplorationModeChange(false)}
          >
            👁 Full View
          </button>
          <button
            className={`${styles.toggleBtn} ${explorationMode ? styles.active : ''}`}
            onClick={() => onExplorationModeChange(true)}
          >
            🗺 Explore
          </button>
        </div>
        {explorationMode && (
          <div className={styles.explorationActions}>
            <button className={styles.actionBtn} onClick={onResetExploration}>↺ Reset</button>
            <button className={styles.actionBtn} onClick={onRevealAll}>Show All</button>
          </div>
        )}
      </div>
    </div>
  );
}
