const SQRT3 = Math.sqrt(3);
export const HEX_DIRS = [
  { q:1, r:0, name:'E' }, { q:1, r:-1, name:'NE' }, { q:0, r:-1, name:'NW' },
  { q:-1, r:0, name:'W' }, { q:-1, r:1, name:'SW' }, { q:0, r:1, name:'SE' }
];

function mulberry32(seed){
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
}
function key(q,r){ return `${q},${r}`; }
function shuffle(a, rnd){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function hexDistance(a,b){ return (Math.abs(a.q-b.q)+Math.abs(a.q+a.r-b.q-b.r)+Math.abs(a.r-b.r))/2; }

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

export function generateHexMaze({ rows=15, cols=15, cellRadius=18, seed=7331, roomMin=4, roomMax=7 } = {}){
  const rnd = mulberry32(seed);
  const cells = new Map();
  for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){
    const p = axialToWorld(q - Math.floor(cols/2), r - Math.floor(rows/2), cellRadius);
    const id = key(q,r);
    cells.set(id, { id, q, r, center:p, neighbors:new Map(), roomId:null });
  }
  for(const c of cells.values()) for(let d=0; d<6; d++){
    const n = cells.get(key(c.q + HEX_DIRS[d].q, c.r + HEX_DIRS[d].r));
    if(n) c.neighbors.set(d, n.id);
  }

  const rooms = [];
  const unassigned = new Set(cells.keys());
  while(unassigned.size){
    const startId = shuffle([...unassigned], rnd)[0];
    const target = roomMin + Math.floor(rnd() * (roomMax - roomMin + 1));
    const room = { id:rooms.length, cells:[], neighbors:new Set(), doors:[] };
    const frontier = [startId];
    unassigned.delete(startId);
    while(frontier.length && room.cells.length < target){
      const id = frontier.splice(Math.floor(rnd()*frontier.length),1)[0];
      const c = cells.get(id); c.roomId = room.id; room.cells.push(id);
      const next = shuffle([...c.neighbors.values()].filter(nid => unassigned.has(nid)), rnd);
      for(const nid of next){
        if(room.cells.length + frontier.length >= target) break;
        unassigned.delete(nid); frontier.push(nid);
      }
    }
    rooms.push(room);
  }
  // Merge tiny rooms into neighboring rooms so every combat room is approximately 4-7 hexes.
  for(const room of [...rooms]){
    if(room.cells.length >= roomMin) continue;
    const counts = new Map();
    for(const id of room.cells){
      for(const nid of cells.get(id).neighbors.values()){
        const rid = cells.get(nid).roomId;
        if(rid !== room.id) counts.set(rid, (counts.get(rid)||0)+1);
      }
    }
    const target = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
    if(target !== undefined){
      const dest = rooms[target];
      for(const id of room.cells){ cells.get(id).roomId = dest.id; dest.cells.push(id); }
      room.cells.length = 0;
    }
  }
  const liveRooms = rooms.filter(r=>r.cells.length).map((r,i)=>({ ...r, id:i, neighbors:new Set(), doors:[] }));
  const remap = new Map(); rooms.forEach(r=>{ if(r.cells.length) remap.set(r.id, liveRooms.findIndex(x=>x.cells===r.cells)); });
  for(const c of cells.values()) c.roomId = remap.get(c.roomId);

  const doors = [];
  const seenDoor = new Set();
  for(const c of cells.values()) for(const [dir,nid] of c.neighbors){
    const n = cells.get(nid);
    if(c.roomId === n.roomId) continue;
    const a = Math.min(c.roomId, n.roomId), b = Math.max(c.roomId, n.roomId);
    const doorKey = `${a}:${b}`;
    if(seenDoor.has(doorKey)) continue;
    seenDoor.add(doorKey);
    const door = { id:doors.length, roomA:a, roomB:b, cellA:c.id, cellB:n.id, open:false };
    doors.push(door); liveRooms[a].neighbors.add(b); liveRooms[b].neighbors.add(a); liveRooms[a].doors.push(door.id); liveRooms[b].doors.push(door.id);
  }
  const startCell = cells.get(key(Math.floor(cols/2), Math.floor(rows/2))) || cells.values().next().value;
  return { rows, cols, cellRadius, cells, rooms:liveRooms, doors, startRoomId:startCell.roomId, startCellId:startCell.id, hexDistance };
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
  const cell = nearestCell(level, to.x, to.z, allowedRoomIds);
  if(!cell) return { ...from };
  const dx = to.x - cell.center.x, dz = to.z - cell.center.z;
  const max = level.cellRadius * .98 - radius;
  const d = Math.hypot(dx,dz);
  if(d <= max) return { x:to.x, z:to.z };
  return { x:cell.center.x + dx/d*max, z:cell.center.z + dz/d*max };
}
export function doorWorld(level, door){
  const a = level.cells.get(door.cellA), b = level.cells.get(door.cellB);
  return { x:(a.center.x+b.center.x)/2, z:(a.center.z+b.center.z)/2 };
}
