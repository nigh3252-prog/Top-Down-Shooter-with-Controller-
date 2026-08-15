/*
 * Direct source port for upload/wizard-of-legend-earth-arcana.html.
 *
 * The Earth palette, textures, rock pools, sigil, crag, and fist routines in
 * this module are copied from the supplied standalone Three.js demo. The
 * wrapper supplies a local source scene, live target proxies, camera space,
 * and native gameplay callbacks.
 */
export function createWizardEarthArcanaSourcePort({
  THREE,scene:worldScene,parent=null,camera:worldCamera,size=1,
}={}){
  if(!THREE||!worldScene)throw new Error('Wizard Earth source port requires THREE and scene.');
  const root=new THREE.Group();
  (parent||worldScene).add(root);
  const scene=root;
  const camera=new THREE.PerspectiveCamera();
  let now=0;
  const dummies=[];
  let onHit=()=>{};
  let onGrab=()=>{};
  const player=new THREE.Group();
  player.position.set(0,0,0);
  const playerState={facing:0,bob:0,castAnim:0,castKind:0};
  const ui={
    enhGrasp:{checked:false},
    charging:{classList:{add(){},remove(){}}},
  };
const T = THREE;
const PI = Math.PI, TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;

/* ---------------------------------------------------------------- tuning -- */
const CFG = {
  terra: {
    spokes: 9,            // radial lanes counted off the burnt fan in the video
    reach: 4.6,           // how far the spikes tunnel
    digSpeed: 3.3,        // units/s outward
    emitStep: 0.30,       // distance between rocks along a lane
    hitDamage: 15,
    maxHits: 5,
    knock: 3.6,
    cooldown: 5.0,
    enhancedDamage: 50,   // enhanced: every spike at once, one hit
    charged: {
      windup: 0.85,
      beats: 5,
      beatGap: 0.45,
      beatDamage: 25,
      finalDamage: 50,
      radius: 4.7,
      pillarsPerBeat: 26
    }
  },
  grasp: {
    minRadius: 1.25,
    maxRadius: 4.6,
    growTime: 1.35,
    impactDamage: 10,
    tickDamage: 3,
    ticks: 5,
    tickGap: 0.45,
    enhancedTicks: 10,
    enhancedTickGap: 0.28,
    finalDamage: 25,
    cooldown: 7.5
  },
  player: { speed: 4.4 },
  dummy: { hp: 500, respawn: 4.0 }
};

/* --------------------------------------------------------------- palette -- */
const COL = {
  rockTop:  0xc9a061,
  rockMid:  0xa8783f,
  rockDeep: 0x7d5628,
  scorch:   0x24201b,
  robe:     0x8e2f34,
  robeDark: 0x5d1f24,
  skin:     0xe8c9a8,
  hood:     0xd9d2c2,
  wood:     0xc79c5e,
  woodDark: 0x8f6c3c,
  stone:    0x8d9095
};

/* =========================================================== procedural art */

function canvas2d(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

/* Dungeon floor: big grey slabs, grout, hairline cracks, dirt mottling. */
function makeFloorTexture() {
  const S = 512, [c, g] = canvas2d(S);
  g.fillStyle = '#5f6265'; g.fillRect(0, 0, S, S);
  const cell = S / 4;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const off = (y % 2) * cell * 0.5;
      const px = (x * cell + off) % S, py = y * cell;
      const v = randInt(-9, 9);
      g.fillStyle = `rgb(${123 + v},${126 + v},${129 + v})`;
      roundRect(g, px + 3, py + 3, cell - 6, cell - 6, 6); g.fill();
      // slab shading
      const grd = g.createLinearGradient(px, py, px + cell, py + cell);
      grd.addColorStop(0, 'rgba(255,255,255,.07)');
      grd.addColorStop(1, 'rgba(0,0,0,.13)');
      g.fillStyle = grd;
      roundRect(g, px + 3, py + 3, cell - 6, cell - 6, 6); g.fill();
      // wrap the offset row
      if (off > 0 && x === 3) {
        g.fillStyle = `rgb(${123 + v},${126 + v},${129 + v})`;
        roundRect(g, px - S + 3, py + 3, cell - 6, cell - 6, 6); g.fill();
      }
    }
  }
  // speckle
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${randInt(0, 255)},${randInt(0, 255)},${randInt(0, 255)},.035)`;
    g.fillRect(rand(0, S), rand(0, S), 2, 2);
  }
  // cracks
  g.strokeStyle = 'rgba(30,32,34,.5)'; g.lineWidth = 1.4;
  for (let i = 0; i < 16; i++) {
    let x = rand(0, S), y = rand(0, S), a = rand(0, TAU);
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 7; s++) { a += rand(-.6, .6); x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
    g.stroke();
  }
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.anisotropy = 8;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* Soft dark blob left where a spike broke the floor. */
function makeScorchTexture() {
  const S = 128, [c, g] = canvas2d(S);
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(0,0,0,.95)');
  grd.addColorStop(.45, 'rgba(0,0,0,.72)');
  grd.addColorStop(.8, 'rgba(0,0,0,.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  // ragged rim so the fan does not read as clean circles
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    const a = rand(0, TAU), r = rand(S * .3, S * .5);
    g.beginPath();
    g.arc(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, rand(4, 13), 0, TAU);
    g.fill();
  }
  return new T.CanvasTexture(c);
}

/* Four-point white star used for every contact spark. */
function makeSparkTexture() {
  const S = 128, [c, g] = canvas2d(S);
  g.translate(S / 2, S / 2);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, S * .22);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, S * .22, 0, TAU); g.fill();
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = i * PI / 2;
    g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * S * .48, Math.sin(a) * S * .48); g.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const a = i * PI / 2 + PI / 4;
    g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * S * .26, Math.sin(a) * S * .26); g.stroke();
  }
  return new T.CanvasTexture(c);
}

/* The charged signature's white star of thin rays. */
function makeStarburstTexture() {
  const S = 512, [c, g] = canvas2d(S);
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff'; g.lineCap = 'butt';
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(-.05, .05);
    const len = S * rand(.2, .49);
    g.lineWidth = rand(1.6, 3.6);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * len, Math.sin(a) * len); g.stroke();
  }
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, S * .17);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(.5, 'rgba(255,255,255,.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(0, 0, S * .17, 0, TAU); g.fill();
  return new T.CanvasTexture(c);
}

/* Grasping Earth's sigil, split over two counter-rotating plates.
   layer 0 = the long sweeping arcs, layer 1 = rings, runes and arc text. */
function makeSigilTexture(layer) {
  const S = 1024, [c, g] = canvas2d(S);
  const R = S / 2;
  g.translate(R, R);
  g.strokeStyle = 'rgba(255,255,255,.92)';
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.lineCap = 'round';

  if (layer === 0) {
    // three broad crescents that sweep most of the way around
    const arcs = [
      { r: .90, from: -0.35, to: 3.15, w: 11 },
      { r: .74, from: 2.10, to: 5.60, w: 9 },
      { r: .58, from: 4.30, to: 7.40, w: 7.5 }
    ];
    for (const a of arcs) {
      g.lineWidth = a.w;
      g.beginPath(); g.arc(0, 0, R * a.r, a.from, a.to); g.stroke();
      // the taper each crescent has at its trailing end
      g.lineWidth = a.w * .45;
      g.beginPath(); g.arc(0, 0, R * a.r, a.to, a.to + .55); g.stroke();
    }
    // spurs joining the crescents inward
    g.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 + .4;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * .90, Math.sin(a) * R * .90);
      g.lineTo(Math.cos(a + .18) * R * .58, Math.sin(a + .18) * R * .58);
      g.stroke();
    }
  } else {
    g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, R * .96, 0, TAU); g.stroke();
    g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, R * .90, 0, TAU); g.stroke();
    g.lineWidth = 3.5;
    g.beginPath(); g.arc(0, 0, R * .40, 0, TAU); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, R * .33, 0, TAU); g.stroke();

    // rune medallions pinned around the rim
    const glyphs = ['ᚠ', 'ᚱ', 'ᛁ', 'ᛚ', 'ᛒ', 'ᛣ', 'ᚾ', 'ᛇ'];
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + .21;
      const x = Math.cos(a) * R * .93, y = Math.sin(a) * R * .93;
      g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, R * .052, 0, TAU); g.stroke();
      g.save(); g.translate(x, y); g.rotate(a + PI / 2);
      g.font = `${Math.round(R * .062)}px "Courier New",monospace`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(glyphs[i], 0, 0);
      g.restore();
    }

    // curved incantation under the caster
    g.font = `${Math.round(R * .052)}px "Courier New",monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = 'TERRA · MANUS · CAPERE · SAXUM · ';
    const rr = R * .50, step = .085;
    for (let i = 0; i < words.length; i++) {
      const a = PI * .18 + i * step;
      g.save();
      g.translate(Math.cos(a) * rr, Math.sin(a) * rr);
      g.rotate(a + PI / 2);
      g.fillText(words[i], 0, 0);
      g.restore();
    }

    // tick marks between the rings
    g.lineWidth = 2;
    for (let i = 0; i < 48; i++) {
      const a = i * TAU / 48;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * .40, Math.sin(a) * R * .40);
      g.lineTo(Math.cos(a) * R * .44, Math.sin(a) * R * .44);
      g.stroke();
    }
  }
  return new T.CanvasTexture(c);
}

