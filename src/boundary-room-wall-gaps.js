import { buildMazeEdges } from './hex-maze-navigation.js';
import { createMazeForest, forestHalfWidthForHex } from './maze-forest.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function edgeLength(edge){
  return Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z);
}

function pointAlong(edge, t){
  return {
    x:edge.a.x + (edge.b.x - edge.a.x) * t,
    z:edge.a.z + (edge.b.z - edge.a.z) * t,
  };
}

/**
 * Turns one formerly solid wall edge into two real wall pieces with a centered
 * opening. The requested clear width describes the visible opening between the
 * rounded forest-floor wall masses; extra width is reserved for their end caps.
 */
export function splitWallEdgeWithGap(edge, {
  hexSize = 12,
  halfWidth = forestHalfWidthForHex(hexSize),
  clearWidth = clamp(hexSize * .30, 3.8, 5.4),
} = {}){
  const length = edgeLength(edge);
  if(length <= .8) return [];

  const visualGap = Math.min(length * .72, clearWidth + halfWidth * 2);
  const sideFraction = Math.max(.08, (1 - visualGap / length) * .5);
  const leftEnd = pointAlong(edge, sideFraction);
  const rightStart = pointAlong(edge, 1 - sideFraction);

  return [
    {
      ...edge,
      edge:`${edge.edge}:gap-left`,
      sourceEdge:edge.edge,
      part:'gapped-wall-left',
      a:{ ...edge.a },
      b:leftEnd,
      open:false,
      door:false,
      blocked:true,
      boundary:false,
    },
    {
      ...edge,
      edge:`${edge.edge}:gap-right`,
      sourceEdge:edge.edge,
      part:'gapped-wall-right',
      a:rightStart,
      b:{ ...edge.b },
      open:false,
      door:false,
      blocked:true,
      boundary:false,
    },
  ];
}

/**
 * Restores two rendered/colliding wall pieces around every topology edge chosen
 * for a gap. The cell graph remains open through the center, so enemy routing,
 * wall raycasts, and movement collision all agree that the opening is usable.
 */
export function applyBoundaryRoomWallGaps({
  THREE,
  maze,
  roomId = null,
  hexSize = 12,
  wallHeight = 3.2,
  world,
} = {}){
  if(!THREE || !maze || !world?.group) return world;
  const pass = maze.boundaryInteriorWallPass;
  if(!pass?.gapped?.size) return world;

  const room = roomId === null ? null : maze.rooms.find(candidate => candidate.id === roomId);
  const activeCellKeys = new Set(room ? room.cellKeys : maze.cells.keys());
  const halfWidth = forestHalfWidthForHex(hexSize);
  const selectedEdges = buildMazeEdges(maze, { hexSize }).filter(edge =>
    pass.gapped.has(edge.edge)
      && activeCellKeys.has(edge.cellA)
      && !!edge.cellB
      && activeCellKeys.has(edge.cellB)
  );
  const wallSegments = selectedEdges.flatMap(edge => splitWallEdgeWithGap(edge, { hexSize, halfWidth }));
  if(!wallSegments.length) return world;

  const gapForest = createMazeForest({
    THREE,
    maze,
    roomId:`${roomId ?? 'all'}-gapped`,
    wallEdges:wallSegments,
    hexSize,
    wallHeight,
  });
  gapForest.group.name = `partial internal walls with gaps: room ${roomId ?? 'all'}`;
  gapForest.group.userData.boundaryWallGapCount = selectedEdges.length;

  // Nest inside the existing forest group so the Akai material pass treats the
  // partial walls exactly like the remaining full walls.
  if(world.forest?.group) world.forest.group.add(gapForest.group);
  else world.group.add(gapForest.group);

  const baseGetCollisionSegments = world.getCollisionSegments.bind(world);
  world.getCollisionSegments = () => [
    ...baseGetCollisionSegments(),
    ...gapForest.collisionSegments,
  ];

  if(world.forest?.updateCutaways){
    const baseUpdateCutaways = world.forest.updateCutaways.bind(world.forest);
    world.forest.updateCutaways = (dt, player, camera = null) => {
      baseUpdateCutaways(dt, player, camera);
      gapForest.updateCutaways(dt, player, camera);
    };
  }

  world.gappedWalls = {
    sourceEdges:selectedEdges.map(edge => edge.edge),
    segments:wallSegments,
    forest:gapForest,
  };
  world.group.userData.boundaryWallGapCount = selectedEdges.length;
  return world;
}
