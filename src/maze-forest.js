import { createSeededRandom } from './hex-maze-base.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function hashText(text){
  let h = 2166136261 >>> 0;
  for(const ch of String(text)){
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function organicPatch(x, z, seedHash){
  const a = Math.sin(x * .23 + z * .09 + seedHash * .000013);
  const b = Math.cos(x * .11 - z * .27 + seedHash * .000031);
  const c = Math.sin((x + z) * .07 + seedHash * .000071);
  return (a + b * .72 + c * .48 + 2.2) / 4.4;
}

function edgeLength(edge){
  return Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z);
}

function pointAlongEdge(edge, t, normalOffset = 0){
  const dx = edge.b.x - edge.a.x;
  const dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz) || 1;
  const nx = -dz / length;
  const nz = dx / length;
  return {
    x:edge.a.x + dx * t + nx * normalOffset,
    z:edge.a.z + dz * t + nz * normalOffset,
  };
}

function farEnough(points, candidate, distance){
  const limitSq = distance * distance;
  return points.every(point => {
    const dx = point.x - candidate.x;
    const dz = point.z - candidate.z;
    return dx * dx + dz * dz >= limitSq;
  });
}

export function forestHalfWidthForHex(hexSize){
  return Math.max(1.25, Math.min(Number(hexSize) * .16, 2.5));
}

export function buildForestPlacements(wallEdges, {
  seed = 'maze-forest',
  halfWidth = 1.8,
  maxTrees = 96,
  spacing = 4.35,
} = {}){
  const random = createSeededRandom(`${seed}:tree-placement`);
  const seedHash = hashText(seed);
  const placements = [];
  const sortedEdges = [...wallEdges].sort((a, b) => String(a.edge).localeCompare(String(b.edge)) || String(a.part).localeCompare(String(b.part)));

  const tryCandidate = (edge, t, force = false) => {
    if(placements.length >= maxTrees) return;
    const lateral = (random() * 2 - 1) * halfWidth * .72;
    const point = pointAlongEdge(edge, clamp(t, .06, .94), lateral);
    const patch = organicPatch(point.x, point.z, seedHash);
    if(!force && patch + random() * .34 < .48) return;
    const minSpacing = 1.55 + random() * .7;
    if(!farEnough(placements, point, minSpacing)) return;
    placements.push({
      ...point,
      yaw:random() * Math.PI * 2,
      scale:.82 + random() * .42,
      trunkRadius:.28 + random() * .16,
      trunkHeight:7.4 + random() * 3.2,
      crownRadius:1.35 + random() * .72,
      crownSquash:.78 + random() * .34,
      tint:random(),
      sourceEdge:edge.edge,
    });
  };

  for(const edge of sortedEdges){
    const length = edgeLength(edge);
    if(length < .8) continue;
    const count = Math.max(1, Math.round(length / spacing));
    for(let index = 0; index < count; index++){
      const t = (index + .22 + random() * .56) / count;
      tryCandidate(edge, t, index === 0 && length > 4.8);
    }
    if(length > spacing * 1.7 && random() > .48) tryCandidate(edge, .5, false);
  }

  return placements;
}

export function expandWallCollisionSegments(edge, halfWidth, lanes = 5){
  const count = Math.max(1, Math.round(lanes));
  if(count === 1 || halfWidth <= 0) return [{ ...edge, forest:true, forestOffset:0 }];
  const dx = edge.b.x - edge.a.x;
  const dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz) || 1;
  const nx = -dz / length;
  const nz = dx / length;
  return Array.from({ length:count }, (_, index) => {
    const offset = -halfWidth + halfWidth * 2 * index / (count - 1);
    return {
      ...edge,
      a:{ x:edge.a.x + nx * offset, z:edge.a.z + nz * offset },
      b:{ x:edge.b.x + nx * offset, z:edge.b.z + nz * offset },
      forest:true,
      forestOffset:offset,
    };
  });
}

function closestPointOnSegment(point, a, b){
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz || 1;
  const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSq, 0, 1);
  return { x:a.x + dx * t, z:a.z + dz * t, t };
}