/* Radiating floor cracks under a fist / a heavy impact. */
function makeCrackTexture() {
  const S = 256, [c, g] = canvas2d(S);
  g.translate(S / 2, S / 2);
  g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    let a = i * TAU / 14 + rand(-.2, .2), x = 0, y = 0;
    g.lineWidth = rand(2, 5);
    g.beginPath(); g.moveTo(0, 0);
    const segs = randInt(3, 5);
    for (let s = 0; s < segs; s++) {
      a += rand(-.35, .35);
      const d = rand(12, 26);
      x += Math.cos(a) * d; y += Math.sin(a) * d;
      g.lineTo(x, y);
    }
    g.stroke();
    // small forks
    if (Math.random() < .6) {
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + Math.cos(a + 1) * 12, y + Math.sin(a + 1) * 12); g.stroke();
    }
  }
  return new T.CanvasTexture(c);
}
const TEX = {
  scorch: makeScorchTexture(),
  spark: makeSparkTexture(),
  star: makeStarburstTexture(),
  crack: makeCrackTexture(),
  sigilA: makeSigilTexture(0),
  sigilB: makeSigilTexture(1)
};

const rockMats = [
  new T.MeshLambertMaterial({ color: COL.rockTop, flatShading: true }),
  new T.MeshLambertMaterial({ color: COL.rockMid, flatShading: true }),
  new T.MeshLambertMaterial({ color: COL.rockDeep, flatShading: true })
];

