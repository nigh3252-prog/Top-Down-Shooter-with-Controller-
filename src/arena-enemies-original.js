// Branch-local arena-enemy wrapper for the Pilebunker gameplay effect.
// The combat implementation is localized from the pinned source so this branch
// uses its own no-director combat behavior while preserving rigid goblin physics.

import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-original-source.js';
import { setArenaEnemySource } from './arena-enemy-registry.js';

export { ARENA_ENEMY_ARCHETYPES };

const RIGID = Object.freeze({
  gravity:20,
  floorRestitution:.43,
  wallRestitution:.58,
  airDrag:.78,
  groundDrag:.10,
  angularAirDrag:.58,
  angularGroundDrag:.12,
  settleSpeed:1.15,
  settleAngular:1.35,
  settleTime:.42,
  maxTime:4.2,
  recoveryStun:.62,
});

export function createArenaEnemySystem(options = {}) {
  const system = createBaseArenaEnemySystem(options);
  const { THREE, navigation = null, arenaRadius = 18 } = options;
  if (!THREE) throw new Error('[rigid-goblins] THREE is required.');

  const rigidBodies = new Map();
  const baseUpdate = system.update.bind(system);
  const baseDamageEnemy = system.damageEnemy.bind(system);
  const baseReset = system.reset.bind(system);
  const baseStartRoomEncounter = system.startRoomEncounter?.bind(system);
  const baseClearRoomRuntime = system.clearRoomRuntime?.bind(system);
  const axis = new THREE.Vector3();
  const deltaQ = new THREE.Quaternion();

  function isGoblin(enemy) {
    return !!enemy && enemy.role === 'goblin' && !enemy.fusion && enemy.root?.isObject3D;
  }

  function finiteOr(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function repairCorruptEnemy(enemy) {
    if (!enemy) return;
    if (!Number.isFinite(enemy.hp)) enemy.hp = Number.isFinite(enemy.maxHp) ? enemy.maxHp : 1;
    enemy.x = finiteOr(enemy.x);
    enemy.z = finiteOr(enemy.z);
    enemy.knockX = finiteOr(enemy.knockX);
    enemy.knockZ = finiteOr(enemy.knockZ);
    enemy.yOff = finiteOr(enemy.yOff);
    enemy.vyOff = finiteOr(enemy.vyOff);
    if (enemy.root) {
      enemy.root.visible = true;
      if (![enemy.root.scale.x, enemy.root.scale.y, enemy.root.scale.z].every(Number.isFinite)) {
        enemy.root.scale.set(1, 1, 1);
      }
    }
  }

  function captureFrozenPose(root) {
    const frozen = [];
    root.traverse(object => {
      if (object === root) return;
      frozen.push({
        object,
        position:object.position.clone(),
        quaternion:object.quaternion.clone(),
        scale:object.scale.clone(),
        visible:object.visible,
      });
    });
    return frozen;
  }

  function restoreFrozenPose(body) {
    for (const item of body.frozen) {
      const object = item.object;
      if (!object) continue;
      object.position.copy(item.position);
      object.quaternion.copy(item.quaternion);
      object.scale.copy(item.scale);
      object.visible = item.visible;
    }
    for (const marker of body.markers) {
      if (marker) marker.visible = false;
    }
  }

  function markerList(enemy) {
    return [enemy.bar, enemy.barBg, enemy.telegraph, enemy.tokenRing].filter(Boolean);
  }

  function makeRigidBody(enemy, launch = {}) {
    repairCorruptEnemy(enemy);
    if (!isGoblin(enemy) || enemy.hp <= 0) return null;

    const existing = rigidBodies.get(enemy);
    if (existing) {
      existing.vx += finiteOr(launch.velocityX);
      existing.vz += finiteOr(launch.velocityZ);
      existing.vy = Math.max(existing.vy, finiteOr(launch.verticalVelocity, 5));
      const extraSpin = finiteOr(launch.spin, 7);
      existing.angular.x += (Math.random() * 2 - 1) * extraSpin * .55;
      existing.angular.y += (Math.random() * 2 - 1) * extraSpin * .35;
      existing.angular.z += (Math.random() * 2 - 1) * extraSpin;
      existing.settle = 0;
      return existing;
    }

    const root = enemy.root;
    const originalParent = root.parent;
    if (!originalParent) return null;

    root.updateWorldMatrix(true, true);
    const pivot = new THREE.Group();
    pivot.name = `${enemy.kind || 'goblin'} rigid capsule pivot`;
    originalParent.add(pivot);

    const frozen = captureFrozenPose(root);
    const markers = markerList(enemy);
    const markerVisibility = new Map(markers.map(marker => [marker, marker.visible]));
    const rootScale = root.scale.clone();
    const rootFacing = root.quaternion.clone();
    const heightScale = Math.max(.5, finiteOr(system.heightScale, 1));
    const visualHeight = Math.max(1.2, finiteOr(enemy.height, 3) * heightScale);
    const centerY = visualHeight * .50;
    // The model stays unchanged. Physics uses this invisible upright capsule radius.
    const capsuleRadius = Math.max(.62, finiteOr(enemy.radius, 1) * heightScale * .82);

    originalParent.remove(root);
    pivot.add(root);
    pivot.position.set(enemy.x, centerY, enemy.z);
    pivot.quaternion.copy(rootFacing);
    root.position.set(0, -centerY, 0);
    root.quaternion.identity();
    root.scale.copy(rootScale);
    for (const marker of markers) marker.visible = false;

    const speed = Math.hypot(finiteOr(launch.velocityX), finiteOr(launch.velocityZ));
    const spin = Math.max(4, finiteOr(launch.spin, 7));
    const body = {
      enemy,
      root,
      pivot,
      originalParent,
      frozen,
      markers,
      markerVisibility,
      rootScale,
      centerY,
      capsuleRadius,
      x:enemy.x,
      z:enemy.z,
      airY:0,
      vx:finiteOr(launch.velocityX),
      vz:finiteOr(launch.velocityZ),
      vy:Math.max(3.5, finiteOr(launch.verticalVelocity, 5.5)),
      angular:new THREE.Vector3(
        (Math.random() * 2 - 1) * spin * .62,
        (Math.random() * 2 - 1) * spin * .38,
        (Math.random() * 2 - 1 || 1) * (spin + speed * .15)
      ),
      age:0,
      settle:0,
      bounces:0,
      originalCollisionScale:enemy.collisionScale,
      originalSeparationScale:enemy.separationScale,
    };

    enemy.collisionScale = .02;
    enemy.separationScale = .02;
    enemy.vx = 0;
    enemy.vz = 0;
    enemy.knockX = 0;
    enemy.knockZ = 0;
    enemy.yOff = 0;
    enemy.vyOff = 0;
    enemy.state = 'idle';
    enemy.stateTime = 0;
    enemy.attack = null;
    enemy.hitDone = false;
    enemy.stunned = Math.max(enemy.stunned || 0, .3);
    system.director?.releaseAllForEnemy?.(enemy);

    rigidBodies.set(enemy, body);
    restoreFrozenPose(body);
    return body;
  }

  function removeRigidContainer(body) {
    if (!body) return;
    const { pivot, originalParent } = body;
    if (pivot?.parent) pivot.parent.remove(pivot);
    else if (originalParent && pivot) originalParent.remove(pivot);
    rigidBodies.delete(body.enemy);
  }

  function recoverRigidBody(body, { immediate = false } = {}) {
    if (!body || !rigidBodies.has(body.enemy)) return;
    const enemy = body.enemy;
    const root = body.root;

    if (!root?.parent || enemy.hp <= 0) {
      removeRigidContainer(body);
      return;
    }

    body.pivot.remove(root);
    if (body.originalParent) body.originalParent.add(root);
    if (body.pivot.parent) body.pivot.parent.remove(body.pivot);

    for (const item of body.frozen) {
      if (!item.object) continue;
      item.object.position.copy(item.position);
      item.object.quaternion.copy(item.quaternion);
      item.object.scale.copy(item.scale);
      item.object.visible = item.visible;
    }
    for (const marker of body.markers) {
      marker.visible = body.markerVisibility.get(marker) ?? false;
    }

    root.position.set(body.x, 0, body.z);
    root.rotation.set(0, finiteOr(enemy.facingAngle), 0);
    root.scale.copy(body.rootScale);
    root.visible = true;
    enemy.x = body.x;
    enemy.z = body.z;
    enemy.yOff = 0;
    enemy.vyOff = 0;
    enemy.knockX = 0;
    enemy.knockZ = 0;
    enemy.vx = 0;
    enemy.vz = 0;
    enemy.spin = 0;
    enemy.spinVel = 0;
    enemy.squash = 0;
    enemy.squashT = 0;
    enemy.state = 'idle';
    enemy.stateTime = 0;
    enemy.attack = null;
    enemy.hitDone = false;
    enemy.collisionScale = body.originalCollisionScale;
    enemy.separationScale = body.originalSeparationScale;
    if (!immediate) enemy.stunned = Math.max(enemy.stunned || 0, RIGID.recoveryStun);

    rigidBodies.delete(enemy);
  }

  function clearRigidBodies() {
    for (const body of [...rigidBodies.values()]) recoverRigidBody(body, { immediate:true });
    rigidBodies.clear();
  }

  function resolveHorizontal(body, step) {
    const dx = body.vx * step;
    const dz = body.vz * step;
    const desiredX = body.x + dx;
    const desiredZ = body.z + dz;
    let moved = { x:desiredX, z:desiredZ };

    if (navigation?.resolveMovement) {
      moved = navigation.resolveMovement(
        { x:body.x, z:body.z },
        { x:dx, z:dz },
        body.capsuleRadius
      ) || moved;
    } else {
      const rr = Math.hypot(desiredX, desiredZ);
      const limit = Math.max(1, arenaRadius - body.capsuleRadius - 1);
      if (rr > limit) moved = { x:desiredX * limit / rr, z:desiredZ * limit / rr };
    }

    const blockedX = desiredX - finiteOr(moved.x, body.x);
    const blockedZ = desiredZ - finiteOr(moved.z, body.z);
    const blocked = Math.hypot(blockedX, blockedZ);
    body.x = finiteOr(moved.x, body.x);
    body.z = finiteOr(moved.z, body.z);

    if (blocked > .008) {
      const nx = blockedX / blocked;
      const nz = blockedZ / blocked;
      const intoWall = body.vx * nx + body.vz * nz;
      if (intoWall > 0) {
        body.vx -= (1 + RIGID.wallRestitution) * intoWall * nx;
        body.vz -= (1 + RIGID.wallRestitution) * intoWall * nz;
      } else {
        body.vx *= -RIGID.wallRestitution;
        body.vz *= -RIGID.wallRestitution;
      }
      body.angular.x += nz * 3.2;
      body.angular.z -= nx * 3.2;
      body.angular.y += (Math.random() * 2 - 1) * 1.8;
      body.bounces++;
      body.settle = 0;
    }
  }

  function rotateRigidBody(body, step) {
    const angularSpeed = body.angular.length();
    if (angularSpeed <= 1e-5) return;
    axis.copy(body.angular).multiplyScalar(1 / angularSpeed);
    deltaQ.setFromAxisAngle(axis, angularSpeed * step);
    body.pivot.quaternion.premultiply(deltaQ).normalize();
  }

  function updateRigidBody(body, dt) {
    const enemy = body.enemy;
    if (!enemy || enemy.hp <= 0 || !body.root?.parent) {
      removeRigidContainer(body);
      return;
    }

    const frameDt = Math.min(.08, Math.max(0, dt));
    const steps = Math.max(1, Math.min(5, Math.ceil(frameDt / (1 / 60))));
    const step = frameDt / steps;

    for (let i = 0; i < steps; i++) {
      body.age += step;
      resolveHorizontal(body, step);

      body.vy -= RIGID.gravity * step;
      body.airY += body.vy * step;
      let grounded = false;
      if (body.airY <= 0) {
        body.airY = 0;
        grounded = true;
        if (body.vy < -1.1) {
          body.vy = -body.vy * RIGID.floorRestitution;
          body.vx *= .86;
          body.vz *= .86;
          body.angular.x += (Math.random() * 2 - 1) * 1.6;
          body.angular.z += (Math.random() * 2 - 1) * 1.6;
          body.bounces++;
          body.settle = 0;
        } else {
          body.vy = 0;
        }
      }

      const horizontalDrag = grounded ? RIGID.groundDrag : RIGID.airDrag;
      const angularDrag = grounded ? RIGID.angularGroundDrag : RIGID.angularAirDrag;
      body.vx *= Math.pow(horizontalDrag, step);
      body.vz *= Math.pow(horizontalDrag, step);
      body.angular.multiplyScalar(Math.pow(angularDrag, step));
      rotateRigidBody(body, step);

      const speed = Math.hypot(body.vx, body.vz);
      if (grounded && body.vy === 0 && speed < RIGID.settleSpeed && body.angular.length() < RIGID.settleAngular) {
        body.settle += step;
      } else {
        body.settle = 0;
      }
    }

    enemy.x = body.x;
    enemy.z = body.z;
    enemy.vx = 0;
    enemy.vz = 0;
    enemy.knockX = 0;
    enemy.knockZ = 0;
    enemy.yOff = 0;
    enemy.vyOff = 0;
    enemy.stunned = Math.max(enemy.stunned || 0, .25);

    restoreFrozenPose(body);
    body.root.position.set(0, -body.centerY, 0);
    body.root.quaternion.identity();
    body.root.scale.copy(body.rootScale);
    body.root.visible = true;
    body.pivot.position.set(body.x, body.centerY + body.airY, body.z);
    body.pivot.updateMatrixWorld(true);

    if (body.settle >= RIGID.settleTime || body.age >= RIGID.maxTime) {
      recoverRigidBody(body);
    }
  }

  function prepareRigidBodiesForBaseUpdate() {
    for (const [enemy, body] of [...rigidBodies]) {
      if (!enemy || enemy.hp <= 0 || !body.root?.parent) {
        removeRigidContainer(body);
        continue;
      }
      repairCorruptEnemy(enemy);
      enemy.x = body.x;
      enemy.z = body.z;
      enemy.vx = 0;
      enemy.vz = 0;
      enemy.knockX = 0;
      enemy.knockZ = 0;
      enemy.yOff = 0;
      enemy.vyOff = 0;
      enemy.state = 'idle';
      enemy.stateTime = 0;
      enemy.attack = null;
      enemy.hitDone = false;
      enemy.stunned = Math.max(enemy.stunned || 0, .3);
      enemy.collisionScale = .02;
      enemy.separationScale = .02;
    }
  }

  system.launchRigidBody = function launchRigidBody(enemy, launch = {}) {
    return !!makeRigidBody(enemy, launch);
  };

  system.isRigidBodyActive = function isRigidBodyActive(enemy) {
    return rigidBodies.has(enemy);
  };

  system.update = function updateWithRigidGoblins(dt, player) {
    for (const enemy of system.enemies) repairCorruptEnemy(enemy);
    prepareRigidBodiesForBaseUpdate();
    baseUpdate(dt, player);
    for (const body of [...rigidBodies.values()]) updateRigidBody(body, dt);
  };

  system.damageEnemy = function damageEnemyWithRigidState(enemy, amount, knock = { x:0, z:0 }, opts = {}) {
    repairCorruptEnemy(enemy);
    const body = rigidBodies.get(enemy);
    const result = baseDamageEnemy(enemy, amount, knock, opts);
    if (!body) return result;

    if (enemy.hp <= 0 || !enemy.root?.parent) {
      removeRigidContainer(body);
      return result;
    }

    // Additional hits transfer their impulse into the capsule rather than being
    // consumed by the suspended upright enemy controller.
    body.vx += finiteOr(knock.x) * .65;
    body.vz += finiteOr(knock.z) * .65;
    body.vy = Math.max(body.vy, 2.8 + Math.hypot(finiteOr(knock.x), finiteOr(knock.z)) * .12);
    body.angular.x += (Math.random() * 2 - 1) * 2.2;
    body.angular.z += (Math.random() * 2 - 1) * 3.4;
    body.settle = 0;
    enemy.knockX = 0;
    enemy.knockZ = 0;
    return result;
  };

  system.reset = function resetWithRigidCleanup() {
    clearRigidBodies();
    return baseReset();
  };

  if (baseStartRoomEncounter) {
    system.startRoomEncounter = function startRoomEncounterWithRigidCleanup(roomId) {
      clearRigidBodies();
      return baseStartRoomEncounter(roomId);
    };
  }

  if (baseClearRoomRuntime) {
    system.clearRoomRuntime = function clearRoomRuntimeWithRigidCleanup() {
      clearRigidBodies();
      return baseClearRoomRuntime();
    };
  }

  Object.defineProperty(system, 'rigidBodyCount', {
    enumerable:true,
    get:() => rigidBodies.size,
  });

  setArenaEnemySource(system);
  return system;
}
