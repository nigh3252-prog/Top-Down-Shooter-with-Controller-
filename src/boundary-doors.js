import { axialToWorld } from './hex-maze-navigation.js';

export function makeWallMesh(THREE, edge, material, wallHeight, thickness){
  const dx = edge.b.x - edge.a.x, dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length + thickness, wallHeight, thickness), material);
  mesh.position.set((edge.a.x + edge.b.x) / 2, wallHeight / 2, (edge.a.z + edge.b.z) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function splitDoorEdge(edge, doorWidth){
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

export function insetDoorTargetTowardRoom(maze, roomId, door, hexSize, inset = .7){
  if(roomId === null) return door;
  const activeCellKey = door.roomA === roomId ? door.cellA : door.roomB === roomId ? door.cellB : null;
  const activeCell = activeCellKey ? maze.cells.get(activeCellKey) : null;
  if(!activeCell) return door;
  const midpoint = { x:(door.a.x + door.b.x) / 2, z:(door.a.z + door.b.z) / 2 };
  const activeCenter = axialToWorld(activeCell.q, activeCell.r, hexSize);
  const dx = activeCenter.x - midpoint.x;
  const dz = activeCenter.z - midpoint.z;
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

function doorSignTexture(THREE, edgeKey){
  if(typeof document === 'undefined') return null;
  const variant = Math.abs(String(edgeKey).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % 4;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#061116'; ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#85aeb1'; ctx.lineWidth = 7; ctx.strokeRect(7, 7, 498, 178);
  const top = ['境界駅', '次の界', '경계역', '門番区'][variant];
  const bottom = ['BOUNDARY STATION', 'NEXT DISTRICT', 'TRANSFER GATE', 'WARDEN SECTOR'][variant];
  ctx.fillStyle = '#f2efe1'; ctx.font = '800 54px sans-serif'; ctx.fillText(top, 34, 78);
  ctx.fillStyle = '#8cc9cc'; ctx.font = '700 25px sans-serif'; ctx.fillText(bottom, 34, 124);
  ctx.fillStyle = '#ed3027'; ctx.fillRect(34, 144, 330, 9);
  ctx.strokeStyle = '#ed3027'; ctx.lineWidth = 10; ctx.beginPath();
  ctx.moveTo(402, 148); ctx.lineTo(472, 148); ctx.lineTo(444, 120);
  ctx.moveTo(472, 148); ctx.lineTo(444, 176); ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function decorateDoorMesh(THREE, mesh, length, height, thickness){
  const ink = new THREE.MeshStandardMaterial({ color:0x050d11, roughness:.63, metalness:.5 });
  const accent = new THREE.MeshStandardMaterial({ color:0xb91f1b, emissive:0x5c0806, emissiveIntensity:.72, roughness:.4, metalness:.35 });
  const pale = new THREE.MeshStandardMaterial({ color:0xcbd6cf, emissive:0x3b4d4b, emissiveIntensity:.18, roughness:.72, metalness:.18 });
  mesh.userData.accentMaterial = accent;
  const top = new THREE.Mesh(new THREE.BoxGeometry(length + .28, .16, thickness * 1.55), accent);
  top.position.set(0, height / 2 - .16, 0); mesh.add(top);
  for(const side of [-1, 1]){
    const post = new THREE.Mesh(new THREE.BoxGeometry(.13, height * .88, thickness * 1.45), accent);
    post.position.set(side * (length / 2 - .08), 0, 0); mesh.add(post);
  }
  const slatCount = Math.max(4, Math.floor(length / .55));
  for(let index = 0; index < slatCount; index++){
    const x = -length / 2 + (index + .5) * length / slatCount;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(.035, height * .72, thickness * 1.05), ink);
    slat.position.set(x, -.02, thickness * .18); mesh.add(slat);
  }
  const warning = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.15, length * .28), .22, thickness * 1.25), pale);
  warning.position.set(0, -height * .22, thickness * .2); mesh.add(warning);
}

export function makeDoorArch(THREE, door, doorHeight, wallThickness){
  const dx = door.b.x - door.a.x;
  const dz = door.b.z - door.a.z;
  const length = Math.hypot(dx, dz) || 1;
  const root = new THREE.Group();
  root.position.set(door.center.x, 0, door.center.z);
  root.rotation.y = -Math.atan2(dz, dx);
  const ink = new THREE.MeshStandardMaterial({ color:0x040c10, roughness:.62, metalness:.52 });
  const red = new THREE.MeshStandardMaterial({ color:0xeb2e25, emissive:0x8c0d09, emissiveIntensity:1.2, roughness:.4, metalness:.34 });
  const lamp = new THREE.MeshStandardMaterial({ color:0xfff2c5, emissive:0xffe7a1, emissiveIntensity:2.8, roughness:.26 });
  for(const side of [-1, 1]){
    const x = side * (length / 2 + .22);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.22, doorHeight * 1.38, .22), ink);
    post.position.set(x, doorHeight * .69, 0); root.add(post);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.07, doorHeight * 1.2, .27), red);
    stripe.position.set(x - side * .11, doorHeight * .62, 0); root.add(stripe);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 8), lamp);
    globe.position.set(x, doorHeight * 1.42, 0); root.add(globe);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(length + .68, .24, .3), ink);
  beam.position.set(0, doorHeight * 1.3, 0); root.add(beam);
  const redBeam = new THREE.Mesh(new THREE.BoxGeometry(length + .45, .065, .34), red);
  redBeam.position.set(0, doorHeight * 1.22, 0); root.add(redBeam);
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(Math.min(length * .76, 5.05), 2.02, .16), ink);
  signBack.position.set(0, doorHeight * 1.72, 0); root.add(signBack);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(length * .72, 4.8), 1.8),
    new THREE.MeshBasicMaterial({ map:doorSignTexture(THREE, door.edge), toneMapped:false, side:THREE.DoubleSide }),
  );
  sign.position.set(0, doorHeight * 1.72, .09); root.add(sign);
  return root;
}

export function setDoorAccent(mesh, state){
  const accent = mesh.userData.accentMaterial;
  if(!accent) return;
  if(state === 'breakable'){
    accent.color.setHex(0xff3b2f);
    accent.emissive.setHex(0xb5120d);
    accent.emissiveIntensity = 2.1;
  } else {
    accent.color.setHex(0xb91f1b);
    accent.emissive.setHex(0x5c0806);
    accent.emissiveIntensity = .72;
  }
}
