import { describe, expect, it } from 'vitest';
import {
  clearMark,
  createTrackerState,
  hasWall,
  moveTracker,
  normalizeWall,
  parseTrackerState,
  resetTrackerSheet,
  serializeTrackerState,
  toggleKnown,
  toggleMark,
  toggleWall,
} from './tracker';

describe('tracker map', () => {
  it('creates blank sheets sized for the grid and level count', () => {
    const state = createTrackerState('big', 2);
    expect(state.sheets).toHaveLength(2);
    expect(state.sheets[0]).toMatchObject({ rows: 8, cols: 6, known: [], walls: [], tracker: null });
  });

  it('toggles the Known circle', () => {
    const sheet = createTrackerState('base', 1).sheets[0];
    const known = toggleKnown(sheet, { row: 1, col: 2 });
    expect(known.known).toEqual(['1,2']);
    expect(toggleKnown(known, { row: 1, col: 2 }).known).toEqual([]);
  });

  it('stores north/west walls as the neighbour south/east wall', () => {
    const sheet = createTrackerState('base', 1).sheets[0];
    const withWall = toggleWall(sheet, { row: 2, col: 3 }, 'north');
    expect(withWall.walls).toEqual(['1,3,s']);
    expect(hasWall(withWall, { row: 1, col: 3 }, 'south')).toBe(true);
    expect(hasWall(withWall, { row: 2, col: 3 }, 'north')).toBe(true);

    const west = toggleWall(sheet, { row: 0, col: 4 }, 'west');
    expect(west.walls).toEqual(['0,3,e']);
    expect(toggleWall(west, { row: 0, col: 3 }, 'east').walls).toEqual([]);
  });

  it('ignores the always-solid outer perimeter', () => {
    const sheet = createTrackerState('base', 1).sheets[0];
    expect(normalizeWall(sheet, { row: 0, col: 0 }, 'north')).toBeNull();
    expect(normalizeWall(sheet, { row: 0, col: 0 }, 'west')).toBeNull();
    expect(normalizeWall(sheet, { row: 5, col: 5 }, 'south')).toBeNull();
    expect(normalizeWall(sheet, { row: 5, col: 5 }, 'east')).toBeNull();
    expect(toggleWall(sheet, { row: 5, col: 5 }, 'south')).toBe(sheet);
  });

  it('places, replaces, toggles off, and clears feature marks', () => {
    const sheet = createTrackerState('base', 1).sheets[0];
    const cell = { row: 3, col: 3 };
    const trap = toggleMark(sheet, cell, 'trap');
    expect(trap.marks).toEqual({ '3,3': 'trap' });
    expect(toggleMark(trap, cell, 'monster').marks).toEqual({ '3,3': 'monster' });
    expect(toggleMark(trap, cell, 'trap').marks).toEqual({});
    expect(clearMark(trap, cell).marks).toEqual({});
  });

  it('moves the tracker and ignores out-of-bounds cells', () => {
    const sheet = createTrackerState('base', 1).sheets[0];
    const moved = moveTracker(sheet, { row: 4, col: 1 });
    expect(moved.tracker).toBe('4,1');
    expect(moveTracker(moved, { row: 6, col: 0 })).toBe(moved);
  });

  it('resets a sheet without changing its size', () => {
    let sheet = createTrackerState('base', 1).sheets[0];
    sheet = moveTracker(toggleKnown(sheet, { row: 0, col: 0 }), { row: 0, col: 0 });
    expect(resetTrackerSheet(sheet)).toEqual(createTrackerState('base', 1).sheets[0]);
  });

  it('round-trips through serialization', () => {
    const state = createTrackerState('base', 2);
    state.sheets[1] = moveTracker(
      toggleMark(toggleWall(toggleKnown(state.sheets[1], { row: 0, col: 0 }), { row: 0, col: 0 }, 'east'), { row: 0, col: 0 }, 'start'),
      { row: 0, col: 0 }
    );
    expect(parseTrackerState(serializeTrackerState(state))).toEqual(state);
  });

  it('rejects malformed saved state and drops out-of-range entries', () => {
    expect(parseTrackerState(null)).toBeNull();
    expect(parseTrackerState('not json')).toBeNull();
    expect(parseTrackerState('{"gridSize":"huge","levels":1,"sheets":[]}')).toBeNull();
    expect(parseTrackerState('{"gridSize":"base","levels":2,"sheets":[]}')).toBeNull();

    const raw = JSON.stringify({
      gridSize: 'base',
      levels: 1,
      sheets: [{
        rows: 99, cols: 99,
        known: ['0,0', '9,9'],
        walls: ['0,0,s', '9,0,e', 'bad'],
        marks: { '1,1': 'trap', '2,2': 'dragon', '8,8': 'chest' },
        tracker: '7,7',
      }],
    });
    expect(parseTrackerState(raw)?.sheets[0]).toEqual({
      rows: 6, cols: 6, known: ['0,0'], walls: ['0,0,s'], marks: { '1,1': 'trap' }, tracker: null,
    });
  });
});
