import { useState } from 'react';
import type { Cell, GridSize } from '../generator/types';
import { ROW_LABELS } from '../generator/config';
import {
  canClimbLadder,
  climbLadder,
  clearMark,
  createTrackerState,
  hasWall,
  moveTrackerTo,
  placeMark,
  resetTrackerSheet,
  setSheetLevel,
  toggleKnown,
  toggleWall,
} from '../generator/tracker';
import type {
  TrackerDirection,
  TrackerLevel,
  TrackerLevels,
  TrackerMark,
  TrackerSheet,
  TrackerState,
} from '../generator/tracker';
import styles from './TrackerMap.module.css';

type Tool = 'known' | 'wall' | 'tracker' | 'erase' | TrackerMark;

const TOOLS: { tool: Tool; label: string; name: string; twoLevelsOnly?: boolean }[] = [
  { tool: 'known',      label: '○',  name: 'Known' },
  { tool: 'wall',       label: '▭',  name: 'Wall' },
  { tool: 'start',      label: 'S',  name: 'Start' },
  { tool: 'exit',       label: 'X',  name: 'Exit' },
  { tool: 'chest',      label: 'C',  name: 'Chest' },
  { tool: 'monster',    label: 'M',  name: 'Monster' },
  { tool: 'trap',       label: 'T',  name: 'Trap' },
  { tool: 'ladderUp',   label: '↑',  name: 'Up Ladder', twoLevelsOnly: true },
  { tool: 'ladderDown', label: '↓',  name: 'Down Ladder', twoLevelsOnly: true },
  { tool: 'tracker',    label: '📍', name: 'Tracker' },
  { tool: 'erase',      label: '⌫',  name: 'Erase' },
];

const MARK_LABELS: Record<TrackerMark, string> = {
  start: 'S', exit: 'X', chest: 'C', monster: 'M', trap: 'T', ladderUp: '↑', ladderDown: '↓',
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

const LEVEL_TITLES: Record<TrackerLevel, string> = {
  upper: '🔼 Upper Level',
  lower: '🔽 Lower Level',
};

interface SheetProps {
  state: TrackerState;
  index: number;
  tool: Tool;
  onChange: (state: TrackerState) => void;
}

function TrackerSheetView({ state, index, tool, onChange }: SheetProps) {
  const sheet = state.sheets[index];
  const known = new Set(sheet.known);
  const colNums = Array.from({ length: sheet.cols }, (_, i) => i + 1);
  const rowIndices = Array.from({ length: sheet.rows }, (_, i) => i);

  const updateSheet = (updated: TrackerSheet) => {
    onChange({ ...state, sheets: state.sheets.map((s, i) => (i === index ? updated : s)) });
  };

  const handleCellClick = (cell: Cell) => {
    switch (tool) {
      case 'known':
        return updateSheet(toggleKnown(sheet, cell));
      case 'tracker':
        return onChange(moveTrackerTo(state, index, cell));
      case 'erase':
        return updateSheet(clearMark(sheet, cell));
      case 'wall':
        return;
      default:
        return onChange(placeMark(state, index, cell, tool));
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
            if (sheet.tracker === key) classNames.push(styles.cellTracker);
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
                {sheet.tracker === key && <div className={styles.tracker} title="Tracker">📍</div>}
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
                        updateSheet(toggleWall(sheet, cell, dir));
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
  const [selectedTool, setSelectedTool] = useState<Tool>('known');
  const twoLevels = state.levels === 2;
  const tools = TOOLS.filter(t => twoLevels || !t.twoLevelsOnly);
  // Ladder tools disappear in 1-level mode; fall back if one was selected.
  const tool: Tool = tools.some(t => t.tool === selectedTool) ? selectedTool : 'known';
  const climbFrom = state.sheets.findIndex((_, i) => canClimbLadder(state, i));

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
        {tools.map(t => (
          <button
            key={t.tool}
            className={`${styles.toolBtn} ${tool === t.tool ? styles.toolActive : ''}`}
            onClick={() => setSelectedTool(t.tool)}
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

      {twoLevels && (
        <div className={styles.ladderBar}>
          <button
            className={styles.climbBtn}
            disabled={climbFrom === -1}
            onClick={() => onChange(climbLadder(state, climbFrom))}
          >
            🪜 Climb Ladder
          </button>
          <span className={styles.hint}>
            {climbFrom === -1
              ? 'Move your Tracker onto a Ladder to climb to the other map.'
              : 'Moves your Tracker to the same space on the other map.'}
          </span>
        </div>
      )}

      <div className={styles.sheets}>
        {state.sheets.map((sheet, i) => (
          <div key={i} className={styles.sheetSection}>
            {twoLevels && (
              <div className={styles.levelHeader}>
                <span className={styles.levelLabel}>
                  {sheet.level ? LEVEL_TITLES[sheet.level] : `Map ${i + 1} · level unknown`}
                </span>
                <div className={`${styles.toggle} ${styles.levelToggle}`} role="group" aria-label={`Level of map ${i + 1}`}>
                  {([null, 'upper', 'lower'] as (TrackerLevel | null)[]).map(level => (
                    <button
                      key={level ?? 'unknown'}
                      className={`${styles.toggleBtn} ${sheet.level === level ? styles.active : ''}`}
                      onClick={() => onChange(setSheetLevel(state, i, level))}
                    >
                      {level === null ? '?' : level === 'upper' ? 'Upper' : 'Lower'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <TrackerSheetView state={state} index={i} tool={tool} onChange={onChange} />
          </div>
        ))}
      </div>
    </div>
  );
}
