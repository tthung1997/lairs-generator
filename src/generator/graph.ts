import type { Cell, Wall, LairConfig, LadderPair, MultiplayerLairConfig } from './types';

export function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

export function parseCell(key: string): Cell {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

/**
 * Build adjacency list: for each cell key, the list of reachable neighbor cell keys.
 * Outer perimeter is always walled. Internal walls come from the lair's wall array.
 */
export function buildAdjacencyGraph(
  config: LairConfig,
  walls: Wall[]
): Map<string, string[]> {
  // Build a Set of blocked edges for O(1) lookup
  // A wall blocks the edge between two cells.
  // Wall {cell, direction:'south'} blocks between (row,col) and (row+1,col)
  // Wall {cell, direction:'east'} blocks between (row,col) and (row,col+1)
  const blockedEdges = new Set<string>();
  for (const wall of walls) {
    const { cell, direction } = wall;
    if (direction === 'south') {
      // Block between (row,col) <-> (row+1,col)
      const key1 = cellKey(cell);
      const key2 = cellKey({ row: cell.row + 1, col: cell.col });
      blockedEdges.add(`${key1}|${key2}`);
      blockedEdges.add(`${key2}|${key1}`);
    } else {
      // Block between (row,col) <-> (row,col+1)
      const key1 = cellKey(cell);
      const key2 = cellKey({ row: cell.row, col: cell.col + 1 });
      blockedEdges.add(`${key1}|${key2}`);
      blockedEdges.add(`${key2}|${key1}`);
    }
  }

  const graph = new Map<string, string[]>();
  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      const current = { row: r, col: c };
      const currentKey = cellKey(current);
      const neighbors: string[] = [];
      const directions: Cell[] = [
        { row: r - 1, col: c }, // north
        { row: r + 1, col: c }, // south
        { row: r, col: c - 1 }, // west
        { row: r, col: c + 1 }, // east
      ];
      for (const neighbor of directions) {
        if (neighbor.row < 0 || neighbor.row >= config.rows) continue;
        if (neighbor.col < 0 || neighbor.col >= config.cols) continue;
        const neighborKey = cellKey(neighbor);
        if (!blockedEdges.has(`${currentKey}|${neighborKey}`)) {
          neighbors.push(neighborKey);
        }
      }
      graph.set(currentKey, neighbors);
    }
  }
  return graph;
}

/**
 * Returns all internal wall positions for a given grid config.
 * South walls: rows 0..(rows-2), cols 0..(cols-1)
 * East walls: rows 0..(rows-1), cols 0..(cols-2)
 */
export function getAllInternalWalls(config: LairConfig): Wall[] {
  const walls: Wall[] = [];
  for (let r = 0; r < config.rows - 1; r++) {
    for (let c = 0; c < config.cols; c++) {
      walls.push({ cell: { row: r, col: c }, direction: 'south' });
    }
  }
  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols - 1; c++) {
      walls.push({ cell: { row: r, col: c }, direction: 'east' });
    }
  }
  return walls;
}

export function levelCellKey(level: 'upper' | 'lower', cell: Cell): string {
  const prefix = level === 'upper' ? 'u' : 'l';
  return `${prefix}:${cell.row},${cell.col}`;
}

export function parseLevelCell(key: string): { level: 'upper' | 'lower'; cell: Cell } {
  const colonIdx = key.indexOf(':');
  const prefix = key.slice(0, colonIdx);
  const level: 'upper' | 'lower' = prefix === 'u' ? 'upper' : 'lower';
  const [row, col] = key.slice(colonIdx + 1).split(',').map(Number);
  return { level, cell: { row, col } };
}

export function buildMultiplayerAdjacencyGraph(
  config: MultiplayerLairConfig,
  upperWalls: Wall[],
  lowerWalls: Wall[],
  ladders: LadderPair[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const [level, walls] of [['upper', upperWalls], ['lower', lowerWalls]] as const) {
    const blockedEdges = new Set<string>();
    for (const wall of walls) {
      const { cell, direction } = wall;
      if (direction === 'south') {
        const k1 = levelCellKey(level, cell);
        const k2 = levelCellKey(level, { row: cell.row + 1, col: cell.col });
        blockedEdges.add(`${k1}|${k2}`);
        blockedEdges.add(`${k2}|${k1}`);
      } else {
        const k1 = levelCellKey(level, cell);
        const k2 = levelCellKey(level, { row: cell.row, col: cell.col + 1 });
        blockedEdges.add(`${k1}|${k2}`);
        blockedEdges.add(`${k2}|${k1}`);
      }
    }

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const currentKey = levelCellKey(level, { row: r, col: c });
        const neighbors: string[] = [];
        const orthogonal: Cell[] = [
          { row: r - 1, col: c },
          { row: r + 1, col: c },
          { row: r, col: c - 1 },
          { row: r, col: c + 1 },
        ];
        for (const neighbor of orthogonal) {
          if (neighbor.row < 0 || neighbor.row >= config.rows) continue;
          if (neighbor.col < 0 || neighbor.col >= config.cols) continue;
          const neighborKey = levelCellKey(level, neighbor);
          if (!blockedEdges.has(`${currentKey}|${neighborKey}`)) {
            neighbors.push(neighborKey);
          }
        }
        graph.set(currentKey, neighbors);
      }
    }
  }

  for (const ladder of ladders) {
    const upperKey = levelCellKey('upper', ladder.cell);
    const lowerKey = levelCellKey('lower', ladder.cell);
    graph.get(upperKey)!.push(lowerKey);
    graph.get(lowerKey)!.push(upperKey);
  }

  return graph;
}
