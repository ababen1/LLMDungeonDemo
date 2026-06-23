import { buildGraph, bfs, shortestPath, countLoops, getRoomByType } from './graph.js';

/**
 * Semantic checks on abstract or compiled layout (graph topology only).
 * @param {object} layout
 * @param {ReturnType<typeof buildGraph>} graph
 * @returns {{ code: string, detail: string }[]}
 */
export function checkSemantic(layout, graph) {
  const violations = [];
  const rooms = layout.rooms;
  const spawn = getRoomByType(rooms, 'spawn');
  const exit = getRoomByType(rooms, 'exit');
  const key = getRoomByType(rooms, 'key');
  const treasure = getRoomByType(rooms, 'treasure');
  const door = layout.doors[0];

  if (!spawn || !exit || !key || !door) {
    return [{ code: 'SCHEMA', detail: 'Missing required room types for semantic check' }];
  }

  const { visited } = bfs(graph, spawn.id);
  if (visited.size !== rooms.length) {
    const unreachable = rooms.filter((r) => !visited.has(r.id)).map((r) => r.id);
    violations.push({ code: 'NOT_CONNECTED', detail: `unreachable: [${unreachable.join(', ')}]` });
  }

  const loops = countLoops(graph);
  if (loops > 1) {
    violations.push({ code: 'TOO_MANY_LOOPS', detail: `cyclomatic=${loops}` });
  }

  const doorBlocks = door.blocks;
  const doorCorridor = layout.corridors.find((c) => c.id === door.onCorridor);
  if (!doorCorridor) {
    violations.push({ code: 'DOOR_CORRIDOR_INVALID', detail: `door.onCorridor ${door.onCorridor} not found` });
  } else {
    const connectsBlocks =
      (doorCorridor.from === doorBlocks[0] && doorCorridor.to === doorBlocks[1]) ||
      (doorCorridor.from === doorBlocks[1] && doorCorridor.to === doorBlocks[0]);
    if (!connectsBlocks) {
      violations.push({
        code: 'DOOR_CORRIDOR_INVALID',
        detail: 'door.onCorridor must connect door.blocks rooms',
      });
    }
  }

  const keyReachableBeforeDoor = bfs(graph, spawn.id, {
    excludeEdge: [doorBlocks[0], doorBlocks[1]],
  });
  if (!keyReachableBeforeDoor.visited.has(key.id)) {
    violations.push({ code: 'KEY_AFTER_DOOR', detail: 'Key room not reachable before locked door' });
  }

  const exitWithDoorClosed = bfs(graph, spawn.id, {
    excludeEdge: [doorBlocks[0], doorBlocks[1]],
  });
  if (exitWithDoorClosed.visited.has(exit.id)) {
    violations.push({ code: 'DOOR_NOT_BLOCKING', detail: 'Exit reachable with door closed' });
  }

  const exitWithDoorOpen = bfs(graph, spawn.id);
  if (!exitWithDoorOpen.visited.has(exit.id)) {
    violations.push({ code: 'DOOR_BLOCKS_PERMANENTLY', detail: 'Exit unreachable even with door open' });
  }

  if (treasure) {
    const criticalPath = shortestPath(graph, spawn.id, exit.id);
    if (criticalPath && criticalPath.includes(treasure.id)) {
      violations.push({ code: 'TREASURE_ON_CRITICAL_PATH', detail: 'Treasure on spawn→exit shortest path' });
    }
  }

  return violations;
}

/**
 * Cross-verify selfCheck against semantic results.
 */
export function checkSelfCheck(layout, semanticViolations) {
  const violations = [];
  const sc = layout.selfCheck;
  if (!sc) return violations;

  const failedCodes = new Set(semanticViolations.map((v) => v.code));
  const mapping = {
    keyBeforeDoor: 'KEY_AFTER_DOOR',
    doorBlocksCriticalPath: ['DOOR_NOT_BLOCKING', 'DOOR_BLOCKS_PERMANENTLY'],
    treasureOptional: 'TREASURE_ON_CRITICAL_PATH',
    connected: 'NOT_CONNECTED',
  };

  if (sc.keyBeforeDoor && failedCodes.has('KEY_AFTER_DOOR')) {
    violations.push({ code: 'SELFCHECK_DISHONEST', detail: 'keyBeforeDoor true but KEY_AFTER_DOOR failed' });
  }
  if (
    sc.doorBlocksCriticalPath &&
    (failedCodes.has('DOOR_NOT_BLOCKING') || failedCodes.has('DOOR_BLOCKS_PERMANENTLY'))
  ) {
    violations.push({ code: 'SELFCHECK_DISHONEST', detail: 'doorBlocksCriticalPath true but door check failed' });
  }
  if (sc.treasureOptional && failedCodes.has('TREASURE_ON_CRITICAL_PATH')) {
    violations.push({ code: 'SELFCHECK_DISHONEST', detail: 'treasureOptional true but treasure on critical path' });
  }
  if (sc.connected && failedCodes.has('NOT_CONNECTED')) {
    violations.push({ code: 'SELFCHECK_DISHONEST', detail: 'connected true but graph disconnected' });
  }

  const graph = buildGraph(layout);
  const actualLoops = countLoops(graph);
  if (sc.loops !== actualLoops && actualLoops <= 1) {
    if (sc.loops === 0 && actualLoops === 1) {
      violations.push({ code: 'SELFCHECK_DISHONEST', detail: 'loops count mismatch' });
    }
  }
  if (actualLoops > 1 && sc.loops <= 1) {
    violations.push({ code: 'SELFCHECK_DISHONEST', detail: 'loops understated' });
  }

  return violations;
}
