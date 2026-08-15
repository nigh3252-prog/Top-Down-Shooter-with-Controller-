/*
 * Curated Wizard of Legend basic source port.
 *
 * Source lineage (copied effect geometry, palette, particles, timing and hit
 * tests; the adapter below only supplies the local scene/player/target seams):
 *   wizard-of-legend-arcana-demo-1 ae.html
 *   SHA-256 11058c5d3088ce242ad942c93c50de7308d1b99ca96fe75c4175f7be40d00844
 *
 * The source file is a standalone browser demo. This module deliberately
 * keeps its source-local classes and constants together and removes only the
 * DOM/input/camera-loop shell. `createWizardCuratedBasicSourcePort()` returns
 * the common adapter surface requested by the game runtime.
 */

const TAU = Math.PI * 2;
const ARENA_R = 17;
const PLAYER_SPEED = 6.2;
const COMBO_RESET = 0.62;
const ENEMY_R = 0.46;
const SEGS = 16;
const WHIP_REACH = 3.0;
const BUNDLE_REACH = 5.6;
const STRIKE_REACH = 1.75;
const STRIKE_HALF_WIDTH = 0.78;
const ARC_R = 3.5;
const ARC_HALF_ANGLE = 1.32;
const SPARK_CORE = 0xe6cc01;
const SPARK_PALE = 0xf6e899;

const ARCANA = Object.freeze({
  vine: Object.freeze({
    key: 'vine', name: 'Bladed Vine', element: 'Earth', category: 'Basic', subtype: 'Melee',
    color: 0xb9bb8a, css: '#c2c48f', beats: 3,
    expected: Object.freeze([7, 7, 15]),
    expectedEnh: Object.freeze([7, 7, 9, 9, 9]),
  }),
  spark: Object.freeze({
    key: 'spark', name: 'Spark Contact', element: 'Lightning', category: 'Basic', subtype: 'Melee',
    color: 0xe6cc01, css: '#e8d43a', beats: 4,
    expected: Object.freeze([6, 7, 8, 9, 10]),
    expectedEnh: Object.freeze([6, 7, 8, 9, 10]),
  }),
});

const TIMING = Object.freeze({
  // Measured in the source demo: successive Vine beats are about nine frames.
  vine: Object.freeze([
    Object.freeze({ windup: 0.06, active: 0.17, recover: 0.07, step: 0 }),
    Object.freeze({ windup: 0.06, active: 0.17, recover: 0.07, step: 0 }),
    Object.freeze({ windup: 0.07, active: 0.19, recover: 0.22, step: 0 }),
  ]),
  vineEnhancedFinal: Object.freeze({ windup: 0.07, active: 0.46, recover: 0.22, step: 0 }),
  spark: Object.freeze([
    Object.freeze({ windup: 0.045, active: 0.055, recover: 0.075, step: 0.62 }),
    Object.freeze({ windup: 0.045, active: 0.055, recover: 0.075, step: 0.62 }),
    Object.freeze({ windup: 0.045, active: 0.055, recover: 0.075, step: 0.62 }),
    Object.freeze({ windup: 0.055, active: 0.090, recover: 0.300, step: 0.72 }),
  ]),
});

const clamp01 = value => value < 0 ? 0 : value > 1 ? 1 : value;
const easeOutCubic = value => 1 - Math.pow(1 - clamp01(value), 3);
const easeOutQuart = value => 1 - Math.pow(1 - clamp01(value), 4);
const finite = value => Number.isFinite(Number(value));

function normalizeId(id) {
  const text = String(id || '').trim().toLowerCase().replace(/[ _]+/g, '-');
  if (text.includes('spark')) return 'spark';
  if (text.includes('vine')) return 'vine';
  return text === 'spark-contact' ? 'spark' : text === 'bladed-vine' ? 'vine' : null;
}

function disposeMaterial(material) {
  if (Array.isArray(material)) material.forEach(disposeMaterial);
  else material?.dispose?.();
}

function disposeObject(root) {
  if (!root) return;
  root.parent?.remove?.(root);
  root.traverse?.(object => {
    object.geometry?.dispose?.();
    disposeMaterial(object.material);
  });
}

function vectorPosition(THREE, value) {
  if (value?.isVector3) return value.clone();
  if (value?.pos?.isVector3) return value.pos.clone();
  if (value?.position?.isVector3) return value.position.clone();
  return new THREE.Vector3(Number(value?.x) || 0, Number(value?.y) || 0, Number(value?.z) || 0);
}

