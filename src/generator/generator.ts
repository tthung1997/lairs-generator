import type { Cell, Feature, Lair, LairConfig, Wall } from './types';
import { getAllInternalWalls } from './graph';
import { isValidLair } from './validator';

const MAX_ATTEMPTS = 10_000;

/** Fisher-Yates shuffle (in-place), returns the array */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAllCells(config: LairConfig): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < config.rows; r++)
    for (let c = 0; c < config.cols; c++)
      cells.push({ row: r, col: c });
  return cells;
}

/** Generate a single random lair (may or may not be valid) */
function generateRandomLair(config: LairConfig): Lair {
  const cells = shuffle(getAllCells(config));
  let idx = 0;
  const features: Feature[] = [];
  features.push({ type: 'start',   cell: cells[idx++] });
  features.push({ type: 'exit',    cell: cells[idx++] });
  for (let i = 0; i < config.chests;   i++) features.push({ type: 'chest',   cell: cells[idx++] });
  for (let i = 0; i < config.monsters; i++) features.push({ type: 'monster', cell: cells[idx++] });
  for (let i = 0; i < config.traps;    i++) features.push({ type: 'trap',    cell: cells[idx++] });

  const allWalls = shuffle(getAllInternalWalls(config));
  const walls: Wall[] = allWalls.slice(0, config.wallCount);

  return { config, walls, features };
}

/**
 * Generate a random lair that satisfies all legality rules.
 * Retries up to MAX_ATTEMPTS times.
 */
export function generateValidLair(config: LairConfig): Lair {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const lair = generateRandomLair(config);
    if (isValidLair(lair)) return lair;
  }
  throw new Error(
    `Failed to generate a valid lair after ${MAX_ATTEMPTS} attempts. Try adjusting the wall count.`
  );
}
