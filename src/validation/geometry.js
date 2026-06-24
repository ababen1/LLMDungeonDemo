/**
 * Geometry checks on compiled layout only.
 * @param {object} compiled
 * @returns {{ code: string, detail: string }[]}
 */
export function checkGeometry(compiled) {
  const violations = [];
  const [gridW, gridH] = compiled.metadata.gridSize;
  const rooms = compiled.rooms;

  for (const room of rooms) {
    const [x, y] = room.pos;
    const [w, h] = room.size;
    if (x < 0 || y < 0 || x + w > gridW || y + h > gridH) {
      violations.push({ code: 'ROOM_OOB', detail: `Room ${room.id} out of bounds` });
    }
    if (w < 2 || h < 2) {
      violations.push({ code: 'ROOM_OOB', detail: `Room ${room.id} size too small` });
    }
  }

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (roomsOverlap(rooms[i], rooms[j])) {
        violations.push({
          code: 'ROOM_OVERLAP',
          detail: `Rooms ${rooms[i].id} and ${rooms[j].id} overlap`,
        });
      }
    }
  }

  for (const corridor of compiled.corridors) {
    const path = corridor.path;
    if (!path || path.length < 2) {
      violations.push({ code: 'CORRIDOR_INVALID', detail: `Corridor ${corridor.id} path too short` });
      continue;
    }

    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if (dx + dy !== 1) {
        violations.push({ code: 'CORRIDOR_INVALID', detail: `Corridor ${corridor.id} not orthogonal at step ${i}` });
      }
    }

    for (const [px, py] of path) {
      if (px < 0 || py < 0 || px >= gridW || py >= gridH) {
        violations.push({ code: 'CORRIDOR_INVALID', detail: `Corridor ${corridor.id} out of bounds` });
      }
    }

    const fromRoom = rooms.find((r) => r.id === corridor.from);
    const toRoom = rooms.find((r) => r.id === corridor.to);
    if (!onRoomPerimeter(path[0], fromRoom)) {
      violations.push({ code: 'CORRIDOR_INVALID', detail: `Corridor ${corridor.id} start not on from room perimeter` });
    }
    if (!onRoomPerimeter(path[path.length - 1], toRoom)) {
      violations.push({ code: 'CORRIDOR_INVALID', detail: `Corridor ${corridor.id} end not on to room perimeter` });
    }

    for (let i = 1; i < path.length - 1; i++) {
      const [px, py] = path[i];
      for (const room of rooms) {
        if (isStrictInterior(px, py, room)) {
          violations.push({
            code: 'CORRIDOR_INVALID',
            detail: `Corridor ${corridor.id} passes through interior of ${room.id}`,
          });
        } else if (
          room.id !== corridor.from &&
          room.id !== corridor.to &&
          onRoomPerimeter([px, py], room)
        ) {
          violations.push({
            code: 'CORRIDOR_INVALID',
            detail: `Corridor ${corridor.id} passes along perimeter of unrelated room ${room.id}`,
          });
        }
      }
    }

    for (const [px, py] of path) {
      for (const room of rooms) {
        if (room.id === corridor.from || room.id === corridor.to) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx;
          const ny = py + dy;
          const [rx, ry] = room.pos;
          const [rw, rh] = room.size;
          if (nx >= rx && nx < rx + rw && ny >= ry && ny < ry + rh) {
            violations.push({
              code: 'CORRIDOR_INVALID',
              detail: `Corridor ${corridor.id} is adjacent to unrelated room ${room.id}`,
            });
          }
        }
      }
    }
  }

  const cellOwners = new Map();
  for (const corridor of compiled.corridors) {
    for (const [px, py] of corridor.path) {
      const key = `${px},${py}`;
      const onRoom = rooms.some((room) => onRoomPerimeter([px, py], room));
      if (onRoom) continue;
      if (cellOwners.has(key) && cellOwners.get(key) !== corridor.id) {
        violations.push({
          code: 'CORRIDOR_INVALID',
          detail: `Corridors ${cellOwners.get(key)} and ${corridor.id} share cell [${px},${py}]`,
        });
      }
      cellOwners.set(key, corridor.id);
    }
  }

  const door = compiled.doors[0];
  if (door?.position) {
    const [dx, dy] = door.position;
    let onPath = false;
    for (const c of compiled.corridors) {
      if (c.id === door.onCorridor || connectsRooms(c, door.blocks)) {
        for (const [px, py] of c.path) {
          if (px === dx && py === dy) onPath = true;
        }
      }
    }
    if (!onPath) {
      violations.push({ code: 'DOOR_POSITION_INVALID', detail: 'door.position not on corridor path' });
    }
  }

  return violations;
}

function roomsOverlap(a, b) {
  const [ax, ay] = a.pos;
  const [aw, ah] = a.size;
  const [bx, by] = b.pos;
  const [bw, bh] = b.size;
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function onRoomPerimeter([px, py], room) {
  if (!room) return false;
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

function connectsRooms(corridor, blocks) {
  return (
    (corridor.from === blocks[0] && corridor.to === blocks[1]) ||
    (corridor.from === blocks[1] && corridor.to === blocks[0])
  );
}
