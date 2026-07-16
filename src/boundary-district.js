import { createSeededRandom } from './hex-maze-base.js';
import { installBoundaryTheme } from './boundary-theme.js';
import {
  boundaryHalfWidth,
  buildBoundaryPlacements,
  clamp,
  expandBoundaryCollision,
  makeCapsuleRegion,
  objectShouldCutaway,
  outwardFrame,
  pointAlongEdge,
  smoothstep,
} from './boundary-geometry.js';
import {
  createBoundaryMaterials,
  makeBoundaryRail,
  makeBuildingCluster,
  makeFoliageCluster,
  makeLampPost,
  makeOverheadCable,
  makePaintSplash,
  makeSignboard,
  makeStairPlatform,
} from './boundary-props.js';

function registerOccluder(root, x, z, crownRadius, light = null){
  const faders = [];
  const materialClones = new Map();
  root.traverse(object => {
    if(!object.isMesh || !object.material) return;
    const original = object.material;
    let material = materialClones.get(original);
    if(!material){
      material = original.clone();
      material.transparent = true;
      material.opacity = original.opacity ?? 1;
      materialClones.set(original, material);
      faders.push({ material, baseOpacity:material.opacity });
    }
    object.material = material;
  });
  return {
    root, x, z, crownRadius, faders, light,
    lightIntensity:light?.intensity ?? 0,
    cutMix:0,
    hold:0,
  };
}

