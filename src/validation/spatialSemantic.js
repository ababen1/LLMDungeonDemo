/**
 * Grid-based reachability checks on compiled layouts.
 * Topology-only graph checks miss shortcuts created by corridor geometry.
 */

function cellKey(x, y) {
  return `${x},${y}`;
}

function roomAt(rooms, x, y) {
  return rooms.find((room) => isInsideRoom(room, x, y));
}

function isInsideRoom(room, x, y) {
  if (!room) return false;
  const [rx, ry] = room.pos;
  const [rw, rh] = room.size;
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

/**
 * Walkable cells: room floors + corridor path cells.
 * When the door is closed, the full door-corridor path is blocked outside the key room.
 */
export function buildWalkableSet(compiled, { doorOpen = true } = {}) {
  const walkable = new Set();

  for (const room of compiled.rooms) {
    const [rx, ry] = room.pos;
    const [rw, rh] = room.size;
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        walkable.add(cellKey(x, y));
      }
    }
  }

  for (const corridor of compiled.corridors) {
    for (const [x, y] of corridor.path) {
      walkable.add(cellKey(x, y));
    }
  }

  if (!doorOpen) {
    const door = compiled.doors?.[0];
    const keyRoom = compiled.rooms.find((r) => r.type === 'key');
    const doorCorridor = door ? compiled.corridors.find((c) => c.id === door.onCorridor) : null;

    if (doorCorridor && keyRoom) {
      for (const [x, y] of doorCorridor.path) {
        if (!isInsideRoom(keyRoom, x, y)) {
          walkable.delete(cellKey(x, y));
        }
      }
    } else if (door?.position) {
      const [dx, dy] = door.position;
      walkable.delete(cellKey(dx, dy));
    }
  }

  return walkable;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * BFS on the walkable grid from spawn room cells.
 */
export function spatialBfs(compiled, { doorOpen = true } = {}) {
  const walkable = buildWalkableSet(compiled, { doorOpen });
  const spawn = compiled.rooms.find((r) => r.type === 'spawn');
  const visitedCells = new Set();
  const visitedRooms = new Set();
  const parent = new Map();

  if (!spawn) {
    return { visitedCells, visitedRooms, parent };
  }

  const [sx, sy] = spawn.pos;
  const [sw, sh] = spawn.size;
  const queue = [];

  for (let y = sy; y < sy + sh; y++) {
    for (let x = sx; x < sx + sw; x++) {
      const key = cellKey(x, y);
      if (!walkable.has(key) || visitedCells.has(key)) continue;
      visitedCells.add(key);
      parent.set(key, null);
      queue.push([x, y]);
    }
  }
  visitedRooms.add(spawn.id);

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const hereRoom = roomAt(compiled.rooms, x, y);
    if (hereRoom) visitedRooms.add(hereRoom.id);

    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      const key = cellKey(nx, ny);
      if (!walkable.has(key) || visitedCells.has(key)) continue;
      visitedCells.add(key);
      parent.set(key, cellKey(x, y));
      queue.push([nx, ny]);
    }
  }

  return { visitedCells, visitedRooms, parent };
}

/**
 * Shortest walkable cell path from spawn to exit (door open).
 * @returns {string[] | null} room id sequence along shortest path
 */
export function shortestSpatialRoomPath(compiled) {
  const walkable = buildWalkableSet(compiled, { doorOpen: true });
  const spawn = compiled.rooms.find((r) => r.type === 'spawn');
  const exit = compiled.rooms.find((r) => r.type === 'exit');
  if (!spawn || !exit) return null;

  const dist = new Map();
  const parent = new Map();
  const queue = [];

  const [sx, sy] = spawn.pos;
  const [sw, sh] = spawn.size;
  for (let y = sy; y < sy + sh; y++) {
    for (let x = sx; x < sx + sw; x++) {
      const key = cellKey(x, y);
      if (!walkable.has(key)) continue;
      dist.set(key, 0);
      parent.set(key, null);
      queue.push(key);
    }
  }

  let goalKey = null;
  const [ex, ey] = exit.pos;
  const [ew, eh] = exit.size;
  const exitCells = new Set();
  for (let y = ey; y < ey + eh; y++) {
    for (let x = ex; x < ex + ew; x++) {
      exitCells.add(cellKey(x, y));
    }
  }

  while (queue.length > 0) {
    const key = queue.shift();
    if (exitCells.has(key)) {
      goalKey = key;
      break;
    }

    const [x, y] = key.split(',').map(Number);
    for (const [dx, dy] of NEIGHBORS) {
      const nk = cellKey(x + dx, y + dy);
      if (!walkable.has(nk) || dist.has(nk)) continue;
      dist.set(nk, dist.get(key) + 1);
      parent.set(nk, key);
      queue.push(nk);
    }
  }

  if (!goalKey) return null;

  const cellPath = [];
  let cur = goalKey;
  while (cur != null) {
    const [x, y] = cur.split(',').map(Number);
    cellPath.unshift([x, y]);
    cur = parent.get(cur);
  }

  const roomPath = [];
  for (const [x, y] of cellPath) {
    const room = roomAt(compiled.rooms, x, y);
    if (room && roomPath[roomPath.length - 1] !== room.id) {
      roomPath.push(room.id);
    }
  }
  return roomPath;
}

