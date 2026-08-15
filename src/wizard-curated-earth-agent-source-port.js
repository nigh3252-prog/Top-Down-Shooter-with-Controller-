/*
 * Curated Earth agent source port.
 *
 * Authoritative source files:
 *   wizard-of-legend-arcana-demo.html
 *   SHA-256: 7c02b4984b2e46a2bdfb04863176b5009b6c55db1d3bfe60c82e9f3c656c9460
 *
 * RNR (Rock N' Roll) and ESA (Earth Stomp Agent) below retain the source
 * constants, spawn geometry, movement equations, hit radii, and lifecycles.
 * The DOM/input/camera-loop shell is intentionally absent. Saturn supplies
 * player/target reads and receives damage/status/movement callbacks.
 */

const TAU = Math.PI * 2;

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) { return value < min ? min : value > max ? max : value; }
function lerp(a, b, t) { return a + (b - a) * t; }
// Source helper: smoothstep ease used for saw pop-in and agent movement.
function ease(t) { return t * t * (3 - 2 * t); }
// Source helper: exponential damp used by the Earth Stomp Agent.
function damp(a, b, rate, dt) { return lerp(a, b, 1 - Math.exp(-rate * dt)); }

function normalizeId(id) {
  const text = String(id || '').trim().toLowerCase().replace(/[ _]+/g, '-');
  if (text === "rock-n'-roll" || text === 'rock-n-roll' || text === 'rocknroll') return 'rock-n-roll';
  if (text === 'earth-stomp-agent' || text === 'earthstompagent') return 'earth-stomp-agent';
  return null;
}

function disposeMaterial(material) {
  if (Array.isArray(material)) material.forEach(disposeMaterial);
  else material?.dispose?.();
}

function disposeObject(object) {
  if (!object) return;
  object.parent?.remove?.(object);
  object.traverse?.(child => {
    child.geometry?.dispose?.();
    disposeMaterial(child.material);
  });
}

function targetPosition(raw) {
  const value = raw?.pos || raw?.position || raw?.transform?.position || raw;
  return {
    x: number(value?.x, 0),
    z: number(value?.z ?? value?.y, 0),
  };
}

function targetRadius(raw, fallback = 0.45) {
  return Math.max(0.01, number(raw?.radius ?? raw?.collisionRadius ?? raw?.r, fallback));
}

function targetAlive(raw) {
  if (!raw) return false;
  if (raw.alive === false || raw.dead === true || raw.destroyed === true) return false;
  return true;
}

