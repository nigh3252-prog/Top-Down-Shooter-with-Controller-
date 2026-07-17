import {
  HEX_DIRECTIONS,
  cellKey,
  edgeKey,
  createSeededRandom,
} from './hex-maze.js';

const PASS_ID = 'boundary-half-internal-walls-v1';

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
 * Opens floor(50%) of the closed same-room edges in every room. The maze is
 * mutated intentionally so the renderer, collision, raycasts, and cell
 * pathfinder all use the same new openings. Room boundaries and doors are not
 * candidates because their two cells have different room ids.
 */
export function openHalfInternalWalls(maze){
  if(!maze?.rooms || !maze?.cells || !maze?.openEdges){
    return { pass:PASS_ID, opened:new Set(), byRoom:new Map() };
  }
  if(maze.boundaryInteriorWallPass?.pass === PASS_ID) return maze.boundaryInteriorWallPass;

  const opened = new Set();
  const byRoom = new Map();
  for(const room of maze.rooms){
    const candidates = closedInternalEdgesForRoom(maze, room.id);
    const random = createSeededRandom(`${maze.seed}:${room.id}:${PASS_ID}`);
    const selected = shuffled(candidates, random).slice(0, Math.floor(candidates.length * .5));
    for(const edge of selected){
      maze.openEdges.add(edge);
      opened.add(edge);
    }
    byRoom.set(room.id, Object.freeze({
      originalClosed:candidates.length,
      removed:selected.length,
      remaining:candidates.length - selected.length,
      edges:Object.freeze([...selected]),
    }));
  }

  const pass = { pass:PASS_ID, opened, byRoom };
  Object.defineProperty(maze, 'boundaryInteriorWallPass', {
    value:pass,
    enumerable:false,
    configurable:true,
  });
  return pass;
}
