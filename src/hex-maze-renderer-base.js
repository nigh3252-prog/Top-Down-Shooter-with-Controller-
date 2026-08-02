import { getArenaRuntime } from './arena-runtime-context.js';
import { axialToWorld, buildMazeEdges, hexCorners } from './hex-maze-navigation.js';
import { createMazeForest } from './maze-forest.js';
import {
  CLASSIC_WALL_HEIGHT,
  CLASSIC_WALL_THICKNESS,
  classicBarrierEdges,
  createClassicBarrierGroup,
} from './arena-classic-walls.js';

function roomColor(id, alpha = 1){
  const hue = (id * 67 + 195) % 360;
  return `hsla(${hue},55%,${id % 2 ? 27 : 22}%,${alpha})`;
}

function fitTransform(maze, width, height, hexSize, padding = 28){
  const points = [...maze.cells.values()].map(cell => axialToWorld(cell.q, cell.r, hexSize));
  const xs = points.map(point => point.x), zs = points.map(point => point.z);
  const minX = Math.min(...xs) - hexSize, maxX = Math.max(...xs) + hexSize;
  const minZ = Math.min(...zs) - hexSize, maxZ = Math.max(...zs) + hexSize;
  const scale = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxZ - minZ));
  return { point:point => ({ x:padding + (point.x - minX) * scale, y:padding + (point.z - minZ) * scale }), scale };
}

function pathPolygon(ctx, points){
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.closePath();
}

