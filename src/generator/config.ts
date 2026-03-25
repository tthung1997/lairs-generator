import type { ExplorerCount, GridSize, LairConfig, MultiplayerLairConfig, WallRange } from './types';

export const WALL_RANGES: Record<GridSize, WallRange> = {
  base: { min: 17, max: 20 },
  big:  { min: 20, max: 25 },
};

export const DEFAULT_WALL_COUNT: Record<GridSize, number> = {
  base: 20,
  big:  25,
};

export function buildConfig(gridSize: GridSize, wallCount: number): LairConfig {
  const isBase = gridSize === 'base';
  return {
    gridSize,
    rows: isBase ? 6 : 8,
    cols: 6,
    wallCount,
    monsters: isBase ? 3 : 4,
    traps:    isBase ? 3 : 4,
    chests:   isBase ? 3 : 4,
  };
}

export const ROW_LABELS: Record<number, string> = {
  0: 'A', 1: 'B', 2: 'C', 3: 'D',
  4: 'E', 5: 'F', 6: 'G', 7: 'H',
};

export const MULTIPLAYER_WALL_RANGES: Record<ExplorerCount, WallRange> = {
  2: { min: 34, max: 40 },
  3: { min: 42, max: 50 },
};

export const DEFAULT_MULTIPLAYER_WALL_COUNT: Record<ExplorerCount, number> = {
  2: 40,
  3: 50,
};

export function buildMultiplayerConfig(
  explorerCount: ExplorerCount,
  wallCount: number,
  ladderPairs: number = 2
): MultiplayerLairConfig {
  const isTwo = explorerCount === 2;
  return {
    explorerCount,
    gridSize: isTwo ? 'base' : 'big',
    rows: isTwo ? 6 : 8,
    cols: 6,
    wallCount,
    monsters: isTwo ? 6 : 8,
    traps:    isTwo ? 6 : 8,
    chests:   isTwo ? 6 : 8,
    starts: explorerCount,
    ladderPairs,
  };
}
