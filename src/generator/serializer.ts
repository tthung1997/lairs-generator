import type { Feature, FeatureType, Lair, Wall } from './types';
import { buildConfig } from './config';
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
export function encodeLair(lair: Lair): string {
  const { config, walls, features } = lair;
  const gs = config.gridSize === 'base' ? 'b' : 'B';
  const fs = features
    .map(f => `${f.cell.row}${f.cell.col}${FEATURE_TO_CHAR[f.type]}`)
    .join('');
  const ws = walls
    .map(w => `${w.cell.row}${w.cell.col}${w.direction === 'south' ? 's' : 'e'}`)
    .join('');
  return `${gs}:${config.wallCount}:${fs}:${ws}`;
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