/* A handful of chunky boulder shapes, reused everywhere. */
function makeRockGeometry(seedScale) {
  const g = new T.IcosahedronGeometry(1, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new T.Vector3().fromBufferAttribute(p, i);
    v.multiplyScalar(rand(.72, 1.28));
    v.y = v.y * seedScale + (v.y > 0 ? .18 : 0);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const rockGeos = [
  makeRockGeometry(1.55), makeRockGeometry(1.25), makeRockGeometry(1.85),
  makeRockGeometry(1.0), makeRockGeometry(2.2)
];

/* ==================================================================== pools */

class Pool {
  constructor(make, size) {
    this.free = []; this.live = [];
    for (let i = 0; i < size; i++) { const o = make(); o.visible = false; this.free.push(o); }
  }
  take() {
    const o = this.free.pop();
    if (!o) return null;                 // budget spent this frame — skip, never steal
    o.visible = true;
    this.live.push(o);
    return o;
  }
  release(o) {
    o.visible = false;
    const i = this.live.indexOf(o);
    if (i >= 0) this.live.splice(i, 1);
    this.free.push(o);
  }
}

/* ---- rocks ---------------------------------------------------------- */
const rockGroup = new T.Group(); scene.add(rockGroup);
const rockPool = new Pool(() => {
  const m = new T.Mesh(rockGeos[0], rockMats[0]);
  m.castShadow = true; m.receiveShadow = true;
  rockGroup.add(m);
  return m;
}, 460);
const rocks = [];   // {mesh, born, rise, hold, sink, h, baseY, spin}

function spawnRock(x, z, size, opts = {}) {
  const m = rockPool.take(); if (!m) return null;
  m.geometry = rockGeos[randInt(0, rockGeos.length - 1)];
  m.material = rockMats[randInt(0, 2)];
  const h = size * rand(.85, 1.25);
  m.scale.set(size * rand(.7, 1.05), h, size * rand(.7, 1.05));
  m.position.set(x, -h, z);
  m.rotation.set(rand(-.16, .16), rand(0, TAU), rand(-.16, .16));
  const r = {
    mesh: m, t: 0,
    rise: opts.rise ?? .11,
    hold: opts.hold ?? .42,
    sink: opts.sink ?? .30,
    top: h * rand(.52, .78),
    bottom: -h
  };
  rocks.push(r);
  return r;
}

function updateRocks(dt) {
  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i];
    r.t += dt;
    const { rise, hold, sink } = r;
    let y;
    if (r.t < rise) {
      const k = r.t / rise;
      y = lerp(r.bottom, r.top * 1.12, easeOut(k));
    } else if (r.t < rise + hold) {
      const k = (r.t - rise) / hold;
      y = lerp(r.top * 1.12, r.top, Math.min(1, k * 5));
    } else if (r.t < rise + hold + sink) {
      const k = (r.t - rise - hold) / sink;
      y = lerp(r.top, r.bottom, easeIn(k));
    } else {
      rockPool.release(r.mesh); rocks.splice(i, 1); continue;
    }
    r.mesh.position.y = y;
  }
}

/* ---- scorch decals -------------------------------------------------- */
const scorchGroup = new T.Group(); scene.add(scorchGroup);
const scorchPool = new Pool(() => {
  const m = new T.Mesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({
      map: TEX.scorch, color: COL.scorch, transparent: true,
      depthWrite: false, opacity: .85
    })
  );
  m.rotation.x = -PI / 2;
  m.renderOrder = 1;
  m.material = m.material.clone();
  scorchGroup.add(m);
  return m;
}, 460);
const scorches = [];

function spawnScorch(x, z, size, life = 2.6, peak = .8) {
  const m = scorchPool.take(); if (!m) return;
  m.position.set(x, .015 + Math.random() * .01, z);
  m.scale.set(size, size, 1);
  m.rotation.z = rand(0, TAU);
  m.material.opacity = 0;
  scorches.push({ mesh: m, t: 0, life, peak });
}

function updateScorch(dt) {
  for (let i = scorches.length - 1; i >= 0; i--) {
    const s = scorches[i];
    s.t += dt;
    const k = s.t / s.life;
    if (k >= 1) { scorchPool.release(s.mesh); scorches.splice(i, 1); continue; }
    s.mesh.material.opacity = k < .1 ? s.peak * (k / .1) : s.peak * (1 - (k - .1) / .9);
  }
}

