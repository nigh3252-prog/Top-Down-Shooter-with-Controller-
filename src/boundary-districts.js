import { buildMazeEdges } from './hex-maze-navigation.js';

const DISTRICTS = Object.freeze([
  Object.freeze({
    id:'boundary-courtyard', label:'Boundary Courtyard', accent:0xd52b22, secondary:0x61cbd3,
    facadeChance:.18, propChance:.34, buildingKinds:['station','gatehouse','terrace'],
  }),
  Object.freeze({
    id:'lantern-arcade', label:'Lantern Arcade', accent:0xe03529, secondary:0xffcf77,
    facadeChance:.30, propChance:.48, buildingKinds:['kiosk','station','terrace'],
  }),
  Object.freeze({
    id:'transit-overlook', label:'Transit Overlook', accent:0xc6241b, secondary:0x70d9de,
    facadeChance:.34, propChance:.30, buildingKinds:['scaffold','terrace','station'],
  }),
  Object.freeze({
    id:'vermilion-garden', label:'Vermilion Garden', accent:0xe33a2e, secondary:0xffe9a5,
    facadeChance:.16, propChance:.62, buildingKinds:['gatehouse','terrace','kiosk'],
  }),
  Object.freeze({
    id:'utility-basin', label:'Utility Basin', accent:0xb92018, secondary:0x5dc3ca,
    facadeChance:.36, propChance:.34, buildingKinds:['tankworks','station','scaffold'],
  }),
  Object.freeze({
    id:'watch-station', label:'Watch Station', accent:0xcf281f, secondary:0x78d6dc,
    facadeChance:.28, propChance:.38, buildingKinds:['gatehouse','station','scaffold'],
  }),
]);

export const BOUNDARY_DISTRICT_IDS = Object.freeze(DISTRICTS.map(district => district.id));

export function hashBoundaryText(text){
  let hash = 2166136261 >>> 0;
  for(const ch of String(text ?? '')){
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed){
  let state = hashBoundaryText(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function districtForRoom(seed, roomId = 0){
  if(Number(roomId) === 0) return DISTRICTS[0];
  const index = (hashBoundaryText(`${seed}:district`) + Number(roomId) * 11) % (DISTRICTS.length - 1);
  return DISTRICTS[1 + index];
}

export function districtVariant(seed, roomId = 0){
  return hashBoundaryText(`${seed}:${roomId}:variant`) % 4;
}

function edgeLength(edge){
  return Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z);
}

function edgeYaw(edge){
  return -Math.atan2(edge.b.z - edge.a.z, edge.b.x - edge.a.x);
}

function pointAlong(edge, t, offset = 0){
  const dx = edge.b.x - edge.a.x;
  const dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz) || 1;
  return {
    x:edge.a.x + dx * t - dz / length * offset,
    z:edge.a.z + dz * t + dx / length * offset,
  };
}

function outwardSign(edge, center){
  const midpoint = pointAlong(edge, .5);
  const dx = edge.b.x - edge.a.x;
  const dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz) || 1;
  const nx = -dz / length;
  const nz = dx / length;
  return ((midpoint.x - center.x) * nx + (midpoint.z - center.z) * nz) >= 0 ? 1 : -1;
}

function makeKit(THREE, district){
  const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, ...options });
  return {
    ink:standard(0x071116, { roughness:.7, metalness:.34 }),
    inkSoft:standard(0x111d22, { roughness:.88, metalness:.12 }),
    concrete:standard(0x476b70, { roughness:.94, metalness:.02 }),
    concreteDark:standard(0x12353e, { roughness:.96, metalness:.02 }),
    red:standard(district.accent, { emissive:0x5d120e, emissiveIntensity:.2, roughness:.68, metalness:.2 }),
    redHot:standard(0xf34334, { emissive:0x731710, emissiveIntensity:.45, roughness:.54, metalness:.08 }),
    secondary:standard(district.secondary, { emissive:0x174f57, emissiveIntensity:.28, roughness:.55, metalness:.18 }),
    cream:standard(0xfff0b3, { emissive:0xffbb61, emissiveIntensity:2.15, roughness:.4, metalness:0 }),
    creamDim:standard(0xf3dfaa, { emissive:0xffbb61, emissiveIntensity:1.05, roughness:.5, metalness:0 }),
    glass:standard(0x7ed9dd, { emissive:0x1b6670, emissiveIntensity:.5, roughness:.22, metalness:.05, transparent:true, opacity:.72 }),
    decalRed:new THREE.MeshBasicMaterial({ color:0xf34334, transparent:true, opacity:.76, side:THREE.DoubleSide, depthWrite:false }),
    decalInk:new THREE.MeshBasicMaterial({ color:0x071116, transparent:true, opacity:.34, side:THREE.DoubleSide, depthWrite:false }),
    decalSecondary:new THREE.MeshBasicMaterial({ color:district.secondary, transparent:true, opacity:.42, side:THREE.DoubleSide, depthWrite:false }),
  };
}

