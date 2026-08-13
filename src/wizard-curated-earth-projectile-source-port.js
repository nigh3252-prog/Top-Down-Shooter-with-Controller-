/*
 * Curated Earth projectile source port.
 *
 * Authoritative source files:
 *   archive/wizard-of-legend/curated-demos/wizard-of-legend-earth-arcana-phone-demo.html
 *   SHA-256: 9bd210cd097fa3b711fc8c95fb92720bf4212f2c9271662a3712e858bf1628e2
 *
 * The Knockout Boulder and Toxic Bolas source constants, projectile geometry,
 * launch timing, collision radii, poison/root timings, and charged fan are
 * retained below. Saturn owns the player/target seams through injected reads
 * and callbacks; the standalone DOM/input shell is not part of this module.
 */

const PI = Math.PI;
const TAU = PI * 2;

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
function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }

function normalizeId(id) {
  const text = String(id || '').trim().toLowerCase().replace(/[ _]+/g, '-');
  if (text === 'knockout-boulder' || text === 'knockoutboulder') return 'knockout-boulder';
  if (text === 'toxic-bolas' || text === 'toxicbolas') return 'toxic-bolas';
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
  return { x: number(value?.x, 0), z: number(value?.z ?? value?.y, 0) };
}

function targetRadius(raw, fallback = 0.45) {
  return Math.max(0.01, number(raw?.radius ?? raw?.collisionRadius ?? raw?.r, fallback));
}

function targetAlive(raw) {
  return Boolean(raw) && raw.alive !== false && raw.dead !== true && raw.destroyed !== true;
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
  const explicit = context.direction || context.aimDirection || context.forward || player.forward || player.face ||
    (Number.isFinite(Number(player.forwardX)) || Number.isFinite(Number(player.forwardZ)) ? player : null);
  let forward;
  if (explicit) forward = directionFrom(explicit);
  else if (Number.isFinite(Number(context.facing ?? player.facing))) {
    const facing = number(context.facing ?? player.facing, 0);
    forward = { x: Math.sin(facing), z: Math.cos(facing) };
  } else forward = { x: 0, z: 1 };
  return { player, x, z, forward, facing: Math.atan2(forward.x, forward.z) };
}

function makeBasicMaterial(THREE, options) {
  const Material = THREE.MeshBasicMaterial || THREE.MeshLambertMaterial;
  return new Material(options);
}

export const KNOCKOUT_BOULDER_TUNING = freezeDeep({
  name: 'KNOCKOUT BOULDER', kind: 'STANDARD', cooldown: 5.0,
  windup: 0.13, launch: 0.20,
  speed: 27, range: 16, radius: 0.85, loft: 0.40, spin: 7.5,
  damage: 50, backDamage: 25, knockback: 9.0, stun: 1.0,
  craterLife: 3.0, enhRadius: 3.4, enhDamage: 25,
});

export const TOXIC_BOLAS_TUNING = freezeDeep({
  name: 'TOXIC BOLAS', kind: 'SIGNATURE', cooldown: 6.0,
  speed: 13, range: 12, damage: 35,
  poisonTicks: 5, poisonTick: 5, poisonEvery: 1.0,
  rootTime: 5.0, chargeTime: 1.50,
  charged: { count: 7, arc: PI, damage: 55, pierce: true, poolRadius: 1.55, poolLife: 12.0, poolTick: 5, poolEvery: 0.5 },
});

export const WIZARD_CURATED_EARTH_PROJECTILE_TUNING = freezeDeep({
  player: { speed: 5.2, radius: 0.34 },
  knockoutBoulder: KNOCKOUT_BOULDER_TUNING,
  toxicBolas: TOXIC_BOLAS_TUNING,
  arena: { width: 26, height: 20, boulderX: 12.3, boulderZ: 9.3, boundsX: 13, boundsZ: 10 },
});

