import type { GridSize, LairConfig, WallRange } from './types';

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
