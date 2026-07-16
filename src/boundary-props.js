import { cylinderBetween } from './boundary-geometry.js';

export function createBoundaryMaterials(THREE){
  return {
    region:new THREE.MeshStandardMaterial({ color:0x07151a, roughness:.95, metalness:.04 }),
    platform:new THREE.MeshStandardMaterial({ color:0x10181b, roughness:.82, metalness:.22 }),
    step:new THREE.MeshStandardMaterial({ color:0x111a1d, roughness:.9, metalness:.08 }),
    stepLight:new THREE.MeshStandardMaterial({ color:0x436b70, roughness:.95, metalness:.03 }),
    ink:new THREE.MeshStandardMaterial({ color:0x061014, roughness:.7, metalness:.45 }),
    railDark:new THREE.MeshStandardMaterial({ color:0x18282b, roughness:.68, metalness:.5 }),
    redGlow:new THREE.MeshStandardMaterial({ color:0xf02d24, emissive:0x9c130e, emissiveIntensity:1.2, roughness:.44, metalness:.28 }),
    redPanel:new THREE.MeshStandardMaterial({ color:0xc42621, emissive:0x4b0706, emissiveIntensity:.45, roughness:.66, metalness:.12 }),
    redLeaf:new THREE.MeshStandardMaterial({ color:0xc91e1c, roughness:.92, metalness:0, flatShading:true }),
    redHot:new THREE.MeshStandardMaterial({ color:0xff3829, emissive:0x4b0503, emissiveIntensity:.45, roughness:.9, metalness:0, flatShading:true }),
    redPaint:new THREE.MeshBasicMaterial({ color:0xc5231e, transparent:true, opacity:.86, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 }),
    branch:new THREE.MeshStandardMaterial({ color:0x220d0d, roughness:.94, metalness:.02 }),
    building:new THREE.MeshStandardMaterial({ color:0x0a171c, roughness:.75, metalness:.2 }),
    buildingBlue:new THREE.MeshStandardMaterial({ color:0x17343a, roughness:.82, metalness:.13 }),
    lamp:new THREE.MeshStandardMaterial({ color:0xfff3c8, emissive:0xffe7a2, emissiveIntensity:2.5, roughness:.32 }),
    warning:new THREE.MeshStandardMaterial({ color:0xece7d2, emissive:0x5c5a4b, emissiveIntensity:.24, roughness:.76 }),
    cyanLine:new THREE.MeshBasicMaterial({ color:0x76cbd0, transparent:true, opacity:.62 }),
    cable:new THREE.MeshStandardMaterial({ color:0x020608, roughness:.48, metalness:.52 }),
  };
}

function signTexture(THREE, variant = 0){
  if(typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#061116'; ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = '#7ca2a6'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 240, 368);
  const labels = [
    ['境界駅', 'BOUNDARY STATION', 'NEXT DISTRICT'],
    ['次の界', 'NEXT WORLD', 'ROUTE 26'],
    ['경계역', 'TRANSFER', 'LOWER PLATFORM'],
    ['門番区', 'WARDEN SECTOR', 'NO RETURN'],
  ][variant % 4];
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f3efe1'; ctx.font = '700 43px sans-serif'; ctx.fillText(labels[0], 128, 86);
  ctx.fillStyle = '#93bfc1'; ctx.font = '700 18px sans-serif'; ctx.fillText(labels[1], 128, 132);
  ctx.fillStyle = '#f3efe1'; ctx.font = '600 15px sans-serif'; ctx.fillText(labels[2], 128, 164);
  ctx.fillStyle = '#e92e27';
  ctx.fillRect(30, 200, 196, 6); ctx.fillRect(30, 222, 128, 4); ctx.fillRect(30, 244, 164, 4);
  ctx.beginPath(); ctx.arc(54, 300, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#071116'; ctx.font = '900 18px sans-serif'; ctx.fillText(String((variant * 7 + 26) % 99).padStart(2, '0'), 54, 307);
  ctx.strokeStyle = '#e92e27'; ctx.lineWidth = 8; ctx.beginPath();
  ctx.moveTo(114, 306); ctx.lineTo(206, 306); ctx.lineTo(182, 282);
  ctx.moveTo(206, 306); ctx.lineTo(182, 330); ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeSignboard(THREE, anchor, frame, materials, variant, scale = 1){
  const root = new THREE.Group();
  root.position.set(anchor.x, 0, anchor.z);
  root.rotation.y = frame.yaw + (frame.nx < 0 ? Math.PI : 0);
  const postGeometry = new THREE.BoxGeometry(.16, 3.5 * scale, .16);
  for(const side of [-1, 1]){
    const post = new THREE.Mesh(postGeometry, materials.ink);
    post.position.set(side * 1.18 * scale, 1.75 * scale, 0);
    root.add(post);
  }
  const backing = new THREE.Mesh(new THREE.BoxGeometry(2.75 * scale, 2.05 * scale, .14), materials.ink);
  backing.position.set(0, 2.55 * scale, 0); root.add(backing);
  const faceMaterial = new THREE.MeshBasicMaterial({ map:signTexture(THREE, variant), toneMapped:false, side:THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.48 * scale, 1.8 * scale), faceMaterial);
  face.position.set(0, 2.55 * scale, .078); root.add(face);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.92 * scale, .1, .2), materials.redGlow);
  cap.position.set(0, 3.6 * scale, 0); root.add(cap);
  return root;
}

export function makeLampPost(THREE, anchor, materials, withLight = false, height = 3.7){
  const root = new THREE.Group();
  root.position.set(anchor.x, 0, anchor.z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, height, 7), materials.ink);
  pole.position.y = height / 2; root.add(pole);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .18, 7), materials.redGlow);
  band.position.y = height * .64; root.add(band);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(.33, 12, 9), materials.lamp);
  globe.position.y = height + .12; root.add(globe);
  let light = null;
  if(withLight){
    light = new THREE.PointLight(0xffefc2, 8, 9, 1.8);
    light.position.y = height + .1; root.add(light);
  }
  return { root, light };
}

