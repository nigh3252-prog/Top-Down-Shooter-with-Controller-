import { resolveCircleMovement } from './hex-maze-navigation.js';

const PLAYER_RADIUS = 1.05;
const EPSILON = 1e-6;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const easeOutCubic = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
const smoothPulse = value => Math.sin(Math.PI * clamp(value, 0, 1));

export function createWardenAbilityPrimitives({ THREE } = {}) {
  if (!THREE) throw new Error('[warden-ability-primitives] THREE is required.');

  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const FLOOR_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const worldQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion();
  const forwardV = new THREE.Vector3(0, 0, 1);
  const state = {
    effects:[],
    motions:[],
    actions:[],
    presentation:null,
    hookedPC:null,
    restorePose:null,
  };

  function currentPlayer(api) {
    return { x:api?.actorPos?.x || 0, z:api?.actorPos?.y || 0 };
  }

  function getWorldRoot(api) {
    return api?.enemySystem?.group?.parent || api?.enemySystem?.group || null;
  }

  function forward(api) {
    const root = api?.PC?.combatLayer || api?.PC?.weaponRoot?.parent;
    if (root?.getWorldQuaternion) {
      root.getWorldQuaternion(worldQ);
      forwardV.set(0, 0, 1).applyQuaternion(worldQ);
      forwardV.y = 0;
      if (forwardV.lengthSq() > EPSILON) {
        forwardV.normalize();
        return { x:forwardV.x, z:forwardV.z };
      }
    }
    const committed = Number(api?.combatState?.commitYaw);
    if (Number.isFinite(committed)) return { x:Math.sin(committed), z:Math.cos(committed) };
    return { x:0, z:1 };
  }

  function directionTo(api, target) {
    const player = currentPlayer(api);
    const dx = (target?.x ?? player.x) - player.x;
    const dz = (target?.z ?? player.z) - player.z;
    const length = Math.hypot(dx, dz);
    return length > EPSILON ? { x:dx / length, z:dz / length } : forward(api);
  }

  function livingEnemies(api) {
    return (api?.enemySystem?.enemies || []).filter(enemy => enemy && enemy.hp > 0);
  }

  function targetPoint(enemy) {
    return { x:enemy.x, z:enemy.z };
  }

  function targetsInFront(api, { range = 8, angle = Math.PI / 2, width = 0, maxTargets = Infinity } = {}) {
    const player = currentPlayer(api);
    const facing = forward(api);
    const cosine = Math.cos(angle * .5);
    const targets = [];
    for (const enemy of livingEnemies(api)) {
      const dx = enemy.x - player.x;
      const dz = enemy.z - player.z;
      const distance = Math.hypot(dx, dz);
      if (distance > range + (enemy.radius || 0)) continue;
      const along = dx * facing.x + dz * facing.z;
      const lateral = Math.abs(dx * facing.z - dz * facing.x);
      const inCapsule = width > 0 && along >= -.5 && along <= range && lateral <= width + (enemy.radius || 0);
      const dot = distance > EPSILON ? along / distance : 1;
      if (!inCapsule && dot < cosine) continue;
      targets.push({ enemy, distance, along, lateral, score:distance + lateral * .28 });
    }
    targets.sort((a, b) => a.score - b.score);
    return targets.slice(0, Math.max(0, maxTargets)).map(entry => entry.enemy);
  }

  function targetsInRadius(api, center, radius) {
    return livingEnemies(api).filter(enemy => Math.hypot(enemy.x - center.x, enemy.z - center.z) <= radius + (enemy.radius || 0));
  }

  function nearestInFront(api, options = {}) {
    return targetsInFront(api, { ...options, maxTargets:1 })[0] || null;
  }

  function pointAhead(api, distance) {
    const player = currentPlayer(api);
    const facing = forward(api);
    return { x:player.x + facing.x * distance, z:player.z + facing.z * distance };
  }

  function orientFloor(mesh, direction = { x:0, z:1 }) {
    const yaw = Math.atan2(direction.x, direction.z);
    yawQ.setFromAxisAngle(Y_AXIS, yaw);
    mesh.quaternion.copy(yawQ).multiply(FLOOR_Q);
  }

  function addEffect(api, mesh, spec = {}) {
    const parent = getWorldRoot(api);
    if (!parent?.add || !mesh) return null;
    const origin = spec.origin || currentPlayer(api);
    mesh.position.set(origin.x, spec.height ?? .12, origin.z);
    parent.add(mesh);
    const effect = {
      mesh,
      age:0,
      life:Math.max(.05, spec.life ?? .5),
      scaleFrom:spec.scaleFrom ?? .15,
      scaleTo:spec.scaleTo ?? 1,
      opacity:spec.opacity ?? .86,
      rise:spec.rise ?? 0,
      follow:spec.follow || null,
      spin:spec.spin || 0,
    };
    mesh.scale.setScalar(effect.scaleFrom);
    state.effects.push(effect);
    return effect;
  }

  function material(color, opacity = .86) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent:true,
      opacity,
      blending:THREE.AdditiveBlending,
      depthWrite:false,
      side:THREE.DoubleSide,
    });
  }

  function ring(api, { origin, radius = 5, color = 0xe8c96a, life = .55, follow = null, opacity = .86 } = {}) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 56), material(color, opacity));
    orientFloor(mesh);
    return addEffect(api, mesh, { origin, life, scaleFrom:.12, scaleTo:radius, opacity, follow });
  }

  function disc(api, { origin, radius = 4, color = 0xe8c96a, life = .48, opacity = .32 } = {}) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 48), material(color, opacity));
    orientFloor(mesh);
    return addEffect(api, mesh, { origin, life, scaleFrom:.18, scaleTo:radius, opacity });
  }

  function wedge(api, { origin, direction, range = 7, angle = 1.4, color = 0xffb469, life = .35, opacity = .5 } = {}) {
    const geometry = new THREE.CircleGeometry(1, 42, -angle * .5, angle);
    const mesh = new THREE.Mesh(geometry, material(color, opacity));
    orientFloor(mesh, direction);
    return addEffect(api, mesh, { origin, life, scaleFrom:.18, scaleTo:range, opacity });
  }

  function slash(api, { origin, direction, radius = 5, angle = 2.1, color = 0xffd087, life = .28, opacity = .9 } = {}) {
    const geometry = new THREE.RingGeometry(.58, 1, 54, 1, -angle * .5, angle);
    const mesh = new THREE.Mesh(geometry, material(color, opacity));
    orientFloor(mesh, direction);
    return addEffect(api, mesh, { origin, life, scaleFrom:.25, scaleTo:radius, opacity, spin:.7 });
  }

  function burst(api, { origin, radius = 2.4, color = 0xffc56e, life = .24, opacity = .92 } = {}) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 12), material(color, opacity));
    orientFloor(mesh);
    return addEffect(api, mesh, { origin, life, scaleFrom:.08, scaleTo:radius, opacity, rise:.22 });
  }

  function marker(api, enemy, { radius = 1.8, color = 0xff8b6a, life = .7 } = {}) {
    if (!enemy) return null;
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.78, 1, 42), material(color, .9));
    orientFloor(mesh);
    return addEffect(api, mesh, { origin:targetPoint(enemy), life, scaleFrom:.65, scaleTo:radius, opacity:.9, follow:enemy });
  }

  function tether(api, enemy, { color = 0xff8b6a, life = .55, opacity = .75 } = {}) {
    if (!enemy) return null;
    const player = currentPlayer(api);
    const points = [new THREE.Vector3(player.x, .42, player.z), new THREE.Vector3(enemy.x, .42, enemy.z)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const mesh = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent:true, opacity, depthWrite:false }));
    const parent = getWorldRoot(api);
    if (!parent?.add) return null;
    parent.add(mesh);
    state.effects.push({ mesh, age:0, life, scaleFrom:1, scaleTo:1, opacity, rise:0, followLine:{ api, enemy }, spin:0 });
    return mesh;
  }

  function trail(api, { origin, direction, distance = 5, color = 0xaed9ff } = {}) {
    const count = 5;
    for (let index = 0; index < count; index++) {
      const t = index / Math.max(1, count - 1);
      const point = { x:origin.x + direction.x * distance * t, z:origin.z + direction.z * distance * t };
      disc(api, { origin:point, radius:.75 + t * .45, color, life:.25 + t * .08, opacity:.18 });
    }
  }

  function startMotion(api, { type = 'lunge', direction = null, distance = 0, duration = .2, presentation = type } = {}) {
    const dir = direction || forward(api);
    const length = Math.hypot(dir.x, dir.z) || 1;
    const motion = {
      api,
      type,
      direction:{ x:dir.x / length, z:dir.z / length },
      distance:Math.max(0, distance),
      duration:Math.max(.05, duration),
      age:0,
      progress:0,
    };
    state.motions.push(motion);
    present(presentation, motion.duration * 1.45, { direction:motion.direction });
    return motion;
  }

  function present(type, duration = .35, data = {}) {
    state.presentation = { type, duration:Math.max(.05, duration), age:0, ...data };
  }

  function schedule(delay, action) {
    if (typeof action !== 'function') return;
    state.actions.push({ remaining:Math.max(0, delay), action });
  }

  function collisionSegments(api) {
    return api?.mazeWorld?.getCollisionSegments?.() || [];
  }

  function moveActor(motion, deltaDistance) {
    const api = motion.api;
    const actorPos = api?.actorPos;
    if (!actorPos || deltaDistance <= 0) return;
    const start = { x:actorPos.x, z:actorPos.y };
    const delta = { x:motion.direction.x * deltaDistance, z:motion.direction.z * deltaDistance };
    const moved = resolveCircleMovement(start, delta, PLAYER_RADIUS, collisionSegments(api));
    actorPos.x = moved.x;
    actorPos.y = moved.z;
  }

  function updateMotions(dt) {
    for (let index = state.motions.length - 1; index >= 0; index--) {
      const motion = state.motions[index];
      motion.age += dt;
      const u = clamp(motion.age / motion.duration, 0, 1);
      const progress = easeOutCubic(u);
      const step = (progress - motion.progress) * motion.distance;
      motion.progress = progress;
      moveActor(motion, step);
      if (u >= 1) state.motions.splice(index, 1);
    }
  }

  function updateEffects(dt) {
    for (let index = state.effects.length - 1; index >= 0; index--) {
      const effect = state.effects[index];
      effect.age += dt;
      const u = clamp(effect.age / effect.life, 0, 1);
      if (effect.follow && effect.follow.hp > 0) effect.mesh.position.set(effect.follow.x, effect.mesh.position.y, effect.follow.z);
      if (effect.followLine) {
        const { api, enemy } = effect.followLine;
        if (enemy?.hp > 0) {
          const player = currentPlayer(api);
          const positions = effect.mesh.geometry.attributes.position;
          positions.setXYZ(0, player.x, .42, player.z);
          positions.setXYZ(1, enemy.x, .42, enemy.z);
          positions.needsUpdate = true;
        }
      }
      const scale = effect.scaleFrom + (effect.scaleTo - effect.scaleFrom) * easeOutCubic(u);
      effect.mesh.scale.setScalar(scale);
      effect.mesh.position.y += effect.rise * dt;
      effect.mesh.rotation.z += effect.spin * dt;
      if (effect.mesh.material) effect.mesh.material.opacity = effect.opacity * (1 - u);
      if (u >= 1 || (effect.follow && effect.follow.hp <= 0)) {
        effect.mesh.parent?.remove(effect.mesh);
        effect.mesh.geometry?.dispose?.();
        effect.mesh.material?.dispose?.();
        state.effects.splice(index, 1);
      }
    }
  }

  function updateActions(dt) {
    for (let index = state.actions.length - 1; index >= 0; index--) {
      const item = state.actions[index];
      item.remaining -= dt;
      if (item.remaining > 0) continue;
      state.actions.splice(index, 1);
      try { item.action(); } catch (error) { console.error('[warden-ability-primitives] scheduled action failed', error); }
    }
  }

  function restoreAppliedPose() {
    if (!state.restorePose) return;
    state.restorePose();
    state.restorePose = null;
  }

  function applyPresentationPose(PC) {
    const presentation = state.presentation;
    const layer = PC?.combatLayer;
    const weapon = PC?.weaponRoot;
    if (!presentation || (!layer && !weapon)) return;
    const u = clamp(presentation.age / presentation.duration, 0, 1);
    const k = smoothPulse(u);
    const layerPosition = layer?.position.clone();
    const layerQuaternion = layer?.quaternion.clone();
    const weaponPosition = weapon?.position.clone();
    const weaponQuaternion = weapon?.quaternion.clone();
    state.restorePose = () => {
      if (layer && layerPosition && layerQuaternion) { layer.position.copy(layerPosition); layer.quaternion.copy(layerQuaternion); }
      if (weapon && weaponPosition && weaponQuaternion) { weapon.position.copy(weaponPosition); weapon.quaternion.copy(weaponQuaternion); }
    };

    switch (presentation.type) {
      case 'roll':
        if (layer) { layer.position.y -= .18 * k; layer.rotation.z += .42 * Math.sin(u * Math.PI * 2); }
        break;
      case 'brace':
      case 'challenge':
        if (layer) { layer.rotation.x -= .16 * k; layer.position.z -= .12 * k; }
        if (weapon) weapon.rotation.z += .38 * k;
        break;
      case 'bash':
        if (layer) { layer.rotation.x += .30 * k; layer.position.z += .28 * k; }
        if (weapon) { weapon.position.z += .34 * k; weapon.rotation.x -= .48 * k; }
        break;
      case 'jab':
        if (layer) layer.position.z += .18 * k;
        if (weapon) { weapon.position.z += .52 * k; weapon.rotation.x -= .32 * k; }
        break;
      case 'slam':
        if (layer) { layer.position.y += .36 * Math.sin(Math.PI * u); layer.rotation.x += .34 * k; }
        if (weapon) weapon.rotation.x += 1.05 * k;
        break;
      case 'cast':
        if (layer) { layer.rotation.x -= .20 * k; layer.position.y += .12 * k; }
        if (weapon) { weapon.position.y += .34 * k; weapon.rotation.z += .70 * k; }
        break;
      case 'purge':
        if (layer) { layer.rotation.x -= .10 * k; layer.rotation.z += .16 * Math.sin(u * Math.PI * 2); }
        if (weapon) weapon.rotation.z -= .85 * k;
        break;
      default:
        if (layer) layer.rotation.x += .12 * k;
        break;
    }
  }

  function ensurePoseHook(api) {
    const PC = api?.PC;
    if (!PC?.updateCombat || state.hookedPC === PC) return;
    state.hookedPC = PC;
    const baseUpdate = PC.updateCombat.bind(PC);
    PC.updateCombat = function wardenAbilityPoseUpdate(...args) {
      restoreAppliedPose();
      const result = baseUpdate(...args);
      applyPresentationPose(PC);
      return result;
    };
  }

  function updatePresentation(dt) {
    if (!state.presentation) return;
    state.presentation.age += dt;
    if (state.presentation.age >= state.presentation.duration) state.presentation = null;
  }

  function update(dt, api) {
    if (api) ensurePoseHook(api);
    updateActions(dt);
    updateMotions(dt);
    updateEffects(dt);
    updatePresentation(dt);
  }

  function clear() {
    restoreAppliedPose();
    for (const effect of state.effects) {
      effect.mesh.parent?.remove(effect.mesh);
      effect.mesh.geometry?.dispose?.();
      effect.mesh.material?.dispose?.();
    }
    state.effects.length = 0;
    state.motions.length = 0;
    state.actions.length = 0;
    state.presentation = null;
  }

  return {
    currentPlayer,
    forward,
    directionTo,
    pointAhead,
    targetsInFront,
    targetsInRadius,
    nearestInFront,
    ring,
    disc,
    wedge,
    slash,
    burst,
    marker,
    tether,
    trail,
    startMotion,
    present,
    schedule,
    update,
    clear,
  };
}
