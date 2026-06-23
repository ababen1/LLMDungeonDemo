const ROOM_TYPES = ['spawn', 'exit', 'key', 'treasure', 'connector'];
const SIZE_TIERS = ['small', 'medium', 'large'];
const QUADRANTS = ['NW', 'NE', 'SW', 'SE'];

/**
 * @typedef {Object} Violation
 * @property {string} code
 * @property {string} detail
 */

/**
 * @param {unknown} obj
 * @returns {Violation[]}
 */
export function validateAbstractStructure(obj) {
  const violations = [];
  if (!obj || typeof obj !== 'object') {
    return [{ code: 'SCHEMA', detail: 'Root must be an object' }];
  }

  const layout = /** @type {Record<string, unknown>} */ (obj);

  if (!layout.metadata || typeof layout.metadata !== 'object') {
    violations.push({ code: 'SCHEMA', detail: 'metadata is required' });
  } else {
    const m = /** @type {Record<string, unknown>} */ (layout.metadata);
    if (!Number.isInteger(m.seed)) violations.push({ code: 'SCHEMA', detail: 'metadata.seed must be integer' });
    if (!Number.isInteger(m.difficulty) || m.difficulty < 1 || m.difficulty > 5) {
      violations.push({ code: 'SCHEMA', detail: 'metadata.difficulty must be 1-5' });
    }
    if (!Number.isInteger(m.density) || m.density < 1 || m.density > 5) {
      violations.push({ code: 'SCHEMA', detail: 'metadata.density must be 1-5' });
    }
  }

  if (!Array.isArray(layout.rooms)) {
    violations.push({ code: 'SCHEMA', detail: 'rooms must be an array' });
    return violations;
  }

  const rooms = layout.rooms;
  if (rooms.length < 4 || rooms.length > 6) {
    violations.push({ code: 'SCHEMA', detail: `rooms.length must be 4-6, got ${rooms.length}` });
  }

  const ids = new Set();
  const typeCounts = { spawn: 0, exit: 0, key: 0, treasure: 0, connector: 0 };

  for (const room of rooms) {
    if (!room || typeof room !== 'object') {
      violations.push({ code: 'SCHEMA', detail: 'Each room must be an object' });
      continue;
    }
    const r = /** @type {Record<string, unknown>} */ (room);
    if (typeof r.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(r.id)) {
      violations.push({ code: 'SCHEMA', detail: `Invalid room id: ${r.id}` });
    }
    if (ids.has(r.id)) violations.push({ code: 'SCHEMA', detail: `Duplicate room id: ${r.id}` });
    ids.add(r.id);

    if (!ROOM_TYPES.includes(r.type)) {
      violations.push({ code: 'SCHEMA', detail: `Invalid room type: ${r.type}` });
    } else {
      typeCounts[r.type]++;
    }

    if (!SIZE_TIERS.includes(r.size)) {
      violations.push({ code: 'SCHEMA', detail: `Room ${r.id} size must be small|medium|large` });
    }

    const anchor = r.anchor;
    if (!anchor || typeof anchor !== 'object') {
      violations.push({ code: 'SCHEMA', detail: `Room ${r.id} anchor is required` });
    } else {
      const a = /** @type {Record<string, unknown>} */ (anchor);
      if (!QUADRANTS.includes(a.quadrant)) {
        violations.push({ code: 'SCHEMA', detail: `Room ${r.id} anchor.quadrant invalid` });
      }
    }
  }

  if (typeCounts.spawn !== 1) violations.push({ code: 'SCHEMA', detail: 'Exactly one spawn room required' });
  if (typeCounts.exit !== 1) violations.push({ code: 'SCHEMA', detail: 'Exactly one exit room required' });
  if (typeCounts.key !== 1) violations.push({ code: 'SCHEMA', detail: 'Exactly one key room required' });
  if (typeCounts.treasure > 1) violations.push({ code: 'SCHEMA', detail: 'At most one treasure room' });

  if (!Array.isArray(layout.corridors)) {
    violations.push({ code: 'SCHEMA', detail: 'corridors must be an array' });
  } else {
    const corridors = layout.corridors;
    if (corridors.length < 2 || corridors.length > 4) {
      violations.push({ code: 'SCHEMA', detail: `corridors.length must be 2-4, got ${corridors.length}` });
    }
    const corridorIds = new Set();
    for (const c of corridors) {
      if (!c || typeof c !== 'object') continue;
      const cor = /** @type {Record<string, unknown>} */ (c);
      if (typeof cor.id !== 'string') violations.push({ code: 'SCHEMA', detail: 'corridor id required' });
      if (corridorIds.has(cor.id)) violations.push({ code: 'SCHEMA', detail: `Duplicate corridor id: ${cor.id}` });
      corridorIds.add(cor.id);
      if (!ids.has(cor.from)) violations.push({ code: 'SCHEMA', detail: `corridor from unknown: ${cor.from}` });
      if (!ids.has(cor.to)) violations.push({ code: 'SCHEMA', detail: `corridor to unknown: ${cor.to}` });
    }
  }

  if (!Array.isArray(layout.doors)) {
    violations.push({ code: 'SCHEMA', detail: 'doors must be an array' });
  } else if (layout.doors.length !== 1) {
    violations.push({ code: 'SCHEMA', detail: 'Exactly one door required' });
  } else {
    const door = layout.doors[0];
    if (!door || typeof door !== 'object') {
      violations.push({ code: 'SCHEMA', detail: 'door must be an object' });
    } else {
      const d = /** @type {Record<string, unknown>} */ (door);
      if (d.type !== 'locked') violations.push({ code: 'SCHEMA', detail: 'door type must be locked' });
      if (!Array.isArray(d.blocks) || d.blocks.length !== 2) {
        violations.push({ code: 'SCHEMA', detail: 'door.blocks must be [roomId, roomId]' });
      } else if (!ids.has(d.blocks[0]) || !ids.has(d.blocks[1])) {
        violations.push({ code: 'SCHEMA', detail: 'door.blocks reference unknown rooms' });
      }
      if (typeof d.onCorridor !== 'string') {
        violations.push({ code: 'SCHEMA', detail: 'door.onCorridor required' });
      }
    }
  }

  const selfCheck = layout.selfCheck;
  if (!selfCheck || typeof selfCheck !== 'object') {
    violations.push({ code: 'SCHEMA', detail: 'selfCheck is required' });
  } else {
    const sc = /** @type {Record<string, unknown>} */ (selfCheck);
    for (const key of ['keyBeforeDoor', 'doorBlocksCriticalPath', 'treasureOptional', 'connected']) {
      if (typeof sc[key] !== 'boolean') {
        violations.push({ code: 'SCHEMA', detail: `selfCheck.${key} must be boolean` });
      }
    }
    if (!Number.isInteger(sc.loops) || sc.loops < 0 || sc.loops > 1) {
      violations.push({ code: 'SCHEMA', detail: 'selfCheck.loops must be 0 or 1' });
    }
    if (!Array.isArray(sc.notes)) {
      violations.push({ code: 'SCHEMA', detail: 'selfCheck.notes must be array' });
    }
  }

  return violations;
}

export const ABSTRACT_SCHEMA = {
  ROOM_TYPES,
  SIZE_TIERS,
  QUADRANTS,
};
