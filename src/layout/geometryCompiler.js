import { createRng } from '../utils/seededRng.js';
import { quadrantToAnchor, resolveRoomSize } from '../schema/paramDerivation.js';
import { checkSpatialSemantic } from '../validation/spatialSemantic.js';
import { checkGeometry } from '../validation/geometry.js';

/**
 * Deterministically compile abstract layout → pixel-perfect grid coordinates.
 * Retries routing with a seed offset when spatial constraints fail.
 * @param {object} abstract
 * @param {object} derived
 * @param {{ maxAttempts?: number }} [options]
 * @returns {object} compiled dungeon
 */
export function compileLayout(abstract, derived, options = {}) {
  const maxAttempts = options.maxAttempts ?? 8;
  let lastCompiled = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastCompiled = compileLayoutOnce(abstract, derived, attempt);
    const geometryViolations = checkGeometry(lastCompiled);
    const spatialViolations = checkSpatialSemantic(lastCompiled);
    const blocking = [...geometryViolations, ...spatialViolations].filter((v) =>
      [
        'KEY_AFTER_DOOR',
        'DOOR_NOT_BLOCKING',
        'DOOR_BLOCKS_PERMANENTLY',
        'NOT_CONNECTED',
        'CORRIDOR_INVALID',
        'DOOR_POSITION_INVALID',
        'ROOM_OVERLAP',
      ].includes(v.code)
    );
    if (blocking.length === 0) {
      return lastCompiled;
    }
  }

  return lastCompiled;
}

function compileLayoutOnce(abstract, derived, attempt) {
  const rng = createRng(derived.seed + attempt * 7919);
  const [gridW, gridH] = derived.gridSize;
  const placedRooms = [];

  const sortedRooms = [...abstract.rooms].sort((a, b) => a.id.localeCompare(b.id));

  for (const room of sortedRooms) {
    const [sizeW, sizeH] = resolveRoomSize(room.size, derived.seed, room.id, derived.density);
    const [anchorX, anchorY] = quadrantToAnchor(room.anchor.quadrant);
    const jitterX = (rng.next() - 0.5) * 0.08;
    const jitterY = (rng.next() - 0.5) * 0.08;
    const centerX = (anchorX + jitterX) * gridW;
    const centerY = (anchorY + jitterY) * gridH;
    let posX = Math.round(centerX - sizeW / 2);
    let posY = Math.round(centerY - sizeH / 2);

    const pos = resolveNonOverlapping(posX, posY, sizeW, sizeH, placedRooms, gridW, gridH, rng, room.id);
    placedRooms.push({
      id: room.id,
      type: room.type,
      pos,
      size: [sizeW, sizeH],
    });
  }

  const roomById = Object.fromEntries(placedRooms.map((r) => [r.id, r]));
  const compiledCorridors = [];
  const usedCorridorCells = new Set();
  const doorCorridorId = abstract.doors[0]?.onCorridor;
  const corridorOrder = [...abstract.corridors].sort((a, b) => {
    if (a.id === doorCorridorId) return -1;
    if (b.id === doorCorridorId) return 1;
    return a.id.localeCompare(b.id);
  });

  for (const corridor of corridorOrder) {
    const fromRoom = roomById[corridor.from];
    const toRoom = roomById[corridor.to];
    const path = routeCorridor(
      fromRoom,
      toRoom,
      placedRooms,
      gridW,
      gridH,
      rng,
      corridor.id,
      usedCorridorCells
    );
    reserveCorridorCells(path, usedCorridorCells);
    compiledCorridors.push({
      id: corridor.id,
      from: corridor.from,
      to: corridor.to,
      path,
    });
  }

  const door = abstract.doors[0];
  const doorCorridor = compiledCorridors.find((c) => c.id === door.onCorridor);
  const doorPosition = pickDoorPosition(doorCorridor, door.blocks, derived.seed);

  return {
    metadata: {
      seed: derived.seed,
      difficulty: derived.difficulty,
      density: derived.density,
      gridSize: [gridW, gridH],
    },
    rooms: placedRooms,
    corridors: compiledCorridors,
    doors: [
      {
        id: door.id,
        type: 'locked',
        blocks: [...door.blocks],
        onCorridor: door.onCorridor,
        position: doorPosition,
      },
    ],
    selfCheck: { ...abstract.selfCheck },
  };
}

