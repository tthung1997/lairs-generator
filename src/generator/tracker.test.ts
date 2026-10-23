import { describe, expect, it } from 'vitest';
import {
  canClimbLadder,
  climbLadder,
  clearMark,
  createTrackerState,
  hasWall,
  moveTracker,
  moveTrackerTo,
  normalizeWall,
  parseTrackerState,
  placeMark,
  resetTrackerSheet,
  serializeTrackerState,
  setSheetLevel,
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
      rows: 6, cols: 6, known: ['0,0'], walls: ['0,0,s'], marks: { '1,1': 'trap' }, tracker: null, level: null,
    });
  });

  it('infers levels from the first ladder placed (Up = Lower, Down = Upper)', () => {
    const state = createTrackerState('base', 2);
    const up = placeMark(state, 0, { row: 2, col: 2 }, 'ladderUp');
    expect(up.sheets.map(s => s.level)).toEqual(['lower', 'upper']);

    const down = placeMark(state, 1, { row: 2, col: 2 }, 'ladderDown');
    expect(down.sheets.map(s => s.level)).toEqual(['lower', 'upper']);

    // Already-labeled maps are left alone, and non-ladder marks never label.
    const labeled = setSheetLevel(state, 0, 'upper');
    expect(placeMark(labeled, 0, { row: 0, col: 0 }, 'ladderUp').sheets.map(s => s.level)).toEqual(['upper', 'lower']);
    expect(placeMark(state, 0, { row: 0, col: 0 }, 'trap').sheets.map(s => s.level)).toEqual([null, null]);
  });

  it('keeps the two level labels opposite and lets the player clear them', () => {
    const state = createTrackerState('base', 2);
    const upper = setSheetLevel(state, 1, 'upper');
    expect(upper.sheets.map(s => s.level)).toEqual(['lower', 'upper']);
    expect(setSheetLevel(upper, 0, null).sheets.map(s => s.level)).toEqual([null, null]);
    expect(setSheetLevel(createTrackerState('base', 1), 0, 'upper').sheets[0].level).toBeNull();
  });

  it('keeps the Tracker on a single map and climbs ladders to the same coordinate', () => {
    let state = createTrackerState('base', 2);
    state = placeMark(state, 0, { row: 4, col: 3 }, 'ladderDown');
    state = moveTrackerTo(state, 0, { row: 1, col: 1 });
    expect(canClimbLadder(state, 0)).toBe(false);
    expect(climbLadder(state, 0)).toBe(state);

    state = moveTrackerTo(state, 0, { row: 4, col: 3 });
    expect(canClimbLadder(state, 0)).toBe(true);
    state = climbLadder(state, 0);
    expect(state.sheets.map(s => s.tracker)).toEqual([null, '4,3']);

    state = moveTrackerTo(state, 0, { row: 0, col: 0 });
    expect(state.sheets.map(s => s.tracker)).toEqual(['0,0', null]);
  });

  it('cannot climb in a one-level lair', () => {
    let state = createTrackerState('base', 1);
    state = moveTrackerTo(placeMark(state, 0, { row: 0, col: 0 }, 'ladderUp'), 0, { row: 0, col: 0 });
    expect(canClimbLadder(state, 0)).toBe(false);
  });

  it('loads maps saved before levels existed and repairs inconsistent labels', () => {
    const sheet = { rows: 6, cols: 6, known: [], walls: [], marks: {}, tracker: null };
    const old = parseTrackerState(JSON.stringify({ gridSize: 'base', levels: 2, sheets: [sheet, sheet] }));
    expect(old?.sheets.map(s => s.level)).toEqual([null, null]);

    const bad = parseTrackerState(JSON.stringify({
      gridSize: 'base', levels: 2,
      sheets: [{ ...sheet, level: 'upper' }, { ...sheet, level: 'upper' }],
    }));
    expect(bad?.sheets.map(s => s.level)).toEqual(['upper', 'lower']);
  });
});
