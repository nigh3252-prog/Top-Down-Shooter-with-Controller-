import { HEX_DIRECTIONS, cellKey, edgeKey, hasOpenEdge, openNeighborKeys } from './hex-maze.js';

const SQRT3 = Math.sqrt(3);

export function axialToWorld(q, r, hexSize = 2.6){
  return { x:hexSize * SQRT3 * (q + r / 2), z:hexSize * 1.5 * r };
}

function cubeRound(q, r){
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const qDiff = Math.abs(rq - q), rDiff = Math.abs(rr - r), sDiff = Math.abs(rs - s);
  if(qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if(rDiff > sDiff) rr = -rq - rs;
  return { q:rq, r:rr };
}

export function worldToAxial(x, z, hexSize = 2.6){
  return cubeRound((SQRT3 / 3 * x - z / 3) / hexSize, (2 / 3 * z) / hexSize);
}

export function findCellAtPoint(maze, point, hexSize = 2.6){
  const axial = worldToAxial(point.x, point.z, hexSize);
  return maze.cells.get(cellKey(axial.q, axial.r)) || null;
}

export function hexCorners(q, r, hexSize = 2.6){
  const center = axialToWorld(q, r, hexSize);
  return Array.from({ length:6 }, (_, index) => {
    const angle = (30 + index * 60) * Math.PI / 180;
    return { x:center.x + Math.cos(angle) * hexSize, z:center.z + Math.sin(angle) * hexSize };
  });
}

function edgeEndpoints(cell, directionIndex, hexSize){
  const center = axialToWorld(cell.q, cell.r, hexSize);
  const directionAngle = -directionIndex * Math.PI / 3;
  const first = directionAngle - Math.PI / 6;
  const second = directionAngle + Math.PI / 6;
  return [
    { x:center.x + Math.cos(first) * hexSize, z:center.z + Math.sin(first) * hexSize },
    { x:center.x + Math.cos(second) * hexSize, z:center.z + Math.sin(second) * hexSize },
  ];
}

export function buildMazeEdges(maze, {
  hexSize = 2.6,
  sealedRoomIds = new Set(),
  closedDoorEdges = new Set(),
} = {}){
  const edges = [];
  for(const cell of maze.cells.values()){
    HEX_DIRECTIONS.forEach((direction, directionIndex) => {
      const nextKey = cellKey(cell.q + direction.q, cell.r + direction.r);
      const next = maze.cells.get(nextKey);
      if(next && cell.key > nextKey) return;
      const open = !!next && hasOpenEdge(maze, cell.key, nextKey);
      const door = open && cell.roomId !== next.roomId;
      const sealed = door && (sealedRoomIds.has(cell.roomId) || sealedRoomIds.has(next.roomId));
      const closed = door && closedDoorEdges.has(edgeKey(cell.key, nextKey));
      const [a, b] = edgeEndpoints(cell, directionIndex, hexSize);
      edges.push({
        edge:next ? edgeKey(cell.key, nextKey) : `boundary:${cell.key}:${directionIndex}`,
        a, b, cellA:cell.key, cellB:next?.key ?? null,
        roomA:cell.roomId, roomB:next?.roomId ?? null,
        boundary:!next, open, door, sealed, closed, blocked:!open || sealed || closed,
      });
    });
  }
  return edges;
}

function closestPointOnSegment(point, a, b){
  const dx = b.x - a.x, dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSq));
  return { x:a.x + dx * t, z:a.z + dz * t };
}

function pushCircleFromWalls(position, radius, wallSegments){
  let collided = false;
  for(let pass = 0; pass < 3; pass++){
    let moved = false;
    for(const wall of wallSegments){
      const closest = closestPointOnSegment(position, wall.a, wall.b);
      let dx = position.x - closest.x, dz = position.z - closest.z;
      let distance = Math.hypot(dx, dz);
      if(distance >= radius) continue;
      if(distance < 1e-6){
        const sx = wall.b.x - wall.a.x, sz = wall.b.z - wall.a.z;
        dx = -sz; dz = sx; distance = Math.hypot(dx, dz) || 1;
      }
      const push = (radius - distance + 1e-4) / distance;
      position.x += dx * push;
      position.z += dz * push;
      collided = moved = true;
    }
    if(!moved) break;
  }
  return collided;
}

