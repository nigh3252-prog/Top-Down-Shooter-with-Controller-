import { buildMazeEdges } from './hex-maze-navigation.js';

export const CLASSIC_WALL_HEIGHT = 1.8;
export const CLASSIC_WALL_THICKNESS = .18;

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

function activeCellKeys(maze, roomId){
  const room = roomId === null ? null : maze.rooms?.find(candidate => candidate.id === roomId);
  return new Set(room ? room.cellKeys : maze.cells.keys());
}

/**
 * Split a topology edge into the two short slate wall boxes that frame a
 * modern internal navigation gap. The cell graph remains open through the
 * omitted center segment, while the returned pieces retain the source edge's
 * exact wall alignment for movement and line-of-sight collision.
 */
export function splitClassicWallEdgeWithGap(edge, {
  hexSize = 12,
  clearWidth = clamp(Number(hexSize) * .30, 3.8, 5.4),
} = {}){
  const length = edgeLength(edge);
  if(length <= .8) return [];

  const visualGap = Math.min(length * .72, clearWidth);
  const sideFraction = Math.max(.08, (1 - visualGap / length) * .5);
  const leftEnd = pointAlong(edge, sideFraction);
  const rightStart = pointAlong(edge, 1 - sideFraction);
  return [
    {
      ...edge,
      edge:`${edge.edge}:classic-gap-left`,
      sourceEdge:edge.edge,
      part:'classic-gapped-wall-left',
      a:{ ...edge.a },
      b:leftEnd,
      open:false,
      door:false,
      blocked:true,
      boundary:false,
    },
    {
      ...edge,
      edge:`${edge.edge}:classic-gap-right`,
      sourceEdge:edge.edge,
      part:'classic-gapped-wall-right',
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
 * Return every static classic barrier edge for the requested room. This is a
 * pure geometry contract: unlike the forest presentation it never expands a
 * wall into parallel collision lanes or invents off-edge decoration.
 */
export function classicBarrierEdges(maze, { roomId = null, hexSize = 2.6 } = {}){
  if(!maze?.cells || !maze?.rooms) return [];
  const active = activeCellKeys(maze, roomId);
  const runtimeEdges = buildMazeEdges(maze, { hexSize }).filter(edge =>
    active.has(edge.cellA) || (edge.cellB && active.has(edge.cellB))
  );
  const result = runtimeEdges
    .filter(edge => !edge.open && !edge.door && edge.blocked)
    .map(edge => ({ ...edge, part:edge.part || 'classic-wall' }));

  const pass = maze.boundaryInteriorWallPass;
  if(!pass?.gapped?.size) return result;
  const gappedEdges = buildMazeEdges(maze, { hexSize }).filter(edge =>
    pass.gapped.has(edge.edge)
      && active.has(edge.cellA)
      && !!edge.cellB
      && active.has(edge.cellB)
  );
  result.push(...gappedEdges.flatMap(edge => splitClassicWallEdgeWithGap(edge, { hexSize })));
  return result;
}

export function createClassicBarrierGroup({
  THREE,
  edges = [],
  wallHeight = CLASSIC_WALL_HEIGHT,
  wallThickness = CLASSIC_WALL_THICKNESS,
  material = null,
} = {}){
  if(!THREE) throw new Error('createClassicBarrierGroup requires THREE.');
  const group = new THREE.Group();
  group.name = 'classic slate maze barriers';
  const wallMaterial = material || new THREE.MeshStandardMaterial({
    color:0x253e42,
    roughness:.88,
    metalness:.04,
  });
  const meshes = [];
  for(const edge of edges){
    const dx = edge.b.x - edge.a.x;
    const dz = edge.b.z - edge.a.z;
    const length = Math.hypot(dx, dz);
    if(length <= .001) continue;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(length + wallThickness, wallHeight, wallThickness),
      wallMaterial,
    );
    mesh.position.set(
      (edge.a.x + edge.b.x) / 2,
      wallHeight / 2,
      (edge.a.z + edge.b.z) / 2,
    );
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.edge = edge;
    mesh.userData.barrierStyle = 'classic';
    group.add(mesh);
    meshes.push(mesh);
  }
  return { group, meshes, material:wallMaterial };
}
