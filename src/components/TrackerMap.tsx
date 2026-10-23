import { useState } from 'react';
import type { Cell, FeatureType, GridSize } from '../generator/types';
import { ROW_LABELS } from '../generator/config';
import {
  clearMark,
  createTrackerState,
  hasWall,
  moveTracker,
  resetTrackerSheet,
  toggleKnown,
  toggleMark,
  toggleWall,
} from '../generator/tracker';
import type { TrackerDirection, TrackerLevels, TrackerSheet, TrackerState } from '../generator/tracker';
import styles from './TrackerMap.module.css';

type Tool = 'known' | 'wall' | 'tracker' | 'erase' | FeatureType;

const TOOLS: { tool: Tool; label: string; name: string }[] = [
  { tool: 'known',   label: '○',  name: 'Known' },
  { tool: 'wall',    label: '▭',  name: 'Wall' },
  { tool: 'start',   label: 'S',  name: 'Start' },
  { tool: 'exit',    label: 'X',  name: 'Exit' },
  { tool: 'chest',   label: 'C',  name: 'Chest' },
  { tool: 'monster', label: 'M',  name: 'Monster' },
  { tool: 'trap',    label: 'T',  name: 'Trap' },
  { tool: 'tracker', label: '📍', name: 'Tracker' },
  { tool: 'erase',   label: '⌫',  name: 'Erase' },
];

const MARK_LABELS: Record<FeatureType, string> = {
  start: 'S', exit: 'X', chest: 'C', monster: 'M', trap: 'T',
};

const DIRECTIONS: TrackerDirection[] = ['north', 'south', 'east', 'west'];

const WALL_CLASS: Record<TrackerDirection, string> = {
  north: styles.wallNorth,
  south: styles.wallSouth,
  east: styles.wallEast,
  west: styles.wallWest,
};

const EDGE_CLASS: Record<TrackerDirection, string> = {
  north: styles.edgeNorth,
  south: styles.edgeSouth,
  east: styles.edgeEast,
  west: styles.edgeWest,
};

const LEVEL_LABELS = ['🔼 Upper Level', '🔽 Lower Level'];

interface SheetProps {
  sheet: TrackerSheet;
  tool: Tool;
  onChange: (sheet: TrackerSheet) => void;
}

