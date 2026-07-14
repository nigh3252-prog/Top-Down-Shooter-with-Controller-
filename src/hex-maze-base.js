export const HEX_DIRECTIONS = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 0, r: 1 }),
]);

export function cellKey(q, r){ return `${q},${r}`; }

export function edgeKey(a, b){
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function createSeededRandom(seed = 'hex-maze'){
  let h = 2166136261 >>> 0;
  for(const ch of String(seed)){
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return function random(){
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, random){
  const copy = [...values];
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomInt(random, min, max){
  return min + Math.floor(random() * (max - min + 1));
}

export function neighborKeys(maze, key){
  const cell = maze.cells.get(key);
  if(!cell) return [];
  return HEX_DIRECTIONS
    .map(({ q, r }) => cellKey(cell.q + q, cell.r + r))
    .filter(next => maze.cells.has(next));
}

export function hasOpenEdge(maze, a, b){
  return maze.openEdges.has(edgeKey(a, b));
}

export function openNeighborKeys(maze, key){
  return neighborKeys(maze, key).filter(next => hasOpenEdge(maze, key, next));
}

function shortestPathLength(maze, start, goal, allowedCellKeys = null){
  if(start === goal) return 0;
  const allowed = allowedCellKeys ? new Set(allowedCellKeys) : null;
  const queue = [[start, 0]];
  const seen = new Set([start]);
  for(let cursor = 0; cursor < queue.length; cursor++){
    const [key, distance] = queue[cursor];
    for(const next of openNeighborKeys(maze, key)){
      if(allowed && !allowed.has(next)) continue;
      if(next === goal) return distance + 1;
      if(!seen.has(next)){
        seen.add(next);
        queue.push([next, distance + 1]);
      }
    }
  }
  return Infinity;
}

function degree(maze, key){ return openNeighborKeys(maze, key).length; }

function roomDegree(maze, key, roomId){
  return openNeighborKeys(maze, key).filter(next => maze.cells.get(next)?.roomId === roomId).length;
}

function geometricRoomDegree(maze, key, roomId){
  return neighborKeys(maze, key).filter(next => maze.cells.get(next)?.roomId === roomId).length;
}

function buildCells(radius){
  const cells = new Map();
  for(let q = -radius; q <= radius; q++){
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for(let r = rMin; r <= rMax; r++){
      const key = cellKey(q, r);
      cells.set(key, { key, q, r, roomId:null });
    }
  }
  return cells;
}

function hexDistance(a, b){
  const as = -a.q - a.r;
  const bs = -b.q - b.r;
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(as - bs));
}

function geometricFrontier(maze, roomCells, unassigned){
  const frontier = new Set();
  for(const key of roomCells){
    for(const next of neighborKeys(maze, key)){
      if(unassigned.has(next)) frontier.add(next);
    }
  }
  return [...frontier];
}

function roomIsGeometricallyConnectedWithout(maze, room, removedKey){
  const remaining = room.cellKeys.filter(key => key !== removedKey);
  if(!remaining.length) return false;
  const allowed = new Set(remaining);
  const seen = new Set([remaining[0]]);
  const queue = [remaining[0]];
  for(let cursor = 0; cursor < queue.length; cursor++){
    for(const next of neighborKeys(maze, queue[cursor])){
      if(allowed.has(next) && !seen.has(next)){
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === remaining.length;
}

function mergeUndersizedRooms(maze, rawRooms, minRoomSize){
  let safety = rawRooms.length * 4;
  while(safety-- > 0){
    const small = rawRooms.find(room => room.cellKeys.length < minRoomSize);
    if(!small || rawRooms.length === 1) break;
    const neighbors = new Map();
    for(const key of small.cellKeys){
      for(const next of neighborKeys(maze, key)){
        const targetId = maze.cells.get(next).roomId;
        if(targetId !== small.id) neighbors.set(targetId, (neighbors.get(targetId) || 0) + 1);
      }
    }
    const target = [...neighbors.entries()]
      .map(([id, sharedEdges]) => ({ room:rawRooms.find(room => room.id === id), sharedEdges }))
      .filter(candidate => candidate.room)
      .sort((a, b) => b.sharedEdges - a.sharedEdges || a.room.cellKeys.length - b.room.cellKeys.length)[0]?.room;
    if(!target) break;
    for(const key of small.cellKeys){
      maze.cells.get(key).roomId = target.id;
      target.cellKeys.push(key);
    }
    maze.steps.push({ phase:'merge-room', roomId:small.id, targetRoomId:target.id, cellKeys:[...small.cellKeys] });
    rawRooms.splice(rawRooms.indexOf(small), 1);
  }
}

function smoothObviousRoomTails(maze, rawRooms, minRoomSize, maxRoomSize){
  let safety = maze.cells.size * 3;
  while(safety-- > 0){
    let moved = false;
    for(const room of rawRooms){
      if(room.cellKeys.length <= minRoomSize) continue;
      const tails = room.cellKeys.filter(key => geometricRoomDegree(maze, key, room.id) < 2).sort();
      for(const key of tails){
        if(!roomIsGeometricallyConnectedWithout(maze, room, key)) continue;
        const targets = new Map();
        for(const next of neighborKeys(maze, key)){
          const targetId = maze.cells.get(next).roomId;
          if(targetId !== room.id) targets.set(targetId, (targets.get(targetId) || 0) + 1);
        }
        const target = [...targets.entries()]
          .map(([id, contacts]) => ({ room:rawRooms.find(candidate => candidate.id === id), contacts }))
          .filter(candidate => candidate.room && candidate.contacts >= 2 && candidate.room.cellKeys.length < maxRoomSize + 3)
          .sort((a, b) => b.contacts - a.contacts || a.room.cellKeys.length - b.room.cellKeys.length)[0]?.room;
        if(!target) continue;
        room.cellKeys.splice(room.cellKeys.indexOf(key), 1);
        target.cellKeys.push(key);
        maze.cells.get(key).roomId = target.id;
        maze.steps.push({ phase:'smooth-room', roomId:room.id, targetRoomId:target.id, cellKeys:[key] });
        moved = true;
        break;
      }
      if(moved) break;
    }
    if(!moved) break;
  }
}

function segmentRooms(maze, random, minRoomSize, maxRoomSize){
  const unassigned = new Set(maze.cells.keys());
  const rawRooms = [];
  let nextRoomId = 0;

  while(unassigned.size){
    const choices = [...unassigned];
    const lowestDegree = Math.min(...choices.map(key => neighborKeys(maze, key).filter(next => unassigned.has(next)).length));
    const constrained = choices.filter(key => neighborKeys(maze, key).filter(next => unassigned.has(next)).length === lowestDegree);
    const seedKey = constrained[Math.floor(random() * constrained.length)];
    const seed = maze.cells.get(seedKey);
    const target = randomInt(random, minRoomSize, maxRoomSize);
    const roomCells = [seedKey];
    const roomSet = new Set(roomCells);
    unassigned.delete(seedKey);

    while(roomCells.length < target){
      const frontier = geometricFrontier(maze, roomCells, unassigned);
      if(!frontier.length) break;
      const ranked = frontier.map(key => {
        const sameRoomNeighbors = neighborKeys(maze, key).filter(next => roomSet.has(next)).length;
        const distance = hexDistance(seed, maze.cells.get(key));
        const remainingNeighbors = neighborKeys(maze, key).filter(next => unassigned.has(next)).length;
        return {
          key,
          score:sameRoomNeighbors * 5.2 - distance * 1.35 + Math.min(remainingNeighbors, 3) * .12 + random() * .9,
        };
      }).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
      const pool = ranked.slice(0, Math.min(3, ranked.length));
      const chosen = pool[Math.floor(random() * pool.length)].key;
      roomCells.push(chosen);
      roomSet.add(chosen);
      unassigned.delete(chosen);
    }

    const room = { id:nextRoomId++, type:'combat', cellKeys:roomCells };
    rawRooms.push(room);
    for(const key of roomCells) maze.cells.get(key).roomId = room.id;
    maze.steps.push({ phase:'assign-room', roomId:room.id, cellKeys:[...roomCells], targetSize:target });
  }

  mergeUndersizedRooms(maze, rawRooms, minRoomSize);
  smoothObviousRoomTails(maze, rawRooms, minRoomSize, maxRoomSize);
  mergeUndersizedRooms(maze, rawRooms, minRoomSize);

  rawRooms.sort((a, b) => a.id - b.id);
  const idMap = new Map(rawRooms.map((room, index) => [room.id, index]));
  maze.rooms = rawRooms.map((room, index) => ({
    id:index,
    type:room.type,
    cellKeys:[...new Set(room.cellKeys)].sort(),
    size:new Set(room.cellKeys).size,
  }));
  for(const cell of maze.cells.values()) cell.roomId = idMap.get(cell.roomId);
}

function carveRoomMaze(maze, room, random){
  const allowed = new Set(room.cellKeys);
  const start = room.cellKeys[Math.floor(random() * room.cellKeys.length)];
  const visited = new Set([start]);
  const stack = [start];
  maze.steps.push({ phase:'start-room-maze', roomId:room.id, cellKeys:[start] });

  while(stack.length){
    const current = stack[stack.length - 1];
    const candidates = shuffled(neighborKeys(maze, current), random)
      .filter(key => allowed.has(key) && !visited.has(key));
    if(!candidates.length){
      stack.pop();
      continue;
    }
    const next = candidates[0];
    const edge = edgeKey(current, next);
    maze.openEdges.add(edge);
    visited.add(next);
    stack.push(next);
    maze.steps.push({ phase:'carve-room', roomId:room.id, edge, cellKeys:[current, next] });
  }
}

function braidRoomDeadEnds(maze, room, random, minLoopLength){
  const allowed = new Set(room.cellKeys);
  const original = room.cellKeys.filter(key => roomDegree(maze, key, room.id) === 1);
  maze.originalDeadEnds.push(...original);
  const targetLoopLength = Math.min(minLoopLength, Math.max(3, room.cellKeys.length));
  let safety = room.cellKeys.length * 4;

  while(safety-- > 0){
    const deadEnds = shuffled(room.cellKeys.filter(key => roomDegree(maze, key, room.id) === 1), random);
    if(!deadEnds.length) break;
    let opened = 0;
    for(const key of deadEnds){
      if(roomDegree(maze, key, room.id) !== 1) continue;
      const candidates = neighborKeys(maze, key)
        .filter(next => allowed.has(next) && !hasOpenEdge(maze, key, next))
        .map(next => ({ next, loopLength:shortestPathLength(maze, key, next, allowed) + 1 }));
      if(!candidates.length) continue;
      candidates.sort((a, b) => b.loopLength - a.loopLength || a.next.localeCompare(b.next));
      const preferred = candidates.filter(candidate => candidate.loopLength >= targetLoopLength);
      const pool = preferred.length ? preferred : candidates.filter(candidate => candidate.loopLength === candidates[0].loopLength);
      const chosen = pool[Math.floor(random() * pool.length)];
      const edge = edgeKey(key, chosen.next);
      maze.openEdges.add(edge);
      maze.braidedEdges.add(edge);
      maze.steps.push({ phase:'braid-room', roomId:room.id, edge, cellKeys:[key, chosen.next], loopLength:chosen.loopLength });
      opened++;
    }
    if(!opened) break;
  }
}

function boundaryEdgesByRoomPair(maze){
  const pairs = new Map();
  for(const cell of maze.cells.values()){
    for(const nextKey of neighborKeys(maze, cell.key)){
      if(cell.key > nextKey) continue;
      const next = maze.cells.get(nextKey);
      if(cell.roomId === next.roomId) continue;
      const roomA = Math.min(cell.roomId, next.roomId);
      const roomB = Math.max(cell.roomId, next.roomId);
      const pairKey = `${roomA}|${roomB}`;
      if(!pairs.has(pairKey)) pairs.set(pairKey, { roomA, roomB, edges:[] });
      pairs.get(pairKey).edges.push(edgeKey(cell.key, nextKey));
    }
  }
  for(const pair of pairs.values()) pair.edges.sort();
  return pairs;
}

function openRoomConnection(maze, pair, random, phase){
  const available = pair.edges.filter(edge => !maze.openEdges.has(edge));
  if(!available.length) return null;
  const edge = available[Math.floor(random() * available.length)];
  maze.openEdges.add(edge);
  if(phase !== 'connect-rooms') maze.braidedEdges.add(edge);
  maze.steps.push({ phase, edge, roomIds:[pair.roomA, pair.roomB], cellKeys:edge.split('|') });
  return edge;
}

function crossRoomDoorCounts(maze){
  const counts = new Map(maze.rooms.map(room => [room.id, 0]));
  for(const edge of maze.openEdges){
    const [a, b] = edge.split('|');
    const roomA = maze.cells.get(a).roomId;
    const roomB = maze.cells.get(b).roomId;
    if(roomA !== roomB){
      counts.set(roomA, (counts.get(roomA) || 0) + 1);
      counts.set(roomB, (counts.get(roomB) || 0) + 1);
    }
  }
  return counts;
}

function connectedRoomNeighbors(maze, roomId){
  const neighbors = new Set();
  for(const edge of maze.openEdges){
    const [a, b] = edge.split('|');
    const roomA = maze.cells.get(a).roomId;
    const roomB = maze.cells.get(b).roomId;
    if(roomA === roomId && roomB !== roomA) neighbors.add(roomB);
    if(roomB === roomId && roomA !== roomB) neighbors.add(roomA);
  }
  return neighbors;
}

function connectAndBraidRooms(maze, random, minDoorsPerRoom){
  const pairs = boundaryEdgesByRoomPair(maze);
  const adjacency = new Map(maze.rooms.map(room => [room.id, []]));
  for(const pair of pairs.values()){
    adjacency.get(pair.roomA).push(pair);
    adjacency.get(pair.roomB).push(pair);
  }

  const startRoomId = maze.cells.get(maze.startCellKey)?.roomId ?? 0;
  const visited = new Set([startRoomId]);
  const stack = [startRoomId];
  while(stack.length){
    const current = stack[stack.length - 1];
    const candidates = shuffled(adjacency.get(current) || [], random)
      .filter(pair => !visited.has(pair.roomA === current ? pair.roomB : pair.roomA));
    if(!candidates.length){
      stack.pop();
      continue;
    }
    const pair = candidates[0];
    const next = pair.roomA === current ? pair.roomB : pair.roomA;
    openRoomConnection(maze, pair, random, 'connect-rooms');
    visited.add(next);
    stack.push(next);
  }

  let safety = maze.rooms.length * minDoorsPerRoom * 8;
  while(safety-- > 0){
    const counts = crossRoomDoorCounts(maze);
    const needy = maze.rooms
      .filter(room => (counts.get(room.id) || 0) < minDoorsPerRoom)
      .sort((a, b) => (counts.get(a.id) || 0) - (counts.get(b.id) || 0) || a.id - b.id)[0];
    if(!needy) break;
    const currentNeighbors = connectedRoomNeighbors(maze, needy.id);
    const candidates = (adjacency.get(needy.id) || [])
      .filter(pair => pair.edges.some(edge => !maze.openEdges.has(edge)))
      .map(pair => {
        const other = pair.roomA === needy.id ? pair.roomB : pair.roomA;
        return {
          pair,
          newNeighbor:currentNeighbors.has(other) ? 0 : 1,
          otherNeed:Math.max(0, minDoorsPerRoom - (counts.get(other) || 0)),
          available:pair.edges.filter(edge => !maze.openEdges.has(edge)).length,
          noise:random(),
        };
      })
      .sort((a, b) => b.newNeighbor - a.newNeighbor || b.otherNeed - a.otherNeed || b.available - a.available || b.noise - a.noise);
    if(!candidates.length) break;
    openRoomConnection(maze, candidates[0].pair, random, 'braid-rooms');
  }
}

function braidRemainingGlobalDeadEnds(maze, random, minLoopLength){
  let safety = maze.cells.size * 4;
  while(safety-- > 0){
    const deadEnds = shuffled([...maze.cells.keys()].filter(key => degree(maze, key) === 1), random);
    if(!deadEnds.length) break;
    let opened = 0;
    for(const key of deadEnds){
      if(degree(maze, key) !== 1) continue;
      const candidates = neighborKeys(maze, key)
        .filter(next => !hasOpenEdge(maze, key, next))
        .map(next => ({ next, loopLength:shortestPathLength(maze, key, next) + 1 }));
      if(!candidates.length) continue;
      candidates.sort((a, b) => b.loopLength - a.loopLength || a.next.localeCompare(b.next));
      const preferred = candidates.filter(candidate => candidate.loopLength >= minLoopLength);
      const pool = preferred.length ? preferred : candidates.filter(candidate => candidate.loopLength === candidates[0].loopLength);
      const chosen = pool[Math.floor(random() * pool.length)];
      const edge = edgeKey(key, chosen.next);
      maze.openEdges.add(edge);
      maze.braidedEdges.add(edge);
      maze.steps.push({ phase:'braid-safety', edge, cellKeys:[key, chosen.next], loopLength:chosen.loopLength });
      opened++;
    }
    if(!opened) break;
  }
}

function deriveDoors(maze){
  maze.doors = [];
  for(const edge of maze.openEdges){
    const [a, b] = edge.split('|');
    const roomA = maze.cells.get(a).roomId;
    const roomB = maze.cells.get(b).roomId;
    if(roomA !== roomB) maze.doors.push({ edge, a, b, roomA, roomB });
  }
  maze.doors.sort((a, b) => a.edge.localeCompare(b.edge));
}

export function validateHexMaze(maze, {
  requireBraided = true,
  minRoomSize = maze.options.minRoomSize,
  minDoorsPerRoom = maze.options.minDoorsPerRoom ?? 2,
} = {}){
  const errors = [];
  const warnings = [];
  const keys = [...maze.cells.keys()];
  const reachable = new Set(keys.length ? [keys[0]] : []);
  const queue = keys.length ? [keys[0]] : [];
  for(let cursor = 0; cursor < queue.length; cursor++){
    for(const next of openNeighborKeys(maze, queue[cursor])){
      if(!reachable.has(next)){ reachable.add(next); queue.push(next); }
    }
  }
  if(reachable.size !== maze.cells.size) errors.push(`Maze disconnected: ${reachable.size}/${maze.cells.size} cells reachable.`);

  const deadEnds = keys.filter(key => degree(maze, key) === 1);
  if(requireBraided && deadEnds.length) errors.push(`Braiding left ${deadEnds.length} dead end(s).`);

  const membership = new Map();
  const roomLocalDeadEnds = new Map();
  const roomDoorCounts = new Map(maze.rooms.map(room => [room.id, 0]));
  for(const door of maze.doors){
    roomDoorCounts.set(door.roomA, (roomDoorCounts.get(door.roomA) || 0) + 1);
    roomDoorCounts.set(door.roomB, (roomDoorCounts.get(door.roomB) || 0) + 1);
  }

  for(const room of maze.rooms){
    if(room.cellKeys.length < minRoomSize) errors.push(`Room ${room.id} has only ${room.cellKeys.length} cells.`);
    for(const key of room.cellKeys){
      if(membership.has(key)) errors.push(`Cell ${key} belongs to multiple rooms.`);
      membership.set(key, room.id);
      if(maze.cells.get(key)?.roomId !== room.id) errors.push(`Cell ${key} room metadata disagrees with room ${room.id}.`);
    }
    const allowed = new Set(room.cellKeys);
    const roomSeen = new Set(room.cellKeys.length ? [room.cellKeys[0]] : []);
    const roomQueue = room.cellKeys.length ? [room.cellKeys[0]] : [];
    for(let cursor = 0; cursor < roomQueue.length; cursor++){
      for(const next of openNeighborKeys(maze, roomQueue[cursor])){
        if(allowed.has(next) && !roomSeen.has(next)){ roomSeen.add(next); roomQueue.push(next); }
      }
    }
    if(roomSeen.size !== room.cellKeys.length) errors.push(`Room ${room.id} is not internally connected.`);
    const localDeadEnds = room.cellKeys.filter(key => roomDegree(maze, key, room.id) < 2);
    roomLocalDeadEnds.set(room.id, localDeadEnds);
    if(localDeadEnds.length) warnings.push(`Room ${room.id} retains ${localDeadEnds.length} unavoidable room-local dead end(s).`);
    if((roomDoorCounts.get(room.id) || 0) < minDoorsPerRoom){
      errors.push(`Room ${room.id} has only ${roomDoorCounts.get(room.id) || 0} door(s).`);
    }
  }
  if(membership.size !== maze.cells.size) errors.push(`${maze.cells.size - membership.size} cell(s) have no room.`);

  const expectedDoors = new Set();
  for(const edge of maze.openEdges){
    const [a, b] = edge.split('|');
    if(maze.cells.get(a).roomId !== maze.cells.get(b).roomId) expectedDoors.add(edge);
  }
  const actualDoors = new Set(maze.doors.map(door => door.edge));
  if(expectedDoors.size !== actualDoors.size || [...expectedDoors].some(edge => !actualDoors.has(edge))){
    errors.push('Door list does not match cross-room passages.');
  }

  const roomReachable = new Set(maze.rooms.length ? [maze.startRoomId] : []);
  const roomQueue = maze.rooms.length ? [maze.startRoomId] : [];
  for(let cursor = 0; cursor < roomQueue.length; cursor++){
    const id = roomQueue[cursor];
    for(const door of maze.doors){
      const next = door.roomA === id ? door.roomB : door.roomB === id ? door.roomA : null;
      if(next !== null && !roomReachable.has(next)){ roomReachable.add(next); roomQueue.push(next); }
    }
  }
  if(roomReachable.size !== maze.rooms.length) errors.push(`Room graph disconnected: ${roomReachable.size}/${maze.rooms.length} rooms reachable.`);
  if(maze.rooms.some(room => room.cellKeys.length > maze.options.maxRoomSize + 3)) warnings.push('One or more rooms substantially exceed the target size after merging leftovers.');

  return {
    valid:errors.length === 0,
    errors,
    warnings,
    deadEnds,
    roomLocalDeadEnds,
    roomDoorCounts,
    reachableCells:reachable.size,
    reachableRooms:roomReachable.size,
  };
}

export function createHexMaze(options = {}){
  const normalized = {
    seed:String(options.seed ?? 'stone-001'),
    radius:Math.max(2, Math.min(12, Math.round(options.radius ?? 5))),
    minRoomSize:Math.max(3, Math.round(options.minRoomSize ?? 4)),
    maxRoomSize:Math.max(3, Math.round(options.maxRoomSize ?? 7)),
    minLoopLength:Math.max(3, Math.round(options.minLoopLength ?? 6)),
    minDoorsPerRoom:Math.max(2, Math.round(options.minDoorsPerRoom ?? 2)),
    braidDeadEnds:options.braidDeadEnds !== false,
  };
  normalized.maxRoomSize = Math.max(normalized.minRoomSize, normalized.maxRoomSize);
  const random = createSeededRandom(normalized.seed);
  const maze = {
    seed:normalized.seed,
    options:normalized,
    cells:buildCells(normalized.radius),
    openEdges:new Set(),
    braidedEdges:new Set(),
    originalDeadEnds:[],
    rooms:[],
    doors:[],
    steps:[],
    startCellKey:'0,0',
    startRoomId:0,
  };

  segmentRooms(maze, random, normalized.minRoomSize, normalized.maxRoomSize);
  for(const room of maze.rooms){
    carveRoomMaze(maze, room, random);
    if(normalized.braidDeadEnds) braidRoomDeadEnds(maze, room, random, normalized.minLoopLength);
  }
  connectAndBraidRooms(maze, random, normalized.minDoorsPerRoom);
  if(normalized.braidDeadEnds) braidRemainingGlobalDeadEnds(maze, random, normalized.minLoopLength);
  deriveDoors(maze);
  maze.startRoomId = maze.cells.get(maze.startCellKey)?.roomId ?? 0;
  maze.validation = validateHexMaze(maze, { requireBraided:normalized.braidDeadEnds });
  maze.steps.push({ phase:'complete', valid:maze.validation.valid });
  return maze;
}
