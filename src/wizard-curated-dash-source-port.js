/*
 * Curated Wizard of Legend dash source ports.
 *
 * Source lineage (effect geometry, palette, particles, timing and collision
 * tests are copied from these exact standalone uploads):
 *   wol-air-dash-arcana-phone-demo.html
 *   SHA-256 8acef3757c97d29da994a14bf211180d6379922e03ac712538e3d76c33cf6d5c
 *   wizard-of-legend-thunder-circuit-line.html
 *   SHA-256 97529cca31afdebe8ef30a8bcba64f5ad921319e97bc95d94224f15f849fd4f7
 *
 * Only the standalone DOM/input/renderer shell is removed. The factories
 * expose the common adapter API while retaining source-local VFX and combat
 * math. Casts default to the source base form; callers may opt into the
 * source's enhanced mutation with context.enhanced === true.
 */

const clamp = (value, min, max) => value < min ? min : value > max ? max : value;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
const easeOutQuad = value => 1 - Math.pow(1 - clamp(value, 0, 1), 2);
const TAU = Math.PI * 2;
const finite = value => Number.isFinite(Number(value));

export const GUST_BURST_SOURCE_CFG = Object.freeze({
  maxCharges: 2,
  chargeCooldown: 3.5,
  dash: Object.freeze({ dist: 4.4, time: 0.22 }),
  gather: Object.freeze({ at: 0.05, dmg: 5, radius: 2.7, lead: 1.00, compress: 0.30, moveTime: 0.16 }),
  draught: Object.freeze({ at: 0.21, dmg: 10, moveTime: 0.24, gap: 1.00 }),
  endpoint: Object.freeze({ at: 0.50, dmg: 5, radius: 2.4 }),
});

export const RAZOR_BURST_SOURCE_CFG = Object.freeze({
  cooldown: 5.12,
  dash: Object.freeze({ dist: 4.4, time: 0.22 }),
  base: Object.freeze({ life: 1.00, hits: 5 }),
  enhanced: Object.freeze({ life: 1.50, hits: 7 }),
  dmg: 4,
  radius: 2.1,
  pull: 3.4,
  minRadius: 0.35,
  slow: Object.freeze({ mult: 0.42, time: 0.9 }),
});

export const THUNDER_LINE_SOURCE_ARCANA = Object.freeze({
  thunder: Object.freeze({
    id: 'thunder', name: 'THUNDER LINE', element: 'Lightning', type: 'Dash', subtype: 'Movement',
    maxCharges: 2, cooldown: 5, coreDamage: 10, burstDamage: 10, coreRadius: 0.85,
    burstRadius: 2.9, burstRadiusEnh: 4.6, shockTicks: 6, shockTicksEnh: 10,
  }),
  circuit: Object.freeze({
    id: 'circuit', name: 'CIRCUIT LINE', element: 'Lightning', type: 'Dash', subtype: 'Movement',
    maxCharges: 3, cooldown: 4, armDelay: 1.5, linkRange: 7.0, streamRadius: 0.62,
    tickDamage: 2, baseHits: 6, baseHitsEnh: 8,
  }),
});

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

function normalizeId(id) {
  const text = String(id || '').trim().toLowerCase().replace(/[ _]+/g, '-');
  if (text.includes('gust')) return 'gust';
  if (text.includes('razor')) return 'razor';
  if (text.includes('thunder')) return 'thunder';
  if (text.includes('circuit')) return 'circuit';
  return null;
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

function makeFallbackTexture(THREE) {
  return THREE.Texture ? new THREE.Texture() : null;
}

function createCanvas2d(width, height) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeRadialTexture(THREE, inner, outer, power) {
  const size = 128;
  const canvas = createCanvas2d(size, size);
  if (!canvas || !THREE.CanvasTexture) return makeFallbackTexture(THREE);
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    const alpha = Math.pow(1 - t, power);
    gradient.addColorStop(t, `rgba(${inner},${(alpha * outer).toFixed(3)})`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeStarTexture(THREE) {
  const size = 128;
  const canvas = createCanvas2d(size, size);
  if (!canvas || !THREE.CanvasTexture) return makeFallbackTexture(THREE);
  const context = canvas.getContext('2d');
  context.translate(size / 2, size / 2);
  function spike(length, width) {
    context.beginPath();
    context.moveTo(0, -length);
    context.lineTo(width, 0);
    context.lineTo(0, length);
    context.lineTo(-width, 0);
    context.closePath();
    context.fill();
  }
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 22);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, 22, 0, 6.284);
  context.fill();
  context.fillStyle = 'rgba(255,255,255,.95)';
  spike(62, 6);
  context.rotate(Math.PI / 2);
  spike(48, 5);
  context.rotate(-Math.PI / 4);
  spike(24, 3);
  context.rotate(Math.PI / 2);
  spike(24, 3);
  return new THREE.CanvasTexture(canvas);
}

function makeStreakTexture(THREE) {
  const width = 128, height = 32;
  const canvas = createCanvas2d(width, height);
  if (!canvas || !THREE.CanvasTexture) return makeFallbackTexture(THREE);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,.65)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,.95)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const vertical = context.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, 'rgba(0,0,0,1)');
  vertical.addColorStop(0.5, 'rgba(0,0,0,0)');
  vertical.addColorStop(1, 'rgba(0,0,0,1)');
  context.globalCompositeOperation = 'destination-out';
  context.fillStyle = vertical;
  context.fillRect(0, 0, width, height);
  return new THREE.CanvasTexture(canvas);
}

