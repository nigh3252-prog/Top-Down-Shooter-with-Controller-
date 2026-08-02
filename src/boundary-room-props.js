import { getArenaRuntime } from './arena-runtime-context.js';
import { createSeededRandom } from './hex-maze.js';
import { axialToWorld, resolveCircleMovement } from './hex-maze-navigation.js';
import { districtForRoom } from './boundary-districts.js';

const PLAYER_PUSH_RADIUS = 1.08;

function shuffled(values, random){
  const result = [...values];
  for(let index = result.length - 1; index > 0; index--){
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function makeMaterials(THREE, district){
  return {
    ink:new THREE.MeshStandardMaterial({ color:0x071116, roughness:.72, metalness:.28 }),
    dark:new THREE.MeshStandardMaterial({ color:0x122329, roughness:.9, metalness:.08 }),
    concrete:new THREE.MeshStandardMaterial({ color:0x476b70, roughness:.94, metalness:.03 }),
    accent:new THREE.MeshStandardMaterial({ color:district.accent, emissive:0x4b0b08, emissiveIntensity:.25, roughness:.68, metalness:.15 }),
    secondary:new THREE.MeshStandardMaterial({ color:district.secondary, emissive:district.secondary, emissiveIntensity:.18, roughness:.56, metalness:.1 }),
    cream:new THREE.MeshStandardMaterial({ color:0xffedb0, emissive:0xffb45d, emissiveIntensity:1.45, roughness:.42, metalness:0 }),
  };
}

function box(THREE, root, mat, x, y, z, sx, sy, sz){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
}

function cylinder(THREE, root, mat, x, y, z, radius, height){
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .96, height, 9), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
}

function sphere(THREE, root, mat, x, y, z, radius){
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  root.add(mesh);
}

function makeKnockable(THREE, kind, mats, random){
  const root = new THREE.Group();
  root.name = `knockable ${kind}`;
  if(kind === 'sign'){
    cylinder(THREE, root, mats.ink, 0, .85, 0, .07, 1.7);
    box(THREE, root, mats.dark, 0, 1.5, 0, .72, .48, .12);
    box(THREE, root, mats.accent, 0, 1.5, -.07, .48, .06, .04);
  } else if(kind === 'lantern'){
    cylinder(THREE, root, mats.ink, 0, .95, 0, .075, 1.9);
    sphere(THREE, root, mats.cream, 0, 1.82, 0, .28);
  } else if(kind === 'canister'){
    cylinder(THREE, root, mats.dark, 0, .48, 0, .34, .96);
    cylinder(THREE, root, mats.accent, 0, .83, 0, .35, .08);
  } else if(kind === 'cone'){
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.38, 1.05, 8), mats.accent);
    cone.position.y = .52;
    cone.castShadow = true;
    root.add(cone);
    box(THREE, root, mats.ink, 0, .05, 0, .62, .1, .62);
  } else {
    box(THREE, root, mats.dark, 0, .38, 0, .72, .76, .72);
    box(THREE, root, mats.accent, 0, .39, 0, .76, .11, .77);
  }
  root.rotation.y = random() * Math.PI * 2;
  return root;
}

function makeBlocker(THREE, kind, mats, random){
  const root = new THREE.Group();
  root.name = `blocking terrain ${kind}`;
  let halfX = 1.35, halfZ = 1.05;
  if(kind === 'planter'){
    halfX = 1.65; halfZ = 1.1;
    box(THREE, root, mats.dark, 0, .38, 0, halfX * 2, .76, halfZ * 2);
    box(THREE, root, mats.accent, 0, .79, 0, halfX * 1.9, .08, halfZ * 1.9);
    for(let index = 0; index < 7; index++) sphere(THREE, root, index % 2 ? mats.accent : mats.secondary, (random() - .5) * halfX * 1.45, .95 + random() * .42, (random() - .5) * halfZ * 1.35, .42 + random() * .28);
  } else if(kind === 'tanks'){
    halfX = 1.55; halfZ = 1.15;
    box(THREE, root, mats.ink, 0, .18, 0, halfX * 2, .36, halfZ * 2);
    for(const x of [-.72,.72]){
      cylinder(THREE, root, mats.concrete, x, 1.35, 0, .62, 2.7);
      cylinder(THREE, root, mats.accent, x, 2.73, 0, .65, .12);
    }
  } else if(kind === 'kiosk'){
    halfX = 1.6; halfZ = 1.2;
    box(THREE, root, mats.dark, 0, 1.15, 0, halfX * 2, 2.3, halfZ * 2);
    box(THREE, root, mats.cream, 0, 1.35, -halfZ - .04, halfX * 1.2, .55, .06);
    box(THREE, root, mats.accent, 0, 2.4, 0, halfX * 2.2, .16, halfZ * 2.2);
  } else {
    halfX = 1.75; halfZ = .72;
    box(THREE, root, mats.concrete, 0, .62, 0, halfX * 2, 1.24, halfZ * 2);
    box(THREE, root, mats.accent, 0, 1.28, 0, halfX * 2.04, .12, halfZ * 2.04);
  }
  return { root, halfX, halfZ };
}