function directionFrom(value) {
  const x = Number(value?.x ?? value?.forwardX ?? value?.dx) || 0;
  const z = Number(value?.z ?? value?.forwardZ ?? value?.dz) || 1;
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

export function createWizardCuratedBasicSourcePort(options = {}) {
  const {
    THREE,
    scene: worldScene,
    parent = null,
    camera: worldCamera = null,
    getTargets = () => [],
    getPlayer = () => ({ x: 0, z: 0, forwardX: 0, forwardZ: 1 }),
    onDamage = () => {},
    onStatus = () => {},
    onMoveTarget = () => {},
    size: optionSize = 1,
  } = options;
  if (!THREE || !worldScene) throw new Error('Wizard curated basic source port requires THREE and scene.');

  const root = new THREE.Group();
  root.name = 'Wizard curated basic source port';
  (parent || worldScene).add(root);
  const sourceScene = root;
  const camera = worldCamera || new THREE.PerspectiveCamera(46, 1, 0.1, 160);
  const sourceSize = Math.max(0.001, Number(optionSize) || 1);
  root.scale.setScalar(sourceSize);

  const effects = [];
  const scheduled = [];
  const targetById = new Map();
  const strandPool = [];
  const boltPool = [];
  let now = 0;
  let currentArc = 'vine';
  let enhanced = false;
  let hitstop = 0;
  let disposed = false;

  // Source-local player frame. The source demo uses pstate.pos/facing and a
  // hand root offset; the runtime supplies those values through getPlayer or
  // a cast context without requiring a player mesh in this module.
  const pstate = {
    pos: new THREE.Vector3(),
    facing: 0,
    lunge: new THREE.Vector3(),
    lean: 0,
  };

  function addEffect(effect) {
    effects.push(effect);
    return effect;
  }

  function removeEffect(effect) {
    const index = effects.indexOf(effect);
    if (index >= 0) effects.splice(index, 1);
    effect.dispose?.();
  }

  function targetId(raw, index) {
    const explicit = raw?.stableId ?? raw?.__abilityCaptureDummyId ?? raw?.id ?? raw?.spawnId ?? raw?.captureId;
    return explicit === undefined || explicit === null ? `target-${index}` : String(explicit);
  }

  function targetWorldPosition(raw) {
    return vectorPosition(THREE, raw?.pos || raw?.position || raw);
  }

  function toSourcePosition(worldPosition) {
    // The supplied adapter scene is normally world-origin. Keep this explicit
    // so callers can provide a parent-scaled scene without changing source math.
    const position = worldPosition.clone();
    if (root.parent) {
      root.updateMatrixWorld(true);
      root.worldToLocal(position);
    } else {
      position.divideScalar(sourceSize);
    }
    return position;
  }

  function toWorldPosition(sourcePosition) {
    const position = sourcePosition.clone();
    if (root.parent) {
      root.updateMatrixWorld(true);
      root.localToWorld(position);
    } else {
      position.multiplyScalar(sourceSize);
    }
    return position;
  }

  function syncTargets() {
    const provided = getTargets?.();
    const list = Array.isArray(provided) ? provided : [];
    const seen = new Set();
    for (let index = 0; index < list.length; index += 1) {
      const raw = list[index];
      if (!raw) continue;
      const id = targetId(raw, index);
      seen.add(id);
      let target = targetById.get(id);
      if (!target) {
        target = {
          id,
          raw,
          pos: new THREE.Vector3(),
          anchor: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          lean: new THREE.Vector2(),
          hp: Number(raw.hp) || Number(raw.maxHp) || 400,
          maxHp: Number(raw.maxHp) || Number(raw.hp) || 400,
          flash: 0,
          shock: 0,
          shockTick: 0,
          radius: Math.max(0.01, Number(raw.radius) || ENEMY_R),
          parts: [],
        };
        targetById.set(id, target);
      }
      target.raw = raw;
      const sourcePosition = toSourcePosition(targetWorldPosition(raw));
      if (!target.initialized) {
        target.anchor.copy(sourcePosition);
        target.initialized = true;
      }
      target.pos.copy(sourcePosition);
      target.radius = Math.max(0.01, (Number(raw.radius) || ENEMY_R) / sourceSize);
      if (finite(raw.hp)) target.hp = Number(raw.hp);
      if (finite(raw.maxHp)) target.maxHp = Number(raw.maxHp);
    }
    for (const [id, target] of targetById) if (!seen.has(id)) target.raw = null;
    return [...targetById.values()].filter(target => target.raw);
  }

  function liveTargets() {
    return [...targetById.values()].filter(target => target.raw);
  }

  function writeTargetPosition(target, previous, reason = 'source-motion') {
    const dx = target.pos.x - previous.x;
    const dz = target.pos.z - previous.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-8) return;
    const world = toWorldPosition(target.pos);
    onMoveTarget?.(target.raw, { x: world.x, z: world.z }, {
      source: 'wizard-curated-basic', reason, stableId: target.id,
    });
  }

  function hitEnemy(target, damage, knockback, dirX, dirZ, opts = {}) {
    target.hp -= damage;
    target.flash = 1;
    target.vel.x += dirX * knockback * 0.10;
    target.vel.z += dirZ * knockback * 0.10;
    target.lean.x += dirX * 0.28;
    target.lean.y += dirZ * 0.28;
    if (opts.shock) {
      target.shock = Math.max(target.shock, 4.0);
      onStatus?.(target.raw, 'shock', { duration: 4, source: 'wizard-curated-basic' });
    }
    onDamage?.(target.raw, damage, {
      source: 'wizard-curated-basic', arcana: ARCANA[currentArc].name,
      knockback: { x: dirX * knockback, z: dirZ * knockback },
      big: Boolean(opts.big), shock: Boolean(opts.shock), stableId: target.id,
    });
    if (target.hp <= 0) {
      target.hp = target.maxHp;
      onStatus?.(target.raw, 'DUMMY RESET', { source: 'wizard-curated-basic', stableId: target.id });
    }
  }

  const SEGS_SOURCE = SEGS;
  const segGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  segGeo.translate(0, 0.5, 0);
  const thornGeo = new THREE.ConeGeometry(1, 1, 5);
  thornGeo.translate(0, 0.5, 0);
  const leafGeo = new THREE.SphereGeometry(1, 6, 4);
  const VINE_BODY = 0x8a8c62;
  const VINE_TIP = 0xb9bb8a;
  const THORN = 0x5d5f3c;
  const LEAF = 0x9a9c6e;
  const UP = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();

  // Copied from source: segmented vine body, thorn/leaf placement, and the
  // pool lifecycle are intentionally unchanged.
  class Strand {
    constructor() {
      this.group = new THREE.Group();
      this.pts = [];
      for (let i = 0; i <= SEGS_SOURCE; i += 1) this.pts.push(new THREE.Vector3());
      this.mat = new THREE.MeshStandardMaterial({ color: VINE_BODY, roughness: 0.7, emissive: 0x1c2c08, emissiveIntensity: 0.6 });
      this.tipMat = new THREE.MeshStandardMaterial({ color: VINE_TIP, roughness: 0.6, emissive: 0x2c4410, emissiveIntensity: 0.8 });
      this.thornMat = new THREE.MeshStandardMaterial({ color: THORN, roughness: 0.6 });
      this.leafMat = new THREE.MeshStandardMaterial({ color: LEAF, roughness: 0.75, side: THREE.DoubleSide });
      this.segs = [];
      this.thorns = [];
      this.leaves = [];
      for (let i = 0; i < SEGS_SOURCE; i += 1) {
        const mesh = new THREE.Mesh(segGeo, i > SEGS_SOURCE - 5 ? this.tipMat : this.mat);
        this.group.add(mesh);
        this.segs.push(mesh);
        if (i % 3 === 1) {
          const thorn = new THREE.Mesh(thornGeo, this.thornMat);
          thorn.userData.i = i;
          thorn.userData.roll = (i * 1.9) % TAU;
          this.group.add(thorn);
          this.thorns.push(thorn);
        }
        if (i % 5 === 3) {
          const leaf = new THREE.Mesh(leafGeo, this.leafMat);
          leaf.userData.i = i;
          leaf.userData.roll = (i * 2.7) % TAU;
          this.group.add(leaf);
          this.leaves.push(leaf);
        }
      }
      this.group.visible = false;
      sourceScene.add(this.group);
    }
    setOpacity(opacity) {
      for (const material of [this.mat, this.tipMat, this.thornMat, this.leafMat]) {
        material.transparent = opacity < 1;
        material.opacity = opacity;
      }
    }
    build(radius) {
      for (let i = 0; i < SEGS_SOURCE; i += 1) {
        const a = this.pts[i], b = this.pts[i + 1];
        v.subVectors(b, a);
        const length = v.length() || 0.0001;
        const u = i / SEGS_SOURCE;
        const r = radius * (1 - 0.62 * u) * (u < 0.08 ? 0.55 + u * 5.6 : 1);
        const mesh = this.segs[i];
        mesh.position.copy(a);
        q.setFromUnitVectors(UP, v.divideScalar(length));
        mesh.quaternion.copy(q);
        mesh.scale.set(r, length * 1.06, r);
      }
      for (const thorn of this.thorns) {
        const i = thorn.userData.i;
        const a = this.pts[i], b = this.pts[i + 1];
        v.subVectors(b, a).normalize();
        const u = i / SEGS_SOURCE;
        const r = radius * (1 - 0.62 * u);
        thorn.position.copy(a);
        q.setFromUnitVectors(UP, v);
        thorn.quaternion.copy(q);
        thorn.rotateY(thorn.userData.roll);
        thorn.rotateX(2.25);
        thorn.scale.set(r * 0.85, r * 3.6, r * 0.85);
      }
      for (const leaf of this.leaves) {
        const i = leaf.userData.i;
        const a = this.pts[i], b = this.pts[i + 1];
        v.subVectors(b, a).normalize();
        const u = i / SEGS_SOURCE;
        const r = radius * (1 - 0.5 * u);
        leaf.position.copy(a);
        q.setFromUnitVectors(UP, v);
        leaf.quaternion.copy(q);
        leaf.rotateY(leaf.userData.roll);
        leaf.scale.set(r * 2.6, r * 0.4, r * 1.5);
      }
    }
  }

  function takeStrands(count) {
    const result = [];
    for (let i = 0; i < count; i += 1) {
      let strand = strandPool.find(candidate => !candidate.busy);
      if (!strand) {
        strand = new Strand();
        strandPool.push(strand);
      }
      strand.busy = true;
      strand.group.visible = true;
      strand.setOpacity(1);
      result.push(strand);
    }
    return result;
  }

  function freeStrands(list) {
    for (const strand of list) {
      strand.busy = false;
      strand.group.visible = false;
    }
  }

  const boltGeo = new THREE.BoxGeometry(1, 1, 1);

  class Bolt {
    constructor(segments = 7) {
      this.group = new THREE.Group();
      this.mat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
      this.segs = [];
      for (let i = 0; i < segments; i += 1) {
        const mesh = new THREE.Mesh(boltGeo, this.mat);
        this.group.add(mesh);
        this.segs.push(mesh);
      }
      this.group.visible = false;
      sourceScene.add(this.group);
    }
    draw(a, b, jag, width) {
      const count = this.segs.length;
      const direction = v.subVectors(b, a).clone();
      const length = direction.length() || 0.0001;
      direction.divideScalar(length);
      const side = new THREE.Vector3(-direction.z, 0, direction.x);
      let previous = a.clone();
      for (let i = 1; i <= count; i += 1) {
        const u = i / count;
        const wobble = i === count ? 0 : (Math.random() - 0.5) * jag;
        const wobbleY = i === count ? 0 : (Math.random() - 0.5) * jag * 0.7;
        const point = a.clone().addScaledVector(direction, length * u)
          .addScaledVector(side, wobble).addScaledVector(UP, wobbleY);
        const mesh = this.segs[i - 1];
        const delta = point.clone().sub(previous);
        const deltaLength = delta.length() || 0.0001;
        mesh.position.copy(previous).addScaledVector(delta, 0.5);
        mesh.quaternion.setFromUnitVectors(UP, delta.divideScalar(deltaLength));
        mesh.scale.set(width, deltaLength, width);
        previous = point;
      }
    }
  }

  function takeBolt() {
    let bolt = boltPool.find(candidate => !candidate.busy);
    if (!bolt) {
      bolt = new Bolt(6 + ((boltPool.length * 3) % 4));
      boltPool.push(bolt);
    }
    bolt.busy = true;
    bolt.group.visible = true;
    bolt.mat.opacity = 1;
    return bolt;
  }

  function freeBolt(bolt) {
    bolt.busy = false;
    bolt.group.visible = false;
  }

  const flashGeo = new THREE.SphereGeometry(1, 12, 10);
  const rayGeo = new THREE.PlaneGeometry(1, 1);
  const coreGeo = new THREE.CircleGeometry(1, 12);
  const ringGeo = new THREE.RingGeometry(0.72, 1, 28);

  function spawnFlash(position, color, size, life) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(flashGeo, material);
    mesh.position.copy(position);
    mesh.scale.set(size * 0.35, size * 0.245, size * 0.35);
    sourceScene.add(mesh);
    addEffect({
      t: 0,
      update(dt) {
        this.t += dt;
        const u = this.t / life;
        if (u >= 1) { sourceScene.remove(mesh); material.dispose(); return false; }
        const scale = size * (0.35 + u * 1.5);
        mesh.scale.set(scale, scale * 0.7, scale);
        material.opacity = 0.95 * (1 - u) * (1 - u);
        return true;
      },
    });
  }

  function spawnStar(position, size, life) {
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const group = new THREE.Group();
    const rays = [];
    for (const rotation of [0.62, -0.78]) {
      const mesh = new THREE.Mesh(rayGeo, material);
      mesh.rotation.z = rotation;
      group.add(mesh);
      rays.push(mesh);
    }
    const core = new THREE.Mesh(coreGeo, material);
    group.add(core);
    group.position.copy(position);
    group.quaternion.copy(camera.quaternion);
    for (const ray of rays) ray.scale.set(0.0001, size * 0.05, 1);
    core.scale.setScalar(0.0001);
    sourceScene.add(group);
    addEffect({
      t: 0,
      update(dt) {
        this.t += dt;
        const u = this.t / life;
        if (u >= 1) { sourceScene.remove(group); material.dispose(); return false; }
        group.quaternion.copy(camera.quaternion);
        const pop = u < 0.28 ? u / 0.28 : 1;
        const fade = u < 0.28 ? 1 : 1 - (u - 0.28) / 0.72;
        for (const ray of rays) ray.scale.set(size * 2.9 * pop, size * 0.1 * (0.5 + fade), 1);
        core.scale.setScalar(size * 0.3 * pop * (0.6 + fade * 0.4));
        material.opacity = fade * 0.9;
        return true;
      },
    });
  }

  function spawnRing(position, color, size, life) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(ringGeo, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = 0.06;
    mesh.scale.setScalar(size * 0.25);
    sourceScene.add(mesh);
    addEffect({
      t: 0,
      update(dt) {
        this.t += dt;
        const u = this.t / life;
        if (u >= 1) { sourceScene.remove(mesh); material.dispose(); return false; }
        const scale = size * (0.25 + u * 1.1);
        mesh.scale.set(scale, scale, scale);
        material.opacity = 0.8 * (1 - u);
        return true;
      },
    });
  }

  function strandHits(strand, target, pad) {
    const radius = ENEMY_R + pad;
    for (let i = 1; i <= SEGS_SOURCE; i += 1) {
      const point = strand.pts[i];
      const dx = point.x - target.pos.x;
      const dz = point.z - target.pos.z;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  // Copied source effect: attached whip and its swept angular hit ledger.
  function spawnVineWhip({ root: whipRoot, angle, from, to, dmg, kb, life }) {
    const strands = takeStrands(1);
    const strand = strands[0];
    const hitSet = new Set();
    return addEffect({
      t: 0,
      prevAng: null,
      update(dt) {
        this.t += dt;
        const u = this.t / life;
        if (u >= 1) { freeStrands(strands); return false; }
        const extend = easeOutQuart(clamp01(u / 0.24));
        const retract = u > 0.74 ? 1 - (u - 0.74) / 0.26 : 1;
        const length = WHIP_REACH * extend * retract;
        const sweep = easeOutCubic(clamp01(u / 0.62));
        for (let i = 0; i <= SEGS_SOURCE; i += 1) {
          const t = i / SEGS_SOURCE;
          const lag = clamp01((sweep - (1 - t) * 0.34) / 0.66);
          const localAngle = angle + from + (to - from) * lag;
          const radius = length * t;
          const point = strand.pts[i];
          point.set(whipRoot.x + Math.sin(localAngle) * radius, 0, whipRoot.z + Math.cos(localAngle) * radius);
          point.y = whipRoot.y + (0.34 - whipRoot.y) * t + 0.3 * Math.sin(Math.PI * t) * (1 - t * 0.4);
        }
        strand.build(0.062);
        strand.setOpacity(retract);
        const tipAngle = angle + from + (to - from) * sweep;
        if (this.prevAng === null) this.prevAng = angle + from;
        if (u > 0.08 && u < 0.86) {
          const lo = Math.min(this.prevAng, tipAngle);
          const hi = Math.max(this.prevAng, tipAngle);
          const span = hi - lo;
          for (const target of liveTargets()) {
            if (hitSet.has(target)) continue;
            const dx = target.pos.x - whipRoot.x;
            const dz = target.pos.z - whipRoot.z;
            const distance = Math.hypot(dx, dz);
            if (distance < 0.15 || distance > length + ENEMY_R) continue;
            let delta = Math.atan2(dx, dz) - lo;
            while (delta > Math.PI) delta -= TAU;
            while (delta < -Math.PI) delta += TAU;
            const pad = Math.atan2(ENEMY_R + 0.18, distance);
            if (delta < -pad || delta > span + pad) continue;
            hitSet.add(target);
            hitEnemy(target, dmg, kb, dx / distance, dz / distance);
            spawnStar(new THREE.Vector3(target.pos.x, 0.95, target.pos.z), 0.3, 0.22);
          }
        }
        this.prevAng = tipAngle;
        return true;
      },
    });
  }

  // Copied source effect: three visible bundle strands share one hit ledger.
  function spawnVineBundle({ root: bundleRoot, angle, dmg, kb, life, seed }) {
    const strands = takeStrands(3);
    const hitSet = new Set();
    const offsets = [-0.2, 0, 0.2];
    return addEffect({
      t: 0,
      update(dt) {
        this.t += dt;
        const u = this.t / life;
        if (u >= 1) { freeStrands(strands); return false; }
        const extend = easeOutQuart(clamp01(u / 0.3));
        const retract = u > 0.78 ? 1 - (u - 0.78) / 0.22 : 1;
        const length = BUNDLE_REACH * extend * (0.35 + 0.65 * retract);
        for (let k = 0; k < 3; k += 1) {
          const strand = strands[k];
          const localAngle = angle + offsets[k];
          const fx = Math.sin(localAngle), fz = Math.cos(localAngle);
          const lx = Math.cos(localAngle), lz = -Math.sin(localAngle);
          for (let i = 0; i <= SEGS_SOURCE; i += 1) {
            const t = i / SEGS_SOURCE;
            const radius = length * t;
            const wobble = Math.sin(t * 6.2 + seed + k * 2.1 + u * 7.5) * 0.26 * t;
            const point = strand.pts[i];
            point.set(bundleRoot.x + fx * radius + lx * wobble, 0, bundleRoot.z + fz * radius + lz * wobble);
            point.y = bundleRoot.y + (0.3 - bundleRoot.y) * t + 0.22 * Math.sin(Math.PI * t * 1.2) + (k - 1) * 0.05 * t;
          }
          strand.build(0.056);
          strand.setOpacity(retract);
        }
        if (u > 0.06 && u < 0.86) {
          for (const target of liveTargets()) {
            if (hitSet.has(target)) continue;
            const dx = target.pos.x - bundleRoot.x;
            const dz = target.pos.z - bundleRoot.z;
            let touched = false;
            for (const offset of offsets) {
              const localAngle = angle + offset;
              const ax = Math.sin(localAngle), az = Math.cos(localAngle);
              const projection = Math.max(0, Math.min(length, dx * ax + dz * az));
              const px = dx - ax * projection;
              const pz = dz - az * projection;
              const radius = ENEMY_R + 0.42;
              if (px * px + pz * pz < radius * radius) { touched = true; break; }
            }
            if (!touched) continue;
            hitSet.add(target);
            const distance = Math.hypot(dx, dz) || 1;
            hitEnemy(target, dmg, kb, dx / distance, dz / distance, { big: dmg >= 15 });
            spawnStar(new THREE.Vector3(target.pos.x, 0.95, target.pos.z), 0.44, 0.26);
            hitstop = Math.max(hitstop, 0.045);
          }
        }
        return true;
      },
    });
  }

  // Copied source effect: compact seven-bolt Spark spray and rectangular hit.
  function spawnSparkStrike({ root: strikeRoot, angle, dmg, life }) {
    const bolts = [];
    for (let i = 0; i < 7; i += 1) {
      const bolt = takeBolt();
      bolt.mat.color.setHex(i % 3 ? SPARK_CORE : SPARK_PALE);
      bolts.push(bolt);
    }
    const hitSet = new Set();
    const fx = Math.sin(angle), fz = Math.cos(angle);
    const lx = Math.cos(angle), lz = -Math.sin(angle);
    const tip = new THREE.Vector3(strikeRoot.x + fx * STRIKE_REACH, 0.85, strikeRoot.z + fz * STRIKE_REACH);
    spawnFlash(tip, 0xfff0a0, 0.62, 0.14);
    return addEffect({
      t: 0,
      update(dt) {
        this.t += dt;
        const u = this.t / life;
        if (u >= 1) {
          for (const bolt of bolts) { freeBolt(bolt); bolt.mat.color.setHex(0xfff3b0); }
          return false;
        }
        for (let i = 0; i < bolts.length; i += 1) {
          const spread = (Math.random() - 0.5) * 1.7;
          const fwd = 0.15 + Math.random() * (STRIKE_REACH + 0.25);
          const start = new THREE.Vector3(
            strikeRoot.x + fx * (0.1 + Math.random() * 0.3) + lx * (Math.random() - 0.5) * 0.5,
            0.5 + Math.random() * 0.85,
            strikeRoot.z + fz * (0.1 + Math.random() * 0.3) + lz * (Math.random() - 0.5) * 0.5,
          );
          const end = new THREE.Vector3(
            strikeRoot.x + fx * fwd + lx * spread,
            0.35 + Math.random() * 1.1,
            strikeRoot.z + fz * fwd + lz * spread,
          );
          bolts[i].draw(start, end, 0.3, 0.06 + Math.random() * 0.04);
          bolts[i].mat.opacity = (1 - u) * (1 - u);
        }
        if (u < 0.6) {
          for (const target of liveTargets()) {
            if (hitSet.has(target)) continue;
            const dx = target.pos.x - strikeRoot.x;
            const dz = target.pos.z - strikeRoot.z;
            const forwardDistance = dx * fx + dz * fz;
            const lateralDistance = Math.abs(dx * Math.cos(angle) - dz * Math.sin(angle));
            if (forwardDistance < -0.35 || forwardDistance > STRIKE_REACH + ENEMY_R || lateralDistance > STRIKE_HALF_WIDTH + ENEMY_R) continue;
            hitSet.add(target);
            hitEnemy(target, dmg, 10, fx, fz);
            spawnStar(new THREE.Vector3(target.pos.x, 0.95, target.pos.z), 0.28, 0.2);
          }
        }
        return true;
      },
    });
  }

  // Copied source effect: broad ragged electric wedge plus independent hit set.
  function spawnSparkArc({ root: arcRoot, angle, dmg, shock, life }) {
    const segmentCount = 30;
    const holder = new THREE.Group();
    holder.position.set(arcRoot.x, 0, arcRoot.z);
    holder.rotation.y = angle;
    const spin = new THREE.Group();
    spin.rotation.y = -Math.PI / 2;
    holder.add(spin);
    sourceScene.add(holder);
    const arcGeometry = new THREE.RingGeometry(0.5, ARC_R, segmentCount, 4, -ARC_HALF_ANGLE, ARC_HALF_ANGLE * 2);
    const baseColor = new THREE.Color(shock ? 0xbde9ff : SPARK_PALE);
    const positions = arcGeometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i), y = positions.getY(i);
      const radius = Math.hypot(x, y);
      const theta = Math.abs(Math.atan2(y, x));
      const radial = 1 - clamp01((radius - 0.5) / (ARC_R - 0.5));
      const angular = 1 - clamp01((theta - ARC_HALF_ANGLE * 0.35) / (ARC_HALF_ANGLE * 0.65));
      const k = radial * radial * angular;
      colors[i * 3] = baseColor.r * k;
      colors[i * 3 + 1] = baseColor.g * k;
      colors[i * 3 + 2] = baseColor.b * k;
    }
    arcGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const arcMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(arcGeometry, arcMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.09;
    mesh.scale.set(0.28, 0.28, 1);
    spin.add(mesh);
    const bolts = [];
    for (let i = 0; i < 16; i += 1) {
      const bolt = takeBolt();
      bolt.mat.color.setHex(shock ? (i % 3 ? 0x9fe0ff : 0xdcf4ff) : (i % 3 ? SPARK_CORE : SPARK_PALE));
      bolts.push(bolt);
    }
    const hitSet = new Set();
    return addEffect({
      t: 0,
      update(dt) {
        this.t += dt;
        const u = this.t / life;
        if (u >= 1) {
          sourceScene.remove(holder);
          arcGeometry.dispose();
          arcMaterial.dispose();
          for (const bolt of bolts) { freeBolt(bolt); bolt.mat.color.setHex(0xfff3b0); }
          return false;
        }
        const grow = easeOutQuart(clamp01(u / 0.3));
        const scale = 0.28 + grow * 0.9;
        mesh.scale.set(scale, scale, 1);
        arcMaterial.opacity = 0.6 * (1 - u);
        for (let i = 0; i < bolts.length; i += 1) {
          const theta = (Math.random() * 2 - 1) * ARC_HALF_ANGLE;
          const a = angle + theta;
          const r0 = (0.2 + Math.random() * 0.9) * scale;
          const r1 = (1.0 + Math.random() * (ARC_R - 1.0)) * scale;
          const inner = new THREE.Vector3(arcRoot.x + Math.sin(a) * r0, 0.25 + Math.random() * 0.7, arcRoot.z + Math.cos(a) * r0);
          const outer = new THREE.Vector3(arcRoot.x + Math.sin(a) * r1, 0.25 + Math.random() * 0.9, arcRoot.z + Math.cos(a) * r1);
          bolts[i].draw(inner, outer, 0.5, 0.055 + Math.random() * 0.05);
          bolts[i].mat.opacity = (1 - u) * (0.7 + Math.random() * 0.3);
        }
        if (u < 0.55) {
          const reach = ARC_R * scale;
          for (const target of liveTargets()) {
            if (hitSet.has(target)) continue;
            const dx = target.pos.x - arcRoot.x;
            const dz = target.pos.z - arcRoot.z;
            const distance = Math.hypot(dx, dz);
            if (distance > reach + ENEMY_R) continue;
            let delta = Math.atan2(dx, dz) - angle;
            while (delta > Math.PI) delta -= TAU;
            while (delta < -Math.PI) delta += TAU;
            if (Math.abs(delta) > ARC_HALF_ANGLE + 0.16) continue;
            hitSet.add(target);
            const directionLength = distance || 1;
            hitEnemy(target, dmg, 10, dx / directionLength, dz / directionLength, { big: true, shock });
            spawnStar(new THREE.Vector3(target.pos.x, 0.95, target.pos.z), 0.46, 0.26);
            hitstop = Math.max(hitstop, 0.05);
          }
        }
        return true;
      },
    });
  }

  function beatTiming(index) {
    if (currentArc === 'vine') return index === 2 && enhanced ? TIMING.vineEnhancedFinal : TIMING.vine[index];
    return TIMING.spark[index];
  }

  function sourceFrame(context = {}) {
    const player = getPlayer?.() || {};
    const origin = vectorPosition(THREE, context.origin || player.position || player);
    const direction = directionFrom(context.direction || player.forward || player);
    const localOrigin = toSourcePosition(origin);
    pstate.pos.copy(localOrigin);
    pstate.facing = Math.atan2(direction.x, direction.z);
    return { origin: localOrigin, direction, angle: pstate.facing };
  }

  function startBeat(index, context = {}) {
    if (index === 0) combo.events.length = 0;
    combo.beat = index;
    combo.phase = 'windup';
    combo.t = 0;
    combo.queued = false;
    combo.frame = sourceFrame(context);
    const timing = beatTiming(index);
    if (timing.step) {
      pstate.lunge.set(Math.sin(combo.frame.angle) * timing.step * 9, 0, Math.cos(combo.frame.angle) * timing.step * 9);
    }
    pstate.lean = 1;
  }

  function fireBeat(index) {
    const frame = combo.frame || sourceFrame();
    const rootPosition = new THREE.Vector3(frame.origin.x, 0.95, frame.origin.z);
    const right = { x: frame.direction.z, z: -frame.direction.x };
    if (currentArc === 'vine') {
      if (index < 2) {
        const side = index === 0 ? 1 : -1;
        const handRoot = new THREE.Vector3(frame.origin.x + right.x * 0.34 + frame.direction.x * 0.16, 0.95, frame.origin.z + right.z * 0.34 + frame.direction.z * 0.16);
        spawnVineWhip({ root: handRoot, angle: frame.angle, from: 0.79 * side, to: -0.79 * side, dmg: 7, kb: index === 0 ? 6 : 12, life: beatTiming(index).active + 0.06 });
      } else if (!enhanced) {
        spawnVineBundle({ root: rootPosition, angle: frame.angle, dmg: 15, kb: 8, life: 0.26, seed: 0.4 });
      } else {
        for (let k = 0; k < 3; k += 1) {
          scheduled.push({ t: k * 0.14, fn: () => {
            const rootNow = new THREE.Vector3(pstate.pos.x, 0.95, pstate.pos.z);
            spawnVineBundle({ root: rootNow, angle: frame.angle, dmg: 9, kb: 8, life: 0.24, seed: k * 1.7 });
          } });
        }
      }
      return;
    }
    const damage = [6, 7, 8, 9][index];
    spawnSparkStrike({ root: rootPosition, angle: frame.angle, dmg: damage, life: 0.16 });
    if (index === 3) spawnSparkArc({ root: rootPosition, angle: frame.angle, dmg: 10, shock: enhanced, life: 0.42 });
  }

  const combo = {
    beat: -1,
    phase: 'idle',
    t: 0,
    idle: 0,
    queued: false,
    frame: null,
    events: [],
  };

  function updateCombo(dt) {
    for (let i = scheduled.length - 1; i >= 0; i -= 1) {
      scheduled[i].t -= dt;
      if (scheduled[i].t <= 0) {
        const task = scheduled[i].fn;
        scheduled.splice(i, 1);
        task();
      }
    }
    if (combo.phase === 'idle') {
      combo.idle += dt;
      if (combo.beat >= 0 && combo.idle > COMBO_RESET) combo.beat = -1;
      return;
    }
    const timing = beatTiming(combo.beat);
    combo.t += dt;
    if (combo.phase === 'windup' && combo.t >= timing.windup) {
      combo.t -= timing.windup;
      combo.phase = 'active';
      fireBeat(combo.beat);
    } else if (combo.phase === 'active' && combo.t >= timing.active) {
      combo.t -= timing.active;
      combo.phase = 'recover';
    } else if (combo.phase === 'recover' && combo.t >= timing.recover) {
      combo.phase = 'idle';
      combo.t = 0;
      combo.idle = 0;
      if (combo.queued) startBeat(combo.beat + 1 >= ARCANA[currentArc].beats ? 0 : combo.beat + 1, combo.frameContext || {});
    }
  }

  function updateTargets(dt) {
    for (const target of liveTargets()) {
      const previous = target.pos.clone();
      target.pos.addScaledVector(target.vel, dt);
      target.vel.multiplyScalar(Math.max(0, 1 - dt * 6));
      const back = target.anchor.clone().sub(target.pos);
      const distance = back.length();
      if (distance > 0.02) target.pos.addScaledVector(back.normalize(), Math.min(distance, dt * 1.4));
      const arenaDistance = Math.hypot(target.pos.x, target.pos.z);
      if (arenaDistance > ARENA_R - 0.6) target.pos.multiplyScalar((ARENA_R - 0.6) / arenaDistance);
      target.lean.multiplyScalar(Math.max(0, 1 - dt * 7));
      target.flash = Math.max(0, target.flash - dt * 5);
      if (target.shock > 0) {
        target.shock -= dt;
        target.shockTick -= dt;
        if (target.shockTick <= 0) {
          target.shockTick = 0.12;
          onStatus?.(target.raw, 'shock-tick', { source: 'wizard-curated-basic', damage: 0, stableId: target.id });
        }
      }
      writeTargetPosition(target, previous);
    }
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const effect = effects[i];
      if (effect.update(dt) === false) {
        effects.splice(i, 1);
        effect.dispose?.();
      }
    }
  }

  function cast(id, context = {}) {
    if (disposed) return false;
    const arc = normalizeId(id);
    if (!arc) return false;
    if (arc !== currentArc) {
      currentArc = arc;
      combo.beat = -1;
      combo.phase = 'idle';
      combo.t = 0;
      combo.queued = false;
    }
    enhanced = context.enhanced === true;
    combo.frameContext = { ...context };
    if (combo.phase === 'idle') {
      startBeat(combo.beat + 1 >= ARCANA[currentArc].beats || combo.beat < 0 ? 0 : combo.beat + 1, context);
    } else {
      combo.queued = true;
    }
    return true;
  }

  function update(dt = 0) {
    if (disposed) return;
    const delta = Math.max(0, Number(dt) || 0);
    now += delta;
    syncTargets();
    updateCombo(delta);
    updateTargets(delta);
    if (hitstop > 0) hitstop = Math.max(0, hitstop - delta);
    updateEffects(delta * (hitstop > 0 ? 0.22 : 1));
  }

  function clearEffects() {
    for (const effect of [...effects]) removeEffect(effect);
    effects.length = 0;
    scheduled.length = 0;
    for (const strand of strandPool) { strand.busy = false; strand.group.visible = false; }
    for (const bolt of boltPool) { bolt.busy = false; bolt.group.visible = false; }
  }

  function reset() {
    clearEffects();
    now = 0;
    currentArc = 'vine';
    enhanced = false;
    hitstop = 0;
    combo.beat = -1;
    combo.phase = 'idle';
    combo.t = 0;
    combo.idle = 0;
    combo.queued = false;
    combo.frame = null;
    combo.frameContext = null;
    for (const target of targetById.values()) {
      target.pos.copy(target.anchor);
      target.vel.set(0, 0, 0);
      target.hp = target.maxHp;
      target.shock = 0;
      if (target.raw) {
        const world = toWorldPosition(target.pos);
        onMoveTarget?.(target.raw, { x: world.x, z: world.z }, { source: 'wizard-curated-basic', reason: 'reset', stableId: target.id });
      }
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clearEffects();
    disposeObject(root);
    for (const geometry of [segGeo, thornGeo, leafGeo, boltGeo, flashGeo, rayGeo, coreGeo, ringGeo]) geometry.dispose?.();
    for (const strand of strandPool) {
      disposeMaterial([strand.mat, strand.tipMat, strand.thornMat, strand.leafMat]);
    }
    for (const bolt of boltPool) bolt.mat.dispose?.();
  }

  function snapshot() {
    return {
      source: 'wizard-of-legend-arcana-demo-1 ae.html',
      sha256: '11058c5d3088ce242ad942c93c50de7308d1b99ca96fe75c4175f7be40d00844',
      arcana: ARCANA[currentArc].name,
      enhanced,
      size: sourceSize,
      time: now,
      combo: { beat: combo.beat, phase: combo.phase, t: combo.t, queued: combo.queued },
      effects: effects.length,
      targets: liveTargets().map(target => ({ stableId: target.id, x: target.pos.x, z: target.pos.z, hp: target.hp, shock: target.shock })),
    };
  }

  return { root, cast, update, reset, dispose, snapshot };
}

export { ARCANA as WIZARD_CURATED_BASIC_ARCANA, TIMING as WIZARD_CURATED_BASIC_TIMING };
