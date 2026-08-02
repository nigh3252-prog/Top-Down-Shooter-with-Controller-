export * from './hex-maze-base.js';

import {
  cellKey,
  createHexMaze as createRoomFirstHexMaze,
} from './hex-maze-base.js';
import { configuredRoomSize } from './maze-runtime-settings.js';
import { getArenaRuntimeConfig } from './arena-runtime-context.js';

function requestedLayout(options = {}){
  const explicit = String(options.layout ?? '').trim().toLowerCase();
  if(explicit) return explicit;

  try{
    const ownLayout = new URLSearchParams(globalThis.location?.search || '').get('layout');
    if(ownLayout) return ownLayout.trim().toLowerCase();
  }catch{
    // Malformed ambient URLs fall through to the explicit runtime config.
  }
  return getArenaRuntimeConfig()?.layout || 'maze';
}

function createOpenArenaMaze(options = {}){
  const key = cellKey(0, 0);
  const normalized = {
    seed:String(options.seed ?? 'enemy-lab-arena'),
    radius:0,
    minRoomSize:1,
    maxRoomSize:1,
    minLoopLength:0,
    minDoorsPerRoom:0,
    braidDeadEnds:false,
    layout:'arena',
  };
  const room = { id:0, type:'combat', cellKeys:[key], size:1 };

  return {
    seed:normalized.seed,
    options:normalized,
    cells:new Map([[key, { key, q:0, r:0, roomId:0 }]]),
    openEdges:new Set(),
    braidedEdges:new Set(),
    originalDeadEnds:[],
    rooms:[room],
    doors:[],
    steps:[
      { phase:'open-arena', roomId:0, cellKeys:[key] },
      { phase:'complete', valid:true },
    ],
    startCellKey:key,
    startRoomId:0,
    validation:{
      valid:true,
      errors:[],
      warnings:[],
      deadEnds:[],
      roomLocalDeadEnds:new Map([[0, []]]),
      roomDoorCounts:new Map([[0, 0]]),
      reachableCells:1,
      reachableRooms:1,
    },
  };
}

export function createHexMaze(options = {}){
  if(requestedLayout(options) === 'arena') return createOpenArenaMaze(options);

  const roomSize = configuredRoomSize(
    options.minRoomSize ?? 4,
    options.maxRoomSize ?? 7,
    options.roomSizePreset ?? null,
  );
  return createRoomFirstHexMaze({
    ...options,
    minRoomSize:roomSize.min,
    maxRoomSize:roomSize.max,
  });
}
