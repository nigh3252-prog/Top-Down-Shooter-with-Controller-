import { createSeededRandom } from './hex-maze-base.js';

function makeFloorTexture(THREE, roomId, seed){
  if(typeof document === 'undefined') return null;
  const random = createSeededRandom(`${seed}:floor-texture:${roomId}`);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const bases = ['#557f84', '#4c757b', '#5b8588'];
  ctx.fillStyle = bases[roomId % bases.length];
  ctx.fillRect(0, 0, 512, 512);
  for(let index = 0; index < 1600; index++){
    const light = random() > .52;
    ctx.fillStyle = light
      ? `rgba(202,231,225,${.015 + random() * .035})`
      : `rgba(0,18,24,${.018 + random() * .055})`;
    const size = .5 + random() * 2.5;
    ctx.fillRect(random() * 512, random() * 512, size, size);
  }
  for(let index = 0; index < 18; index++){
    ctx.strokeStyle = `rgba(3,23,29,${.08 + random() * .1})`;
    ctx.lineWidth = .6 + random() * 1.4;
    ctx.beginPath();
    const x = random() * 512, y = random() * 512;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - .5) * 90, y + (random() - .5) * 90);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.25, 1.25);
  texture.anisotropy = 2;
  return texture;
}

export function makeFloorMaterials(THREE, maze){
  const colors = [0x557f84, 0x4b747a, 0x5b8588];
  return maze.rooms.map(room => new THREE.MeshStandardMaterial({
    color:colors[room.id % colors.length],
    map:makeFloorTexture(THREE, room.id, maze.seed),
    roughness:.96,
    metalness:.025,
  }));
}

export function makeHexSeamGeometry(THREE, radius){
  const points = [];
  for(let index = 0; index < 6; index++){
    const angle = Math.PI / 6 + index * Math.PI / 3;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

export function createFloorDetailMaterials(THREE){
  return {
    redPaint:new THREE.MeshBasicMaterial({ color:0xd52621, transparent:true, opacity:.78, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 }),
    drain:new THREE.MeshStandardMaterial({ color:0x101a1d, roughness:.68, metalness:.48 }),
    drainLine:new THREE.MeshBasicMaterial({ color:0x527b7f }),
    cyanStripe:new THREE.MeshBasicMaterial({ color:0xa9d7d5, transparent:true, opacity:.42, depthWrite:false }),
  };
}

export function makeFloorDetail(THREE, cell, center, hexSize, maze, materials){
  const root = new THREE.Group();
  root.position.set(center.x, .012, center.z);
  const random = createSeededRandom(`${maze.seed}:floor-detail:${cell.q},${cell.r}`);

  const redCount = 3 + Math.floor(random() * 7);
  for(let index = 0; index < redCount; index++){
    const geometry = index % 3 === 0
      ? new THREE.CircleGeometry(.18 + random() * .34, 7)
      : new THREE.PlaneGeometry(.18 + random() * .85, .035 + random() * .17);
    const mesh = new THREE.Mesh(geometry, materials.redPaint);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = random() * Math.PI;
    const angle = random() * Math.PI * 2;
    const radius = hexSize * (.28 + random() * .47);
    mesh.position.set(Math.cos(angle) * radius, index * .001, Math.sin(angle) * radius);
    mesh.scale.set(1 + random() * 1.6, .55 + random() * .65, 1);
    root.add(mesh);
  }

  if(random() > .45){
    const drain = new THREE.Mesh(new THREE.BoxGeometry(1.15, .035, .55), materials.drain);
    drain.position.set((random() - .5) * hexSize * .55, .008, (random() - .5) * hexSize * .55);
    drain.rotation.y = Math.round(random() * 2) * Math.PI / 3;
    root.add(drain);
    for(let index = -2; index <= 2; index++){
      const slit = new THREE.Mesh(new THREE.BoxGeometry(.08, .008, .45), materials.drainLine);
      slit.position.set(
        drain.position.x + index * .19 * Math.cos(drain.rotation.y),
        .031,
        drain.position.z - index * .19 * Math.sin(drain.rotation.y),
      );
      slit.rotation.y = drain.rotation.y;
      root.add(slit);
    }
  }

  if(random() > .58){
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(hexSize * (.22 + random() * .22), .055), materials.cyanStripe);
    stripe.rotation.x = -Math.PI / 2;
    stripe.rotation.z = random() * Math.PI;
    stripe.position.set((random() - .5) * hexSize * .65, .005, (random() - .5) * hexSize * .65);
    root.add(stripe);
  }
  return root;
}