export function resolveCircleMovement(position, delta, radius, wallSegments){
  const result = { x:position.x, z:position.z, collided:false };
  const distance = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.ceil(distance / Math.max(radius * .45, .08)));
  for(let step = 0; step < steps; step++){
    result.x += delta.x / steps;
    result.z += delta.z / steps;
    if(pushCircleFromWalls(result, radius, wallSegments)) result.collided = true;
  }
  return result;
}

function segmentIntersection(a, b, c, d){
  const r = { x:b.x - a.x, z:b.z - a.z };
  const s = { x:d.x - c.x, z:d.z - c.z };
  const cross = r.x * s.z - r.z * s.x;
  if(Math.abs(cross) < 1e-8) return null;
  const q = { x:c.x - a.x, z:c.z - a.z };
  const t = (q.x * s.z - q.z * s.x) / cross;
  const u = (q.x * r.z - q.z * r.x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

export function raycastWalls(start, end, wallSegments){
  let nearest = null;
  for(const wall of wallSegments){
    const t = segmentIntersection(start, end, wall.a, wall.b);
    if(t !== null && (!nearest || t < nearest.t)){
      nearest = { t, wall, x:start.x + (end.x - start.x) * t, z:start.z + (end.z - start.z) * t };
    }
  }
  return nearest;
}

export function findPath(maze, startKey, goalKey, { allowedCellKeys = null, blockedEdges = new Set() } = {}){
  if(!maze.cells.has(startKey) || !maze.cells.has(goalKey)) return [];
  const allowed = allowedCellKeys ? new Set(allowedCellKeys) : null;
  const queue = [startKey];
  const cameFrom = new Map([[startKey, null]]);
  for(let cursor = 0; cursor < queue.length; cursor++){
    const key = queue[cursor];
    if(key === goalKey) break;
    for(const next of openNeighborKeys(maze, key)){
      if(blockedEdges.has(edgeKey(key, next)) || (allowed && !allowed.has(next)) || cameFrom.has(next)) continue;
      cameFrom.set(next, key);
      queue.push(next);
    }
  }
  if(!cameFrom.has(goalKey)) return [];
  const path = [];
  for(let key = goalKey; key !== null; key = cameFrom.get(key)) path.push(key);
  return path.reverse();
}

export function randomPointInRoom(maze, roomId, random = Math.random, hexSize = 2.6){
  const room = maze.rooms.find(candidate => candidate.id === roomId);
  if(!room?.cellKeys.length) return null;
  const cell = maze.cells.get(room.cellKeys[Math.floor(random() * room.cellKeys.length)]);
  const center = axialToWorld(cell.q, cell.r, hexSize);
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * hexSize * .42;
  return { x:center.x + Math.cos(angle) * radius, z:center.z + Math.sin(angle) * radius, cellKey:cell.key };
}

export function projectToWalkable(maze, point, { roomId = null, hexSize = 2.6 } = {}){
  const cell = findCellAtPoint(maze, point, hexSize);
  if(cell && (roomId === null || cell.roomId === roomId)) return { x:point.x, z:point.z, cellKey:cell.key };
  const candidates = [...maze.cells.values()].filter(candidate => roomId === null || candidate.roomId === roomId);
  candidates.sort((a, b) => {
    const aw = axialToWorld(a.q, a.r, hexSize), bw = axialToWorld(b.q, b.r, hexSize);
    return Math.hypot(aw.x - point.x, aw.z - point.z) - Math.hypot(bw.x - point.x, bw.z - point.z);
  });
  if(!candidates.length) return null;
  const center = axialToWorld(candidates[0].q, candidates[0].r, hexSize);
  return { ...center, cellKey:candidates[0].key };
}
