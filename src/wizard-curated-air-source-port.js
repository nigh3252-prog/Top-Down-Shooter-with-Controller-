/*
 * Curated source port: wizard-of-legend-air-arcana-demo.html
 * SHA-256: dc36d63a71b58288bd815b3adc7518e3fb6a2a1ed1ab594404bf0ac29a9b4813
 *
 * SPEC, source geometry, draft/agent state machines, and collision tests are
 * copied from the standalone demo.  The adapter removes only its renderer
 * boot, arena props, HUD, and training-dummy ownership.
 */

export const CURATED_AIR_SPEC = {
  stormDraft: {
    name: 'Storm Draft', order: 68, element: 'Air', type: 'Signature', subtypes: 'Projectile',
    damage: 20, wallDamage: 30, wallStun: 1.35, knockback: 10, charges: 2, cooldown: 4.5,
    spawnGap: 1.7, speed: 9.6, life: 1.30, halfWidth: 1.35, chargeTime: 0.62, volleys: 4, perVolley: 7, volleyGap: 0.21, rankSpacing: 1.6,
  },
  windAgent: {
    name: 'Whirling Wind Agent', order: 75, element: 'Air', type: 'Standard', subtypes: 'Melee, summon',
    count: 2, damage: 5, knockback: 10, duration: 10, cooldown: 15, chargeEvery: 1.0, chargeSpeed: 15, chargeOvershoot: 3.0, seekRange: 11, followSpeed: 4.6, leashRange: 12, health: 3,
  },
  arena: { hw: 4.9, hd: 10.8, wallH: 1.5 },
  player: { speed: 5.4, accel: 42, radius: 0.42 },
  enemy: { radius: 0.52, friction: 5.2, wallSlamMin: 4.2 },
};

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function canvasPair(size) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = size; return [c, c.getContext('2d')];
}
function fallbackTexture(T) {
  if (!T.DataTexture) return null;
  const t = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t;
}
function tex(T, c) {
  if (!c || !T.CanvasTexture) return fallbackTexture(T);
  const t = new T.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = T.SRGBColorSpace || t.colorSpace; return t;
}
function softCircle(T, size, inner) {
  const pair = canvasPair(size); if (!pair) return fallbackTexture(T);
  const [c, g] = pair; const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(255,255,255,${inner || 1})`); grd.addColorStop(0.42, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size); return tex(T, c);
}

function targetPosition(target) {
  if (!target) return { x: 0, z: 0 };
  if (target.pos) return { x: Number(target.pos.x) || 0, z: Number(target.pos.z ?? target.pos.y) || 0 };
  if (target.position) return { x: Number(target.position.x) || 0, z: Number(target.position.z) || 0 };
  return { x: Number(target.x) || 0, z: Number(target.z) || 0 };
}
function targetDead(target) { return !!(target?.dead || target?.alive === false || Number(target?.hp) <= 0); }

export function createWizardCuratedAirSourcePort({
  THREE, scene: worldScene, parent = null, camera = null, size = 1,
  player: initialPlayer = null, targets: initialTargets = [], callbacks = {},
} = {}) {
  if (!THREE || !worldScene) throw new Error('Curated Air source port requires THREE and scene.');
  const root = new THREE.Group(); (parent || worldScene).add(root);
  const sourceCamera = camera || new THREE.PerspectiveCamera();
  const scale = Math.max(0.001, Number(size) || 1); root.scale.setScalar(scale);
  const puffTex = softCircle(THREE, 128, 1), shadowTex = softCircle(THREE, 128, 0.85);

  const crescentGeo = new THREE.TorusGeometry(0.34, 0.062, 5, 18, Math.PI * 1.45); crescentGeo.rotateX(-Math.PI / 2);
  const crescents = new THREE.InstancedMesh(crescentGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false }), 900);
  crescents.instanceMatrix.setUsage(THREE.DynamicDrawUsage); crescents.setColorAt(0, new THREE.Color(1, 1, 1)); crescents.frustumCulled = false; root.add(crescents);
  const cDummy = new THREE.Object3D(), cColor = new THREE.Color(); let crescentCount = 0;
  function beginCrescents() { crescentCount = 0; }
  function pushCrescent(x, y, z, spin, tiltA, scaleValue, alpha, tint) {
    if (crescentCount >= 900) return;
    cDummy.position.set(x, y, z); cDummy.rotation.set(tiltA * 0.35, spin, tiltA); cDummy.scale.setScalar(scaleValue); cDummy.updateMatrix();
    crescents.setMatrixAt(crescentCount, cDummy.matrix); if (tint) cColor.setRGB(tint[0] * alpha, tint[1] * alpha, tint[2] * alpha); else cColor.setRGB(alpha, alpha, alpha); crescents.setColorAt(crescentCount, cColor); crescentCount++;
  }
  function endCrescents() { crescents.count = crescentCount; crescents.instanceMatrix.needsUpdate = true; if (crescents.instanceColor) crescents.instanceColor.needsUpdate = true; }

  const spritePool = [], liveSprites = []; let spriteCursor = 0;
  for (let i = 0; i < 220; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true })); s.visible = false; root.add(s); spritePool.push(s); }
  function spawnSprite(x, y, z, sizeValue, color, life, grow, opacity) {
    const s = spritePool[spriteCursor]; spriteCursor = (spriteCursor + 1) % spritePool.length; s.visible = true; s.position.set(x, y, z); s.scale.setScalar(sizeValue); s.material.color.set(color); s.material.opacity = opacity == null ? 1 : opacity; s.userData = { age: 0, life, size0: sizeValue, grow: grow || 0, op0: s.material.opacity }; if (!liveSprites.includes(s)) liveSprites.push(s); return s;
  }
  function updateSprites(dt) { for (let i = liveSprites.length - 1; i >= 0; i--) { const s = liveSprites[i], u = s.userData; u.age += dt; const k = u.age / u.life; if (k >= 1) { s.visible = false; liveSprites.splice(i, 1); continue; } s.scale.setScalar(u.size0 * (1 + u.grow * k)); s.material.opacity = u.op0 * (1 - k) * (1 - k); } }

  const quadGeo = new THREE.PlaneGeometry(1, 1); quadGeo.rotateX(-Math.PI / 2); const quadPool = [], liveQuads = []; let quadCursor = 0;
  for (let i = 0; i < 120; i++) { const q = new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); q.visible = false; root.add(q); quadPool.push(q); }
  function spawnQuad(x, z, w, l, rot, color, life, opacity, growL) { const q = quadPool[quadCursor]; quadCursor = (quadCursor + 1) % quadPool.length; q.visible = true; q.position.set(x, 0.07, z); q.rotation.y = rot; q.scale.set(w, 1, l); q.material.color.set(color); q.material.opacity = opacity; q.userData = { age: 0, life, w, l, op0: opacity, growL: growL || 0 }; if (!liveQuads.includes(q)) liveQuads.push(q); return q; }
  function updateQuads(dt) { for (let i = liveQuads.length - 1; i >= 0; i--) { const q = liveQuads[i], u = q.userData; u.age += dt; const k = u.age / u.life; if (k >= 1) { q.visible = false; liveQuads.splice(i, 1); continue; } q.scale.set(u.w, 1, u.l * (1 + u.growL * k)); q.material.opacity = u.op0 * (1 - k); } }

  const decalPool = [], liveDecals = []; let decalCursor = 0;
  for (let i = 0; i < 20; i++) { const d = new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial({ map: puffTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); d.visible = false; d.position.y = 0.05; root.add(d); decalPool.push(d); }
  function spawnDecal(x, z, sizeValue, color, life, opacity, grow) { const d = decalPool[decalCursor]; decalCursor = (decalCursor + 1) % decalPool.length; d.visible = true; d.position.set(x, 0.05, z); d.scale.set(sizeValue, 1, sizeValue); d.material.color.set(color); d.material.opacity = opacity; d.userData = { age: 0, life, size: sizeValue, op0: opacity, grow: grow || 0 }; if (!liveDecals.includes(d)) liveDecals.push(d); }
  function updateDecals(dt) { for (let i = liveDecals.length - 1; i >= 0; i--) { const d = liveDecals[i], u = d.userData; u.age += dt; const k = u.age / u.life; if (k >= 1) { d.visible = false; liveDecals.splice(i, 1); continue; } const s = u.size * (1 + u.grow * k); d.scale.set(s, 1, s); d.material.opacity = u.op0 * (1 - k); } }

  const ringGeo = new THREE.TorusGeometry(1, 0.07, 6, 40); ringGeo.rotateX(-Math.PI / 2); const ringPool = [], liveRings = []; let ringCursor = 0;
  for (let i = 0; i < 24; i++) { const r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x6ff6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); r.visible = false; root.add(r); ringPool.push(r); }
  function spawnRing(x, z, r0, r1, life, color, thick) { const r = ringPool[ringCursor]; ringCursor = (ringCursor + 1) % ringPool.length; r.visible = true; r.position.set(x, 0.18, z); r.material.color.set(color); r.material.opacity = 1; r.userData = { age: 0, life, r0, r1, thick: thick || 1 }; if (!liveRings.includes(r)) liveRings.push(r); }
  function updateRings(dt) { for (let i = liveRings.length - 1; i >= 0; i--) { const r = liveRings[i], u = r.userData; u.age += dt; const k = u.age / u.life; if (k >= 1) { r.visible = false; liveRings.splice(i, 1); continue; } const rad = u.r0 + (u.r1 - u.r0) * (1 - Math.pow(1 - k, 2)); r.scale.set(rad, u.thick * (1 - k * 0.5), rad); r.material.opacity = (1 - k) * 0.95; } }

  const targetMap = new Map(); let targetRefs = [...initialTargets]; let callbacksNow = { ...callbacks }; let now = 0;
  const player = { pos: new THREE.Vector3(), face: new THREE.Vector2(1, 0), bob: 0 };
  const drafts = [], agents = [], volleyQueue = []; let volleyClock = 0;
  function setCallbacks(next = {}) { callbacksNow = { ...callbacksNow, ...next }; }
  function syncPlayer(context = {}) { const p = context.player || initialPlayer || {}, pos = p.pos || p.position; if (pos) player.pos.set(Number(pos.x) || 0, Number(pos.y) || 0, Number(pos.z) || 0); else player.pos.set(Number(p.x) || 0, Number(p.y) || 0, Number(p.z) || 0); const f = context.forward || p.forward || p.face; if (f) player.face.set(Number(f.x) || 0, Number(f.z ?? f.y) || 0).normalize(); if (player.face.lengthSq() < 1e-8) player.face.set(1, 0); }
  function makeTarget(ref) { const p = targetPosition(ref); return { ref, pos: new THREE.Vector3(p.x, 0, p.z), vel: new THREE.Vector3(), carry: null, stun: 0, hitFlash: 0, lean: 0, leanV: 0, dead: targetDead(ref) }; }
  function syncTargets(next = targetRefs) { targetRefs = next || []; for (const ref of targetRefs) { if (!ref) continue; let e = targetMap.get(ref); if (!e) { e = makeTarget(ref); targetMap.set(ref, e); } const p = targetPosition(ref); if (!e.carry) e.pos.set(p.x, 0, p.z); e.dead = targetDead(ref); } }
  function activeTargets() { return [...targetMap.values()].filter(e => !e.dead); }
  function moveTarget(e, dx, dz, meta) { e.pos.x += dx; e.pos.z += dz; callbacksNow.onMoveTarget?.(e.ref, { x: dx * scale, z: dz * scale, delta: { x: dx * scale, z: dz * scale }, meta }); }
  function damageEnemy(e, amount, kind) { e.hitFlash = 0.12; callbacksNow.onDamage?.(e.ref, amount, { kind, source: 'curated-air' }); if (!callbacksNow.onDamage && e.ref && typeof e.ref.hp === 'number') e.ref.hp -= amount; }
  function knock(e, dx, dz, power) { const len = Math.hypot(dx, dz) || 1; e.vel.x = dx / len * power; e.vel.z = dz / len * power; e.carry = null; callbacksNow.onKnockback?.(e.ref, { x: e.vel.x * scale, z: e.vel.z * scale, power, source: 'curated-air' }); }
  function wallSlam(e, bonus) { e.stun = CURATED_AIR_SPEC.stormDraft.wallStun; e.carry = null; e.vel.set(0, 0, 0); e.leanV += 6; damageEnemy(e, bonus, 'slam'); callbacksNow.onStatus?.(e.ref, 'stun', { duration: CURATED_AIR_SPEC.stormDraft.wallStun, source: 'storm-draft-wall-slam' }); callbacksNow.onWallSlam?.(e.ref, bonus); spawnRing(e.pos.x, e.pos.z, 0.25, 2.6, 0.42, 0x7ef6ff, 1.4); spawnRing(e.pos.x, e.pos.z, 0.1, 1.7, 0.3, 0xffffff, 1.0); spawnSprite(e.pos.x, 0.55, e.pos.z, 3.4, 0x59e8ff, 0.4, 0.8, 0.95); spawnDecal(e.pos.x, e.pos.z, 3.4, 0x2fd8ff, 0.6, 0.7, 0.7); for (let i = 0; i < 7; i++) { const a = Math.random() * TAU; spawnSprite(e.pos.x + Math.cos(a) * 0.5, 0.4 + Math.random() * 0.7, e.pos.z + Math.sin(a) * 0.5, 0.5 + Math.random() * 0.5, 0x9ff4ff, 0.32 + Math.random() * 0.2, 1.6, 0.9); } callbacksNow.onCameraShake?.(0.55); }
  function clampToArena(e, slamDamage) { const r = CURATED_AIR_SPEC.enemy.radius, A = CURATED_AIR_SPEC.arena; let hit = false; if (e.pos.x > A.hw - r) { e.pos.x = A.hw - r; hit = true; } if (e.pos.x < -A.hw + r) { e.pos.x = -A.hw + r; hit = true; } if (e.pos.z > A.hd - r) { e.pos.z = A.hd - r; hit = true; } if (e.pos.z < -A.hd + r) { e.pos.z = -A.hd + r; hit = true; } if (!hit) return; const speed = e.carry ? Math.hypot(e.carry.vx, e.carry.vz) : e.vel.length(); if (speed >= CURATED_AIR_SPEC.enemy.wallSlamMin) wallSlam(e, slamDamage != null ? slamDamage : Math.max(10, Math.round(speed * 2))); else { e.vel.multiplyScalar(0.2); e.carry = null; } }

  const SD = CURATED_AIR_SPEC.stormDraft, WA = CURATED_AIR_SPEC.windAgent;
  function makeDraft(x, z, dx, dz, charged) { const wisps = [], n = charged ? 4 : 6; for (let i = 0; i < n; i++) wisps.push({ across: (i / (n - 1) - 0.5) * 2 * SD.halfWidth * (charged ? 0.9 : 1) + (Math.random() - 0.5) * 0.3, along: (Math.random() - 0.5) * 0.85, y: 0.28 + Math.random() * 0.85, spin: Math.random() * TAU, spinRate: (Math.random() * 2 + 1.6) * (Math.random() < 0.5 ? -1 : 1), scale: 0.62 + Math.random() * 0.6, drift: (Math.random() - 0.5) * 1.1 }); return { pos: new THREE.Vector3(x, 0, z), dx, dz, age: 0, life: SD.life, charged: !!charged, hits: [], wisps }; }
  function castStormDraft(charged) {
    const d = player.face;
    if (charged) { volleyQueue.length = 0; for (let v = 0; v < SD.volleys; v++) volleyQueue.push({ at: v * SD.volleyGap, dx: d.x, dz: d.y }); volleyClock = 0; chargedBurstFx(); }
    else { drafts.push(makeDraft(player.pos.x + d.x * SD.spawnGap, player.pos.z + d.y * SD.spawnGap, d.x, d.y, false)); spawnSprite(player.pos.x + d.x * SD.spawnGap, 0.7, player.pos.z + d.y * SD.spawnGap, 2.4, 0xeaf8ff, 0.24, 1.1, 0.85); callbacksNow.onCameraShake?.(0.18); }
    callbacksNow.onCast?.(charged ? 'storm-draft-charged' : 'storm-draft'); return true;
  }
  function fireVolley(dx, dz) { const px = -dz, pz = dx; for (let i = 0; i < SD.perVolley; i++) { const off = (i - (SD.perVolley - 1) / 2) * SD.rankSpacing, sx = player.pos.x + dx * SD.spawnGap + px * off, sz = player.pos.z + dz * SD.spawnGap + pz * off; if (Math.abs(sx) > CURATED_AIR_SPEC.arena.hw || Math.abs(sz) > CURATED_AIR_SPEC.arena.hd) continue; const dr = makeDraft(sx, sz, dx, dz, true); dr.life = SD.life * 1.25; drafts.push(dr); } spawnSprite(player.pos.x + dx * 1.2, 0.7, player.pos.z + dz * 1.2, 3.2, 0xdff4ff, 0.22, 1.2, 0.7); callbacksNow.onCameraShake?.(0.3); }
  function updateVolleys(dt) { if (!volleyQueue.length) return; volleyClock += dt; while (volleyQueue.length && volleyQueue[0].at <= volleyClock) { const v = volleyQueue.shift(); fireVolley(v.dx, v.dz); } }
  function chargedBurstFx() { const px = player.pos.x, pz = player.pos.z; for (let i = 0; i < 22; i++) { const a = Math.random() * TAU, len = 2.4 + Math.random() * 5.4, w = 0.05 + Math.random() * 0.13, q = spawnQuad(px + Math.cos(a) * len * 0.5, pz + Math.sin(a) * len * 0.5, w, len, -a + Math.PI / 2, 0xffffff, 0.34 + Math.random() * 0.2, 1); q.position.y = 0.5 + Math.random() * 0.5; } spawnSprite(px, 0.75, pz, 3.0, 0xffffff, 0.3, 1.4, 1); spawnRing(px, pz, 0.2, 3.4, 0.34, 0xffffff, 1.1); }
  function updateDrafts(dt) {
    for (let i = drafts.length - 1; i >= 0; i--) {
      const d = drafts[i]; d.age += dt;
      if (d.age >= d.life) { for (const en of activeTargets()) if (en.carry?.draft === d) { en.vel.set(en.carry.vx * 0.8, 0, en.carry.vz * 0.8); en.carry = null; } drafts.splice(i, 1); continue; }
      if (!d.stuck) { d.pos.x += d.dx * SD.speed * dt; d.pos.z += d.dz * SD.speed * dt; }
      if (Math.abs(d.pos.x) > CURATED_AIR_SPEC.arena.hw - 0.2 || Math.abs(d.pos.z) > CURATED_AIR_SPEC.arena.hd - 0.2) { if (!d.stuck) { d.stuck = true; d.pos.x = clamp(d.pos.x, -CURATED_AIR_SPEC.arena.hw + 0.2, CURATED_AIR_SPEC.arena.hw - 0.2); d.pos.z = clamp(d.pos.z, -CURATED_AIR_SPEC.arena.hd + 0.2, CURATED_AIR_SPEC.arena.hd - 0.2); spawnSprite(d.pos.x, 0.6, d.pos.z, 2.0, 0xeaf8ff, 0.26, 1.3, 0.6); } }
      for (const e of activeTargets()) { if (d.hits.includes(e)) continue; const rx = e.pos.x - d.pos.x, rz = e.pos.z - d.pos.z, along = rx * d.dx + rz * d.dz, across = rx * (-d.dz) + rz * d.dx; if (Math.abs(along) < 0.95 && Math.abs(across) < SD.halfWidth + CURATED_AIR_SPEC.enemy.radius) { d.hits.push(e); damageEnemy(e, SD.damage, 'storm-draft'); e.carry = { vx: d.dx * SD.speed * 0.92, vz: d.dz * SD.speed * 0.92, draft: d }; e.leanV += 3.4; spawnSprite(e.pos.x, 0.9, e.pos.z, 1.7, 0xffffff, 0.2, 1.2, 0.8); } }
    }
  }
  function drawDrafts(dt) { for (const d of drafts) { const k = d.age / d.life, fade = k < 0.12 ? k / 0.12 : k > 0.7 ? (1 - k) / 0.3 : 1, px = -d.dz, pz = d.dx, ang = Math.atan2(d.dx, d.dz); for (let w = 0; w < d.wisps.length; w++) { const s = d.wisps[w]; s.spin += s.spinRate * dt; const acr = s.across + s.drift * d.age, alo = s.along - d.age * 1.5; pushCrescent(d.pos.x + px * acr + d.dx * alo, s.y + Math.sin(d.age * 6 + w) * 0.06, d.pos.z + pz * acr + d.dz * alo, ang + s.spin, Math.sin(s.spin * 0.7) * 0.5, s.scale * (0.7 + fade * 0.5) * (d.charged ? 1.1 : 1), fade * 0.82, null); } } }
  function makeBars() { const g = new THREE.Group(); const bar = (color, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.075), new THREE.MeshBasicMaterial({ color, depthWrite: false, transparent: true })); m.position.y = y; return m; }; const back = bar(0x101014, 0); back.scale.set(1.08, 3.1, 1); g.add(back); const hp = bar(0xe0392f, 0.055); g.add(hp); const du = bar(0x2f7fe0, -0.035); g.add(du); g.userData = { hp, du }; return g; }
  function nearestEnemy(from, range) { let best = null, bd = range * range; for (const e of activeTargets()) { const dx = e.pos.x - from.x, dz = e.pos.z - from.z, d2 = dx * dx + dz * dz; if (d2 < bd) { bd = d2; best = e; } } return best; }
  function castWindAgents() { for (let i = 0; i < WA.count; i++) { const a = (i / WA.count) * TAU + Math.random(); agents.push({ pos: new THREE.Vector3(player.pos.x + Math.cos(a) * 0.8, 0.55, player.pos.z + Math.sin(a) * 0.8), vel: new THREE.Vector3(), life: WA.duration, hp: WA.health, state: 'follow', timer: WA.chargeEvery * (0.35 + i * 0.4), stateT: 0, dir: new THREE.Vector2(1, 0), travel: 0, orbit: a, spin: Math.random() * TAU, hits: [], bars: null, core: null }); spawnSprite(player.pos.x + Math.cos(a) * 0.8, 0.7, player.pos.z + Math.sin(a) * 0.8, 2.0, 0xffffff, 0.3, 1.2, 0.9); } callbacksNow.onCast?.('whirling-wind-agent'); return true; }
  function updateAgents(dt) {
    for (let i = agents.length - 1; i >= 0; i--) {
      const g = agents[i]; g.life -= dt; g.spin += dt * 9; if (g.life <= 0) { spawnSprite(g.pos.x, g.pos.y, g.pos.z, 2.2, 0xffffff, 0.34, 1.4, 0.85); if (g.bars) { root.remove(g.bars); disposeTree(g.bars); } if (g.core) { root.remove(g.core); g.core.material.dispose(); } agents.splice(i, 1); continue; }
      if (!g.bars) { g.bars = makeBars(); root.add(g.bars); }
      if (!g.core) { g.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xf2fbff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); root.add(g.core); }
      const toP = Math.hypot(player.pos.x - g.pos.x, player.pos.z - g.pos.z);
      if (toP > WA.leashRange) { spawnSprite(g.pos.x, g.pos.y, g.pos.z, 1.8, 0xffffff, 0.28, 1.4, 0.8); g.pos.set(player.pos.x + (Math.random() - 0.5) * 1.4, 0.55, player.pos.z + (Math.random() - 0.5) * 1.4); spawnSprite(g.pos.x, g.pos.y, g.pos.z, 1.8, 0xffffff, 0.28, 1.4, 0.8); g.state = 'follow'; }
      g.stateT += dt;
      if (g.state === 'follow') { g.timer -= dt; g.orbit += dt * 1.1; const tx = player.pos.x + Math.cos(g.orbit) * 1.7, tz = player.pos.z + Math.sin(g.orbit) * 1.7, ax = tx - g.pos.x, az = tz - g.pos.z, al = Math.hypot(ax, az) || 1, sp = Math.min(WA.followSpeed, al * 3.4); g.vel.x += ((ax / al) * sp - g.vel.x) * Math.min(1, dt * 6); g.vel.z += ((az / al) * sp - g.vel.z) * Math.min(1, dt * 6); if (g.timer <= 0) { const target = nearestEnemy(g.pos, WA.seekRange); if (target) { const dx = target.pos.x - g.pos.x, dz = target.pos.z - g.pos.z, dl = Math.hypot(dx, dz) || 1; g.dir.set(dx / dl, dz / dl); g.travel = dl + WA.chargeOvershoot; g.state = 'windup'; g.stateT = 0; g.hits = []; } else g.timer = 0.35; } }
      else if (g.state === 'windup') { g.vel.multiplyScalar(0.82); g.pos.x -= g.dir.x * dt * 1.6; g.pos.z -= g.dir.y * dt * 1.6; if (g.stateT > 0.17) { g.state = 'charge'; g.stateT = 0; } }
      else if (g.state === 'charge') { const step = WA.chargeSpeed * dt; g.pos.x += g.dir.x * step; g.pos.z += g.dir.y * step; g.travel -= step; g.vel.set(0, 0, 0); for (const e of activeTargets()) { if (g.hits.includes(e)) continue; if (Math.hypot(e.pos.x - g.pos.x, e.pos.z - g.pos.z) < 0.95) { g.hits.push(e); damageEnemy(e, WA.damage, 'wind-agent'); knock(e, g.dir.x, g.dir.y, WA.knockback); e.leanV += 2.6; spawnSprite(e.pos.x, 0.95, e.pos.z, 1.9, 0xffffff, 0.22, 1.3, 0.95); } } if (Math.random() < 0.7) spawnSprite(g.pos.x, g.pos.y, g.pos.z, 0.85, 0xdff3ff, 0.24, 0.8, 0.55); if (g.travel <= 0 || Math.abs(g.pos.x) > CURATED_AIR_SPEC.arena.hw || Math.abs(g.pos.z) > CURATED_AIR_SPEC.arena.hd) { g.state = 'recover'; g.stateT = 0; g.timer = WA.chargeEvery; } }
      else { g.vel.multiplyScalar(0.9); if (g.stateT > 0.22) g.state = 'follow'; }
      g.pos.x += g.vel.x * dt; g.pos.z += g.vel.z * dt; g.pos.x = clamp(g.pos.x, -CURATED_AIR_SPEC.arena.hw + 0.3, CURATED_AIR_SPEC.arena.hw - 0.3); g.pos.z = clamp(g.pos.z, -CURATED_AIR_SPEC.arena.hd + 0.3, CURATED_AIR_SPEC.arena.hd - 0.3); g.pos.y = 0.55 + Math.sin(now * 5 + i) * 0.06;
      g.core.position.set(g.pos.x, g.pos.y, g.pos.z); g.core.scale.setScalar((g.state === 'charge' ? 1.5 : 1.15) + Math.sin(g.spin) * 0.09); g.core.material.opacity = 0.62 * Math.min(1, g.life / 0.6); g.bars.position.set(g.pos.x, 0.06, g.pos.z + 0.55); g.bars.quaternion.copy(sourceCamera.quaternion); const f = Math.max(0, g.life / WA.duration); g.bars.userData.hp.scale.x = g.hp / WA.health; g.bars.userData.hp.position.x = -0.31 * (1 - g.hp / WA.health); g.bars.userData.du.scale.x = f; g.bars.userData.du.position.x = -0.31 * (1 - f);
    }
  }
  function drawAgents(dt) { for (let i = 0; i < agents.length; i++) { const g = agents[i], charging = g.state === 'charge', fade = Math.min(1, g.life / 0.6), ang = Math.atan2(g.dir.x, g.dir.y); for (let c = 0; c < 4; c++) { const ph = g.spin * (charging ? 1.7 : 1) + c * 1.57, rad = charging ? 0.30 : 0.42; pushCrescent(g.pos.x + Math.cos(ph) * rad, g.pos.y + Math.sin(ph * 1.3 + c) * 0.16 + c * 0.05, g.pos.z + Math.sin(ph) * rad, ang + ph * 1.4, Math.sin(ph) * 0.7, (charging ? 0.95 : 0.78) + Math.sin(ph) * 0.1, fade * (charging ? 1 : 0.85), null); } pushCrescent(g.pos.x, g.pos.y, g.pos.z, g.spin * 2.2, 0.2, charging ? 0.7 : 0.55, fade * 0.9, null); } }
  function integrateTargets(dt) { for (const e of activeTargets()) { if (e.carry) { moveTarget(e, e.carry.vx * dt, e.carry.vz * dt, { source: 'storm-draft-carry' }); } else { moveTarget(e, e.vel.x * dt, e.vel.z * dt, { source: 'air-knockback' }); e.vel.multiplyScalar(Math.pow(0.0016, dt)); } e.stun = Math.max(0, e.stun - dt); e.hitFlash = Math.max(0, e.hitFlash - dt * 5.5); clampToArena(e); } }
  function disposeTree(o) { o.traverse?.(x => { x.geometry?.dispose?.(); if (Array.isArray(x.material)) x.material.forEach(m => m?.dispose?.()); else x.material?.dispose?.(); }); }
  function render(dt) { beginCrescents(); drawDrafts(dt); drawAgents(dt); endCrescents(); }
  function update(dt, context = {}) { const frameDt = Math.max(0, Number(dt) || 0); now += frameDt; if (context.callbacks) setCallbacks(context.callbacks); syncPlayer(context); syncTargets(context.targets ?? targetRefs); if (context.cameraQuaternion) sourceCamera.quaternion.copy(context.cameraQuaternion); updateVolleys(frameDt); updateDrafts(frameDt); updateAgents(frameDt); integrateTargets(frameDt); updateSprites(frameDt); updateQuads(frameDt); updateDecals(frameDt); updateRings(frameDt); render(frameDt); }
  function cast(id, context = {}) { if (context.targets) syncTargets(context.targets); syncPlayer(context); if (context.callbacks) setCallbacks(context.callbacks); const key = String(id || '').toUpperCase().replace(/[^A-Z]/g, ''); const charged = !!context.charged || key.includes('CHARGED'); if (key.includes('STORM') || key.includes('DRAFT')) return castStormDraft(charged); if (key.includes('AGENT') || key.includes('WHIRL')) return castWindAgents(); return false; }
  function reset() { drafts.length = 0; volleyQueue.length = 0; volleyClock = 0; for (const g of agents) { if (g.bars) { root.remove(g.bars); disposeTree(g.bars); } if (g.core) { root.remove(g.core); g.core.material.dispose(); } } agents.length = 0; liveSprites.forEach(s => { s.visible = false; }); liveSprites.length = 0; liveQuads.forEach(q => { q.visible = false; }); liveQuads.length = 0; liveDecals.forEach(d => { d.visible = false; }); liveDecals.length = 0; liveRings.forEach(r => { r.visible = false; }); liveRings.length = 0; crescentCount = 0; crescents.count = 0; }
  function dispose() { reset(); root.parent?.remove(root); root.traverse(o => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(m => m?.dispose?.()); else o.material?.dispose?.(); }); puffTex?.dispose?.(); shadowTex?.dispose?.(); }
  function snapshot() { return { source: 'wizard-of-legend-air-arcana-demo.html', sha256: 'dc36d63a71b58288bd815b3adc7518e3fb6a2a1ed1ab594404bf0ac29a9b4813', size: scale, spec: CURATED_AIR_SPEC, drafts: drafts.length, agents: agents.length, volleys: volleyQueue.length }; }
  syncPlayer({ player: initialPlayer }); syncTargets(initialTargets);
  return { root, cast, update, reset, dispose, snapshot, setCallbacks, syncTargets, constants: CURATED_AIR_SPEC };
}
