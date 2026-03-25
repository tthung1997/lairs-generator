// Grid coordinate system
export type RowLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export type ColLabel = 1 | 2 | 3 | 4 | 5 | 6;

export interface Cell {
  row: number; // 0-indexed (0–5 for base, 0–7 for big)
  col: number; // 0-indexed (0–5)
}

// A wall sits on the border between two adjacent cells.
// Stored as the south or east edge of a cell to avoid duplicates.
export interface Wall {
  cell: Cell;
  direction: 'south' | 'east';
}

export type FeatureType = 'start' | 'exit' | 'chest' | 'monster' | 'trap';

export interface Feature {
  type: FeatureType;
  cell: Cell;
}

export type GridSize = 'base' | 'big';

export interface LairConfig {
  gridSize: GridSize;
  rows: number;     // 6 (base) or 8 (big)
  cols: number;     // always 6
  wallCount: number; // within allowed range
  monsters: number; // 3 (base) or 4 (big)
  traps: number;    // 3 (base) or 4 (big)
  chests: number;   // 3 (base) or 4 (big)
}

export interface Lair {
  config: LairConfig;
  walls: Wall[];
  features: Feature[];
}

export interface WallRange {
  min: number;
  max: number;
}

// Multiplayer types
export type ExplorerCount = 2 | 3;

export interface LairLevel {
  walls: Wall[];
  features: Feature[];
}

export interface LadderPair {
  cell: Cell; // same coordinate on both upper and lower levels
}

export interface MultiplayerLairConfig {
  explorerCount: ExplorerCount;
  gridSize: GridSize;
  rows: number;      // 6 for 2 explorers (base), 8 for 3 explorers (big)
  cols: number;      // always 6
  wallCount: number; // total walls across both levels combined
  monsters: number;  // 6 for 2 explorers, 8 for 3 explorers
  traps: number;     // 6 for 2 explorers, 8 for 3 explorers
  chests: number;    // 6 for 2 explorers, 8 for 3 explorers
  starts: number;    // equals explorerCount (2 or 3)
  ladderPairs: number; // number of ladder pairs connecting the levels (1–2)
}

export interface MultiplayerLair {
  config: MultiplayerLairConfig;
  upper: LairLevel;      // upper level board
  lower: LairLevel;      // lower level board
  ladders: LadderPair[]; // the connecting ladder pairs
}
