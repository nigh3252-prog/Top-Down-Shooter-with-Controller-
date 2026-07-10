import { axialToWorld, buildMazeEdges, hexCorners } from './hex-maze-navigation.js';

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

export function createMazeWorld({ THREE, maze, hexSize = 2.6, wallHeight = 1.8, wallThickness = .18 } = {}){
  if(!THREE || !maze) throw new Error('createMazeWorld requires THREE and a maze.');
  const group = new THREE.Group(); group.name = 'hex maze world';
  const floorGeometry = new THREE.CylinderGeometry(hexSize * .96, hexSize * .96, .12, 6);
  const floorMaterials = maze.rooms.map(room => {
    const color = new THREE.Color().setHSL(((room.id * 67 + 195) % 360) / 360, .32, room.id % 2 ? .20 : .16);
    return new THREE.MeshStandardMaterial({ color, roughness:.95, metalness:.02 });
  });
  for(const cell of maze.cells.values()){
    const floor = new THREE.Mesh(floorGeometry, floorMaterials[cell.roomId]);
    const center = axialToWorld(cell.q, cell.r, hexSize);
    floor.position.set(center.x, -.06, center.z); floor.rotation.y = Math.PI / 6; floor.receiveShadow = true; group.add(floor);
  }

  const wallMaterial = new THREE.MeshStandardMaterial({ color:0x253e42, roughness:.88, metalness:.04 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color:0xd6a63c, emissive:0x4a2c08, roughness:.72 });
  const allEdges = buildMazeEdges(maze, { hexSize });
  for(const edge of allEdges.filter(candidate => !candidate.open)) group.add(makeWallMesh(THREE, edge, wallMaterial, wallHeight, wallThickness));
  const doorMeshes = new Map();
  for(const edge of allEdges.filter(candidate => candidate.door)){
    const mesh = makeWallMesh(THREE, edge, doorMaterial, wallHeight * .9, wallThickness * 1.35);
    mesh.visible = false; mesh.userData.edge = edge; doorMeshes.set(edge.edge, mesh); group.add(mesh);
  }
  let sealedRoomIds = new Set();
  const setSealedRooms = roomIds => {
    sealedRoomIds = new Set(roomIds || []);
    for(const mesh of doorMeshes.values()){
      const edge = mesh.userData.edge;
      mesh.visible = sealedRoomIds.has(edge.roomA) || sealedRoomIds.has(edge.roomB);
    }
  };
  return {
    group, doorMeshes, setSealedRooms,
    get sealedRoomIds(){ return new Set(sealedRoomIds); },
    getCollisionSegments:() => buildMazeEdges(maze, { hexSize, sealedRoomIds }).filter(edge => edge.blocked),
  };
}

