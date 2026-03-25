import type { ExplorerCount, Feature, FeatureType, Lair, LairLevel, MultiplayerLair, Wall } from './types';
import { buildConfig, buildMultiplayerConfig } from './config';
import type { GridSize } from './types';

const FEATURE_TO_CHAR: Record<FeatureType, string> = {
  start: 's', exit: 'x', chest: 'c', monster: 'm', trap: 't',
};

const CHAR_TO_FEATURE: Record<string, FeatureType> = {
  s: 'start', x: 'exit', c: 'chest', m: 'monster', t: 'trap',
};

/**
 * Encode a Lair into a compact URL hash string.
 * Format: <gridSize>:<wallCount>:<features>:<walls>
 * - gridSize: 'b' (base) or 'B' (big)
 * - features: sequence of <row><col><typeChar> 3-char tuples
 * - walls: sequence of <row><col><dir> 3-char tuples (dir: 's'=south, 'e'=east)
 */
export function encodeLair(
  lair: Lair,
  explorationState?: { explorationMode: boolean; revealedCells: Set<string> }
): string {
  const { config, walls, features } = lair;
  const gs = config.gridSize === 'base' ? 'b' : 'B';
  const fs = features
    .map(f => `${f.cell.row}${f.cell.col}${FEATURE_TO_CHAR[f.type]}`)
    .join('');
  const ws = walls
    .map(w => `${w.cell.row}${w.cell.col}${w.direction === 'south' ? 's' : 'e'}`)
    .join('');
  const base = `${gs}:${config.wallCount}:${fs}:${ws}`;
  if (explorationState?.explorationMode) {
    const revealedStr = [...explorationState.revealedCells]
      .sort()
      .map(key => key.replace(',', ''))
      .join('');
    return `${base}:e:${revealedStr}`;
  }
  return base;
}

/**
 * Decode a URL hash string back into a Lair.
 * Returns null if the hash is malformed.
 */
export function decodeLair(hash: string): Lair | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const parts = raw.split(':');
    if (parts.length < 4) return null;
    const [gs, wcStr, fs, ws] = parts;

    const gridSize: GridSize = gs === 'b' ? 'base' : 'big';
    const wallCount = parseInt(wcStr, 10);
    if (isNaN(wallCount)) return null;

    const config = buildConfig(gridSize, wallCount);

    const features: Feature[] = [];
    for (let i = 0; i + 2 < fs.length; i += 3) {
      const row = parseInt(fs[i], 10);
      const col = parseInt(fs[i + 1], 10);
      const type = CHAR_TO_FEATURE[fs[i + 2]];
      if (type === undefined || isNaN(row) || isNaN(col)) return null;
      features.push({ type, cell: { row, col } });
    }

    const walls: Wall[] = [];
    if (ws) {
      for (let i = 0; i + 2 < ws.length; i += 3) {
        const row = parseInt(ws[i], 10);
        const col = parseInt(ws[i + 1], 10);
        const direction = ws[i + 2] === 's' ? 'south' : 'east';
        if (isNaN(row) || isNaN(col)) return null;
        walls.push({ cell: { row, col }, direction });
      }
    }

    return { config, walls, features };
  } catch {
    return null;
  }
}

export function decodeExplorationState(hash: string): { explorationMode: boolean; revealedCells: Set<string> } | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const parts = raw.split(':');
    if (parts.length < 6 || parts[4] !== 'e') return null;
    const revealedStr = parts[5];
    const revealedCells = new Set<string>();
    for (let i = 0; i + 1 < revealedStr.length; i += 2) {
      const row = parseInt(revealedStr[i], 10);
      const col = parseInt(revealedStr[i + 1], 10);
      if (!isNaN(row) && !isNaN(col)) {
        revealedCells.add(`${row},${col}`);
      }
    }
    return { explorationMode: true, revealedCells };
  } catch {
    return null;
  }
}

export function isMultiplayerHash(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return raw.startsWith('mp');
}

/**
 * Encode a MultiplayerLair into a compact URL hash string.
 * Format: mp<explorerCount>:<wallCount>:<upperFeatures>:<upperWalls>:<lowerFeatures>:<lowerWalls>:<ladders>
 * With optional exploration suffix: :eu:<upperRevealed>:el:<lowerRevealed>
 */