/* ---- sparks --------------------------------------------------------- */
const sparkPool = new Pool(() => {
  const s = new T.Sprite(new T.SpriteMaterial({
    map: TEX.spark, transparent: true, depthTest: false
  }));
  s.material = s.material.clone();
  s.renderOrder = 20;
  scene.add(s);
  return s;
}, 90);
const sparks = [];

function spawnSpark(x, y, z, size = 1.5, life = .30) {
  const s = sparkPool.take(); if (!s) return;
  s.position.set(x, y, z);
  s.scale.set(size, size, 1);
  s.material.opacity = 1;
  s.material.rotation = rand(0, TAU);
  sparks.push({ sprite: s, t: 0, life, size });
}

function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.t += dt;
    const k = s.t / s.life;
    if (k >= 1) { sparkPool.release(s.sprite); sparks.splice(i, 1); continue; }
    const sc = s.size * (1 + easeOut(k) * .55);
    s.sprite.scale.set(sc, sc, 1);
    s.sprite.material.opacity = 1 - k * k;
  }
}

  const chargeBar=new THREE.Group();
  const chargeBg=new T.Mesh(
    new T.PlaneGeometry(.9,.1),
    new T.MeshBasicMaterial({color:0x14161a,depthTest:false,transparent:true})
  );
  const chargeFill=new T.Mesh(
    new T.PlaneGeometry(.86,.07),
    new T.MeshBasicMaterial({color:0x2f9bea,depthTest:false,transparent:true})
  );
  chargeFill.position.z=.001;
  chargeBar.add(chargeBg,chargeFill);
  chargeBar.renderOrder=30;
  chargeBar.visible=false;
  scene.add(chargeBar);
  function showCard(){}
  function popDamage(x,y,z,value,kind){onHit({enemy:null,damage:0,x,y,z,value,kind,popupOnly:true});}
  function cameraShake(){}
/* ============================================================ TERRA RING */
/* Base cast: nine spikes tunnel outward from the caster, each throwing up a
   fresh rock every CFG.terra.emitStep units, dragging targets along with them. */

const terra = { cd: 0, lanes: [], active: false, charged: null };
const terraOrigin = new T.Vector2();   // where the caster planted the strike

function castTerraRing(enhanced) {
  const c = CFG.terra;
  terra.cd = c.cooldown;
  showCard('Terra Ring', false);
  playerState.castAnim = .01; playerState.castKind = 1;
  for (const d of dummies) d.terraHits = 0;

  const origin = terraOrigin;
  const base = rand(0, TAU);

  if (enhanced) {
    // "all the spikes are summoned at once, dealing 50 damage immediately"
    for (let s = 0; s < c.spokes; s++) {
      const a = base + s * TAU / c.spokes + rand(-.05, .05);
      for (let r = .75; r <= c.reach; r += c.emitStep) {
        const x = origin.x + Math.cos(a) * r + rand(-.12, .12);
        const z = origin.y + Math.sin(a) * r + rand(-.12, .12);
        spawnRock(x, z, rand(.30, .46) * (1 - r / (c.reach * 2.4)) + .16,
          { rise: .09, hold: .34 + r * .05, sink: .32 });
        spawnScorch(x, z, rand(1.0, 1.5), 2.4, .72);
      }
    }
    spawnSpark(origin.x, .5, origin.y, 5.5, .34);
    for (const d of dummies) {
      if (!d.alive) continue;
      if (d.pos.distanceTo(origin) <= c.reach + .6) {
        d.hit(c.enhancedDamage, origin, 1.2, 'crit');
      }
    }
    return;
  }

  terra.active = true;
  terra.lanes = [];
  for (let s = 0; s < c.spokes; s++) {
    const a = base + s * TAU / c.spokes + rand(-.06, .06);
    terra.lanes.push({ angle: a, r: .55, nextEmit: .55, done: false });
  }
}

function updateTerraRing(dt) {
  if (!terra.active) return;
  const c = CFG.terra;
  let anyLive = false;

  for (const lane of terra.lanes) {
    if (lane.done) continue;
    anyLive = true;
    lane.r += c.digSpeed * dt;
    if (lane.r >= c.reach) { lane.r = c.reach; lane.done = true; }
    while (lane.nextEmit <= lane.r) {
      const ox = terraOrigin.x, oz = terraOrigin.y;
      const x = ox + Math.cos(lane.angle) * lane.nextEmit + rand(-.1, .1);
      const z = oz + Math.sin(lane.angle) * lane.nextEmit + rand(-.1, .1);
      const shrink = 1 - (lane.nextEmit / c.reach) * .38;
      spawnRock(x, z, rand(.26, .40) * shrink + .10, { rise: .1, hold: .38, sink: .30 });
      spawnScorch(x, z, rand(.95, 1.45), 2.6, .74);
      spawnSpark(x, .35, z, .9, .18);

      // contact: 15 damage, capped at 5 hits, and the target gets shoved outward
      for (const d of dummies) {
        if (!d.alive || d.terraHits >= c.maxHits) continue;
        const dx = d.pos.x - x, dz = d.pos.y - z;
        if (dx * dx + dz * dz < .62 * .62) {
          d.terraHits++;
          d.hit(c.hitDamage, terraOrigin, c.knock, 'normal');
        }
      }
      lane.nextEmit += c.emitStep;
    }
  }
  if (!anyLive) terra.active = false;
}