export function createWizardCuratedDashSourcePort(options = {}) {
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
    startDashMotion = () => {},
    size: optionSize = 1,
  } = options;
  if (!THREE || !worldScene) throw new Error('Wizard curated dash source port requires THREE and scene.');

  const root = new THREE.Group();
  root.name = 'Wizard curated dash source port';
  (parent || worldScene).add(root);
  const sourceScene = root;
  const camera = worldCamera || new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  const sourceSize = Math.max(0.001, Number(optionSize) || 1);
  root.scale.setScalar(sourceSize);
  const TEX = {
    glow: makeRadialTexture(THREE, '255,255,255', 1, 2.2),
    smoke: makeRadialTexture(THREE, '220,226,232', 1, 1.5),
    star: makeStarTexture(THREE),
    shadow: makeRadialTexture(THREE, '0,0,0', 1, 1.8),
    streak: makeStreakTexture(THREE),
  };

  const effects = [];
  const timers = [];
  const targetById = new Map();
  const vortices = [];
  const player = {
    pos: new THREE.Vector3(),
    face: new THREE.Vector3(0, 0, 1),
    dash: null,
  };
  const gust = { charges: GUST_BURST_SOURCE_CFG.maxCharges, cd: 0 };
  const razor = { cd: 0 };
  const state = { time: 0, enhanced: false, lastGustEvents: 0, baseRazorSeen: false };
  const HALF = 15;
  let disposed = false;

  function addFx(object, life, update) {
    const effect = { obj: object, t: 0, life, update };
    effects.push(effect);
    sourceScene.add(object);
    return effect;
  }

  function removeFx(effect) {
    sourceScene.remove(effect.obj);
    disposeObject(effect.obj);
    const index = effects.indexOf(effect);
    if (index >= 0) effects.splice(index, 1);
  }

  function targetId(raw, index) {
    const explicit = raw?.stableId ?? raw?.__abilityCaptureDummyId ?? raw?.id ?? raw?.spawnId ?? raw?.captureId;
    return explicit === undefined || explicit === null ? `target-${index}` : String(explicit);
  }

  function toSourcePosition(worldPosition) {
    const position = worldPosition.clone();
    if (root.parent) {
      root.updateMatrixWorld(true);
      root.worldToLocal(position);
    } else position.divideScalar(sourceSize);
    return position;
  }

  function toWorldPosition(sourcePosition) {
    const position = sourcePosition.clone();
    if (root.parent) {
      root.updateMatrixWorld(true);
      root.localToWorld(position);
    } else position.multiplyScalar(sourceSize);
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
          home: new THREE.Vector3(),
          hp: Number(raw.hp) || Number(raw.maxHp) || 120,
          slow: 0,
          dead: 0,
          hitFlash: 0,
          tween: null,
          gustMark: 0,
          wob: 0,
        };
        targetById.set(id, target);
      }
      target.raw = raw;
      const position = toSourcePosition(vectorPosition(THREE, raw?.pos || raw?.position || raw));
      if (!target.initialized) {
        target.home.copy(position);
        target.initialized = true;
      }
      target.pos.copy(position);
      if (finite(raw.hp)) target.hp = Number(raw.hp);
    }
    for (const [id, target] of targetById) if (!seen.has(id)) target.raw = null;
  }

  function liveTargets() {
    return [...targetById.values()].filter(target => target.raw);
  }

  function writeTargetPosition(target, previous, reason) {
    const dx = target.pos.x - previous.x;
    const dz = target.pos.z - previous.z;
    if (Math.abs(dx) + Math.abs(dz) < 1e-8) return;
    const world = toWorldPosition(target.pos);
    onMoveTarget?.(target.raw, { x: world.x, z: world.z }, { source: 'wizard-curated-dash', reason, stableId: target.id });
  }

  function hitDummy(target, amount) {
    if (target.dead > 0) return false;
    target.hp -= amount;
    target.hitFlash = 0.12;
    onDamage?.(target.raw, amount, { source: 'wizard-curated-dash', arcana: state.activeArcana, stableId: target.id });
    if (target.hp <= 0) {
      target.dead = 1.4;
      dustAt(target.pos.x, target.pos.z, 1.6);
      onStatus?.(target.raw, 'DUMMY DOWN', { source: 'wizard-curated-dash', stableId: target.id });
    }
    return true;
  }

  function inRadius(target, cx, cz, radius) {
    if (target.dead > 0) return false;
    const dx = target.pos.x - cx, dz = target.pos.z - cz;
    return dx * dx + dz * dz <= radius * radius;
  }

  function setTween(target, to, duration) {
    target.tween = { from: target.pos.clone(), to: to.clone(), t: 0, dur: duration };
  }

  function clampToArena(position) {
    const limit = HALF - 0.9;
    position.x = clamp(position.x, -limit, limit);
    position.z = clamp(position.z, -limit, limit);
    return position;
  }

  function windMat(opacity) {
    return new THREE.MeshBasicMaterial({ color: 0xe6f1f8, transparent: true, opacity, fog: false, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  }

  // Exact source swirl: four torus crescent arms plus a glow core.
  function makeSwirl(radii, arcs, tube) {
    const group = new THREE.Group();
    for (let i = 0; i < radii.length; i += 1) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radii[i], tube * (i === 0 ? 1.25 : 1), 5, 28, arcs[i]), windMat(1));
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = Math.random() * 6.28;
      mesh.userData.spin = (i % 2 ? -1 : 1) * (5.5 + i * 1.6);
      group.add(mesh);
    }
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xf2f9ff, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    core.scale.set(radii[0] * 2.4, radii[0] * 2.4, 1);
    core.position.y = 0.25;
    group.add(core);
    group.userData.core = core;
    return group;
  }

  function spinSwirl(group, dt, alpha) {
    for (const child of group.children) {
      if (child.userData.spin) {
        child.rotation.z += child.userData.spin * dt;
        child.material.opacity = alpha;
      }
    }
    if (group.userData.core) group.userData.core.material.opacity = 0.65 * alpha;
  }

  function flashAt(x, z, size, y) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.star, color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sprite.position.set(x, y === undefined ? 0.7 : y, z);
    sprite.scale.set(0.2, 0.2, 1);
    addFx(sprite, 0.26, effect => {
      const p = effect.t / effect.life;
      const scale = size * easeOutCubic(clamp(p * 2.2, 0, 1));
      effect.obj.scale.set(scale, scale, 1);
      effect.obj.material.opacity = 1 - easeOutQuad(p);
    });
  }

  function dustAt(x, z, size) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.smoke, color: 0xcfd8de, transparent: true, opacity: 0.5, blending: THREE.NormalBlending, depthWrite: false }));
    sprite.position.set(x, 0.28, z);
    sprite.scale.set(size, size, 1);
    addFx(sprite, 0.55, effect => {
      const p = effect.t / effect.life;
      const scale = size * (1 + p * 1.4);
      effect.obj.scale.set(scale, scale, 1);
      effect.obj.position.y = 0.28 + p * 0.35;
      effect.obj.material.opacity = 0.5 * (1 - p);
    });
  }

  function draughtStreak(from, to) {
    const direction = to.clone().sub(from);
    const length = direction.length();
    if (length < 0.05) return;
    direction.normalize();
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.PlaneGeometry(length, 1.5), new THREE.MeshBasicMaterial({ map: TEX.streak, color: 0xe6f1f8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    body.rotation.x = -Math.PI / 2;
    group.add(body);
    for (let i = 0; i < 3; i += 1) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.12, 0.05, 5, 20, 2.2), windMat(0.8));
      arc.rotation.x = -Math.PI / 2;
      arc.userData.k = i;
      arc.position.x = -length / 2 + 0.4;
      group.add(arc);
    }
    group.position.set((from.x + to.x) / 2, 0.45, (from.z + to.z) / 2);
    group.rotation.y = Math.atan2(direction.x, direction.z) - Math.PI / 2;
    addFx(group, 0.34, (effect, dt) => {
      const p = effect.t / effect.life;
      body.material.opacity = 0.85 * (1 - easeOutQuad(p));
      body.scale.y = lerp(1, 0.45, p);
      for (let i = 1; i < effect.obj.children.length; i += 1) {
        const child = effect.obj.children[i];
        child.rotation.z += 9 * (i % 2 ? 1 : -1) * dt;
        child.position.x = lerp(-length / 2 + 0.4, length / 2 - 0.3, easeOutCubic(clamp(p * 1.3 - child.userData.k * 0.12, 0, 1)));
        child.material.opacity = 0.8 * (1 - p);
      }
    });
  }

  function damagePhaseTargets(list, amount, reason) {
    for (const target of list) {
      if (!target || target.dead > 0) continue;
      hitDummy(target, amount);
    }
    return list.filter(target => target && target.dead <= 0).length;
  }

  // Exact source Gust Burst phase scheduler: dash, gather/pull, draught/carry,
  // then enhanced endpoint burst. It never collapses the first two contacts.
  function castGust(context = {}) {
    if (gust.charges <= 0 || player.dash) return false;
    gust.charges -= 1;
    if (gust.cd <= 0) gust.cd = GUST_BURST_SOURCE_CFG.chargeCooldown;
    const enhanced = context.enhanced === true;
    state.enhanced = enhanced;
    state.activeArcana = 'Gust Burst';
    const frame = readPlayerFrame(context);
    const origin = frame.origin.clone();
    const direction = frame.direction;
    const endpoint = origin.clone().add(new THREE.Vector3(direction.x, 0, direction.z).multiplyScalar(GUST_BURST_SOURCE_CFG.dash.dist));
    clampToArena(endpoint);
    startDash(origin, endpoint, direction, GUST_BURST_SOURCE_CFG.dash.time, 'GUST-BURST');
    const C = GUST_BURST_SOURCE_CFG;
    const gatherCentre = origin.clone().add(new THREE.Vector3(direction.x, 0, direction.z).multiplyScalar(C.gather.lead));
    clampToArena(gatherCentre);
    const caught = [];
    schedule(C.gather.at, () => {
      const swirl = makeSwirl([0.55, 1.0, 1.45, 1.9], [4.2, 3.4, 2.8, 2.2], 0.055);
      swirl.position.set(gatherCentre.x, 0.35, gatherCentre.z);
      addFx(swirl, 0.34, (effect, dt) => {
        const p = effect.t / effect.life;
        const scale = lerp(1.35, 0.45, easeOutCubic(p));
        effect.obj.scale.set(scale, scale, scale);
        spinSwirl(effect.obj, dt, 1 - easeOutQuad(p));
      });
      flashAt(gatherCentre.x, gatherCentre.z, 3.0, 0.6);
      dustAt(gatherCentre.x, gatherCentre.z, 1.5);
      for (const target of liveTargets()) {
        if (!inRadius(target, gatherCentre.x, gatherCentre.z, C.gather.radius)) continue;
        hitDummy(target, C.gather.dmg);
        caught.push(target);
        target.gustMark = state.time;
        const offset = new THREE.Vector3(target.pos.x - gatherCentre.x, 0, target.pos.z - gatherCentre.z);
        const before = offset.length();
        const targetPosition = gatherCentre.clone().add(offset.normalize().multiplyScalar(Math.max(0.28, before * C.gather.compress)));
        clampToArena(targetPosition);
        setTween(target, targetPosition, C.gather.moveTime);
      }
      state.lastGustEvents = 1;
    });
    schedule(C.draught.at, () => {
      const destination = endpoint.clone().add(new THREE.Vector3(direction.x, 0, direction.z).multiplyScalar(-C.draught.gap));
      clampToArena(destination);
      draughtStreak(gatherCentre, destination);
      for (let index = 0; index < caught.length; index += 1) {
        const target = caught[index];
        if (!target || target.dead > 0) continue;
        hitDummy(target, C.draught.dmg);
        const ring = (index / Math.max(1, caught.length)) * TAU;
        const spread = 0.34 + 0.22 * (index % 3);
        const destinationTarget = new THREE.Vector3(destination.x + Math.cos(ring) * spread, 0, destination.z + Math.sin(ring) * spread);
        clampToArena(destinationTarget);
        setTween(target, destinationTarget, C.draught.moveTime);
      }
      state.lastGustEvents = 2;
    });
    if (enhanced) {
      schedule(C.endpoint.at, () => {
        const swirl = makeSwirl([0.5, 0.9, 1.3, 1.7], [4.2, 3.4, 2.8, 2.2], 0.05);
        swirl.position.set(endpoint.x, 0.35, endpoint.z);
        addFx(swirl, 0.30, (effect, dt) => {
          const p = effect.t / effect.life;
          const scale = lerp(1.25, 0.5, easeOutCubic(p));
          effect.obj.scale.set(scale, scale, scale);
          spinSwirl(effect.obj, dt, 1 - easeOutQuad(p));
        });
        flashAt(endpoint.x, endpoint.z, 2.6, 0.6);
        for (const target of liveTargets()) if (inRadius(target, endpoint.x, endpoint.z, C.endpoint.radius)) hitDummy(target, C.endpoint.dmg);
      });
    }
    return true;
  }

  function castRazor(context = {}) {
    if (razor.cd > 0 || player.dash) return false;
    razor.cd = RAZOR_BURST_SOURCE_CFG.cooldown;
    const enhanced = context.enhanced === true;
    state.enhanced = enhanced;
    state.activeArcana = 'Razor Burst';
    const frame = readPlayerFrame(context);
    const origin = frame.origin.clone();
    const direction = frame.direction;
    const endpoint = origin.clone().add(new THREE.Vector3(direction.x, 0, direction.z).multiplyScalar(RAZOR_BURST_SOURCE_CFG.dash.dist));
    clampToArena(endpoint);
    startDash(origin, endpoint, direction, RAZOR_BURST_SOURCE_CFG.dash.time, 'RAZOR-BURST');
    const tune = enhanced ? RAZOR_BURST_SOURCE_CFG.enhanced : RAZOR_BURST_SOURCE_CFG.base;
    const swirl = makeSwirl([0.55, 0.95, 1.35, 1.75], [4.4, 3.6, 3.0, 2.4], 0.055);
    swirl.position.set(origin.x, 0.35, origin.z);
    sourceScene.add(swirl);
    vortices.push({ obj: swirl, pos: origin.clone(), spawnPos: origin.clone(), t: 0, life: tune.life, hits: tune.hits, fired: 0, enh: enhanced, pulledSomething: false, slowedSomething: false, reHit: false, seen: new Map() });
    return true;
  }

  function updateVortices(dt) {
    const C = RAZOR_BURST_SOURCE_CFG;
    for (let i = vortices.length - 1; i >= 0; i -= 1) {
      const vortex = vortices[i];
      vortex.t += dt;
      const alpha = vortex.t < 0.08 ? vortex.t / 0.08 : (vortex.t > vortex.life - 0.22 ? clamp((vortex.life - vortex.t) / 0.22, 0, 1) : 1);
      spinSwirl(vortex.obj, dt, alpha);
      vortex.obj.position.set(vortex.pos.x, 0.35, vortex.pos.z);
      const breathe = 1 + Math.sin(vortex.t * 14) * 0.05;
      vortex.obj.scale.set(breathe, breathe, breathe);
      for (const target of liveTargets()) {
        if (target.dead > 0 || target.tween) continue;
        const dx = vortex.pos.x - target.pos.x, dz = vortex.pos.z - target.pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance > C.radius || distance < 1e-4) continue;
        const step = Math.min(C.pull * dt, Math.max(0, distance - C.minRadius));
        if (step > 0) {
          const previous = target.pos.clone();
          target.pos.x += (dx / distance) * step;
          target.pos.z += (dz / distance) * step;
          target.pulledSomething = true;
          writeTargetPosition(target, previous, 'razor-pull');
          vortex.pulledSomething = true;
        }
        target.slow = C.slow.time;
        vortex.slowedSomething = true;
      }
      const interval = vortex.life / vortex.hits;
      while (vortex.fired < vortex.hits && vortex.t >= 0.05 + vortex.fired * interval) {
        vortex.fired += 1;
        for (const target of liveTargets()) {
          if (!inRadius(target, vortex.pos.x, vortex.pos.z, C.radius)) continue;
          hitDummy(target, C.dmg);
          if (vortex.seen.get(target.id) && vortex.fired > 1) vortex.reHit = true;
          vortex.seen.set(target.id, true);
        }
        flashAt(vortex.pos.x, vortex.pos.z, 2.2, 0.6);
      }
      if (vortex.t >= vortex.life) {
        sourceScene.remove(vortex.obj);
        disposeObject(vortex.obj);
        vortices.splice(i, 1);
        dustAt(vortex.pos.x, vortex.pos.z, 1.3);
        state.baseRazorSeen ||= !vortex.enh;
      }
    }
  }

  function startDash(from, to, direction, duration, arcana) {
    player.dash = { from: from.clone(), to: to.clone(), t: 0, dur: duration, puff: 0 };
    player.face.set(direction.x, 0, direction.z);
    startDashMotion?.({
      arcana, from: toWorldPosition(from), to: toWorldPosition(to), duration,
      direction: { x: direction.x, z: direction.z }, source: 'wizard-curated-dash',
    });
  }

  function updateDash(dt) {
    const dash = player.dash;
    if (!dash) return;
    dash.t += dt;
    const p = clamp(dash.t / dash.dur, 0, 1);
    player.pos.lerpVectors(dash.from, dash.to, easeOutCubic(p));
    dash.puff -= dt;
    if (dash.puff <= 0) {
      dustAt(player.pos.x, player.pos.z, 0.85);
      dash.puff = 0.045;
    }
    if (p >= 1) player.dash = null;
  }

  function schedule(delay, callback) {
    timers.push({ t: delay, fn: callback });
  }

  function updateTimers(dt) {
    for (let i = timers.length - 1; i >= 0; i -= 1) {
      timers[i].t -= dt;
      if (timers[i].t <= 0) {
        const callback = timers[i].fn;
        timers.splice(i, 1);
        callback();
      }
    }
  }

  function readPlayerFrame(context = {}) {
    const playerValue = getPlayer?.() || {};
    const origin = toSourcePosition(vectorPosition(THREE, context.origin || playerValue.position || playerValue));
    const direction = directionFrom(context.direction || playerValue.forward || playerValue);
    player.pos.copy(origin);
    player.face.set(direction.x, 0, direction.z);
    return { origin, direction };
  }

  function updateTargets(dt) {
    for (const target of liveTargets()) {
      const previous = target.pos.clone();
      if (target.dead > 0) {
        target.dead -= dt;
        if (target.dead <= 0) {
          target.hp = 120;
          target.pos.copy(target.home);
          dustAt(target.pos.x, target.pos.z, 1.2);
        }
        writeTargetPosition(target, previous, 'respawn');
        continue;
      }
      if (target.slow > 0) target.slow -= dt;
      if (target.tween) {
        target.tween.t += dt;
        const p = clamp(target.tween.t / target.tween.dur, 0, 1);
        target.pos.lerpVectors(target.tween.from, target.tween.to, easeOutCubic(p));
        if (p >= 1) target.tween = null;
      } else {
        const toHome = target.home.clone().sub(target.pos);
        const distance = toHome.length();
        if (distance > 0.03) {
          const speed = 1.25 * (target.slow > 0 ? RAZOR_BURST_SOURCE_CFG.slow.mult : 1);
          target.pos.addScaledVector(toHome.normalize(), Math.min(speed * dt, distance));
        }
      }
      clampToArena(target.pos);
      target.hitFlash = Math.max(0, target.hitFlash - dt);
      writeTargetPosition(target, previous, target.tween ? 'source-tween' : 'home-drift');
    }
  }

  function updateFx(dt) {
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const effect = effects[i];
      effect.t += dt;
      effect.update(effect, dt);
      if (effect.t >= effect.life) removeFx(effect);
    }
  }

  function updateCooldowns(dt) {
    if (gust.charges < GUST_BURST_SOURCE_CFG.maxCharges) {
      gust.cd -= dt;
      if (gust.cd <= 0) {
        gust.charges += 1;
        gust.cd = gust.charges < GUST_BURST_SOURCE_CFG.maxCharges ? GUST_BURST_SOURCE_CFG.chargeCooldown : 0;
      }
    } else gust.cd = 0;
    if (razor.cd > 0) razor.cd = Math.max(0, razor.cd - dt);
  }

  function cast(id, context = {}) {
    if (disposed) return false;
    const arc = normalizeId(id);
    if (arc === 'gust') return castGust(context);
    if (arc === 'razor') return castRazor(context);
    return castLightning(arc, context);
  }

  // The lightning source is implemented below in the same factory so both
  // source-lineage Arcana share target/scene seams and cleanup semantics.
  let castLightning = () => false;

  function updateBase(dt = 0) {
    if (disposed) return;
    const delta = Math.max(0, Number(dt) || 0);
    state.time += delta;
    syncTargets();
    updateTimers(delta);
    updateDash(delta);
    updateVortices(delta);
    updateTargets(delta);
    updateFx(delta);
    updateCooldowns(delta);
    updateCircuit(delta, state.enhanced);
    updateEffects(delta);
  }

  function reset() {
    for (const effect of [...effects]) removeFx(effect);
    for (const vortex of vortices.splice(0)) { sourceScene.remove(vortex.obj); disposeObject(vortex.obj); }
    timers.length = 0;
    player.dash = null;
    gust.charges = GUST_BURST_SOURCE_CFG.maxCharges;
    gust.cd = 0;
    razor.cd = 0;
    state.time = 0;
    state.enhanced = false;
    state.lastGustEvents = 0;
    state.baseRazorSeen = false;
    circuit.nodes.length = 0;
    circuit.timer = 0;
    circuit.armed = false;
  }

  function snapshot() {
    return {
      source: ['wol-air-dash-arcana-phone-demo.html', 'wizard-of-legend-thunder-circuit-line.html'],
      sha256: {
        air: '8acef3757c97d29da994a14bf211180d6379922e03ac712538e3d76c33cf6d5c',
        lightning: '97529cca31afdebe8ef30a8bcba64f5ad921319e97bc95d94224f15f849fd4f7',
      },
      time: state.time,
      enhanced: state.enhanced,
      gustCharges: gust.charges,
      razorCooldown: razor.cd,
      thunderCharges: thunderState.charges,
      circuitCharges: circuitState.charges,
      effects: effects.length + effectsLightning.length,
      vortices: vortices.length,
      circuitNodes: circuit.nodes.length,
      targets: liveTargets().map(target => ({ stableId: target.id, x: target.pos.x, z: target.pos.z, hp: target.hp, dead: target.dead, slow: target.slow })),
    };
  }

  // ----------------------------- Lightning source port ------------------
  // The following block is copied from wizard-of-legend-thunder-circuit-line:
  // `makeRibbon`, `jagged`, `thunderStrike`, `circuitPlace`, `fireCircuit`,
  // `makeStream`, and their exact tick/collision behavior.
  const TICK = 0.125;
  const CIRCUIT_TICK = 0.11;
  const GROUND_Y = 0.06;
  const effectsLightning = [];
  const thunderState = { charges: THUNDER_LINE_SOURCE_ARCANA.thunder.maxCharges, recharge: 0 };
  const circuitState = { charges: THUNDER_LINE_SOURCE_ARCANA.circuit.maxCharges, recharge: 0 };
  const circuit = { nodes: [], timer: 0, armed: false };
  const UP = new THREE.Vector3(0, 1, 0);
  const ribbonA = new THREE.Vector3(), ribbonB = new THREE.Vector3(), ribbonSide = new THREE.Vector3(), ribbonTan = new THREE.Vector3();
  const TEX_GLOW = makeRadialTexture(THREE, '255,255,240', 1, 2.2);
  const TEX_SPARK = makeRadialTexture(THREE, '255,215,70', 1, 1.6);
  const sparkMax = 900;
  const sparkPos = new Float32Array(sparkMax * 3);
  const sparkCol = new Float32Array(sparkMax * 3);
  const sparkVel = new Float32Array(sparkMax * 3);
  const sparkLife = new Float32Array(sparkMax);
  const sparkDur = new Float32Array(sparkMax);
  let sparkHead = 0;
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparkPoints = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ size: 0.24, map: TEX_SPARK, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  sparkPoints.frustumCulled = false;
  sourceScene.add(sparkPoints);
  for (let i = 0; i < sparkMax; i += 1) sparkLife[i] = 1e9;

  function addLightningEffect(effect) { effectsLightning.push(effect); return effect; }
  function disposeLightningMesh(mesh) { sourceScene.remove(mesh); mesh.geometry?.dispose?.(); disposeMaterial(mesh.material); }
  function emitSpark(x, y, z, vx, vy, vz, duration, warm) {
    const index = sparkHead;
    sparkHead = (sparkHead + 1) % sparkMax;
    sparkPos[index * 3] = x; sparkPos[index * 3 + 1] = y; sparkPos[index * 3 + 2] = z;
    sparkVel[index * 3] = vx; sparkVel[index * 3 + 1] = vy; sparkVel[index * 3 + 2] = vz;
    sparkLife[index] = 0; sparkDur[index] = duration;
    sparkCol[index * 3] = 1; sparkCol[index * 3 + 1] = warm ? 0.88 : 0.98; sparkCol[index * 3 + 2] = warm ? 0.42 : 0.8;
  }
  function updateSparks(dt) {
    for (let i = 0; i < sparkMax; i += 1) {
      if (sparkLife[i] > sparkDur[i]) {
        if (sparkCol[i * 3] !== 0) sparkCol[i * 3] = sparkCol[i * 3 + 1] = sparkCol[i * 3 + 2] = 0;
        continue;
      }
      sparkLife[i] += dt;
      sparkVel[i * 3 + 1] -= 9 * dt;
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      if (sparkPos[i * 3 + 1] < 0.04) {
        sparkPos[i * 3 + 1] = 0.04;
        sparkVel[i * 3 + 1] *= -0.35;
        sparkVel[i * 3] *= 0.6;
        sparkVel[i * 3 + 2] *= 0.6;
      }
      let k = 1 - sparkLife[i] / sparkDur[i];
      k *= k;
      sparkCol[i * 3] = k; sparkCol[i * 3 + 1] = k * 0.86; sparkCol[i * 3 + 2] = k * 0.35;
    }
    sparkGeometry.attributes.position.needsUpdate = true;
    sparkGeometry.attributes.color.needsUpdate = true;
  }
  function makeRibbon(count, color, width, opacity) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 2 * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const index = [];
    for (let i = 0; i < count - 1; i += 1) { const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3; index.push(a, b, c, b, d, c); }
    geometry.setIndex(index);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.userData = { count, width, pos: positions };
    return mesh;
  }
  function writeRibbon(mesh, points, normal, taper) {
    const count = mesh.userData.count, positions = mesh.userData.pos, halfWidth = mesh.userData.width * 0.5, pointCount = points.length;
    for (let i = 0; i < count; i += 1) {
      const point = points[Math.min(i, pointCount - 1)];
      const previous = points[Math.max(0, Math.min(i, pointCount - 1) - 1)];
      const next = points[Math.min(pointCount - 1, Math.min(i, pointCount - 1) + 1)];
      ribbonTan.subVectors(next, previous);
      if (ribbonTan.lengthSq() < 1e-8) ribbonTan.set(0, 0, 1);
      ribbonSide.crossVectors(ribbonTan, normal);
      if (ribbonSide.lengthSq() < 1e-8) ribbonSide.set(1, 0, 0);
      ribbonSide.normalize();
      const t = i / (count - 1);
      const width = taper ? halfWidth * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0.001, t)))) : halfWidth;
      positions[i * 6] = point.x + ribbonSide.x * width;
      positions[i * 6 + 1] = point.y + ribbonSide.y * width;
      positions[i * 6 + 2] = point.z + ribbonSide.z * width;
      positions[i * 6 + 3] = point.x - ribbonSide.x * width;
      positions[i * 6 + 4] = point.y - ribbonSide.y * width;
      positions[i * 6 + 5] = point.z - ribbonSide.z * width;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
  }
  function jagged(a, b, count, amplitude, out, normal) {
    ribbonTan.subVectors(b, a);
    const length = ribbonTan.length();
    ribbonTan.normalize();
    ribbonSide.crossVectors(ribbonTan, normal || UP);
    if (ribbonSide.lengthSq() < 1e-8) ribbonSide.set(1, 0, 0);
    ribbonSide.normalize();
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      const point = out[i] || (out[i] = new THREE.Vector3());
      point.copy(a).addScaledVector(ribbonTan, length * t);
      const envelope = Math.sin(Math.PI * t);
      let offset = (Math.random() - 0.5) * 2 * amplitude * envelope;
      if (i > 0 && i < count - 1 && Math.random() < 0.28) offset *= 1.9;
      point.addScaledVector(ribbonSide, offset);
    }
    return out;
  }
  function addDecal(x, z, radius, duration, color, peak) {
    const geometry = new THREE.RingGeometry(radius * 0.88, radius * 1.02, 44);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: peak, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.03, z);
    sourceScene.add(mesh);
    let life = 0;
    return addLightningEffect({ update(dt) { life += dt; const k = life / duration; mesh.scale.setScalar(1 + k * 0.18); material.opacity = peak * (1 - k); return k < 1; }, dispose() { disposeLightningMesh(mesh); } });
  }
  function flashDisc(x, z, radius, duration, peak = 0.55) {
    const material = new THREE.MeshBasicMaterial({ map: TEX_GLOW, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: peak });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.04, z); sourceScene.add(mesh);
    let life = 0;
    return addLightningEffect({ update(dt) { life += dt; const k = life / duration; material.opacity = peak * Math.pow(1 - k, 1.8); mesh.scale.setScalar(1 + k * 0.5); return k < 1; }, dispose() { disposeLightningMesh(mesh); } });
  }
  function applyShock(target, ticks) {
    const wasOn = target.shockTicks > 0;
    target.shockTicks = Math.max(target.shockTicks || 0, ticks);
    target.shockLevel = ticks;
    if (!wasOn) { target.shockTimer = TICK; onStatus?.(target.raw, 'shock', { duration: ticks * TICK, ticks, source: 'wizard-curated-dash' }); }
  }
  function lightningDamage(target, amount, style) {
    target.flash = 1;
    onDamage?.(target.raw, amount, { source: 'wizard-curated-dash', arcana: state.activeArcana, style, stableId: target.id });
  }
  function updateShock(dt) {
    for (const target of liveTargets()) {
      if (target.shockTicks > 0) {
        target.shockTimer -= dt;
        if (target.shockTimer <= 0) {
          target.shockTimer += TICK;
          target.shockTicks -= 1;
          lightningDamage(target, 2, 'small');
        }
      }
    }
  }
  function thunderStrike(x, z, enhancedCast) {
    const A = THUNDER_LINE_SOURCE_ARCANA.thunder;
    const radius = enhancedCast ? A.burstRadiusEnh : A.burstRadius;
    const ticks = enhancedCast ? A.shockTicksEnh : A.shockTicks;
    const markPoints = [];
    const mark = makeRibbon(9, 0xffe14a, 0.13, 1);
    sourceScene.add(mark);
    const camDirection = new THREE.Vector3();
    const telegraph = 0.20;
    let phase = 'mark', life = 0, crackle = 0;
    const boltPoints = [];
    const boltOuter = makeRibbon(44, 0xffc823, enhancedCast ? 0.34 : 0.22, 0.85);
    const boltCore = makeRibbon(44, 0xfffdf0, enhancedCast ? 0.13 : 0.085, 1);
    boltOuter.visible = boltCore.visible = false;
    boltOuter.renderOrder = 8; boltCore.renderOrder = 9;
    sourceScene.add(boltOuter, boltCore);
    const arcs = enhancedCast ? 34 : 24;
    const ring = [];
    for (let i = 0; i < arcs; i += 1) {
      const mesh = makeRibbon(9, i % 4 === 0 ? 0xfff6c0 : 0xffce28, 0.13, 1);
      mesh.visible = false; mesh.renderOrder = 7; sourceScene.add(mesh); ring.push({ mesh, pts: [] });
    }
    const spokesCount = enhancedCast ? 8 : 5;
    const spokes = [];
    for (let i = 0; i < spokesCount; i += 1) {
      const mesh = makeRibbon(12, 0xffd94a, 0.09, 1);
      mesh.visible = false; mesh.renderOrder = 7; sourceScene.add(mesh); spokes.push({ mesh, pts: [], ang: (i / spokesCount) * TAU + Math.random() });
    }
    let ringScale = 0.34;
    const top = new THREE.Vector3(x, 12, z), hit = new THREE.Vector3(x, 0.05, z);
    const rebuildBolt = () => { camera.getWorldDirection(camDirection); jagged(top, hit, 44, enhancedCast ? 1.15 : 0.8, boltPoints, camDirection); writeRibbon(boltOuter, boltPoints, camDirection, false); writeRibbon(boltCore, boltPoints, camDirection, false); };
    const rebuildRing = () => {
      const r = radius * ringScale;
      for (let i = 0; i < ring.length; i += 1) {
        const band = i % 3 === 2 ? 0.55 : 1.0;
        const a0 = (i / arcs) * TAU + (band < 1 ? 0.4 : 0);
        const a1 = a0 + (TAU / arcs) * (band < 1 ? 2.1 : 1.25);
        const rr = r * band * (0.9 + Math.random() * 0.22), rr2 = r * band * (0.9 + Math.random() * 0.22);
        ribbonA.set(x + Math.cos(a0) * rr, GROUND_Y, z + Math.sin(a0) * rr);
        ribbonB.set(x + Math.cos(a1) * rr2, GROUND_Y, z + Math.sin(a1) * rr2);
        jagged(ribbonA, ribbonB, 9, r * 0.16, ring[i].pts, UP);
        writeRibbon(ring[i].mesh, ring[i].pts, UP, false);
      }
      for (let i = 0; i < spokes.length; i += 1) {
        const angle = spokes[i].ang + Math.random() * 0.3;
        ribbonA.set(x, GROUND_Y, z);
        ribbonB.set(x + Math.cos(angle) * r * 0.98, GROUND_Y, z + Math.sin(angle) * r * 0.98);
        jagged(ribbonA, ribbonB, 12, r * 0.14, spokes[i].pts, UP);
        writeRibbon(spokes[i].mesh, spokes[i].pts, UP, false);
      }
    };
    const rebuildMark = () => {
      camera.getWorldDirection(camDirection);
      const angle = Math.random() * TAU;
      ribbonA.set(x + Math.cos(angle) * 0.4, 0.08 + Math.random() * 0.3, z + Math.sin(angle) * 0.3);
      ribbonB.set(x + Math.cos(angle + 2.2) * 0.45, 0.08 + Math.random() * 0.4, z + Math.sin(angle + 2.2) * 0.3);
      jagged(ribbonA, ribbonB, 9, 0.22, markPoints, camDirection);
      writeRibbon(mark, markPoints, camDirection, true);
    };
    rebuildMark();
    let struck = false;
    const detonate = () => {
      for (const target of liveTargets()) {
        const dx = target.pos.x - x, dz = target.pos.z - z, distance = Math.sqrt(dx * dx + dz * dz);
        if (distance <= radius + (target.radius || 0.55)) {
          lightningDamage(target, A.burstDamage, 'big');
          applyShock(target, ticks);
          if (distance <= A.coreRadius + (target.radius || 0.55)) lightningDamage(target, A.coreDamage, 'big');
        }
      }
      flashDisc(x, z, radius * 0.85, 0.26, enhancedCast ? 0.5 : 0.4);
      const count = enhancedCast ? 130 : 80;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * TAU;
        const speed = (2.5 + Math.random() * 5.5) * (enhancedCast ? 1.25 : 1);
        emitSpark(x + Math.cos(angle) * 0.3, 0.15 + Math.random() * 0.4, z + Math.sin(angle) * 0.3, Math.cos(angle) * speed, 2 + Math.random() * 5, Math.sin(angle) * speed, 0.45 + Math.random() * 0.6, Math.random() < 0.5);
      }
    };
    const strikeDuration = enhancedCast ? 0.42 : 0.32;
    const ringDuration = enhancedCast ? 0.62 : 0.46;
    return addLightningEffect({
      update(dt) {
        life += dt; crackle -= dt;
        if (phase === 'mark') {
          if (crackle <= 0) { crackle = 0.05; rebuildMark(); }
          mark.material.opacity = 0.6 + Math.random() * 0.4;
          if (Math.random() < 0.4) emitSpark(x + (Math.random() - 0.5) * 0.7, 0.1, z + (Math.random() - 0.5) * 0.7, 0, 1.2 + Math.random(), 0, 0.3, true);
          if (life >= telegraph) {
            phase = 'strike'; mark.visible = false; boltOuter.visible = boltCore.visible = true;
            for (const item of ring) item.mesh.visible = true;
            for (const item of spokes) item.mesh.visible = true;
            rebuildBolt(); rebuildRing();
            if (!struck) { struck = true; detonate(); }
          }
          return true;
        }
        const t = life - telegraph;
        if (crackle <= 0) { crackle = 0.042; if (t < strikeDuration) rebuildBolt(); rebuildRing(); }
        const boltProgress = t / strikeDuration;
        const boltAlpha = boltProgress < 0.55 ? 1 : Math.max(0, 1 - (boltProgress - 0.55) / 0.45);
        boltOuter.material.opacity = 0.9 * boltAlpha * (0.8 + Math.random() * 0.2);
        boltCore.material.opacity = boltAlpha;
        if (boltProgress >= 1) boltOuter.visible = boltCore.visible = false;
        const ringProgress = t / ringDuration;
        ringScale = ringProgress < 0.16 ? 0.34 + (ringProgress / 0.16) * 0.66 : 1 + (ringProgress - 0.16) * 0.14;
        const ringAlpha = ringProgress < 0.55 ? 1 : Math.max(0, 1 - (ringProgress - 0.55) / 0.45);
        for (const item of ring) item.mesh.material.opacity = ringAlpha * (0.65 + Math.random() * 0.35);
        for (const item of spokes) item.mesh.material.opacity = ringAlpha * (0.5 + Math.random() * 0.5) * (ringProgress < 0.5 ? 1 : 0.4);
        return t < Math.max(strikeDuration, ringDuration);
      },
      dispose() {
        disposeLightningMesh(mark); disposeLightningMesh(boltOuter); disposeLightningMesh(boltCore);
        for (const item of ring) disposeLightningMesh(item.mesh);
        for (const item of spokes) disposeLightningMesh(item.mesh);
      },
    });
  }
  function makeNode(x, z) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfffbe0 }));
    group.add(core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_GLOW, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd23a }));
    glow.scale.set(1.5, 1.5, 1); group.add(glow); group.position.set(x, 0.42, z); sourceScene.add(group);
    return { group, glow, core, pos: new THREE.Vector3(x, 0.42, z), t: Math.random() * 6, alive: true };
  }
  function nodeSpark(node) { for (let i = 0; i < 4; i += 1) { const angle = Math.random() * TAU; emitSpark(node.pos.x, node.pos.y, node.pos.z, Math.cos(angle) * 1.4, 0.6 + Math.random(), Math.sin(angle) * 1.4, 0.3, true); } }
  function circuitPlace(x0, z0, x1, z1) {
    const A = THUNDER_LINE_SOURCE_ARCANA.circuit;
    const a = makeNode(x0, z0), b = makeNode(x1, z1);
    const last = circuit.nodes[circuit.nodes.length - 1];
    if (last && last.pos.distanceTo(a.pos) < 0.7) { sourceScene.remove(a.group); a.alive = false; }
    else circuit.nodes.push(a);
    circuit.nodes.push(b); nodeSpark(a.alive ? a : b); nodeSpark(b); circuit.timer = A.armDelay;
  }
  function fireCircuit(enhancedCast) {
    const A = THUNDER_LINE_SOURCE_ARCANA.circuit;
    const nodes = circuit.nodes.slice(); circuit.nodes.length = 0;
    const groups = [], first = [nodes[0]];
    if (!nodes.length) return;
    groups.push(first);
    for (let i = 1; i < nodes.length; i += 1) {
      const group = groups[groups.length - 1];
      if (nodes[i].pos.distanceTo(nodes[i - 1].pos) <= A.linkRange) group.push(nodes[i]); else groups.push([nodes[i]]);
    }
    const edges = [];
    for (const group of groups) {
      for (let i = 0; i < group.length - 1; i += 1) edges.push([group[i], group[i + 1]]);
      if (group.length >= 3 && group[group.length - 1].pos.distanceTo(group[0].pos) <= A.linkRange) edges.push([group[group.length - 1], group[0]]);
    }
    if (!edges.length) { for (const node of nodes) sourceScene.remove(node.group); return; }
    const hits = (enhancedCast ? A.baseHitsEnh : A.baseHits) + 2 * (edges.length - 1);
    for (const edge of edges) makeStream(edge[0], edge[1], hits, enhancedCast);
    let life = 0;
    addLightningEffect({ update(dt) { life += dt; for (const node of nodes) { node.t += dt * 22; const pulse = 0.9 + Math.sin(node.t) * 0.25; node.glow.scale.set(1.7 * pulse, 1.7 * pulse, 1); if (Math.random() < 0.12) nodeSpark(node); } return life < hits * CIRCUIT_TICK + 0.25; }, dispose() { for (const node of nodes) { nodeSpark(node); nodeSpark(node); sourceScene.remove(node.group); } } });
  }
  function updateCircuit(dt, enhancedCast) {
    if (!circuit.nodes.length) return;
    const A = THUNDER_LINE_SOURCE_ARCANA.circuit;
    circuit.timer -= dt;
    const urgency = 1 - Math.max(0, circuit.timer) / A.armDelay;
    for (const node of circuit.nodes) { node.t += dt * (6 + urgency * 26); const pulse = 0.85 + Math.sin(node.t) * (0.18 + urgency * 0.4); node.glow.scale.set(1.5 * pulse, 1.5 * pulse, 1); node.core.scale.setScalar(pulse); node.group.position.y = 0.42 + Math.sin(node.t * 0.35) * 0.05; if (Math.random() < 0.06 + urgency * 0.2) nodeSpark(node); }
    if (circuit.timer <= 0) fireCircuit(enhancedCast);
  }
  function makeStream(nodeA, nodeB, hits, enhancedCast) {
    const A = THUNDER_LINE_SOURCE_ARCANA.circuit;
    const a = new THREE.Vector3(nodeA.pos.x, 0.22, nodeA.pos.z), b = new THREE.Vector3(nodeB.pos.x, 0.22, nodeB.pos.z);
    const length = a.distanceTo(b), segments = Math.max(12, Math.min(40, Math.round(length * 3.4)));
    const outer = makeRibbon(segments, 0xffbe1e, enhancedCast ? 0.5 : 0.4, 0.85), core = makeRibbon(segments, 0xfffbe6, enhancedCast ? 0.17 : 0.13, 1);
    outer.renderOrder = 6; core.renderOrder = 7; sourceScene.add(outer, core);
    const pointsOuter = [], pointsCore = [], camDirection = new THREE.Vector3();
    const rebuild = () => { camera.getWorldDirection(camDirection); jagged(a, b, segments, 0.26, pointsOuter, UP); writeRibbon(outer, pointsOuter, UP, false); for (let i = 0; i < pointsOuter.length; i += 1) { pointsCore[i] = pointsCore[i] || new THREE.Vector3(); pointsCore[i].copy(pointsOuter[i]); pointsCore[i].y += 0.02; } writeRibbon(core, pointsCore, UP, false); };
    rebuild(); flashDisc((a.x + b.x) / 2, (a.z + b.z) / 2, length * 0.3, 0.2, 0.3);
    let life = 0, crackle = 0, tick = 0, fired = 0;
    const segment = new THREE.Vector3().subVectors(b, a), segmentLengthSq = segment.lengthSq();
    const tickDamage = () => {
      for (const target of liveTargets()) {
        const px = target.pos.x - a.x, pz = target.pos.z - a.z;
        let t = (px * segment.x + pz * segment.z) / segmentLengthSq;
        t = Math.max(0, Math.min(1, t));
        const cx = a.x + segment.x * t, cz = a.z + segment.z * t;
        const dx = target.pos.x - cx, dz = target.pos.z - cz;
        if (dx * dx + dz * dz <= Math.pow(A.streamRadius + (target.radius || 0.55), 2)) lightningDamage(target, A.tickDamage, 'small');
      }
      for (let i = 0; i < 3; i += 1) { const t = Math.random(); const x = a.x + segment.x * t, z = a.z + segment.z * t; emitSpark(x, 0.25, z, (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2, 0.35, true); }
    };
    addLightningEffect({ update(dt) { life += dt; crackle -= dt; tick -= dt; if (crackle <= 0) { crackle = 0.045; rebuild(); } if (tick <= 0 && fired < hits) { tick += CIRCUIT_TICK; fired += 1; tickDamage(); } const k = life / (hits * CIRCUIT_TICK + 0.18); const fade = k < 0.82 ? 1 : Math.max(0, 1 - (k - 0.82) / 0.18); outer.material.opacity = 0.85 * fade * (0.72 + Math.random() * 0.28); core.material.opacity = fade * (0.85 + Math.random() * 0.15); return k < 1; }, dispose() { disposeLightningMesh(outer); disposeLightningMesh(core); } });
  }

  castLightning = function castLightningSource(id, context = {}) {
    if (id !== 'thunder' && id !== 'circuit') return false;
    const sourceState = id === 'thunder' ? thunderState : circuitState;
    const A = THUNDER_LINE_SOURCE_ARCANA[id];
    if (sourceState.charges <= 0 || player.dash) return false;
    const wasFull = sourceState.charges === A.maxCharges;
    sourceState.charges -= 1;
    if (wasFull || sourceState.recharge <= 0) sourceState.recharge = A.cooldown;
    state.activeArcana = A.name;
    state.enhanced = context.enhanced === true;
    const frame = readPlayerFrame(context);
    const from = frame.origin.clone();
    const to = from.clone().add(new THREE.Vector3(frame.direction.x, 0, frame.direction.z).multiplyScalar(4.9));
    to.x = clamp(to.x, -19.5 + 1, 19.5 - 1);
    to.z = clamp(to.z, -19.5 + 1, 19.5 - 1);
    startDash(from, to, frame.direction, 0.16, id === 'thunder' ? 'THUNDER-LINE' : 'CIRCUIT-LINE');
    if (id === 'thunder') thunderStrike(from.x, from.z, state.enhanced);
    else circuitPlace(from.x, from.z, to.x, to.z);
    return true;
  };

  function updateLightningCharges(dt) {
    for (const [id, sourceState] of [['thunder', thunderState], ['circuit', circuitState]]) {
      const A = THUNDER_LINE_SOURCE_ARCANA[id];
      if (sourceState.charges < A.maxCharges) {
        sourceState.recharge -= dt;
        if (sourceState.recharge <= 0) { sourceState.charges += 1; sourceState.recharge = sourceState.charges < A.maxCharges ? A.cooldown : 0; }
      } else sourceState.recharge = 0;
    }
  }
  function updateLightningEffects(dt) {
    for (let i = effectsLightning.length - 1; i >= 0; i -= 1) {
      const effect = effectsLightning[i];
      if (effect.update(dt) === false) { effect.dispose?.(); effectsLightning.splice(i, 1); }
    }
  }

  // The complete shared loop runs after all source-local effect declarations.
  function update(dt = 0) {
    if (disposed) return;
    const delta = Math.max(0, Number(dt) || 0);
    state.time += delta;
    syncTargets();
    updateTimers(delta);
    updateDash(delta);
    updateVortices(delta);
    updateTargets(delta);
    updateShock(delta);
    updateFx(delta);
    updateCooldowns(delta);
    updateLightningCharges(delta);
    updateCircuit(delta, state.enhanced);
    updateLightningEffects(delta);
    updateSparks(delta);
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    reset();
    disposeObject(root);
    sparkGeometry.dispose?.();
    sparkPoints.material?.dispose?.();
    for (const texture of Object.values(TEX)) texture?.dispose?.();
    TEX_GLOW?.dispose?.();
    TEX_SPARK?.dispose?.();
  }

  return { cast, update, reset, dispose, snapshot };
}