function directionFrom(value, fallback = { x: 0, z: 1 }) {
  const x = number(value?.x ?? value?.forwardX ?? value?.dx, fallback.x);
  const z = number(value?.z ?? value?.forwardZ ?? value?.dz, fallback.z);
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

function playerFrame(getPlayer, context = {}) {
  const player = context.player || getPlayer?.() || {};
  const pos = player.pos || player.position || player;
  const x = number(context.x ?? pos?.x, 0);
  const z = number(context.z ?? (pos?.z ?? pos?.y), 0);
  const explicit = context.direction || context.forward || player.forward || player.face ||
    (Number.isFinite(Number(player.forwardX)) || Number.isFinite(Number(player.forwardZ)) ? player : null);
  let forward;
  if (explicit) forward = directionFrom(explicit);
  else if (Number.isFinite(Number(context.facing ?? player.facing))) {
    const facing = number(context.facing ?? player.facing, 0);
    // Authoritative demo convention: facing 0 points along +z.
    forward = { x: Math.sin(facing), z: Math.cos(facing) };
  } else forward = { x: 0, z: 1 };
  const facing = Math.atan2(forward.x, forward.z);
  return { player, x, z, forward, facing };
}

function makeFallbackGeometry(THREE) {
  return THREE.BufferGeometry ? new THREE.BufferGeometry() : { dispose() {} };
}

function makeBasicMaterial(THREE, options) {
  const Material = THREE.MeshBasicMaterial || THREE.MeshLambertMaterial;
  return new Material(options);
}

export const ROCK_N_ROLL_TUNING = freezeDeep({
  windup: 0.16,
  base: {
    count: 2,
    spread: 1.75,
    splay: 0.13,
    speed: 13.2,
    range: 12.0,
    radius: 0.78,
    damage: 4,
    tick: 0.17,
    knock: 4.5,
    cooldown: 1.15,
  },
  charged: {
    count: 5,
    spread: 1.35,
    splay: 0.05,
    speed: 11.4,
    range: 14.5,
    radius: 0.95,
    damage: 5,
    tick: 0.14,
    knock: 6.5,
    cooldown: 2.1,
  },
  chargeTime: 0.95,
});

export const EARTH_STOMP_AGENT_TUNING = freezeDeep({
  lifetime: 10.0,
  stompPeriod: 1.1,
  damage: 15,
  radius: 3.3,
  knock: 13,
  cooldown: 15.0,
  leapUp: 0.40,
  leapDown: 0.17,
  windup: 0.13,
  follow: 3.0,
  leash: 11.0,
  seek: 9.5,
});

export const WIZARD_CURATED_EARTH_AGENT_TUNING = freezeDeep({
  rockNRoll: ROCK_N_ROLL_TUNING,
  earthStompAgent: EARTH_STOMP_AGENT_TUNING,
  arenaHalfExtent: 30,
});

export function createWizardCuratedEarthAgentSourcePort(options = {}) {
  const {
    THREE,
    scene: worldScene,
    parent = null,
    camera: worldCamera = null,
    getTargets = () => [],
    getPlayer = () => ({ x: 0, z: 0, facing: 0 }),
    onDamage = null,
    onStatus = null,
    onMoveTarget = null,
    startDashMotion = null,
    callbacks = {},
    random: randomOption = Math.random,
    size: optionSize = 1,
    arenaBounds = null,
    bounds = null,
  } = options;

  if (!THREE || !worldScene) throw new Error('Wizard curated Earth agent source port requires THREE and scene.');

  const root = new THREE.Group();
  root.name = 'Wizard curated Earth agent source port';
  (parent || worldScene).add(root);
  const sourceScene = root;
  const sourceCamera = worldCamera || (THREE.PerspectiveCamera ? new THREE.PerspectiveCamera(46, 1, 0.1, 160) : null);
  const sourceSize = Math.max(0.001, number(optionSize, 1));
  if (root.scale?.setScalar) root.scale.setScalar(sourceSize);
  const random = typeof randomOption === 'function' ? randomOption : Math.random;
  const callbacksNow = {
    onDamage: callbacks.onDamage || onDamage,
    onStatus: callbacks.onStatus || onStatus,
    onMoveTarget: callbacks.onMoveTarget || onMoveTarget,
  };
  const halfArena = number(arenaBounds?.halfExtent ?? bounds?.halfExtent, 30);
  const minX = number(arenaBounds?.minX ?? bounds?.minX, -halfArena + 1);
  const maxX = number(arenaBounds?.maxX ?? bounds?.maxX, halfArena - 1);
  const minZ = number(arenaBounds?.minZ ?? bounds?.minZ, -halfArena + 1);
  const maxZ = number(arenaBounds?.maxZ ?? bounds?.maxZ, halfArena - 1);

  const saws = [];
  const agents = [];
  const rings = [];
  const debris = [];
  const sparks = [];
  const decals = [];
  const targetByRef = new Map();
  const targetById = new Map();
  let nextTargetNumber = 1;
  let now = 0;
  let castSerial = 0;
  let cameraShake = 0;
  let chargeAmount = 0;
  let disposed = false;

  const chargeRig = makeChargeRig();
  sourceScene.add(chargeRig.group);

  function invokeCallback(name, raw, event, legacyArgs = []) {
    const callback = callbacksNow[name];
    if (typeof callback !== 'function') return;
    // Existing Saturn source ports use (target, amount, meta); one-argument
    // consumers receive the richer event object without adapter plumbing.
    if (callback.length >= 2) callback(raw, ...legacyArgs, event);
    else callback({ ...event, target: raw, enemy: raw });
  }

  function targetId(raw, index) {
    const explicit = raw?.stableId ?? raw?.__abilityCaptureDummyId ?? raw?.id ?? raw?.spawnId ?? raw?.captureId;
    if (explicit !== undefined && explicit !== null) return String(explicit);
    return `target-${index + 1}`;
  }

  function syncTargets() {
    const list = Array.isArray(getTargets?.()) ? getTargets() : [];
    const seen = new Set();
    for (let index = 0; index < list.length; index += 1) {
      const raw = list[index];
      if (!raw) continue;
      const id = targetId(raw, index);
      let target = targetByRef.get(raw) || targetById.get(id);
      if (!target) {
        target = {
          id,
          raw,
          pos: new THREE.Vector2(),
          radius: targetRadius(raw),
          alive: targetAlive(raw),
        };
        targetByRef.set(raw, target);
        targetById.set(id, target);
      }
      target.raw = raw;
      const point = targetPosition(raw);
      target.pos.set(point.x, point.z);
      target.radius = targetRadius(raw, target.radius);
      target.alive = targetAlive(raw);
      seen.add(target);
    }
    for (const target of targetById.values()) {
      if (!seen.has(target) && target.raw && !targetAlive(target.raw)) target.alive = false;
    }
    return [...targetById.values()].filter(target => target.raw && target.alive);
  }

  function liveTargets() { return syncTargets(); }

  function targetStillAlive(target) {
    if (!target?.raw) return false;
    target.alive = targetAlive(target.raw);
    return target.alive;
  }

  function emitDamage(target, damageAmount, detail = {}) {
    const point = detail.position || { x: target.pos.x, z: target.pos.y };
    const event = {
      arcanaId: detail.arcanaId || detail.sourceId || 'EARTH',
      source: detail.source || 'wizard-curated-earth-agent',
      damage: damageAmount,
      amount: damageAmount,
      kind: detail.kind || 'hit',
      position: { x: number(point.x), z: number(point.z ?? point.y) },
      direction: detail.direction ? { x: detail.direction.x, z: detail.direction.z } : undefined,
      knockback: detail.knockback,
      charged: Boolean(detail.charged),
      stableId: target.id,
    };
    invokeCallback('onDamage', target.raw, event, [damageAmount]);
  }

  function emitMove(target, delta, detail = {}) {
    const event = {
      arcanaId: detail.arcanaId || 'EARTH',
      source: detail.source || 'wizard-curated-earth-agent',
      position: { x: target.pos.x, z: target.pos.y },
      delta: { x: delta.x, z: delta.z },
      force: detail.force,
      direction: detail.direction ? { x: detail.direction.x, z: detail.direction.z } : undefined,
      reason: detail.reason || 'knockback',
      stableId: target.id,
    };
    invokeCallback('onMoveTarget', target.raw, event, [{ x: delta.x, z: delta.z }]);
  }

  function radialKnockback(target, fromX, fromZ, force, detail = {}) {
    const dx = target.pos.x - fromX;
    const dz = target.pos.y - fromZ;
    const length = Math.hypot(dx, dz) || 1;
    const direction = { x: dx / length, z: dz / length };
    const delta = { x: direction.x * force, z: direction.z * force };
    emitMove(target, delta, { ...detail, direction, force });
  }

  function addRing(x, z, from, to, life, color = 0xd6c6a6, opacity = 0.6) {
    const geometry = THREE.RingGeometry ? new THREE.RingGeometry(0.72, 1, 40) : makeFallbackGeometry(THREE);
    const material = makeBasicMaterial(THREE, { color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.07, z);
    mesh.scale.setScalar(from);
    sourceScene.add(mesh);
    rings.push({ mesh, age: 0, life, from, to, opacity });
  }

  function addDebris(x, y, z, vx, vy, vz, size, life) {
    const geometry = THREE.IcosahedronGeometry ? new THREE.IcosahedronGeometry(0.14, 0) : makeFallbackGeometry(THREE);
    const material = new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({
      color: [0xa47c48, 0x8a6739, 0x6b5330, 0x4a3c26][Math.floor(random() * 4)], flatShading: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(size);
    mesh.rotation.set(random() * TAU, random() * TAU, random() * TAU);
    sourceScene.add(mesh);
    debris.push({ mesh, vx, vy, vz, age: 0, life: life || 0.85, size, rx: -14 + random() * 28, ry: -14 + random() * 28 });
  }

  function addSpark(x, y, z, size, life = 0.24) {
    const geometry = THREE.PlaneGeometry ? new THREE.PlaneGeometry(1, 1) : makeFallbackGeometry(THREE);
    const material = makeBasicMaterial(THREE, { color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(size, size, 1);
    if (sourceCamera && mesh.lookAt) mesh.lookAt(sourceCamera.position);
    sourceScene.add(mesh);
    sparks.push({ mesh, age: 0, life, size });
  }

  function addDecal(x, z, sx, sz, rot, opacity, hold, fade, color = 0x30291f) {
    const geometry = THREE.PlaneGeometry ? new THREE.PlaneGeometry(1, 1) : makeFallbackGeometry(THREE);
    const material = makeBasicMaterial(THREE, { color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.021, z);
    mesh.rotation.z = rot || 0;
    mesh.scale.set(sx, sz, 1);
    sourceScene.add(mesh);
    decals.push({ mesh, age: 0, hold, fade, opacity });
  }

  function makeBar(width, color) {
    const group = new THREE.Group();
    const background = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.11), makeBasicMaterial(THREE, { color: 0x140f0c, transparent: true, opacity: 0.85, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.11), makeBasicMaterial(THREE, { color, transparent: true, opacity: 1, depthWrite: false }));
    background.rotation.x = fill.rotation.x = -Math.PI / 2;
    background.position.y = 0.05; fill.position.y = 0.06;
    group.add(background, fill);
    group.userData = { fill, width };
    return group;
  }

  function setBar(bar, fraction) {
    const value = clamp(fraction, 0, 1);
    const fill = bar?.userData?.fill;
    if (!fill) return;
    fill.scale.x = Math.max(0.0001, value);
    fill.position.x = -bar.userData.width * (1 - value) / 2;
  }

  // Source makeSawMesh(radius), including the ten alternating rim teeth,
  // nine rocky wheel lumps, and eight-lump ground churn collar.
  function makeSawMesh(radius) {
    const rootMesh = new THREE.Group();
    const axle = new THREE.Group();
    axle.rotation.z = Math.PI / 2;
    const wheel = new THREE.Group();
    axle.add(wheel); rootMesh.add(axle);
    const light = new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0xc79a58, flatShading: true });
    const mid = new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0xa87c44, flatShading: true });
    const dark = new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0x7d5c33, flatShading: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, radius * 0.86, 9, 1), mid);
    wheel.add(body);
    const toothGeometry = new THREE.ConeGeometry(radius * 0.3, radius * 0.72, 4);
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU;
      const tooth = new THREE.Mesh(toothGeometry, i % 2 ? light : dark);
      tooth.position.set(Math.cos(angle) * radius * 0.95, (-0.2 + random() * 0.4) * radius, Math.sin(angle) * radius * 0.95);
      tooth.rotation.z = -angle - Math.PI / 2;
      tooth.rotation.y = -0.45 + random() * 0.9;
      tooth.scale.setScalar(0.85 + random() * 0.45);
      wheel.add(tooth);
    }
    for (let b = 0; b < 9; b += 1) {
      const angle = random() * TAU;
      const radial = 0.35 + random() * 0.60;
      const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * (0.22 + random() * 0.18), 0), b % 3 === 0 ? light : b % 3 === 1 ? mid : dark);
      lump.position.set(Math.cos(angle) * radius * radial, (-0.48 + random() * 0.96) * radius, Math.sin(angle) * radius * radial);
      lump.rotation.set(random() * TAU, random() * TAU, random() * TAU);
      wheel.add(lump);
    }
    const collar = new THREE.Group();
    for (let c = 0; c < 8; c += 1) {
      const angle = (c / 8) * TAU;
      const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * (0.16 + random() * 0.14), 0), c % 2 ? mid : dark);
      lump.position.set(Math.cos(angle) * radius * 1.15, -radius * 0.42, Math.sin(angle) * radius * (0.6 + random() * 0.3));
      lump.rotation.set(random() * TAU, random() * TAU, random() * TAU);
      collar.add(lump);
    }
    rootMesh.add(collar);
    rootMesh.userData = { wheel, collar };
    rootMesh.name = 'rock-n-roll-saw';
    return rootMesh;
  }

  // Source charge tell: a flat white ring of 22 randomized spikes.
  function makeChargeRig() {
    const group = new THREE.Group();
    const material = makeBasicMaterial(THREE, { color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX?.(-Math.PI / 2);
    const spikes = [];
    for (let i = 0; i < 22; i += 1) {
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
      spikes.push({ mesh, angle: (i / 22) * TAU + (-0.09 + random() * 0.18), length: 0.45 + random() * 0.55, width: 0.055 + random() * 0.06, phase: random() * TAU });
    }
    group.position.y = 0.09;
    group.visible = false;
    return { group, material, spikes };
  }

  function updateChargeRig(amount, frame) {
    if (amount <= 0.001) { chargeRig.group.visible = false; return; }
    chargeRig.group.visible = true;
    chargeRig.group.position.x = frame.x;
    chargeRig.group.position.z = frame.z;
    const full = amount >= 1;
    const scale = 1.0 + amount * 3.1 + (full ? Math.sin(now * 22) * 0.2 : 0);
    for (const spike of chargeRig.spikes) {
      const flicker = 0.45 + 0.55 * Math.abs(Math.sin(now * 33 + spike.phase));
      const length = scale * spike.length * flicker;
      spike.mesh.scale.set(spike.width, 1, length);
      spike.mesh.rotation.y = spike.angle;
      spike.mesh.position.set(Math.sin(spike.angle) * length * 0.5, 0, Math.cos(spike.angle) * length * 0.5);
    }
    chargeRig.material.opacity = full ? 0.98 : 0.5 + 0.45 * amount;
  }

  function spawnRockNRoll(charged, context = {}) {
    const config = charged ? ROCK_N_ROLL_TUNING.charged : ROCK_N_ROLL_TUNING.base;
    const frame = playerFrame(getPlayer, context);
    const dir = new THREE.Vector2(frame.forward.x, frame.forward.z);
    const side = new THREE.Vector2(dir.y, -dir.x);
    cameraShake = Math.max(cameraShake, charged ? 0.6 : 0.22);
    const puffs = charged ? 22 : 12;
    addRing(frame.x, frame.z, 0.3, charged ? 3.4 : 2.1, 0.36, 0xbb9a63, 0.55);
    for (let p = 0; p < puffs; p += 1) {
      const angle = random() * TAU;
      addDebris(frame.x, 0.3, frame.z,
        Math.cos(angle) * (1 + random() * 3.5), 2.5 + random() * 4,
        Math.sin(angle) * (1 + random() * 3.5), 0.4 + random() * 0.6, 0.5 + random() * 0.35);
    }
    for (let i = 0; i < config.count; i += 1) {
      const t = config.count === 1 ? 0 : i / (config.count - 1) - 0.5;
      const lateral = t * config.spread * (config.count - 1);
      const mesh = makeSawMesh(config.radius);
      const sx = frame.x + side.x * lateral + dir.x * 0.4;
      const sz = frame.z + side.y * lateral + dir.y * 0.4;
      mesh.position.set(sx, config.radius * 0.52, sz);
      mesh.rotation.y = frame.facing;
      mesh.scale.setScalar(0.05);
      sourceScene.add(mesh);
      saws.push({
        id: `${++castSerial}:saw:${i + 1}`,
        mesh, cfg: config,
        pos: new THREE.Vector2(sx, sz),
        dir: new THREE.Vector2(dir.x, dir.y),
        side: new THREE.Vector2(side.x, side.y),
        splay: Math.abs(t) > 0.001 ? Math.sign(t) * config.splay : 0,
        travelled: 0, birth: 0, life: config.range / config.speed,
        trailT: 0, hits: new Map(), radius: config.radius, charged,
      });
    }
  }

  function updateSaws(dt) {
    for (let i = saws.length - 1; i >= 0; i -= 1) {
      const saw = saws[i];
      saw.birth += dt;
      const config = saw.cfg;
      const grow = Math.min(1, saw.birth / 0.13);
      saw.mesh.scale.setScalar(0.05 + 0.95 * ease(grow));
      const velocity = config.speed * (0.35 + 0.65 * ease(Math.min(1, saw.birth / 0.16)));
      saw.dir.x += saw.side.x * saw.splay * dt;
      saw.dir.y += saw.side.y * saw.splay * dt;
      const directionLength = Math.hypot(saw.dir.x, saw.dir.y) || 1;
      saw.dir.x /= directionLength; saw.dir.y /= directionLength;
      saw.pos.x += saw.dir.x * velocity * dt;
      saw.pos.y += saw.dir.y * velocity * dt;
      saw.travelled += velocity * dt;
      saw.mesh.position.set(saw.pos.x, config.radius * 0.58 + Math.sin(saw.birth * 26) * 0.05, saw.pos.y);
      saw.mesh.rotation.y = Math.atan2(saw.dir.x, saw.dir.y);
      saw.mesh.userData.wheel.rotation.y -= (velocity / config.radius) * dt;
      saw.mesh.userData.collar.rotation.y += 5.5 * dt;
      saw.trailT -= dt;
      if (saw.trailT <= 0) {
        saw.trailT = 0.075;
        addDecal(saw.pos.x + (-0.12 + random() * 0.24), saw.pos.y + (-0.12 + random() * 0.24), config.radius * (2.6 + random() * 0.7), config.radius * (2.1 + random() * 0.6), random() * TAU, 0.35, 1.25, 0.35);
        for (let p = 0; p < 2; p += 1) addDebris(saw.pos.x, 0.35, saw.pos.y,
          -saw.dir.x * (1 + random() * 3) + (-2 + random() * 4), 1.5 + random() * 3,
          -saw.dir.y * (1 + random() * 3) + (-2 + random() * 4), 0.3 + random() * 0.4, 0.35 + random() * 0.25);
      }
      for (const target of liveTargets()) {
        if (!targetStillAlive(target)) continue;
        const dx = target.pos.x - saw.pos.x;
        const dz = target.pos.y - saw.pos.y;
        if (dx * dx + dz * dz < (config.radius + target.radius) ** 2) {
          const last = saw.hits.get(target) ?? -99;
          if (now - last >= config.tick) {
            saw.hits.set(target, now);
            const pushOrigin = { x: saw.pos.x - saw.dir.x, z: saw.pos.y - saw.dir.y };
            const pushLength = Math.hypot(target.pos.x - pushOrigin.x, target.pos.y - pushOrigin.z) || 1;
            const pushDirection = { x: (target.pos.x - pushOrigin.x) / pushLength, z: (target.pos.y - pushOrigin.z) / pushLength };
            emitDamage(target, config.damage, { arcanaId: 'ROCK-N-ROLL', source: 'wizard-curated-earth-agent', kind: 'saw-tick', position: { x: saw.pos.x, z: saw.pos.y }, direction: pushDirection, knockback: config.knock, charged: saw.charged });
            emitMove(target, { x: pushDirection.x * config.knock, z: pushDirection.z * config.knock }, { arcanaId: 'ROCK-N-ROLL', source: 'wizard-curated-earth-agent', direction: pushDirection, force: config.knock, reason: 'saw-knockback' });
            addSpark(target.pos.x, 0.9, target.pos.y, 1.2, 0.18);
            cameraShake = Math.max(cameraShake, 0.12);
          }
        }
      }
      const out = saw.pos.x < minX || saw.pos.x > maxX || saw.pos.y < minZ || saw.pos.y > maxZ;
      if (saw.travelled >= config.range || out) {
        for (let q = 0; q < 9; q += 1) {
          const angle = random() * TAU;
          addDebris(saw.pos.x, config.radius * 0.5, saw.pos.y,
            Math.cos(angle) * (1 + random() * 4) + saw.dir.x * 2, 2 + random() * 3.5,
            Math.sin(angle) * (1 + random() * 4) + saw.dir.y * 2, 0.5 + random() * 0.5, 0.5 + random() * 0.4);
        }
        addRing(saw.pos.x, saw.pos.y, 0.3, 1.8, 0.3, 0xbb9a63, 0.4);
        disposeObject(saw.mesh);
        saws.splice(i, 1);
      }
    }
  }

  // Source makeAgentMesh(): olive sphere, glow decal, and ten tan shards.
  function makeAgentMesh() {
    const rootMesh = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0x9dbe27, emissive: 0x4d6b0c, flatShading: true }));
    rootMesh.add(core);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makeBasicMaterial(THREE, { color: 0xc4e64a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    glow.scale.set(1.5, 1.5, 1); rootMesh.add(glow);
    const ring = new THREE.Group();
    const shardGeometry = new THREE.ConeGeometry(0.09, 0.5, 4);
    const material1 = new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0xc79a58, flatShading: true });
    const material2 = new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0x9a7440, flatShading: true });
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU;
      const shard = new THREE.Mesh(shardGeometry, i % 2 ? material1 : material2);
      shard.position.set(Math.cos(angle) * 0.42, -0.09 + random() * 0.18, Math.sin(angle) * 0.42);
      shard.rotation.z = -angle - Math.PI / 2;
      shard.rotation.y = -0.3 + random() * 0.6;
      shard.scale.setScalar(0.85 + random() * 0.35);
      ring.add(shard);
    }
    rootMesh.add(ring);
    rootMesh.userData = { ring, core, glow };
    rootMesh.name = 'earth-stomp-agent';
    return rootMesh;
  }

  function spawnEarthStompAgent(context = {}) {
    const frame = playerFrame(getPlayer, context);
    // Source side = (cos(facing), -sin(facing)); facing vector = (sin, cos).
    const side = new THREE.Vector2(Math.cos(frame.facing), -Math.sin(frame.facing));
    const sx = frame.x + side.x * 1.15 + Math.sin(frame.facing) * 0.5;
    const sz = frame.z + side.y * 1.15 + Math.cos(frame.facing) * 0.5;
    const mesh = makeAgentMesh();
    mesh.position.set(sx, 0.8, sz); mesh.scale.setScalar(0.05); sourceScene.add(mesh);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makeBasicMaterial(THREE, { color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    shadow.rotation.x = -Math.PI / 2; shadow.scale.setScalar(1); shadow.position.set(sx, 0.03, sz); sourceScene.add(shadow);
    const bar = makeBar(0.6, 0xd23c3c); sourceScene.add(bar);
    addRing(sx, sz, 0.2, 2.0, 0.36, 0xc0a068, 0.6);
    for (let i = 0; i < 14; i += 1) {
      const angle = random() * TAU;
      addDebris(sx, 0.4, sz, Math.cos(angle) * (1.5 + random() * 3.5), 3 + random() * 4, Math.sin(angle) * (1.5 + random() * 3.5), 0.5 + random() * 0.5, 0.5 + random() * 0.4);
    }
    addSpark(sx, 0.8, sz, 2.4, 0.3);
    agents.push({
      id: `${++castSerial}:agent`, mesh, shadow, bar,
      pos: new THREE.Vector3(sx, 0.8, sz),
      vel: new THREE.Vector2(),
      age: 0, life: EARTH_STOMP_AGENT_TUNING.lifetime,
      hp: 40, maxHp: 40, state: 'idle', st: 0,
      target: null, from: new THREE.Vector3(), to: new THREE.Vector3(),
      cd: EARTH_STOMP_AGENT_TUNING.stompPeriod * 0.55,
      bob: random() * TAU, flare: 0,
    });
  }

  function nearestTarget(x, z, maxDistance) {
    let best = null;
    let bestDistance = maxDistance * maxDistance;
    for (const target of liveTargets()) {
      if (!targetStillAlive(target)) continue;
      const dx = target.pos.x - x; const dz = target.pos.y - z;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) { bestDistance = distance; best = target; }
    }
    return best;
  }

  function agentStomp(agent, x, z) {
    const spec = EARTH_STOMP_AGENT_TUNING;
    addDecal(x, z, spec.radius * 2.1, spec.radius * 2.1, random() * TAU, 0.82, 1.7, 1.4, 0x4a3827);
    addRing(x, z, 0.4, spec.radius * 1.35, 0.42, 0xd8c49a, 0.72);
    addRing(x, z, 0.2, spec.radius * 0.85, 0.28, 0xffffff, 0.42);
    addSpark(x, 0.5, z, 3.4, 0.26);
    for (let i = 0; i < 16; i += 1) {
      const angle = random() * TAU; const speed = 2.5 + random() * 5.5;
      addDebris(x, 0.25, z, Math.cos(angle) * speed, 3.5 + random() * 5, Math.sin(angle) * speed, 0.55 + random() * 0.7, 0.6 + random() * 0.4);
    }
    const radiusSquared = spec.radius * spec.radius;
    for (const target of liveTargets()) {
      if (!targetStillAlive(target)) continue;
      const dx = target.pos.x - x; const dz = target.pos.y - z;
      if (dx * dx + dz * dz <= radiusSquared) {
        const length = Math.hypot(dx, dz) || 1;
        const direction = { x: dx / length, z: dz / length };
        emitDamage(target, spec.damage, { arcanaId: 'EARTH-STOMP-AGENT', source: 'wizard-curated-earth-agent', kind: 'stomp', position: { x, z }, direction, knockback: spec.knock });
        emitMove(target, { x: direction.x * spec.knock, z: direction.z * spec.knock }, { arcanaId: 'EARTH-STOMP-AGENT', source: 'wizard-curated-earth-agent', direction, force: spec.knock, reason: 'stomp-knockback' });
      }
    }
    cameraShake = Math.max(cameraShake, 0.85);
  }

  function updateAgents(dt) {
    const spec = EARTH_STOMP_AGENT_TUNING;
    for (let i = agents.length - 1; i >= 0; i -= 1) {
      const agent = agents[i];
      agent.age += dt; agent.st += dt; agent.bob += dt * 4.4;
      if (agent.mesh.scale.x < 1) agent.mesh.scale.setScalar(Math.min(1, agent.mesh.scale.x + dt * 6));
      if (agent.age >= agent.life) {
        for (let q = 0; q < 10; q += 1) {
          const angle = random() * TAU;
          addDebris(agent.pos.x, agent.pos.y, agent.pos.z, Math.cos(angle) * (1 + random() * 3), 1 + random() * 3, Math.sin(angle) * (1 + random() * 3), 0.4 + random() * 0.5, 0.5 + random() * 0.4);
        }
        addRing(agent.pos.x, agent.pos.z, 0.2, 1.6, 0.3, 0xa8c22e, 0.5);
        disposeObject(agent.mesh); disposeObject(agent.shadow); disposeObject(agent.bar);
        agents.splice(i, 1); continue;
      }
      const frame = playerFrame(getPlayer);
      if (agent.state === 'idle') {
        const toPx = frame.x - agent.pos.x; const toPz = frame.z - agent.pos.z;
        const distance = Math.hypot(toPx, toPz);
        if (distance > spec.leash) {
          agent.pos.x = frame.x - toPx / distance * 2;
          agent.pos.z = frame.z - toPz / distance * 2;
          addSpark(agent.pos.x, 0.9, agent.pos.z, 1.8, 0.2);
        } else if (distance > spec.follow) {
          agent.pos.x += (toPx / distance) * 5.2 * dt;
          agent.pos.z += (toPz / distance) * 5.2 * dt;
        }
        agent.pos.y = damp(agent.pos.y, 0.8 + Math.sin(agent.bob) * 0.11, 8, dt);
        agent.flare = damp(agent.flare, 0, 8, dt);
        agent.cd -= dt;
        if (agent.cd <= 0) {
          const target = nearestTarget(agent.pos.x, agent.pos.z, spec.seek);
          if (target) { agent.target = target; agent.state = 'windup'; agent.st = 0; }
          else agent.cd = 0.25;
        }
      } else if (agent.state === 'windup') {
        agent.pos.y = damp(agent.pos.y, 0.42, 16, dt);
        agent.flare = damp(agent.flare, 0.25, 12, dt);
        if (agent.st >= spec.windup) {
          agent.state = 'rise'; agent.st = 0;
          agent.from.set(agent.pos.x, agent.pos.y, agent.pos.z);
          const point = agent.target?.pos || { x: agent.pos.x, y: agent.pos.z };
          agent.to.set(point.x, 0, point.y);
        }
      } else if (agent.state === 'rise') {
        const progress = Math.min(1, agent.st / spec.leapUp);
        if (targetStillAlive(agent.target)) agent.to.set(agent.target.pos.x, 0, agent.target.pos.y);
        agent.pos.x = lerp(agent.from.x, agent.to.x, ease(progress));
        agent.pos.z = lerp(agent.from.z, agent.to.z, ease(progress));
        agent.pos.y = lerp(agent.from.y, 4.6, Math.sin(progress * Math.PI * 0.5));
        agent.flare = damp(agent.flare, 1, 14, dt);
        if (progress >= 1) { agent.state = 'slam'; agent.st = 0; agent.from.copy(agent.pos); }
      } else if (agent.state === 'slam') {
        const progress = Math.min(1, agent.st / spec.leapDown);
        if (targetStillAlive(agent.target)) agent.to.set(agent.target.pos.x, 0, agent.target.pos.y);
        agent.pos.x = lerp(agent.from.x, agent.to.x, progress);
        agent.pos.z = lerp(agent.from.z, agent.to.z, progress);
        agent.pos.y = lerp(agent.from.y, 0.34, progress * progress);
        if (progress >= 1) { agentStomp(agent, agent.pos.x, agent.pos.z); agent.state = 'recover'; agent.st = 0; agent.cd = spec.stompPeriod; }
      } else if (agent.state === 'recover') {
        agent.pos.y = damp(agent.pos.y, 0.8, 9, dt);
        agent.flare = damp(agent.flare, 0, 10, dt);
        if (agent.st > 0.22) { agent.state = 'idle'; agent.st = 0; }
      }
      agent.pos.x = clamp(agent.pos.x, minX, maxX);
      agent.pos.z = clamp(agent.pos.z, minZ, maxZ);
      agent.mesh.position.copy(agent.pos);
      const ring = agent.mesh.userData.ring;
      ring.scale.setScalar(1 + agent.flare * 0.85);
      ring.rotation.y += (2.2 + agent.flare * 22) * dt;
      ring.children.forEach(child => { child.rotation.y += dt * (1 + agent.flare * 8); });
      const glow = agent.mesh.userData.glow;
      if (sourceCamera && glow.lookAt) glow.lookAt(sourceCamera.position);
      if (glow.material) glow.material.opacity = 0.28 + agent.flare * 0.4;
      agent.mesh.rotation.y += dt * 1.1;
      const height = clamp(agent.pos.y / 5, 0, 1);
      agent.shadow.position.set(agent.pos.x, 0.03, agent.pos.z);
      agent.shadow.scale.setScalar(1 * (1 - height * 0.55));
      if (agent.shadow.material) agent.shadow.material.opacity = 0.85 * (1 - height * 0.6);
      agent.bar.position.set(agent.pos.x, 0, agent.pos.z + 0.62);
      setBar(agent.bar, 1 - agent.age / agent.life);
      agent.bar.visible = agent.pos.y < 1.6;
    }
  }

  function updateTransient(dt) {
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const ring = rings[i]; ring.age += dt;
      if (ring.age >= ring.life) { disposeObject(ring.mesh); rings.splice(i, 1); continue; }
      const progress = clamp(ring.age / ring.life, 0, 1);
      ring.mesh.scale.setScalar(lerp(ring.from, ring.to, ease(progress)));
      if (ring.mesh.material) ring.mesh.material.opacity = ring.opacity * (1 - progress);
    }
    for (let i = decals.length - 1; i >= 0; i -= 1) {
      const decal = decals[i]; decal.age += dt;
      if (decal.age > decal.hold) {
        const opacity = 1 - (decal.age - decal.hold) / decal.fade;
        if (opacity <= 0) { disposeObject(decal.mesh); decals.splice(i, 1); continue; }
        decal.mesh.material.opacity = decal.opacity * opacity;
      }
    }
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i]; spark.age += dt;
      if (spark.age >= spark.life) { disposeObject(spark.mesh); sparks.splice(i, 1); continue; }
      const progress = spark.age / spark.life;
      spark.mesh.scale.setScalar(spark.size * (0.55 + 0.75 * ease(Math.min(1, progress * 1.7))));
      if (spark.mesh.material) spark.mesh.material.opacity = 1 - progress * progress;
    }
    for (let i = debris.length - 1; i >= 0; i -= 1) {
      const piece = debris[i]; piece.age += dt;
      if (piece.age > piece.life) { disposeObject(piece.mesh); debris.splice(i, 1); continue; }
      piece.vy -= 26 * dt;
      piece.mesh.position.x += piece.vx * dt; piece.mesh.position.y += piece.vy * dt; piece.mesh.position.z += piece.vz * dt;
      if (piece.mesh.position.y < 0.08) { piece.mesh.position.y = 0.08; piece.vy *= -0.32; piece.vx *= 0.55; piece.vz *= 0.55; }
      piece.mesh.rotation.x += piece.rx * dt; piece.mesh.rotation.y += piece.ry * dt;
      const progress = piece.age / piece.life;
      if (progress > 0.7) piece.mesh.scale.setScalar(piece.size * (1 - (progress - 0.7) / 0.3));
    }
  }

  function clearEffects() {
    for (const saw of saws) disposeObject(saw.mesh);
    for (const agent of agents) { disposeObject(agent.mesh); disposeObject(agent.shadow); disposeObject(agent.bar); }
    for (const entry of [...rings, ...decals, ...sparks, ...debris]) disposeObject(entry.mesh);
    saws.length = 0; agents.length = 0; rings.length = 0; decals.length = 0; sparks.length = 0; debris.length = 0;
    chargeRig.group.visible = false; chargeAmount = 0;
  }

  function cast(id, context = {}) {
    if (disposed) return false;
    const arcana = normalizeId(id);
    if (!arcana) return false;
    const hold = number(context.hold ?? context.charge ?? context.chargeDuration, 0);
    if (context.charging && !context.release) {
      chargeAmount = clamp(number(context.chargeAmount ?? hold / ROCK_N_ROLL_TUNING.chargeTime, 0), 0, 1);
      updateChargeRig(chargeAmount, playerFrame(getPlayer, context));
      return true;
    }
    if (arcana === 'rock-n-roll') {
      const charged = context.charged === true || context.enhanced === true || hold >= ROCK_N_ROLL_TUNING.chargeTime;
      spawnRockNRoll(charged, context);
      chargeAmount = 0; updateChargeRig(0, playerFrame(getPlayer, context));
    } else spawnEarthStompAgent(context);
    return true;
  }

  function update(dt = 0) {
    if (disposed) return;
    const delta = Math.max(0, number(dt, 0));
    now += delta;
    cameraShake = Math.max(0, cameraShake - delta);
    syncTargets();
    updateSaws(delta);
    updateAgents(delta);
    updateTransient(delta);
  }

  function reset() {
    clearEffects();
    now = 0; castSerial = 0; cameraShake = 0; disposed = false;
    for (const target of targetById.values()) target.alive = targetAlive(target.raw);
  }

  function dispose() {
    if (disposed) return;
    clearEffects(); disposed = true;
    disposeObject(root);
  }

  function snapshot() {
    return {
      source: 'wizard-of-legend-arcana-demo.html',
      sourceSha256: '7c02b4984b2e46a2bdfb04863176b5009b6c55db1d3bfe60c82e9f3c656c9460',
      tuning: WIZARD_CURATED_EARTH_AGENT_TUNING,
      time: now,
      disposed,
      cameraShake,
      chargeAmount,
      saws: saws.map(saw => ({ id: saw.id, charged: saw.charged, x: saw.pos.x, z: saw.pos.y, birth: saw.birth, travelled: saw.travelled, life: saw.life, radius: saw.radius, hits: [...saw.hits.keys()].map(target => target.id) })),
      agents: agents.map(agent => ({ id: agent.id, x: agent.pos.x, y: agent.pos.y, z: agent.pos.z, age: agent.age, life: agent.life, state: agent.state, st: agent.st, hp: agent.hp, target: agent.target?.id || null })),
      transient: { rings: rings.length, decals: decals.length, sparks: sparks.length, debris: debris.length },
    };
  }

  return { root, cast, update, reset, dispose, snapshot };
}
