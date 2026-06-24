import { buildTopologyRecipe } from '../schema/topologyRecipe.js';

const CONSTRAINT_RECAP = {
  KEY_AFTER_DOOR:
    'Key room must be reachable from spawn before the locked door. Connect key to the hub chain — not only to exit. With the door corridor edge removed, spawn must still reach key.',
  DOOR_NOT_BLOCKING:
    'Locked door must block the path to exit. exit_room may ONLY connect to key_room via the door corridor — remove any spawn→exit or hub→exit bypass corridors.',
  DOOR_BLOCKS_PERMANENTLY: 'Exit must be reachable when the door is open.',
  TREASURE_ON_CRITICAL_PATH: 'Treasure room must not be on the critical spawn→exit path.',
  NOT_CONNECTED: 'All rooms must be connected via walkable paths.',
  TOO_MANY_LOOPS: 'At most one optional loop allowed (cyclomatic ≤ 1).',
  DOOR_CORRIDOR_INVALID: 'Door must sit on a corridor connecting the two blocked rooms.',
  CORRIDOR_INVALID: 'Corridors must not pass through unrelated rooms; code routes only between from/to rooms.',
  SCHEMA: 'Output must match the abstract JSON schema exactly.',
  METADATA_MISMATCH: 'metadata.seed/difficulty/density must match input parameters.',
  SELFCHECK_DISHONEST: 'selfCheck booleans must honestly reflect constraint satisfaction.',
  PARSE_ERROR: 'Output must be valid JSON after the thinking block.',
};

/**
 * @param {{ params: object, derived: object, invalidJson: object|string, violations: Array<{code: string, detail: string}> }} ctx
 */
export function buildRepairPrompt(ctx) {
  const { params, derived, invalidJson, violations } = ctx;
  const jsonStr =
    typeof invalidJson === 'string' ? invalidJson : JSON.stringify(invalidJson, null, 2);

  const violationsList = violations
    .map((v) => `- [${v.code}] ${v.detail}`)
    .join('\n');

  const violatedConstraintsRecap = violations
    .map((v) => CONSTRAINT_RECAP[v.code] ?? v.detail)
    .filter(Boolean)
    .join('\n');

  const topologyRecipe = buildTopologyRecipe(derived);

  return `The previous abstract dungeon JSON failed semantic validation. Make MINIMAL surgical fixes only.
Do NOT regenerate from scratch. Keep room ids and types where possible.
Do NOT add pixel coordinates — code compiles geometry from your abstract layout.
Change only topology, anchors, corridors, or door assignment as needed.

ORIGINAL PARAMETERS:
seed: ${params.seed}, difficulty: ${params.difficulty}, density: ${params.density}

VIOLATED CONSTRAINTS (fix ALL):
${violationsList}

PREVIOUS JSON:
${jsonStr}

REQUIREMENTS:
1. Plan fixes in <think> (brief).
2. Output corrected full abstract JSON object (not a diff).
3. No markdown fences. No prose after JSON.
4. Re-verify and update selfCheck honestly.
5. Match this topology shape:
${topologyRecipe}
6. Re-emphasize violated constraints:
${violatedConstraintsRecap}

Begin repair.`;
}