export function drawMazeDebug(ctx, maze, options = {}){
  const width = options.width ?? ctx.canvas.width;
  const height = options.height ?? ctx.canvas.height;
  const hexSize = options.hexSize ?? 1;
  const transform = fitTransform(maze, width, height, hexSize, options.padding ?? 30);
  const currentStep = maze.steps[Math.max(0, Math.min(maze.steps.length - 1, options.stepIndex ?? maze.steps.length - 1))];
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = options.background ?? '#071014';
  ctx.fillRect(0, 0, width, height);

  for(const cell of maze.cells.values()){
    pathPolygon(ctx, hexCorners(cell.q, cell.r, hexSize).map(transform.point));
    ctx.fillStyle = roomColor(cell.roomId, .96); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1; ctx.stroke();
  }

  const edges = buildMazeEdges(maze, { hexSize });
  for(const edge of edges){
    const a = transform.point(edge.a), b = transform.point(edge.b);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    if(edge.door){
      ctx.strokeStyle = '#f3c969'; ctx.lineWidth = Math.max(2, transform.scale * .08);
      ctx.setLineDash([Math.max(3, transform.scale * .18), Math.max(2, transform.scale * .1)]);
    } else if(edge.blocked){
      ctx.strokeStyle = edge.boundary ? '#d9edf1' : '#91a8ad';
      ctx.lineWidth = Math.max(2, transform.scale * .075); ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'rgba(135,216,220,.16)'; ctx.lineWidth = 1; ctx.setLineDash([]);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if(options.showBraids !== false){
    for(const braidKey of maze.braidedEdges){
      const edge = edges.find(candidate => candidate.edge === braidKey); if(!edge) continue;
      const a = transform.point(edge.a), b = transform.point(edge.b);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#35e5ef'; ctx.lineWidth = Math.max(3, transform.scale * .11); ctx.stroke();
    }
  }

  if(options.showDeadEnds !== false){
    for(const key of maze.originalDeadEnds){
      const cell = maze.cells.get(key); if(!cell) continue;
      const point = transform.point(axialToWorld(cell.q, cell.r, hexSize));
      ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(3, transform.scale * .14), 0, Math.PI * 2);
      ctx.fillStyle = '#ff5d6f'; ctx.fill();
    }
  }

  if(options.showRoomNumbers !== false){
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.max(10, Math.min(22, transform.scale * .48))}px system-ui`; ctx.lineWidth = 3;
    for(const cell of maze.cells.values()){
      const point = transform.point(axialToWorld(cell.q, cell.r, hexSize));
      ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(String(cell.roomId + 1), point.x, point.y);
      ctx.fillStyle = '#ffe34f'; ctx.fillText(String(cell.roomId + 1), point.x, point.y);
    }
  }

  if(currentStep?.cellKeys?.length){
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, transform.scale * .09);
    for(const key of currentStep.cellKeys){
      const cell = maze.cells.get(key); if(!cell) continue;
      pathPolygon(ctx, hexCorners(cell.q, cell.r, hexSize).map(transform.point)); ctx.stroke();
    }
  }
  return { currentStep, transform };
}

function makeWallMesh(THREE, edge, material, wallHeight, thickness){
  const dx = edge.b.x - edge.a.x, dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length + thickness, wallHeight, thickness), material);
  mesh.position.set((edge.a.x + edge.b.x) / 2, wallHeight / 2, (edge.a.z + edge.b.z) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function splitDoorEdge(edge, doorWidth){
  const dx = edge.b.x - edge.a.x, dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz) || 1;
  const ux = dx / length, uz = dz / length;
  const width = Math.min(doorWidth, length * .64);
  const center = { x:(edge.a.x + edge.b.x) / 2, z:(edge.a.z + edge.b.z) / 2 };
  const left = { x:center.x - ux * width / 2, z:center.z - uz * width / 2 };
  const right = { x:center.x + ux * width / 2, z:center.z + uz * width / 2 };
  return {
    door:{ ...edge, a:left, b:right, center },
    wings:[
      { ...edge, edge:`${edge.edge}:left-wing`, door:false, blocked:true, a:edge.a, b:left, part:'door-wing' },
      { ...edge, edge:`${edge.edge}:right-wing`, door:false, blocked:true, a:right, b:edge.b, part:'door-wing' },
    ],
  };
}

function insetDoorTargetTowardRoom(maze, roomId, door, hexSize, inset = .7){
  if(roomId === null) return door;
  const activeCellKey = door.roomA === roomId ? door.cellA : door.roomB === roomId ? door.cellB : null;
  const activeCell = activeCellKey ? maze.cells.get(activeCellKey) : null;
  if(!activeCell) return door;
  const edgeMid = {
    x:(door.a.x + door.b.x) / 2,
    z:(door.a.z + door.b.z) / 2,
  };
  const activeCenter = axialToWorld(activeCell.q, activeCell.r, hexSize);
  const dx = activeCenter.x - edgeMid.x;
  const dz = activeCenter.z - edgeMid.z;
  const length = Math.hypot(dx, dz) || 1;
  const ox = dx / length * inset;
  const oz = dz / length * inset;
  return {
    ...door,
    a:{ x:door.a.x + ox, z:door.a.z + oz },
    b:{ x:door.b.x + ox, z:door.b.z + oz },
    center:{ x:door.center.x + ox, z:door.center.z + oz },
    visualCenter:door.center,
  };
}

export function createMazeWorld({
  THREE, maze, roomId = null, hexSize = 2.6, wallHeight = 1.8,
  wallThickness = .18, doorWidth = 6.4, openedDoorEdges = new Set(), worldStyle = null,
} = {}){
  if(!THREE || !maze) throw new Error('createMazeWorld requires THREE and a maze.');
  const room = roomId === null ? null : maze.rooms.find(candidate => candidate.id === roomId);
  if(roomId !== null && !room) throw new Error(`Unknown maze room ${roomId}.`);
  const activeCellKeys = new Set(room ? room.cellKeys : maze.cells.keys());
  const activeCells = [...activeCellKeys].map(key => maze.cells.get(key)).filter(Boolean);
  const group = new THREE.Group(); group.name = room ? `hex maze room ${roomId}` : 'hex maze world';
  const floorGeometry = new THREE.CylinderGeometry(hexSize * .96, hexSize * .96, .12, 6);
  const floorMaterials = maze.rooms.map(room => {
    const color = new THREE.Color().setHSL(((room.id * 67 + 195) % 360) / 360, .32, room.id % 2 ? .20 : .16);
    return new THREE.MeshStandardMaterial({ color, roughness:.95, metalness:.02 });
  });
  for(const cell of activeCells){
    const floor = new THREE.Mesh(floorGeometry, floorMaterials[cell.roomId]);
    const center = axialToWorld(cell.q, cell.r, hexSize);
    floor.position.set(center.x, -.06, center.z); floor.rotation.y = Math.PI / 6; floor.receiveShadow = true; group.add(floor);
  }

  const barrierStyle = worldStyle?.barrierStyle === 'classic' ? 'classic' : 'forest';
  const barrierWallHeight = barrierStyle === 'classic' ? CLASSIC_WALL_HEIGHT : wallHeight;
  const barrierWallThickness = barrierStyle === 'classic' ? CLASSIC_WALL_THICKNESS : wallThickness;
  const sealedDoorMaterial = new THREE.MeshStandardMaterial({ color:0x6e4a25, emissive:0x351407, roughness:.76 });
  const breakableDoorMaterial = new THREE.MeshStandardMaterial({ color:0xe8a04c, emissive:0x6e2f0b, emissiveIntensity:1.35, roughness:.58 });
  const allEdges = buildMazeEdges(maze, { hexSize });
  const runtimeEdges = allEdges.filter(edge => activeCellKeys.has(edge.cellA) || (edge.cellB && activeCellKeys.has(edge.cellB)));
  const forestEdges = barrierStyle === 'forest'
    ? runtimeEdges.filter(candidate => !candidate.open && !candidate.door)
    : [];
  const classicEdges = barrierStyle === 'classic'
    ? classicBarrierEdges(maze, { roomId, hexSize })
    : [];
  const classicBarrier = barrierStyle === 'classic'
    ? createClassicBarrierGroup({
      THREE,
      edges:classicEdges,
      wallHeight:barrierWallHeight,
      wallThickness:barrierWallThickness,
    })
    : null;
  if(classicBarrier) group.add(classicBarrier.group);
  const doorMeshes = new Map();
  const doorTargets = new Map();
  const doorSplits = new Map();
  const classicDoorWings = [];
  const doorHeight = barrierWallHeight * 1.84;
  for(const edge of runtimeEdges.filter(candidate => candidate.door)){
    const split = splitDoorEdge(edge, doorWidth);
    doorSplits.set(edge.edge, split);
    if(barrierStyle === 'forest') forestEdges.push(...split.wings);
    else {
      classicDoorWings.push(...split.wings);
      for(const wing of split.wings){
        const wingMesh = makeWallMesh(
          THREE,
          wing,
          classicBarrier.material,
          barrierWallHeight,
          barrierWallThickness,
        );
        wingMesh.userData.edge = wing;
        wingMesh.userData.barrierStyle = 'classic';
        classicBarrier.group.add(wingMesh);
      }
    }
    const mesh = makeWallMesh(
      THREE,
      split.door,
      sealedDoorMaterial,
      doorHeight,
      barrierWallThickness * 1.7,
    );
    mesh.userData.edge = split.door;
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.openProgress = 0;
    mesh.userData.state = 'sealed';
    mesh.userData.doorHeight = doorHeight;
    doorMeshes.set(edge.edge, mesh);
    const target = insetDoorTargetTowardRoom(maze, roomId, split.door, hexSize, Math.min(.7, hexSize * .04));
    doorTargets.set(edge.edge, { ...target, mesh, state:'sealed', height:doorHeight });
    group.add(mesh);
  }

  const forest = barrierStyle === 'forest'
    ? createMazeForest({ THREE, maze, roomId, wallEdges:forestEdges, hexSize, wallHeight })
    : null;
  if(forest) group.add(forest.group);
  group.userData.barrierStyle = barrierStyle;

  let sealedRoomIds = new Set();
  let openedEdges = new Set(openedDoorEdges || []);
  let activeRoomCleared = false;
  // Cached wall+door collision segments. getCollisionSegments() is called several
  // times per frame (player movement, per-enemy line-of-sight raycasts, dash/card
  // effects); it used to rebuild a fresh array every call. The set only changes
  // when door state changes, so cache it and invalidate in setDoorStates.
  // Contract: callers must treat the returned array as read-only.
  let collisionSegments = null;
  const setDoorStates = ({ sealedRoomIds:sealed = new Set(), openedDoorEdges:opened = new Set(), roomCleared = false } = {}, { animateOpenedEdge = null } = {}) => {
    sealedRoomIds = new Set(sealed || []);
    openedEdges = new Set(opened || []);
    collisionSegments = null;  // door state changed -> rebuild cached wall segments on next request
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
    const actorPos = forest ? getArenaRuntime()?.actorPos : null;
    if(actorPos && forest?.updateCutaways){
      const player = { x:actorPos.x, z:actorPos.y };
      forest.updateCutaways(dt, player);
    }
  };
  const getCollisionSegments = () => {
    if(collisionSegments) return collisionSegments;
    const segments = barrierStyle === 'forest'
      ? [...forest.collisionSegments]
      : [...classicEdges, ...classicDoorWings];
    for(const edge of runtimeEdges){
      if(!edge.door) continue;
      const split = doorSplits.get(edge.edge) || splitDoorEdge(edge, doorWidth);
      const sealed = sealedRoomIds.has(edge.roomA) || sealedRoomIds.has(edge.roomB);
      if(sealed || !openedEdges.has(edge.edge)) segments.push({ ...split.door, blocked:true, part:'door' });
    }
    collisionSegments = segments;
    return collisionSegments;
  };
  const centers = activeCells.map(cell => axialToWorld(cell.q, cell.r, hexSize));
  const center = centers.reduce((sum, point) => ({ x:sum.x + point.x / centers.length, z:sum.z + point.z / centers.length }), { x:0, z:0 });
  const dispose = () => {
    const geometries = new Set(), materials = new Set();
    group.traverse(object => {
      if(object.geometry) geometries.add(object.geometry);
      if(Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
      else if(object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  };
  setDoorStates({ openedDoorEdges:openedEdges, roomCleared:false });
  return {
    group, roomId, activeCellKeys, center, doorMeshes, doorTargets, forest,
    setDoorStates, update, dispose,
    get sealedRoomIds(){ return new Set(sealedRoomIds); },
    get openedDoorEdges(){ return new Set(openedEdges); },
    getDoorTargets:() => [...doorTargets.values()],
    getCollisionSegments,
  };
}
