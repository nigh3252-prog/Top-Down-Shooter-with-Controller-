const SQRT3 = Math.sqrt(3);
export const HEX_DIRS = [
  { q:1, r:0, name:'E' }, { q:1, r:-1, name:'NE' }, { q:0, r:-1, name:'NW' },
  { q:-1, r:0, name:'W' }, { q:-1, r:1, name:'SW' }, { q:0, r:1, name:'SE' }
];
const OPPOSITE = [3,4,5,0,1,2];

function mulberry32(seed){
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
}
function key(q,r){ return `${q},${r}`; }
function shuffle(a, rnd){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function hexDistance(a,b){ return (Math.abs(a.q-b.q)+Math.abs(a.q+a.r-b.q-b.r)+Math.abs(a.r-b.r))/2; }
function connect(level, a, dir, b){ a.openEdges.add(dir); b.openEdges.add(OPPOSITE[dir]); }

export function axialToWorld(q, r, radius){
  return { x: radius * SQRT3 * (q + r/2), z: radius * 1.5 * r };
}
export function hexCorners(center, radius){
  const pts = [];
  for(let i=0;i<6;i++){
    const a = Math.PI/180 * (60*i - 30);
    pts.push({ x:center.x + radius*Math.cos(a), z:center.z + radius*Math.sin(a) });
  }
  return pts;
}
export function edgeBetween(level, cell, dir, radius=level.cellRadius*.96){
  const pts = hexCorners(cell.center, radius);
  return { a:pts[dir], b:pts[(dir+1)%6] };
}

export function generateHexMaze({ rows=15, cols=15, cellRadius=18, seed=7331, roomMin=4, roomMax=7 } = {}){
  const rnd = mulberry32(seed);
  const level = { rows, cols, cellRadius, cells:new Map(), rooms:[], doors:[], events:[], buildSteps:[], startRoomId:0, startCellId:null, hexDistance };
  for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){
    const p = axialToWorld(q - Math.floor(cols/2), r - Math.floor(rows/2), cellRadius);
    const id = key(q,r);
    level.cells.set(id, { id, q, r, center:p, neighbors:new Map(), openEdges:new Set(), roomId:null, visitIndex:-1 });
  }
  for(const c of level.cells.values()) for(let d=0; d<6; d++){
    const n = level.cells.get(key(c.q + HEX_DIRS[d].q, c.r + HEX_DIRS[d].r));
    if(n) c.neighbors.set(d, n.id);
  }

  // Growing-tree maze: start from one cell, repeatedly attach an adjacent unvisited cell.
  const start = level.cells.get(key(Math.floor(cols/2), Math.floor(rows/2))) || level.cells.values().next().value;
  level.startCellId = start.id;
  const stack = [start]; const visited = new Set([start.id]); start.visitIndex = 0; level.buildSteps.push(start.id);
  level.events.push({ type:'visitCell', cell:start.id });
  while(stack.length){
    const c = stack[stack.length - 1];
    const options = shuffle([...c.neighbors.entries()].filter(([,id]) => !visited.has(id)), rnd);
    if(!options.length){ stack.pop(); continue; }
    const [dir, nid] = options[0]; const n = level.cells.get(nid);
    connect(level, c, dir, n);
    level.events.push({ type:'openEdge', cell:c.id, dir, to:n.id, phase:'carve' });
    visited.add(n.id); n.visitIndex = level.buildSteps.length; level.buildSteps.push(n.id);
    level.events.push({ type:'visitCell', cell:n.id });
    stack.push(n);
  }

  // Dead-end reduction: link each dead end to the earliest adjacent already-built cell.
  for(const c of level.cells.values()){
    if(c.openEdges.size !== 1) continue;
    const candidates = [...c.neighbors.entries()]
      .filter(([dir,nid]) => !c.openEdges.has(dir))
      .map(([dir,nid]) => [dir, level.cells.get(nid)])
      .filter(([,n]) => n && n.visitIndex >= 0)
      .sort((a,b) => a[1].visitIndex - b[1].visitIndex);
    if(candidates.length){
      connect(level, c, candidates[0][0], candidates[0][1]);
      level.events.push({ type:'openEdge', cell:c.id, dir:candidates[0][0], to:candidates[0][1].id, phase:'deadEndLoop' });
    }
  }

  const unassigned = new Set(level.cells.keys());
  while(unassigned.size){
    const startId = shuffle([...unassigned], rnd)[0];
    const target = roomMin + Math.floor(rnd() * (roomMax - roomMin + 1));
    const room = { id:level.rooms.length, cells:[], neighbors:new Set(), doors:[] };
    const frontier = [startId]; unassigned.delete(startId);
    while(frontier.length && room.cells.length < target){
      const id = frontier.shift(); const c = level.cells.get(id);
      c.roomId = room.id; room.cells.push(id);
      level.events.push({ type:'assignRoom', cell:id, room:room.id });
      const next = shuffle([...c.openEdges].map(dir => c.neighbors.get(dir)).filter(nid => unassigned.has(nid)), rnd);
      for(const nid of next){ if(room.cells.length + frontier.length >= target) break; unassigned.delete(nid); frontier.push(nid); }
    }
    level.rooms.push(room);
  }
  for(const room of [...level.rooms]){
    if(room.cells.length >= roomMin) continue;
    const counts = new Map();
    for(const id of room.cells){
      const c = level.cells.get(id);
      for(const dir of c.openEdges){ const rid = level.cells.get(c.neighbors.get(dir))?.roomId; if(rid !== undefined && rid !== room.id) counts.set(rid, (counts.get(rid)||0)+1); }
    }
    const target = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    if(target !== undefined){ const dest = level.rooms[target]; for(const id of room.cells){ level.cells.get(id).roomId = dest.id; dest.cells.push(id); level.events.push({ type:'assignRoom', cell:id, room:dest.id, phase:'mergeTinyRoom' }); } room.cells.length = 0; }
  }
  const liveRooms = level.rooms.filter(r=>r.cells.length).map((r,i)=>({ ...r, id:i, neighbors:new Set(), doors:[] }));
  const remap = new Map(); level.rooms.forEach(r=>{ if(r.cells.length) remap.set(r.id, liveRooms.findIndex(x=>x.cells===r.cells)); });
  level.rooms = liveRooms; for(const c of level.cells.values()) c.roomId = remap.get(c.roomId);
  // A combat room is one open arena: remove any closed walls between adjacent cells
  // after the room partition is finalized so rendering and collision agree.
  for(const c of level.cells.values()) for(const [dir,nid] of c.neighbors){
    const n = level.cells.get(nid);
    if(n && n.roomId === c.roomId && !c.openEdges.has(dir)){
      connect(level, c, dir, n);
      level.events.push({ type:'openEdge', cell:c.id, dir, to:n.id, phase:'roomInterior' });
    }
  }

  const seenDoor = new Set();
  for(const c of level.cells.values()) for(const dir of c.openEdges){
    const n = level.cells.get(c.neighbors.get(dir)); if(!n || c.roomId === n.roomId) continue;
    const a = Math.min(c.roomId, n.roomId), b = Math.max(c.roomId, n.roomId); const pair = [c.id, n.id].sort().join('|');
    if(seenDoor.has(pair)) continue; seenDoor.add(pair);
    const door = { id:level.doors.length, roomA:a, roomB:b, cellA:c.id, cellB:n.id, dirFromA:dir, open:false };
    level.doors.push(door); level.rooms[a].neighbors.add(b); level.rooms[b].neighbors.add(a); level.rooms[a].doors.push(door.id); level.rooms[b].doors.push(door.id);
    level.events.push({ type:'createDoor', door:door.id, cellA:c.id, cellB:n.id, roomA:a, roomB:b });
  }
  level.startRoomId = level.cells.get(level.startCellId).roomId;
  return level;
}

