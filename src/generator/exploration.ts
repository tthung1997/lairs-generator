import type { Lair } from './types';
import { buildAdjacencyGraph, cellKey } from './graph';

/**
 * Returns the set of cell keys that are adjacent to any revealed cell
 * and reachable (not wall-blocked), but not yet revealed themselves.
 * These are the cells the player can choose to explore next.
 */
export function getExplorableCells(
  lair: Lair,
  revealedCells: Set<string>
): Set<string> {
  const graph = buildAdjacencyGraph(lair.config, lair.walls);
  const explorable = new Set<string>();

  for (const revealedKey of revealedCells) {
    const neighbors = graph.get(revealedKey) ?? [];
    for (const neighbor of neighbors) {
      if (!revealedCells.has(neighbor)) {
        explorable.add(neighbor);
      }
    }
  }

  return explorable;
}

/**
 * Returns the cell key for the Start feature in the given lair.
 * Used to initialise the revealed set when entering exploration mode.
 */
export function getStartCellKey(lair: Lair): string {
  const start = lair.features.find(f => f.type === 'start');
  if (!start) throw new Error('Lair has no start cell');
  return cellKey(start.cell);
}
