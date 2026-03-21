import type { FeatureType, Lair } from './types';
import { buildAdjacencyGraph, cellKey } from './graph';

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