function resolveNonOverlapping(x, y, w, h, placed, gridW, gridH, rng, roomId) {
  const offsets = spiralOffsets();
  for (let attempt = 0; attempt < offsets.length; attempt++) {
    const [dx, dy] = offsets[attempt];
    const seedOffset = createRng(rng.nextInt(0, 9999) + attempt);
    const ox = (seedOffset.nextInt(0, 1) * 2 - 1) * Math.floor(attempt / 4);
    const oy = (seedOffset.nextInt(0, 1) * 2 - 1) * Math.floor(attempt / 4);
    let px = clamp(x + dx + ox, 0, gridW - w);
    let py = clamp(y + dy + oy, 0, gridH - h);

    if (!overlapsAny(px, py, w, h, placed)) {
      return [px, py];
    }
  }

  for (let py = 0; py <= gridH - h; py++) {
    for (let px = 0; px <= gridW - w; px++) {
      if (!overlapsAny(px, py, w, h, placed)) {
        return [px, py];
      }
    }
  }

  return [clamp(x, 0, gridW - w), clamp(y, 0, gridH - h)];
}

function overlapsAny(x, y, w, h, placed) {
  for (const r of placed) {
    const [rx, ry] = r.pos;
    const [rw, rh] = r.size;
    if (x < rx + rw && x + w > rx && y < ry + rh && y + h > ry) return true;
  }
  return false;
}

