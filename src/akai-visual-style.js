import { buildMazeEdges } from './hex-maze-navigation.js';

const PALETTE = Object.freeze({
  void:0x06171d,
  fog:0x0a2730,
  floorA:0x245b64,
  floorB:0x1c4a54,
  floorDark:0x12343c,
  ink:0x071014,
  inkSoft:0x101b20,
  red:0xc7251d,
  redDark:0x621710,
  redHot:0xf13b2d,
  lantern:0xffefb0,
  lanternWarm:0xffb85b,
  cyan:0x5fcbd2,
});

function hashText(text){
  let hash = 2166136261 >>> 0;
  for(const ch of String(text)){
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed){
  let state = hashText(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function edgeLength(edge){
  return Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z);
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

function edgeYaw(edge){
  return -Math.atan2(edge.b.z - edge.a.z, edge.b.x - edge.a.x);
}

function tuneStandardMaterial(material, {
  color,
  emissive = null,
  emissiveIntensity = 0,
  roughness = .86,
  metalness = .05,
} = {}){
  if(!material) return;
  if(material.color && color !== undefined) material.color.setHex(color);
  if(material.emissive && emissive !== null) material.emissive.setHex(emissive);
  if('emissiveIntensity' in material) material.emissiveIntensity = emissiveIntensity;
  if('roughness' in material) material.roughness = roughness;
  if('metalness' in material) material.metalness = metalness;
  material.needsUpdate = true;
}

function styleBaseWorld(THREE, world){
  const floorMaterials = [];
  world.group.children.forEach(child => {
    if(!child?.isMesh || child.geometry?.type !== 'CylinderGeometry' || child.position.y > 0) return;
    if(child.geometry.parameters?.radialSegments !== 6) return;
    if(!floorMaterials.includes(child.material)) floorMaterials.push(child.material);
  });
  floorMaterials.forEach((material, index) => tuneStandardMaterial(material, {
    color:index % 2 ? PALETTE.floorB : PALETTE.floorA,
    emissive:PALETTE.floorDark,
    emissiveIntensity:.12,
    roughness:.9,
    metalness:.04,
  }));

  if(world.forest?.group){
    world.forest.group.traverse(object => {
      if(!object?.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const geometryType = object.geometry?.type || '';
      for(const material of materials){
        const original = material.color?.getHex?.() ?? 0;
        if(geometryType.includes('Dodecahedron') || geometryType.includes('Icosahedron') || original === 0x244b32){
          tuneStandardMaterial(material, { color:PALETTE.red, emissive:PALETTE.redDark, emissiveIntensity:.16, roughness:.91, metalness:0 });
        } else if(original === 0x15281f){
          tuneStandardMaterial(material, { color:PALETTE.inkSoft, emissive:PALETTE.void, emissiveIntensity:.08, roughness:.96, metalness:.02 });
        } else if(geometryType.includes('Cylinder') || geometryType.includes('Cone')){
          tuneStandardMaterial(material, { color:PALETTE.ink, roughness:.9, metalness:.12 });
        }
      }
    });
  }
}

function makeRailings(THREE, edges, group){
  if(!edges.length) return;
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const blackMaterial = new THREE.MeshStandardMaterial({ color:PALETTE.ink, roughness:.72, metalness:.34 });
  const redMaterial = new THREE.MeshStandardMaterial({ color:PALETTE.redDark, emissive:0x240402, emissiveIntensity:.18, roughness:.66, metalness:.24 });
  const railCount = edges.length * 2;
  const blackRails = new THREE.InstancedMesh(unitBox, blackMaterial, railCount);
  const redRails = new THREE.InstancedMesh(unitBox, redMaterial, railCount);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let railIndex = 0;
  const postPlacements = [];
  for(const edge of edges){
    const length = edgeLength(edge);
    const center = pointAlong(edge, .5);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), edgeYaw(edge));
    for(const y of [1.0, 2.05]){
      position.set(center.x, y, center.z);
      scale.set(length + .1, .12, .13);
      matrix.compose(position, quaternion, scale);
      blackRails.setMatrixAt(railIndex, matrix);
      position.y = y + .11;
      scale.set(length + .1, .055, .18);
      matrix.compose(position, quaternion, scale);
      redRails.setMatrixAt(railIndex, matrix);
      railIndex++;
    }
    const postCount = Math.max(2, Math.ceil(length / 5.2) + 1);
    for(let index = 0; index < postCount; index++) postPlacements.push(pointAlong(edge, index / (postCount - 1)));
  }
  blackRails.instanceMatrix.needsUpdate = true;
  redRails.instanceMatrix.needsUpdate = true;
  blackRails.castShadow = redRails.castShadow = true;
  blackRails.receiveShadow = redRails.receiveShadow = true;
  group.add(blackRails, redRails);

  const posts = new THREE.InstancedMesh(unitBox, blackMaterial, postPlacements.length);
  postPlacements.forEach((point, index) => {
    position.set(point.x, 1.35, point.z);
    quaternion.identity();
    scale.set(.18, 2.7, .18);
    matrix.compose(position, quaternion, scale);
    posts.setMatrixAt(index, matrix);
  });
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = true;
  group.add(posts);
}

function makeLantern(THREE, point, yaw, materials, withLight){
  const root = new THREE.Group();
  root.position.set(point.x, 0, point.z);
  root.rotation.y = yaw;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, 4.7, 7), materials.ink);
  pole.position.y = 2.35;
  pole.castShadow = true;
  root.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.05, .1, .1), materials.ink);
  arm.position.set(.38, 4.55, 0);
  root.add(arm);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(.38, .42, .96, 10), materials.lantern);
  lantern.position.set(.82, 4.12, 0);
  lantern.scale.z = .78;
  root.add(lantern);
  for(const y of [3.63, 4.61]){
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.43, .43, .08, 10), materials.ink);
    cap.position.set(.82, y, 0);
    root.add(cap);
  }
  if(withLight){
    const light = new THREE.PointLight(PALETTE.lanternWarm, 14, 13, 2);
    light.position.set(.82, 4.0, 0);
    light.castShadow = false;
    root.add(light);
    root.userData.akaiLight = light;
  }
  root.userData.akaiLantern = lantern;
  return root;
}

