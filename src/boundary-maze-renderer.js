import { axialToWorld, buildMazeEdges } from './hex-maze-navigation.js';
import { installBoundaryTheme } from './boundary-theme.js';
import { createBoundaryDistrict } from './boundary-district.js';
import {
  createFloorDetailMaterials,
  makeFloorDetail,
  makeFloorMaterials,
  makeHexSeamGeometry,
} from './boundary-floor.js';
import {
  decorateDoorMesh,
  insetDoorTargetTowardRoom,
  makeDoorArch,
  makeWallMesh,
  setDoorAccent,
  splitDoorEdge,
} from './boundary-doors.js';

export function createMazeWorld({
  THREE, maze, roomId = null, hexSize = 2.6, wallHeight = 1.8,
  wallThickness = .18, doorWidth = 6.4, openedDoorEdges = new Set(),
} = {}){
  if(!THREE || !maze) throw new Error('createMazeWorld requires THREE and a maze.');
  installBoundaryTheme();

  const room = roomId === null ? null : maze.rooms.find(candidate => candidate.id === roomId);
  if(roomId !== null && !room) throw new Error(`Unknown maze room ${roomId}.`);
  const activeCellKeys = new Set(room ? room.cellKeys : maze.cells.keys());
  const activeCells = [...activeCellKeys].map(key => maze.cells.get(key)).filter(Boolean);
  const group = new THREE.Group();
  group.name = room ? `boundary district room ${roomId}` : 'boundary district world';

  const floorGeometry = new THREE.CylinderGeometry(hexSize * .965, hexSize * .965, .14, 6);
  const floorMaterials = makeFloorMaterials(THREE, maze);
  const seamGeometry = makeHexSeamGeometry(THREE, hexSize * .958);
  const seamMaterial = new THREE.LineBasicMaterial({ color:0x17343a, transparent:true, opacity:.35 });
  const detailMaterials = createFloorDetailMaterials(THREE);

  for(const cell of activeCells){
    const center = axialToWorld(cell.q, cell.r, hexSize);
    const floor = new THREE.Mesh(floorGeometry, floorMaterials[cell.roomId]);
    floor.position.set(center.x, -.07, center.z);
    floor.rotation.y = Math.PI / 6;
    floor.receiveShadow = true;
    group.add(floor);
    const seam = new THREE.LineLoop(seamGeometry, seamMaterial);
    seam.position.set(center.x, .006, center.z);
    group.add(seam);
    group.add(makeFloorDetail(THREE, cell, center, hexSize, maze, detailMaterials));
  }

  const sealedDoorMaterial = new THREE.MeshStandardMaterial({
    color:0x071014,
    emissive:0x100304,
    emissiveIntensity:.25,
    roughness:.58,
    metalness:.48,
  });
  const breakableDoorMaterial = new THREE.MeshStandardMaterial({
    color:0x8e1715,
    emissive:0xd51f18,
    emissiveIntensity:1.7,
    roughness:.42,
    metalness:.3,
  });
  const allEdges = buildMazeEdges(maze, { hexSize });
  const runtimeEdges = allEdges.filter(edge => activeCellKeys.has(edge.cellA) || (edge.cellB && activeCellKeys.has(edge.cellB)));
  const boundaryEdges = runtimeEdges.filter(candidate => !candidate.open && !candidate.door);
  const doorMeshes = new Map();
  const doorTargets = new Map();
  const doorSplits = new Map();
  const doorHeight = wallHeight * 1.84;

  for(const edge of runtimeEdges.filter(candidate => candidate.door)){
    const split = splitDoorEdge(edge, doorWidth);
    doorSplits.set(edge.edge, split);
    boundaryEdges.push(...split.wings);
    const mesh = makeWallMesh(THREE, split.door, sealedDoorMaterial, doorHeight, wallThickness * 1.7);
    const doorLength = Math.hypot(split.door.b.x - split.door.a.x, split.door.b.z - split.door.a.z);
    decorateDoorMesh(THREE, mesh, doorLength, doorHeight, wallThickness * 1.7);
    mesh.userData.edge = split.door;
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.openProgress = 0;
    mesh.userData.state = 'sealed';
    mesh.userData.doorHeight = doorHeight;
    doorMeshes.set(edge.edge, mesh);
    const target = insetDoorTargetTowardRoom(maze, roomId, split.door, hexSize, Math.min(.7, hexSize * .04));
    doorTargets.set(edge.edge, { ...target, mesh, state:'sealed', height:doorHeight });
    group.add(makeDoorArch(THREE, split.door, doorHeight, wallThickness));
    group.add(mesh);
  }

  const district = createBoundaryDistrict({ THREE, maze, roomId, wallEdges:boundaryEdges, hexSize, wallHeight });
  group.add(district.group);

  let sealedRoomIds = new Set();
  let openedEdges = new Set(openedDoorEdges || []);
  let activeRoomCleared = false;

  const setDoorStates = (
    { sealedRoomIds:sealed = new Set(), openedDoorEdges:opened = new Set(), roomCleared = false } = {},
    { animateOpenedEdge = null } = {},
  ) => {
    sealedRoomIds = new Set(sealed || []);
    openedEdges = new Set(opened || []);
    activeRoomCleared = !!roomCleared;
    for(const [key, mesh] of doorMeshes){
      const edge = mesh.userData.edge;
      const isSealed = sealedRoomIds.has(edge.roomA) || sealedRoomIds.has(edge.roomB);
      const isOpened = openedEdges.has(key) && !isSealed;
      const target = doorTargets.get(key);
      if(isOpened){
        target.state = 'open';
        if(animateOpenedEdge === key){
          mesh.visible = true;
          mesh.userData.state = 'opening';
          mesh.userData.openProgress = 0;
          mesh.position.y = mesh.userData.baseY;
          mesh.scale.y = 1;
        } else {
          mesh.visible = false;
          mesh.userData.state = 'open';
          mesh.userData.openProgress = 1;
        }
      } else {
        const state = activeRoomCleared && !isSealed ? 'breakable' : 'sealed';
        target.state = state;
        mesh.userData.state = state;
        mesh.userData.openProgress = 0;
        mesh.position.y = mesh.userData.baseY;
        mesh.scale.y = 1;
        mesh.material = state === 'breakable' ? breakableDoorMaterial : sealedDoorMaterial;
        setDoorAccent(mesh, state);
        mesh.visible = true;
      }
    }
  };

  const update = dt => {
    for(const mesh of doorMeshes.values()){
      if(mesh.userData.state !== 'opening') continue;
      mesh.userData.openProgress = Math.min(1, mesh.userData.openProgress + dt / .38);
      const p = mesh.userData.openProgress;
      const eased = p * p * (3 - 2 * p);
      mesh.position.y = mesh.userData.baseY - eased * mesh.userData.doorHeight;
      if(p >= 1){ mesh.visible = false; mesh.userData.state = 'open'; }
    }
    const actorPos = globalThis.__arena?.actorPos;
    if(actorPos) district.updateCutaways(dt, { x:actorPos.x, z:actorPos.y });
  };

  const getCollisionSegments = () => {
    const segments = [...district.collisionSegments];
    for(const edge of runtimeEdges){
      if(!edge.door) continue;
      const split = doorSplits.get(edge.edge) || splitDoorEdge(edge, doorWidth);
      const sealed = sealedRoomIds.has(edge.roomA) || sealedRoomIds.has(edge.roomB);
      if(sealed || !openedEdges.has(edge.edge)) segments.push({ ...split.door, blocked:true, part:'door' });
    }
    return segments;
  };

  const centers = activeCells.map(cell => axialToWorld(cell.q, cell.r, hexSize));
  const center = centers.reduce((sum, point) => ({
    x:sum.x + point.x / centers.length,
    z:sum.z + point.z / centers.length,
  }), { x:0, z:0 });

  const dispose = () => {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    group.traverse(object => {
      if(object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      list.forEach(material => {
        materials.add(material);
        if(material.map) textures.add(material.map);
        if(material.emissiveMap) textures.add(material.emissiveMap);
      });
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
  };

  setDoorStates({ openedDoorEdges:openedEdges, roomCleared:false });
  return {
    group,
    roomId,
    activeCellKeys,
    center,
    doorMeshes,
    doorTargets,
    forest:district,
    setDoorStates,
    update,
    dispose,
    get sealedRoomIds(){ return new Set(sealedRoomIds); },
    get openedDoorEdges(){ return new Set(openedEdges); },
    getDoorTargets:() => [...doorTargets.values()],
    getCollisionSegments,
  };
}
