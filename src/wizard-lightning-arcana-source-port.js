/*
 * Direct source port for upload/wizard-of-legend-star-bolt-and-shock-nova.html.
 *
 * The palette, tuning, helpers, shaders, and effect classes in this module are
 * copied from the supplied standalone Three.js demo. The wrapper below is the
 * game adapter: it gives those copied classes a local source scene, live target
 * proxies, camera orientation, and native damage/status callbacks.
 */
export function createWizardLightningSourcePort({
  THREE,scene:worldScene,parent=null,camera:worldCamera,size=1,
}={}){
  if(!THREE||!worldScene)throw new Error('Wizard Lightning source port requires THREE and scene.');
  const root=new THREE.Group();
  (parent||worldScene).add(root);
  const scene=root;
  const camera=new THREE.PerspectiveCamera();
  const innerHeight=globalThis.innerHeight||720;
  const dummies=[];
  let onShock=()=>{};
  let onDischarge=()=>{};
  let onPopup=()=>{};
  const playerStateHolder={};
  let enhanced=false;
  const spellLightHolder={};
const T = THREE;

/* ---------------------------------------------------------------- palette --
   Sampled from the source frames: the nova rim medians #ded29a with a white
   core, the shock discharge medians #4fb8bc peaking at #ccffff, and the
   shuriken body sits at #d0c3ac over a #a0917a hub. */
const PAL = {
  gold:      new T.Color('#ded29a'),
  goldDeep:  new T.Color('#c8a94e'),
  goldHot:   new T.Color('#fffbe6'),
  white:     new T.Color('#ffffff'),
  cyan:      new T.Color('#4fb8bc'),
  cyanHot:   new T.Color('#ccffff'),
  starBody:  new T.Color('#d0c3ac'),
  starHub:   new T.Color('#8f8069'),
};

/* --------------------------------------------------------------- tuning ----
   Source-derived numbers, all in tiles and seconds. */
const TUNE = {
  nova: {
    chargeTime:     1.43,   // 808.40 -> 809.83
    chargeTimeEnh:  0.90,   // "charges up faster"
    radius:         2.10,   // wheel Ø ~200 px  => r ~100 px => 2.1 tiles
    radiusEnh:      4.00,   // charged rim measured out past 190 px
    duration:       0.70,   // 809.83 -> 810.53
    durationEnh:    1.05,   // 816.63 -> 817.70
    tick:           0.12,   // damage numbers repeat ~8x per burst
    dmg:            12,
    spokes:         8,
    spokesEnh:      12,
  },
  star: {
    speed:          20.0,   // ~1000 px/s
    range:          9.0,
    cadence:        0.75,   // throws at 870.2 / 870.9 / 871.7 / 872.5 / 873.3
    windup:         0.13,
    size:           0.34,   // ~14 px across
    spin:           34.0,   // rad/s — it barely holds an orientation between frames
    dmg:            8,
  },
  shock: {
    hold:           3.20,   // nova wheel ends 810.53, discharge lands 813.70
    holdEnh:        4.60,   // "stars shock for a longer duration"
    perStack:       12,     // base wheel stacks 6x -> ~74, as in the source
    burstFlash:     0.42,
  },
};
function radialSprite(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
const TEX = {
  glow:  radialSprite([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,246,205,.75)'], [1, 'rgba(255,230,140,0)']]),
  spark: radialSprite([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,250,225,.6)'], [1, 'rgba(255,235,160,0)']], 64),
  ring:  (() => {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.strokeStyle = '#fff'; g.lineWidth = 9;
    g.shadowColor = '#fff'; g.shadowBlur = 16;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 16, 0, Math.PI * 2); g.stroke();
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })(),
};

/* ============================================================== ribbons ====
   Everything electric in the source is a bright white filament wearing a soft
   coloured halo. One additive ribbon shader does both: alpha falls off across
   the strip, and the core whitens where the falloff is strongest. */
const ribbonMat = (color, opacity) => new T.ShaderMaterial({
  uniforms: {
    uColor:   { value: color.clone() },
    uCore:    { value: PAL.white.clone() },
    uOpacity: { value: opacity },
    uSoft:    { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 uColor; uniform vec3 uCore; uniform float uOpacity; uniform float uSoft;
    varying vec2 vUv;
    void main(){
      float e = 1.0 - abs(vUv.y * 2.0 - 1.0);        // 0 at the strip edges
      float taper = smoothstep(0.0, 0.06, vUv.x) * smoothstep(0.0, 0.06, 1.0 - vUv.x);
      float a = pow(e, uSoft) * taper * uOpacity;
      vec3 col = mix(uColor, uCore, pow(e, 3.2));
      gl_FragColor = vec4(col * (0.55 + 1.25 * pow(e, 2.0)), a);
    }`,
  transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide,
});

const UP = new T.Vector3(0, 1, 0);
const _a = new T.Vector3(), _b = new T.Vector3(), _n = new T.Vector3();

class Ribbon {
  constructor(maxPts, color, opacity) {
    this.max = maxPts;
    this.pos = new Float32Array(maxPts * 2 * 3);
    this.uv = new Float32Array(maxPts * 2 * 2);
    const idx = new Uint16Array((maxPts - 1) * 6);
    for (let i = 0; i < maxPts - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.set([a, b, c, b, d, c], i * 6);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new T.BufferAttribute(this.uv, 2));
    g.setIndex(new T.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    this.geom = g;
    this.mat = ribbonMat(color, opacity);
    this.mesh = new T.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.visible = false;
  }
  /* pts: Vector3[]; width: half-width in world units; billboard: optional
     fixed side vector (used for bolts that stand up out of the floor). */
  set(pts, width, billboard) {
    const n = Math.min(pts.length, this.max);
    if (n < 2) { this.mesh.visible = false; return; }
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(n - 1, i + 1)];
      if (billboard) {
        _n.copy(billboard);
      } else {
        _a.subVectors(next, prev);
        _n.crossVectors(UP, _a);
        if (_n.lengthSq() < 1e-8) _n.set(1, 0, 0);
        _n.normalize();
      }
      const t = i / (n - 1);
      const w = width * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.6)));
      const o = i * 6, u = i * 4;
      this.pos[o]     = p.x - _n.x * w; this.pos[o + 1] = p.y - _n.y * w; this.pos[o + 2] = p.z - _n.z * w;
      this.pos[o + 3] = p.x + _n.x * w; this.pos[o + 4] = p.y + _n.y * w; this.pos[o + 5] = p.z + _n.z * w;
      this.uv[u] = t; this.uv[u + 1] = 0; this.uv[u + 2] = t; this.uv[u + 3] = 1;
    }
    this.geom.attributes.position.needsUpdate = true;
    this.geom.attributes.uv.needsUpdate = true;
    this.geom.setDrawRange(0, (n - 1) * 6);
    this.mesh.visible = true;
  }
  hide() { this.mesh.visible = false; }
  set opacity(v) { this.mat.uniforms.uOpacity.value = v; }
  set color(c) { this.mat.uniforms.uColor.value.copy(c); }
}

/* A bolt is a wide soft halo plus a thin hot core sharing one point list. */
class Bolt {
  constructor(maxPts, color) {
    this.halo = new Ribbon(maxPts, color, 0.42);
    this.core = new Ribbon(maxPts, PAL.goldHot, 0.95);
    this.halo.mat.uniforms.uSoft.value = 0.62;
    this.core.mat.uniforms.uSoft.value = 3.1;
    scene.add(this.halo.mesh, this.core.mesh);
  }
  set(pts, width, billboard) {
    this.halo.set(pts, width * 3.1, billboard);
    this.core.set(pts, width, billboard);
  }
  hide() { this.halo.hide(); this.core.hide(); }
  fade(v) { this.halo.opacity = 0.42 * v; this.core.opacity = 0.95 * v; }
  tint(c, hot) { this.halo.color = c; this.core.color = hot || PAL.goldHot; }
}

/* jagged polyline from a to b, drifting off the straight line by `amp` */
function jag(a, b, segs, amp, out, taperEnds = true) {
  out.length = 0;
  _a.subVectors(b, a);
  const len = _a.length() || 1e-4;
  _n.crossVectors(UP, _a).normalize();
  if (!isFinite(_n.x)) _n.set(1, 0, 0);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const env = taperEnds ? Math.sin(Math.PI * t) : 1;
    const off = (Math.random() * 2 - 1) * amp * len * env;
    out.push(new T.Vector3(
      a.x + _a.x * t + _n.x * off,
      a.y + _a.y * t + _n.y * off,
      a.z + _a.z * t + _n.z * off
    ));
  }
  return out;
}

/* a bolt that stands upright, jittering across the camera's right vector */
const camRight = new T.Vector3();
function jagVertical(x, z, topY, segs, amp, out) {
  out.length = 0;
  camera.getWorldDirection(_b);
  camRight.crossVectors(_b, UP).normalize();
  let drift = 0;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    drift += (Math.random() * 2 - 1) * amp;
    drift *= 0.72;
    out.push(new T.Vector3(x + camRight.x * drift, topY * (1 - t) + 0.06, z + camRight.z * drift));
  }
  return out;
}

/* ============================================================== sparks ===== */
class Sparks {
  constructor(count, texture, size) {
    this.n = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.siz = new Float32Array(count);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.max = new Float32Array(count);
    this.drag = new Float32Array(count);
    this.cursor = 0;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new T.BufferAttribute(this.col, 3));
    g.setAttribute('size', new T.BufferAttribute(this.siz, 1));
    this.geom = g;
    this.mat = new T.ShaderMaterial({
      uniforms: { uMap: { value: texture }, uScale: { value: innerHeight * 0.6 } },
      vertexShader: `
        attribute float size; varying vec3 vCol;
        uniform float uScale;
        void main(){
          vCol = color;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = size * uScale / max(0.001, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; varying vec3 vCol;
        void main(){
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vCol, 1.0) * t;
        }`,
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, vertexColors: true,
    });
    this.points = new T.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    scene.add(this.points);
    this.baseSize = size;
  }
  emit(p, v, color, life, size, drag = 2.2) {
    const i = this.cursor = (this.cursor + 1) % this.n;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.vel[i * 3] = v.x; this.vel[i * 3 + 1] = v.y; this.vel[i * 3 + 2] = v.z;
    this.col[i * 3] = color.r; this.col[i * 3 + 1] = color.g; this.col[i * 3 + 2] = color.b;
    this.siz[i] = size * this.baseSize;
    this.life[i] = this.max[i] = life;
    this.drag[i] = drag;
  }
  update(dt) {
    const { pos, vel, life, max, siz, col, drag } = this;
    for (let i = 0; i < this.n; i++) {
      if (life[i] <= 0) { if (siz[i] !== 0) siz[i] = 0; continue; }
      life[i] -= dt;
      const k = Math.max(0, life[i] / max[i]);
      const d = Math.exp(-drag[i] * dt);
      vel[i * 3] *= d; vel[i * 3 + 1] = vel[i * 3 + 1] * d - 3.2 * dt; vel[i * 3 + 2] *= d;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] = Math.max(0.03, pos[i * 3 + 1] + vel[i * 3 + 1] * dt);
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      siz[i] = this.baseSize * (0.35 + 0.65 * k) * (life[i] > 0 ? 1 : 0);
      const f = k * k;
      col[i * 3] *= 1; col[i * 3 + 1] *= 1; col[i * 3 + 2] *= 1;
      siz[i] *= (0.4 + 0.6 * f);
    }
    this.geom.attributes.position.needsUpdate = true;
    this.geom.attributes.size.needsUpdate = true;
    this.geom.attributes.color.needsUpdate = true;
  }
}
const sparks = new Sparks(2400, TEX.spark, 0.30);

/* Reusable scratch vectors so the per-frame work allocates nothing. */
const tmp = new T.Vector3(), tmp2 = new T.Vector3();
function burstSparks(p, count, speed, color, life, size, up = 1.6) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.9);
    tmp.set(Math.cos(a) * s, Math.random() * up, Math.sin(a) * s);
    tmp2.copy(p); tmp2.y += 0.08;
    sparks.emit(tmp2, tmp, color, life * (0.6 + Math.random() * 0.7), 0.6 + Math.random() * 0.8);
  }
}

/* =============================================================== decals ==== */
function makeDecal(tex, color, opacity) {
  const m = new T.Mesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({
      map: tex, color, transparent: true, opacity,
      blending: T.AdditiveBlending, depthWrite: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  m.visible = false;
  m.renderOrder = 3;
  scene.add(m);
  return m;
}
function makeBillboard(tex, color, opacity) {
  const m = new T.Sprite(new T.SpriteMaterial({
    map: tex, color, transparent: true, opacity,
    blending: T.AdditiveBlending, depthWrite: false,
  }));
  m.visible = false;
  m.renderOrder = 9;
  scene.add(m);
  return m;
}

  // The standalone source expects the caster state and light to exist before
  // any copied effect is constructed.
  const playerState={pos:new THREE.Vector3(),facing:0,crouch:0,throwT:0};
  const spellLight=new THREE.PointLight(0xffe6a0,0,26,2);
  spellLight.position.set(0,2.2,0);
  scene.add(spellLight);
  const shake=()=>{};
  function lightPulse(color,intensity){spellLight.color.copy(color);spellLight.intensity=Math.max(spellLight.intensity,intensity);}
  function popNumber(worldPos,text,kind){onPopup({position:worldPos.clone(),text:String(text),kind});}
/* ============================================================ shock rules ==
   Lightning arcana in the source do not spend their damage on impact. They
   stack a charge on the target, the target flickers cyan, and a few seconds
   later the whole stack discharges in one cyan burst — 22 off a single Star
   Bolt, 74 off a base nova, 134 off a charged one. */
function applyShock(dummy, stacks) {
  const u = dummy.userData;
  u.shock += stacks;
  u.shockT = enhanced ? TUNE.shock.holdEnh : TUNE.shock.hold;
  u.flash = Math.max(u.flash, 0.16);
  onShock({dummy, stacks});
}
function dischargeShock(dummy) {
  const u = dummy.userData;
  const dmg = Math.round(u.shock * TUNE.shock.perStack * (enhanced ? 1.22 : 1));
  u.shock = 0; u.shockT = 0;
  const p = dummy.position.clone();
  popNumber(p, String(dmg), 'burst');
  onDischarge({dummy, damage:dmg});
  effects.push(new ShockBurst(p));
  u.stun = 0.55;
}

/* ======================================================= effect base list = */
const effects = [];
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    if (!effects[i].update(dt)) { effects[i].dispose(); effects.splice(i, 1); }
  }
}

/* ------------------------------------------------------- shock discharge -- */
class ShockBurst {
  constructor(pos) {
    this.pos = pos.clone();
    this.t = 0;
    this.life = 0.62;
    this.flash = makeDecal(TEX.glow, PAL.cyan, 1);
    this.flash.position.set(pos.x, 0.03, pos.z);
    this.flash.visible = true;
    this.ring = makeDecal(TEX.ring, PAL.cyan, 1);
    this.ring.position.set(pos.x, 0.05, pos.z);
    this.ring.visible = true;
    this.bolts = [];
    for (let i = 0; i < 5; i++) this.bolts.push(new Bolt(9, PAL.cyan));
    this.bolts.forEach(b => b.tint(PAL.cyan, PAL.cyanHot));
    this.pts = [];
    burstSparks(pos, 34, 5.0, PAL.cyanHot, 0.55, 1.0, 3.4);
    shake(0.22, 0.16);
    lightPulse(PAL.cyan, 24, 0.36);
  }
  update(dt) {
    this.t += dt;
    const k = this.t / this.life;
    if (k >= 1) return false;
    const ease = 1 - Math.pow(1 - k, 2.4);
    const s = 1.9 + ease * 3.9;
    this.flash.scale.set(s, s, 1);
    this.flash.material.opacity = Math.max(0, 1.5 - k * 2.0);
    const rs = 0.7 + ease * 3.2;
    this.ring.scale.set(rs, rs, 1);
    this.ring.material.opacity = Math.max(0, 0.5 - k * 0.75);
    /* short cyan filaments whipping up out of the target */
    const on = k < 0.55;
    this.bolts.forEach((b, i) => {
      if (!on) { b.hide(); return; }
      const a = (i / this.bolts.length) * Math.PI * 2 + this.t * 5;
      const r = 0.35 + Math.random() * 1.0;
      tmp.set(this.pos.x, 0.1, this.pos.z);
      tmp2.set(this.pos.x + Math.cos(a) * r, 0.15 + Math.random() * 1.1, this.pos.z + Math.sin(a) * r);
      jag(tmp, tmp2, 6, 0.16, this.pts);
      b.set(this.pts, 0.035, camRight);
      b.fade(1 - k / 0.55);
    });
    return true;
  }
  dispose() {
    scene.remove(this.flash, this.ring);
    this.flash.geometry.dispose(); this.flash.material.dispose();
    this.ring.geometry.dispose(); this.ring.material.dispose();
    this.bolts.forEach(b => {
      scene.remove(b.halo.mesh, b.core.mesh);
      b.halo.geom.dispose(); b.core.geom.dispose();
      b.halo.mat.dispose(); b.core.mat.dispose();
    });
  }
}

/* ================================================== ARCANA 108 · STAR BOLT =
   Frames 26100–26244. The caster plants, sweeps the cloak, and a four-point
   shuriken leaves the hand trailing a gold zig-zag and a scatter of sparks.
   It spins far faster than the 30 fps encode can resolve, flies flat and
   straight, and is consumed on the first body it touches. */
function makeShurikenGeometry(outer, inner) {
  const s = new T.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  const hole = new T.Path();
  hole.absarc(0, 0, outer * 0.17, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new T.ShapeGeometry(s, 12);
  return g;
}
const SHURIKEN_GEOM = makeShurikenGeometry(TUNE.star.size * 0.5, TUNE.star.size * 0.5 * 0.38);

class StarBolt {
  constructor(origin, dir) {
    this.dir = dir.clone().setY(0).normalize();
    this.pos = origin.clone();
    this.pos.y = 0.46;
    this.travelled = 0;
    this.dead = false;
    this.spin = Math.random() * Math.PI;

    this.mesh = new T.Mesh(SHURIKEN_GEOM, new T.MeshBasicMaterial({
      color: PAL.starBody, side: T.DoubleSide,
    }));
    this.mesh.renderOrder = 7;
    scene.add(this.mesh);

    /* the blade catches a hard white rim in the source — fake it with an
       additive twin sitting a hair above the body */
    this.rim = new T.Mesh(SHURIKEN_GEOM, new T.MeshBasicMaterial({
      color: 0xfff8dc, transparent: true, opacity: 0.5,
      blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide,
    }));
    this.rim.scale.setScalar(1.22);
    this.rim.renderOrder = 8;
    scene.add(this.rim);

    this.glow = makeBillboard(TEX.glow, PAL.goldHot, 0.42);
    this.glow.scale.set(0.46, 0.46, 1);
    this.glow.visible = true;

    this.trail = new Bolt(9, PAL.goldDeep);
    this.trail2 = new Bolt(7, PAL.goldDeep);
    this.pts = [];
    this.emitAcc = 0;

    burstSparks(this.pos, 16, 3.4, PAL.goldHot, 0.34, 0.9, 1.2);
  }
  update(dt) {
    if (this.dead) return false;
    const step = TUNE.star.speed * dt;
    this.pos.addScaledVector(this.dir, step);
    this.travelled += step;
    this.spin += TUNE.star.spin * dt;

    this.mesh.position.copy(this.pos);
    this.mesh.quaternion.copy(camera.quaternion);
    this.mesh.rotateZ(this.spin);
    this.rim.position.copy(this.pos);
    this.rim.quaternion.copy(camera.quaternion);
    this.rim.rotateZ(this.spin);
    this.rim.translateZ(-0.01);
    this.rim.material.opacity = 0.34 + 0.26 * Math.abs(Math.sin(this.spin * 2));
    this.glow.position.copy(this.pos);

    /* trailing zig-zag: one jagged strand from a third of a tile behind */
    tmp.copy(this.pos).addScaledVector(this.dir, -0.95);
    tmp.y = this.pos.y;
    jag(tmp, this.pos, 6, 0.22, this.pts, false);
    this.trail.set(this.pts, 0.030, camRight);
    /* a detached zig-zag fragment lagging further back, as in the source */
    tmp.copy(this.pos).addScaledVector(this.dir, -1.9);
    tmp.y = this.pos.y + (Math.random() - 0.5) * 0.12;
    tmp2.copy(this.pos).addScaledVector(this.dir, -1.15);
    tmp2.y = this.pos.y;
    jag(tmp, tmp2, 5, 0.34, this.pts, false);
    this.trail2.set(this.pts, 0.022, camRight);
    this.trail2.fade(0.55);

    this.emitAcc += dt;
    while (this.emitAcc > 0.016) {
      this.emitAcc -= 0.016;
      tmp2.set((Math.random() - .5) * 1.6, (Math.random() - .2) * 1.2, (Math.random() - .5) * 1.6);
      tmp.copy(this.pos).addScaledVector(this.dir, -0.2 - Math.random() * 0.4);
      sparks.emit(tmp, tmp2, Math.random() < 0.4 ? PAL.goldHot : PAL.gold, 0.22 + Math.random() * 0.2, 0.5 + Math.random() * 0.5, 3.0);
    }

    /* collision — first body wins, exactly as in the source clip */
    for (const d of dummies) {
      const dx = d.position.x - this.pos.x, dz = d.position.z - this.pos.z;
      if (dx * dx + dz * dz < 0.42 * 0.42) { this.hit(d); return false; }
    }
    if (this.travelled > TUNE.star.range) { this.expire(); return false; }
    return true;
  }
  hit(d) {
    const u = d.userData;
    u.flash = 0.2; u.hop = 0.28;
    popNumber(d.position, String(TUNE.star.dmg), 'tick');
    applyShock(d, 1.8);   // one star discharges for ~22
    burstSparks(this.pos, 26, 4.2, PAL.goldHot, 0.4, 1.0, 2.6);
    const f = makeBillboard(TEX.glow, PAL.white, 1);
    f.position.copy(this.pos);
    effects.push(new Flash(f, 0.18, 1.7, 3.4));
    lightPulse(PAL.gold, 7, 0.16);
    this.cleanup();
  }
  expire() {
    burstSparks(this.pos, 10, 2.2, PAL.gold, 0.3, 0.7, 1.0);
    this.cleanup();
  }
  cleanup() {
    this.dead = true;
    scene.remove(this.mesh, this.rim, this.glow);
    this.mesh.material.dispose(); this.rim.material.dispose();
    this.glow.material.dispose();
    for (const t of [this.trail, this.trail2]) {
      scene.remove(t.halo.mesh, t.core.mesh);
      t.halo.geom.dispose(); t.core.geom.dispose();
      t.halo.mat.dispose(); t.core.mat.dispose();
    }
  }
  dispose() { if (!this.dead) this.cleanup(); }
}

class Flash {
  constructor(sprite, life, from, to) {
    this.s = sprite; this.t = 0; this.life = life; this.from = from; this.to = to;
    sprite.visible = true;
  }
  update(dt) {
    this.t += dt;
    const k = this.t / this.life;
    if (k >= 1) return false;
    const s = this.from + (this.to - this.from) * k;
    this.s.scale.set(s, s, 1);
    this.s.material.opacity = 1 - k;
    return true;
  }
  dispose() { scene.remove(this.s); this.s.material.dispose(); }
}

/* ================================================= ARCANA 102 · SHOCK NOVA =
   Frames 24249–24311 (base) and 24496–24553 (charged).

   Charge   translucent white spirals wind inward while gold glyphs flicker
            round the caster, who drops into a crouch.
   Release  a lightning WHEEL — a jagged rim broken into chords, spokes back
            to the caster, and a column of lightning dropping out of the sky
            onto the centre. Damage repeats every few frames for the whole
            burn, then the rim snaps out.
   Enhanced wider wheel, more spokes, longer burn, and forked tendrils that
            reach past the rim. */

class NovaCharge {
  constructor() {
    this.t = 0;
    this.duration = enhanced ? TUNE.nova.chargeTimeEnh : TUNE.nova.chargeTime;
    this.arms = [];
    for (let i = 0; i < 3; i++) {
      const r = new Ribbon(34, new T.Color('#cfd3d8'), 0.16);
      r.mat.uniforms.uSoft.value = 0.9;
      r.mat.uniforms.uCore.value.set('#ffffff');
      scene.add(r.mesh);
      this.arms.push(r);
    }
    this.glyphs = [];
    for (let i = 0; i < 5; i++) {
      const b = new Bolt(7, PAL.goldDeep);
      this.glyphs.push({ bolt: b, t: -1, a: 0, r: 0 });
    }
    this.pts = [];
    this.gpts = [];
    this.spark = 0;
    this.done = false;
  }
  get progress() { return Math.min(1, this.t / this.duration); }
  update(dt) {
    this.t += dt;
    const k = this.progress;
    const c = playerState.pos;

    /* three spiral arms, winding in as the charge fills */
    const R = (enhanced ? TUNE.nova.radiusEnh : TUNE.nova.radius) * (1.32 - 0.5 * k);
    for (let arm = 0; arm < this.arms.length; arm++) {
      this.pts.length = 0;
      const phase = -this.t * 3.4 + (arm / this.arms.length) * Math.PI * 2;
      const turns = 2.15;
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const ang = phase + t * turns * Math.PI * 2;
        const rr = R * (0.12 + 0.88 * t);
        this.pts.push(new T.Vector3(c.x + Math.cos(ang) * rr, 0.05, c.z + Math.sin(ang) * rr));
      }
      this.arms[arm].set(this.pts, 0.05 + 0.03 * k);
      this.arms[arm].opacity = 0.10 + 0.13 * k;
    }

    /* gold glyphs snapping in and out around the caster */
    for (const g of this.glyphs) {
      g.t -= dt;
      if (g.t <= 0) {
        g.t = 0.07 + Math.random() * 0.13;
        g.a = Math.random() * Math.PI * 2;
        g.r = R * (0.28 + Math.random() * 0.8);
        const len = 0.22 + Math.random() * 0.3;
        tmp.set(c.x + Math.cos(g.a) * g.r, 0.12 + Math.random() * 0.5, c.z + Math.sin(g.a) * g.r);
        tmp2.copy(tmp);
        tmp2.x += (Math.random() - .5) * len * 2;
        tmp2.y += (Math.random() - .5) * len;
        tmp2.z += (Math.random() - .5) * len * 2;
        jag(tmp, tmp2, 5, 0.55, this.gpts, false);
        g.bolt.set(this.gpts, 0.022, camRight);
        g.bolt.fade(0.55 + 0.45 * k);
      }
    }

    /* motes drawn toward the caster */
    this.spark += dt;
    while (this.spark > 0.035) {
      this.spark -= 0.035;
      const a = Math.random() * Math.PI * 2, rr = R * (0.6 + Math.random() * 0.6);
      tmp.set(c.x + Math.cos(a) * rr, 0.06 + Math.random() * 0.55, c.z + Math.sin(a) * rr);
      tmp2.set(-Math.cos(a) * (1.3 + k * 2.2), 0.35, -Math.sin(a) * (1.3 + k * 2.2));
      sparks.emit(tmp, tmp2, PAL.gold, 0.3 + Math.random() * 0.2, 0.45 + Math.random() * 0.4, 0.7);
    }
    spellLight.color.copy(PAL.gold);
    spellLight.intensity = Math.max(spellLight.intensity, 1.4 * k);
    spellLight.position.set(c.x, 1.0, c.z);
    return true;
  }
  dispose() {
    this.arms.forEach(r => { scene.remove(r.mesh); r.geom.dispose(); r.mat.dispose(); });
    this.glyphs.forEach(g => {
      const b = g.bolt;
      scene.remove(b.halo.mesh, b.core.mesh);
      b.halo.geom.dispose(); b.core.geom.dispose(); b.halo.mat.dispose(); b.core.mat.dispose();
    });
  }
}

class ShockNova {
  constructor(center, charged) {
    this.c = center.clone(); this.c.y = 0;
    this.charged = charged;
    this.R = charged ? TUNE.nova.radiusEnh : TUNE.nova.radius;
    this.life = charged ? TUNE.nova.durationEnh : TUNE.nova.duration;
    this.spokeCount = charged ? TUNE.nova.spokesEnh : TUNE.nova.spokes;
    this.t = 0;
    this.tickAcc = 0;
    this.hitCount = 0;
    this.spin = Math.random() * Math.PI * 2;
    this.rebuild = 0;

    /* rim chords + spokes (+ tendrils when charged) */
    this.rim = [];
    this.spokes = [];
    this.tendrils = [];
    for (let i = 0; i < this.spokeCount; i++) {
      this.rim.push(new Bolt(7, PAL.goldDeep));
      this.spokes.push(new Bolt(8, PAL.goldDeep));
    }
    if (charged) for (let i = 0; i < this.spokeCount; i++) this.tendrils.push(new Bolt(8, PAL.goldDeep));

    /* the column(s) of lightning out of the sky */
    this.columns = [];
    const nCol = charged ? 3 : 1;
    for (let i = 0; i < nCol; i++) {
      const b = new Bolt(14, PAL.goldDeep);
      this.columns.push({ bolt: b, off: i === 0 ? 0 : (Math.random() - 0.5) * this.R * 1.1,
                          offz: i === 0 ? 0 : (Math.random() - 0.5) * this.R * 0.8 });
    }

    this.ground = makeDecal(TEX.glow, new T.Color('#ffdf8c'), 0.9);
    this.ground.position.set(this.c.x, 0.02, this.c.z);
    this.ground.visible = true;

    this.pts = [];
    this.verts = [];

    shake(charged ? 0.55 : 0.34, charged ? 0.5 : 0.35);
    lightPulse(PAL.gold, charged ? 30 : 20, 0.5);
    burstSparks(this.c, charged ? 90 : 55, charged ? 7 : 5, PAL.goldHot, 0.6, 1.1, 3.0);
    this.tickDamage();
  }
  tickDamage() {
    this.hitCount++;
    for (const d of dummies) {
      const dx = d.position.x - this.c.x, dz = d.position.z - this.c.z;
      if (dx * dx + dz * dz <= this.R * this.R) {
        const u = d.userData;
        u.flash = 0.14; u.stun = Math.max(u.stun, 0.5); u.hop = 0.16;
        popNumber(d.position, String(TUNE.nova.dmg + (this.charged ? Math.round(Math.random()) : 0)), 'tick');
        applyShock(d, 1);
        tmp.copy(d.position); tmp.y = 0.35;
        burstSparks(tmp, 5, 2.0, PAL.white, 0.28, 0.8, 2.0);
      }
    }
  }
  update(dt) {
    this.t += dt;
    const k = this.t / this.life;
    if (k >= 1) return false;

    /* fast attack, long soft tail — the rim is at full size within a frame or
       two of the release and then simply burns down */
    const grow = Math.min(1, this.t / 0.06);
    const fade = k < 0.62 ? 1 : 1 - (k - 0.62) / 0.38;
    const R = this.R * (0.72 + 0.28 * grow) * (1 + 0.05 * k);

    this.tickAcc += dt;
    while (this.tickAcc >= TUNE.nova.tick) { this.tickAcc -= TUNE.nova.tick; this.tickDamage(); }

    /* rebuild the jagged geometry on a 60 Hz-ish beat so it crackles instead
       of crawling */
    this.rebuild -= dt;
    const redo = this.rebuild <= 0;
    if (redo) this.rebuild = 1 / 34;
    this.spin += dt * 0.55;

    if (redo) {
      this.verts.length = 0;
      for (let i = 0; i < this.spokeCount; i++) {
        const a = this.spin + (i / this.spokeCount) * Math.PI * 2;
        const rr = R * (0.93 + Math.random() * 0.14);
        this.verts.push(new T.Vector3(this.c.x + Math.cos(a) * rr, 0.06, this.c.z + Math.sin(a) * rr));
      }
      const centre = new T.Vector3(this.c.x, 0.06, this.c.z);
      for (let i = 0; i < this.spokeCount; i++) {
        const a = this.verts[i], b = this.verts[(i + 1) % this.spokeCount];
        jag(a, b, 5, 0.135, this.pts);
        this.rim[i].set(this.pts, 0.078 * (this.charged ? 1.12 : 1));
        jag(centre, this.verts[i], 6, 0.075, this.pts);
        this.spokes[i].set(this.pts, 0.056);
        if (this.charged) {
          tmp.copy(this.verts[i]).sub(centre).multiplyScalar(1.55).add(centre);
          tmp.x += (Math.random() - .5) * 0.8; tmp.z += (Math.random() - .5) * 0.8;
          jag(this.verts[i], tmp, 7, 0.18, this.pts, false);
          this.tendrils[i].set(this.pts, 0.046);
        }
      }
      for (const col of this.columns) {
        jagVertical(this.c.x + col.off, this.c.z + col.offz, 13 + Math.random() * 3, 15, 0.46, this.pts);
        col.bolt.set(this.pts, 0.088, camRight);
      }
    }

    const f = fade * (0.85 + 0.15 * Math.random());   // per-frame flicker
    this.rim.forEach(b => b.fade(f));
    this.spokes.forEach(b => b.fade(f * 0.92));
    this.tendrils.forEach(b => b.fade(f * 0.8));
    this.columns.forEach(c => c.bolt.fade(f * 1.05));

    const gs = R * 1.85;
    this.ground.scale.set(gs, gs, 1);
    this.ground.material.opacity = 0.30 * fade;

    spellLight.color.copy(PAL.gold);
    spellLight.position.set(this.c.x, 1.4, this.c.z);
    spellLight.intensity = Math.max(spellLight.intensity, (this.charged ? 26 : 17) * fade);

    /* sparks continuously shed off the rim */
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() < 0.55 ? R : R * Math.random();
      tmp.set(this.c.x + Math.cos(a) * rr, 0.1, this.c.z + Math.sin(a) * rr);
      tmp2.set(Math.cos(a) * 1.0, 1.4 + Math.random() * 2.6, Math.sin(a) * 1.0);
      sparks.emit(tmp, tmp2, Math.random() < 0.5 ? PAL.goldHot : PAL.gold, 0.36, 0.55 + Math.random() * 0.6, 1.5);
    }
    return true;
  }
  dispose() {
    const kill = b => {
      scene.remove(b.halo.mesh, b.core.mesh);
      b.halo.geom.dispose(); b.core.geom.dispose(); b.halo.mat.dispose(); b.core.mat.dispose();
    };
    this.rim.forEach(kill); this.spokes.forEach(kill); this.tendrils.forEach(kill);
    this.columns.forEach(c => kill(c.bolt));
    scene.remove(this.ground);
    this.ground.geometry.dispose(); this.ground.material.dispose();
  }
}

/* ------------------------------------------------- the "enhanced" flare ----
   At 814.40 the showcase stamps the card as CHARGED with a burst of long,
   thin white spikes that hang for about a second and shrink away. */
class EmpowerFlare {
  constructor(pos) {
    this.c = pos.clone(); this.c.y = 0.45;
    this.t = 0; this.life = 1.05;
    this.spikes = [];
    for (let i = 0; i < 22; i++) {
      const r = new Ribbon(2, PAL.white, 1);
      r.mat.uniforms.uSoft.value = 1.6;
      r.mat.uniforms.uCore.value.set('#ffffff');
      scene.add(r.mesh);
      this.spikes.push({
        r, a: Math.random() * Math.PI * 2,
        len: 1.5 + Math.random() * 2.6,
        tilt: (Math.random() - 0.5) * 0.9,
      });
    }
    this.core = makeBillboard(TEX.glow, PAL.white, 1);
    this.core.position.copy(this.c);
    this.core.visible = true;
    this.pts = [new T.Vector3(), new T.Vector3()];
  }
  update(dt) {
    this.t += dt;
    const k = this.t / this.life;
    if (k >= 1) return false;
    const shrink = 1 - Math.pow(k, 1.6);
    for (const s of this.spikes) {
      const L = s.len * shrink;
      this.pts[0].set(this.c.x, this.c.y, this.c.z);
      this.pts[1].set(
        this.c.x + Math.cos(s.a) * L,
        this.c.y + s.tilt * L * 0.5,
        this.c.z + Math.sin(s.a) * L * 0.62
      );
      s.r.set(this.pts, 0.022 * (0.5 + shrink));
      s.r.opacity = 0.9 * shrink;
    }
    const cs = 1.5 * shrink + 0.3;
    this.core.scale.set(cs, cs, 1);
    this.core.material.opacity = shrink;
    return true;
  }
  dispose() {
    this.spikes.forEach(s => { scene.remove(s.r.mesh); s.r.geom.dispose(); s.r.mat.dispose(); });
    scene.remove(this.core); this.core.material.dispose();
  }
}

  const baseStarSpeed=TUNE.star.speed;
  const baseStarRange=TUNE.star.range;
  function setSize(multiplier){
    const s=Math.max(.001,Number(multiplier)||1);
    root.scale.setScalar(s);
    // Keep the source's physical projectile speed/range and its timing stable
    // while the authored visual/collision space follows Arcana Size.
    TUNE.star.speed=baseStarSpeed/s;
    TUNE.star.range=baseStarRange/s;
  }
  setSize(size);

  const targetByEnemy=new Map();
  function syncTargets(next=[]){
    const active=[];
    for(const item of next){
      const enemy=item?.enemy;
      if(!enemy)continue;
      let dummy=targetByEnemy.get(enemy);
      if(!dummy){
        dummy={enemy,position:new THREE.Vector3(),userData:{
          shock:0,shockT:0,flash:0,stun:0,hop:0,arcT:0,
        }};
        targetByEnemy.set(enemy,dummy);
      }
      dummy.position.set(Number(item.x)||0,0,Number(item.z)||0);
      active.push(dummy);
    }
    dummies.length=0;
    dummies.push(...active);
  }
  function updateShockTimers(dt){
    for(const dummy of dummies){
      const u=dummy.userData;
      if(u.shock>0){
        u.shockT-=dt;
        if(u.shockT<=0)dischargeShock(dummy);
      }
    }
  }
  let pendingNova=null;
  function cast(id){
    const key=String(id||'').toUpperCase();
    if(key==='STAR-BOLT'){
      const dir=new THREE.Vector3(1,0,0);
      const origin=dir.clone().multiplyScalar(.42);
      effects.push(new StarBolt(origin,dir));
      burstSparks(origin,12,2.6,PAL.goldHot,.28,.8,1.4);
      lightPulse(PAL.gold,4);
      return true;
    }
    if(key==='SHOCK-NOVA'){
      const charge=new NovaCharge();
      pendingNova=charge;
      effects.push(charge);
      return true;
    }
    return false;
  }
  function update(dt,camQuat){
    camera.quaternion.copy(camQuat||new THREE.Quaternion());
    camera.getWorldDirection(_b);
    camRight.crossVectors(_b,UP).normalize();
    if(pendingNova&&pendingNova.progress>=.999){
      const charge=pendingNova;
      pendingNova=null;
      const index=effects.indexOf(charge);
      if(index>=0){effects.splice(index,1);charge.dispose();}
      effects.push(new ShockNova(playerState.pos,false));
    }
    updateEffects(Math.max(0,Number(dt)||0));
    updateShockTimers(Math.max(0,Number(dt)||0));
  }
  function setCallbacks({onShock:shock=()=>{},onDischarge:discharge=()=>{},onPopup:popup=()=>{}}={}){
    onShock=shock;onDischarge=discharge;onPopup=popup;
  }
  function dispose(){
    for(const effect of[...effects])effect.dispose?.();
    effects.length=0;
    pendingNova=null;
    root.parent?.remove(root);
    root.traverse(object=>{
      object.geometry?.dispose?.();
      if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());
      else object.material?.dispose?.();
    });
  }
  return{root,cast,update,setSize,syncTargets,setCallbacks,dispose,TUNE};
}
