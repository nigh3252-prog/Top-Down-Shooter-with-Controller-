/* ------------------------------------------------------------------------
   Wizard of Legend arcana — phone-first three.js reconstruction.

   Two arcana, rebuilt beat-for-beat from the archived showcase video
   (media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4):

     Rock N' Roll        entry 92, window 12:05-12:17 (charged from 12:11)
     Earth Stomp Agent   entry 97, window 12:41-12:53

   Every timing, count and damage constant below is annotated with what the
   corresponding frames in that window actually show.
   ------------------------------------------------------------------------ */
(function () {
  'use strict';

  var T = window.THREE;
  var TAU = Math.PI * 2;

  /* ===================================================================
     0. small helpers
     =================================================================== */

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function damp(a, b, rate, dt) { return lerp(a, b, 1 - Math.exp(-rate * dt)); }

  function canvas(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  function texFrom(c) {
    var t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  /* A tiny free-list so trails, sparks and chunks never churn the heap. */
  function Pool(make) { this.free = []; this.make = make; }
  Pool.prototype.take = function () { return this.free.length ? this.free.pop() : this.make(); };
  Pool.prototype.give = function (o) { if (this.free.length < 220) this.free.push(o); };

  /* ===================================================================
     1. procedural textures
     =================================================================== */

  function floorTexture() {
    var S = 512, c = canvas(S), g = c.getContext('2d');
    g.fillStyle = '#22262a';
    g.fillRect(0, 0, S, S);

    var rows = 7, h = S / rows;
    for (var r = 0; r < rows; r++) {
      var off = (r % 2) ? h * 0.5 : 0;
      for (var x = -h; x < S + h; x += h) {
        var bx = x + off + 3, by = r * h + 3, bw = h - 6, bh = h - 6;
        var v = rnd(-11, 11);
        g.fillStyle = 'rgb(' + (104 + v) + ',' + (109 + v) + ',' + (112 + v) + ')';
        g.beginPath();
        g.moveTo(bx + 4, by);
        g.arcTo(bx + bw, by, bx + bw, by + bh, 4);
        g.arcTo(bx + bw, by + bh, bx, by + bh, 4);
        g.arcTo(bx, by + bh, bx, by, 4);
        g.arcTo(bx, by, bx + bw, by, 4);
        g.fill();
        // lit top bevel / dark bottom bevel
        g.strokeStyle = 'rgba(255,255,255,.055)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(bx + 4, by + 1); g.lineTo(bx + bw - 4, by + 1); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.30)';
        g.beginPath(); g.moveTo(bx + 4, by + bh - 1); g.lineTo(bx + bw - 4, by + bh - 1); g.stroke();
      }
    }
    // grime blotches
    for (var i = 0; i < 90; i++) {
      var gx = rnd(0, S), gy = rnd(0, S), gr = rnd(8, 46);
      var rg = g.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, 'rgba(12,14,15,' + rnd(0.05, 0.20).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(12,14,15,0)');
      g.fillStyle = rg;
      g.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    // hairline cracks
    g.strokeStyle = 'rgba(10,12,13,.55)';
    for (var k = 0; k < 26; k++) {
      var px = rnd(0, S), py = rnd(0, S), a = rnd(0, TAU);
      g.lineWidth = rnd(0.7, 1.8);
      g.beginPath(); g.moveTo(px, py);
      for (var s = 0; s < 4; s++) {
        a += rnd(-0.7, 0.7);
        px += Math.cos(a) * rnd(6, 22); py += Math.sin(a) * rnd(6, 22);
        g.lineTo(px, py);
      }
      g.stroke();
    }
    // moss speckle, as in the source dungeon floor
    for (var m = 0; m < 130; m++) {
      g.fillStyle = 'rgba(' + rndi(70, 110) + ',' + rndi(95, 135) + ',' + rndi(45, 70) + ',' + rnd(0.15, 0.5).toFixed(2) + ')';
      g.fillRect(rnd(0, S), rnd(0, S), rnd(1, 4), rnd(1, 3));
    }

    var t = texFrom(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(7, 7);
    return t;
  }

  /* Dark churned-earth smudge, stamped repeatedly to draw a buzzsaw furrow. */
  function smudgeTexture() {
    var S = 128, c = canvas(S), g = c.getContext('2d');
    var rg = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    rg.addColorStop(0.00, 'rgba(16,11,7,1)');
    rg.addColorStop(0.50, 'rgba(22,16,10,.78)');
    rg.addColorStop(1.00, 'rgba(22,16,10,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    for (var i = 0; i < 210; i++) {
      var a = rnd(0, TAU), d = Math.sqrt(Math.random()) * 60;
      var x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d;
      var f = 1 - d / 62;
      g.fillStyle = Math.random() < 0.45
        ? 'rgba(' + rndi(88, 128) + ',' + rndi(64, 92) + ',' + rndi(38, 56) + ',' + (f * rnd(0.35, 0.9)).toFixed(2) + ')'
        : 'rgba(8,6,4,' + (f * rnd(0.3, 0.9)).toFixed(2) + ')';
      g.fillRect(x, y, rnd(1.5, 4.5), rnd(1.5, 4));
    }
    return texFrom(c);
  }

  /* The white hit star the source pops on every damage tick. */
  function sparkTexture() {
    var S = 128, c = canvas(S), g = c.getContext('2d');
    g.translate(64, 64);
    g.strokeStyle = '#ffffff';
    g.lineCap = 'round';
    for (var i = 0; i < 9; i++) {
      var a = (i / 9) * TAU + rnd(-0.2, 0.2), L = rnd(30, 62);
      g.lineWidth = rnd(2.5, 5);
      g.beginPath();
      g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      g.lineTo(Math.cos(a) * L, Math.sin(a) * L);
      g.stroke();
    }
    var rg = g.createRadialGradient(0, 0, 0, 0, 0, 26);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.55, 'rgba(255,255,255,.95)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill();
    return texFrom(c);
  }

  /* Radial stone fracture left by an Earth Stomp Agent slam. */
  function crackTexture() {
    var S = 512, c = canvas(S), g = c.getContext('2d');
    var cx = S / 2, cy = S / 2;

    var rg = g.createRadialGradient(cx, cy, S * 0.04, cx, cy, S * 0.47);
    rg.addColorStop(0.0, 'rgba(24,19,14,.78)');
    rg.addColorStop(0.45, 'rgba(24,19,14,.30)');
    rg.addColorStop(1.0, 'rgba(24,19,14,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);

    g.lineCap = 'round';
    g.strokeStyle = '#100d09';

    function branch(x, y, a, len, w, depth) {
      var steps = 6, step = len / steps, px = x, py = y;
      for (var i = 0; i < steps; i++) {
        a += rnd(-0.26, 0.26);
        var nx = px + Math.cos(a) * step, ny = py + Math.sin(a) * step;
        g.lineWidth = Math.max(1.1, w * (1 - i / steps));
        g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
        if (depth < 2 && Math.random() < 0.62) {
          branch(nx, ny, a + (Math.random() < 0.5 ? -1 : 1) * rnd(0.55, 1.15),
            len * rnd(0.26, 0.5), w * 0.6, depth + 1);
        }
        px = nx; py = ny;
      }
    }
    var N = 22;
    for (var i = 0; i < N; i++) {
      branch(cx, cy, (i / N) * TAU + rnd(-0.09, 0.09), S * 0.37 * rnd(0.62, 1.0), 9, 0);
    }
    // shattered flakes lifted around the impact
    for (var f = 0; f < 90; f++) {
      var fa = rnd(0, TAU), fd = Math.sqrt(Math.random()) * S * 0.4;
      g.fillStyle = 'rgba(' + rndi(20, 48) + ',' + rndi(17, 40) + ',' + rndi(13, 30) + ',' +
        rnd(0.25, 0.75).toFixed(2) + ')';
      g.fillRect(cx + Math.cos(fa) * fd, cy + Math.sin(fa) * fd, rnd(2, 9), rnd(2, 8));
    }
    // crushed centre
    var cg = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.11);
    cg.addColorStop(0, 'rgba(10,8,6,.95)');
    cg.addColorStop(1, 'rgba(10,8,6,0)');
    g.fillStyle = cg;
    g.beginPath(); g.arc(cx, cy, S * 0.11, 0, TAU); g.fill();
    return texFrom(c);
  }

  function shadowTexture() {
    var S = 128, c = canvas(S), g = c.getContext('2d');
    var rg = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    rg.addColorStop(0.0, 'rgba(0,0,0,.62)');
    rg.addColorStop(0.62, 'rgba(0,0,0,.34)');
    rg.addColorStop(1.0, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    return texFrom(c);
  }

  var numberCache = {};
  function numberTexture(text) {
    if (numberCache[text]) return numberCache[text];
    var W = 160, H = 96, c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.font = '900 66px "Arial Black", "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 11;
    g.strokeStyle = '#0d0b08';
    g.strokeText(text, W / 2, H / 2 + 2);
    g.fillStyle = '#ffffff';
    g.fillText(text, W / 2, H / 2 + 2);
    var t = texFrom(c);
    numberCache[text] = t;
    return t;
  }

  var TEX = {};

  /* ===================================================================
     2. renderer / scene / camera
     =================================================================== */

  var canvasEl = document.getElementById('view');
  var renderer = new T.WebGLRenderer({
    canvas: canvasEl,
    antialias: window.devicePixelRatio < 1.75,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setClearColor(0x0a0c0d, 1);
  renderer.outputColorSpace = T.SRGBColorSpace;

  var scene = new T.Scene();
  scene.fog = new T.Fog(0x0a0c0d, 30, 72);

  var camera = new T.PerspectiveCamera(50, 1, 0.5, 140);
  // Near top-down like the source view. The demo is laid out "up-screen" so a
  // portrait phone gets a tall runway for the buzzsaws instead of a wide one.
  var CAM_H = 26, CAM_BACK = 11;
  var VIEW_W = 10.5, VIEW_D = 20;         // world units that must stay visible
  var camTarget = new T.Vector3();
  var camShake = 0;

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    var aspect = w / h;
    camera.aspect = aspect;
    var dist = Math.sqrt(CAM_H * CAM_H + CAM_BACK * CAM_BACK);
    var fovForDepth = 2 * Math.atan((VIEW_D / 2) / dist);
    var fovForWidth = 2 * Math.atan((VIEW_W / 2) / (dist * aspect));
    camera.fov = Math.max(fovForDepth, fovForWidth) * 180 / Math.PI;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

  scene.add(new T.HemisphereLight(0xa8bccb, 0x33291f, 1.05));
  var sun = new T.DirectionalLight(0xfff2dc, 0.9);
  sun.position.set(9, 16, 7);
  scene.add(sun);

  /* ===================================================================
     3. arena
     =================================================================== */

  var ARENA = 30;   // half-extent

  TEX.floor = floorTexture();
  TEX.smudge = smudgeTexture();
  TEX.spark = sparkTexture();
  TEX.crack = crackTexture();
  TEX.shadow = shadowTexture();

  var floor = new T.Mesh(
    new T.PlaneGeometry(ARENA * 2, ARENA * 2),
    new T.MeshLambertMaterial({ map: TEX.floor })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  (function buildWalls() {
    var mat = new T.MeshLambertMaterial({ color: 0x363c40, flatShading: true });
    var cap = new T.MeshLambertMaterial({ color: 0x272c30, flatShading: true });
    var g = new T.BoxGeometry(1, 1, 1);
    var sides = [
      [0, ARENA + 1, ARENA * 2 + 4, 2],
      [0, -ARENA - 1, ARENA * 2 + 4, 2],
      [ARENA + 1, 0, 2, ARENA * 2 + 4],
      [-ARENA - 1, 0, 2, ARENA * 2 + 4]
    ];
    for (var i = 0; i < sides.length; i++) {
      var s = sides[i];
      var m = new T.Mesh(g, mat);
      m.scale.set(s[2], 2.4, s[3]);
      m.position.set(s[0], 1.2, s[1]);
      scene.add(m);
      var c = new T.Mesh(g, cap);
      c.scale.set(s[2] + 0.3, 0.3, s[3] + 0.3);
      c.position.set(s[0], 2.5, s[1]);
      scene.add(c);
    }
  })();

  /* ===================================================================
     4. ground decals (furrows, cracks, dust rings)
     =================================================================== */

  var decalGeo = new T.PlaneGeometry(1, 1);
  var decals = [];
  var decalPool = new Pool(function () {
    var m = new T.Mesh(decalGeo, new T.MeshBasicMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
    }));
    m.rotation.x = -Math.PI / 2;
    return m;
  });

  var decalLift = 0;
  function addDecal(tex, x, z, sx, sz, rot, opacity, hold, fade, blend, color) {
    if (decals.length > 130) {
      var old = decals.shift();
      scene.remove(old.m); decalPool.give(old.m);
    }
    var m = decalPool.take();
    m.material.map = tex;
    m.material.opacity = opacity;
    m.material.blending = blend || T.NormalBlending;
    m.material.color.setHex(color === undefined ? 0xffffff : color);
    m.material.needsUpdate = true;
    decalLift = (decalLift + 1) % 64;
    m.position.set(x, 0.02 + decalLift * 0.0009, z);
    m.rotation.z = rot || 0;
    m.scale.set(sx, sz, 1);
    scene.add(m);
    var d = { m: m, t: 0, hold: hold, fade: fade, op: opacity };
    decals.push(d);
    return d;
  }

  function updateDecals(dt) {
    for (var i = decals.length - 1; i >= 0; i--) {
      var d = decals[i];
      d.t += dt;
      if (d.t > d.hold) {
        var k = 1 - (d.t - d.hold) / d.fade;
        if (k <= 0) {
          scene.remove(d.m); decalPool.give(d.m); decals.splice(i, 1);
          continue;
        }
        d.m.material.opacity = d.op * k;
      }
    }
  }

  /* ===================================================================
     5. sparks / damage numbers / debris
     =================================================================== */

  var sparks = [];
  var sparkPool = new Pool(function () {
    var m = new T.Mesh(decalGeo, new T.MeshBasicMaterial({
      map: TEX.spark, transparent: true, depthWrite: false,
      blending: T.AdditiveBlending, side: T.DoubleSide
    }));
    return m;
  });

  function addSpark(x, y, z, size, life) {
    var m = sparkPool.take();
    m.position.set(x, y, z);
    m.scale.set(size, size, 1);
    m.material.opacity = 1;
    m.rotation.set(0, 0, rnd(0, TAU));
    m.lookAt(camera.position);
    scene.add(m);
    sparks.push({ m: m, t: 0, life: life || 0.24, size: size });
  }

  function updateSparks(dt) {
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.t += dt;
      var k = s.t / s.life;
      if (k >= 1) { scene.remove(s.m); sparkPool.give(s.m); sparks.splice(i, 1); continue; }
      var sc = s.size * (0.55 + 0.75 * ease(Math.min(1, k * 1.7)));
      s.m.scale.set(sc, sc, 1);
      s.m.material.opacity = 1 - k * k;
    }
  }

  var numbers = [];
  var numberPool = new Pool(function () {
    return new T.Sprite(new T.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
  });

  function addNumber(text, x, y, z) {
    if (numbers.length > 34) {
      var o = numbers.shift(); scene.remove(o.m); numberPool.give(o.m);
    }
    var m = numberPool.take();
    m.material.map = numberTexture(text);
    m.material.opacity = 1;
    m.material.needsUpdate = true;
    m.scale.set(1.5, 0.9, 1);
    m.position.set(x + rnd(-0.35, 0.35), y, z + rnd(-0.3, 0.3));
    m.renderOrder = 900;
    scene.add(m);
    numbers.push({ m: m, t: 0, vy: 2.2, vx: rnd(-0.5, 0.5), vz: rnd(-0.4, 0.2) });
  }

  function updateNumbers(dt) {
    for (var i = numbers.length - 1; i >= 0; i--) {
      var n = numbers[i];
      n.t += dt;
      if (n.t > 0.95) { scene.remove(n.m); numberPool.give(n.m); numbers.splice(i, 1); continue; }
      n.vy -= 3.6 * dt;
      n.m.position.x += n.vx * dt;
      n.m.position.y += n.vy * dt;
      n.m.position.z += n.vz * dt;
      n.m.material.opacity = n.t < 0.6 ? 1 : 1 - (n.t - 0.6) / 0.35;
    }
  }

  /* Dirt / rock debris thrown by both arcana. */
  var debris = [];
  var chunkGeo = new T.IcosahedronGeometry(0.14, 0);
  var chunkMats = [
    new T.MeshLambertMaterial({ color: 0xa47c48, flatShading: true }),
    new T.MeshLambertMaterial({ color: 0x8a6739, flatShading: true }),
    new T.MeshLambertMaterial({ color: 0x6b5330, flatShading: true }),
    new T.MeshLambertMaterial({ color: 0x4a3c26, flatShading: true })
  ];
  var debrisPool = new Pool(function () {
    return new T.Mesh(chunkGeo, chunkMats[0]);
  });

  function addDebris(x, y, z, vx, vy, vz, size, life) {
    if (debris.length > 120) {
      var o = debris.shift(); scene.remove(o.m); debrisPool.give(o.m);
    }
    var m = debrisPool.take();
    m.material = chunkMats[rndi(0, 3)];
    m.position.set(x, y, z);
    m.scale.setScalar(size);
    m.rotation.set(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU));
    scene.add(m);
    debris.push({
      m: m, vx: vx, vy: vy, vz: vz, t: 0, life: life || 0.85, size: size,
      rx: rnd(-14, 14), ry: rnd(-14, 14)
    });
  }

  function updateDebris(dt) {
    for (var i = debris.length - 1; i >= 0; i--) {
      var d = debris[i];
      d.t += dt;
      if (d.t > d.life) { scene.remove(d.m); debrisPool.give(d.m); debris.splice(i, 1); continue; }
      d.vy -= 26 * dt;
      d.m.position.x += d.vx * dt;
      d.m.position.y += d.vy * dt;
      d.m.position.z += d.vz * dt;
      if (d.m.position.y < 0.08) {
        d.m.position.y = 0.08;
        d.vy *= -0.32; d.vx *= 0.55; d.vz *= 0.55;
      }
      d.m.rotation.x += d.rx * dt;
      d.m.rotation.y += d.ry * dt;
      var k = d.t / d.life;
      if (k > 0.7) d.m.scale.setScalar(d.size * (1 - (k - 0.7) / 0.3));
    }
  }

  /* Expanding dust ring used on every heavy ground impact. */
  var rings = [];
  var ringGeo = new T.RingGeometry(0.72, 1, 40);
  function addRing(x, z, from, to, life, color, opacity) {
    var m = new T.Mesh(ringGeo, new T.MeshBasicMaterial({
      color: color === undefined ? 0xd6c6a6 : color,
      transparent: true, opacity: opacity === undefined ? 0.6 : opacity,
      depthWrite: false, side: T.DoubleSide
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.07, z);
    m.scale.setScalar(from);
    scene.add(m);
    rings.push({ m: m, t: 0, life: life, from: from, to: to, op: m.material.opacity });
  }

  function updateRings(dt) {
    for (var i = rings.length - 1; i >= 0; i--) {
      var r = rings[i];
      r.t += dt;
      var k = r.t / r.life;
      if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); continue; }
      r.m.scale.setScalar(lerp(r.from, r.to, ease(k)));
      r.m.material.opacity = r.op * (1 - k);
    }
  }

  function blobShadow(size) {
    var m = new T.Mesh(decalGeo, new T.MeshBasicMaterial({
      map: TEX.shadow, transparent: true, depthWrite: false, opacity: 0.85
    }));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(size, size, 1);
    m.position.y = 0.03;
    return m;
  }

  /* ===================================================================
     6. actors
     =================================================================== */

  function makeBar(width, color) {
    var g = new T.Group();
    var bg = new T.Mesh(new T.PlaneGeometry(width, 0.11), new T.MeshBasicMaterial({
      color: 0x140f0c, transparent: true, opacity: 0.85, depthWrite: false
    }));
    bg.rotation.x = -Math.PI / 2;
    bg.position.y = 0.05;
    var fill = new T.Mesh(new T.PlaneGeometry(width, 0.11), new T.MeshBasicMaterial({
      color: color, depthWrite: false, transparent: true
    }));
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.06;
    g.add(bg); g.add(fill);
    g.userData = { fill: fill, width: width };
    return g;
  }

  function setBar(bar, frac) {
    var f = clamp(frac, 0, 1);
    bar.userData.fill.scale.x = Math.max(0.0001, f);
    bar.userData.fill.position.x = -bar.userData.width * (1 - f) / 2;
  }

  /* --- the caster ------------------------------------------------- */

  var player = {
    pos: new T.Vector3(0, 0, 6.5),
    vel: new T.Vector3(),
    facing: Math.PI,              // -Z, i.e. up the screen: the showcase cast line
    speed: 6.4,
    crouch: 0,
    group: new T.Group()
  };

  (function buildPlayer() {
    var g = player.group;
    var skin = new T.MeshLambertMaterial({ color: 0xe3c9a4, flatShading: true });
    var robe = new T.MeshLambertMaterial({ color: 0x8d3f35, flatShading: true });
    var cloak = new T.MeshLambertMaterial({ color: 0xcdbb99, flatShading: true });
    var dark = new T.MeshLambertMaterial({ color: 0x241d1a, flatShading: true });
    var gold = new T.MeshLambertMaterial({ color: 0xd8a93c, flatShading: true });

    var legs = new T.Mesh(new T.BoxGeometry(0.36, 0.36, 0.26), dark);
    legs.position.y = 0.2; g.add(legs);
    var bootL = new T.Mesh(new T.BoxGeometry(0.15, 0.12, 0.22), gold);
    bootL.position.set(-0.11, 0.06, 0.02); g.add(bootL);
    var bootR = bootL.clone(); bootR.position.x = 0.11; g.add(bootR);

    var torso = new T.Mesh(new T.CylinderGeometry(0.25, 0.3, 0.52, 8), robe);
    torso.position.y = 0.64; g.add(torso);
    var belt = new T.Mesh(new T.CylinderGeometry(0.31, 0.31, 0.07, 8), gold);
    belt.position.y = 0.42; g.add(belt);

    var cape = new T.Mesh(new T.ConeGeometry(0.36, 0.86, 7, 1, true), cloak);
    cape.position.set(0, 0.58, -0.12);
    cape.rotation.x = -0.12; g.add(cape);

    var head = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), skin);
    head.position.y = 1.04; g.add(head);
    var hood = new T.Mesh(new T.ConeGeometry(0.29, 0.42, 8), cloak);
    hood.position.set(0, 1.16, -0.05);
    hood.rotation.x = -0.18; g.add(hood);

    g.add(blobShadow(1.15));
    g.position.copy(player.pos);
    scene.add(g);
  })();

  /* --- training dummies (the source clip's practice room) ---------- */

  var dummies = [];

  function makeDummy(x, z) {
    var g = new T.Group();
    var wood = new T.MeshLambertMaterial({ color: 0xc2954f, flatShading: true });
    var wood2 = new T.MeshLambertMaterial({ color: 0xa87e40, flatShading: true });
    var stone = new T.MeshLambertMaterial({ color: 0x6d7377, flatShading: true });
    var rope = new T.MeshLambertMaterial({ color: 0x8d8069, flatShading: true });

    var body = new T.Group();
    var base = new T.Mesh(new T.CylinderGeometry(0.44, 0.5, 0.16, 10), stone);
    base.position.y = 0.08; body.add(base);
    var post = new T.Mesh(new T.CylinderGeometry(0.12, 0.15, 1.2, 7), wood);
    post.position.y = 0.75; body.add(post);
    var arms = new T.Mesh(new T.BoxGeometry(1.0, 0.14, 0.14), wood2);
    arms.position.y = 1.02; body.add(arms);
    var head = new T.Mesh(new T.SphereGeometry(0.2, 9, 7), wood);
    head.position.y = 1.48; body.add(head);
    var neck = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.18, 6), rope);
    neck.position.y = 1.3; body.add(neck);
    var wrap = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.1, 8), rope);
    wrap.position.y = 0.86; body.add(wrap);

    // per-dummy materials so hit flashes stay local
    var mats = [];
    body.traverse(function (o) {
      if (o.isMesh) { o.material = o.material.clone(); mats.push(o.material); }
    });

    g.add(body);
    g.add(blobShadow(1.25));
    var bar = makeBar(0.86, 0xd23c3c);
    bar.position.set(0, 0, 0.72);
    g.add(bar);

    g.position.set(x, 0, z);
    scene.add(g);

    var d = {
      group: g, body: body, mats: mats, bar: bar,
      home: new T.Vector2(x, z),
      pos: new T.Vector2(x, z),
      vel: new T.Vector2(),
      hp: 60, maxHp: 60,
      flash: 0, lean: new T.Vector2(), regen: 0,
      dead: false, respawn: 0, alive: true, radius: 0.5
    };
    dummies.push(d);
    return d;
  }

  // Two ranks plus a back rank, echoing the practice-room layout in the clip,
  // laid out up-screen so a portrait phone sees the whole cast line.
  (function layoutDummies() {
    var ranks = [0.0, -3.0];
    for (var r = 0; r < ranks.length; r++) {
      var xs = r ? [-2.6, 0, 2.6] : [-3.6, -1.2, 1.2, 3.6];
      for (var i = 0; i < xs.length; i++) {
        makeDummy(xs[i] + rnd(-0.12, 0.12), ranks[r] + rnd(-0.12, 0.12));
      }
    }
    makeDummy(-1.9, -6.2);
    makeDummy(1.9, -6.2);
  })();

  function hurtDummy(d, amount, fromX, fromZ, knock) {
    if (!d.alive) return;
    d.hp -= amount;
    d.flash = 1;
    d.regen = 0;
    addNumber(String(amount), d.pos.x, 1.75, d.pos.y);
    addSpark(d.pos.x, 1.0, d.pos.y, rnd(1.5, 2.1), 0.22);
    var dx = d.pos.x - fromX, dz = d.pos.y - fromZ;
    var len = Math.hypot(dx, dz) || 1;
    d.vel.x += (dx / len) * knock;
    d.vel.y += (dz / len) * knock;
    if (d.hp <= 0) breakDummy(d);
  }

  function breakDummy(d) {
    d.alive = false;
    d.respawn = 1.5;
    d.body.visible = false;
    d.bar.visible = false;
    for (var i = 0; i < 12; i++) {
      var a = rnd(0, TAU);
      addDebris(d.pos.x, rnd(0.3, 1.3), d.pos.y,
        Math.cos(a) * rnd(1.5, 5), rnd(3, 7), Math.sin(a) * rnd(1.5, 5),
        rnd(0.5, 1.1), rnd(0.7, 1.1));
    }
    addRing(d.pos.x, d.pos.y, 0.3, 2.0, 0.4, 0xc9a86e, 0.55);
    addSpark(d.pos.x, 0.9, d.pos.y, 3.0, 0.28);
  }

  function updateDummies(dt) {
    for (var i = 0; i < dummies.length; i++) {
      var d = dummies[i];

      if (!d.alive) {
        d.respawn -= dt;
        if (d.respawn <= 0) {
          d.alive = true; d.hp = d.maxHp;
          d.pos.copy(d.home); d.vel.set(0, 0);
          d.body.visible = true; d.bar.visible = true;
          d.body.scale.setScalar(0.01);
          addRing(d.pos.x, d.pos.y, 0.2, 1.4, 0.35, 0xc9a86e, 0.5);
        }
        continue;
      }
      if (d.body.scale.x < 1) d.body.scale.setScalar(Math.min(1, d.body.scale.x + dt * 4.5));

      // knockback slide + drift back to the home slot
      d.pos.x += d.vel.x * dt;
      d.pos.y += d.vel.y * dt;
      var fr = Math.exp(-7 * dt);
      d.vel.x *= fr; d.vel.y *= fr;
      d.pos.x = damp(d.pos.x, d.home.x, 1.6, dt);
      d.pos.y = damp(d.pos.y, d.home.y, 1.6, dt);
      d.pos.x = clamp(d.pos.x, -ARENA + 1, ARENA - 1);
      d.pos.y = clamp(d.pos.y, -ARENA + 1, ARENA - 1);
      d.group.position.set(d.pos.x, 0, d.pos.y);

      // lean away from the shove, then spring upright
      d.lean.x = damp(d.lean.x, clamp(d.vel.y * 0.075, -0.42, 0.42), 9, dt);
      d.lean.y = damp(d.lean.y, clamp(-d.vel.x * 0.075, -0.42, 0.42), 9, dt);
      d.body.rotation.x = d.lean.x;
      d.body.rotation.z = d.lean.y;

      if (d.flash > 0) {
        d.flash = Math.max(0, d.flash - dt * 6.5);
        var f = d.flash * 0.85;
        for (var m = 0; m < d.mats.length; m++) d.mats[m].emissive.setRGB(f, f, f);
      }

      d.regen += dt;
      if (d.regen > 2.2 && d.hp < d.maxHp) d.hp = Math.min(d.maxHp, d.hp + 34 * dt);
      setBar(d.bar, d.hp / d.maxHp);
      d.bar.visible = d.hp < d.maxHp - 0.5;
    }
  }

  function nearestDummy(x, z, maxDist) {
    var best = null, bd = maxDist * maxDist;
    for (var i = 0; i < dummies.length; i++) {
      var d = dummies[i];
      if (!d.alive) continue;
      var dx = d.pos.x - x, dz = d.pos.y - z;
      var s = dx * dx + dz * dz;
      if (s < bd) { bd = s; best = d; }
    }
    return best;
  }

  /* ===================================================================
     7. ARCANA 92 — ROCK N' ROLL          source window 12:05 - 12:17
     ===================================================================
     Frames show: a short crouch, rock erupting at the caster's feet, then
     buzzsaws that tear straight forward in parallel lanes, carve a dark
     furrow, spray dirt backwards, pass through targets and tick damage.
     Holding the cast rings the caster in flat white spikes; releasing
     erupts a tall stacked fan of saws instead of the base pair.
     =================================================================== */

  var RNR = {
    windup: 0.16,          // crouch before the ground opens
    base: {
      count: 2,            // 12:05-12:11 — two furrows, every cast
      spread: 1.75,        // lateral gap between the two lanes
      splay: 0.13,         // lanes drift apart as they run
      speed: 13.2,
      range: 12.0,
      radius: 0.78,
      damage: 4,           // white "4" popups in the clip
      tick: 0.17,
      knock: 4.5,
      cooldown: 1.15
    },
    charged: {
      count: 5,            // 12:11-12:17 — a stacked column of saws
      spread: 1.35,
      splay: 0.05,
      speed: 11.4,
      range: 14.5,
      radius: 0.95,
      damage: 5,           // white "5" popups in the clip
      tick: 0.14,
      knock: 6.5,
      cooldown: 2.1
    },
    chargeTime: 0.95       // hold length before the charged version arms
  };

  var saws = [];

  function makeSawMesh(radius) {
    var root = new T.Group();
    var axle = new T.Group();
    axle.rotation.z = Math.PI / 2;      // lay the wheel axis across the travel line
    var wheel = new T.Group();
    axle.add(wheel);
    root.add(axle);

    var light = new T.MeshLambertMaterial({ color: 0xc79a58, flatShading: true });
    var mid = new T.MeshLambertMaterial({ color: 0xa87c44, flatShading: true });
    var dark = new T.MeshLambertMaterial({ color: 0x7d5c33, flatShading: true });

    var body = new T.Mesh(
      new T.CylinderGeometry(radius * 0.92, radius * 0.92, radius * 0.86, 9, 1),
      mid
    );
    wheel.add(body);

    // rim teeth — the jagged crest that reads as a saw in the source sprite
    var toothGeo = new T.ConeGeometry(radius * 0.3, radius * 0.72, 4);
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * TAU;
      var t = new T.Mesh(toothGeo, i % 2 ? light : dark);
      t.position.set(Math.cos(a) * radius * 0.95, rnd(-0.2, 0.2) * radius, Math.sin(a) * radius * 0.95);
      t.rotation.z = -a - Math.PI / 2;
      t.rotation.y = rnd(-0.45, 0.45);
      t.scale.setScalar(rnd(0.85, 1.3));
      wheel.add(t);
    }
    // boulders riding the wheel so the top-down silhouette stays lumpy rock
    for (var b = 0; b < 9; b++) {
      var ba = rnd(0, TAU), br = rnd(0.35, 0.95);
      var r = new T.Mesh(new T.IcosahedronGeometry(radius * rnd(0.22, 0.4), 0),
        b % 3 === 0 ? light : (b % 3 === 1 ? mid : dark));
      r.position.set(Math.cos(ba) * radius * br, rnd(-0.48, 0.48) * radius, Math.sin(ba) * radius * br);
      r.rotation.set(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU));
      wheel.add(r);
    }

    // ground-level churn collar: rocks kicked up in a ring around the base,
    // which is what actually sells "tearing forward" from a top-down camera
    var collar = new T.Group();
    for (var c = 0; c < 8; c++) {
      var ca = (c / 8) * TAU;
      var k = new T.Mesh(new T.IcosahedronGeometry(radius * rnd(0.16, 0.3), 0), c % 2 ? mid : dark);
      k.position.set(Math.cos(ca) * radius * 1.15, -radius * 0.42, Math.sin(ca) * radius * rnd(0.6, 0.9));
      k.rotation.set(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU));
      collar.add(k);
    }
    root.add(collar);

    root.userData = { wheel: wheel, collar: collar };
    return root;
  }

  function castRockNRoll(charged) {
    var C = charged ? RNR.charged : RNR.base;
    var dir = new T.Vector2(Math.sin(player.facing), Math.cos(player.facing));
    var side = new T.Vector2(dir.y, -dir.x);

    player.crouch = 1;
    camShake = Math.max(camShake, charged ? 0.6 : 0.22);

    // ground opens up under the caster
    addRing(player.pos.x, player.pos.z, 0.3, charged ? 3.4 : 2.1, 0.36, 0xbb9a63, 0.55);
    var puffs = charged ? 22 : 12;
    for (var p = 0; p < puffs; p++) {
      var a = rnd(0, TAU);
      addDebris(player.pos.x, 0.3, player.pos.z,
        Math.cos(a) * rnd(1, 4.5), rnd(2.5, 6.5), Math.sin(a) * rnd(1, 4.5),
        rnd(0.4, 1.0), rnd(0.5, 0.85));
    }

    for (var i = 0; i < C.count; i++) {
      var t = C.count === 1 ? 0 : (i / (C.count - 1)) - 0.5;
      var lateral = t * C.spread * (C.count - 1);
      var mesh = makeSawMesh(C.radius);
      var sx = player.pos.x + side.x * lateral + dir.x * 0.4;
      var sz = player.pos.z + side.y * lateral + dir.y * 0.4;
      mesh.position.set(sx, C.radius * 0.52, sz);
      mesh.rotation.y = player.facing;
      mesh.scale.setScalar(0.05);
      scene.add(mesh);
      saws.push({
        mesh: mesh, cfg: C,
        pos: new T.Vector2(sx, sz),
        dir: new T.Vector2(dir.x, dir.y),
        side: new T.Vector2(side.x, side.y),
        splay: Math.abs(t) > 0.001 ? Math.sign(t) * C.splay : 0,
        travelled: 0, birth: 0, life: C.range / C.speed,
        trailT: 0, hits: {}, radius: C.radius, charged: charged
      });
    }

    showTitle('rock-n-roll', charged);
  }

  function updateSaws(dt, now) {
    for (var i = saws.length - 1; i >= 0; i--) {
      var s = saws[i];
      s.birth += dt;
      var C = s.cfg;

      // pop-in, then run
      var grow = Math.min(1, s.birth / 0.13);
      s.mesh.scale.setScalar(0.05 + 0.95 * ease(grow));

      var v = C.speed * (0.35 + 0.65 * ease(Math.min(1, s.birth / 0.16)));
      // lanes drift apart slightly as they run, as the clip shows
      s.dir.x += s.side.x * s.splay * dt;
      s.dir.y += s.side.y * s.splay * dt;
      s.dir.normalize();
      s.pos.x += s.dir.x * v * dt;
      s.pos.y += s.dir.y * v * dt;
      s.travelled += v * dt;

      s.mesh.position.set(s.pos.x, C.radius * 0.58 + Math.sin(s.birth * 26) * 0.05, s.pos.y);
      s.mesh.rotation.y = Math.atan2(s.dir.x, s.dir.y);
      s.mesh.userData.wheel.rotation.y -= (v / C.radius) * dt;
      s.mesh.userData.collar.rotation.y += 5.5 * dt;

      // furrow stamps
      s.trailT -= dt;
      if (s.trailT <= 0) {
        s.trailT = 0.075;
        addDecal(TEX.smudge, s.pos.x + rnd(-0.12, 0.12), s.pos.y + rnd(-0.12, 0.12),
          C.radius * rnd(2.6, 3.3), C.radius * rnd(2.1, 2.7), rnd(0, TAU),
          rnd(0.55, 0.8), 0.35, 1.25);
        for (var p = 0; p < 2; p++) {
          addDebris(s.pos.x, 0.35, s.pos.y,
            -s.dir.x * rnd(1, 4) + rnd(-2, 2), rnd(1.5, 4.5),
            -s.dir.y * rnd(1, 4) + rnd(-2, 2), rnd(0.3, 0.7), rnd(0.35, 0.6));
        }
      }

      // saws tear through targets rather than stopping on them
      for (var k = 0; k < dummies.length; k++) {
        var d = dummies[k];
        if (!d.alive) continue;
        var dx = d.pos.x - s.pos.x, dz = d.pos.y - s.pos.y;
        if (dx * dx + dz * dz < (C.radius + d.radius) * (C.radius + d.radius)) {
          var last = s.hits[k] || -99;
          if (now - last >= C.tick) {
            s.hits[k] = now;
            hurtDummy(d, C.damage, s.pos.x - s.dir.x, s.pos.y - s.dir.y, C.knock);
            camShake = Math.max(camShake, 0.12);
          }
        }
      }

      var out = Math.abs(s.pos.x) > ARENA - 1 || Math.abs(s.pos.y) > ARENA - 1;
      if (s.travelled >= C.range || out) {
        for (var q = 0; q < 9; q++) {
          var a = rnd(0, TAU);
          addDebris(s.pos.x, C.radius * 0.5, s.pos.y,
            Math.cos(a) * rnd(1, 5) + s.dir.x * 2, rnd(2, 5.5),
            Math.sin(a) * rnd(1, 5) + s.dir.y * 2, rnd(0.5, 1.0), rnd(0.5, 0.9));
        }
        addRing(s.pos.x, s.pos.y, 0.3, 1.8, 0.3, 0xbb9a63, 0.4);
        scene.remove(s.mesh);
        saws.splice(i, 1);
      }
    }
  }

  /* --- charge tell: flat white spikes ringing the caster ------------ */

  var chargeRig = (function () {
    var g = new T.Group();
    var mat = new T.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.95,
      blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
    });
    // Pre-rotate the quad flat so only a yaw is ever applied — otherwise the
    // Euler order tips the spikes out of the floor plane.
    var geo = new T.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    var spikes = [];
    for (var i = 0; i < 22; i++) {
      var m = new T.Mesh(geo, mat);
      g.add(m);
      spikes.push({
        m: m,
        a: (i / 22) * TAU + rnd(-0.09, 0.09),
        len: rnd(0.45, 1),
        wid: rnd(0.055, 0.115),
        ph: rnd(0, TAU)
      });
    }
    g.position.y = 0.09;
    g.visible = false;
    scene.add(g);
    return { group: g, spikes: spikes, mat: mat };
  })();

  function updateChargeRig(t, amount) {
    var g = chargeRig.group;
    if (amount <= 0.001) { g.visible = false; return; }
    g.visible = true;
    g.position.x = player.pos.x;
    g.position.z = player.pos.z;
    var full = amount >= 1;
    var scale = 1.0 + amount * 3.1 + (full ? Math.sin(t * 22) * 0.2 : 0);
    for (var i = 0; i < chargeRig.spikes.length; i++) {
      var s = chargeRig.spikes[i];
      // lengths flicker frame to frame, exactly like the source tell
      var flick = 0.45 + 0.55 * Math.abs(Math.sin(t * 33 + s.ph));
      var L = scale * s.len * flick;
      s.m.scale.set(s.wid, 1, L);
      s.m.rotation.y = s.a;
      s.m.position.set(Math.sin(s.a) * L * 0.5, 0, Math.cos(s.a) * L * 0.5);
    }
    chargeRig.mat.opacity = (full ? 0.98 : 0.5 + 0.45 * amount);
  }

  /* ===================================================================
     8. ARCANA 97 — EARTH STOMP AGENT     source window 12:41 - 12:53
     ===================================================================
     Frames show: rock bursts beside the caster and leaves a hovering
     olive core ringed with tan shards. It bobs, loosely follows, and on
     roughly a 1.1s cadence leaps at the nearest target — shards flaring
     into a spinning star while its shadow shrinks on the floor — then
     slams down for 15 damage in a wide radius with radial cracks, a dust
     ring, flung rock and hard knockback. It expires after 10 seconds.
     =================================================================== */

  var ESA = {
    lifetime: 10.0,        // wiki: "remain active for 10 seconds"
    stompPeriod: 1.1,      // wiki: "about every 1.1s"; matches the clip cadence
    damage: 15,            // white "15" popups in the clip
    radius: 3.3,
    knock: 13,
    cooldown: 15.0,        // wiki cooldown
    leapUp: 0.40,
    leapDown: 0.17,
    windup: 0.13,
    follow: 3.0,
    leash: 11.0,
    seek: 9.5
  };

  var agents = [];

  function makeAgentMesh() {
    var root = new T.Group();

    var core = new T.Mesh(
      new T.SphereGeometry(0.3, 12, 10),
      new T.MeshLambertMaterial({ color: 0x9dbe27, emissive: 0x4d6b0c, flatShading: true })
    );
    root.add(core);

    var glow = new T.Mesh(decalGeo, new T.MeshBasicMaterial({
      map: TEX.spark, color: 0xc4e64a, transparent: true, opacity: 0.35,
      blending: T.AdditiveBlending, depthWrite: false
    }));
    glow.scale.set(1.5, 1.5, 1);
    root.add(glow);

    var ring = new T.Group();
    var shardGeo = new T.ConeGeometry(0.09, 0.5, 4);
    var m1 = new T.MeshLambertMaterial({ color: 0xc79a58, flatShading: true });
    var m2 = new T.MeshLambertMaterial({ color: 0x9a7440, flatShading: true });
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * TAU;
      var s = new T.Mesh(shardGeo, i % 2 ? m1 : m2);
      s.position.set(Math.cos(a) * 0.42, rnd(-0.09, 0.09), Math.sin(a) * 0.42);
      s.rotation.z = -a - Math.PI / 2;
      s.rotation.y = rnd(-0.3, 0.3);
      s.scale.setScalar(rnd(0.85, 1.2));
      ring.add(s);
    }
    root.add(ring);

    root.userData = { ring: ring, core: core, glow: glow };
    return root;
  }

  function castEarthStompAgent() {
    var side = new T.Vector2(Math.cos(player.facing), -Math.sin(player.facing));
    var sx = player.pos.x + side.x * 1.15 + Math.sin(player.facing) * 0.5;
    var sz = player.pos.z + side.y * 1.15 + Math.cos(player.facing) * 0.5;

    var mesh = makeAgentMesh();
    mesh.position.set(sx, 0.8, sz);
    mesh.scale.setScalar(0.05);
    scene.add(mesh);

    var shadow = blobShadow(1.0);
    scene.add(shadow);

    var bar = makeBar(0.6, 0xd23c3c);
    scene.add(bar);

    // summon burst
    addRing(sx, sz, 0.2, 2.0, 0.36, 0xc0a068, 0.6);
    for (var i = 0; i < 14; i++) {
      var a = rnd(0, TAU);
      addDebris(sx, 0.4, sz, Math.cos(a) * rnd(1.5, 5), rnd(3, 7), Math.sin(a) * rnd(1.5, 5),
        rnd(0.5, 1.0), rnd(0.5, 0.9));
    }
    addSpark(sx, 0.8, sz, 2.4, 0.3);

    agents.push({
      mesh: mesh, shadow: shadow, bar: bar,
      pos: new T.Vector3(sx, 0.8, sz),
      vel: new T.Vector2(),
      age: 0, life: ESA.lifetime,
      hp: 40, maxHp: 40,
      state: 'idle', st: 0,
      target: null,
      from: new T.Vector3(), to: new T.Vector3(),
      cd: ESA.stompPeriod * 0.55,
      bob: rnd(0, TAU),
      flare: 0
    });

    player.crouch = 1;
    camShake = Math.max(camShake, 0.25);
    showTitle('earth-stomp-agent', false);
  }

  function agentStomp(a, x, z) {
    // ground fracture, held on the floor then faded, as in the clip
    addDecal(TEX.crack, x, z, ESA.radius * 2.1, ESA.radius * 2.1, rnd(0, TAU), 0.82, 1.7, 1.4);
    addRing(x, z, 0.4, ESA.radius * 1.35, 0.42, 0xd8c49a, 0.72);
    addRing(x, z, 0.2, ESA.radius * 0.85, 0.28, 0xffffff, 0.42);
    addSpark(x, 0.5, z, 3.4, 0.26);

    for (var i = 0; i < 16; i++) {
      var ang = rnd(0, TAU), sp = rnd(2.5, 8);
      addDebris(x, 0.25, z, Math.cos(ang) * sp, rnd(3.5, 8.5), Math.sin(ang) * sp,
        rnd(0.55, 1.25), rnd(0.6, 1.0));
    }

    var r2 = ESA.radius * ESA.radius;
    for (var k = 0; k < dummies.length; k++) {
      var d = dummies[k];
      if (!d.alive) continue;
      var dx = d.pos.x - x, dz = d.pos.y - z;
      if (dx * dx + dz * dz <= r2) hurtDummy(d, ESA.damage, x, z, ESA.knock);
    }

    camShake = Math.max(camShake, 0.85);
    hitstop = Math.max(hitstop, 0.055);
  }

  function updateAgents(dt) {
    for (var i = agents.length - 1; i >= 0; i--) {
      var a = agents[i];
      a.age += dt;
      a.st += dt;
      a.bob += dt * 4.4;

      if (a.mesh.scale.x < 1) a.mesh.scale.setScalar(Math.min(1, a.mesh.scale.x + dt * 6));

      if (a.age >= a.life) {
        for (var q = 0; q < 10; q++) {
          var ang = rnd(0, TAU);
          addDebris(a.pos.x, a.pos.y, a.pos.z,
            Math.cos(ang) * rnd(1, 4), rnd(1, 4), Math.sin(ang) * rnd(1, 4),
            rnd(0.4, 0.9), rnd(0.5, 0.9));
        }
        addRing(a.pos.x, a.pos.z, 0.2, 1.6, 0.3, 0xa8c22e, 0.5);
        scene.remove(a.mesh); scene.remove(a.shadow); scene.remove(a.bar);
        agents.splice(i, 1);
        continue;
      }

      if (a.state === 'idle') {
        // loosely trail the caster, leash back if left too far behind
        var toPx = player.pos.x - a.pos.x, toPz = player.pos.z - a.pos.z;
        var dist = Math.hypot(toPx, toPz);
        if (dist > ESA.leash) {
          a.pos.x = player.pos.x - toPx / dist * 2;
          a.pos.z = player.pos.z - toPz / dist * 2;
          addSpark(a.pos.x, 0.9, a.pos.z, 1.8, 0.2);
        } else if (dist > ESA.follow) {
          a.pos.x += (toPx / dist) * 5.2 * dt;
          a.pos.z += (toPz / dist) * 5.2 * dt;
        }
        a.pos.y = damp(a.pos.y, 0.8 + Math.sin(a.bob) * 0.11, 8, dt);
        a.flare = damp(a.flare, 0, 8, dt);

        a.cd -= dt;
        if (a.cd <= 0) {
          var t = nearestDummy(a.pos.x, a.pos.z, ESA.seek);
          if (t) {
            a.target = t;
            a.state = 'windup'; a.st = 0;
          } else {
            a.cd = 0.25;
          }
        }
      } else if (a.state === 'windup') {
        a.pos.y = damp(a.pos.y, 0.42, 16, dt);
        a.flare = damp(a.flare, 0.25, 12, dt);
        if (a.st >= ESA.windup) {
          a.state = 'rise'; a.st = 0;
          a.from.set(a.pos.x, a.pos.y, a.pos.z);
          a.to.set(a.target.pos.x, 0, a.target.pos.y);
        }
      } else if (a.state === 'rise') {
        var k = Math.min(1, a.st / ESA.leapUp);
        // track a moving target through the leap
        if (a.target && a.target.alive) a.to.set(a.target.pos.x, 0, a.target.pos.y);
        a.pos.x = lerp(a.from.x, a.to.x, ease(k));
        a.pos.z = lerp(a.from.z, a.to.z, ease(k));
        a.pos.y = lerp(a.from.y, 4.6, Math.sin(k * Math.PI * 0.5));
        a.flare = damp(a.flare, 1, 14, dt);
        if (k >= 1) { a.state = 'slam'; a.st = 0; a.from.copy(a.pos); }
      } else if (a.state === 'slam') {
        var k2 = Math.min(1, a.st / ESA.leapDown);
        if (a.target && a.target.alive) a.to.set(a.target.pos.x, 0, a.target.pos.y);
        a.pos.x = lerp(a.from.x, a.to.x, k2);
        a.pos.z = lerp(a.from.z, a.to.z, k2);
        a.pos.y = lerp(a.from.y, 0.34, k2 * k2);
        if (k2 >= 1) {
          agentStomp(a, a.pos.x, a.pos.z);
          a.state = 'recover'; a.st = 0;
          a.cd = ESA.stompPeriod;
        }
      } else if (a.state === 'recover') {
        a.pos.y = damp(a.pos.y, 0.8, 9, dt);
        a.flare = damp(a.flare, 0, 10, dt);
        if (a.st > 0.22) { a.state = 'idle'; a.st = 0; }
      }

      a.pos.x = clamp(a.pos.x, -ARENA + 1, ARENA - 1);
      a.pos.z = clamp(a.pos.z, -ARENA + 1, ARENA - 1);

      a.mesh.position.copy(a.pos);
      var ring = a.mesh.userData.ring;
      ring.scale.setScalar(1 + a.flare * 0.85);
      ring.rotation.y += (2.2 + a.flare * 22) * dt;
      for (var s = 0; s < ring.children.length; s++) ring.children[s].rotation.y += dt * (1 + a.flare * 8);
      a.mesh.userData.glow.lookAt(camera.position);
      a.mesh.userData.glow.material.opacity = 0.28 + a.flare * 0.4;
      a.mesh.rotation.y += dt * 1.1;

      var h = clamp(a.pos.y / 5, 0, 1);
      a.shadow.position.set(a.pos.x, 0.03, a.pos.z);
      a.shadow.scale.setScalar(1.0 * (1 - h * 0.55));
      a.shadow.material.opacity = 0.85 * (1 - h * 0.6);

      a.bar.position.set(a.pos.x, 0, a.pos.z + 0.62);
      setBar(a.bar, 1 - a.age / a.life);
      a.bar.visible = a.pos.y < 1.6;
    }
  }

  /* ===================================================================
     9. arcana registry + HUD title card
     =================================================================== */

  var ICONS = {
    'rock-n-roll':
      '<svg viewBox="0 0 32 32"><g fill="none" stroke="#c99b57" stroke-width="2.6" stroke-linejoin="round">' +
      '<path d="M16 4 19 8 24 7 24 12 28 15 24 18 24 23 19 22 16 26 13 22 8 23 8 18 4 15 8 12 8 7 13 8Z"/></g>' +
      '<circle cx="16" cy="15" r="4.6" fill="#8a6738"/></svg>',
    'earth-stomp-agent':
      '<svg viewBox="0 0 32 32"><g stroke="#c99b57" stroke-width="2.4" stroke-linecap="round">' +
      '<path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l3.5 3.5M21.5 21.5 25 25M25 7l-3.5 3.5M10.5 21.5 7 25"/></g>' +
      '<circle cx="16" cy="16" r="6" fill="#9dbe27"/><circle cx="16" cy="16" r="3" fill="#d8ef6a"/></svg>'
  };

  var ARCANA = {
    'rock-n-roll': { name: "Rock N'<b> Roll</b>", label: "Rock N' Roll" },
    'earth-stomp-agent': { name: 'Earth <b>Stomp</b><br>Agent', label: 'Earth Stomp Agent' }
  };

  var tcEl = document.getElementById('titlecard');
  var tcName = document.getElementById('tc-name');
  var tcCard = document.getElementById('tc-card');
  var titleT = 0;

  function showTitle(id, charged) {
    tcName.innerHTML = ARCANA[id].name;
    tcCard.innerHTML = ICONS[id];
    tcEl.classList.add('on');
    tcEl.classList.toggle('chg', !!charged);
    titleT = 2.6;
  }

  document.querySelector('#ab-rock .ico').innerHTML = ICONS['rock-n-roll'];
  document.querySelector('#ab-agent .ico').innerHTML = ICONS['earth-stomp-agent'];

  /* ===================================================================
     10. input — touch first, gamepad and keyboard as fallbacks
     =================================================================== */

  var move = new T.Vector2();
  var cd = { rock: 0, rockMax: 1, agent: 0 };
  var charge = { active: false, t: 0 };

  function startCooldown(which, seconds) {
    if (which === 'rock') { cd.rock = seconds; cd.rockMax = seconds; }
    else cd.agent = seconds;
  }

  var stickEl = document.getElementById('stick');
  var stickKnob = stickEl.firstElementChild;
  var stickId = null, stickOx = 0, stickOy = 0;
  var STICK_R = 46;

  function stickStart(e) {
    if (stickId !== null) return;
    cancelShowcase();
    stickId = e.pointerId;
    stickOx = e.clientX; stickOy = e.clientY;
    stickEl.style.left = stickOx + 'px';
    stickEl.style.top = stickOy + 'px';
    stickEl.classList.add('on');
    move.set(0, 0);
  }
  function stickMove(e) {
    if (e.pointerId !== stickId) return;
    var dx = e.clientX - stickOx, dy = e.clientY - stickOy;
    var len = Math.hypot(dx, dy);
    var cl = Math.min(len, STICK_R);
    var nx = len ? dx / len : 0, ny = len ? dy / len : 0;
    stickKnob.style.transform = 'translate(' + (nx * cl) + 'px,' + (ny * cl) + 'px)';
    var mag = clamp(len / STICK_R, 0, 1);
    move.set(nx * mag, ny * mag);
  }
  function stickEnd(e) {
    if (e.pointerId !== stickId) return;
    stickId = null;
    stickEl.classList.remove('on');
    stickKnob.style.transform = '';
    move.set(0, 0);
  }

  window.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('#pad,#rail,#info')) return;
    if (e.clientX > window.innerWidth * 0.58 && window.innerWidth > window.innerHeight) return;
    stickStart(e);
  }, { passive: true });
  window.addEventListener('pointermove', stickMove, { passive: true });
  window.addEventListener('pointerup', stickEnd, { passive: true });
  window.addEventListener('pointercancel', stickEnd, { passive: true });

  var abRock = document.getElementById('ab-rock');
  var abAgent = document.getElementById('ab-agent');

  function tryAgent() {
    cancelShowcase();
    if (cd.agent > 0) return;
    startCooldown('agent', ESA.cooldown);
    castEarthStompAgent();
  }

  // Winding up is always allowed; the cooldown is only checked on release, so
  // a player can charge through the tail of the previous cast.
  function beginCharge() {
    cancelShowcase();
    charge.active = true;
    charge.t = 0;
    abRock.classList.add('charging');
  }
  function releaseCharge() {
    if (!charge.active) return;
    var charged = charge.t >= RNR.chargeTime;
    charge.active = false;
    abRock.classList.remove('charging', 'ready');
    abRock.style.setProperty('--c', '0turn');
    if (cd.rock > 0) return;
    castRockNRoll(charged);
    startCooldown('rock', charged ? RNR.charged.cooldown : RNR.base.cooldown);
  }

  function bindButton(el, down, up) {
    var id = null;
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture && el.setPointerCapture(id);
      el.classList.add('held');
      down();
    });
    function end(e) {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove('held');
      up && up();
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  bindButton(abRock, beginCharge, releaseCharge);
  bindButton(abAgent, tryAgent, null);

  var keys = {};
  window.addEventListener('keydown', function (e) {
    if (keys[e.code]) return;
    keys[e.code] = true;
    if (e.code === 'KeyJ') beginCharge();
    if (e.code === 'KeyK') tryAgent();
  });
  window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
    if (e.code === 'KeyJ') releaseCharge();
  });

  function keyAxis() {
    var x = 0, y = 0;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyW || keys.ArrowUp) y -= 1;
    if (keys.KeyS || keys.ArrowDown) y += 1;
    var l = Math.hypot(x, y);
    return l ? { x: x / l, y: y / l } : null;
  }

  var padPrev = {};
  function pollGamepad() {
    if (!navigator.getGamepads) return null;
    var pads = navigator.getGamepads();
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p) continue;
      var ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) < 0.18) { ax = 0; ay = 0; }
      var sq = p.buttons[2] && p.buttons[2].pressed;   // square / X
      var tr = p.buttons[3] && p.buttons[3].pressed;   // triangle / Y
      if (sq && !padPrev.sq) beginCharge();
      if (!sq && padPrev.sq) releaseCharge();
      if (tr && !padPrev.tr) tryAgent();
      padPrev.sq = sq; padPrev.tr = tr;
      return { x: ax, y: ay };
    }
    return null;
  }

  /* ===================================================================
     11. showcase sequencer — replays the source clip's cast order
     =================================================================== */

  var showcase = null;
  var SHOWCASE = [
    // t, action — mirrors 12:05-12:17 then 12:41-12:53
    [0.10, 'reset'],
    [0.45, 'base'],
    [1.85, 'base'],
    [3.25, 'base'],
    [4.80, 'chargeStart'],
    [6.20, 'chargeFire'],
    [8.10, 'chargeStart'],
    [9.50, 'chargeFire'],
    [11.60, 'agent'],
    [23.00, 'end']
  ];

  var showBtn = document.getElementById('btn-show');

  function runShowcase() {
    showcase = { t: 0, i: 0 };
    showBtn.classList.add('on');
  }

  /* Any real input hands control straight back to the player. */
  function cancelShowcase() {
    if (!showcase) return;
    showcase = null;
    showBtn.classList.remove('on');
  }

  function updateShowcase(dt) {
    if (!showcase) return;
    showcase.t += dt;
    while (showcase.i < SHOWCASE.length && showcase.t >= SHOWCASE[showcase.i][0]) {
      var act = SHOWCASE[showcase.i][1];
      showcase.i++;
      if (act === 'reset') {
        player.pos.set(0, 0, 6.5);
        player.facing = Math.PI;
        cd.rock = 0; cd.agent = 0;
      } else if (act === 'base') {
        castRockNRoll(false);
        startCooldown('rock', RNR.base.cooldown);
      } else if (act === 'chargeStart') {
        charge.active = true; charge.t = 0;
        abRock.classList.add('charging');
      } else if (act === 'chargeFire') {
        charge.active = false; charge.t = 0;
        abRock.classList.remove('charging', 'ready');
        castRockNRoll(true);
        startCooldown('rock', RNR.charged.cooldown);
      } else if (act === 'agent') {
        startCooldown('agent', ESA.cooldown);
        castEarthStompAgent();
      } else if (act === 'end') {
        showcase = null;
        document.getElementById('btn-show').classList.remove('on');
        return;
      }
    }
  }

  showBtn.addEventListener('click', function () {
    if (showcase) cancelShowcase(); else runShowcase();
  });

  /* ===================================================================
     12. chrome
     =================================================================== */

  document.getElementById('btn-full').addEventListener('click', function () {
    var el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    }
  });

  var infoEl = document.getElementById('info');
  document.getElementById('btn-info').addEventListener('click', function () { infoEl.classList.add('on'); });
  document.getElementById('btn-info-close').addEventListener('click', function () { infoEl.classList.remove('on'); });

  var fpsEl = document.getElementById('fps');
  var fpsAcc = 0, fpsN = 0, fpsT = 0;
  var rockCdn = abRock.querySelector('.cdn');
  var agentCdn = abAgent.querySelector('.cdn');

  function updateButtons(dt) {
    if (cd.rock > 0) {
      cd.rock = Math.max(0, cd.rock - dt);
      abRock.classList.add('cool');
      abRock.style.setProperty('--p', (cd.rock / cd.rockMax) + 'turn');
      rockCdn.textContent = cd.rock > 0.15 ? cd.rock.toFixed(1) : '';
    } else {
      abRock.classList.remove('cool');
    }
    if (cd.agent > 0) {
      cd.agent = Math.max(0, cd.agent - dt);
      abAgent.classList.add('cool');
      abAgent.style.setProperty('--p', (cd.agent / ESA.cooldown) + 'turn');
      agentCdn.textContent = Math.ceil(cd.agent);
    } else {
      abAgent.classList.remove('cool');
    }

    if (charge.active) {
      charge.t += dt;
      var f = clamp(charge.t / RNR.chargeTime, 0, 1);
      abRock.style.setProperty('--c', f + 'turn');
      abRock.classList.toggle('ready', f >= 1);
    }
  }

  /* ===================================================================
     13. main loop
     =================================================================== */

  var clock = new T.Clock();
  var now = 0;
  var hitstop = 0;

  function frame() {
    requestAnimationFrame(frame);

    // realDt is wall-clock; raw is the clamped step the simulation advances by,
    // so a slow device slows the world down rather than tunnelling through it.
    // UI timers (cooldowns, charge, FPS) stay on wall-clock either way.
    var realDt = clock.getDelta();
    var raw = Math.min(realDt, 1 / 20);
    var dt = raw;
    if (hitstop > 0) {
      hitstop -= raw;
      dt = raw * 0.08;
    }
    now += dt;

    // ---- input ----
    var pad = pollGamepad();
    var kb = keyAxis();
    var mx = move.x, my = move.y;
    if (!mx && !my && pad) { mx = pad.x; my = pad.y; }
    if (!mx && !my && kb) { mx = kb.x; my = kb.y; }

    updateShowcase(dt);
    if (showcase) { mx = 0; my = 0; }

    // ---- caster ----
    var speed = player.speed * (charge.active ? 0.34 : 1);
    var tx = mx * speed, tz = my * speed;
    player.vel.x = damp(player.vel.x, tx, 16, dt);
    player.vel.z = damp(player.vel.z, tz, 16, dt);
    player.pos.x = clamp(player.pos.x + player.vel.x * dt, -ARENA + 1.2, ARENA - 1.2);
    player.pos.z = clamp(player.pos.z + player.vel.z * dt, -ARENA + 1.2, ARENA - 1.2);
    if (Math.hypot(mx, my) > 0.15) player.facing = Math.atan2(mx, my);

    player.group.position.copy(player.pos);
    var turn = ((player.facing - player.group.rotation.y + Math.PI * 3) % TAU) - Math.PI;
    player.group.rotation.y += turn * (1 - Math.exp(-18 * dt));
    player.crouch = damp(player.crouch, 0, 9, dt);
    player.group.scale.set(1 + player.crouch * 0.14, 1 - player.crouch * 0.2, 1 + player.crouch * 0.14);
    player.group.position.y = Math.abs(Math.sin(now * 9)) * Math.min(0.06, Math.hypot(player.vel.x, player.vel.z) * 0.012);

    updateChargeRig(now, charge.active ? clamp(charge.t / RNR.chargeTime, 0, 1) : 0);

    // ---- systems ----
    updateSaws(dt, now);
    updateAgents(dt);
    updateDummies(dt);
    updateDecals(dt);
    updateSparks(dt);
    updateNumbers(dt);
    updateDebris(dt);
    updateRings(dt);
    updateButtons(realDt);

    if (titleT > 0) {
      titleT -= realDt;
      if (titleT <= 0) tcEl.classList.remove('on', 'chg');
    }

    // ---- camera ----
    var lead = 3.4;
    camTarget.set(
      player.pos.x + Math.sin(player.facing) * lead,
      0,
      player.pos.z + Math.cos(player.facing) * lead
    );
    // keep the arena walls from sliding into frame
    camTarget.x = clamp(camTarget.x, -ARENA + 8, ARENA - 8);
    camTarget.z = clamp(camTarget.z, -ARENA + 14, ARENA - 14);
    var cx = damp(camera.position.x, camTarget.x, 4.5, dt);
    var cz = damp(camera.position.z, camTarget.z + CAM_BACK, 4.5, dt);
    camShake = Math.max(0, camShake - dt * 3.4);
    var sh = camShake * camShake * 0.75;
    camera.position.set(cx + rnd(-sh, sh), CAM_H + rnd(-sh, sh) * 0.5, cz + rnd(-sh, sh));
    camera.lookAt(cx, 0, cz - CAM_BACK);

    renderer.render(scene, camera);

    fpsAcc += realDt; fpsN++;
    if (fpsAcc - fpsT > 0.5) {
      fpsEl.textContent = Math.round(fpsN / (fpsAcc - fpsT));
      fpsT = fpsAcc; fpsN = 0;
    }
  }

  /* ===================================================================
     14. boot
     =================================================================== */

  resize();
  camera.position.set(player.pos.x, CAM_H, player.pos.z + CAM_BACK);
  camera.lookAt(player.pos.x, 0, player.pos.z);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);

  var boot = document.getElementById('boot');
  setTimeout(function () { boot.classList.add('gone'); }, 200);
  setTimeout(function () { boot.style.display = 'none'; }, 800);

  clock.getDelta();
  frame();

  // A first taste of each arcana so the demo reads immediately on open.
  setTimeout(function () { if (!showcase) runShowcase(); }, 900);
})();
