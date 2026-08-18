/*
 * Curated source port: wol-arcana-phone-demo.html
 * SHA-256: 8e1431126dba7dc7eade232161780b357201ef6b7fd72695bbcb4f12c54eaac8
 *
 * The authored constants, texture recipes, whip sampling, marker timing, and
 * collision rules below are copied from the standalone demo.  Only the boot,
 * HUD, arena, and entity seams are replaced: callers provide a parent scene,
 * player/target proxies, and gameplay callbacks.
 */

export const CURATED_FIRE_LARIAT = {
  cooldown: 5.5,
  slideDistance: 2.4,
  slideTime: 0.17,
  damage: 26,
  knockback: 20,
  sweepTime: 0.34,
  sweepArc: 330 * Math.PI / 180,
  sweep2Delay: 0.30,
  sweep2Offset: 150 * Math.PI / 180,
  reach: 5.2,
  reachEnhanced: 6.6,
  lag: 2.55,
  charged: {
    whips: 3,
    revolutions: 3,
    life: 2.0,
    reach: 6.0,
    reachEnhanced: 7.4,
    lag: 2.9,
    hitCooldown: 0.35,
  },
};

export const CURATED_FIRE_CHARGE = {
  maxCharges: 3,
  recharge: 3.5,
  dashDistance: 3.6,
  dashTime: 0.15,
  dashRadius: 1.15,
  contactDamage: 5,
  fuse: 1.0,
  blastDamage: 25,
  knockback: 25,
  blastRadius: 1.5,
};

export const CURATED_FIRE_BURN = { tick: 2, interval: 0.6, duration: 3.0 };
export const CURATED_FIRE_ARENA = { w: 54, h: 42 };
export const CURATED_FIRE_PLAYER = { radius: 0.5, speed: 7.4 };
export const CURATED_FIRE_DUMMY = { radius: 0.8, hp: 100, respawn: 2.6 };

const RECIPE_LARIAT = `
Input structure:
  Tap Standard cast
  Charged Signature rewrite when meter is full

Base movement:
  Read forward aim
  Slide caster a short authored distance

Base attack:
  Create first long rotating fire-whip sweep
  Resolve at most one first-sweep hit per target
  Deal 26 damage, apply burn, apply outward force
  Create second sweep at authored angular offset
  Resolve at most one second-sweep hit per target
  End both whips after their sweep arcs complete

Enhanced base:
  Preserve two-sweep timing and damage schedule
  Increase whip length / radial reach

Charged Signature rewrite:
  Create 3 distinct fire whips around activation center
  Rotate all three through multiple revolutions
  Keep effect anchored to its declared center
  Allow caster movement to decouple from the whips
  Use per-target hit cooldowns to bound overlap damage
  Clean up every whip at charged lifetime end

Cooldown: 5.5 seconds`;

const RECIPE_CHARGE = `
Input structure:
  Ammo Standard cast with directional aim

Charge system:
  Passively store up to 3 charges
  Recover each charge independently at 3.5 seconds
  Spend 1 charge per cast

Dash:
  Snapshot dash direction
  Move caster a short validated distance
  For every distinct enemy crossed:
    deal 5 contact damage once
    attach one independent explosive marker
    save original dash direction on that marker

Marker:
  Remain attached to target for 1 second
  Allow multiple marker instances on the same target
  Clean up if target dies before detonation

Detonation:
  Deal 25 damage once
  Knock target along saved dash direction
  Enhanced version also applies level-one burn
  Remove only the marker instance that detonated`;

const VIDEO_NOTES = `Blazing Lariat 244–255s: the base cast slides the wizard forward and throws a chain of chunky orange blobs in a long arc that trails behind its own tip; a second arc follows from a different angle. Hits pop a white starburst and "26", then burn ticks of "2". At 250.3s the charged Signature forms a three-armed spiral of whips around one point and keeps spinning while the wizard walks out of it.
Explosive Charge 259–265s: the dash sprays angular flame shards, tags each dummy crossed with a bright yellow flame that clings to its body, and about a second later each tag flashes white for "25" and shoves its owner along the original dash line.`;

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

function localDocument() {
  return typeof document === 'undefined' ? null : document;
}