function TrackerSheetView({ sheet, tool, onChange }: SheetProps) {
  const known = new Set(sheet.known);
  const colNums = Array.from({ length: sheet.cols }, (_, i) => i + 1);
  const rowIndices = Array.from({ length: sheet.rows }, (_, i) => i);

  const handleCellClick = (cell: Cell) => {
    switch (tool) {
      case 'known':
        return onChange(toggleKnown(sheet, cell));
      case 'tracker':
        return onChange(moveTracker(sheet, cell));
      case 'erase':
        return onChange(clearMark(sheet, cell));
      case 'wall':
        return;
      default:
        return onChange(toggleMark(sheet, cell, tool));
    }
  };

  return (
    <div className={styles.sheet}>
      <div className={styles.columnLabels}>
        {colNums.map(col => (
          <div key={col} className={styles.columnLabel}>{col}</div>
        ))}
      </div>
      {rowIndices.map(r => (
        <div key={r} className={styles.gridRow}>
          <div className={styles.rowLabel}>{ROW_LABELS[r]}</div>
          {colNums.map((_, c) => {
            const cell = { row: r, col: c };
            const key = `${r},${c}`;
            const mark = sheet.marks[key];
            const classNames = [styles.cell];
            for (const dir of DIRECTIONS) {
              if (hasWall(sheet, cell, dir)) classNames.push(WALL_CLASS[dir]);
            }
            if (r === 0) classNames.push(EDGE_CLASS.north);
            if (r === sheet.rows - 1) classNames.push(EDGE_CLASS.south);
            if (c === 0) classNames.push(EDGE_CLASS.west);
            if (c === sheet.cols - 1) classNames.push(EDGE_CLASS.east);

            return (
              <div
                key={c}
                className={classNames.join(' ')}
                onClick={() => handleCellClick(cell)}
                aria-label={`${ROW_LABELS[r]}${c + 1}`}
              >
                {known.has(key) && <div className={styles.knownCircle} />}
                {mark && (
                  <div className={`${styles.mark} ${styles[`mark_${mark}`]}`}>{MARK_LABELS[mark]}</div>
                )}
                {sheet.tracker === key && <div className={styles.tracker}>📍</div>}
                {tool === 'wall' && DIRECTIONS.map(dir => {
                  const isPerimeter =
                    (dir === 'north' && r === 0) ||
                    (dir === 'south' && r === sheet.rows - 1) ||
                    (dir === 'west' && c === 0) ||
                    (dir === 'east' && c === sheet.cols - 1);
                  if (isPerimeter) return null;
                  return (
                    <button
                      key={dir}
                      type="button"
                      className={`${styles.edgeBtn} ${styles[`edgeBtn_${dir}`]}`}
                      aria-label={`Toggle ${dir} wall of ${ROW_LABELS[r]}${c + 1}`}
                      onClick={e => {
                        e.stopPropagation();
                        onChange(toggleWall(sheet, cell, dir));
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface Props {
  state: TrackerState;
  onChange: (state: TrackerState) => void;
}

export function TrackerMap({ state, onChange }: Props) {
  const [tool, setTool] = useState<Tool>('known');

  const updateSheet = (index: number, sheet: TrackerSheet) => {
    onChange({ ...state, sheets: state.sheets.map((s, i) => (i === index ? sheet : s)) });
  };

  const changeLayout = (gridSize: GridSize, levels: TrackerLevels) => {
    if (gridSize === state.gridSize && levels === state.levels) return;
    onChange(createTrackerState(gridSize, levels));
  };

  const handleResetAll = () => {
    if (window.confirm('Clear everything drawn on the tracker map?')) {
      onChange({ ...state, sheets: state.sheets.map(resetTrackerSheet) });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.options}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Map Size</span>
          <div className={styles.toggle}>
            <button
              className={`${styles.toggleBtn} ${state.gridSize === 'base' ? styles.active : ''}`}
              onClick={() => changeLayout('base', state.levels)}
            >
              6×6 Base
            </button>
            <button
              className={`${styles.toggleBtn} ${state.gridSize === 'big' ? styles.active : ''}`}
              onClick={() => changeLayout('big', state.levels)}
            >
              8×6 Big
            </button>
          </div>
        </div>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Levels</span>
          <div className={styles.toggle}>
            <button
              className={`${styles.toggleBtn} ${state.levels === 1 ? styles.active : ''}`}
              onClick={() => changeLayout(state.gridSize, 1)}
            >
              1 Level
            </button>
            <button
              className={`${styles.toggleBtn} ${state.levels === 2 ? styles.active : ''}`}
              onClick={() => changeLayout(state.gridSize, 2)}
            >
              2 Levels
            </button>
          </div>
        </div>
        <div className={styles.group}>
          <span className={styles.groupLabel}>&nbsp;</span>
          <button className={styles.resetBtn} onClick={handleResetAll}>↺ Clear Map</button>
        </div>
      </div>

      <div className={styles.palette} role="toolbar" aria-label="Map tools">
        {TOOLS.map(t => (
          <button
            key={t.tool}
            className={`${styles.toolBtn} ${tool === t.tool ? styles.toolActive : ''}`}
            onClick={() => setTool(t.tool)}
            aria-pressed={tool === t.tool}
            title={t.name}
          >
            <span className={styles.toolIcon}>{t.label}</span>
            <span className={styles.toolName}>{t.name}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>
        {tool === 'wall'
          ? 'Tap an edge between two spaces to draw or erase a wall.'
          : tool === 'known'
            ? 'Tap a space to mark it Known (or unmark it).'
            : tool === 'tracker'
              ? 'Tap a space to move your Tracker there.'
              : tool === 'erase'
                ? 'Tap a space to remove its feature.'
                : 'Tap a space to place this feature (tap again to remove).'}
      </p>

      <div className={styles.sheets}>
        {state.sheets.map((sheet, i) => (
          <div key={i} className={styles.sheetSection}>
            {state.levels === 2 && <span className={styles.levelLabel}>{LEVEL_LABELS[i]}</span>}
            <TrackerSheetView sheet={sheet} tool={tool} onChange={s => updateSheet(i, s)} />
          </div>
        ))}
      </div>
    </div>
  );
}