export function encodeMultiplayerLair(
  lair: MultiplayerLair,
  explorationState?: { explorationMode: boolean; upperRevealedCells: Set<string>; lowerRevealedCells: Set<string> }
): string {
  const { config, upper, lower, ladders } = lair;
  const upperFs = upper.features
    .map(f => `${f.cell.row}${f.cell.col}${FEATURE_TO_CHAR[f.type]}`)
    .join('');
  const upperWs = upper.walls
    .map(w => `${w.cell.row}${w.cell.col}${w.direction === 'south' ? 's' : 'e'}`)
    .join('');
  const lowerFs = lower.features
    .map(f => `${f.cell.row}${f.cell.col}${FEATURE_TO_CHAR[f.type]}`)
    .join('');
  const lowerWs = lower.walls
    .map(w => `${w.cell.row}${w.cell.col}${w.direction === 'south' ? 's' : 'e'}`)
    .join('');
  const ladderStr = ladders.map(l => `${l.cell.row}${l.cell.col}`).join('');
  const base = `mp${config.explorerCount}:${config.wallCount}:${upperFs}:${upperWs}:${lowerFs}:${lowerWs}:${ladderStr}`;
  if (explorationState?.explorationMode) {
    const upperRevealedStr = [...explorationState.upperRevealedCells]
      .sort()
      .map(key => key.replace(',', ''))
      .join('');
    const lowerRevealedStr = [...explorationState.lowerRevealedCells]
      .sort()
      .map(key => key.replace(',', ''))
      .join('');
    return `${base}:eu:${upperRevealedStr}:el:${lowerRevealedStr}`;
  }
  return base;
}

/**
 * Decode a URL hash string back into a MultiplayerLair.
 * Returns null if the hash is malformed.
 */
export function decodeMultiplayerLair(hash: string): MultiplayerLair | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw.startsWith('mp')) return null;
    const parts = raw.split(':');
    if (parts.length < 7) return null;

    const explorerCountStr = parts[0].slice(2);
    if (explorerCountStr !== '2' && explorerCountStr !== '3') return null;
    const explorerCount: ExplorerCount = explorerCountStr === '2' ? 2 : 3;

    const wallCount = parseInt(parts[1], 10);
    if (isNaN(wallCount)) return null;

    const decodeFeatures = (fs: string): Feature[] => {
      const features: Feature[] = [];
      for (let i = 0; i + 2 < fs.length; i += 3) {
        const row = parseInt(fs[i], 10);
        const col = parseInt(fs[i + 1], 10);
        const type = CHAR_TO_FEATURE[fs[i + 2]];
        if (type === undefined || isNaN(row) || isNaN(col)) throw new Error('bad feature');
        features.push({ type, cell: { row, col } });
      }
      return features;
    };

    const decodeWalls = (ws: string): Wall[] => {
      const walls: Wall[] = [];
      for (let i = 0; i + 2 < ws.length; i += 3) {
        const row = parseInt(ws[i], 10);
        const col = parseInt(ws[i + 1], 10);
        const direction = ws[i + 2] === 's' ? 'south' : 'east';
        if (isNaN(row) || isNaN(col)) throw new Error('bad wall');
        walls.push({ cell: { row, col }, direction });
      }
      return walls;
    };

    const upperFeatures = decodeFeatures(parts[2]);
    const upperWalls = decodeWalls(parts[3]);
    const lowerFeatures = decodeFeatures(parts[4]);
    const lowerWalls = decodeWalls(parts[5]);

    const ladderStr = parts[6];
    const ladders: { cell: { row: number; col: number } }[] = [];
    for (let i = 0; i + 1 < ladderStr.length; i += 2) {
      const row = parseInt(ladderStr[i], 10);
      const col = parseInt(ladderStr[i + 1], 10);
      if (isNaN(row) || isNaN(col)) return null;
      ladders.push({ cell: { row, col } });
    }

    const config = buildMultiplayerConfig(explorerCount, wallCount, ladders.length);

    const upper: LairLevel = { walls: upperWalls, features: upperFeatures };
    const lower: LairLevel = { walls: lowerWalls, features: lowerFeatures };

    return {
      config,
      upper,
      lower,
      ladders,
    };
  } catch {
    return null;
  }
}

export function decodeMultiplayerExplorationState(hash: string): { explorationMode: boolean; upperRevealedCells: Set<string>; lowerRevealedCells: Set<string> } | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    const parts = raw.split(':');
    const euIdx = parts.indexOf('eu');
    const elIdx = parts.indexOf('el');
    if (euIdx === -1 && elIdx === -1) return null;

    const decodeRevealed = (str: string): Set<string> => {
      const cells = new Set<string>();
      for (let i = 0; i + 1 < str.length; i += 2) {
        const row = parseInt(str[i], 10);
        const col = parseInt(str[i + 1], 10);
        if (!isNaN(row) && !isNaN(col)) {
          cells.add(`${row},${col}`);
        }
      }
      return cells;
    };

    const upperRevealedCells = euIdx !== -1 && parts[euIdx + 1] !== undefined
      ? decodeRevealed(parts[euIdx + 1])
      : new Set<string>();
    const lowerRevealedCells = elIdx !== -1 && parts[elIdx + 1] !== undefined
      ? decodeRevealed(parts[elIdx + 1])
      : new Set<string>();

    return { explorationMode: true, upperRevealedCells, lowerRevealedCells };
  } catch {
    return null;
  }
}