function makeCanvas(size) {
  const doc = localDocument();
  if (!doc) return null;
  const c = doc.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function fallbackTexture(THREE) {
  if (THREE.DataTexture) {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    t.needsUpdate = true;
    return t;
  }
  return null;
}

function texFrom(THREE, c) {
  if (!c || !THREE.CanvasTexture) return fallbackTexture(THREE);
  const t = new THREE.CanvasTexture(c);
  if ('colorSpace' in t) t.colorSpace = THREE.LinearSRGBColorSpace || THREE.SRGBColorSpace || t.colorSpace;
  return t;
}

function radialTexture(THREE, size, stops, lines = []) {
  const pair = makeCanvas(size);
  if (!pair) return fallbackTexture(THREE);
  const [c, g] = pair;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, TAU); g.fill();
  for (const line of lines) line(g, size);
  return texFrom(THREE, c);
}

function blobTexture(THREE) {
  return radialTexture(THREE, 128, [
    [0.00, 'rgba(255,252,236,1)'], [0.22, 'rgba(255,226,140,1)'],
    [0.48, 'rgba(255,150,32,1)'], [0.76, 'rgba(214,72,10,.72)'],
    [1.00, 'rgba(120,26,0,0)'],
  ]);
}

function flashTexture(THREE) {
  const pair = makeCanvas(256);
  if (!pair) return fallbackTexture(THREE);
  const [c, g] = pair;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 74);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 74, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + Math.random() * 0.2;
    const len = 68 + Math.random() * 56;
    g.lineWidth = 1.5 + Math.random() * 2.5;
    g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * len, 128 + Math.sin(a) * len); g.stroke();
  }
  return texFrom(THREE, c);
}

