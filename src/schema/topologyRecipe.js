/**
 * Deterministic corridor graph template the LLM should follow.
 * @param {object} derived
 * @returns {string}
 */
export function buildTopologyRecipe(derived) {
  const n = derived.targetRoomCount;
  const hasTreasure = derived.includeTreasure;
  const hubCount = n - 3 - (hasTreasure ? 1 : 0);

  const hubIds =
    hubCount === 0
      ? []
      : hubCount === 1
        ? ['hub_room']
        : Array.from({ length: hubCount }, (_, i) => `hub_${i + 1}_room`);

  const pathIds = ['spawn_room', ...hubIds, 'key_room', 'exit_room'];
  const pathArrow = pathIds.join(' → ');

  const corridors = [];
  for (let i = 0; i < pathIds.length - 1; i++) {
    const id = `corridor_${i + 1}`;
    const from = pathIds[i];
    const to = pathIds[i + 1];
    const doorNote =
      from === 'key_room' && to === 'exit_room'
        ? '  ← LOCKED DOOR HERE (blocks: [key_room, exit_room])'
        : '';
    corridors.push(`  ${i + 1}. ${id}: ${from} → ${to}${doorNote}`);
  }

  let corridorNum = corridors.length;
  if (hasTreasure) {
    const branchFrom = hubIds[0] ?? 'spawn_room';
    corridorNum += 1;
    corridors.push(`  ${corridorNum}. corridor_${corridorNum}: ${branchFrom} → treasure_room  (side branch only)`);
  }

  const lines = [
    'MANDATORY TOPOLOGY (use these room ids or rename consistently — keep the graph shape):',
    `Rooms (${n}): spawn_room, key_room, exit_room${hasTreasure ? ', treasure_room' : ''}${hubIds.length ? `, ${hubIds.join(', ')}` : ''}`,
    `Critical path order: ${pathArrow}`,
    'Corridors:',
    ...corridors,
    '',
    'GRAPH RULES (validator checks these):',
    '- The key_room ↔ exit_room corridor is the ONLY corridor touching exit_room.',
    '- Do NOT add spawn_room → exit_room or hub → exit_room (bypasses the key).',
    '- key_room must connect to the hub chain AND to exit_room (door on key→exit corridor only).',
    '- With the door corridor edge removed: spawn reaches key_room but NOT exit_room.',
  ];

  if (hasTreasure) {
    lines.push('- treasure_room is a dead-end branch; not on the shortest spawn→exit path.');
  }

  if (derived.targetCorridorCountMax > derived.targetCorridorCount) {
    lines.push(
      `- Optional: add exactly 1 extra corridor between two non-exit rooms for a loop (${derived.targetCorridorCountMax} total).`
    );
  }

  return lines.join('\n');
}