export function roomCenter(level, roomId){
  const room = level.rooms[roomId]; let x=0,z=0;
  for(const id of room.cells){ const c = level.cells.get(id); x += c.center.x; z += c.center.z; }
  const n = Math.max(1, room.cells.length); return { x:x/n, z:z/n };
}
export function nearestCell(level, x, z, roomIds=null){
  let best=null, bd=Infinity;
  const ids = roomIds ? [...roomIds].flatMap(rid => level.rooms[rid]?.cells || []) : [...level.cells.keys()];
  for(const id of ids){ const c = level.cells.get(id); const d=(c.center.x-x)**2+(c.center.z-z)**2; if(d<bd){ bd=d; best=c; } }
  return best;
}
export function randomPointInRoom(level, roomId, rnd=Math.random){
  const room = level.rooms[roomId]; const c = level.cells.get(room.cells[Math.floor(rnd()*room.cells.length)]);
  const a = rnd()*Math.PI*2, r = level.cellRadius * (.12 + rnd()*.42);
  return { x:c.center.x + Math.cos(a)*r, z:c.center.z + Math.sin(a)*r };
}
export function resolveRoomMovement(level, from, to, allowedRoomIds, radius=1.1){
  const fromCell = nearestCell(level, from.x, from.z, allowedRoomIds);
  const toCell = nearestCell(level, to.x, to.z, allowedRoomIds);
  if(!toCell) return { ...from };
  if(fromCell && fromCell.id !== toCell.id){
    let dirTo = -1;
    for(const [dir,nid] of fromCell.neighbors) if(nid === toCell.id){ dirTo = dir; break; }
    if(dirTo < 0 || !fromCell.openEdges.has(dirTo) || !allowedRoomIds.has(toCell.roomId)) return { ...from };
  }
  const dx = to.x - toCell.center.x, dz = to.z - toCell.center.z;
  const max = level.cellRadius * .98 - radius;
  const d = Math.hypot(dx,dz);
  if(d <= max) return { x:to.x, z:to.z };
  return { x:toCell.center.x + dx/d*max, z:toCell.center.z + dz/d*max };
}
export function doorWorld(level, door){
  const a = level.cells.get(door.cellA), b = level.cells.get(door.cellB);
  return { x:(a.center.x+b.center.x)/2, z:(a.center.z+b.center.z)/2 };
}
export function findDoorBetweenRooms(level, roomA, roomB){
  return level.doors.find(d => (d.roomA === roomA && d.roomB === roomB) || (d.roomA === roomB && d.roomB === roomA));
}