function makeLanterns(THREE, edges, seed, group){
  const random = seededRandom(`${seed}:lanterns`);
  const ink = new THREE.MeshStandardMaterial({ color:PALETTE.ink, roughness:.7, metalness:.32 });
  const lantern = new THREE.MeshStandardMaterial({ color:PALETTE.lantern, emissive:PALETTE.lanternWarm, emissiveIntensity:2.4, roughness:.42, metalness:0 });
  const lanterns = [];
  for(const edge of edges){
    if(lanterns.length >= 12) break;
    if(random() > .24) continue;
    const point = pointAlong(edge, .2 + random() * .6, random() > .5 ? .34 : -.34);
    const root = makeLantern(THREE, point, edgeYaw(edge), { ink, lantern }, lanterns.length < 4);
    root.rotation.y += random() > .5 ? Math.PI : 0;
    group.add(root);
    lanterns.push(root);
  }
  return lanterns;
}

function makeBanners(THREE, edges, seed, group){
  const random = seededRandom(`${seed}:banners`);
  const red = new THREE.MeshStandardMaterial({ color:PALETTE.redDark, emissive:0x250302, emissiveIntensity:.16, roughness:.86, metalness:.02, side:THREE.DoubleSide });
  const ink = new THREE.MeshStandardMaterial({ color:PALETTE.ink, roughness:.76, metalness:.2 });
  let count = 0;
  for(const edge of edges){
    if(count >= 8) break;
    if(random() > .12) continue;
    const point = pointAlong(edge, .24 + random() * .52, .22);
    const root = new THREE.Group();
    root.position.set(point.x, 2.75, point.z);
    root.rotation.y = edgeYaw(edge);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.7), red);
    cloth.rotation.y = Math.PI / 2;
    root.add(cloth);
    const top = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.42, .12), ink);
    top.rotation.z = Math.PI / 2;
    top.position.y = 1.4;
    root.add(top);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.5, .08), ink);
    mark.position.set(.02, .05, 0);
    mark.rotation.z = random() > .5 ? .18 : -.18;
    root.add(mark);
    group.add(root);
    count++;
  }
}

function makeLeafScatter(THREE, edges, seed, group){
  if(!edges.length) return;
  const random = seededRandom(`${seed}:fallen-leaves`);
  const count = Math.min(180, Math.max(48, edges.length * 3));
  const geometry = new THREE.PlaneGeometry(.34, .13);
  const material = new THREE.MeshBasicMaterial({ color:PALETTE.redHot, side:THREE.DoubleSide, transparent:true, opacity:.9, depthWrite:false });
  const leaves = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  for(let index = 0; index < count; index++){
    const edge = edges[Math.floor(random() * edges.length)];
    const point = pointAlong(edge, random(), (random() * 2 - 1) * 2.6);
    position.set(point.x, .07 + random() * .035, point.z);
    euler.set(-Math.PI / 2 + (random() - .5) * .18, random() * Math.PI * 2, (random() - .5) * .22);
    quaternion.setFromEuler(euler);
    const size = .55 + random() * 1.25;
    scale.set(size, size, size);
    matrix.compose(position, quaternion, scale);
    leaves.setMatrixAt(index, matrix);
  }
  leaves.instanceMatrix.needsUpdate = true;
  leaves.renderOrder = 2;
  group.add(leaves);
}

