import type { Cell, Feature, FeatureType, Lair, LairConfig, LadderPair, MultiplayerLair, MultiplayerLairConfig, Wall } from './types';
import { getAllInternalWalls } from './graph';
import { isValidLair, isValidMultiplayerLair } from './validator';

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

function generateRandomMultiplayerLair(config: MultiplayerLairConfig): MultiplayerLair {
  const allLevelCells = getAllCells({ rows: config.rows, cols: config.cols } as LairConfig);

  // Step 1: Place ladder pairs at random coordinates (same coord on both levels)
  // Rules say "at least one pair"; physical components support up to 2 pairs — pick randomly.
  const actualLadderPairs = Math.floor(Math.random() * config.ladderPairs) + 1;
  const shuffledForLadders = shuffle([...allLevelCells]);
  const ladderCells = shuffledForLadders.slice(0, actualLadderPairs);
  const ladders: LadderPair[] = ladderCells.map(cell => ({ cell }));
  const ladderCellKeys = new Set(ladderCells.map(c => `${c.row},${c.col}`));

  // Step 2: Pool available cells across both levels, excluding ladder cells
  type LevelCell = { level: 'upper' | 'lower'; cell: Cell };
  const availableCells: LevelCell[] = [];
  for (const cell of allLevelCells) {
    if (!ladderCellKeys.has(`${cell.row},${cell.col}`)) {
      availableCells.push({ level: 'upper', cell });
      availableCells.push({ level: 'lower', cell });
    }
  }
  shuffle(availableCells);

  // Step 3: Assign features randomly across both levels
  let idx = 0;
  const upperFeatures: Feature[] = [];
  const lowerFeatures: Feature[] = [];

  const assign = (type: FeatureType, count: number) => {
    for (let i = 0; i < count; i++) {
      const lc = availableCells[idx++];
      const feature: Feature = { type, cell: lc.cell };
      if (lc.level === 'upper') upperFeatures.push(feature);
      else lowerFeatures.push(feature);
    }
  };

  assign('start', config.starts);
  assign('exit', 1);
  assign('chest', config.chests);
  assign('monster', config.monsters);
  assign('trap', config.traps);

  // Step 4: Distribute walls evenly between levels
  const levelConfig = { rows: config.rows, cols: config.cols } as LairConfig;
  const upperInternalWalls = shuffle(getAllInternalWalls(levelConfig));
  const lowerInternalWalls = shuffle(getAllInternalWalls(levelConfig));

  const upperWallCount = Math.ceil(config.wallCount / 2);
  const lowerWallCount = Math.floor(config.wallCount / 2);

  const upperWalls: Wall[] = upperInternalWalls.slice(0, upperWallCount);
  const lowerWalls: Wall[] = lowerInternalWalls.slice(0, lowerWallCount);

  return {
    config,
    upper: { walls: upperWalls, features: upperFeatures },
    lower: { walls: lowerWalls, features: lowerFeatures },
    ladders,
  };
}

export function generateValidMultiplayerLair(config: MultiplayerLairConfig): MultiplayerLair {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const lair = generateRandomMultiplayerLair(config);
    if (isValidMultiplayerLair(lair)) return lair;
  }
  throw new Error(
    `Failed to generate a valid multiplayer lair after ${MAX_ATTEMPTS} attempts. Try adjusting the wall count.`
  );
}