/* ------------------------------- charged signature ------------------------ */
/* A white star of rays hangs on the caster, then six ground strikes: five at
   25 damage and a last one at 50, each erupting a field of tall pillars. */

const starSprite = new T.Sprite(new T.SpriteMaterial({
  map: TEX.star, transparent: true, depthTest: false
}));
starSprite.scale.set(9, 9, 1);
starSprite.renderOrder = 25;
starSprite.visible = false;
scene.add(starSprite);

function castTerraCharged() {
  const c = CFG.terra.charged;
  terra.cd = CFG.terra.cooldown;
  showCard('Terra Ring', true);
  playerState.castAnim = .01; playerState.castKind = 2;
  terra.charged = { t: 0, beat: 0, next: c.windup, done: false };
  starSprite.visible = true;
  starSprite.material.opacity = 0;
}

function updateTerraCharged(dt) {
  const st = terra.charged; if (!st) return;
  const c = CFG.terra.charged;
  st.t += dt;

  const origin = new T.Vector2(player.position.x, player.position.z);
  starSprite.position.set(origin.x, .55, origin.y);

  // the star flickers for the whole cast, brightest right on each strike
  const total = c.windup + c.beats * c.beatGap + .55;
  if (st.t < total) {
    const flick = .55 + Math.sin(st.t * 46) * .18 + Math.sin(st.t * 91) * .1;
    const fade = st.t < .12 ? st.t / .12 : st.t > total - .45 ? clamp((total - st.t) / .45, 0, 1) : 1;
    starSprite.material.opacity = flick * fade;
    starSprite.material.rotation += dt * .9;
    const s = 8.4 + Math.sin(st.t * 24) * .7;
    starSprite.scale.set(s, s, 1);
  } else {
    starSprite.visible = false;
  }

  while (!st.done && st.t >= st.next) {
    const final = st.beat >= c.beats;
    strikeGround(origin, final);
    st.beat++;
    if (final) { st.done = true; break; }
    st.next += c.beatGap;
  }

  if (st.done && st.t > total + .3) { terra.charged = null; starSprite.visible = false; }
}

function strikeGround(origin, final) {
  const c = CFG.terra.charged;
  const R = final ? c.radius * 1.12 : c.radius;
  const n = final ? c.pillarsPerBeat + 10 : c.pillarsPerBeat;
  for (let i = 0; i < n; i++) {
    // even-ish disc coverage with jitter, denser toward the rim like the video
    const a = rand(0, TAU);
    const r = R * Math.sqrt(rand(.06, 1));
    const x = origin.x + Math.cos(a) * r;
    const z = origin.y + Math.sin(a) * r;
    spawnRock(x, z, rand(.34, .55) * (final ? 1.15 : 1),
      { rise: .09, hold: rand(.5, .95), sink: .34 });
    spawnScorch(x, z, rand(1.2, 1.9), final ? 3.4 : 2.9, .78);
  }
  spawnSpark(origin.x, .6, origin.y, final ? 7 : 4.5, final ? .4 : .26);
  cameraShake(final ? .32 : .16);

  for (const d of dummies) {
    if (!d.alive) continue;
    if (d.pos.distanceTo(origin) <= R + .5) {
      d.hit(final ? c.finalDamage : c.beatDamage, origin, final ? 2.2 : .9, final ? 'crit' : 'big');
    }
  }
}

/* ========================================================= GRASPING EARTH */

const sigil = new T.Group();
sigil.visible = false;
scene.add(sigil);
const sigilA = new T.Mesh(
  new T.PlaneGeometry(2, 2),
  new T.MeshBasicMaterial({
    map: TEX.sigilA, transparent: true, depthWrite: false,
    blending: T.AdditiveBlending, opacity: .5
  })
);
const sigilB = new T.Mesh(
  new T.PlaneGeometry(2, 2),
  new T.MeshBasicMaterial({
    map: TEX.sigilB, transparent: true, depthWrite: false,
    blending: T.AdditiveBlending, opacity: .45
  })
);
sigilA.rotation.x = sigilB.rotation.x = -PI / 2;
sigilA.position.y = .02; sigilB.position.y = .025;
sigilA.renderOrder = 3; sigilB.renderOrder = 3;
sigil.add(sigilA, sigilB);

const grasp = {
  cd: 0,
  holding: false,
  holdT: 0,
  radius: CFG.grasp.minRadius,
  crags: [],
  fists: []
};

function beginGraspHold() {
  grasp.holding = true;
  grasp.holdT = 0;
  grasp.radius = ui.enhGrasp.checked ? CFG.grasp.maxRadius : CFG.grasp.minRadius;
  sigil.visible = true;
  chargeBar.visible = true;
  ui.charging.classList.add('on');
  showCard('Grasping Earth', false);
}

