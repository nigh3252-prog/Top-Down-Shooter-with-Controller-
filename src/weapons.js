// Stone Wanderer weapon definitions and 3D weapon builders.
//
// weapon-lab.html imports this module directly and calls installRedTollGreatsword()
// once during setup, so the 3D greatsword code lives in one source file instead of
// inside the page, and no HTML string-patching happens at runtime.

export const STONE_WEAPON_ORDER = [
  'longsword',
  'dagger',
  'rapier',
  'saber',
  'mace',
  'spear',
  'battleaxe',
  'warhammer',
  'claymore',
  'greatsword'
];

export const STONE_WEAPONS = {
  longsword: {
    label: 'Longsword',
    weightClass: 'Medium',
    kind: 'blade',
    baseLength: 1.00,
    profile: 'balanced sword; default testing weapon',
    tune: { length: 1.00, weight: 0.35, pullback: 1.00, swingWidth: 1.00, windup: 1.00, follow: 1.00, recovery: 1.00, impact: 1.00, trailBoost: 1.00 }
  },
  dagger: {
    label: 'Dagger',
    weightClass: 'Light',
    kind: 'blade',
    baseLength: 0.55,
    profile: 'short, snappy, little recovery',
    tune: { length: 0.55, weight: 0.06, pullback: 0.28, swingWidth: 0.62, windup: 0.62, follow: 0.60, recovery: 0.55, impact: 0.48, trailBoost: 0.58 }
  },
  rapier: {
    label: 'Rapier',
    weightClass: 'Light',
    kind: 'rapier',
    baseLength: 0.98,
    profile: 'needle tip; best on thrusts with quick recovery',
    tune: { length: 0.92, weight: 0.12, pullback: 0.55, swingWidth: 0.58, windup: 0.72, follow: 0.70, recovery: 0.62, impact: 0.62, trailBoost: 0.75 }
  },
  saber: {
    label: 'Saber',
    weightClass: 'Light/Medium',
    kind: 'saber',
    baseLength: 0.92,
    profile: 'curved cutter; wider slashes, still fast',
    tune: { length: 0.88, weight: 0.24, pullback: 0.78, swingWidth: 1.12, windup: 0.82, follow: 0.88, recovery: 0.78, impact: 0.82, trailBoost: 1.05 }
  },
  whip: {
    label: 'Whip',
    weightClass: 'Light / Reach',
    kind: 'whip',
    baseLength: 1.65,
    profile: 'flexible lash; snaps forward near contact',
    tune: { length: 1.42, weight: 0.10, pullback: 1.25, swingWidth: 1.35, windup: 0.86, follow: 1.05, recovery: 0.86, impact: 0.70, trailBoost: 1.70 }
  },
  mace: {
    label: 'Mace',
    weightClass: 'Medium',
    kind: 'mace',
    baseLength: 0.82,
    profile: 'compact blunt head; chunky impact',
    tune: { length: 0.78, weight: 0.52, pullback: 1.08, swingWidth: 0.96, windup: 1.08, follow: 1.10, recovery: 1.12, impact: 1.38, trailBoost: 0.88 }
  },
  spear: {
    label: 'Spear',
    weightClass: 'Medium / Reach',
    kind: 'spear',
    baseLength: 1.58,
    profile: 'long shaft; big reach and direct thrusts',
    tune: { length: 1.42, weight: 0.34, pullback: 0.95, swingWidth: 0.72, windup: 0.96, follow: 0.96, recovery: 0.94, impact: 0.95, trailBoost: 0.90 }
  },
  battleaxe: {
    label: 'Battle Axe',
    weightClass: 'Medium/Heavy',
    kind: 'axe',
    baseLength: 1.02,
    profile: 'top-heavy blade; committed chops',
    tune: { length: 1.02, weight: 0.64, pullback: 1.25, swingWidth: 1.22, windup: 1.22, follow: 1.34, recovery: 1.30, impact: 1.55, trailBoost: 1.05 }
  },
  warhammer: {
    label: 'War Hammer',
    weightClass: 'Heavy',
    kind: 'hammer',
    baseLength: 0.98,
    profile: 'heavy blunt head; slow windup and huge hit feel',
    tune: { length: 0.98, weight: 0.88, pullback: 1.52, swingWidth: 1.08, windup: 1.42, follow: 1.55, recovery: 1.60, impact: 1.90, trailBoost: 0.92 }
  },
  claymore: {
    label: 'Claymore',
    weightClass: 'Heavy',
    kind: 'blade',
    baseLength: 1.48,
    profile: 'big two-handed blade; wide arcs and deep pullback',
    tune: { length: 1.55, weight: 0.84, pullback: 1.65, swingWidth: 1.45, windup: 1.55, follow: 1.62, recovery: 1.72, impact: 1.75, trailBoost: 1.45 }
  },
  greatsword: {
    label: 'Greatsword',
    weightClass: 'Heavy',
    kind: 'blade',
    baseLength: 1.70,
    profile: 'longest rigid blade; extra reach and camera room',
    tune: { length: 1.78, weight: 0.76, pullback: 1.58, swingWidth: 1.34, windup: 1.46, follow: 1.50, recovery: 1.58, impact: 1.60, trailBoost: 1.32 },
    visualVariants: {
      original: { label: 'Original Greatsword', meshBuilder: 'defaultRigidBlade' },
      redToll: {
        label: 'Red Toll',
        meshBuilder: 'redTollGreatsword',
        lengthMultiplier: 1.30,
        rotationDefaults: { global: 180, vertical: 90, horizontal: 0, stab: 0 }
      }
    }
  }
};