function scorchTexture(THREE) {
  const pair = makeCanvas(128);
  if (!pair) return fallbackTexture(THREE);
  const [c, g] = pair;
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * TAU, r = Math.random() * 30;
    const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r, rr = 14 + Math.random() * 24;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(46,26,14,.30)'); gr.addColorStop(1, 'rgba(46,26,14,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  return texFrom(THREE, c);
}

function shadowTexture(THREE) {
  const pair = makeCanvas(128);
  if (!pair) return fallbackTexture(THREE);
  const [c, g] = pair;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill();
  return texFrom(THREE, c);
}

function ringTexture(THREE) {
  const pair = makeCanvas(128);
  if (!pair) return fallbackTexture(THREE);
  const [c, g] = pair;
  g.strokeStyle = 'rgba(120,255,190,.95)'; g.lineWidth = 5;
  g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke();
  return texFrom(THREE, c);
}

const SPRITE_VS = `
attribute vec3 aOffset;
attribute vec2 aScaleRot;
attribute vec4 aColor;
varying vec2 vUv;
varying vec4 vCol;
void main(){
  vUv = uv;
  vCol = aColor;
  float s = aScaleRot.x;
  float a = aScaleRot.y;
  float ca = cos(a), sa = sin(a);
  vec2 p = vec2(position.x * ca - position.y * sa, position.x * sa + position.y * ca) * s;
  vec3 wp = aOffset + vec3(p.x, 0.0, -p.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const SPRITE_FS = `
uniform sampler2D map;
varying vec2 vUv;
varying vec4 vCol;
void main(){
  vec4 t = texture2D(map, vUv);
  gl_FragColor = vec4(t.rgb * vCol.rgb, t.a * vCol.a);
  if (gl_FragColor.a < 0.004) discard;
}`;

class SpritePool {
  constructor(THREE, root, tex, capacity, blending, order, depthTest) {
    this.THREE = THREE; this.cap = capacity; this.n = 0;
    this.offset = new Float32Array(capacity * 3);
    this.scaleRot = new Float32Array(capacity * 2);
    this.color = new Float32Array(capacity * 4);
    const geo = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    geo.index = plane.index;
    geo.setAttribute('position', plane.getAttribute('position'));
    geo.setAttribute('uv', plane.getAttribute('uv'));
    this.aOffset = new THREE.InstancedBufferAttribute(this.offset, 3).setUsage(THREE.DynamicDrawUsage);
    this.aScaleRot = new THREE.InstancedBufferAttribute(this.scaleRot, 2).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(this.color, 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aOffset', this.aOffset); geo.setAttribute('aScaleRot', this.aScaleRot); geo.setAttribute('aColor', this.aColor);
    geo.instanceCount = 0;
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { map: { value: tex } }, vertexShader: SPRITE_VS, fragmentShader: SPRITE_FS,
      transparent: true, depthWrite: false, depthTest: depthTest !== false, blending,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = order; this.geo = geo; root.add(this.mesh);
  }
  reset() { this.n = 0; }
  push(x, y, z, scale, rot, r, g, b, a) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.offset[i * 3] = x; this.offset[i * 3 + 1] = y; this.offset[i * 3 + 2] = z;
    this.scaleRot[i * 2] = scale; this.scaleRot[i * 2 + 1] = rot;
    this.color[i * 4] = r; this.color[i * 4 + 1] = g; this.color[i * 4 + 2] = b; this.color[i * 4 + 3] = a;
  }
  flush() {
    this.geo.instanceCount = this.n; this.aOffset.needsUpdate = true; this.aScaleRot.needsUpdate = true; this.aColor.needsUpdate = true;
  }
  dispose() { this.geo.dispose(); this.mesh.material.dispose(); }
}

function targetPosition(target) {
  if (!target) return { x: 0, z: 0 };
  if (target.pos) return { x: Number(target.pos.x) || 0, z: Number(target.pos.z ?? target.pos.y) || 0 };
  if (target.position) return { x: Number(target.position.x) || 0, z: Number(target.position.z) || 0 };
  return { x: Number(target.x) || 0, z: Number(target.z) || 0 };
}

function targetDead(target) { return !!(target?.dead || target?.alive === false || Number(target?.hp) <= 0); }

export function createWizardCuratedFireSourcePort({
  THREE, scene: worldScene, parent = null, camera = null, size = 1,
  player: initialPlayer = null, targets: initialTargets = [], callbacks = {},
} = {}) {
  if (!THREE || !worldScene) throw new Error('Curated Fire source port requires THREE and scene.');
  const root = new THREE.Group(); (parent || worldScene).add(root);
  const scale = Math.max(0.001, Number(size) || 1); root.scale.setScalar(scale);
  const sourceCamera = camera || new THREE.PerspectiveCamera();
  const textures = {
    blob: blobTexture(THREE), flash: flashTexture(THREE), scorch: scorchTexture(THREE),
    shadow: shadowTexture(THREE), ring: ringTexture(THREE),
  };
  const shadows = new SpritePool(THREE, root, textures.shadow, 64, THREE.NormalBlending, 1, true);
  const scorches = new SpritePool(THREE, root, textures.scorch, 260, THREE.NormalBlending, 2, true);
  const fire = new SpritePool(THREE, root, textures.blob, 1600, THREE.AdditiveBlending, 3, false);
  const flashes = new SpritePool(THREE, root, textures.flash, 160, THREE.AdditiveBlending, 4, false);
  const debug = new SpritePool(THREE, root, textures.ring, 320, THREE.AdditiveBlending, 5, false);

  const particles = [], decals = [], pops = [], whips = [];
  const targetMap = new Map();
  let targetRefs = [...initialTargets];
  let callbacksNow = { ...callbacks };
  let now = 0;
  let enhanced = false;
  const player = { pos: new THREE.Vector2(), face: new THREE.Vector2(1, 0), sig: 0, sigMax: 220, slide: null };
  const lariat = { cd: 0, sweepsThisCast: 0, chargedActive: null };
  const echarge = { charges: CURATED_FIRE_CHARGE.maxCharges, timers: [], dash: null };
  let lastSlideDir = null;
  let markerId = 0;

  function setCallbacks(next = {}) { callbacksNow = { ...callbacksNow, ...next }; }
  function syncPlayer(context = {}) {
    const p = context.player || initialPlayer || {};
    const pos = p.pos || p.position;
    if (pos) { player.pos.x = Number(pos.x) || 0; player.pos.y = Number(pos.z ?? pos.y) || 0; }
    else { player.pos.x = Number(p.x) || 0; player.pos.y = Number(p.z) || 0; }
    const f = context.forward || p.forward || p.face;
    if (f) { player.face.set(Number(f.x) || 0, Number(f.z ?? f.y) || 0).normalize(); }
    if (player.face.lengthSq() < 1e-8) player.face.set(1, 0);
  }
  function makeTarget(ref) {
    const p = targetPosition(ref);
    return { ref, pos: new THREE.Vector2(p.x, p.z), home: new THREE.Vector2(p.x, p.z), vel: new THREE.Vector2(),
      hp: Number(ref?.hp ?? CURATED_FIRE_DUMMY.hp), hpMax: Number(ref?.hpMax ?? ref?.hp ?? CURATED_FIRE_DUMMY.hp),
      flash: 0, lean: 0, dead: targetDead(ref), burn: null, markers: [],
    };
  }
  function syncTargets(next = targetRefs) {
    targetRefs = next || [];
    const active = [];
    for (const ref of targetRefs) {
      if (!ref) continue;
      let d = targetMap.get(ref); if (!d) { d = makeTarget(ref); targetMap.set(ref, d); }
      const p = targetPosition(ref);
      if (!d.markers.length || !d.burn) d.pos.set(p.x, p.z);
      d.dead = targetDead(ref); d.hp = Number(ref.hp ?? d.hp); active.push(d);
    }
    return active;
  }
  function activeTargets() { return [...targetMap.values()].filter(d => !d.dead); }
  function movePlayer(dx, dz, meta) {
    player.pos.x += dx; player.pos.y += dz;
    if (callbacksNow.onMovePlayer) callbacksNow.onMovePlayer({ x: dx * scale, z: dz * scale, delta: { x: dx * scale, z: dz * scale }, meta });
    else if (initialPlayer) { if (typeof initialPlayer.x === 'number') initialPlayer.x += dx * scale; if (typeof initialPlayer.z === 'number') initialPlayer.z += dz * scale; }
  }
  function moveTarget(d, dx, dz, meta) {
    d.pos.x += dx; d.pos.y += dz;
    if (callbacksNow.onMoveTarget) callbacksNow.onMoveTarget(d.ref, { x: dx * scale, z: dz * scale, delta: { x: dx * scale, z: dz * scale }, meta });
    else if (d.ref) { if (typeof d.ref.x === 'number') d.ref.x += dx * scale; if (typeof d.ref.z === 'number') d.ref.z += dz * scale; }
  }
  function damage(d, amount, kind, meta = {}) {
    if (d.dead) return;
    d.hp -= amount; d.flash = 1;
    if (callbacksNow.onDamage) callbacksNow.onDamage(d.ref, amount, { ...meta, kind, source: 'curated-fire' });
    else if (d.ref && typeof d.ref.hp === 'number') d.ref.hp -= amount;
    if (d.hp <= 0 || targetDead(d.ref)) { d.dead = true; d.markers.length = 0; d.burn = null; }
  }
  function applyBurn(d) {
    if (!d || d.dead || targetDead(d.ref)) return false;
    d.burn = { left: CURATED_FIRE_BURN.duration, next: CURATED_FIRE_BURN.interval };
    callbacksNow.onStatus?.(d.ref, 'burn', { duration: CURATED_FIRE_BURN.duration, interval: CURATED_FIRE_BURN.interval, tick: CURATED_FIRE_BURN.tick });
    return true;
  }
  function knock(d, dx, dz, force, meta = {}) {
    const len = Math.hypot(dx, dz) || 1; const vx = dx / len * force, vz = dz / len * force;
    d.vel.x += vx; d.vel.y += vz; d.lean = Math.min(0.55, d.lean + 0.35);
    callbacksNow.onKnockback?.(d.ref, { x: vx * scale, z: vz * scale, force, meta });
  }
  function impact(x, z, scaleValue, hold) { pops.push({ x, z, life: 0, max: hold || 0.26, scale: scaleValue || 2.6, rot: Math.random() * TAU }); }
  function ember(x, z, vx, vz, sizeValue, life, hot) {
    if (particles.length > 460) return;
    particles.push({ x, z, y: 0.3 + Math.random() * 0.3, vx, vz, vy: 0.6 + Math.random() * 1.6, life: 0, max: life, size: sizeValue, hot: hot || 0 });
  }
  function scorch(x, z, sizeValue) { if (decals.length > 240) decals.shift(); decals.push({ x, z, size: sizeValue, rot: Math.random() * TAU, life: 0, max: 4.5 + Math.random() * 2.5 }); }
  function whipSamples(angle, reach, lag, out) {
    const N = 16; out.length = 0;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), dist = reach * (0.22 + 0.78 * Math.pow(t, 0.42));
      const a = angle - lag * Math.pow(t, 0.92); const rad = 0.30 + 0.52 * Math.sin(Math.PI * Math.min(1, 0.30 + 0.70 * t));
      out.push({ x: Math.cos(a) * dist, z: Math.sin(a) * dist, r: rad, t, a });
    }
    return out;
  }
  function spawnWhip(cfg) {
    whips.push({ cx: cfg.cx, cz: cfg.cz, start: cfg.start, arc: cfg.arc, time: 0, dur: cfg.dur, delay: cfg.delay || 0,
      reach: cfg.reach, lag: cfg.lag, damage: cfg.damage, knockback: cfg.knockback, hitCooldown: cfg.hitCooldown || 0,
      hits: new Map(), group: cfg.group, follow: !!cfg.follow, samples: [], dead: false });
  }
  function updateWhips(dt) {
    const targets = activeTargets();
    for (let i = whips.length - 1; i >= 0; i--) {
      const w = whips[i];
      if (w.delay > 0) { w.delay -= dt; if (w.delay > 0) continue; }
      if (w.follow) { w.cx = player.pos.x; w.cz = player.pos.y; }
      w.time += dt; const t = Math.min(1, w.time / w.dur); const angle = w.start + w.arc * t; whipSamples(angle, w.reach, w.lag, w.samples);
      for (const d of targets) {
        const last = w.hits.get(d);
        if (last !== undefined && (w.hitCooldown === 0 || w.time - last < w.hitCooldown)) continue;
        let hitS = null;
        for (const s of w.samples) { const dx = w.cx + s.x - d.pos.x, dz = w.cz + s.z - d.pos.y; if (dx * dx + dz * dz < (s.r * 0.92 + CURATED_FIRE_DUMMY.radius) ** 2) { hitS = s; break; } }
        if (!hitS) continue;
        w.hits.set(d, w.time); damage(d, w.damage, 'lariat', { group: w.group, sample: hitS }); applyBurn(d);
        const ox = d.pos.x - w.cx, oz = d.pos.y - w.cz; knock(d, ox, oz, w.knockback * 0.12, { group: w.group }); impact(d.pos.x, d.pos.y, 3.0); sfxHit();
      }
      for (let s = 3; s < w.samples.length; s += 4) if (Math.random() < 0.5) { const p = w.samples[s]; ember(w.cx + p.x, w.cz + p.z, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2.2, 0.28 + Math.random() * 0.3, 0.4 + Math.random() * 0.35, 0.25); }
      if (Math.random() < 0.55) { const p = w.samples[(Math.random() * w.samples.length) | 0]; scorch(w.cx + p.x, w.cz + p.z, 1.1 + Math.random() * 0.9); }
      if (t >= 1) { w.dead = true; whips.splice(i, 1); }
    }
  }
  function drawWhips(time) {
    for (const w of whips) {
      if (w.delay > 0) continue;
      const fade = Math.min(1, (1 - w.time / w.dur) * 4);
      for (const s of w.samples) {
        const wob = Math.sin(time * 20 + s.t * 11) * 0.07, sz = (s.r * 2 + wob) * 1.12, heat = 1 - Math.abs(s.t - 0.30) * 0.95;
        fire.push(w.cx + s.x, 0.36, w.cz + s.z, sz, s.t * 4 + time * 3, 1.0, 0.44 + heat * 0.5, 0.05 + heat * 0.26, 0.92 * fade);
        const j = Math.sin(s.t * 37 + time * 6), k = Math.cos(s.t * 29 - time * 5);
        fire.push(w.cx + s.x + j * s.r * 0.8, 0.34, w.cz + s.z + k * s.r * 0.8, sz * 0.58, -time * 4, 1.0, 0.66, 0.20, 0.55 * fade);
      }
      const g = w.samples[0]; if (g) flashes.push(w.cx + g.x, 0.5, w.cz + g.z, 2.1, time * 6, 1, 0.95, 0.7, 0.35 * fade);
    }
  }
  function castLariat(context = {}) {
    if (lariat.cd > 0) return false;
    const charged = !!context.charged; const dir = context.direction || context.forward || player.face;
    const dx = Number(dir.x) || 1, dz = Number(dir.z ?? dir.y) || 0; const len = Math.hypot(dx, dz) || 1; const ndx = dx / len, ndz = dz / len;
    lariat.cd = CURATED_FIRE_LARIAT.cooldown; enhanced = !!context.enhanced; player.face.set(ndx, ndz);
    if (!charged) {
      lastSlideDir = new THREE.Vector2(ndx, ndz); player.slide = { dx: ndx, dz: ndz, left: CURATED_FIRE_LARIAT.slideTime, speed: CURATED_FIRE_LARIAT.slideDistance / CURATED_FIRE_LARIAT.slideTime };
      const reach = enhanced ? CURATED_FIRE_LARIAT.reachEnhanced : CURATED_FIRE_LARIAT.reach, base = Math.atan2(ndz, ndx); lariat.sweepsThisCast = 0;
      for (let k = 0; k < 2; k++) { spawnWhip({ cx: player.pos.x, cz: player.pos.y, follow: true, start: base - CURATED_FIRE_LARIAT.sweepArc * 0.5 + k * CURATED_FIRE_LARIAT.sweep2Offset, arc: CURATED_FIRE_LARIAT.sweepArc, dur: CURATED_FIRE_LARIAT.sweepTime, delay: k * CURATED_FIRE_LARIAT.sweep2Delay, reach, lag: CURATED_FIRE_LARIAT.lag, damage: CURATED_FIRE_LARIAT.damage, knockback: CURATED_FIRE_LARIAT.knockback, hitCooldown: 0, group: 'base' }); lariat.sweepsThisCast++; }
    } else {
      player.sig = 0; const C = CURATED_FIRE_LARIAT.charged, reach = enhanced ? C.reachEnhanced : C.reach, base = Math.atan2(ndz, ndx), cx = player.pos.x, cz = player.pos.y;
      for (let k = 0; k < C.whips; k++) spawnWhip({ cx, cz, start: base + (k / C.whips) * TAU, arc: TAU * C.revolutions, dur: C.life, reach, lag: C.lag, damage: CURATED_FIRE_LARIAT.damage, knockback: CURATED_FIRE_LARIAT.knockback, hitCooldown: C.hitCooldown, group: 'charged' });
      lariat.chargedActive = { cx, cz, left: C.life, whips: C.whips, moved: false }; impact(cx, cz, 6); sfxBoom(0.6);
    }
    return true;
  }
  function updateLariat(dt) {
    if (lariat.cd > 0) lariat.cd = Math.max(0, lariat.cd - dt);
    if (player.slide) { const s = player.slide, step = Math.min(dt, s.left) * s.speed; movePlayer(s.dx * step, s.dz * step, { source: 'lariat-slide' }); s.left -= dt; if (s.left <= 0) player.slide = null; }
    const a = lariat.chargedActive;
    if (a) { a.left -= dt; if (!a.moved && Math.hypot(player.pos.x - a.cx, player.pos.y - a.cz) > 2.2) a.moved = true; if (a.left <= 0) lariat.chargedActive = null; }
  }
  function segmentDistance(a, b, p) {
    const abx = b.x - a.x, aby = b.y - a.y, len2 = abx * abx + aby * aby;
    let t = len2 > 0 ? ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(a.x + abx * t - p.x, a.y + aby * t - p.y);
  }
  function castCharge(context = {}) {
    if (echarge.charges <= 0) return false;
    echarge.charges--; echarge.timers.push(CURATED_FIRE_CHARGE.recharge);
    const dir = context.direction || context.forward || player.face; const dx0 = Number(dir.x) || 1, dz0 = Number(dir.z ?? dir.y) || 0; const len = Math.hypot(dx0, dz0) || 1; const dx = dx0 / len, dz = dz0 / len;
    const from = player.pos.clone(), to = from.clone().addScaledVector(new THREE.Vector2(dx, dz), CURATED_FIRE_CHARGE.dashDistance);
    echarge.dash = { from, to, dir: new THREE.Vector2(dx, dz), t: 0, dur: CURATED_FIRE_CHARGE.dashTime, crossed: new Set() };
    for (let i = 0; i < 26; i++) { const f = Math.random(), px = from.x + (to.x - from.x) * f, pz = from.y + (to.y - from.y) * f, spread = (Math.random() - 0.5) * 2.4; ember(px + dz * spread * 0.4, pz - dx * spread * 0.4, -dx * (2 + Math.random() * 5) + dz * spread * 2, -dz * (2 + Math.random() * 5) - dx * spread * 2, 0.32 + Math.random() * 0.4, 0.35 + Math.random() * 0.35, 0.6); }
    return true;
  }
  function detonate(d, m) {
    if (!d.dead) { damage(d, CURATED_FIRE_CHARGE.blastDamage, 'charge-blast', { markerId: m.id }); knock(d, m.dir.x, m.dir.y, CURATED_FIRE_CHARGE.knockback * 0.14, { markerId: m.id }); if (enhanced) applyBurn(d); }
    impact(d.pos.x, d.pos.y, 7.0, 0.40); scorch(d.pos.x, d.pos.y, 2.6); callbacksNow.onProjectileCleanup?.({ target: d.ref, source: 'explosive-charge', markerId: m.id });
  }
  function updateCharge(dt) {
    for (let i = echarge.timers.length - 1; i >= 0; i--) { echarge.timers[i] -= dt; if (echarge.timers[i] <= 0) { echarge.timers.splice(i, 1); echarge.charges = Math.min(CURATED_FIRE_CHARGE.maxCharges, echarge.charges + 1); } }
    const d = echarge.dash;
    if (d) {
      const prev = d.t; d.t = Math.min(1, d.t + dt / d.dur); const nextPos = new THREE.Vector2().lerpVectors(d.from, d.to, d.t); movePlayer(nextPos.x - player.pos.x, nextPos.y - player.pos.y, { source: 'explosive-charge-dash' });
      const a = new THREE.Vector2().lerpVectors(d.from, d.to, prev), b = new THREE.Vector2().lerpVectors(d.from, d.to, d.t);
      for (const e of activeTargets()) { if (d.crossed.has(e)) continue; if (segmentDistance(a, b, e.pos) < CURATED_FIRE_CHARGE.dashRadius + CURATED_FIRE_DUMMY.radius) { d.crossed.add(e); damage(e, CURATED_FIRE_CHARGE.contactDamage, 'charge-contact'); const m = { fuse: CURATED_FIRE_CHARGE.fuse, dir: d.dir.clone(), id: ++markerId, seed: Math.random() * TAU }; e.markers.push(m); knock(e, d.dir.x, d.dir.y, 1.2, { markerId: m.id }); impact(e.pos.x, e.pos.y, 2.0); } }
      if (d.t >= 1) echarge.dash = null;
    }
    for (const e of activeTargets()) for (let i = e.markers.length - 1; i >= 0; i--) { const m = e.markers[i]; m.fuse -= dt; if (m.fuse <= 0) { e.markers.splice(i, 1); detonate(e, m); } }
  }
  function updateBurns(dt) {
    for (const d of activeTargets()) {
      const burn = d.burn;
      if (!burn) continue;
      burn.left -= dt;
      burn.next -= dt;
      if (burn.next <= 0) {
        burn.next += CURATED_FIRE_BURN.interval;
        damage(d, CURATED_FIRE_BURN.tick, 'burn');
      }
      // A burn tick can kill the target, and damage() clears d.burn in that
      // case. Only expire the same status object if it is still attached.
      if (d.burn === burn && burn.left <= 0) d.burn = null;
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life += dt; if (p.life >= p.max) { particles.splice(i, 1); continue; } p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= 5 * dt; if (p.y < 0.18) { p.y = 0.18; p.vy = 0; } p.vx *= Math.pow(0.06, dt); p.vz *= Math.pow(0.06, dt); }
    for (let i = decals.length - 1; i >= 0; i--) { decals[i].life += dt; if (decals[i].life >= decals[i].max) decals.splice(i, 1); }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].life += dt; if (pops[i].life >= pops[i].max) pops.splice(i, 1); }
  }
  function draw(time) {
    shadows.reset(); scorches.reset(); fire.reset(); flashes.reset(); debug.reset();
    for (const d of decals) { const a = 1 - Math.pow(d.life / d.max, 2); scorches.push(d.x, 0.015, d.z, d.size, d.rot, 1, 1, 1, a * 0.85); }
    shadows.push(player.pos.x, 0.03, player.pos.y, 1.5, 0, 1, 1, 1, 1);
    for (const d of activeTargets()) shadows.push(d.pos.x, 0.03, d.pos.y, 1.9, 0, 1, 1, 1, 1);
    drawWhips(time);
    for (const d of activeTargets()) {
      for (let k = 0; k < d.markers.length; k++) { const m = d.markers[k], urgency = 1 - m.fuse / CURATED_FIRE_CHARGE.fuse, puff = 5 + urgency * 22, spin = time * (2 + urgency * 5) + m.seed + k * 2.1, orbit = 0.42 + k * 0.18; for (let i = 0; i < 6; i++) { const a = spin + i * 1.047, wob = 0.86 + Math.sin(time * puff + i * 2) * 0.24; fire.push(d.pos.x + Math.cos(a) * orbit, 0.42 + i * 0.06, d.pos.y + Math.sin(a) * orbit, (1.15 + urgency * 0.55) * wob, a, 1, 0.9, 0.42, 0.95); } flashes.push(d.pos.x, 0.55, d.pos.y, 2.0 + urgency * 1.4, 0, 1, 1, 1, 0.18 + 0.28 * Math.abs(Math.sin(time * puff))); }
      if (d.burn && !d.dead) for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; fire.push(d.pos.x + Math.cos(a) * 0.4, 0.4, d.pos.y + Math.sin(a) * 0.4, 0.45 + Math.sin(time * 12 + i) * 0.12, a, 1, 0.6, 0.16, 0.62); }
    }
    for (const p of particles) { const t = p.life / p.max, a = (1 - t) * (1 - t), g = 0.55 + p.hot * 0.4 - t * 0.35; fire.push(p.x, p.y, p.z, p.size * (1.25 - t * 0.55) * 1.6, p.life * 6, 1, Math.max(0.15, g), 0.12 + p.hot * 0.2, a); }
    for (const f of pops) { const t = f.life / f.max; flashes.push(f.x, 0.6, f.z, f.scale * (0.55 + t * 0.9), f.rot, 1, 1, 1, (1 - t) * 0.95); }
    shadows.flush(); scorches.flush(); fire.flush(); flashes.flush(); debug.flush();
  }
  function sfxHit() { callbacksNow.onAudio?.('hit'); }
  function sfxBoom(scaleValue) { callbacksNow.onAudio?.('boom', scaleValue); }
  function update(dt, context = {}) {
    const frameDt = Math.max(0, Number(dt) || 0); now += frameDt; if (context.callbacks) setCallbacks(context.callbacks); syncPlayer(context); const active = syncTargets(context.targets ?? targetRefs); void active;
    updateLariat(frameDt); updateCharge(frameDt); updateWhips(frameDt); updateBurns(frameDt); updateParticles(frameDt); draw(now);
  }
  function cast(id, context = {}) {
    if (context.targets) syncTargets(context.targets); syncPlayer(context); enhanced = !!context.enhanced;
    const key = String(id || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (key.includes('LARIAT')) return castLariat(context);
    if (key.includes('CHARGE')) return castCharge(context);
    return false;
  }
  function reset() {
    for (const d of targetMap.values()) { d.markers.length = 0; d.burn = null; }
    particles.length = 0; decals.length = 0; pops.length = 0; whips.length = 0; lariat.cd = 0; lariat.chargedActive = null; player.slide = null; echarge.dash = null; echarge.timers.length = 0; echarge.charges = CURATED_FIRE_CHARGE.maxCharges; targetMap.clear();
    shadows.reset(); scorches.reset(); fire.reset(); flashes.reset(); debug.reset();
  }
  function dispose() {
    reset(); root.parent?.remove(root); root.traverse(o => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(m => m?.dispose?.()); else o.material?.dispose?.(); });
    textures.blob?.dispose?.(); textures.flash?.dispose?.(); textures.scorch?.dispose?.(); textures.shadow?.dispose?.(); textures.ring?.dispose?.();
  }
  function snapshot() {
    return { source: 'wol-arcana-phone-demo.html', sha256: '8e1431126dba7dc7eade232161780b357201ef6b7fd72695bbcb4f12c54eaac8', size: scale,
      lariat: CURATED_FIRE_LARIAT, charge: CURATED_FIRE_CHARGE, burn: CURATED_FIRE_BURN, recipeLariat: RECIPE_LARIAT, recipeCharge: RECIPE_CHARGE, videoNotes: VIDEO_NOTES,
      cooldown: lariat.cd, charges: echarge.charges, whips: whips.length, markers: [...targetMap.values()].reduce((n, d) => n + d.markers.length, 0) };
  }
  syncPlayer({ player: initialPlayer }); syncTargets(initialTargets);
  return { root, cast, update, reset, dispose, snapshot, setCallbacks, syncTargets, constants: { LARIAT: CURATED_FIRE_LARIAT, CHARGE: CURATED_FIRE_CHARGE, BURN: CURATED_FIRE_BURN, ARENA: CURATED_FIRE_ARENA, PLAYER: CURATED_FIRE_PLAYER, DUMMY: CURATED_FIRE_DUMMY } };
}