function updateGraspHold(dt) {
  if (!grasp.holding) return;
  const c = CFG.grasp;
  grasp.holdT += dt;
  const k = ui.enhGrasp.checked ? 1 : clamp(grasp.holdT / c.growTime, 0, 1);
  grasp.radius = lerp(c.minRadius, c.maxRadius, easeOut(k));

  sigil.position.set(player.position.x, 0, player.position.z);
  const s = grasp.radius;
  sigilA.scale.set(s, s, 1);
  sigilB.scale.set(s * .92, s * .92, 1);
  sigilA.rotation.z += dt * .55;
  sigilB.rotation.z -= dt * .33;
  const pulse = .42 + Math.sin(now * 6) * .06 + k * .16;
  sigilA.material.opacity = pulse;
  sigilB.material.opacity = pulse * .9;

  chargeFill.scale.x = Math.max(.001, k);
  chargeFill.position.x = -.43 * (1 - k);
  chargeFill.material.color.setHex(k >= .999 ? 0x5fd23c : 0x2f9bea);
  chargeBar.position.set(player.position.x, 1.55, player.position.z);
  chargeBar.quaternion.copy(camera.quaternion);
}

function releaseGrasp() {
  if (!grasp.holding) return;
  grasp.holding = false;
  sigil.visible = false;
  chargeBar.visible = false;
  ui.charging.classList.remove('on');
  grasp.cd = CFG.grasp.cooldown;
  playerState.castAnim = .01; playerState.castKind = 3;

  const origin = new T.Vector2(player.position.x, player.position.z);
  const R = grasp.radius;
  let sent = 0;
  for (const d of dummies) {
    if (!d.alive || d.held) continue;
    const dist = d.pos.distanceTo(origin);
    if (dist > R) continue;
    // "~0.5s on close range enemies and ~1s if enemies are at max range"
    const travel = lerp(.5, 1.0, clamp(dist / CFG.grasp.maxRadius, 0, 1));
    grasp.crags.push({
      target: d, from: origin.clone(), t: 0, travel,
      nextRock: 0, dist
    });
    sent++;
  }
  if (!sent) {
    // still show the crag ripping out of the floor even with nothing to grab
    for (let i = 0; i < 3; i++) {
      const a = rand(0, TAU);
      grasp.crags.push({
        target: null, from: origin.clone(), t: 0, travel: .7,
        nextRock: 0, dist: R, angle: a
      });
    }
  }
}

function updateGrasp(dt) {
  const c = CFG.grasp;

  /* --- crags racing along the floor toward each target ----------------- */
  for (let i = grasp.crags.length - 1; i >= 0; i--) {
    const cr = grasp.crags[i];
    cr.t += dt;
    const k = clamp(cr.t / cr.travel, 0, 1);
    const tx = cr.target ? cr.target.pos.x : cr.from.x + Math.cos(cr.angle) * cr.dist;
    const tz = cr.target ? cr.target.pos.y : cr.from.y + Math.sin(cr.angle) * cr.dist;
    const x = lerp(cr.from.x, tx, k), z = lerp(cr.from.y, tz, k);

    // a rolling ridge of small stones breaking the floor along the path
    if (k < 1 && cr.t >= cr.nextRock) {
      spawnRock(x + rand(-.14, .14), z + rand(-.14, .14), rand(.21, .34),
        { rise: .06, hold: .20, sink: .16 });
      spawnScorch(x, z, rand(.7, 1.05), 1.6, .55);
      cr.nextRock = cr.t + .028;
    }

    if (k >= 1) {
      if (cr.target && cr.target.alive) {
        cr.target.hit(c.impactDamage, cr.from, 0, 'normal');
        spawnFist(cr.target);
      }
      grasp.crags.splice(i, 1);
    }
  }

  /* --- fists holding their targets ------------------------------------ */
  for (let i = grasp.fists.length - 1; i >= 0; i--) {
    const f = grasp.fists[i];
    f.t += dt;

    // punch up out of the floor
    if (f.t < f.riseT) {
      const k = easeOut(f.t / f.riseT);
      f.group.position.y = lerp(-1.5, 0, k);
      f.group.scale.setScalar(lerp(.55, 1, k));
    } else {
      f.group.position.y = 0;
      // squeeze pulse between ticks
      const sq = 1 - Math.max(0, Math.sin((f.t - f.lastTick) * 16)) * .045;
      f.group.scale.setScalar(sq);
    }
    if (f.target) {
      f.group.position.x = f.target.pos.x;
      f.group.position.z = f.target.pos.y;
    }

    // grip ticks, then the crushing finisher
    if (f.t >= f.nextTick && f.ticksLeft > 0) {
      f.ticksLeft--;
      f.lastTick = f.t;
      f.nextTick += f.tickGap;
      if (f.target && f.target.alive) {
        f.target.hit(c.tickDamage, null, 0, 'normal');
      }
      spawnSpark(f.group.position.x + rand(-.4, .4), rand(.6, 1.1),
                 f.group.position.z + rand(-.4, .4), 1.5);
    } else if (f.ticksLeft === 0 && !f.finished && f.t >= f.nextTick) {
      f.finished = true;
      if (f.target && f.target.alive) f.target.hit(c.finalDamage, null, 0, 'crit');
      spawnSpark(f.group.position.x, .9, f.group.position.z, 3.4, .35);
      cameraShake(.18);
      f.crumbleAt = f.t;
    }

    // crumble
    if (f.finished) {
      const k = (f.t - f.crumbleAt) / .5;
      f.group.scale.setScalar(Math.max(.001, 1 - easeIn(clamp(k, 0, 1))));
      f.group.position.y = -easeIn(clamp(k, 0, 1)) * .8;
      if (k >= 1) {
        for (let n = 0; n < 6; n++) {
          spawnRock(f.group.position.x + rand(-.6, .6), f.group.position.z + rand(-.6, .6),
            rand(.14, .26), { rise: .06, hold: .1, sink: .3 });
        }
        if (f.target) f.target.held = false;
        scene.remove(f.group);
        disposeGroup(f.group);
        grasp.fists.splice(i, 1);
      }
    }

    // target died in the grip
    if (f.target && !f.target.alive && !f.finished) {
      f.finished = true; f.crumbleAt = f.t;
    }
  }
}

