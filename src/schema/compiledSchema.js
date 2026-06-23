/**
 * @param {unknown} obj
 * @returns {{ code: string, detail: string }[]}
 */
export function validateCompiledStructure(obj) {
  const violations = [];
  if (!obj || typeof obj !== 'object') {
    return [{ code: 'SCHEMA', detail: 'Root must be an object' }];
  }

  const layout = /** @type {Record<string, unknown>} */ (obj);

  if (!layout.metadata?.gridSize) {
    violations.push({ code: 'SCHEMA', detail: 'metadata.gridSize required' });
  }

  if (!Array.isArray(layout.rooms) || layout.rooms.length === 0) {
    violations.push({ code: 'SCHEMA', detail: 'rooms required' });
    return violations;
  }

  for (const room of layout.rooms) {
    const r = /** @type {Record<string, unknown>} */ (room);
    if (!Array.isArray(r.pos) || r.pos.length !== 2) {
      violations.push({ code: 'SCHEMA', detail: `Room ${r.id} pos invalid` });
    }
    if (!Array.isArray(r.size) || r.size.length !== 2) {
      violations.push({ code: 'SCHEMA', detail: `Room ${r.id} size invalid` });
    }
  }

  if (!Array.isArray(layout.corridors)) {
    violations.push({ code: 'SCHEMA', detail: 'corridors required' });
  } else {
    for (const c of layout.corridors) {
      const cor = /** @type {Record<string, unknown>} */ (c);
      if (!Array.isArray(cor.path) || cor.path.length < 2) {
        violations.push({ code: 'SCHEMA', detail: `Corridor ${cor.id} path invalid` });
      }
    }
  }

  if (!Array.isArray(layout.doors) || layout.doors.length !== 1) {
    violations.push({ code: 'SCHEMA', detail: 'Exactly one door with position required' });
  } else {
    const d = /** @type {Record<string, unknown>} */ (layout.doors[0]);
    if (!Array.isArray(d.position) || d.position.length !== 2) {
      violations.push({ code: 'SCHEMA', detail: 'door.position required' });
    }
  }

  return violations;
}

export const COMPILED_SCHEMA = {};
