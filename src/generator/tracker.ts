import type { Cell, FeatureType, GridSize } from './types';
import { buildConfig } from './config';
import { cellKey } from './graph';

export type TrackerDirection = 'north' | 'south' | 'east' | 'west';
export type TrackerLevels = 1 | 2;

// One paper "map sheet": what an Explorer has drawn so far.
// Walls use the south/east-only convention: "row,col,s" or "row,col,e".
export interface TrackerSheet {
  rows: number;
  cols: number;
  known: string[];
  walls: string[];
  marks: Record<string, FeatureType>;
  tracker: string | null;
}

export interface TrackerState {
  gridSize: GridSize;
  levels: TrackerLevels;
  sheets: TrackerSheet[];
}

export function createTrackerSheet(rows: number, cols: number): TrackerSheet {
  return { rows, cols, known: [], walls: [], marks: {}, tracker: null };
}

export function createTrackerState(gridSize: GridSize, levels: TrackerLevels): TrackerState {
  const { rows, cols } = buildConfig(gridSize, 0);
  return {
    gridSize,
    levels,
    sheets: Array.from({ length: levels }, () => createTrackerSheet(rows, cols)),
  };
}

function inBounds(sheet: TrackerSheet, cell: Cell): boolean {
  return cell.row >= 0 && cell.row < sheet.rows && cell.col >= 0 && cell.col < sheet.cols;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

export function wallKey(cell: Cell, direction: 'south' | 'east'): string {
  return `${cellKey(cell)},${direction === 'south' ? 's' : 'e'}`;
}

// North/west edges are stored as the neighbour's south/east edge.
// Returns null for the outer perimeter, which is always a wall.
export function normalizeWall(
  sheet: TrackerSheet,
  cell: Cell,
  direction: TrackerDirection
): string | null {
  if (!inBounds(sheet, cell)) return null;
  switch (direction) {
    case 'south':
      return cell.row < sheet.rows - 1 ? wallKey(cell, 'south') : null;
    case 'east':
      return cell.col < sheet.cols - 1 ? wallKey(cell, 'east') : null;
    case 'north':
      return cell.row > 0 ? wallKey({ row: cell.row - 1, col: cell.col }, 'south') : null;
    case 'west':
      return cell.col > 0 ? wallKey({ row: cell.row, col: cell.col - 1 }, 'east') : null;
  }
}

export function hasWall(sheet: TrackerSheet, cell: Cell, direction: TrackerDirection): boolean {
  const key = normalizeWall(sheet, cell, direction);
  return key !== null && sheet.walls.includes(key);
}

export function toggleKnown(sheet: TrackerSheet, cell: Cell): TrackerSheet {
  if (!inBounds(sheet, cell)) return sheet;
  return { ...sheet, known: toggle(sheet.known, cellKey(cell)) };
}

export function toggleWall(
  sheet: TrackerSheet,
  cell: Cell,
  direction: TrackerDirection
): TrackerSheet {
  const key = normalizeWall(sheet, cell, direction);
  if (key === null) return sheet;
  return { ...sheet, walls: toggle(sheet.walls, key) };
}

// Placing the feature that is already in the space removes it.
export function toggleMark(sheet: TrackerSheet, cell: Cell, mark: FeatureType): TrackerSheet {
  if (!inBounds(sheet, cell)) return sheet;
  const key = cellKey(cell);
  const marks = { ...sheet.marks };
  if (marks[key] === mark) delete marks[key];
  else marks[key] = mark;
  return { ...sheet, marks };
}

export function clearMark(sheet: TrackerSheet, cell: Cell): TrackerSheet {
  const key = cellKey(cell);
  if (!(key in sheet.marks)) return sheet;
  const marks = { ...sheet.marks };
  delete marks[key];
  return { ...sheet, marks };
}

export function moveTracker(sheet: TrackerSheet, cell: Cell): TrackerSheet {
  if (!inBounds(sheet, cell)) return sheet;
  return { ...sheet, tracker: cellKey(cell) };
}

export function resetTrackerSheet(sheet: TrackerSheet): TrackerSheet {
  return createTrackerSheet(sheet.rows, sheet.cols);
}

const FEATURE_TYPES: readonly string[] = ['start', 'exit', 'chest', 'monster', 'trap'];
const CELL_KEY = /^(\d+),(\d+)$/;
const WALL_KEY = /^(\d+),(\d+),[se]$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function cellKeyInBounds(key: string, rows: number, cols: number): boolean {
  const m = CELL_KEY.exec(key) ?? WALL_KEY.exec(key);
  return m !== null && Number(m[1]) < rows && Number(m[2]) < cols;
}

function parseSheet(value: unknown, rows: number, cols: number): TrackerSheet | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isStringArray(v.known) || !isStringArray(v.walls)) return null;
  if (typeof v.marks !== 'object' || v.marks === null) return null;
  if (v.tracker !== null && typeof v.tracker !== 'string') return null;

  const known = v.known.filter(k => CELL_KEY.test(k) && cellKeyInBounds(k, rows, cols));
  const walls = v.walls.filter(k => WALL_KEY.test(k) && cellKeyInBounds(k, rows, cols));
  const marks: Record<string, FeatureType> = {};
  for (const [k, m] of Object.entries(v.marks as Record<string, unknown>)) {
    if (CELL_KEY.test(k) && cellKeyInBounds(k, rows, cols) && typeof m === 'string' && FEATURE_TYPES.includes(m)) {
      marks[k] = m as FeatureType;
    }
  }
  const tracker = v.tracker !== null && cellKeyInBounds(v.tracker as string, rows, cols)
    ? (v.tracker as string)
    : null;
  return { rows, cols, known, walls, marks, tracker };
}

export function serializeTrackerState(state: TrackerState): string {
  return JSON.stringify(state);
}

// Returns null for anything that is not a well-formed tracker state.
export function parseTrackerState(raw: string | null): TrackerState | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    if (d.gridSize !== 'base' && d.gridSize !== 'big') return null;
    if (d.levels !== 1 && d.levels !== 2) return null;
    if (!Array.isArray(d.sheets) || d.sheets.length !== d.levels) return null;

    const { rows, cols } = buildConfig(d.gridSize, 0);
    const sheets: TrackerSheet[] = [];
    for (const s of d.sheets) {
      const sheet = parseSheet(s, rows, cols);
      if (!sheet) return null;
      sheets.push(sheet);
    }
    return { gridSize: d.gridSize, levels: d.levels, sheets };
  } catch {
    return null;
  }
}
