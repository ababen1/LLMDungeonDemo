import { buildTopologyRecipe } from '../schema/topologyRecipe.js';

/**
 * @param {{ seed: number, difficulty: number, density: number, derived: object }} ctx
 */
export function buildUserPrompt(ctx) {
  const { seed, difficulty, density, derived } = ctx;
  const topologyRecipe = buildTopologyRecipe(derived);
  return `Generate a dungeon layout with these parameters:

seed: ${seed}
difficulty: ${difficulty} (1=fewest rooms ~4, 5=most rooms ~6; corridors not counted)
density: ${density} (1=largest grid 25×25, 5=smallest grid 10×10)

DERIVED TARGETS (follow exactly):
- targetRoomCount: ${derived.targetRoomCount} (includes spawn, exit, key; add treasure if count >= 5; fill remainder with type "connector")
- targetCorridorCount: ${derived.targetCorridorCount} (minimum for connectivity; use ${derived.targetCorridorCountMax} only if adding one optional loop)
- lockedDoorPlacement: ${derived.doorPlacementHint}

${topologyRecipe}

PLACEMENT HINTS (seed-derived, assign anchor.quadrant accordingly):
- spawn quadrant: ${derived.spawnQuadrant}
- key quadrant: ${derived.keyQuadrant}
- exit quadrant: ${derived.exitQuadrant}
- treasure quadrant: ${derived.treasureQuadrant} (${derived.includeTreasure ? 'include treasure room' : 'no treasure room'})

INSTRUCTIONS:
1. Plan topology in <think> first. Match the MANDATORY TOPOLOGY graph shape above.
2. Echo seed, difficulty, density exactly in metadata (no gridSize).
3. Use size tiers (small/medium/large) and quadrant anchors only. Hub rooms use type "connector".
4. In thinking, simulate BFS with the door corridor edge removed: confirm spawn→key works and spawn→exit fails.
5. Fill selfCheck honestly by verifying each constraint against your graph plan.
6. Output JSON only after thinking (no markdown fences).

Begin.`;
}
