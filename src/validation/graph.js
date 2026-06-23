/**
 * Graph construction and path algorithms for dungeon layouts.
 */

/**
 * @param {{ rooms: Array<{id: string, pos?: number[], size?: number[]}>, corridors: Array<{from: string, to: string, path?: number[][]}>, doors: Array<{blocks: string[], position?: number[], onCorridor?: string}> }} layout
 */
export function buildGraph(layout) {
  const roomMap = new Map(layout.rooms.map((r) => [r.id, r]));
  const edges = [];
  const edgeSet = new Set();

  function addEdge(a, b) {
    const key = [a, b].sort().join('|');
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push([a, b]);
    }
  }

  for (const c of layout.corridors) {
    addEdge(c.from, c.to);
  }

  if (layout.rooms[0]?.pos) {
    const rooms = layout.rooms;
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        if (roomsShareWall(rooms[i], rooms[j])) {
          addEdge(rooms[i].id, rooms[j].id);
        }
      }
    }
  }

  const door = layout.doors[0];
  const doorEdge = door
    ? { a: door.blocks[0], b: door.blocks[1], onCorridor: door.onCorridor, position: door.position }
    : null;

  return {
    nodes: [...roomMap.keys()],
    edges,
    roomMap,
    doorEdge,
    doorPos: door?.position ?? null,
  };
}

function roomsShareWall(a, b) {
  if (!a.pos || !b.pos || !a.size || !b.size) return false;
  const [ax, ay] = a.pos;
  const [aw, ah] = a.size;
  const [bx, by] = b.pos;
  const [bw, bh] = b.size;

  const aRight = ax + aw;
  const aBottom = ay + ah;
  const bRight = bx + bw;
  const bBottom = by + bh;

  if (ax === bRight || bx === aRight) {
    const overlapStart = Math.max(ay, by);
    const overlapEnd = Math.min(aBottom, bBottom);
    return overlapEnd - overlapStart >= 2;
  }
  if (ay === bBottom || by === aBottom) {
    const overlapStart = Math.max(ax, bx);
    const overlapEnd = Math.min(aRight, bRight);
    return overlapEnd - overlapStart >= 2;
  }
  return false;
}

/**
 * @param {ReturnType<typeof buildGraph>} graph
 * @param {string} start
 * @param {{ excludeEdge?: [string, string], blockedRooms?: Set<string> }} [options]
 */
export function bfs(graph, start, options = {}) {
  const { excludeEdge, blockedRooms = new Set() } = options;
  const visited = new Set();
  const parent = new Map();
  const queue = [start];
  visited.add(start);

  function edgeBlocked(a, b) {
    if (!excludeEdge) return false;
    const key = [a, b].sort().join('|');
    const exKey = [excludeEdge[0], excludeEdge[1]].sort().join('|');
    return key === exKey;
  }

  while (queue.length > 0) {
    const node = queue.shift();
    for (const [a, b] of graph.edges) {
      let neighbor = null;
      if (a === node) neighbor = b;
      else if (b === node) neighbor = a;
      if (!neighbor || visited.has(neighbor) || blockedRooms.has(neighbor)) continue;
      if (edgeBlocked(node, neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, node);
      queue.push(neighbor);
    }
  }

  return { visited, parent };
}

/**
 * Shortest path with lexicographic tie-break on neighbor order.
 */
export function shortestPath(graph, from, to, options = {}) {
  const { visited, parent } = bfs(graph, from, options);
  if (!visited.has(to)) return null;

  const path = [];
  let cur = to;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = parent.get(cur);
  }
  return path;
}

export function countLoops(graph) {
  const v = graph.nodes.length;
  const e = graph.edges.length;
  if (v === 0) return 0;
  const { visited } = bfs(graph, graph.nodes[0]);
  if (visited.size !== v) return Infinity;
  return e - v + 1;
}

export function getRoomByType(rooms, type) {
  return rooms.find((r) => r.type === type);
}