export function makeFoliageCluster(THREE, anchor, random, materials, scale = 1){
  const root = new THREE.Group();
  root.position.set(anchor.x, .05, anchor.z);
  const twigCount = 8 + Math.floor(random() * 7);
  for(let index = 0; index < twigCount; index++){
    const angle = random() * Math.PI * 2;
    const length = (.75 + random() * 1.5) * scale;
    root.add(cylinderBetween(THREE,
      { x:0, y:.12 + random() * .32, z:0 },
      { x:Math.cos(angle) * length, y:.42 + random() * 1.4 * scale, z:Math.sin(angle) * length },
      .018 + random() * .018, materials.branch, 5));
  }
  const leafGeometry = new THREE.TetrahedronGeometry(.23 * scale, 0);
  const leafCount = 18 + Math.floor(random() * 20);
  for(let index = 0; index < leafCount; index++){
    const leaf = new THREE.Mesh(leafGeometry, index % 4 === 0 ? materials.redHot : materials.redLeaf);
    const angle = random() * Math.PI * 2;
    const radius = .22 + random() * 1.55 * scale;
    leaf.position.set(Math.cos(angle) * radius, .25 + random() * 1.55 * scale, Math.sin(angle) * radius);
    leaf.rotation.set(random() * 2.4, random() * 2.4, random() * 2.4);
    const size = .4 + random() * 1.25;
    leaf.scale.set(size * (1 + random() * .8), size * (.5 + random() * .7), size);
    root.add(leaf);
  }
  return root;
}

export function makePaintSplash(THREE, anchor, random, materials, scale = 1){
  const root = new THREE.Group();
  root.position.set(anchor.x, .012, anchor.z);
  const count = 5 + Math.floor(random() * 8);
  for(let index = 0; index < count; index++){
    const geometry = index % 3 === 0
      ? new THREE.CircleGeometry(.22 + random() * .45, 7)
      : new THREE.PlaneGeometry(.22 + random() * .65, .05 + random() * .22);
    const splash = new THREE.Mesh(geometry, index % 4 === 0 ? materials.redHot : materials.redPaint);
    splash.rotation.x = -Math.PI / 2;
    splash.rotation.z = random() * Math.PI;
    splash.position.set((random() - .5) * 2.5 * scale, index * .0007, (random() - .5) * 1.8 * scale);
    splash.scale.set(1 + random() * 1.6, .45 + random() * .75, 1);
    root.add(splash);
  }
  return root;
}

export function makeBoundaryRail(THREE, edge, frame, materials, random){
  const root = new THREE.Group();
  const curb = new THREE.Mesh(new THREE.BoxGeometry(frame.length, .58, .72), materials.platform);
  curb.position.set(frame.mx, .29, frame.mz); curb.rotation.y = frame.yaw; root.add(curb);
  const lane = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.4, frame.length - .5), .025, .055), materials.cyanLine);
  lane.position.set(frame.mx - frame.nx * .64, .034, frame.mz - frame.nz * .64);
  lane.rotation.y = frame.yaw; root.add(lane);
  const railA = { x:edge.a.x + frame.nx * .28, y:1.18, z:edge.a.z + frame.nz * .28 };
  const railB = { x:edge.b.x + frame.nx * .28, y:1.18, z:edge.b.z + frame.nz * .28 };
  root.add(cylinderBetween(THREE, railA, railB, .055, materials.redGlow, 7));
  root.add(cylinderBetween(THREE, { ...railA, y:.76 }, { ...railB, y:.76 }, .025, materials.railDark, 6));
  const postCount = Math.max(2, Math.ceil(frame.length / 2.8));
  for(let index = 0; index <= postCount; index++){
    const t = index / postCount;
    const post = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.15, .09), materials.ink);
    post.position.set(edge.a.x + frame.dx * t + frame.nx * .28, .58, edge.a.z + frame.dz * t + frame.nz * .28);
    root.add(post);
  }
  if(random() > .65){
    const warning = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.25, frame.length * .25), .22, .03), materials.warning);
    warning.position.set(frame.mx + frame.nx * .32, .86, frame.mz + frame.nz * .32);
    warning.rotation.y = frame.yaw; root.add(warning);
  }
  return root;
}

