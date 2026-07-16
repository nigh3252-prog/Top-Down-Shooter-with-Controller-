import { createSeededRandom } from './hex-maze-base.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const smoothstep = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function edgeLength(edge){
  return Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z);
}

export function edgeFrame(edge){
  const dx = edge.b.x - edge.a.x;
  const dz = edge.b.z - edge.a.z;
  const length = Math.hypot(dx, dz) || 1;
  return {
    dx, dz, length,
    ux:dx / length, uz:dz / length,
    nx:-dz / length, nz:dx / length,
    yaw:-Math.atan2(dz, dx),
    mx:(edge.a.x + edge.b.x) / 2,
    mz:(edge.a.z + edge.b.z) / 2,
  };
}

export function pointAlongEdge(edge, t, normalOffset = 0){
  const frame = edgeFrame(edge);
  return {
    x:edge.a.x + frame.dx * t + frame.nx * normalOffset,
    z:edge.a.z + frame.dz * t + frame.nz * normalOffset,
  };
}

export function outwardFrame(edge, center){
  const frame = edgeFrame(edge);
  const plusDistance = Math.hypot(frame.mx + frame.nx - center.x, frame.mz + frame.nz - center.z);
  const minusDistance = Math.hypot(frame.mx - frame.nx - center.x, frame.mz - frame.nz - center.z);
  return plusDistance >= minusDistance ? frame : { ...frame, nx:-frame.nx, nz:-frame.nz };
}

export function cylinderBetween(THREE, a, b, radius, material, radialSegments = 7){
  const start = new THREE.Vector3(a.x, a.y, a.z);
  const end = new THREE.Vector3(b.x, b.y, b.z);
  const delta = end.clone().sub(start);
  const length = delta.length() || .001;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments), material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  return mesh;
}

export function boxAlongEdge(THREE, edge, material, height, depth, normalOffset = 0, y = height / 2){
  const frame = edgeFrame(edge);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(frame.length, height, depth), material);
  mesh.position.set(frame.mx + frame.nx * normalOffset, y, frame.mz + frame.nz * normalOffset);
  mesh.rotation.y = frame.yaw;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeCapsuleRegion(THREE, edge, material, halfWidth){
  const group = new THREE.Group();
  group.add(boxAlongEdge(THREE, edge, material, .18, halfWidth * 2, 0, .015));
  const diskGeometry = new THREE.CylinderGeometry(halfWidth, halfWidth, .18, 12);
  for(const point of [edge.a, edge.b]){
    const disk = new THREE.Mesh(diskGeometry, material);
    disk.position.set(point.x, .015, point.z);
    disk.receiveShadow = true;
    group.add(disk);
  }
  return group;
}

function closestPointOnSegment(point, a, b){
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz || 1;
  const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSq, 0, 1);
  return { x:a.x + dx * t, z:a.z + dz * t, t };
}

export function objectShouldCutaway(object, camera, player, {
  corridorWidth = 1.45,
  maxPlayerDistance = 14,
} = {}){
  if(!object || !camera || !player) return false;
  if(Math.hypot(object.x - player.x, object.z - player.z) > maxPlayerDistance) return false;
  const closest = closestPointOnSegment(object, camera, player);
  if(closest.t <= .08 || closest.t >= .985) return false;
  const allowed = corridorWidth + (object.crownRadius || 1.5) * .18;
  if(Math.hypot(object.x - closest.x, object.z - closest.z) > allowed) return false;
  const cameraToPlayerX = player.x - camera.x;
  const cameraToPlayerZ = player.z - camera.z;
  return (object.x - player.x) * cameraToPlayerX + (object.z - player.z) * cameraToPlayerZ < 0;
}

export function boundaryHalfWidth(hexSize){
  return Math.max(1.25, Math.min(Number(hexSize) * .16, 2.5));
}

export function buildBoundaryPlacements(wallEdges, {
  seed = 'maze-boundary-district',
  halfWidth = 1.8,
  maxItems = 96,
  spacing = 4.35,
} = {}){
  const random = createSeededRandom(`${seed}:district-placement`);
  const placements = [];
  const edges = [...wallEdges].sort((a, b) => String(a.edge).localeCompare(String(b.edge)) || String(a.part).localeCompare(String(b.part)));
  for(const edge of edges){
    const length = edgeLength(edge);
    if(length < .8) continue;
    const count = Math.max(1, Math.round(length / spacing));
    for(let index = 0; index < count && placements.length < maxItems; index++){
      const t = clamp((index + .22 + random() * .56) / count, .06, .94);
      const point = pointAlongEdge(edge, t, (random() * 2 - 1) * halfWidth * .68);
      const farEnough = placements.every(other => Math.hypot(other.x - point.x, other.z - point.z) > 1.35 + random() * .65);
      if(!farEnough) continue;
      placements.push({
        ...point,
        yaw:random() * Math.PI * 2,
        scale:.78 + random() * .58,
        crownRadius:1.05 + random() * 1.2,
        sourceEdge:edge.edge,
      });
    }
  }
  return placements;
}

export function expandBoundaryCollision(edge, halfWidth, lanes = 5){
  const count = Math.max(1, Math.round(lanes));
  if(count === 1 || halfWidth <= 0) return [{ ...edge, forest:true, forestOffset:0 }];
  const frame = edgeFrame(edge);
  return Array.from({ length:count }, (_, index) => {
    const offset = -halfWidth + halfWidth * 2 * index / (count - 1);
    return {
      ...edge,
      a:{ x:edge.a.x + frame.nx * offset, z:edge.a.z + frame.nz * offset },
      b:{ x:edge.b.x + frame.nx * offset, z:edge.b.z + frame.nz * offset },
      forest:true,
      forestOffset:offset,
    };
  });
}
