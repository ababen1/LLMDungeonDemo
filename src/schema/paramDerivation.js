import { createRng } from '../utils/seededRng.js';

const DOOR_PLACEMENT_HINTS = [
  'near_exit',
  'between_key_and_exit',
  'mid_graph',
  'far_from_spawn',
  'maximizes_path_length',
];

const QUADRANTS = ['NW', 'NE', 'SW', 'SE'];

const SIZE_TIERS = {
  small: [2, 3],
  medium: [3, 4],
  large: [4, 5],
};

/**
 * @param {number} seed
 * @param {number} difficulty 1-5
 * @param {number} density 1-5
 */
export function deriveParams(seed, difficulty, density) {
  // Higher density → smaller grid (10 at max density, 25 at min)
  const gridW = 25 - Math.round(((density - 1) * 15) / 4);
  const gridH = gridW;
  // Higher difficulty → more rooms (4 at min, 6 at max)
  const targetRoomCount = Math.round(4 + ((difficulty - 1) * (6 - 4)) / 4);
  const { min: minCorridors, max: maxCorridors } = corridorBounds(targetRoomCount);
  const targetCorridorCount = minCorridors;
  const targetCorridorCountMax = maxCorridors;
  const doorPlacementHint = DOOR_PLACEMENT_HINTS[difficulty - 1];
  const includeTreasure = targetRoomCount >= 5;

  const rng = createRng(seed);
  const spawnQuadrant = rng.pick(QUADRANTS);
  let exitQuadrant = rng.pick(QUADRANTS);
  while (exitQuadrant === spawnQuadrant) {
    exitQuadrant = rng.pick(QUADRANTS);
  }
  const keyQuadrant = rng.pick(QUADRANTS);
  const treasureQuadrant = rng.pick(QUADRANTS);

  return {
    seed,
    difficulty,
    density,
    gridW,
    gridH,
    gridWMinus1: gridW - 1,
    gridHMinus1: gridH - 1,
    gridSize: [gridW, gridH],
    targetRoomCount,
    targetCorridorCount,
    targetCorridorCountMax,
    doorPlacementHint,
    includeTreasure,
    spawnQuadrant,
    keyQuadrant,
    exitQuadrant,
    treasureQuadrant,
    sizeTiers: SIZE_TIERS,
  };
}

/**
 * Valid corridor counts for a connected graph with at most one loop.
 * Tree needs rooms-1 edges; one optional loop adds at most one edge.
 */
export function corridorBounds(roomCount) {
  const min = Math.max(2, roomCount - 1);
  const max = roomCount;
  return { min, max };
}

/**
 * Map size tier to concrete dimensions using seed + room id.
 */
export function resolveRoomSize(tier, seed, roomId, density) {
  const rng = createRng(seed + hashString(roomId));
  const [min, max] = SIZE_TIERS[tier] ?? SIZE_TIERS.medium;
  const base = rng.nextInt(min, max);
  const densityBonus = density >= 4 ? 0 : 0;
  const w = Math.min(base + densityBonus, max);
  const h = Math.min(rng.nextInt(min, max) + densityBonus, max);
  return [w, h];
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Map quadrant to normalized anchor center [0-1, 0-1].
 */
export function quadrantToAnchor(quadrant) {
  const map = {
    NW: [0.25, 0.25],
    NE: [0.75, 0.25],
    SW: [0.25, 0.75],
    SE: [0.75, 0.75],
  };
  return map[quadrant] ?? [0.5, 0.5];
}