export function createBoundaryDistrict({
  THREE,
  maze,
  roomId,
  wallEdges,
  hexSize,
} = {}){
  if(!THREE || !maze) throw new Error('createBoundaryDistrict requires THREE and a maze.');
  installBoundaryTheme();

  const halfWidth = boundaryHalfWidth(hexSize);
  const group = new THREE.Group();
  group.name = `boundary district room ${roomId ?? 'all'}`;
  const materials = createBoundaryMaterials(THREE);
  const random = createSeededRandom(`${maze.seed}:boundary-district:${roomId ?? 'all'}`);
  const endpoints = wallEdges.flatMap(edge => [edge.a, edge.b]);
  const center = endpoints.length
    ? endpoints.reduce((sum, point) => ({ x:sum.x + point.x / endpoints.length, z:sum.z + point.z / endpoints.length }), { x:0, z:0 })
    : { x:0, z:0 };

  for(const edge of wallEdges) group.add(makeCapsuleRegion(THREE, edge, materials.region, halfWidth));

  const edges = [...wallEdges].sort((a, b) => String(a.edge).localeCompare(String(b.edge)) || String(a.part).localeCompare(String(b.part)));
  const occluders = [];
  const lamps = [];

  edges.forEach((edge, edgeIndex) => {
    const frame = outwardFrame(edge, center);
    group.add(makeBoundaryRail(THREE, edge, frame, materials, random));

    const splashCount = frame.length > 4 ? 2 : 1;
    for(let index = 0; index < splashCount; index++){
      const point = pointAlongEdge(edge, .18 + random() * .64, 0);
      const inward = .25 + random() * .65;
      point.x -= frame.nx * inward;
      point.z -= frame.nz * inward;
      group.add(makePaintSplash(THREE, point, random, materials, .75 + random() * .65));
    }

    const foliageCount = Math.max(1, Math.round(frame.length / Math.max(5.5, hexSize * .4)));
    for(let index = 0; index < foliageCount; index++){
      const t = clamp((index + .3 + random() * .45) / foliageCount, .08, .92);
      const point = pointAlongEdge(edge, t, 0);
      point.x += frame.nx * (halfWidth * .62 + random() * .85);
      point.z += frame.nz * (halfWidth * .62 + random() * .85);
      const foliage = makeFoliageCluster(THREE, point, random, materials, .72 + random() * .7);
      group.add(foliage);
      occluders.push(registerOccluder(foliage, point.x, point.z, 1.3 + random() * .7));
    }

    if(edgeIndex % 2 === 0 || frame.length > hexSize * .55){
      const lampPositions = frame.length > 7 ? [.18, .82] : [.5];
      lampPositions.forEach((t, lampIndex) => {
        const point = pointAlongEdge(edge, t, 0);
        point.x += frame.nx * halfWidth * .36;
        point.z += frame.nz * halfWidth * .36;
        const lamp = makeLampPost(
          THREE,
          point,
          materials,
          lamps.length < 4 && (edgeIndex + lampIndex) % 2 === 0,
          3.2 + random() * 1.2,
        );
        group.add(lamp.root);
        lamps.push({ ...point, y:3.7 });
        occluders.push(registerOccluder(lamp.root, point.x, point.z, .7, lamp.light));
      });
    }

    if(edgeIndex % 5 === 1 && frame.length > 3.4){
      const point = pointAlongEdge(edge, .5, 0);
      point.x += frame.nx * (halfWidth + 1.35);
      point.z += frame.nz * (halfWidth + 1.35);
      const sign = makeSignboard(THREE, point, frame, materials, edgeIndex + (roomId ?? 0) * 3, .82 + random() * .28);
      group.add(sign);
      occluders.push(registerOccluder(sign, point.x, point.z, 1.35));
    }

    if(edgeIndex % 6 === 2 && frame.length > 4.8){
      const stairs = makeStairPlatform(THREE, frame, materials, random);
      group.add(stairs);
      occluders.push(registerOccluder(stairs, frame.mx + frame.nx * 3.6, frame.mz + frame.nz * 3.6, 2.1));
    }

    if(edgeIndex % 4 === 0 && frame.length > 4.2){
      const buildings = makeBuildingCluster(THREE, frame, materials, random);
      group.add(buildings);
      occluders.push(registerOccluder(buildings, frame.mx + frame.nx * 7.2, frame.mz + frame.nz * 7.2, 2.8));
    }
  });

  for(let index = 1; index < lamps.length; index += 2){
    const a = lamps[index - 1];
    const b = lamps[index];
    if(Math.hypot(a.x - b.x, a.z - b.z) <= hexSize * 1.25){
      group.add(makeOverheadCable(THREE, { x:a.x, y:3.45, z:a.z }, { x:b.x, y:3.45, z:b.z }, materials));
    }
  }

  const placements = buildBoundaryPlacements(wallEdges, {
    seed:`${maze.seed}:room:${roomId ?? 'all'}`,
    halfWidth,
    maxItems:96,
    spacing:Math.max(3.7, Math.min(5.2, hexSize * .36)),
  });
  const collisionSegments = wallEdges.flatMap(edge => expandBoundaryCollision(edge, halfWidth, 5));

  const updateCutaways = (dt, player, camera = null) => {
    if(!player) return;
    const viewCamera = camera || { x:player.x, z:player.z + Math.max(14, hexSize * 1.45) };
    for(const object of occluders){
      const occluding = objectShouldCutaway(object, viewCamera, player, {
        corridorWidth:1.6,
        maxPlayerDistance:Math.max(14, hexSize * 1.15),
      });
      object.hold = occluding ? .2 : Math.max(0, object.hold - dt);
      const target = occluding || object.hold > 0 ? 1 : 0;
      object.cutMix += (target - object.cutMix) * Math.min(1, dt * (target > object.cutMix ? 11 : 4.4));
      const cut = smoothstep(object.cutMix);
      for(const entry of object.faders){
        entry.material.opacity = entry.baseOpacity * (1 - cut * .88);
        entry.material.depthWrite = cut < .3;
      }
      if(object.light) object.light.intensity = object.lightIntensity * (1 - cut * .72);
      object.root.visible = cut < .985;
    }
  };

  return {
    group,
    trees:occluders,
    placements,
    collisionSegments,
    halfWidth,
    updateCutaways,
  };
}
