import {
  HEX_DIRECTIONS,
  cellKey,
  edgeKey,
  createSeededRandom,
} from './hex-maze.js';

const PASS_ID = 'boundary-half-internal-walls-gapped-v2';

function shuffled(values, random){
  const result = [...values];
  for(let index = result.length - 1; index > 0; index--){
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function closedInternalEdgesForRoom(maze, roomId){
  const room = maze?.rooms?.find(candidate => candidate.id === roomId);
  if(!room) return [];
  const roomKeys = new Set(room.cellKeys);
  const result = [];
  for(const key of room.cellKeys){
    const cell = maze.cells.get(key);
    if(!cell) continue;
    for(const direction of HEX_DIRECTIONS){
      const nextKey = cellKey(cell.q + direction.q, cell.r + direction.r);
      if(!roomKeys.has(nextKey) || key > nextKey) continue;
      const edge = edgeKey(key, nextKey);
      if(!maze.openEdges.has(edge)) result.push(edge);
    }
  }
  return result.sort();
}

/**
 * Selects floor(50%) of the closed same-room walls for a centered navigation
 * gap. The selected edge is opened in the cell graph so enemy pathfinding can
 * use that passage, while boundary-room-wall-gaps.js restores two solid wall
 * segments on either side of the opening for rendering and collision.
 *
 * Cross-room boundaries, doors, and exterior perimeter walls are never
 * candidates because both cells must belong to the same room.
 */
export function replaceHalfInternalWallsWithGaps(maze){
  if(!maze?.rooms || !maze?.cells || !maze?.openEdges){
    return { pass:PASS_ID, gapped:new Set(), opened:new Set(), byRoom:new Map() };
  }
  if(maze.boundaryInteriorWallPass?.pass === PASS_ID) return maze.boundaryInteriorWallPass;

  const gapped = new Set();
  const byRoom = new Map();
  for(const room of maze.rooms){
    const candidates = closedInternalEdgesForRoom(maze, room.id);
    const random = createSeededRandom(`${maze.seed}:${room.id}:${PASS_ID}`);
    const selected = shuffled(candidates, random).slice(0, Math.floor(candidates.length * .5));
    for(const edge of selected){
      // Open only the abstract cell connection. The visual/collision pass adds
      // the two remaining wall pieces back around a real traversable gap.
      maze.openEdges.add(edge);
      gapped.add(edge);
    }
    byRoom.set(room.id, Object.freeze({
      originalClosed:candidates.length,
      gapped:selected.length,
      solid:candidates.length - selected.length,
      edges:Object.freeze([...selected]),
    }));
  }

  // `opened` remains as a compatibility alias for earlier branch code/tests.
  const pass = { pass:PASS_ID, gapped, opened:gapped, byRoom };
  Object.defineProperty(maze, 'boundaryInteriorWallPass', {
    value:pass,
    enumerable:false,
    configurable:true,
  });
  return pass;
}

/** @deprecated Use replaceHalfInternalWallsWithGaps. */
export function openHalfInternalWalls(maze){
  return replaceHalfInternalWallsWithGaps(maze);
}