function rectangleSegments(x, z, halfX, halfZ, yaw, owner){
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const corners = [
    { x:-halfX, z:-halfZ }, { x:halfX, z:-halfZ },
    { x:halfX, z:halfZ }, { x:-halfX, z:halfZ },
  ].map(point => ({
    x:x + point.x * cos - point.z * sin,
    z:z + point.x * sin + point.z * cos,
  }));
  return corners.map((a, index) => ({
    a,
    b:corners[(index + 1) % corners.length],
    blocked:true,
    part:'boundary-blocking-prop',
    owner,
  }));
}

function activeCells(maze, roomId){
  const room = maze.rooms.find(candidate => candidate.id === roomId);
  return (room?.cellKeys || []).map(key => maze.cells.get(key)).filter(Boolean);
}

function candidatePoints(maze, roomId, hexSize, random){
  const result = [];
  for(const cell of shuffled(activeCells(maze, roomId), random)){
    const center = axialToWorld(cell.q, cell.r, hexSize);
    for(let index = 0; index < 4; index++){
      const angle = random() * Math.PI * 2;
      const distance = (.12 + random() * .24) * hexSize;
      result.push({ x:center.x + Math.cos(angle) * distance, z:center.z + Math.sin(angle) * distance });
    }
  }
  return result;
}

function choosePoint(candidates, placed, center, doors, rules){
  while(candidates.length){
    const point = candidates.shift();
    if(Math.hypot(point.x - center.x, point.z - center.z) < rules.center) continue;
    if(doors.some(door => Math.hypot(point.x - door.center.x, point.z - door.center.z) < rules.door)) continue;
    if(placed.some(other => Math.hypot(point.x - other.x, point.z - other.z) < rules.spacing)) continue;
    placed.push(point);
    return point;
  }
  return null;
}

function installPhysics(world, knockables, blockerSegments, random){
  const baseCollision = world.getCollisionSegments.bind(world);
  world.getCollisionSegments = () => [...baseCollision(), ...blockerSegments];
  let previousActor = null;
  return dt => {
    const actorPos = getArenaRuntime()?.actorPos;
    if(!actorPos) return;
    const actor = { x:actorPos.x, z:actorPos.y };
    const actorDelta = previousActor ? { x:actor.x - previousActor.x, z:actor.z - previousActor.z } : { x:0, z:0 };
    const actorTravel = Math.hypot(actorDelta.x, actorDelta.z);
    const actorDirection = actorTravel > .0001 ? { x:actorDelta.x / actorTravel, z:actorDelta.z / actorTravel } : null;
    previousActor = actor;

    for(const prop of knockables){
      prop.cooldown = Math.max(0, prop.cooldown - dt);
      const dx = prop.x - actor.x, dz = prop.z - actor.z;
      const distance = Math.hypot(dx, dz);
      if(distance < PLAYER_PUSH_RADIUS + prop.radius && prop.cooldown <= 0){
        const fallback = Math.max(.001, distance);
        const direction = actorDirection || { x:dx / fallback, z:dz / fallback };
        const impulse = 3.6 + Math.min(4.5, actorTravel / Math.max(.001, dt) * .28);
        prop.vx += direction.x * impulse;
        prop.vz += direction.z * impulse;
        prop.avx += direction.z * (2.8 + random() * 2.4);
        prop.avz -= direction.x * (2.8 + random() * 2.4);
        prop.cooldown = .22;
      }

      const resolved = resolveCircleMovement(
        { x:prop.x, z:prop.z },
        { x:prop.vx * dt, z:prop.vz * dt },
        Math.max(.18, prop.radius * .72),
        world.getCollisionSegments()
      );
      prop.x = resolved.x;
      prop.z = resolved.z;
      if(resolved.collided){ prop.vx *= -.18; prop.vz *= -.18; }
      prop.vx *= Math.pow(.13, dt);
      prop.vz *= Math.pow(.13, dt);
      prop.avx *= Math.pow(.18, dt);
      prop.avz *= Math.pow(.18, dt);
      prop.leanX = Math.max(-1.35, Math.min(1.35, prop.leanX + prop.avx * dt));
      prop.leanZ = Math.max(-1.35, Math.min(1.35, prop.leanZ + prop.avz * dt));
      prop.root.position.set(prop.x, 0, prop.z);
      prop.root.rotation.x = prop.leanX;
      prop.root.rotation.z = prop.leanZ;
    }
  };
}