export function treeShouldCutaway(tree, camera, player, {
  corridorWidth = 1.38,
  maxPlayerDistance = 13.5,
} = {}){
  if(!tree || !camera || !player) return false;
  const playerDistance = Math.hypot(tree.x - player.x, tree.z - player.z);
  if(playerDistance > maxPlayerDistance) return false;
  const closest = closestPointOnSegment(tree, camera, player);
  if(closest.t <= .08 || closest.t >= .985) return false;
  const lineDistance = Math.hypot(tree.x - closest.x, tree.z - closest.z);
  const allowed = corridorWidth + (tree.crownRadius || 1.5) * .18;
  if(lineDistance > allowed) return false;
  const cameraToPlayerX = player.x - camera.x;
  const cameraToPlayerZ = player.z - camera.z;
  const playerToTreeX = tree.x - player.x;
  const playerToTreeZ = tree.z - player.z;
  return playerToTreeX * cameraToPlayerX + playerToTreeZ * cameraToPlayerZ < 0;
}

function makeCapsuleRegion(THREE, edge, material, halfWidth){
  const group = new THREE.Group();
  const dx = edge.b.x - edge.a.x;
  const dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz);
  const center = new THREE.Mesh(new THREE.BoxGeometry(length, .16, halfWidth * 2), material);
  center.position.set((edge.a.x + edge.b.x) / 2, .015, (edge.a.z + edge.b.z) / 2);
  center.rotation.y = -Math.atan2(dz, dx);
  center.receiveShadow = true;
  group.add(center);
  const diskGeometry = new THREE.CylinderGeometry(halfWidth, halfWidth, .16, 12);
  for(const point of [edge.a, edge.b]){
    const disk = new THREE.Mesh(diskGeometry, material);
    disk.position.set(point.x, .015, point.z);
    disk.receiveShadow = true;
    group.add(disk);
  }
  return group;
}

function makeTree(THREE, placement, materials, cutHeight){
  const root = new THREE.Group();
  root.position.set(placement.x, .08, placement.z);
  root.rotation.y = placement.yaw;
  // Keep the visibility cut at one quiet, consistent world height while still varying tree width.
  root.scale.set(placement.scale, 1, placement.scale);

  const baseHeight = Math.min(cutHeight, placement.trunkHeight - 1.2);
  const baseGeometry = new THREE.CylinderGeometry(
    placement.trunkRadius * .76,
    placement.trunkRadius,
    baseHeight,
    7,
    2,
  );
  const base = new THREE.Mesh(baseGeometry, materials.bark);
  base.position.y = baseHeight / 2;
  root.add(base);

  const upperGroup = new THREE.Group();
  const upperHeight = Math.max(.8, placement.trunkHeight - baseHeight);
  const upperBark = materials.bark.clone();
  upperBark.transparent = true;
  const upperGeometry = new THREE.CylinderGeometry(
    placement.trunkRadius * .38,
    placement.trunkRadius * .76,
    upperHeight,
    7,
    2,
  );
  const upper = new THREE.Mesh(upperGeometry, upperBark);
  upper.position.y = baseHeight + upperHeight / 2;
  upperGroup.add(upper);

  const leafColor = materials.leaf.color.clone();
  leafColor.offsetHSL((placement.tint - .5) * .025, (placement.tint - .5) * .05, (placement.tint - .5) * .035);
  const leafMaterial = materials.leaf.clone();
  leafMaterial.color.copy(leafColor);
  leafMaterial.transparent = true;
  const crownGeometry = new THREE.DodecahedronGeometry(placement.crownRadius, 0);
  const crown = new THREE.Mesh(crownGeometry, leafMaterial);
  crown.position.y = placement.trunkHeight + placement.crownRadius * .34;
  crown.scale.set(1, placement.crownSquash, .9 + placement.tint * .18);
  crown.rotation.set((placement.tint - .5) * .22, placement.yaw * .37, (placement.tint - .5) * .18);
  upperGroup.add(crown);

  const crownTopMaterial = leafMaterial.clone();
  const crownTop = new THREE.Mesh(new THREE.DodecahedronGeometry(placement.crownRadius * .72, 0), crownTopMaterial);
  crownTop.position.set(
    (placement.tint - .5) * placement.crownRadius * .36,
    placement.trunkHeight + placement.crownRadius * 1.15,
    (.5 - placement.tint) * placement.crownRadius * .22,
  );
  crownTop.scale.set(.9, .82, .88);
  upperGroup.add(crownTop);
  root.add(upperGroup);

  const capMaterial = materials.bark.clone();
  capMaterial.transparent = true;
  capMaterial.opacity = 0;
  capMaterial.depthWrite = false;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(placement.trunkRadius * .82, placement.trunkRadius * .75, 7), capMaterial);
  cap.position.y = baseHeight + placement.trunkRadius * .24;
  cap.visible = false;
  root.add(cap);

  root.traverse(object => {
    if(object.isMesh){
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });

  return {
    root,
    x:placement.x,
    z:placement.z,
    crownRadius:placement.crownRadius * placement.scale,
    upperGroup,
    upperMaterials:[upperBark, leafMaterial, crownTopMaterial],
    cap,
    capMaterial,
    cutMix:0,
    hold:0,
  };
}