export function countCorridorLoops(layout) {
  const nodes = layout.rooms.map((r) => r.id);
  const edges = layout.corridors.map((c) => [c.from, c.to]);
  const v = nodes.length;
  if (v === 0) return 0;

  const adj = new Map(nodes.map((id) => [id, []]));
  for (const [a, b] of edges) {
    adj.get(a)?.push(b);
    adj.get(b)?.push(a);
  }

  const visited = new Set();
  const queue = [nodes[0]];
  visited.add(nodes[0]);
  while (queue.length) {
    const node = queue.shift();
    for (const n of adj.get(node) ?? []) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  if (visited.size !== v) return Infinity;
  return edges.length - v + 1;
}

/**
 * @param {object} compiled
 * @returns {{ code: string, detail: string }[]}
 */
export function checkSpatialSemantic(compiled) {
  const violations = [];
  const rooms = compiled.rooms;
  const spawn = rooms.find((r) => r.type === 'spawn');
  const exit = rooms.find((r) => r.type === 'exit');
  const key = rooms.find((r) => r.type === 'key');
  const treasure = rooms.find((r) => r.type === 'treasure');
  const door = compiled.doors?.[0];

  if (!spawn || !exit || !key || !door) {
    return [{ code: 'SCHEMA', detail: 'Missing required room types for spatial semantic check' }];
  }

  const doorCorridor = compiled.corridors.find((c) => c.id === door.onCorridor);
  if (!doorCorridor) {
    violations.push({ code: 'DOOR_CORRIDOR_INVALID', detail: `door.onCorridor ${door.onCorridor} not found` });
  } else {
    const [a, b] = door.blocks;
    const connectsBlocks =
      (doorCorridor.from === a && doorCorridor.to === b) ||
      (doorCorridor.from === b && doorCorridor.to === a);
    if (!connectsBlocks) {
      violations.push({
        code: 'DOOR_CORRIDOR_INVALID',
        detail: 'door.onCorridor must connect door.blocks rooms',
      });
    }
  }

  const open = spatialBfs(compiled, { doorOpen: true });
  if (open.visitedRooms.size !== rooms.length) {
    const unreachable = rooms.filter((r) => !open.visitedRooms.has(r.id)).map((r) => r.id);
    violations.push({ code: 'NOT_CONNECTED', detail: `spatial unreachable: [${unreachable.join(', ')}]` });
  }

  const loops = countCorridorLoops(compiled);
  if (loops > 1) {
    violations.push({ code: 'TOO_MANY_LOOPS', detail: `cyclomatic=${loops}` });
  }

  const closed = spatialBfs(compiled, { doorOpen: false });
  if (!closed.visitedRooms.has(key.id)) {
    violations.push({ code: 'KEY_AFTER_DOOR', detail: 'Key room not reachable before locked door (spatial)' });
  }

  if (closed.visitedRooms.has(exit.id)) {
    violations.push({ code: 'DOOR_NOT_BLOCKING', detail: 'Exit reachable with door closed (spatial shortcut)' });
  }

  if (!open.visitedRooms.has(exit.id)) {
    violations.push({ code: 'DOOR_BLOCKS_PERMANENTLY', detail: 'Exit unreachable even with door open (spatial)' });
  }

  if (treasure) {
    const criticalPath = shortestSpatialRoomPath(compiled);
    if (criticalPath && criticalPath.includes(treasure.id)) {
      violations.push({ code: 'TREASURE_ON_CRITICAL_PATH', detail: 'Treasure on spawn→exit shortest spatial path' });
    }
  }

  return violations;
}