function spiralOffsets() {
  const offsets = [[0, 0]];
  for (let r = 1; r <= 8; r++) {
    for (let dx = -r; dx <= r; dx++) {
      offsets.push([dx, -r], [dx, r]);
    }
    for (let dy = -r + 1; dy < r; dy++) {
      offsets.push([-r, dy], [r, dy]);
    }
  }
  return offsets;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function routeCorridor(fromRoom, toRoom, allRooms, gridW, gridH, rng, corridorId, usedCorridorCells) {
  const starts = rankPerimeterPoints(fromRoom, toRoom, rng, corridorId, 'start');
  const ends = rankPerimeterPoints(toRoom, fromRoom, rng, corridorId, 'end');

  const pairs = [];
  for (const s of starts) {
    for (const e of ends) {
      pairs.push({ s, e, d: dist(s, e) });
    }
  }
  pairs.sort((a, b) => {
    if (a.d !== b.d) return a.d - b.d;
    const sa = `${a.s[0]},${a.s[1]}`;
    const sb = `${b.s[0]},${b.s[1]}`;
    if (sa !== sb) return sa.localeCompare(sb);
    return `${a.e[0]},${a.e[1]}`.localeCompare(`${b.e[0]},${b.e[1]}`);
  });

  const corridorRooms = new Set([fromRoom.id, toRoom.id]);
  for (const { s, e } of pairs) {
    const path = bfsCorridorPath(s, e, allRooms, gridW, gridH, corridorRooms, usedCorridorCells);
    if (path && !pathUsesReservedInterior(path, allRooms, usedCorridorCells)) {
      return path;
    }
  }

  return [starts[0], ends[0]];
}

function reserveCorridorCells(path, usedCorridorCells) {
  for (const point of path) {
    usedCorridorCells.add(pointKey(point));
  }
}

function pathUsesReservedInterior(path, allRooms, usedCorridorCells) {
  for (const point of path) {
    if (usedCorridorCells.has(pointKey(point))) return true;
  }
  return false;
}

function onAnyRoomPerimeter([px, py], allRooms) {
  return allRooms.some((room) => onRoomPerimeter(px, py, room));
}

/**
 * Perimeter attachment points ranked toward the target room (deterministic).
 */
function rankPerimeterPoints(room, towardRoom, rng, corridorId, role) {
  const [rx, ry] = room.pos;
  const [rw, rh] = room.size;
  const [tx, ty] = towardRoom.pos;
  const [tw, th] = towardRoom.size;
  const targetCenter = [tx + tw / 2, ty + th / 2];
  const roomRng = createRng(rng.nextInt(0, 99999) + hash(`${corridorId}-${role}-${room.id}`));

  const candidates = [];
  for (let x = rx; x < rx + rw; x++) {
    candidates.push([x, ry], [x, ry + rh - 1]);
  }
  for (let y = ry + 1; y < ry + rh - 1; y++) {
    candidates.push([rx, y], [rx + rw - 1, y]);
  }

  const unique = dedupePoints(candidates);
  unique.sort((a, b) => {
    const da = dist(a, targetCenter);
    const db = dist(b, targetCenter);
    if (da !== db) return da - db;
    return `${a[0]},${a[1]}`.localeCompare(`${b[0]},${b[1]}`);
  });

  const preferredCount = Math.min(3, unique.length);
  const preferred = unique.slice(0, preferredCount);
  const rotateBy = roomRng.nextInt(0, preferred.length - 1);
  const rotated = [...preferred.slice(rotateBy), ...preferred.slice(0, rotateBy)];

  const rest = unique.filter((p) => !rotated.some((r) => r[0] === p[0] && r[1] === p[1]));
  return [...rotated, ...rest];
}

function dedupePoints(points) {
  const seen = new Set();
  return points.filter(([x, y]) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function dist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

const BFS_NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Grid BFS — every step is orthogonal; no skipped cells.
 * Walkable: empty cells and room perimeters (not strict interiors).
 */
function bfsCorridorPath(start, end, allRooms, gridW, gridH, corridorRooms, usedCorridorCells) {
  const endKey = pointKey(end);
  const parent = new Map();
  parent.set(pointKey(start), null);

  const queue = [start];

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const k = pointKey([x, y]);
    if (k === endKey) return reconstructPath(parent, end);

    for (const [dx, dy] of BFS_NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = pointKey([nx, ny]);
      if (parent.has(nk)) continue;
      if (!isWalkable(nx, ny, allRooms, gridW, gridH, corridorRooms, usedCorridorCells)) continue;
      parent.set(nk, [x, y]);
      queue.push([nx, ny]);
    }
  }

  return null;
}

function pointKey([x, y]) {
  return `${x},${y}`;
}

function reconstructPath(parent, end) {
  const path = [];
  let cur = end;
  while (cur != null) {
    path.unshift(cur);
    cur = parent.get(pointKey(cur));
  }
  return path;
}

function isWalkable(x, y, allRooms, gridW, gridH, corridorRooms, usedCorridorCells) {
  if (x < 0 || y < 0 || x >= gridW || y >= gridH) return false;
  if (usedCorridorCells.has(pointKey([x, y]))) return false;
  if (touchesForeignRoomFloor(x, y, allRooms, corridorRooms)) return false;
  for (const room of allRooms) {
    if (isStrictInterior(x, y, room)) return false;
    if (onRoomPerimeter(x, y, room) && !corridorRooms.has(room.id)) return false;
  }
  return true;
}

function touchesForeignRoomFloor(x, y, allRooms, corridorRooms) {
  for (const [dx, dy] of BFS_NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    for (const room of allRooms) {
      if (corridorRooms.has(room.id)) continue;
      const [rx, ry] = room.pos;
      const [rw, rh] = room.size;
      if (nx >= rx && nx < rx + rw && ny >= ry && ny < ry + rh) return true;
    }
  }
  return false;
}

function onRoomPerimeter(px, py, room) {
  const [rx, ry] = room.pos;
  const [rw, rh] = room.size;
  const onVertical = (px === rx || px === rx + rw - 1) && py >= ry && py < ry + rh;
  const onHorizontal = (py === ry || py === ry + rh - 1) && px >= rx && px < rx + rw;
  return onVertical || onHorizontal;
}

function isStrictInterior(px, py, room) {
  const [rx, ry] = room.pos;
  const [rw, rh] = room.size;
  return px > rx && px < rx + rw - 1 && py > ry && py < ry + rh - 1;
}

/**
 * Verify every consecutive pair differs by exactly 1 orthogonally.
 */
export function isOrthogonalPath(path) {
  for (let i = 0; i < path.length - 1; i++) {
    const dx = Math.abs(path[i + 1][0] - path[i][0]);
    const dy = Math.abs(path[i + 1][1] - path[i][1]);
    if (dx + dy !== 1) return false;
  }
  return true;
}

function pickDoorPosition(corridor, blocks, seed) {
  if (!corridor || !corridor.path || corridor.path.length === 0) {
    return [0, 0];
  }
  const rng = createRng(seed + hash(blocks.join('|') + corridor.id));
  const mid = Math.floor(corridor.path.length / 2);
  const candidates = corridor.path.filter((_, i) => i > 0 && i < corridor.path.length - 1);
  if (candidates.length === 0) {
    return corridor.path[mid];
  }
  return candidates[rng.nextInt(0, candidates.length - 1)];
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
