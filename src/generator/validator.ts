import type { FeatureType, Lair, MultiplayerLair } from './types';
import { buildAdjacencyGraph, cellKey, buildMultiplayerAdjacencyGraph, levelCellKey } from './graph';

function buildFeatureMap(lair: Lair): Map<string, FeatureType> {
  const map = new Map<string, FeatureType>();
  for (const f of lair.features) {
    map.set(cellKey(f.cell), f.type);
  }
  return map;
}

/**
 * Rule 1: Every space must be reachable from Start via BFS.
 */
function checkReachability(lair: Lair): boolean {
  const graph = buildAdjacencyGraph(lair.config, lair.walls);
  const start = lair.features.find(f => f.type === 'start');
  if (!start) return false;

  const startKey = cellKey(start.cell);
  const visited = new Set<string>();
  const queue: string[] = [startKey];
  visited.add(startKey);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of (graph.get(current) ?? [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  const totalSpaces = lair.config.rows * lair.config.cols;
  return visited.size === totalSpaces;
}

/**
 * Rule 3: The Peril Rule.
 * From Start to each Goal (Exit + all Chests), there must be at least one
 * path that passes through at most 1 Monster AND at most 1 Trap.
 *
 * Uses state-space BFS: state = (cellKey, monstersHit: 0|1, trapsHit: 0|1)
 * States with 2+ of either type are pruned.
 */
function checkPerilRule(lair: Lair): boolean {
  const graph = buildAdjacencyGraph(lair.config, lair.walls);
  const featureMap = buildFeatureMap(lair);
  const start = lair.features.find(f => f.type === 'start');
  if (!start) return false;

  const goals = lair.features.filter(
    f => f.type === 'exit' || f.type === 'chest'
  );

  type State = { key: string; m: 0 | 1; t: 0 | 1 };

  const stateKey = (s: State) => `${s.key},${s.m},${s.t}`;

  const visited = new Set<string>();
  // Set of "goalKey,m,t" — records which goals were reached in valid states
  const reachedGoalStates = new Set<string>();

  const startKey = cellKey(start.cell);
  const startFeature = featureMap.get(startKey);
  const initM: 0 | 1 = startFeature === 'monster' ? 1 : 0;
  const initT: 0 | 1 = startFeature === 'trap' ? 1 : 0;
  const initial: State = { key: startKey, m: initM, t: initT };

  const queue: State[] = [initial];
  visited.add(stateKey(initial));

  while (queue.length > 0) {
    const state = queue.shift()!;

    // Record if this is a goal
    const ft = featureMap.get(state.key);
    if (ft === 'exit' || ft === 'chest') {
      reachedGoalStates.add(`${state.key},${state.m},${state.t}`);
    }

    for (const neighborKey of (graph.get(state.key) ?? [])) {
      const nFeature = featureMap.get(neighborKey);
      let newM = state.m;
      let newT = state.t;
      if (nFeature === 'monster') newM = (newM + 1) as 0 | 1;
      if (nFeature === 'trap') newT = (newT + 1) as 0 | 1;

      // Prune: exceeded hazard limit
      if (newM > 1 || newT > 1) continue;

      const next: State = { key: neighborKey, m: newM as 0 | 1, t: newT as 0 | 1 };
      const sk = stateKey(next);
      if (!visited.has(sk)) {
        visited.add(sk);
        queue.push(next);
      }
    }
  }

  // Every goal must be reachable in at least one valid state
  for (const goal of goals) {
    const gKey = cellKey(goal.cell);
    const reachable =
      reachedGoalStates.has(`${gKey},0,0`) ||
      reachedGoalStates.has(`${gKey},0,1`) ||
      reachedGoalStates.has(`${gKey},1,0`) ||
      reachedGoalStates.has(`${gKey},1,1`);
    if (!reachable) return false;
  }

  return true;
}

/**
 * Returns true if the lair satisfies all three legality rules.
 * Rule 2 (use everything) is guaranteed by the generator.
 */
export function isValidLair(lair: Lair): boolean {
  return checkReachability(lair) && checkPerilRule(lair);
}

/**
 * Validates a multiplayer lair across both levels with three checks:
 * 1. Full reachability — every cell on both levels reachable from the first start
 * 2. Peril Rule — every goal reachable from any start with ≤1 monster and ≤1 trap
 * 3. Start-to-start connectivity — every start can reach at least one other start
 */
export function isValidMultiplayerLair(lair: MultiplayerLair): boolean {
  const graph = buildMultiplayerAdjacencyGraph(
    lair.config,
    lair.upper.walls,
    lair.lower.walls,
    lair.ladders,
  );

  // Build combined feature map: level-prefixed key → FeatureType
  const featureMap = new Map<string, FeatureType>();
  for (const f of lair.upper.features) {
    featureMap.set(levelCellKey('upper', f.cell), f.type);
  }
  for (const f of lair.lower.features) {
    featureMap.set(levelCellKey('lower', f.cell), f.type);
  }

  // Collect all start keys and goal keys
  const startKeys: string[] = [];
  const goalKeys: string[] = [];
  for (const [key, type] of featureMap) {
    if (type === 'start') startKeys.push(key);
    if (type === 'exit' || type === 'chest') goalKeys.push(key);
  }

  // --- Check 1: Full reachability from the first start ---
  if (startKeys.length === 0) return false;

  {
    const visited = new Set<string>();
    const queue: string[] = [startKeys[0]];
    visited.add(startKeys[0]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of (graph.get(current) ?? [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const totalSpaces = lair.config.rows * lair.config.cols * 2;
    if (visited.size !== totalSpaces) return false;
  }

  // --- Check 2: Peril Rule (multi-source BFS from all starts) ---
  {
    type State = { key: string; m: 0 | 1; t: 0 | 1 };
    const stateKey = (s: State) => `${s.key},${s.m},${s.t}`;

    const visited = new Set<string>();
    const reachedGoalStates = new Set<string>();
    const queue: State[] = [];

    for (const sk of startKeys) {
      const ft = featureMap.get(sk);
      const initM: 0 | 1 = ft === 'monster' ? 1 : 0;
      const initT: 0 | 1 = ft === 'trap' ? 1 : 0;
      const initial: State = { key: sk, m: initM, t: initT };
      const sKey = stateKey(initial);
      if (!visited.has(sKey)) {
        visited.add(sKey);
        queue.push(initial);
      }
    }

    while (queue.length > 0) {
      const state = queue.shift()!;

      const ft = featureMap.get(state.key);
      if (ft === 'exit' || ft === 'chest') {
        reachedGoalStates.add(`${state.key},${state.m},${state.t}`);
      }

      for (const neighborKey of (graph.get(state.key) ?? [])) {
        const nFeature = featureMap.get(neighborKey);
        let newM = state.m;
        let newT = state.t;
        if (nFeature === 'monster') newM = (newM + 1) as 0 | 1;
        if (nFeature === 'trap') newT = (newT + 1) as 0 | 1;

        if (newM > 1 || newT > 1) continue;

        const next: State = { key: neighborKey, m: newM as 0 | 1, t: newT as 0 | 1 };
        const sk = stateKey(next);
        if (!visited.has(sk)) {
          visited.add(sk);
          queue.push(next);
        }
      }
    }

    for (const gKey of goalKeys) {
      const reachable =
        reachedGoalStates.has(`${gKey},0,0`) ||
        reachedGoalStates.has(`${gKey},0,1`) ||
        reachedGoalStates.has(`${gKey},1,0`) ||
        reachedGoalStates.has(`${gKey},1,1`);
      if (!reachable) return false;
    }
  }

  // --- Check 3: Start-to-start connectivity ---
  {
    const startSet = new Set(startKeys);

    for (const origin of startKeys) {
      const visited = new Set<string>();
      const queue: string[] = [origin];
      visited.add(origin);
      let foundOther = false;

      while (queue.length > 0 && !foundOther) {
        const current = queue.shift()!;
        for (const neighbor of (graph.get(current) ?? [])) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            if (startSet.has(neighbor)) {
              foundOther = true;
              break;
            }
            queue.push(neighbor);
          }
        }
      }

      if (!foundOther) return false;
    }
  }

  return true;
}