function makeRoomMedallion(THREE, center, group){
  const ringMaterial = new THREE.MeshBasicMaterial({ color:PALETTE.lanternWarm, transparent:true, opacity:.58, side:THREE.DoubleSide, depthWrite:false });
  const redMaterial = new THREE.MeshBasicMaterial({ color:PALETTE.red, transparent:true, opacity:.72, side:THREE.DoubleSide, depthWrite:false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.68, 40), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(center.x, .085, center.z);
  group.add(ring);
  for(let index = 0; index < 4; index++){
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(index % 2 ? 2.0 : .11, index % 2 ? .11 : 2.0), redMaterial);
    bar.rotation.x = -Math.PI / 2;
    bar.rotation.z = index * Math.PI / 4;
    bar.position.set(center.x, .09 + index * .001, center.z);
    group.add(bar);
  }
}

function makeDoorSigns(THREE, world, group){
  if(!world.doorTargets) return;
  const ink = new THREE.MeshStandardMaterial({ color:PALETTE.ink, roughness:.75, metalness:.26 });
  const border = new THREE.MeshStandardMaterial({ color:PALETTE.redDark, emissive:0x220302, emissiveIntensity:.2, roughness:.68, metalness:.22 });
  let index = 0;
  for(const target of world.doorTargets.values()){
    if(index++ > 5) break;
    const point = pointAlong(target, .5, .55);
    const root = new THREE.Group();
    root.position.set(point.x, 2.3, point.z);
    root.rotation.y = edgeYaw(target);
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.8, .12), ink));
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.13, 2.25, .14), border);
    stripe.position.z = .03;
    root.add(stripe);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, .13, .18), border);
    cap.position.y = 1.45;
    root.add(cap);
    group.add(root);
  }
}

function styleDoors(world){
  for(const mesh of world.doorMeshes?.values?.() || []){
    const state = mesh.userData?.state;
    tuneStandardMaterial(mesh.material, state === 'breakable' ? {
      color:PALETTE.red,
      emissive:PALETTE.redDark,
      emissiveIntensity:1.2,
      roughness:.58,
      metalness:.24,
    } : {
      color:PALETTE.ink,
      emissive:PALETTE.redDark,
      emissiveIntensity:.2,
      roughness:.72,
      metalness:.32,
    });
  }
}

function styleSceneWhenAttached(world){
  queueMicrotask(() => {
    let root = world.group;
    while(root?.parent) root = root.parent;
    if(!root?.isScene) return;
    if(root.background?.setHex) root.background.setHex(PALETTE.void);
    if(root.fog?.color?.setHex){
      root.fog.color.setHex(PALETTE.fog);
      root.fog.near = Math.max(root.fog.near || 0, 30);
      root.fog.far = Math.max(root.fog.near + 28, Math.min(root.fog.far || 82, 88));
    }
  });
}

export function applyAkaiMazeStyle({ THREE, maze, roomId = null, hexSize = 20, world } = {}){
  if(!THREE || !maze || !world?.group) return world;
  styleBaseWorld(THREE, world);

  const room = roomId === null ? null : maze.rooms.find(candidate => candidate.id === roomId);
  const activeCellKeys = new Set(room ? room.cellKeys : maze.cells.keys());
  const runtimeEdges = buildMazeEdges(maze, { hexSize }).filter(edge => activeCellKeys.has(edge.cellA) || (edge.cellB && activeCellKeys.has(edge.cellB)));
  const wallEdges = runtimeEdges.filter(edge => !edge.open && !edge.door);
  const decorationRoot = new THREE.Group();
  decorationRoot.name = 'akai courtyard visual skin';
  world.group.add(decorationRoot);

  makeRailings(THREE, wallEdges, decorationRoot);
  const lanterns = makeLanterns(THREE, wallEdges, `${maze.seed}:${roomId ?? 'all'}`, decorationRoot);
  makeBanners(THREE, wallEdges, `${maze.seed}:${roomId ?? 'all'}`, decorationRoot);
  makeLeafScatter(THREE, wallEdges, `${maze.seed}:${roomId ?? 'all'}`, decorationRoot);
  makeRoomMedallion(THREE, world.center, decorationRoot);
  makeDoorSigns(THREE, world, decorationRoot);
  styleDoors(world);

  const baseSetDoorStates = world.setDoorStates.bind(world);
  world.setDoorStates = (...args) => {
    const value = baseSetDoorStates(...args);
    styleDoors(world);
    return value;
  };

  const baseUpdate = world.update.bind(world);
  let elapsed = 0;
  world.update = dt => {
    baseUpdate(dt);
    elapsed += Math.max(0, dt || 0);
    lanterns.forEach((root, index) => {
      const wave = Math.sin(elapsed * (2.15 + index * .07) + index * 1.71);
      const material = root.userData.akaiLantern?.material;
      if(material) material.emissiveIntensity = 2.2 + wave * .18;
      if(root.userData.akaiLight) root.userData.akaiLight.intensity = 13.5 + wave * 1.2;
    });
  };

  styleSceneWhenAttached(world);
  return world;
}