export function makeStairPlatform(THREE, frame, materials, random){
  const root = new THREE.Group();
  root.position.set(frame.mx + frame.nx * 2.8, 0, frame.mz + frame.nz * 2.8);
  root.rotation.y = frame.yaw;
  const width = Math.min(4.2, Math.max(2.8, frame.length * .42));
  const stepCount = 7;
  for(let index = 0; index < stepCount; index++){
    const height = .16 + index * .15;
    const step = new THREE.Mesh(new THREE.BoxGeometry(width, height, .42), index % 2 ? materials.step : materials.stepLight);
    step.position.set(0, height / 2, (index - stepCount / 2) * .42); root.add(step);
  }
  const landing = new THREE.Mesh(new THREE.BoxGeometry(width + .6, 1.2, 2.3), materials.platform);
  landing.position.set(0, .6, -2.55); root.add(landing);
  for(const side of [-1, 1]){
    const x = side * (width / 2 + .12);
    root.add(cylinderBetween(THREE, { x, y:.7, z:1.45 }, { x, y:2.15, z:-1.65 }, .055, materials.redGlow, 6));
  }
  if(random() > .45){
    const tower = new THREE.Mesh(new THREE.BoxGeometry(width * .38, 4.2, 1.45), materials.building);
    tower.position.set(width * .18, 3.3, -3.4); root.add(tower);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width * .39, 3.4, .08), materials.redPanel);
    panel.position.set(width * .18, 3.4, -2.65); root.add(panel);
  }
  return root;
}

export function makeBuildingCluster(THREE, frame, materials, random){
  const root = new THREE.Group();
  const offset = 5.5 + random() * 4.5;
  root.position.set(frame.mx + frame.nx * offset, 0, frame.mz + frame.nz * offset);
  root.rotation.y = frame.yaw;
  const count = 2 + Math.floor(random() * 3);
  for(let index = 0; index < count; index++){
    const width = 1.8 + random() * 3.4;
    const depth = 1.6 + random() * 3.5;
    const height = 3.4 + random() * 7.8;
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), index % 3 === 0 ? materials.buildingBlue : materials.building);
    building.position.set((index - (count - 1) / 2) * 2.5 + (random() - .5), height / 2 - .1, (random() - .5) * 2.4);
    building.rotation.y = (random() - .5) * .22; root.add(building);
    if(index === 0 || random() > .55){
      const panel = new THREE.Mesh(new THREE.BoxGeometry(width * .38, height * .72, depth + .06), materials.redPanel);
      panel.position.set(building.position.x + width * .28, height * .54, building.position.z);
      panel.rotation.y = building.rotation.y; root.add(panel);
    }
  }
  if(random() > .52){
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 2.4, 12), materials.building);
    tank.position.set((random() - .5) * 2.4, 7.5 + random() * 1.5, -1.2 - random() * 2.8);
    root.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.23, .55, 12), materials.redPanel);
    cap.position.set(tank.position.x, tank.position.y + 1.46, tank.position.z);
    root.add(cap);
    for(const side of [-1, 1]){
      const legX = tank.position.x + side * .72;
      root.add(cylinderBetween(THREE,
        { x:legX, y:1.2, z:tank.position.z - .5 },
        { x:legX * .99, y:tank.position.y - 1.2, z:tank.position.z - .35 },
        .07, materials.ink, 6));
      root.add(cylinderBetween(THREE,
        { x:legX, y:1.2, z:tank.position.z + .5 },
        { x:legX * .99, y:tank.position.y - 1.2, z:tank.position.z + .35 },
        .07, materials.ink, 6));
    }
  }
  return root;
}

export function makeOverheadCable(THREE, a, b, materials){
  const root = new THREE.Group();
  const cablePoint = t => ({
    x:a.x + (b.x - a.x) * t,
    y:a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * .55,
    z:a.z + (b.z - a.z) * t,
  });
  let previous = a;
  for(let index = 1; index <= 8; index++){
    const next = cablePoint(index / 8);
    root.add(cylinderBetween(THREE, previous, next, .018, materials.cable, 5));
    previous = next;
  }
  for(const t of [.32, .68]){
    const hook = cablePoint(t);
    const drop = .55 + Math.sin(t * 17) * .12;
    const bulb = { x:hook.x, y:hook.y - drop, z:hook.z };
    root.add(cylinderBetween(THREE, hook, bulb, .014, materials.cable, 5));
    const globe = new THREE.Mesh(new THREE.SphereGeometry(.21, 10, 8), materials.lamp);
    globe.position.set(bulb.x, bulb.y - .08, bulb.z);
    root.add(globe);
  }
  return root;
}