export function cloneWeaponDefinitions() {
  return JSON.parse(JSON.stringify(STONE_WEAPONS));
}

export function getStoneWeapon(id) {
  return STONE_WEAPONS[id] || STONE_WEAPONS.longsword;
}

// Installs the Red Toll greatsword visual variant directly into a running lab
// instance. `api` is the host page's dependency surface — a getter/setter bag
// built in the same module scope as the functions it overrides, so assigning
// api.rebuildCombatWeaponMesh really does repoint the host's function binding
// (every existing call site in the host keeps working unchanged).
// Expected shape:
//   { THREE, WEAPONS, combatState, RIG, BASE_RIG, BASE_BLADE_LEN,
//     get rebuildCombatWeaponMesh(), set rebuildCombatWeaponMesh(fn),
//     get weaponRoot(), clearWeaponRoot, updateWeaponDynamicVisual,
//     applyCombatWeaponTuning }
export function installRedTollGreatsword(api) {
  const { THREE, WEAPONS, combatState, RIG } = api;
  const RT_KEYS = { g: 'redToll.rot.global.v4', v: 'redToll.rot.vertical.v4', h: 'redToll.rot.horizontal.v4', s: 'redToll.rot.stab.v4' };
  const RT_GS_LENGTH = 1.78 * 1.30;
  if (WEAPONS && WEAPONS.greatsword && WEAPONS.greatsword.tune) {
    WEAPONS.greatsword.tune.length = Math.min(2.45, RT_GS_LENGTH);
    WEAPONS.greatsword.baseLength = WEAPONS.greatsword.tune.length;
    WEAPONS.greatsword.visualVariant = 'redToll';
  }
  let rtRotGlobal = Number(localStorage.getItem(RT_KEYS.g) || 180);
  let rtRotVertical = Number(localStorage.getItem(RT_KEYS.v) || 90);
  let rtRotHorizontal = Number(localStorage.getItem(RT_KEYS.h) || 0);
  let rtRotStab = Number(localStorage.getItem(RT_KEYS.s) || 0);
  let rtSword = null;
  function rtGroup() { return (combatState && combatState.attack && (combatState.attack.group || combatState.attackGroup)) || combatState.attackGroup || combatState.last || 'vertical'; }
  function rtDegrees() { const g = rtGroup(); return (rtRotGlobal || 0) + (g === 'horizontal' ? (rtRotHorizontal || 0) : g === 'stab' ? (rtRotStab || 0) : (rtRotVertical || 0)); }
  function rtApply() { if (rtSword) rtSword.rotation.y = THREE.MathUtils.degToRad(rtDegrees()); }

  function rtBladeTexture() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#66716a'); grad.addColorStop(.5, '#75806f'); grad.addColorStop(1, '#8d9484');
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 460; i++) { const x = Math.random() * 1024, y = Math.random() * 512, r = 4 + Math.random() * 28, v = 38 + Math.random() * 46 | 0; g.fillStyle = 'rgba(' + v + ',' + (v + 6) + ',' + (v - 2) + ',' + (0.05 + Math.random() * 0.09) + ')'; g.beginPath(); g.ellipse(x, y, r, r * (.3 + Math.random() * .7), Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 90; i++) { const x = Math.random() * 1024, y = Math.random() * 512, r = 5 + Math.random() * 18; g.fillStyle = 'rgba(' + (110 + Math.random() * 40 | 0) + ',' + (70 + Math.random() * 25 | 0) + ',40,' + (0.05 + Math.random() * 0.08) + ')'; g.beginPath(); g.ellipse(x, y, r, r * .5, Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 60; i++) { const y = Math.random() * 512, x = Math.random() * 800, len = 60 + Math.random() * 260; g.strokeStyle = 'rgba(210,214,200,' + (0.04 + Math.random() * 0.07) + ')'; g.lineWidth = .6 + Math.random() * 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (Math.random() - .5) * 4); g.stroke(); }
    g.fillStyle = 'rgba(226,230,216,0.18)'; g.fillRect(0, 250, 1024, 10);
    g.fillStyle = '#5c110b'; g.fillRect(0, 0, 1024, 22);
    g.fillStyle = 'rgba(122,22,13,0.85)'; g.fillRect(0, 22, 1024, 10);
    for (let i = 0; i < 46; i++) { const x = Math.pow(Math.random(), 1.7) * 1024, len = 40 + Math.random() * Math.random() * 300, w = 3 + Math.random() * 9, dg = g.createLinearGradient(0, 0, 0, len); dg.addColorStop(0, 'rgba(112,20,12,0.95)'); dg.addColorStop(.8, 'rgba(140,32,18,0.8)'); dg.addColorStop(1, 'rgba(140,32,18,0)'); g.save(); g.translate(x, 18); g.fillStyle = dg; g.beginPath(); g.moveTo(-w / 2, 0); g.quadraticCurveTo(-w * .28, len * .6, 0, len); g.quadraticCurveTo(w * .28, len * .6, w / 2, 0); g.closePath(); g.fill(); g.restore(); }
    for (let i = 0; i < 70; i++) { const x = Math.pow(Math.random(), 1.5) * 1024, y = Math.random() * 70; g.fillStyle = 'rgba(' + (100 + Math.random() * 50 | 0) + ',' + (16 + Math.random() * 14 | 0) + ',10,' + (0.2 + Math.random() * 0.4) + ')'; g.beginPath(); g.ellipse(x, y, 2 + Math.random() * 9, 1.5 + Math.random() * 5, Math.random() * 3, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(58,52,44,0.35)'; g.fillRect(0, 496, 1024, 16);
    const t = new THREE.CanvasTexture(c); t.flipY = false; t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function rtGuardTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), cx = 128, cy = 128;
    g.fillStyle = '#7c5f34'; g.fillRect(0, 0, 256, 256);
    [[118, '#5c4423', 7], [104, '#8d6d3c', 3], [86, '#54401f', 6], [66, '#8d6d3c', 3], [46, '#4c3a1c', 8], [26, '#8a6a38', 4]].forEach(q => { g.strokeStyle = q[1]; g.lineWidth = q[2]; g.beginPath(); g.arc(cx, cy, q[0], 0, 7); g.stroke(); });
    g.strokeStyle = '#4a3819'; g.lineWidth = 3;
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); g.lineTo(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112); g.stroke(); }
    for (let i = 0; i < 380; i++) { g.fillStyle = 'rgba(' + (60 + Math.random() * 120 | 0) + ',' + (50 + Math.random() * 80 | 0) + ',30,' + (0.06 + Math.random() * 0.12) + ')'; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function rtWrapTexture() {
    const c = document.createElement('canvas'); c.width = 32; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#b08a5e'; x.fillRect(0, 0, 32, 26);
    x.fillStyle = '#2c2622'; x.fillRect(0, 26, 32, 6);
    x.fillStyle = '#83291c'; x.fillRect(0, 32, 32, 26);
    x.fillStyle = '#2c2622'; x.fillRect(0, 58, 32, 6);
    for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.15) + ')'; x.fillRect(Math.random() * 32, Math.random() * 64, 2, 1); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 7); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function makeRedTollGreatsword() {
    const root = new THREE.Group(), L = 6.4, HALF_W = .975, BASE_T = .17, N = 30, pos = [], uv = [], idx = [];
    const eF = t => HALF_W * (1 - t) + .015, eB = t => -(HALF_W * (1 - t) + .015), th = t => BASE_T * (1 - t) + .010, mid = t => 0;
    const strips = [{ a: t => [eF(t), t * L, 0], b: t => [mid(t), t * L, th(t)], va: 0, vb: .5 }, { a: t => [mid(t), t * L, th(t)], b: t => [eB(t), t * L, 0], va: .5, vb: 1 }, { a: t => [eB(t), t * L, 0], b: t => [mid(t), t * L, -th(t)], va: 1, vb: .5 }, { a: t => [mid(t), t * L, -th(t)], b: t => [eF(t), t * L, 0], va: .5, vb: 0 }];
    for (const s of strips) { const base = pos.length / 3; for (let r = 0; r <= N; r++) { const t = r / N; pos.push(...s.a(t)); uv.push(t, s.va); pos.push(...s.b(t)); uv.push(t, s.vb); } for (let r = 0; r < N; r++) { const i = base + r * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); } }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.setIndex(idx); bg.computeVertexNormals();
    const blade = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ map: rtBladeTexture(), side: THREE.DoubleSide })); blade.position.y = .14; root.add(blade);
    const bronze = new THREE.MeshLambertMaterial({ color: 0x8a6a3a }), dark = new THREE.MeshLambertMaterial({ color: 0x53401f }), guard = new THREE.Group(), disc = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .10, 40), new THREE.MeshLambertMaterial({ map: rtGuardTexture() }));
    disc.rotation.x = Math.PI / 2; guard.add(disc);
    guard.add(new THREE.Mesh(new THREE.TorusGeometry(.95, .06, 10, 44), dark));
    guard.add(new THREE.Mesh(new THREE.TorusGeometry(.55, .045, 10, 36), bronze));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, sp = new THREE.Mesh(new THREE.BoxGeometry(.06, .60, .17), bronze); sp.position.set(Math.cos(a) * .58, Math.sin(a) * .58, 0); sp.rotation.z = a + Math.PI / 2; guard.add(sp); }
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(.20, .20, .17, 20), dark); boss.rotation.x = Math.PI / 2; guard.add(boss);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(1.15, .30, .20), dark); collar.position.set(0, .16, 0); guard.add(collar);
    guard.scale.set(.70, .70, 1); guard.position.set(0, 0, 0); root.add(guard);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.085, .092, 2.25, 10), new THREE.MeshLambertMaterial({ map: rtWrapTexture() })); handle.position.y = -1.375; root.add(handle);
    const pom = new THREE.Group(), ring = new THREE.Mesh(new THREE.TorusGeometry(.10, .022, 8, 20), dark); ring.rotation.x = Math.PI / 2; ring.position.y = -2.44; pom.add(ring);
    const pd = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .07, 16), bronze); pd.position.y = -2.53; pom.add(pd);
    const pk = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), dark); pk.position.y = -2.61; pom.add(pk); root.add(pom);
    root.userData = { blade, guard, handle, pommel: pom, bladeLength: L };
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    return root;
  }
  function makeRedTollCombatGreatsword(bladeLen, baseY) {
    const s = makeRedTollGreatsword(), scale = Math.max(.001, bladeLen / (s.userData.bladeLength || 6.4));
    s.scale.setScalar(scale); s.position.set(0, baseY, 0); rtSword = s; rtApply(); return s;
  }
  const rtOriginalRebuildCombatWeaponMesh = api.rebuildCombatWeaponMesh;
  api.rebuildCombatWeaponMesh = function () {
    if (!api.weaponRoot || !combatState || combatState.weapon !== 'greatsword') return rtOriginalRebuildCombatWeaponMesh();
    api.clearWeaponRoot();
    api.activeWeaponKind = 'blade';
    const bladeLen = Math.max(.08, RIG.bladeTip - RIG.bladeBase);
    api.weaponRoot.add(makeRedTollCombatGreatsword(bladeLen, RIG.bladeBase));
    api.updateWeaponDynamicVisual(0, 0);
  };
  function bindRedTollTuning() {
    const rows = [['rtRotGlobal', 'g', 'rtRotGlobalReadout'], ['rtRotVertical', 'v', 'rtRotVerticalReadout'], ['rtRotHorizontal', 'h', 'rtRotHorizontalReadout'], ['rtRotStab', 's', 'rtRotStabReadout']];
    const get = k => k === 'g' ? rtRotGlobal : k === 'v' ? rtRotVertical : k === 'h' ? rtRotHorizontal : rtRotStab;
    const set = (k, v) => { if (k === 'g') rtRotGlobal = v; else if (k === 'v') rtRotVertical = v; else if (k === 'h') rtRotHorizontal = v; else rtRotStab = v; localStorage.setItem(RT_KEYS[k], String(v)); rtApply(); };
    rows.forEach(([id, k, outId]) => {
      const el = document.getElementById(id), out = document.getElementById(outId);
      if (!el || !out) return;
      el.value = String(get(k) || 0);
      const up = () => { const v = Number(el.value) || 0; out.textContent = Math.round(v) + '°'; set(k, v); };
      el.addEventListener('input', up); up();
    });
  }
  bindRedTollTuning();
  if (combatState && combatState.weapon === 'greatsword') api.applyCombatWeaponTuning();
}