export function applyBoundaryRoomProps({ THREE, maze, roomId = null, hexSize = 20, world } = {}){
  if(!THREE || !maze || !world?.group || roomId === null) return world;
  const district = districtForRoom(maze.seed, roomId);
  const random = createSeededRandom(`${maze.seed}:${roomId}:boundary-props-v1`);
  const mats = makeMaterials(THREE, district);
  const cells = activeCells(maze, roomId);
  const candidates = candidatePoints(maze, roomId, hexSize, random);
  const doors = world.getDoorTargets?.() || [];
  const placed = [];
  const root = new THREE.Group();
  root.name = `boundary interactive props: ${district.id}`;
  world.group.add(root);

  const blockerKinds = district.id === 'utility-basin'
    ? ['tanks','barrier','planter']
    : district.id === 'lantern-arcade'
      ? ['kiosk','planter','barrier']
      : ['planter','barrier','kiosk'];
  const blockers = [];
  const blockerSegments = [];
  const blockerCount = Math.max(1, Math.min(4, Math.floor(cells.length / 2.6)));
  for(let index = 0; index < blockerCount; index++){
    const point = choosePoint(candidates, placed, world.center, doors, { center:4, door:5, spacing:5.3 });
    if(!point) break;
    const kind = blockerKinds[(index + Math.floor(random() * blockerKinds.length)) % blockerKinds.length];
    const object = makeBlocker(THREE, kind, mats, random);
    const yaw = Math.floor(random() * 6) * Math.PI / 3;
    object.root.position.set(point.x, 0, point.z);
    object.root.rotation.y = yaw;
    root.add(object.root);
    const entry = { ...object, ...point, yaw, kind };
    blockers.push(entry);
    blockerSegments.push(...rectangleSegments(point.x, point.z, object.halfX + .16, object.halfZ + .16, yaw, entry));
  }

  const knockableKinds = district.id === 'utility-basin'
    ? ['canister','crate','cone','sign']
    : district.id === 'lantern-arcade'
      ? ['lantern','sign','crate','cone']
      : ['sign','crate','lantern','canister','cone'];
  const knockables = [];
  const knockableCount = Math.max(5, Math.min(12, cells.length * 2));
  for(let index = 0; index < knockableCount; index++){
    const point = choosePoint(candidates, placed, world.center, doors, { center:2.7, door:3.2, spacing:2.45 });
    if(!point) break;
    const kind = knockableKinds[(index + Math.floor(random() * knockableKinds.length)) % knockableKinds.length];
    const propRoot = makeKnockable(THREE, kind, mats, random);
    const scale = .78 + random() * .38;
    propRoot.scale.setScalar(scale);
    propRoot.position.set(point.x, 0, point.z);
    root.add(propRoot);
    knockables.push({
      root:propRoot,
      kind,
      radius:.42 * scale,
      x:point.x,
      z:point.z,
      vx:0,
      vz:0,
      avx:0,
      avz:0,
      leanX:0,
      leanZ:0,
      cooldown:0,
    });
  }

  const updateProps = installPhysics(world, knockables, blockerSegments, random);
  const baseUpdate = world.update.bind(world);
  world.update = dt => {
    baseUpdate(dt);
    updateProps(Math.max(0, dt || 0));
  };
  world.boundaryBlockingProps = blockers;
  world.boundaryKnockableProps = knockables;
  return world;
}