function makeScatter(THREE, placements, materials){
  const count = Math.min(placements.length * 2, 160);
  if(!count) return null;
  const geometry = new THREE.DodecahedronGeometry(.42, 0);
  const mesh = new THREE.InstancedMesh(geometry, materials.shrub, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const random = createSeededRandom(`scatter:${placements.length}:${placements[0]?.sourceEdge || ''}`);
  for(let index = 0; index < count; index++){
    const tree = placements[index % placements.length];
    const angle = random() * Math.PI * 2;
    const radius = .55 + random() * 1.25;
    position.set(tree.x + Math.cos(angle) * radius, .18 + random() * .08, tree.z + Math.sin(angle) * radius);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const s = .45 + random() * .65;
    scale.set(s * (1 + random() * .4), s * (.55 + random() * .45), s);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

export function createMazeForest({
  THREE,
  maze,
  roomId,
  wallEdges,
  hexSize,
  wallHeight,
} = {}){
  if(!THREE || !maze) throw new Error('createMazeForest requires THREE and a maze.');
  const halfWidth = forestHalfWidthForHex(hexSize);
  const group = new THREE.Group();
  group.name = `maze forest room ${roomId ?? 'all'}`;
  const regionMaterial = new THREE.MeshStandardMaterial({ color:0x15281f, roughness:1, metalness:0 });
  const bark = new THREE.MeshStandardMaterial({ color:0x4a3328, roughness:.98, metalness:0 });
  const leaf = new THREE.MeshStandardMaterial({ color:0x183b2b, roughness:.96, metalness:0 });
  const shrub = new THREE.MeshStandardMaterial({ color:0x244b32, roughness:1, metalness:0 });
  const materials = { region:regionMaterial, bark, leaf, shrub };

  for(const edge of wallEdges) group.add(makeCapsuleRegion(THREE, edge, regionMaterial, halfWidth));

  const placements = buildForestPlacements(wallEdges, {
    seed:`${maze.seed}:room:${roomId ?? 'all'}`,
    halfWidth,
    maxTrees:96,
    spacing:Math.max(3.7, Math.min(5.2, hexSize * .36)),
  });
  const trees = placements.map(placement => makeTree(THREE, placement, materials, wallHeight));
  for(const tree of trees) group.add(tree.root);
  const scatter = makeScatter(THREE, placements, materials);
  if(scatter) group.add(scatter);

  const collisionSegments = wallEdges.flatMap(edge => expandWallCollisionSegments(edge, halfWidth, 5));

  const updateCutaways = (dt, player, camera = null) => {
    if(!player || trees.length === 0) return;  // arena layout suppresses all trees; skip the per-frame viewCamera alloc + loop
    const viewCamera = camera || { x:player.x, z:player.z + Math.max(14, hexSize * 1.45) };
    for(const tree of trees){
      const occluding = treeShouldCutaway(tree, viewCamera, player);
      if(occluding) tree.hold = .22;
      else tree.hold = Math.max(0, tree.hold - dt);
      const target = occluding || tree.hold > 0 ? 1 : 0;
      const rate = target > tree.cutMix ? 12 : 4.6;
      tree.cutMix += (target - tree.cutMix) * Math.min(1, dt * rate);
      const cut = smoothstep(tree.cutMix);
      const upperOpacity = 1 - cut;
      tree.upperGroup.visible = upperOpacity > .025;
      for(const material of tree.upperMaterials){
        material.opacity = upperOpacity;
        material.depthWrite = upperOpacity > .72;
      }
      tree.capMaterial.opacity = cut;
      tree.capMaterial.depthWrite = cut > .72;
      tree.cap.visible = cut > .025;
    }
  };

  return {
    group,
    trees,
    placements,
    collisionSegments,
    halfWidth,
    updateCutaways,
  };
}
