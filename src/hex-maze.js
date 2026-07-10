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

function shortestPathLength(maze, start, goal){
  if(start === goal) return 0;
  const queue = [[start, 0]];
  const seen = new Set([start]);
  for(let cursor = 0; cursor < queue.length; cursor++){
    const [key, distance] = queue[cursor];
    for(const next of openNeighborKeys(maze, key)){
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

function carvePerfectMaze(maze, random){
  const keys = [...maze.cells.keys()];
  const start = maze.cells.has('0,0') ? '0,0' : keys[0];
  const visited = new Set([start]);
  const stack = [start];
  maze.steps.push({ phase:'start', cellKeys:[start] });

  while(stack.length){
    const current = stack[stack.length - 1];
    const candidates = shuffled(neighborKeys(maze, current), random)
      .filter(key => !visited.has(key));
    if(!candidates.length){
      stack.pop();
      continue;
    }
    const next = candidates[0];
    const edge = edgeKey(current, next);
    maze.openEdges.add(edge);
    visited.add(next);
    stack.push(next);
    maze.steps.push({ phase:'carve', edge, cellKeys:[current, next] });
  }
}

function braidDeadEnds(maze, random, minLoopLength){
  maze.originalDeadEnds = [...maze.cells.keys()].filter(key => degree(maze, key) === 1);
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
      maze.steps.push({ phase:'braid', edge, cellKeys:[key, chosen.next], loopLength:chosen.loopLength });
      opened++;
    }
    if(!opened) break;
  }
}

function roomFrontier(maze, roomCells, unassigned){
  const frontier = new Set();
  for(const key of roomCells){
    for(const next of openNeighborKeys(maze, key)){
      if(unassigned.has(next)) frontier.add(next);
    }
  }
  return [...frontier];
}

function hexDistance(a, b){
  const as = -a.q - a.r;
  const bs = -b.q - b.r;
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(as - bs));
}

function segmentRooms(maze, random, minRoomSize, maxRoomSize){
  const unassigned = new Set(maze.cells.keys());
  const rawRooms = [];
  let nextRoomId = 0;

  while(unassigned.size){
    const choices = [...unassigned];
    const lowestDegree = Math.min(...choices.map(key => openNeighborKeys(maze, key).filter(next => unassigned.has(next)).length));
    const constrained = choices.filter(key => openNeighborKeys(maze, key).filter(next => unassigned.has(next)).length === lowestDegree);
    const seedKey = constrained[Math.floor(random() * constrained.length)];
    const seed = maze.cells.get(seedKey);
    const target = randomInt(random, minRoomSize, maxRoomSize);
    const roomCells = [seedKey];
    unassigned.delete(seedKey);

    while(roomCells.length < target){
      const frontier = roomFrontier(maze, roomCells, unassigned);
      if(!frontier.length) break;
      frontier.sort((aKey, bKey) => {
        const distance = hexDistance(seed, maze.cells.get(aKey)) - hexDistance(seed, maze.cells.get(bKey));
        return distance || aKey.localeCompare(bKey);
      });
      const near = frontier.slice(0, Math.min(3, frontier.length));
      const chosen = near[Math.floor(random() * near.length)];
      roomCells.push(chosen);
      unassigned.delete(chosen);
    }

    const room = { id:nextRoomId++, type:'combat', cellKeys:roomCells };
    rawRooms.push(room);
    for(const key of roomCells) maze.cells.get(key).roomId = room.id;
    maze.steps.push({ phase:'assign-room', roomId:room.id, cellKeys:[...roomCells], targetSize:target });
  }

  let safety = rawRooms.length * 3;
  while(safety-- > 0){
    const small = rawRooms.find(room => room.cellKeys.length < minRoomSize);
    if(!small || rawRooms.length === 1) break;
    const neighbors = new Map();
    for(const key of small.cellKeys){
      for(const next of openNeighborKeys(maze, key)){
        const targetId = maze.cells.get(next).roomId;
        if(targetId !== small.id) neighbors.set(targetId, (neighbors.get(targetId) || 0) + 1);
      }
    }
    const target = [...neighbors.entries()]
      .map(([id, sharedEdges]) => ({ room:rawRooms.find(room => room.id === id), sharedEdges }))
      .filter(candidate => candidate.room)
      .sort((a, b) => b.sharedEdges - a.sharedEdges || a.room.cellKeys.length - b.room.cellKeys.length)[0]?.room;
    if(!target) break;
    for(const key of small.cellKeys){ maze.cells.get(key).roomId = target.id; target.cellKeys.push(key); }
    maze.steps.push({ phase:'merge-room', roomId:small.id, targetRoomId:target.id, cellKeys:[...small.cellKeys] });
    rawRooms.splice(rawRooms.indexOf(small), 1);
  }

  rawRooms.sort((a, b) => a.id - b.id);
  const idMap = new Map(rawRooms.map((room, index) => [room.id, index]));
  maze.rooms = rawRooms.map((room, index) => ({ id:index, type:room.type, cellKeys:[...room.cellKeys].sort(), size:room.cellKeys.length }));
  for(const cell of maze.cells.values()) cell.roomId = idMap.get(cell.roomId);
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

export function validateHexMaze(maze, { requireBraided = true, minRoomSize = maze.options.minRoomSize } = {}){
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
  if(maze.rooms.some(room => room.cellKeys.length > maze.options.maxRoomSize)) warnings.push('One or more rooms exceed the target size after merging leftovers.');

  return { valid:errors.length === 0, errors, warnings, deadEnds, reachableCells:reachable.size, reachableRooms:roomReachable.size };
}

export function createHexMaze(options = {}){
  const normalized = {
    seed:String(options.seed ?? 'stone-001'),
    radius:Math.max(2, Math.min(12, Math.round(options.radius ?? 5))),
    minRoomSize:Math.max(2, Math.round(options.minRoomSize ?? 4)),
    maxRoomSize:Math.max(2, Math.round(options.maxRoomSize ?? 7)),
    minLoopLength:Math.max(3, Math.round(options.minLoopLength ?? 6)),
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

  carvePerfectMaze(maze, random);
  if(normalized.braidDeadEnds) braidDeadEnds(maze, random, normalized.minLoopLength);
  else maze.originalDeadEnds = [...maze.cells.keys()].filter(key => degree(maze, key) === 1);
  segmentRooms(maze, random, normalized.minRoomSize, normalized.maxRoomSize);
  deriveDoors(maze);
  maze.startRoomId = maze.cells.get(maze.startCellKey)?.roomId ?? 0;
  maze.validation = validateHexMaze(maze, { requireBraided:normalized.braidDeadEnds });
  maze.steps.push({ phase:'complete', valid:maze.validation.valid });
  return maze;
}

