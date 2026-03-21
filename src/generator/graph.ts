import type { Cell, Wall, LairConfig } from './types';

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