/* A giant closed fist of stone, seen from above: a broad palm mass, four
   knuckles across the top and a thumb on one side, with the floor cracked
   open around it. */
function buildFist() {
  const g = new T.Group();
  const mat     = new T.MeshLambertMaterial({ color: COL.rockMid,  flatShading: true });
  const matTop  = new T.MeshLambertMaterial({ color: COL.rockTop,  flatShading: true });
  const matDeep = new T.MeshLambertMaterial({ color: COL.rockDeep, flatShading: true });

  // back of the hand: one broad mass, widest across the knuckles
  const palm = new T.Mesh(new T.SphereGeometry(.92, 14, 11), mat);
  palm.scale.set(1.02, .70, .92);
  palm.position.set(0, .62, .10);
  palm.castShadow = true; g.add(palm);

  // the four curled fingers, read as two rows: knuckles, then the folded
  // middle joints tucked underneath and slightly darker
  for (let i = 0; i < 4; i++) {
    const t = i / 3;                                  // 0..1 across the hand
    const arc = Math.sin(t * PI) * .13;               // knuckle line bows forward
    const kx = -.63 + i * .42;

    const k = new T.Mesh(new T.SphereGeometry(.29 - Math.abs(t - .45) * .05, 10, 8), matTop);
    k.scale.set(1, .95, 1.18);
    k.position.set(kx, 1.00, -.58 + arc);
    k.rotation.y = rand(-.15, .15);
    k.castShadow = true; g.add(k);

    const j = new T.Mesh(new T.SphereGeometry(.245, 9, 7), matDeep);
    j.scale.set(.95, .8, 1.25);
    j.position.set(kx * .93, .74, -.16 + arc * .7);
    j.castShadow = true; g.add(j);
  }

  // thumb folded across the front of the fist
  const thumb = new T.Mesh(new T.SphereGeometry(.30, 10, 8), matTop);
  thumb.scale.set(1.5, .85, .82);
  thumb.position.set(-.30, .80, .42);
  thumb.rotation.y = .34;
  thumb.castShadow = true; g.add(thumb);

  const thumbTip = new T.Mesh(new T.SphereGeometry(.20, 9, 7), matTop);
  thumbTip.position.set(.28, .80, .50);
  thumbTip.castShadow = true; g.add(thumbTip);

  // wrist / forearm stump disappearing into the broken floor
  const wrist = new T.Mesh(new T.CylinderGeometry(.52, .62, .70, 9), matDeep);
  wrist.position.set(.10, .30, .74);
  wrist.rotation.x = .22;
  wrist.castShadow = true; g.add(wrist);

  // rubble thrown up where the arm tore through the flagstones
  for (let i = 0; i < 9; i++) {
    const a = rand(0, TAU);
    const r = new T.Mesh(rockGeos[randInt(0, 4)], rockMats[randInt(0, 2)]);
    const sz = rand(.15, .30);
    r.scale.set(sz, sz * rand(.9, 1.6), sz);
    r.position.set(Math.cos(a) * rand(.85, 1.2), rand(.06, .20), Math.sin(a) * rand(.85, 1.2));
    r.rotation.set(rand(-.35, .35), rand(0, TAU), rand(-.35, .35));
    r.castShadow = true;
    g.add(r);
  }

  const cracks = new T.Mesh(
    new T.PlaneGeometry(3.6, 3.6),
    new T.MeshBasicMaterial({ map: TEX.crack, transparent: true, depthWrite: false, opacity: .6 })
  );
  cracks.rotation.x = -PI / 2;
  cracks.position.y = .03;
  cracks.renderOrder = 2;
  g.add(cracks);

  return g;
}