export function createWizardCuratedEarthProjectileSourcePort(options = {}) {
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
    kbEnhanced: optionKbEnhanced = false,
    tbEnhanced: optionTbEnhanced = false,
  } = options;
  if (!THREE || !worldScene) throw new Error('Wizard curated Earth projectile source port requires THREE and scene.');

  const root = new THREE.Group();
  root.name = 'Wizard curated Earth projectile source port';
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
  // Source: ARENA={w:26,h:20}; BX=ARENA.w/2-.7; BZ=ARENA.h/2-.7;
  // The removal test then compares against BX+.7 / BZ+.7.
  const bx = number(arenaBounds?.maxX ?? bounds?.maxX, 12.3);
  const bz = number(arenaBounds?.maxZ ?? bounds?.maxZ, 9.3);
  const minX = number(arenaBounds?.minX ?? bounds?.minX, -bx);
  const minZ = number(arenaBounds?.minZ ?? bounds?.minZ, -bz);
  const maxX = bx;
  const maxZ = bz;

  const boulders = [];
  const bolas = [];
  const pools = [];
  const transients = [];
  const targetByRef = new Map();
  const targetById = new Map();
  let now = 0;
  let serial = 0;
  let disposed = false;

  function invokeCallback(name, raw, event, legacyArgs = []) {
    const callback = callbacksNow[name];
    if (typeof callback !== 'function') return;
    if (callback.length >= 2) callback(raw, ...legacyArgs, event);
    else callback({ ...event, target: raw, enemy: raw });
  }

  function targetId(raw, index) {
    const explicit = raw?.stableId ?? raw?.__abilityCaptureDummyId ?? raw?.id ?? raw?.spawnId ?? raw?.captureId;
    return explicit === undefined || explicit === null ? `target-${index + 1}` : String(explicit);
  }

  function syncTargets() {
    const list = Array.isArray(getTargets?.()) ? getTargets() : [];
    const seen = new Set();
    for (let index = 0; index < list.length; index += 1) {
      const raw = list[index]; if (!raw) continue;
      const id = targetId(raw, index);
      let target = targetByRef.get(raw) || targetById.get(id);
      if (!target) {
        target = { id, raw, pos: new THREE.Vector3(), radius: targetRadius(raw), alive: targetAlive(raw) };
        targetByRef.set(raw, target); targetById.set(id, target);
      }
      target.raw = raw;
      const point = targetPosition(raw);
      target.pos.set(point.x, 0, point.z);
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

  function emitDamage(target, amount, detail = {}) {
    const point = detail.position || target.pos;
    const event = {
      arcanaId: detail.arcanaId || 'EARTH',
      source: detail.source || 'wizard-curated-earth-projectile',
      damage: amount, amount,
      kind: detail.kind || 'hit',
      position: { x: number(point.x), z: number(point.z ?? point.y) },
      direction: detail.direction ? { x: detail.direction.x, z: detail.direction.z } : undefined,
      knockback: detail.knockback,
      charged: Boolean(detail.charged),
      stableId: target.id,
    };
    invokeCallback('onDamage', target.raw, event, [amount]);
  }

  function emitStatus(target, status, detail = {}) {
    const event = {
      arcanaId: detail.arcanaId || 'EARTH', source: detail.source || 'wizard-curated-earth-projectile',
      status, duration: detail.duration, ticks: detail.ticks, damage: detail.damage,
      interval: detail.interval, pool: detail.pool, stableId: target.id,
    };
    invokeCallback('onStatus', target.raw, event, [status, { ...event }]);
  }

  function emitMove(target, delta, detail = {}) {
    const event = {
      arcanaId: detail.arcanaId || 'EARTH', source: detail.source || 'wizard-curated-earth-projectile',
      position: { x: target.pos.x, z: target.pos.z }, delta: { x: delta.x, z: delta.z },
      direction: detail.direction, force: detail.force, reason: detail.reason || 'knockback', stableId: target.id,
    };
    invokeCallback('onMoveTarget', target.raw, event, [{ x: delta.x, z: delta.z }]);
  }

  function addTransient(mesh, life, update = null) {
    sourceScene.add(mesh); transients.push({ mesh, age: 0, life, update }); return mesh;
  }

  function ringEffect(position, radius, life = 0.42, color = 0xffffff) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 40), makeBasicMaterial(THREE, { color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -PI / 2; mesh.position.set(position.x, 0.05, position.z); mesh.scale.setScalar(0.2);
    return addTransient(mesh, life, (effect, t) => { mesh.scale.setScalar(lerp(0.2, radius, easeOut(t))); mesh.material.opacity = 0.8 * (1 - t); });
  }

  function debris(position, count, color = 0x8a6a3c, speed = 1.1, life = 1.0) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color, flatShading: true }));
      const vx = Math.cos(angle) * (0.6 + random() * speed * 1.5);
      const vz = Math.sin(angle) * (0.6 + random() * speed * 1.5);
      mesh.position.set(position.x, number(position.y, 0.25), position.z); mesh.scale.setScalar(0.45 + random() * 0.7);
      addTransient(mesh, life * (0.5 + random() * 0.5), (effect, dt) => { mesh.position.x += vx * dt; mesh.position.y += (1.5 + random() * 2 - 4 * effect.age) * dt; mesh.position.z += vz * dt; mesh.rotation.x += dt * 7; mesh.rotation.z += dt * 5; });
    }
  }

  function dust(position, radius, color = 0x8f7a58, life = 0.7) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), makeBasicMaterial(THREE, { color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -PI / 2; mesh.position.set(position.x, 0.02, position.z);
    addTransient(mesh, life, (effect, t) => { mesh.scale.setScalar(lerp(0.15, 1.2, easeOut(t))); mesh.material.opacity = 0.5 * (1 - t); });
  }

  function impactBurst(position, radius = 1, color = 0xffffff) { ringEffect(position, radius, 0.42, color); dust(position, radius, color, 0.36); }

  function addPool(position, radius, life, tick, every) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), makeBasicMaterial(THREE, { color: 0x6f9c33, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -PI / 2; mesh.position.set(position.x, 0.02, position.z);
    sourceScene.add(mesh);
    pools.push({ mesh, pos: new THREE.Vector3(position.x, 0, position.z), radius, life, age: 0, tick, every, t: 0 });
  }

  // Authoritative boulder geometry: perturbed IcosahedronGeometry(radius, 1)
  // with each vertex's y compressed by .94.
  function boulderMesh() {
    const geometry = new THREE.IcosahedronGeometry(KNOCKOUT_BOULDER_TUNING.radius, 1);
    const position = geometry.attributes?.position;
    if (position?.count !== undefined) {
      for (let i = 0; i < position.count; i += 1) {
        const scale = 0.80 + random() * 0.34;
        position.setXYZ(i, position.getX(i) * scale, position.getY(i) * scale * 0.94, position.getZ(i) * scale);
      }
      geometry.computeVertexNormals?.();
    }
    return new THREE.Mesh(geometry, new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0xc9a468, flatShading: true }));
  }

  function castKnockoutBoulder(context = {}) {
    const spec = KNOCKOUT_BOULDER_TUNING;
    const frame = playerFrame(getPlayer, context);
    const direction = new THREE.Vector3(frame.forward.x, 0, frame.forward.z);
    const origin = new THREE.Vector3(frame.x - direction.x * 0.95, 0, frame.z - direction.z * 0.95);
    const boulder = { id: `${++serial}:knockout-boulder`, mesh: boulderMesh(), dir: direction.clone(), pos: origin.clone(), travelled: 0, state: 'rise', t: 0, hit: new Set(), enhanced: context.enhanced === true || context.kbEnhanced === true || optionKbEnhanced === true };
    boulder.mesh.position.set(origin.x, -spec.radius, origin.z);
    boulder.mesh.rotation.set(random() * TAU, random() * TAU, random() * TAU);
    sourceScene.add(boulder.mesh); boulders.push(boulder);
    debris(origin, 16, 0x8a6a3c, 1.1, 1.0); dust(origin, 2.4, 0x8f7a58, 0.7);
    const crater = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), makeBasicMaterial(THREE, { color: 0x241b14, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
    crater.rotation.x = -PI / 2; crater.position.set(origin.x, 0.018, origin.z);
    addTransient(crater, spec.craterLife, (effect, t) => { crater.material.opacity = t < 0.1 ? t / 0.1 : clamp((1 - t) / 0.45, 0, 1); });
    // Source backDamage: a foe already at the extraction point is hit before
    // the projectile reaches its launch state.
    for (const target of liveTargets()) {
      if (!targetStillAlive(target)) continue;
      if (target.pos.distanceTo(origin) < spec.radius + 0.65) {
        const backDirection = { x: -direction.x, z: -direction.z };
        emitDamage(target, spec.backDamage, { arcanaId: 'KNOCKOUT-BOULDER', source: 'wizard-curated-earth-projectile', kind: 'back', position: origin, direction: backDirection, knockback: 4 });
        emitMove(target, { x: backDirection.x * 4, z: backDirection.z * 4 }, { arcanaId: 'KNOCKOUT-BOULDER', source: 'wizard-curated-earth-projectile', direction: backDirection, force: 4, reason: 'boulder-extraction' });
      }
    }
  }

  function stepBoulders(dt) {
    const spec = KNOCKOUT_BOULDER_TUNING;
    for (let i = boulders.length - 1; i >= 0; i -= 1) {
      const boulder = boulders[i]; boulder.t += dt;
      if (boulder.state === 'rise') {
        const progress = clamp(boulder.t / spec.windup, 0, 1);
        boulder.mesh.position.y = lerp(-spec.radius, spec.radius * 0.92, easeOut(progress));
        boulder.mesh.rotation.x += dt * 3;
        if (boulder.t >= spec.launch) { boulder.state = 'fly'; boulder.t = 0; }
        continue;
      }
      const step = spec.speed * dt;
      boulder.pos.addScaledVector(boulder.dir, step); boulder.travelled += step;
      const progress = clamp(boulder.travelled / 6, 0, 1);
      boulder.mesh.position.set(boulder.pos.x, spec.radius * 0.92 + Math.sin(progress * PI) * spec.loft, boulder.pos.z);
      boulder.mesh.rotation.z -= spec.spin * dt; boulder.mesh.rotation.x += spec.spin * 0.4 * dt;
      let done = false;
      for (const target of liveTargets()) {
        if (!targetStillAlive(target) || boulder.hit.has(target)) continue;
        if (target.pos.distanceTo(boulder.pos) < spec.radius + 0.45) {
          boulder.hit.add(target);
          emitDamage(target, spec.damage, { arcanaId: 'KNOCKOUT-BOULDER', source: 'wizard-curated-earth-projectile', kind: 'direct', position: boulder.pos, direction: { x: boulder.dir.x, z: boulder.dir.z }, knockback: spec.knockback, charged: boulder.enhanced });
          emitMove(target, { x: boulder.dir.x * spec.knockback, z: boulder.dir.z * spec.knockback }, { arcanaId: 'KNOCKOUT-BOULDER', source: 'wizard-curated-earth-projectile', direction: { x: boulder.dir.x, z: boulder.dir.z }, force: spec.knockback, reason: 'boulder-hit' });
          emitStatus(target, 'stun', { arcanaId: 'KNOCKOUT-BOULDER', duration: spec.stun });
          impactBurst(boulder.pos, 1.25); debris(boulder.pos, 14, 0xb08e56, 1.3, 0.9);
          if (boulder.enhanced) {
            impactBurst(boulder.pos, spec.enhRadius, 0xd8b98a); debris(boulder.pos, 22, 0x8a6a3c, 2.0, 1.1);
            for (const other of liveTargets()) {
              if (other === target || !targetStillAlive(other)) continue;
              if (other.pos.distanceTo(boulder.pos) < spec.enhRadius) {
                const dx = other.pos.x - boulder.pos.x; const dz = other.pos.z - boulder.pos.z; const length = Math.hypot(dx, dz) || 1;
                const direction = { x: dx / length, z: dz / length };
                emitDamage(other, spec.enhDamage, { arcanaId: 'KNOCKOUT-BOULDER', source: 'wizard-curated-earth-projectile', kind: 'enhanced-splash', position: boulder.pos, direction, knockback: 4, charged: true });
                emitMove(other, { x: direction.x * 4, z: direction.z * 4 }, { arcanaId: 'KNOCKOUT-BOULDER', source: 'wizard-curated-earth-projectile', direction, force: 4, reason: 'enhanced-boulder-splash' });
              }
            }
          }
          done = true; break;
        }
      }
      const outside = boulder.pos.x < minX - 0.7 || boulder.pos.x > maxX + 0.7 || boulder.pos.z < minZ - 0.7 || boulder.pos.z > maxZ + 0.7;
      if (done || boulder.travelled > spec.range || outside) {
        if (!done) { impactBurst(boulder.pos, 0.8, 0xd8c9a8); debris(boulder.pos, 10, 0x8a6a3c, 1.2, 0.8); }
        disposeObject(boulder.mesh); boulders.splice(i, 1);
      }
    }
  }

  // Authoritative bolasMesh(): green core, three arms, box cords, and pale
  // icosahedral bulbs at the exact source offsets.
  function bolasMesh() {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0x4f6b2a, flatShading: true }));
    group.add(core); group.arms = [];
    const ballMaterial = new (THREE.MeshLambertMaterial || THREE.MeshBasicMaterial)({ color: 0xe9f0d4, flatShading: true });
    const cordMaterial = makeBasicMaterial(THREE, { color: 0xcfd9b0 });
    for (let i = 0; i < 3; i += 1) {
      const arm = new THREE.Group();
      const cord = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.02), cordMaterial); cord.position.x = 0.14; arm.add(cord);
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), ballMaterial); ball.position.x = 0.29; arm.add(ball);
      arm.rotation.y = i / 3 * TAU; group.add(arm); group.arms.push(arm);
    }
    group.name = 'toxic-bolas';
    return group;
  }

  function spawnBolas(origin, direction, detail) {
    const bolas = {
      id: `${++serial}:toxic-bolas`, g: bolasMesh(), dir: direction.clone(), pos: origin.clone(), travelled: 0,
      spin: random() * TAU, dmg: detail.dmg, pierce: detail.pierce, pool: detail.pool, hit: new Set(), charged: Boolean(detail.charged),
    };
    bolas.g.position.set(origin.x, 0.72, origin.z); sourceScene.add(bolas.g); return bolas;
  }

  function castToxicBolas(context = {}) {
    const spec = TOXIC_BOLAS_TUNING;
    const frame = playerFrame(getPlayer, context);
    const origin = new THREE.Vector3(frame.x + frame.forward.x * 0.42, 0, frame.z + frame.forward.z * 0.42);
    const charged = context.charged === true || context.signature === true || number(context.hold ?? context.charge ?? context.chargeDuration, 0) >= spec.chargeTime;
    if (!charged) {
      const b = spawnBolas(origin, new THREE.Vector3(frame.forward.x, 0, frame.forward.z), { dmg: spec.damage, pierce: context.enhanced === true || context.tbEnhanced === true || optionTbEnhanced === true, pool: false, charged: false });
      bolas.push(b);
      return;
    }
    const base = Math.atan2(frame.forward.z, frame.forward.x);
    for (let i = 0; i < spec.charged.count; i += 1) {
      const angle = base + (-spec.charged.arc / 2) + (i / (spec.charged.count - 1)) * spec.charged.arc;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const b = spawnBolas(origin, direction, { dmg: spec.charged.damage, pierce: true, pool: true, charged: true });
      bolas.push(b);
    }
    const release = new THREE.Group(); release.position.set(frame.x, 0.07, frame.z);
    const material = makeBasicMaterial(THREE, { color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 28; i += 1) {
      const angle = random() * TAU; const length = 2.2 + random() * 3.2;
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.075), material);
      streak.rotation.x = -PI / 2; streak.rotation.z = -angle;
      streak.position.set(Math.cos(angle) * length * 0.55, 0, Math.sin(angle) * length * 0.55); release.add(streak);
    }
    addTransient(release, 0.34, (effect, t) => { release.scale.setScalar(lerp(0.25, 1.3, easeOut(t))); material.opacity = 1 - t; });
    impactBurst(new THREE.Vector3(frame.x, 0, frame.z), 1.7); debris(new THREE.Vector3(frame.x, 0.2, frame.z), 22, 0x6f9c33, 1.1, 1.5);
  }

  function stepBolas(dt) {
    const spec = TOXIC_BOLAS_TUNING;
    for (let i = bolas.length - 1; i >= 0; i -= 1) {
      const bola = bolas[i]; const step = spec.speed * dt;
      bola.pos.addScaledVector(bola.dir, step); bola.travelled += step; bola.spin += dt * 26;
      bola.g.position.set(bola.pos.x, 0.72, bola.pos.z);
      bola.g.arms.forEach((arm, index) => { arm.rotation.y = bola.spin + index / 3 * TAU; });
      bola.g.rotation.z = Math.sin(bola.spin * 0.4) * 0.4;
      let stop = false;
      for (const target of liveTargets()) {
        if (!targetStillAlive(target) || bola.hit.has(target)) continue;
        if (target.pos.distanceTo(bola.pos) < 0.55) {
          bola.hit.add(target);
          emitDamage(target, bola.dmg, { arcanaId: 'TOXIC-BOLAS', source: 'wizard-curated-earth-projectile', kind: bola.charged ? 'charged-impact' : 'impact', position: bola.pos, direction: { x: bola.dir.x, z: bola.dir.z }, charged: bola.charged });
          impactBurst(bola.pos, 1.0); emitStatus(target, 'root', { arcanaId: 'TOXIC-BOLAS', duration: spec.rootTime, pool: bola.pool });
          if (bola.pool) {
            emitStatus(target, 'poison', { arcanaId: 'TOXIC-BOLAS', duration: spec.charged.poolTick * 10, ticks: 10, damage: spec.charged.poolTick, interval: spec.charged.poolEvery, pool: true });
            addPool(target.pos, spec.charged.poolRadius, spec.charged.poolLife, spec.charged.poolTick, spec.charged.poolEvery);
          } else {
            emitStatus(target, 'poison', { arcanaId: 'TOXIC-BOLAS', duration: spec.poisonTicks * spec.poisonEvery, ticks: spec.poisonTicks, damage: spec.poisonTick, interval: spec.poisonEvery, pool: false });
          }
          if (!bola.pierce) { stop = true; break; }
        }
      }
      const outside = bola.pos.x < minX - 0.7 || bola.pos.x > maxX + 0.7 || bola.pos.z < minZ - 0.7 || bola.pos.z > maxZ + 0.7;
      if (stop || bola.travelled > spec.range || outside) { disposeObject(bola.g); bolas.splice(i, 1); }
    }
  }

  function stepPools(dt) {
    for (let i = pools.length - 1; i >= 0; i -= 1) {
      const pool = pools[i]; pool.age += dt; pool.t += dt;
      const inT = clamp(pool.age / 0.35, 0, 1); const outT = clamp((pool.life - pool.age) / 2.0, 0, 1);
      pool.mesh.material.opacity = 0.9 * inT * outT; pool.mesh.scale.setScalar(lerp(0.55, 1, easeOut(inT)));
      if (pool.t >= pool.every) {
        pool.t -= pool.every;
        for (const target of liveTargets()) {
          if (targetStillAlive(target) && target.pos.distanceTo(pool.pos) < pool.radius + 0.35) {
            emitStatus(target, 'poison', { arcanaId: 'TOXIC-BOLAS', duration: pool.every, ticks: 1, damage: pool.tick, interval: pool.every, pool: true });
          }
        }
      }
      if (pool.age >= pool.life) { disposeObject(pool.mesh); pools.splice(i, 1); }
    }
  }

  function stepTransients(dt) {
    for (let i = transients.length - 1; i >= 0; i -= 1) {
      const effect = transients[i]; effect.age += dt;
      if (effect.age >= effect.life) { disposeObject(effect.mesh); transients.splice(i, 1); continue; }
      effect.update?.(effect, clamp(effect.age / effect.life, 0, 1), dt);
    }
  }

  function clearEffects() {
    for (const boulder of boulders) disposeObject(boulder.mesh);
    for (const bola of bolas) disposeObject(bola.g);
    for (const pool of pools) disposeObject(pool.mesh);
    for (const effect of transients) disposeObject(effect.mesh);
    boulders.length = 0; bolas.length = 0; pools.length = 0; transients.length = 0;
  }

  function cast(id, context = {}) {
    if (disposed) return false;
    const arcana = normalizeId(id);
    if (!arcana) return false;
    syncTargets();
    if (arcana === 'knockout-boulder') castKnockoutBoulder(context);
    else castToxicBolas(context);
    return true;
  }

  function update(dt = 0) {
    if (disposed) return;
    const delta = Math.max(0, number(dt, 0)); now += delta;
    syncTargets(); stepBoulders(delta); stepBolas(delta); stepPools(delta); stepTransients(delta);
  }

  function reset() { clearEffects(); now = 0; serial = 0; disposed = false; }
  function dispose() { if (disposed) return; clearEffects(); disposed = true; disposeObject(root); }

  function snapshot() {
    return {
      source: 'wizard-of-legend-earth-arcana-phone-demo.html',
      sourceSha256: '9bd210cd097fa3b711fc8c95fb92720bf4212f2c9271662a3712e858bf1628e2',
      tuning: WIZARD_CURATED_EARTH_PROJECTILE_TUNING,
      time: now, disposed,
      boulders: boulders.map(effect => ({ id: effect.id, state: effect.state, x: effect.pos.x, z: effect.pos.z, travelled: effect.travelled, t: effect.t, enhanced: effect.enhanced, hits: [...effect.hit].map(target => target.id) })),
      bolas: bolas.map(effect => ({ id: effect.id, x: effect.pos.x, z: effect.pos.z, travelled: effect.travelled, dmg: effect.dmg, pierce: effect.pierce, pool: effect.pool, charged: effect.charged, hits: [...effect.hit].map(target => target.id) })),
      pools: pools.map(pool => ({ x: pool.pos.x, z: pool.pos.z, age: pool.age, life: pool.life, radius: pool.radius, tick: pool.tick, every: pool.every })),
      transientEffects: transients.length,
    };
  }

  // Keep the injected service visible to callers that use a shared dash seam;
  // these two authored Earth effects do not request dash motion themselves.
  void startDashMotion;

  return { root, cast, update, reset, dispose, snapshot };
}