function addBox(THREE, root, material, position, scale, rotation = null){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  mesh.scale.set(scale.x ?? 1, scale.y ?? 1, scale.z ?? 1);
  if(rotation) mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function addCylinder(THREE, root, material, position, radius, height, segments = 8, rotation = null){
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .96, height, segments), material);
  mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  if(rotation) mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function addSphere(THREE, root, material, position, radius, detail = 0){
  const geometry = detail ? new THREE.IcosahedronGeometry(radius, detail) : new THREE.DodecahedronGeometry(radius, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  mesh.castShadow = true;
  root.add(mesh);
  return mesh;
}

function addGlyphBars(THREE, root, material, y = 0, scale = 1, variant = 0){
  const patterns = [
    [[0,.42,.06,.34],[-.16,.12,.05,.25],[.15,.08,.05,.48],[0,-.24,.32,.05]],
    [[0,.43,.32,.05],[-.13,.18,.05,.42],[.13,.18,.05,.42],[0,-.12,.28,.05],[0,-.34,.05,.22]],
    [[-.12,.35,.05,.28],[.12,.35,.05,.28],[0,.17,.3,.05],[-.16,-.08,.05,.37],[.11,-.18,.05,.52]],
    [[0,.4,.05,.22],[-.16,.18,.05,.35],[.14,.18,.05,.35],[0,-.05,.3,.05],[-.08,-.31,.05,.28],[.12,-.31,.05,.28]],
  ];
  for(const [x, by, w, h] of patterns[variant % patterns.length]){
    addBox(THREE, root, material, { x:x * scale, y:y + by * scale, z:.071 }, { x:w * scale, y:h * scale, z:.045 });
  }
}

function makeStairs(THREE, root, kit, { count = 8, width = 2.5, rise = .25, run = .34, direction = 1 } = {}){
  for(let index = 0; index < count; index++){
    const y = rise * (index + 1) / 2;
    const z = direction * (index * run - (count - 1) * run / 2);
    addBox(THREE, root, index % 2 ? kit.inkSoft : kit.concreteDark, { x:0, y, z }, { x:width, y:rise * (index + 1), z:run * .92 });
    if(index % 2 === 0) addBox(THREE, root, kit.red, { x:0, y:rise * (index + 1) + .02, z }, { x:width * .92, y:.035, z:run * .68 });
  }
}

function makeStation(THREE, kit, random){
  const root = new THREE.Group();
  const width = 4.3 + random() * 2.2;
  const height = 3.6 + random() * 2.8;
  addBox(THREE, root, kit.inkSoft, { x:0, y:height / 2, z:0 }, { x:width, y:height, z:2.7 });
  addBox(THREE, root, kit.concrete, { x:0, y:height * .48, z:-1.39 }, { x:width * .84, y:height * .62, z:.1 });
  const windows = 2 + Math.floor(random() * 3);
  for(let index = 0; index < windows; index++){
    const x = (index - (windows - 1) / 2) * (width * .68 / Math.max(1, windows - 1));
    addBox(THREE, root, index % 2 ? kit.glass : kit.creamDim, { x, y:height * .6, z:-1.47 }, { x:.5, y:.88, z:.06 });
  }
  addBox(THREE, root, kit.red, { x:0, y:height + .16, z:-.2 }, { x:width + .35, y:.18, z:3.05 });
  const sign = new THREE.Group();
  sign.position.set(width * .28, height * .48, -1.53);
  addBox(THREE, sign, kit.ink, { x:0, y:0, z:0 }, { x:.95, y:1.75, z:.08 });
  addGlyphBars(THREE, sign, kit.creamDim, 0, 1.25, Math.floor(random() * 4));
  root.add(sign);
  return root;
}

function makeKiosk(THREE, kit, random){
  const root = new THREE.Group();
  const width = 3.1 + random() * 1.4;
  addBox(THREE, root, kit.inkSoft, { x:0, y:1.35, z:.2 }, { x:width, y:2.7, z:2.15 });
  addBox(THREE, root, kit.creamDim, { x:0, y:1.55, z:-.91 }, { x:width * .64, y:.8, z:.06 });
  addBox(THREE, root, kit.red, { x:0, y:2.95, z:-.38 }, { x:width + .55, y:.18, z:2.75 }, { z:(random() - .5) * .08 });
  addBox(THREE, root, kit.ink, { x:0, y:.65, z:-1.15 }, { x:width * .88, y:.25, z:.4 });
  for(const x of [-width * .36, width * .36]) addCylinder(THREE, root, kit.ink, { x, y:1.48, z:-1.08 }, .07, 2.8, 7);
  const lanterns = random() > .45 ? 3 : 2;
  for(let index = 0; index < lanterns; index++){
    const x = (index - (lanterns - 1) / 2) * .72;
    addSphere(THREE, root, kit.cream, { x, y:2.45, z:-1.18 }, .22, 1);
  }
  return root;
}

function makeTerrace(THREE, kit, random){
  const root = new THREE.Group();
  const width = 4.4 + random() * 2.3;
  const height = 2.1 + random() * 1.1;
  addBox(THREE, root, kit.inkSoft, { x:0, y:height / 2, z:.55 }, { x:width, y:height, z:3.1 });
  addBox(THREE, root, kit.concrete, { x:0, y:height + .12, z:.15 }, { x:width + .5, y:.24, z:3.85 });
  makeStairs(THREE, root, kit, { count:7 + Math.floor(random() * 3), width:2.25, rise:height / 8, run:.34, direction:-1 });
  for(const x of [-width * .47, width * .47]) addBox(THREE, root, kit.ink, { x, y:height + 1.0, z:-1.6 }, { x:.12, y:1.9, z:.12 });
  addBox(THREE, root, kit.red, { x:0, y:height + 1.85, z:-1.6 }, { x:width, y:.12, z:.14 });
  return root;
}

function makeScaffold(THREE, kit, random){
  const root = new THREE.Group();
  const width = 4.5 + random() * 2.4;
  const height = 4.6 + random() * 2.2;
  const depth = 3.0;
  for(const x of [-width / 2, width / 2]) for(const z of [-depth / 2, depth / 2]) addBox(THREE, root, kit.ink, { x, y:height / 2, z }, { x:.16, y:height, z:.16 });
  for(const y of [1.35, 2.7, height - .25]){
    addBox(THREE, root, y === height - .25 ? kit.red : kit.ink, { x:0, y, z:-depth / 2 }, { x:width, y:.12, z:.12 });
    addBox(THREE, root, kit.ink, { x:0, y, z:depth / 2 }, { x:width, y:.12, z:.12 });
  }
  addBox(THREE, root, kit.concreteDark, { x:0, y:2.78, z:0 }, { x:width, y:.18, z:depth });
  makeStairs(THREE, root, kit, { count:9, width:1.55, rise:.3, run:.34, direction:1 });
  addBox(THREE, root, kit.secondary, { x:0, y:height + .05, z:-depth / 2 }, { x:width * .68, y:.045, z:.2 });
  return root;
}

function makeGatehouse(THREE, kit, random){
  const root = new THREE.Group();
  const height = 5.4 + random() * 2.4;
  addBox(THREE, root, kit.inkSoft, { x:0, y:height / 2, z:.5 }, { x:2.3, y:height, z:2.4 });
  addBox(THREE, root, kit.red, { x:0, y:height + .12, z:.5 }, { x:2.8, y:.22, z:2.85 });
  for(const side of [-1, 1]){
    addBox(THREE, root, kit.ink, { x:side * 2.25, y:2.1, z:.65 }, { x:1.9, y:4.2, z:2.1 });
    addBox(THREE, root, kit.red, { x:side * 2.25, y:4.34, z:.65 }, { x:2.2, y:.16, z:2.35 });
  }
  const sign = new THREE.Group();
  sign.position.set(0, height * .62, -.74);
  addBox(THREE, sign, kit.ink, { x:0, y:0, z:0 }, { x:1.2, y:2.45, z:.1 });
  addGlyphBars(THREE, sign, kit.cream, 0, 1.55, Math.floor(random() * 4));
  root.add(sign);
  return root;
}

function makeTankworks(THREE, kit, random){
  const root = new THREE.Group();
  const tanks = 2 + Math.floor(random() * 2);
  for(let index = 0; index < tanks; index++){
    const x = (index - (tanks - 1) / 2) * 1.7;
    const height = 3.4 + random() * 1.6;
    addCylinder(THREE, root, index % 2 ? kit.inkSoft : kit.concrete, { x, y:height / 2 + .35, z:.45 }, .72 + random() * .18, height, 10);
    addCylinder(THREE, root, kit.red, { x, y:height + .45, z:.45 }, .78, .16, 10);
    addBox(THREE, root, kit.secondary, { x, y:height * .62, z:-.34 }, { x:.45, y:.08, z:.08 });
  }
  addBox(THREE, root, kit.ink, { x:0, y:.45, z:-.6 }, { x:4.6, y:.18, z:.18 });
  for(let index = 0; index < 4; index++) addCylinder(THREE, root, index === 0 ? kit.red : kit.ink, { x:-1.7 + index * 1.1, y:.45, z:-.6 }, .09, 1.2, 7, { z:Math.PI / 2 });
  return root;
}

function makeBuilding(THREE, kind, kit, random){
  if(kind === 'kiosk') return makeKiosk(THREE, kit, random);
  if(kind === 'terrace') return makeTerrace(THREE, kit, random);
  if(kind === 'scaffold') return makeScaffold(THREE, kit, random);
  if(kind === 'gatehouse') return makeGatehouse(THREE, kit, random);
  if(kind === 'tankworks') return makeTankworks(THREE, kit, random);
  return makeStation(THREE, kit, random);
}

function makeFacades(THREE, edges, center, random, district, kit, group){
  let count = 0;
  const cap = district.id === 'transit-overlook' || district.id === 'utility-basin' ? 10 : 8;
  for(const edge of edges){
    if(count >= cap) break;
    if(edgeLength(edge) < 4.5 || random() > district.facadeChance) continue;
    const side = outwardSign(edge, center);
    const point = pointAlong(edge, .25 + random() * .5, side * (2.5 + random() * 2.8));
    const kind = district.buildingKinds[Math.floor(random() * district.buildingKinds.length)];
    const root = makeBuilding(THREE, kind, kit, random);
    root.position.set(point.x, -.02, point.z);
    root.rotation.y = edgeYaw(edge) + (side > 0 ? 0 : Math.PI);
    root.scale.setScalar(.8 + random() * .38);
    root.userData.boundaryBuildingKind = kind;
    group.add(root);
    count++;
  }
}

function makeSign(THREE, kit, variant, random){
  const root = new THREE.Group();
  if(variant === 0){
    addBox(THREE, root, kit.ink, { x:0, y:1.6, z:0 }, { x:1.15, y:3.2, z:.14 });
    addBox(THREE, root, kit.red, { x:0, y:3.27, z:0 }, { x:1.42, y:.13, z:.2 });
    addGlyphBars(THREE, root, kit.creamDim, 1.55, 1.2, Math.floor(random() * 4));
  } else if(variant === 1){
    for(const x of [-.72,.72]) addCylinder(THREE, root, kit.ink, { x, y:1.4, z:0 }, .075, 2.8, 7);
    addBox(THREE, root, kit.inkSoft, { x:0, y:2.45, z:0 }, { x:2.25, y:.72, z:.16 }, { z:-.12 });
    addBox(THREE, root, kit.red, { x:.34, y:2.45, z:.09 }, { x:1.25, y:.08, z:.04 }, { z:-.12 });
  } else if(variant === 2){
    addBox(THREE, root, kit.ink, { x:0, y:2.65, z:0 }, { x:.75, y:5.3, z:.75 });
    addBox(THREE, root, kit.red, { x:0, y:5.45, z:0 }, { x:1.05, y:.18, z:1.05 });
    const face = new THREE.Group();
    face.position.set(0, 3.35, -.41);
    addGlyphBars(THREE, face, kit.cream, 0, 1.45, Math.floor(random() * 4));
    root.add(face);
  } else {
    addBox(THREE, root, kit.inkSoft, { x:0, y:.75, z:0 }, { x:2.1, y:1.5, z:.22 }, { z:.06 });
    addBox(THREE, root, kit.secondary, { x:0, y:1.08, z:.13 }, { x:1.5, y:.05, z:.04 }, { z:.06 });
    for(const x of [-.65,.65]) addBox(THREE, root, kit.red, { x, y:.46, z:.13 }, { x:.12, y:.65, z:.04 }, { z:.06 });
  }
  return root;
}

function makePropCluster(THREE, kit, variant, random){
  const root = new THREE.Group();
  if(variant === 0){
    addBox(THREE, root, kit.inkSoft, { x:0, y:.32, z:0 }, { x:2.1, y:.64, z:1.05 });
    for(let index = 0; index < 5; index++) addSphere(THREE, root, index % 2 ? kit.redHot : kit.red, { x:-.75 + index * .36, y:.78 + random() * .22, z:(random() - .5) * .45 }, .48 + random() * .18, 0);
  } else if(variant === 1){
    addCylinder(THREE, root, kit.ink, { x:0, y:1.1, z:0 }, .16, 2.2, 7);
    addSphere(THREE, root, kit.red, { x:0, y:2.2, z:0 }, 1.25, 1);
    addSphere(THREE, root, kit.redHot, { x:.55, y:2.05, z:.08 }, .72, 0);
  } else if(variant === 2){
    addBox(THREE, root, kit.inkSoft, { x:0, y:.28, z:0 }, { x:1.3, y:.56, z:1.3 });
    for(let index = 0; index < 7; index++){
      const angle = index / 7 * Math.PI * 2;
      addSphere(THREE, root, index % 3 ? kit.red : kit.redHot, { x:Math.cos(angle) * .48, y:.72 + random() * .3, z:Math.sin(angle) * .48 }, .38 + random() * .18, 0);
    }
  } else {
    addBox(THREE, root, kit.ink, { x:0, y:.34, z:0 }, { x:1.8, y:.68, z:.8 });
    for(let index = 0; index < 4; index++) addCylinder(THREE, root, index === 0 ? kit.red : kit.secondary, { x:-.6 + index * .4, y:.9, z:0 }, .09, 1.35 + index * .12, 7);
  }
  return root;
}

function makeEdgeProps(THREE, edges, center, random, district, kit, group){
  let count = 0;
  const cap = district.id === 'vermilion-garden' ? 18 : 12;
  for(const edge of edges){
    if(count >= cap) break;
    if(random() > district.propChance) continue;
    const side = outwardSign(edge, center);
    const point = pointAlong(edge, .1 + random() * .8, -side * (1 + random() * .75));
    const makeVisibleSign = district.id === 'watch-station' || random() < .28;
    const root = makeVisibleSign ? makeSign(THREE, kit, Math.floor(random() * 4), random) : makePropCluster(THREE, kit, Math.floor(random() * 4), random);
    root.position.set(point.x, 0, point.z);
    root.rotation.y = makeVisibleSign ? edgeYaw(edge) + (side < 0 ? Math.PI : 0) : random() * Math.PI * 2;
    root.scale.setScalar(.7 + random() * .48);
    group.add(root);
    count++;
  }
}

function makeGroundLayer(THREE, edges, center, random, district, kit, group){
  if(!edges.length) return;
  const patchCount = district.id === 'vermilion-garden' ? 54 : 34;
  for(let index = 0; index < patchCount; index++){
    const edge = edges[Math.floor(random() * edges.length)];
    const side = outwardSign(edge, center);
    const point = pointAlong(edge, random(), -side * random() * 3.2);
    const material = index % 5 === 0 ? kit.decalRed : index % 7 === 0 ? kit.decalSecondary : kit.decalInk;
    const geometry = index % 3 === 0 ? new THREE.PlaneGeometry(.7 + random() * 1.2, .08 + random() * .18) : new THREE.CircleGeometry(.22 + random() * .62, 7);
    const patch = new THREE.Mesh(geometry, material);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = random() * Math.PI * 2;
    patch.scale.set(1.1 + random() * 1.7, .45 + random() * .8, 1);
    patch.position.set(point.x, .073 + index * .0001, point.z);
    patch.renderOrder = 1;
    group.add(patch);
  }
}

function makeDistrictLandmark(THREE, edges, center, random, district, kit, group){
  if(!edges.length) return;
  const edge = edges[Math.floor(random() * edges.length)];
  const side = outwardSign(edge, center);
  const point = pointAlong(edge, .5, side * (4.2 + random() * 2));
  let root;
  if(district.id === 'utility-basin') root = makeTankworks(THREE, kit, random);
  else if(district.id === 'transit-overlook') root = makeScaffold(THREE, kit, random);
  else if(district.id === 'vermilion-garden'){
    root = new THREE.Group();
    for(const x of [-2.1,2.1]) addBox(THREE, root, kit.red, { x, y:2.4, z:0 }, { x:.3, y:4.8, z:.48 });
    addBox(THREE, root, kit.red, { x:0, y:4.75, z:0 }, { x:4.8, y:.3, z:.6 });
    addBox(THREE, root, kit.ink, { x:0, y:4.22, z:0 }, { x:3.6, y:.18, z:.45 });
    for(const x of [-1.25,0,1.25]) addSphere(THREE, root, kit.cream, { x, y:3.72, z:0 }, .27, 1);
  } else root = makeGatehouse(THREE, kit, random);
  root.position.set(point.x, 0, point.z);
  root.rotation.y = edgeYaw(edge) + (side > 0 ? 0 : Math.PI);
  root.scale.multiplyScalar(1.05 + random() * .25);
  root.userData.boundaryLandmark = district.id;
  group.add(root);
}

function makeArcadeLanternStrings(THREE, edges, center, random, district, kit, group, animated){
  if(district.id !== 'lantern-arcade') return;
  let count = 0;
  for(const edge of edges){
    if(count >= 5 || random() > .25) continue;
    const side = outwardSign(edge, center);
    const root = new THREE.Group();
    const point = pointAlong(edge, .5, -side * .7);
    root.position.set(point.x, 0, point.z);
    root.rotation.y = edgeYaw(edge) + (side < 0 ? Math.PI : 0);
    const length = Math.min(6.5, edgeLength(edge) * .72);
    addBox(THREE, root, kit.ink, { x:0, y:4.2, z:0 }, { x:length, y:.055, z:.055 });
    const lanternCount = 4 + Math.floor(random() * 3);
    const emitters = [];
    for(let index = 0; index < lanternCount; index++){
      const x = (index - (lanternCount - 1) / 2) * length / lanternCount;
      addBox(THREE, root, kit.ink, { x, y:3.88, z:0 }, { x:.035, y:.62, z:.035 });
      const emitter = index % 2 ? addSphere(THREE, root, kit.cream, { x, y:3.48, z:0 }, .24, 1) : addCylinder(THREE, root, kit.cream, { x, y:3.48, z:0 }, .22, .52, 9);
      emitters.push(emitter);
    }
    root.userData.boundaryEmitters = emitters;
    group.add(root);
    animated.push(root);
    count++;
  }
}

export function applyBoundaryDistrictExtensions({ THREE, maze, roomId = null, hexSize = 20, world } = {}){
  if(!THREE || !maze || !world?.group) return world;
  const district = districtForRoom(maze.seed, roomId ?? 0);
  const random = seededRandom(`${maze.seed}:${roomId ?? 'all'}:${district.id}:extensions`);
  const kit = makeKit(THREE, district);
  const room = roomId === null ? null : maze.rooms.find(candidate => candidate.id === roomId);
  const activeCellKeys = new Set(room ? room.cellKeys : maze.cells.keys());
  const wallEdges = buildMazeEdges(maze, { hexSize }).filter(edge =>
    (activeCellKeys.has(edge.cellA) || (edge.cellB && activeCellKeys.has(edge.cellB))) && !edge.open && !edge.door
  );

  const root = new THREE.Group();
  root.name = `boundary district extensions: ${district.id}`;
  root.userData.boundaryDistrict = district.id;
  root.userData.boundaryDistrictLabel = district.label;
  world.group.userData.boundaryDistrict = district.id;
  world.group.userData.boundaryDistrictLabel = district.label;
  world.group.add(root);

  makeGroundLayer(THREE, wallEdges, world.center, random, district, kit, root);
  makeFacades(THREE, wallEdges, world.center, random, district, kit, root);
  makeEdgeProps(THREE, wallEdges, world.center, random, district, kit, root);
  makeDistrictLandmark(THREE, wallEdges, world.center, random, district, kit, root);
  const animated = [];
  makeArcadeLanternStrings(THREE, wallEdges, world.center, random, district, kit, root, animated);

  const baseUpdate = world.update.bind(world);
  let elapsed = 0;
  world.update = dt => {
    baseUpdate(dt);
    elapsed += Math.max(0, dt || 0);
    animated.forEach((object, index) => {
      const wave = Math.sin(elapsed * (2.05 + index * .11) + index * 1.7);
      for(const emitter of object.userData.boundaryEmitters || []){
        if(emitter.material) emitter.material.emissiveIntensity = 2.05 + wave * .22;
      }
    });
  };
  return world;
}