function spawnFist(target) {
  const enh = ui.enhGrasp.checked;
  const c = CFG.grasp;
  const g = buildFist();
  g.position.set(target.pos.x, -1.5, target.pos.y);
  g.rotation.y = rand(-.5, .5);      // knuckles point away from the camera, as in the source
  scene.add(g);
  target.held = true; onGrab({target});
  target.vel.set(0, 0);
  spawnSpark(target.pos.x, .5, target.pos.y, 2.6, .3);
  for (let i = 0; i < 5; i++) {
    spawnScorch(target.pos.x + rand(-.8, .8), target.pos.y + rand(-.8, .8), rand(.9, 1.5), 3.2, .6);
  }
  cameraShake(.12);
  const tickGap = enh ? c.enhancedTickGap : c.tickGap;
  grasp.fists.push({
    group: g, target, t: 0, riseT: .22,
    ticksLeft: enh ? c.enhancedTicks : c.ticks,
    tickGap, nextTick: .30, lastTick: 0, finished: false, crumbleAt: 0
  });
}

function disposeGroup(g) {
  g.traverse(o => {
    if (o.isMesh) {
      if (o.geometry && !rockGeos.includes(o.geometry)) o.geometry.dispose();
      if (o.material && !rockMats.includes(o.material)) o.material.dispose();
    }
  });
}

  const targetByEnemy=new Map();
  function createDummy(enemy){
    const d={
      enemy,
      home:new T.Vector2(),
      pos:new T.Vector2(),
      vel:new T.Vector2(),
      tilt:new T.Vector2(),
      hp:Number(enemy?.hp)||0,
      alive:Number(enemy?.hp)>0,
      dead:0,
      held:false,
      terraHits:0,
    };
    d.reset=()=>{
      d.hp=Number(d.enemy?.hp)||0;
      d.alive=d.hp>0;d.dead=0;d.held=false;d.terraHits=0;d.vel.set(0,0);
    };
    d.kill=()=>{
      d.alive=false;d.held=false;d.dead=0;
    };
    d.hit=(dmg,from,knock,kind)=>{
      if(!d.alive)return;
      d.hp-=Number(dmg)||0;
      onHit({enemy:d.enemy,damage:Number(dmg)||0,from,knock,kind,dummy:d});
      d.hp=Number(d.enemy?.hp);
      if(!Number.isFinite(d.hp))d.hp=Math.max(0,Number(d.hp)||0);
      d.alive=d.hp>0;
      if(d.hp<=0)d.kill();
      if(from&&knock&&!d.held){
        const dx=d.pos.x-from.x,dz=d.pos.y-from.y;
        const length=Math.hypot(dx,dz);
        if(length>1e-5)d.vel.add(new T.Vector2(dx/length*knock,dz/length*knock));
      }
    };
    return d;
  }
  function syncTargets(next=[]){
    const active=[];
    for(const item of next){
      const enemy=item?.enemy;if(!enemy)continue;
      let d=targetByEnemy.get(enemy);
      if(!d){d=createDummy(enemy);targetByEnemy.set(enemy,d);}
      d.enemy=enemy;
      d.pos.set(Number(item.x)||0,Number(item.z)||0);
      if(!d.held){d.home.copy(d.pos);}
      d.hp=Number(enemy.hp)||0;
      d.alive=d.hp>0;
      active.push(d);
    }
    dummies.length=0;
    dummies.push(...active);
  }
  function cast(id){
    const key=String(id||'').toUpperCase();
    if(key==='TERRA-RING'){
      terraOrigin.set(0,0);
      castTerraRing(false);
      return true;
    }
    if(key==='GRASPING-EARTH'){
      beginGraspHold();
      return true;
    }
    return false;
  }
  function update(dt,camQuat){
    const frameDt=Math.max(0,Number(dt)||0);
    now+=frameDt;
    camera.quaternion.copy(camQuat||new THREE.Quaternion());
    updateTerraRing(frameDt);
    updateTerraCharged(frameDt);
    updateGraspHold(frameDt);
    if(grasp.holding&&grasp.holdT>=CFG.grasp.growTime)releaseGrasp();
    updateGrasp(frameDt);
    updateRocks(frameDt);
    updateScorch(frameDt);
    updateSparks(frameDt);
  }
  function setCallbacks({onHit:hit=()=>{},onGrab:grab=()=>{}}={}){
    onHit=hit;onGrab=grab;
  }
  function reset(){
    terra.active=false;terra.lanes.length=0;terra.charged=null;
    starSprite.visible=false;
    grasp.holding=false;grasp.crags.length=0;
    for(const fist of [...grasp.fists]){
      if(fist.target)fist.target.held=false;
      scene.remove(fist.group);disposeGroup(fist.group);
    }
    grasp.fists.length=0;
    sigil.visible=false;chargeBar.visible=false;
    for(const item of [...rocks]){rockPool.release(item.mesh);}
    rocks.length=0;
    for(const item of [...scorches]){scorchPool.release(item.mesh);}
    scorches.length=0;
    for(const item of [...sparks]){sparkPool.release(item.sprite);}
    sparks.length=0;
    dummies.length=0;targetByEnemy.clear();
  }
  function dispose(){
    reset();
    root.parent?.remove(root);
    root.traverse(object=>{
      object.geometry?.dispose?.();
      if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());
      else object.material?.dispose?.();
    });
  }
  root.scale.setScalar(Math.max(.001,Number(size)||1));
  return{root,cast,update,reset,syncTargets,setCallbacks,dispose,CFG};
}
