/* ============================================================================
   Wizard of Legend — Air Arcana phone demo
   Storm Draft (#68, Signature) and Whirling Wind Agent (#75, Standard)

   Behaviour is reconstructed frame-by-frame from the archived showcase encode
   media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4
     Storm Draft ............ 485s-490s base, 490s-496s charged signature
     Whirling Wind Agent .... 552s-563s
   cross-checked against archive/wizard-of-legend/source-notes/gate2-online-reference.md
   ========================================================================== */
(function () {
  "use strict";

  var T = window.THREE;

  /* ==========================================================================
     0. SPEC — every tunable traced to the video or the archived notes
     ====================================================================== */

  var SPEC = {
    stormDraft: {
      name: "Storm Draft", order: 68, element: "Air", type: "Signature",
      subtypes: "Projectile",
      damage: 20,            // wiki: "Damage: 20, 30"  / video: white 20 popups
      wallDamage: 30,        // wiki: additional 30 when pushed into a wall
      wallStun: 1.35,
      knockback: 10,         // wiki: "Knockback: 0, -10"
      charges: 2,            // wiki: passively builds up to a maximum of 2
      cooldown: 4.5,         // wiki: 4.5s per charge
      spawnGap: 1.7,         // video: drafts appear ~1 tile ahead (point-blank blind spot)
      speed: 9.6,
      life: 1.30,            // -> ~12.5 unit reach
      halfWidth: 1.35,
      chargeTime: 0.62,      // hold before the signature is ready
      volleys: 4,            // wiki: "Release 4 volleys made up of 7 drafts each"
      perVolley: 7,
      volleyGap: 0.21,
      rankSpacing: 1.6
    },
    windAgent: {
      name: "Whirling Wind Agent", order: 75, element: "Air", type: "Standard",
      subtypes: "Melee, summon",
      count: 2,              // wiki: "Conjure 2 agents that charge through enemies"
      damage: 5,             // video popups read 5 (wiki lists 7 — see info sheet)
      knockback: 10,
      duration: 10,          // wiki: agents remain active for 10 seconds
      cooldown: 15,
      chargeEvery: 1.0,      // wiki: charges performed about once a second
      chargeSpeed: 15,
      chargeOvershoot: 3.0,
      seekRange: 11,
      followSpeed: 4.6,
      leashRange: 12,        // wiki: teleport back if the player strays too far
      health: 3
    },
    // a portrait-proportioned cell of the showcase room: walls stay close enough
    // on both axes that a push always has somewhere to slam into
    arena: { hw: 4.9, hd: 10.8, wallH: 1.5 },
    player: { speed: 5.4, accel: 42, radius: 0.42 },
    enemy: { radius: 0.52, friction: 5.2, wallSlamMin: 4.2 }
  };

  var A = SPEC.arena;

  /* ==========================================================================
     1. RENDERER / SCENE / CAMERA
     ====================================================================== */

  var canvas = document.getElementById("c");
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new T.Scene();
  scene.background = new T.Color(0x0b0d10);

  var camera = new T.PerspectiveCamera(42, 1, 0.5, 200);
  var camTarget = new T.Vector3(0, 0, 0.6);

  scene.add(new T.AmbientLight(0xb9c6d8, 1.05));
  var key = new T.DirectionalLight(0xfff3dd, 1.15);
  key.position.set(-6, 14, 6);
  scene.add(key);
  var rim = new T.DirectionalLight(0x6f8cff, 0.35);
  rim.position.set(7, 6, -8);
  scene.add(rim);

  var TILT = 29 * Math.PI / 180;
  var camYaw = 0;
  var camRight = new T.Vector3(1, 0, 0);
  var camFwd = new T.Vector3(0, 0, -1);

  function fitCamera() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    var aspect = w / h;
    camera.aspect = aspect;

    // in landscape the room is viewed along its short axis so the long axis
    // still runs across the screen
    camYaw = aspect > 1.02 ? Math.PI / 2 : 0;

    var acrossHalf = (camYaw ? A.hd : A.hw) + 1.3;   // maps to screen width
    var downHalf = (camYaw ? A.hw : A.hd) + 1.3;     // maps to screen height
    var tanV = Math.tan((camera.fov * Math.PI / 180) / 2);
    var dW = acrossHalf / (tanV * aspect);
    var dD = (downHalf * Math.cos(TILT)) / tanV;
    var dist = Math.max(dW, dD) * 1.03;

    camera.position.set(
      camTarget.x + Math.sin(TILT) * Math.sin(camYaw) * dist,
      camTarget.y + Math.cos(TILT) * dist,
      camTarget.z + Math.sin(TILT) * Math.cos(camYaw) * dist
    );
    camera.lookAt(camTarget);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    camRight.set(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();
    camFwd.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
  }

  // screen-space stick input -> world direction on the ground plane
  var _dirTmp = new T.Vector2();
  function screenToWorldDir(dx, dy) {
    _dirTmp.set(
      camRight.x * dx - camFwd.x * dy,
      camRight.z * dx - camFwd.z * dy
    );
    return _dirTmp;
  }

  /* ==========================================================================
     2. PROCEDURAL TEXTURES
     ====================================================================== */

  function makeCanvas(size) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = size;
    return cv;
  }

  function tex(cv, repeat) {
    var t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (repeat) t.repeat.set(repeat, repeat);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  function stoneTexture(size, base, grout, tileW, tileH, mossy) {
    var cv = makeCanvas(size), g = cv.getContext("2d");
    g.fillStyle = grout;
    g.fillRect(0, 0, size, size);
    var rows = size / tileH, cols = size / tileW;
    for (var r = 0; r < rows; r++) {
      var off = (r % 2) * (tileW / 2);
      for (var c = -1; c < cols + 1; c++) {
        var x = c * tileW + off + 1.5, y = r * tileH + 1.5;
        var v = (Math.random() - 0.5) * 22;
        g.fillStyle = shade(base, v);
        roundRect(g, x, y, tileW - 3, tileH - 3, 3);
        g.fill();
        // subtle top highlight on each block
        g.fillStyle = "rgba(255,255,255,0.045)";
        roundRect(g, x, y, tileW - 3, (tileH - 3) * 0.42, 3);
        g.fill();
      }
    }
    // cracks + grit
    g.strokeStyle = "rgba(0,0,0,0.30)";
    for (var i = 0; i < size / 6; i++) {
      g.lineWidth = Math.random() * 1.2 + 0.3;
      g.beginPath();
      var sx = Math.random() * size, sy = Math.random() * size;
      g.moveTo(sx, sy);
      for (var s = 0; s < 3; s++) {
        sx += (Math.random() - 0.5) * 18; sy += (Math.random() - 0.5) * 18;
        g.lineTo(sx, sy);
      }
      g.stroke();
    }
    for (var k = 0; k < size * 1.6; k++) {
      g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.10)";
      g.fillRect(Math.random() * size, Math.random() * size, 1.4, 1.4);
    }
    if (mossy) {
      for (var m = 0; m < size / 10; m++) {
        g.fillStyle = "rgba(96,124,72,0.18)";
        g.beginPath();
        g.arc(Math.random() * size, Math.random() * size, Math.random() * 5 + 1.5, 0, 7);
        g.fill();
      }
    }
    return cv;
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

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt));
    var gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return "rgb(" + (r | 0) + "," + (gg | 0) + "," + (b | 0) + ")";
  }

  function softCircle(size, inner) {
    var cv = makeCanvas(size), g = cv.getContext("2d");
    var grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, "rgba(255,255,255," + (inner || 1) + ")");
    grd.addColorStop(0.42, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return cv;
  }

  var floorTex = tex(stoneTexture(512, "#6d7276", "#2e3235", 64, 48, true));
  // ~1 world unit per floor block, matching the source tiling against the caster
  floorTex.repeat.set((A.hw * 2) / 8, (A.hd * 2) / 10.67);
  var wallTex = tex(stoneTexture(256, "#4a4f55", "#22262a", 64, 32, false), 4);
  var wallTopTex = tex(stoneTexture(256, "#5b6167", "#282c30", 42, 42, true), 3);
  var puffTex = tex(softCircle(128, 1));
  var shadowTex = tex(softCircle(128, 0.85));

  /* ==========================================================================
     3. ARENA
     ====================================================================== */

  var floor = new T.Mesh(
    new T.PlaneGeometry(A.hw * 2, A.hd * 2),
    new T.MeshLambertMaterial({ map: floorTex })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  var wallSideMat = new T.MeshLambertMaterial({ map: wallTex });
  var wallTopMat = new T.MeshLambertMaterial({ map: wallTopTex });
  var wallMats = [wallSideMat, wallSideMat, wallTopMat, wallSideMat, wallSideMat, wallSideMat];

  function wall(w, d, x, z) {
    var m = new T.Mesh(new T.BoxGeometry(w, A.wallH, d), wallMats);
    m.position.set(x, A.wallH / 2, z);
    scene.add(m);
  }
  var TH = 1.1;
  wall(A.hw * 2 + TH * 2, TH, 0, -A.hd - TH / 2);
  wall(A.hw * 2 + TH * 2, TH, 0, A.hd + TH / 2);
  wall(TH, A.hd * 2, -A.hw - TH / 2, 0);
  wall(TH, A.hd * 2, A.hw + TH / 2, 0);

  // dark outside apron so the arena reads as a lit room
  var apron = new T.Mesh(
    new T.PlaneGeometry(90, 90),
    new T.MeshBasicMaterial({ color: 0x07080a })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.05;
  scene.add(apron);

  /* ==========================================================================
     4. SHARED VFX POOLS
     ====================================================================== */

  // -- crescent field: the pale "C" wisps that make up every draft and agent --
  var crescentGeo = new T.TorusGeometry(0.34, 0.062, 5, 18, Math.PI * 1.45);
  crescentGeo.rotateX(-Math.PI / 2);
  var CRESCENT_MAX = 900;
  var crescents = new T.InstancedMesh(
    crescentGeo,
    new T.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.66,
      blending: T.AdditiveBlending, depthWrite: false
    }),
    CRESCENT_MAX
  );
  crescents.instanceMatrix.setUsage(T.DynamicDrawUsage);
  crescents.setColorAt(0, new T.Color(1, 1, 1));
  crescents.frustumCulled = false;
  scene.add(crescents);

  var _cDummy = new T.Object3D();
  var _cColor = new T.Color();
  var crescentCount = 0;

  function beginCrescents() { crescentCount = 0; }
  function pushCrescent(x, y, z, spin, tiltA, scale, alpha, tint) {
    if (crescentCount >= CRESCENT_MAX) return;
    _cDummy.position.set(x, y, z);
    _cDummy.rotation.set(tiltA * 0.35, spin, tiltA);
    _cDummy.scale.setScalar(scale);
    _cDummy.updateMatrix();
    crescents.setMatrixAt(crescentCount, _cDummy.matrix);
    if (tint) _cColor.setRGB(tint[0] * alpha, tint[1] * alpha, tint[2] * alpha);
    else _cColor.setRGB(alpha, alpha * 1.0, alpha * 1.0);
    crescents.setColorAt(crescentCount, _cColor);
    crescentCount++;
  }
  function endCrescents() {
    crescents.count = crescentCount;
    crescents.instanceMatrix.needsUpdate = true;
    if (crescents.instanceColor) crescents.instanceColor.needsUpdate = true;
  }

  // -- additive sprite pool: puffs, glows, ground decals --
  var SPRITE_MAX = 220;
  var spritePool = [];
  var spriteMatBase = new T.SpriteMaterial({
    map: puffTex, transparent: true, blending: T.AdditiveBlending,
    depthWrite: false, depthTest: true
  });
  for (var si = 0; si < SPRITE_MAX; si++) {
    var sp = new T.Sprite(spriteMatBase.clone());
    sp.visible = false;
    scene.add(sp);
    spritePool.push(sp);
  }
  var spriteCursor = 0;
  var liveSprites = [];

  function spawnSprite(x, y, z, size, color, life, grow, opacity) {
    var s = spritePool[spriteCursor];
    spriteCursor = (spriteCursor + 1) % SPRITE_MAX;
    s.visible = true;
    s.position.set(x, y, z);
    s.scale.setScalar(size);
    s.material.color.set(color);
    s.material.opacity = opacity == null ? 1 : opacity;
    s.userData = { age: 0, life: life, size0: size, grow: grow || 0, op0: s.material.opacity };
    if (liveSprites.indexOf(s) < 0) liveSprites.push(s);
    return s;
  }

  function updateSprites(dt) {
    for (var i = liveSprites.length - 1; i >= 0; i--) {
      var s = liveSprites[i], u = s.userData;
      u.age += dt;
      var k = u.age / u.life;
      if (k >= 1) {
        s.visible = false;
        liveSprites.splice(i, 1);
        continue;
      }
      s.scale.setScalar(u.size0 * (1 + u.grow * k));
      s.material.opacity = u.op0 * (1 - k) * (1 - k);
    }
  }

  // -- flat ground quads: charge spikes, ground glow rings --
  var quadGeo = new T.PlaneGeometry(1, 1);
  quadGeo.rotateX(-Math.PI / 2);
  var QUAD_MAX = 120;
  var quadPool = [], quadCursor = 0, liveQuads = [];
  for (var qi = 0; qi < QUAD_MAX; qi++) {
    var q = new T.Mesh(quadGeo, new T.MeshBasicMaterial({
      color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false
    }));
    q.visible = false;
    scene.add(q);
    quadPool.push(q);
  }
  function spawnQuad(x, z, w, l, rot, color, life, opacity, growL) {
    var q = quadPool[quadCursor];
    quadCursor = (quadCursor + 1) % QUAD_MAX;
    q.visible = true;
    q.position.set(x, 0.07, z);
    q.rotation.y = rot;
    q.scale.set(w, 1, l);
    q.material.color.set(color);
    q.material.opacity = opacity;
    q.userData = { age: 0, life: life, w: w, l: l, op0: opacity, growL: growL || 0 };
    if (liveQuads.indexOf(q) < 0) liveQuads.push(q);
    return q;
  }
  function updateQuads(dt) {
    for (var i = liveQuads.length - 1; i >= 0; i--) {
      var q = liveQuads[i], u = q.userData;
      u.age += dt;
      var k = u.age / u.life;
      if (k >= 1) { q.visible = false; liveQuads.splice(i, 1); continue; }
      q.scale.set(u.w, 1, u.l * (1 + u.growL * k));
      q.material.opacity = u.op0 * (1 - k);
    }
  }

  // -- soft ground decals (wall slam glow) --
  var DECAL_MAX = 20;
  var decalPool = [], decalCursor = 0, liveDecals = [];
  for (var di = 0; di < DECAL_MAX; di++) {
    var dm = new T.Mesh(quadGeo, new T.MeshBasicMaterial({
      map: puffTex, color: 0xffffff, transparent: true,
      blending: T.AdditiveBlending, depthWrite: false
    }));
    dm.visible = false;
    dm.position.y = 0.05;
    scene.add(dm);
    decalPool.push(dm);
  }
  function spawnDecal(x, z, size, color, life, opacity, grow) {
    var d = decalPool[decalCursor];
    decalCursor = (decalCursor + 1) % DECAL_MAX;
    d.visible = true;
    d.position.set(x, 0.05, z);
    d.scale.set(size, 1, size);
    d.material.color.set(color);
    d.material.opacity = opacity;
    d.userData = { age: 0, life: life, size: size, op0: opacity, grow: grow || 0 };
    if (liveDecals.indexOf(d) < 0) liveDecals.push(d);
  }
  function updateDecals(dt) {
    for (var i = liveDecals.length - 1; i >= 0; i--) {
      var d = liveDecals[i], u = d.userData;
      u.age += dt;
      var k = u.age / u.life;
      if (k >= 1) { d.visible = false; liveDecals.splice(i, 1); continue; }
      var s = u.size * (1 + u.grow * k);
      d.scale.set(s, 1, s);
      d.material.opacity = u.op0 * (1 - k);
    }
  }

  // -- expanding rings (wall slam shockwave) --
  var ringGeo = new T.TorusGeometry(1, 0.07, 6, 40);
  ringGeo.rotateX(-Math.PI / 2);
  var RING_MAX = 24;
  var ringPool = [], ringCursor = 0, liveRings = [];
  for (var ri = 0; ri < RING_MAX; ri++) {
    var rg = new T.Mesh(ringGeo, new T.MeshBasicMaterial({
      color: 0x6ff6ff, transparent: true, blending: T.AdditiveBlending, depthWrite: false
    }));
    rg.visible = false;
    scene.add(rg);
    ringPool.push(rg);
  }
  function spawnRing(x, z, r0, r1, life, color, thick) {
    var r = ringPool[ringCursor];
    ringCursor = (ringCursor + 1) % RING_MAX;
    r.visible = true;
    r.position.set(x, 0.18, z);
    r.material.color.set(color);
    r.material.opacity = 1;
    r.userData = { age: 0, life: life, r0: r0, r1: r1, thick: thick || 1 };
    if (liveRings.indexOf(r) < 0) liveRings.push(r);
  }
  function updateRings(dt) {
    for (var i = liveRings.length - 1; i >= 0; i--) {
      var r = liveRings[i], u = r.userData;
      u.age += dt;
      var k = u.age / u.life;
      if (k >= 1) { r.visible = false; liveRings.splice(i, 1); continue; }
      var rad = u.r0 + (u.r1 - u.r0) * (1 - Math.pow(1 - k, 2));
      r.scale.set(rad, u.thick * (1 - k * 0.5), rad);
      r.material.opacity = (1 - k) * 0.95;
    }
  }

  /* ==========================================================================
     5. CHARACTERS
     ====================================================================== */

  function blobShadow(size) {
    var m = new T.Mesh(
      new T.PlaneGeometry(size, size * 0.72),
      new T.MeshBasicMaterial({
        map: shadowTex, color: 0x000000, transparent: true,
        opacity: 0.42, depthWrite: false
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    return m;
  }

  // ---- player: the showcase wizard (tan cloak, maroon tunic) ----
  var player = {
    obj: new T.Group(),
    pos: new T.Vector3(0, 0, 4.8),
    vel: new T.Vector3(),
    face: new T.Vector2(1, 0),
    bob: 0
  };
  (function buildPlayer() {
    var g = player.obj;
    g.add(blobShadow(1.35));

    var body = new T.Group();
    body.position.y = 0.02;

    var legs = new T.Mesh(new T.BoxGeometry(0.42, 0.4, 0.3),
      new T.MeshLambertMaterial({ color: 0x2b2732 }));
    legs.position.y = 0.2;
    body.add(legs);

    var tunic = new T.Mesh(new T.CylinderGeometry(0.3, 0.36, 0.58, 10),
      new T.MeshLambertMaterial({ color: 0x93413c }));
    tunic.position.y = 0.68;
    body.add(tunic);

    var belt = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.09, 10),
      new T.MeshLambertMaterial({ color: 0x2b2732 }));
    belt.position.y = 0.44;
    body.add(belt);

    var cloak = new T.Mesh(new T.CylinderGeometry(0.30, 0.46, 0.78, 10, 1, true,
      Math.PI * 0.45, Math.PI * 1.1),
      new T.MeshLambertMaterial({ color: 0xd8b183, side: T.DoubleSide }));
    cloak.position.set(0, 0.66, -0.03);
    body.add(cloak);

    var shoulders = new T.Mesh(new T.BoxGeometry(0.62, 0.2, 0.34),
      new T.MeshLambertMaterial({ color: 0x9c4844 }));
    shoulders.position.y = 1.0;
    body.add(shoulders);

    var armMat = new T.MeshLambertMaterial({ color: 0xefcda6 });
    [-0.34, 0.34].forEach(function (sx) {
      var arm = new T.Mesh(new T.BoxGeometry(0.14, 0.32, 0.16), armMat);
      arm.position.set(sx, 0.86, 0.03);
      body.add(arm);
    });

    var head = new T.Mesh(new T.SphereGeometry(0.215, 14, 12),
      new T.MeshLambertMaterial({ color: 0xf0cda6 }));
    head.position.y = 1.22;
    body.add(head);

    var hair = new T.Mesh(new T.SphereGeometry(0.228, 14, 12, 0, 6.3, 0, 1.55),
      new T.MeshLambertMaterial({ color: 0xb9873f }));
    hair.position.y = 1.235;
    hair.rotation.x = -0.3;
    body.add(hair);

    player.body = body;
    g.add(body);
    g.scale.setScalar(1.16);
    scene.add(g);
  })();

  // ---- training dummies, exactly the props the showcase uses ----
  var woodMat = new T.MeshLambertMaterial({ color: 0xc79c62 });
  var woodMat2 = new T.MeshLambertMaterial({ color: 0xb2874f });
  var stoneMat = new T.MeshLambertMaterial({ color: 0x8d9296 });

  function makeDummy() {
    var g = new T.Group();
    g.add(blobShadow(1.5));

    var base = new T.Mesh(new T.CylinderGeometry(0.5, 0.58, 0.22, 12), stoneMat);
    base.position.y = 0.11;
    g.add(base);

    var pivot = new T.Group();
    pivot.position.y = 0.2;

    var post = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, 0.5, 8), woodMat2);
    post.position.y = 0.25;
    pivot.add(post);

    var torso = new T.Mesh(new T.BoxGeometry(0.46, 0.62, 0.34), woodMat);
    torso.position.y = 0.78;
    pivot.add(torso);

    var arms = new T.Mesh(new T.BoxGeometry(1.16, 0.2, 0.22), woodMat2);
    arms.position.y = 0.95;
    pivot.add(arms);

    var head = new T.Mesh(new T.BoxGeometry(0.34, 0.4, 0.3), woodMat);
    head.position.y = 1.3;
    pivot.add(head);

    g.userData.pivot = pivot;
    g.add(pivot);
    return g;
  }

  var enemies = [];
  // the showcase keeps a loose cluster of dummies on the far side of the room
  var LAYOUT = [
    [-1.4, -6.2], [1.6, -5.4], [-0.2, -4.0], [2.5, -3.0],
    [-2.6, -2.4], [0.9, -1.0], [-1.2, 0.2], [2.4, 0.8]
  ];

  function spawnDummies() {
    for (var k = 0; k < LAYOUT.length; k++) {
      var e = enemies[k];
      if (!e) {
        e = {
          obj: makeDummy(),
          pos: new T.Vector3(),
          vel: new T.Vector3(),
          carry: null, stun: 0, hitFlash: 0, lean: 0, leanV: 0
        };
        scene.add(e.obj);
        enemies.push(e);
      }
      e.pos.set(LAYOUT[k][0], 0, LAYOUT[k][1]);
      e.vel.set(0, 0, 0);
      e.carry = null;
      e.stun = 0; e.hitFlash = 0; e.lean = 0; e.leanV = 0;
      e.obj.position.copy(e.pos);
    }
  }
  spawnDummies();

  /* ==========================================================================
     6. DAMAGE NUMBERS (DOM overlay, styled after the source popups)
     ====================================================================== */

  var fxLayer = document.getElementById("fxlayer");
  var numPool = [], numLive = [];
  for (var ni = 0; ni < 42; ni++) {
    var d = document.createElement("div");
    d.className = "dmg";
    d.style.display = "none";
    fxLayer.appendChild(d);
    numPool.push(d);
  }
  var numCursor = 0;
  var _proj = new T.Vector3();

  function popNumber(x, y, z, value, kind) {
    var el = numPool[numCursor];
    numCursor = (numCursor + 1) % numPool.length;
    el.className = "dmg" + (kind ? " " + kind : "");
    el.textContent = value;
    el.style.display = "block";
    el.userData = {
      age: 0, life: kind === "slam" ? 1.05 : 0.78,
      wx: x, wy: y, wz: z,
      dx: (Math.random() - 0.5) * 26,
      rise: kind === "slam" ? 34 : 46
    };
    if (numLive.indexOf(el) < 0) numLive.push(el);
  }

  function updateNumbers(dt) {
    var w = window.innerWidth, h = window.innerHeight;
    for (var i = numLive.length - 1; i >= 0; i--) {
      var el = numLive[i], u = el.userData;
      u.age += dt;
      var k = u.age / u.life;
      if (k >= 1) { el.style.display = "none"; numLive.splice(i, 1); continue; }
      _proj.set(u.wx, u.wy, u.wz).project(camera);
      var sx = (_proj.x * 0.5 + 0.5) * w + u.dx * k;
      var sy = (-_proj.y * 0.5 + 0.5) * h - u.rise * Math.sqrt(k);
      var pop = k < 0.14 ? 0.6 + (k / 0.14) * 0.55 : 1.12 - 0.12 * ((k - 0.14) / 0.86);
      el.style.transform = "translate(-50%,-50%) translate(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px) scale(" + pop.toFixed(3) + ")";
      el.style.opacity = k > 0.72 ? String(1 - (k - 0.72) / 0.28) : "1";
    }
  }

  /* ==========================================================================
     7. COMBAT CORE — damage, knockback, wall slam
     ====================================================================== */

  var stats = { damage: 0, slams: 0 };

  function damageEnemy(e, amount, kind) {
    stats.damage += amount;
    e.hitFlash = 0.12;
    popNumber(e.pos.x, 1.72, e.pos.z, amount, kind || "");
    hudStats();
  }

  function knock(e, dx, dz, power) {
    var len = Math.hypot(dx, dz) || 1;
    e.vel.x = (dx / len) * power;
    e.vel.z = (dz / len) * power;
    e.carry = null;
  }

  // "If the draft pushes an enemy against a wall, the enemy takes an additional
  //  30 damage and is stunned."  The showcase shows a cyan shock burst on impact.
  function wallSlam(e, bonus) {
    e.stun = SPEC.stormDraft.wallStun;
    e.carry = null;
    e.vel.set(0, 0, 0);
    e.leanV += 6;
    stats.slams++;
    damageEnemy(e, bonus, "slam");
    spawnRing(e.pos.x, e.pos.z, 0.25, 2.6, 0.42, 0x7ef6ff, 1.4);
    spawnRing(e.pos.x, e.pos.z, 0.1, 1.7, 0.3, 0xffffff, 1.0);
    spawnSprite(e.pos.x, 0.55, e.pos.z, 3.4, 0x59e8ff, 0.4, 0.8, 0.95);
    spawnDecal(e.pos.x, e.pos.z, 3.4, 0x2fd8ff, 0.6, 0.7, 0.7);
    for (var i = 0; i < 7; i++) {
      var a = Math.random() * 6.283;
      spawnSprite(
        e.pos.x + Math.cos(a) * 0.5, 0.4 + Math.random() * 0.7, e.pos.z + Math.sin(a) * 0.5,
        0.5 + Math.random() * 0.5, 0x9ff4ff, 0.32 + Math.random() * 0.2, 1.6, 0.9
      );
    }
    shake(0.55);
  }

  function clampToArena(e, slamDamage) {
    var r = SPEC.enemy.radius;
    var speed = e.carry ? Math.hypot(e.carry.vx, e.carry.vz) : e.vel.length();
    var hit = false;
    if (e.pos.x > A.hw - r) { e.pos.x = A.hw - r; hit = true; }
    if (e.pos.x < -A.hw + r) { e.pos.x = -A.hw + r; hit = true; }
    if (e.pos.z > A.hd - r) { e.pos.z = A.hd - r; hit = true; }
    if (e.pos.z < -A.hd + r) { e.pos.z = -A.hd + r; hit = true; }
    if (!hit) return;
    if (speed >= SPEC.enemy.wallSlamMin) {
      wallSlam(e, slamDamage != null ? slamDamage : Math.max(10, Math.round(speed * 2)));
    } else {
      e.vel.multiplyScalar(0.2);
      e.carry = null;
    }
  }

  /* ==========================================================================
     8. ARCANA — STORM DRAFT
     ====================================================================== */

  var SD = SPEC.stormDraft;
  var drafts = [];

  function makeDraft(x, z, dx, dz, charged) {
    var wisps = [];
    var n = charged ? 4 : 6;
    for (var i = 0; i < n; i++) {
      wisps.push({
        across: (i / (n - 1) - 0.5) * 2 * SD.halfWidth * (charged ? 0.9 : 1) + (Math.random() - 0.5) * 0.3,
        along: (Math.random() - 0.5) * 0.85,
        y: 0.28 + Math.random() * 0.85,
        spin: Math.random() * 6.283,
        spinRate: (Math.random() * 2 + 1.6) * (Math.random() < 0.5 ? -1 : 1),
        scale: 0.62 + Math.random() * 0.6,
        drift: (Math.random() - 0.5) * 1.1
      });
    }
    return {
      pos: new T.Vector3(x, 0, z),
      dx: dx, dz: dz,
      age: 0,
      life: SD.life,
      charged: !!charged,
      hits: [],
      wisps: wisps
    };
  }

  function castStormDraft(charged) {
    var d = player.face;
    if (charged) {
      // Charged Signature: 4 volleys of 7 drafts in quick succession.
      // Queued on game time, not wall time, so a slow frame cannot desync it.
      chargedBurstFx();
      volleyQueue.length = 0;
      for (var v = 0; v < SD.volleys; v++) {
        volleyQueue.push({ at: v * SD.volleyGap, dx: d.x, dz: d.y });
      }
      volleyClock = 0;
      titleCard(SD.name, true);
    } else {
      drafts.push(makeDraft(
        player.pos.x + d.x * SD.spawnGap,
        player.pos.z + d.y * SD.spawnGap,
        d.x, d.y, false
      ));
      spawnSprite(player.pos.x + d.x * SD.spawnGap, 0.7, player.pos.z + d.y * SD.spawnGap,
        2.4, 0xeaf8ff, 0.24, 1.1, 0.85);
      titleCard(SD.name, false);
      shake(0.18);
    }
    player.castAnim = 0.22;
  }

  var volleyQueue = [];
  var volleyClock = 0;

  function fireVolley(dx, dz) {
    var px = -dz, pz = dx;                       // perpendicular to the aim
    for (var i = 0; i < SD.perVolley; i++) {
      var off = (i - (SD.perVolley - 1) / 2) * SD.rankSpacing;
      var sx = player.pos.x + dx * SD.spawnGap + px * off;
      var sz = player.pos.z + dz * SD.spawnGap + pz * off;
      // a draft cannot form inside a wall — the documented reason tight
      // corridors cut the charged signature's coverage down
      if (Math.abs(sx) > A.hw || Math.abs(sz) > A.hd) continue;
      var dr = makeDraft(sx, sz, dx, dz, true);
      dr.life = SD.life * 1.25;
      drafts.push(dr);
    }
    spawnSprite(player.pos.x + dx * 1.2, 0.7, player.pos.z + dz * 1.2, 3.2, 0xdff4ff, 0.22, 1.2, 0.7);
    shake(0.3);
  }

  function updateVolleys(dt) {
    if (!volleyQueue.length) return;
    volleyClock += dt;
    while (volleyQueue.length && volleyQueue[0].at <= volleyClock) {
      var v = volleyQueue.shift();
      fireVolley(v.dx, v.dz);
    }
  }

  // the white radial spike burst the showcase plays on the charged release
  function chargedBurstFx() {
    var px = player.pos.x, pz = player.pos.z;
    for (var i = 0; i < 22; i++) {
      var a = Math.random() * 6.283;
      var len = 2.4 + Math.random() * 5.4;
      var wq = 0.05 + Math.random() * 0.13;
      var q = spawnQuad(px + Math.cos(a) * len * 0.5, pz + Math.sin(a) * len * 0.5,
        wq, len, -a + Math.PI / 2, 0xffffff, 0.34 + Math.random() * 0.2, 1);
      q.position.y = 0.5 + Math.random() * 0.5;
    }
    spawnSprite(px, 0.75, pz, 3.0, 0xffffff, 0.3, 1.4, 1);
    spawnRing(px, pz, 0.2, 3.4, 0.34, 0xffffff, 1.1);
  }

  function updateDrafts(dt) {
    for (var i = drafts.length - 1; i >= 0; i--) {
      var d = drafts[i];
      d.age += dt;
      if (d.age >= d.life) {
        // enemies stop being carried once the draft dissipates
        for (var e2 = 0; e2 < enemies.length; e2++) {
          var en = enemies[e2];
          if (en.carry && en.carry.draft === d) {
            // the push keeps most of its momentum, so a target dropped just
            // short of a wall still slams into it
            en.vel.set(en.carry.vx * 0.8, 0, en.carry.vz * 0.8);
            en.carry = null;
          }
        }
        drafts.splice(i, 1);
        continue;
      }
      if (!d.stuck) {
        d.pos.x += d.dx * SD.speed * dt;
        d.pos.z += d.dz * SD.speed * dt;
      }

      // a draft breaks against the wall but keeps pressing whatever it carries
      if (Math.abs(d.pos.x) > A.hw - 0.2 || Math.abs(d.pos.z) > A.hd - 0.2) {
        if (!d.stuck) {
          d.stuck = true;
          d.pos.x = Math.max(-A.hw + 0.2, Math.min(A.hw - 0.2, d.pos.x));
          d.pos.z = Math.max(-A.hd + 0.2, Math.min(A.hd - 0.2, d.pos.z));
          spawnSprite(d.pos.x, 0.6, d.pos.z, 2.0, 0xeaf8ff, 0.26, 1.3, 0.6);
        }
      }

      // contact: 20 damage, then the target rides the draft
      for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (d.hits.indexOf(e) >= 0) continue;
        var rx = e.pos.x - d.pos.x, rz = e.pos.z - d.pos.z;
        var along = rx * d.dx + rz * d.dz;
        var across = rx * (-d.dz) + rz * d.dx;
        if (Math.abs(along) < 0.95 && Math.abs(across) < SD.halfWidth + SPEC.enemy.radius) {
          d.hits.push(e);
          damageEnemy(e, SD.damage);
          e.carry = { vx: d.dx * SD.speed * 0.92, vz: d.dz * SD.speed * 0.92, draft: d };
          e.leanV += 3.4;
          spawnSprite(e.pos.x, 0.9, e.pos.z, 1.7, 0xffffff, 0.2, 1.2, 0.8);
        }
      }
    }
  }

  function drawDrafts(dt) {
    for (var i = 0; i < drafts.length; i++) {
      var d = drafts[i];
      var k = d.age / d.life;
      var fade = k < 0.12 ? k / 0.12 : (k > 0.7 ? (1 - k) / 0.3 : 1);
      var px = -d.dz, pz = d.dx;
      var ang = Math.atan2(d.dx, d.dz);
      for (var w = 0; w < d.wisps.length; w++) {
        var s = d.wisps[w];
        s.spin += s.spinRate * dt;
        var acr = s.across + s.drift * d.age;
        var alo = s.along - d.age * 1.5;
        pushCrescent(
          d.pos.x + px * acr + d.dx * alo,
          s.y + Math.sin(d.age * 6 + w) * 0.06,
          d.pos.z + pz * acr + d.dz * alo,
          ang + s.spin,
          Math.sin(s.spin * 0.7) * 0.5,
          s.scale * (0.7 + fade * 0.5) * (d.charged ? 1.1 : 1),
          fade * 0.82,
          null
        );
      }
    }
  }

  /* ==========================================================================
     9. ARCANA — WHIRLING WIND AGENT
     ====================================================================== */

  var WA = SPEC.windAgent;
  var agents = [];

  function castWindAgents() {
    for (var i = 0; i < WA.count; i++) {
      var a = (i / WA.count) * 6.283 + Math.random();
      agents.push({
        pos: new T.Vector3(
          player.pos.x + Math.cos(a) * 0.8, 0.55, player.pos.z + Math.sin(a) * 0.8
        ),
        vel: new T.Vector3(),
        life: WA.duration,
        hp: WA.health,
        state: "follow",
        timer: WA.chargeEvery * (0.35 + i * 0.4),
        stateT: 0,
        dir: new T.Vector2(1, 0),
        travel: 0,
        orbit: a,
        spin: Math.random() * 6.283,
        hits: [],
        bars: null
      });
      spawnSprite(player.pos.x + Math.cos(a) * 0.8, 0.7, player.pos.z + Math.sin(a) * 0.8,
        2.0, 0xffffff, 0.3, 1.2, 0.9);
    }
    titleCard(WA.name, false);
    player.castAnim = 0.22;
  }

  function makeBars() {
    var g = new T.Group();
    function bar(color, y) {
      var m = new T.Mesh(new T.PlaneGeometry(0.62, 0.075),
        new T.MeshBasicMaterial({ color: color, depthWrite: false, transparent: true }));
      m.position.y = y;
      return m;
    }
    var back = bar(0x101014, 0);
    back.scale.set(1.08, 3.1, 1);
    g.add(back);
    var hp = bar(0xe0392f, 0.055); g.add(hp);
    var du = bar(0x2f7fe0, -0.035); g.add(du);
    g.userData = { hp: hp, du: du };
    return g;
  }

  function updateAgents(dt) {
    for (var i = agents.length - 1; i >= 0; i--) {
      var g = agents[i];
      g.life -= dt;
      g.spin += dt * 9;
      if (g.life <= 0) {
        spawnSprite(g.pos.x, g.pos.y, g.pos.z, 2.2, 0xffffff, 0.34, 1.4, 0.85);
        if (g.bars) { scene.remove(g.bars); disposeTree(g.bars); }
        if (g.core) { scene.remove(g.core); g.core.material.dispose(); }
        agents.splice(i, 1);
        continue;
      }
      if (!g.bars) { g.bars = makeBars(); scene.add(g.bars); }
      if (!g.core) {
        g.core = new T.Sprite(new T.SpriteMaterial({
          map: puffTex, color: 0xf2fbff, transparent: true,
          blending: T.AdditiveBlending, depthWrite: false, opacity: 0.7
        }));
        scene.add(g.core);
      }

      // "loosely following the player and teleporting back if the player strays too far"
      var toP = Math.hypot(player.pos.x - g.pos.x, player.pos.z - g.pos.z);
      if (toP > WA.leashRange) {
        spawnSprite(g.pos.x, g.pos.y, g.pos.z, 1.8, 0xffffff, 0.28, 1.4, 0.8);
        g.pos.set(player.pos.x + (Math.random() - 0.5) * 1.4, 0.55, player.pos.z + (Math.random() - 0.5) * 1.4);
        spawnSprite(g.pos.x, g.pos.y, g.pos.z, 1.8, 0xffffff, 0.28, 1.4, 0.8);
        g.state = "follow";
      }

      g.stateT += dt;

      if (g.state === "follow") {
        g.timer -= dt;
        g.orbit += dt * 1.1;
        var tx = player.pos.x + Math.cos(g.orbit) * 1.7;
        var tz = player.pos.z + Math.sin(g.orbit) * 1.7;
        var ax = tx - g.pos.x, az = tz - g.pos.z;
        var al = Math.hypot(ax, az) || 1;
        var sp = Math.min(WA.followSpeed, al * 3.4);
        g.vel.x += ((ax / al) * sp - g.vel.x) * Math.min(1, dt * 6);
        g.vel.z += ((az / al) * sp - g.vel.z) * Math.min(1, dt * 6);

        if (g.timer <= 0) {
          var target = nearestEnemy(g.pos, WA.seekRange);
          if (target) {
            var dx = target.pos.x - g.pos.x, dz = target.pos.z - g.pos.z;
            var dl = Math.hypot(dx, dz) || 1;
            g.dir.set(dx / dl, dz / dl);
            g.travel = dl + WA.chargeOvershoot;
            g.state = "windup";
            g.stateT = 0;
            g.hits = [];
          } else {
            g.timer = 0.35;
          }
        }
      } else if (g.state === "windup") {
        g.vel.multiplyScalar(0.82);
        g.pos.x -= g.dir.x * dt * 1.6;
        g.pos.z -= g.dir.y * dt * 1.6;
        if (g.stateT > 0.17) { g.state = "charge"; g.stateT = 0; }
      } else if (g.state === "charge") {
        var step = WA.chargeSpeed * dt;
        g.pos.x += g.dir.x * step;
        g.pos.z += g.dir.y * step;
        g.travel -= step;
        g.vel.set(0, 0, 0);

        // charges pierce: every dummy on the line takes a hit
        for (var j = 0; j < enemies.length; j++) {
          var e = enemies[j];
          if (g.hits.indexOf(e) >= 0) continue;
          if (Math.hypot(e.pos.x - g.pos.x, e.pos.z - g.pos.z) < 0.95) {
            g.hits.push(e);
            damageEnemy(e, WA.damage);
            knock(e, g.dir.x, g.dir.y, WA.knockback);
            e.leanV += 2.6;
            spawnSprite(e.pos.x, 0.95, e.pos.z, 1.9, 0xffffff, 0.22, 1.3, 0.95);
          }
        }
        // trail
        if (Math.random() < 0.7) {
          spawnSprite(g.pos.x, g.pos.y, g.pos.z, 0.85, 0xdff3ff, 0.24, 0.8, 0.55);
        }
        if (g.travel <= 0 || Math.abs(g.pos.x) > A.hw || Math.abs(g.pos.z) > A.hd) {
          g.state = "recover"; g.stateT = 0;
          g.timer = WA.chargeEvery;
        }
      } else {
        g.vel.multiplyScalar(0.9);
        if (g.stateT > 0.22) { g.state = "follow"; }
      }

      g.pos.x += g.vel.x * dt;
      g.pos.z += g.vel.z * dt;
      g.pos.x = Math.max(-A.hw + 0.3, Math.min(A.hw - 0.3, g.pos.x));
      g.pos.z = Math.max(-A.hd + 0.3, Math.min(A.hd - 0.3, g.pos.z));
      g.pos.y = 0.55 + Math.sin(time * 5 + i) * 0.06;

      var f = Math.max(0, g.life / WA.duration);
      g.core.position.set(g.pos.x, g.pos.y, g.pos.z);
      g.core.scale.setScalar((g.state === "charge" ? 1.5 : 1.15) + Math.sin(g.spin) * 0.09);
      g.core.material.opacity = 0.62 * Math.min(1, g.life / 0.6);

      // bars under the agent, exactly like the source (red over blue)
      g.bars.position.set(g.pos.x, 0.06, g.pos.z + 0.55);
      g.bars.quaternion.copy(camera.quaternion);
      g.bars.userData.hp.scale.x = g.hp / WA.health;
      g.bars.userData.hp.position.x = -0.31 * (1 - g.hp / WA.health);
      g.bars.userData.du.scale.x = f;
      g.bars.userData.du.position.x = -0.31 * (1 - f);
    }
  }

  function drawAgents(dt) {
    for (var i = 0; i < agents.length; i++) {
      var g = agents[i];
      var charging = g.state === "charge";
      var fade = Math.min(1, g.life / 0.6);
      var ang = Math.atan2(g.dir.x, g.dir.y);
      for (var c = 0; c < 4; c++) {
        var ph = g.spin * (charging ? 1.7 : 1) + c * 1.57;
        var rad = charging ? 0.30 : 0.42;
        pushCrescent(
          g.pos.x + Math.cos(ph) * rad,
          g.pos.y + Math.sin(ph * 1.3 + c) * 0.16 + c * 0.05,
          g.pos.z + Math.sin(ph) * rad,
          ang + ph * 1.4,
          Math.sin(ph) * 0.7,
          (charging ? 0.95 : 0.78) + Math.sin(ph) * 0.1,
          fade * (charging ? 1 : 0.85),
          null
        );
      }
      pushCrescent(g.pos.x, g.pos.y, g.pos.z, g.spin * 2.2, 0.2,
        charging ? 0.7 : 0.55, fade * 0.9, null);
    }
  }

  function disposeTree(root) {
    root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  function nearestEnemy(from, range) {
    var best = null, bd = range * range;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var dx = e.pos.x - from.x, dz = e.pos.z - from.z;
      var d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  }

  /* ==========================================================================
     10. ABILITY SLOTS (charges + cooldowns, as the source HUD shows them)
     ====================================================================== */

  var slotSD = { charges: SD.charges, timer: 0, holding: false, hold: 0 };
  var slotWA = { timer: 0 };

  function updateSlots(dt) {
    if (slotSD.charges < SD.charges) {
      slotSD.timer -= dt;
      if (slotSD.timer <= 0) {
        slotSD.charges++;
        if (slotSD.charges < SD.charges) slotSD.timer = SD.cooldown;
      }
    }
    if (slotWA.timer > 0) slotWA.timer -= dt;

    if (slotSD.holding) {
      slotSD.hold += dt;
      if (slotSD.charges > 0) chargeGatherFx(dt);
    }
    hudCharge();
    hudAcc += dt;
    if (hudAcc >= 0.1) { hudAcc = 0; hudSlots(); }
  }
  var hudAcc = 0;

  var gatherAcc = 0;
  function chargeGatherFx(dt) {
    gatherAcc += dt;
    if (gatherAcc < 0.045) return;
    gatherAcc = 0;
    var a = Math.random() * 6.283;
    var r = 2.6 + Math.random() * 1.6;
    var s = spawnSprite(
      player.pos.x + Math.cos(a) * r, 0.55 + Math.random() * 0.7, player.pos.z + Math.sin(a) * r,
      0.55, 0xdff2ff, 0.34, -0.5, 0.75
    );
    s.userData.pullTo = { x: player.pos.x, z: player.pos.z };
  }

  function pressSD() {
    if (slotSD.charges <= 0) { flashSlot("ab-sd"); return; }
    slotSD.holding = true;
    slotSD.hold = 0;
  }

  function releaseSD() {
    if (!slotSD.holding) return;
    slotSD.holding = false;
    if (slotSD.charges <= 0) return;
    if (slotSD.hold >= SD.chargeTime) {
      // Charged Signature spends the whole pool
      castStormDraft(true);
      slotSD.charges = 0;
      slotSD.timer = SD.cooldown;
    } else {
      castStormDraft(false);
      slotSD.charges--;
      if (slotSD.timer <= 0 || slotSD.charges === SD.charges - 1) slotSD.timer = SD.cooldown;
    }
    slotSD.hold = 0;
  }

  function pressWA() {
    if (slotWA.timer > 0) { flashSlot("ab-ww"); return; }
    slotWA.timer = WA.cooldown;
    castWindAgents();
  }

  /* ==========================================================================
     11. INPUT — twin virtual sticks + ability buttons, plus desktop fallback
     ====================================================================== */

  var moveVec = { x: 0, y: 0 };
  var aimVec = { x: 0, y: 0, active: false };
  var sticks = { move: null, aim: null };

  var stickL = document.getElementById("stick-l");
  var stickR = document.getElementById("stick-r");

  function stickEl(which) { return which === "move" ? stickL : stickR; }

  function setStick(which, ox, oy, dx, dy) {
    var el = stickEl(which);
    el.style.display = "block";
    el.style.left = ox + "px";
    el.style.top = oy + "px";
    el.firstElementChild.style.transform = "translate(" + dx + "px," + dy + "px)";
  }
  function hideStick(which) { stickEl(which).style.display = "none"; }

  var MAXR = 52;

  function onDown(ev) {
    if (!running) return;
    var id = ev.pointerId;
    var x = ev.clientX, y = ev.clientY;
    var which = x < window.innerWidth * 0.42 ? "move" : "aim";
    if (sticks[which]) return;
    sticks[which] = { id: id, ox: x, oy: y };
    setStick(which, x, y, 0, 0);
    canvas.setPointerCapture && canvas.setPointerCapture(id);
  }

  function onMove(ev) {
    var id = ev.pointerId;
    ["move", "aim"].forEach(function (which) {
      var s = sticks[which];
      if (!s || s.id !== id) return;
      var dx = ev.clientX - s.ox, dy = ev.clientY - s.oy;
      var len = Math.hypot(dx, dy);
      var cl = Math.min(len, MAXR);
      var nx = len > 0 ? dx / len : 0, ny = len > 0 ? dy / len : 0;
      setStick(which, s.ox, s.oy, nx * cl, ny * cl);
      var mag = Math.min(1, len / MAXR);
      if (which === "move") {
        moveVec.x = nx * mag; moveVec.y = ny * mag;
      } else if (len > 12) {
        aimVec.x = nx; aimVec.y = ny; aimVec.active = true;
      }
    });
  }

  function onUp(ev) {
    var id = ev.pointerId;
    ["move", "aim"].forEach(function (which) {
      var s = sticks[which];
      if (!s || s.id !== id) return;
      sticks[which] = null;
      hideStick(which);
      if (which === "move") { moveVec.x = 0; moveVec.y = 0; }
      else aimVec.active = false;
    });
  }

  window.addEventListener("pointerdown", function (ev) {
    if (ev.target.closest && ev.target.closest(".ui-block")) return;
    onDown(ev);
  }, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });

  function bindButton(id, down, up) {
    var el = document.getElementById(id);
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      el.classList.add("held");
      down();
    });
    var end = function (e) {
      if (!el.classList.contains("held")) return;
      e && e.preventDefault();
      el.classList.remove("held");
      up && up();
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointerleave", end);
    el.addEventListener("pointercancel", end);
  }

  bindButton("ab-sd", pressSD, releaseSD);
  bindButton("ab-ww", pressWA, null);

  function flashSlot(id) {
    var el = document.getElementById(id);
    el.classList.remove("deny");
    void el.offsetWidth;
    el.classList.add("deny");
  }

  // ---- desktop ----
  var keys = {};
  window.addEventListener("keydown", function (e) {
    if (keys[e.code]) return;
    keys[e.code] = true;
    if (e.code === "KeyJ") pressSD();
    if (e.code === "KeyK") pressWA();
    if (e.code === "KeyR") spawnDummies();
  });
  window.addEventListener("keyup", function (e) {
    keys[e.code] = false;
    if (e.code === "KeyJ") releaseSD();
  });

  var mouseAim = null;
  var _ray = new T.Raycaster(), _ndc = new T.Vector2(), _plane = new T.Plane(new T.Vector3(0, 1, 0), 0), _pt = new T.Vector3();
  window.addEventListener("mousemove", function (e) {
    _ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    if (_ray.ray.intersectPlane(_plane, _pt)) mouseAim = { x: _pt.x, z: _pt.z };
  });

  /* ==========================================================================
     12. HUD
     ====================================================================== */

  var cardEl = document.getElementById("titlecard");
  var cardName = document.getElementById("card-name");
  var cardCharged = document.getElementById("card-charged");
  var cardIcon = document.getElementById("card-icon");
  var cardTimer = 0;

  var ICONS = {};
  ICONS[SD.name] = document.getElementById("icon-sd").innerHTML;
  ICONS[WA.name] = document.getElementById("icon-ww").innerHTML;

  function titleCard(name, charged) {
    cardName.innerHTML = name.split(" ").map(function (w) { return "<span>" + w + "</span>"; }).join("");
    cardCharged.style.display = charged ? "block" : "none";
    cardIcon.innerHTML = ICONS[name] || "";
    cardEl.classList.add("show");
    cardTimer = 2.9;
  }

  var sdCharges = document.getElementById("sd-charges");
  var sdCool = document.getElementById("sd-cool");
  var waCool = document.getElementById("wa-cool");
  var sdRing = document.getElementById("sd-ring");
  var waRing = document.getElementById("wa-ring");
  var chargeBar = document.getElementById("chargebar");

  function hudSlots() {
    var pips = sdCharges.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle("on", i < slotSD.charges);
    }
    if (slotSD.charges >= SD.charges) {
      sdCool.textContent = "";
      sdRing.style.background = "";
    } else {
      sdCool.textContent = slotSD.timer.toFixed(1);
      var p = 1 - slotSD.timer / SD.cooldown;
      sdRing.style.background = "conic-gradient(rgba(120,230,255,.30) " + (p * 360).toFixed(0) + "deg, rgba(0,0,0,.55) 0deg)";
    }
    if (slotWA.timer > 0) {
      waCool.textContent = slotWA.timer.toFixed(1);
      var p2 = 1 - slotWA.timer / WA.cooldown;
      waRing.style.background = "conic-gradient(rgba(120,230,255,.30) " + (p2 * 360).toFixed(0) + "deg, rgba(0,0,0,.55) 0deg)";
    } else {
      waCool.textContent = "";
      waRing.style.background = "";
    }
  }

  var chargeShown = false;
  function hudCharge() {
    if (slotSD.holding && slotSD.charges > 0) {
      var f = Math.min(1, slotSD.hold / SD.chargeTime);
      if (!chargeShown) { chargeBar.style.display = "block"; chargeShown = true; }
      chargeBar.firstElementChild.style.width = (f * 100).toFixed(0) + "%";
      chargeBar.classList.toggle("full", f >= 1);
    } else if (chargeShown) {
      chargeBar.style.display = "none";
      chargeShown = false;
    }
  }

  var dmgEl = document.getElementById("stat-dmg");
  var slamEl = document.getElementById("stat-slam");
  function hudStats() {
    dmgEl.textContent = stats.damage.toLocaleString();
    slamEl.textContent = stats.slams;
  }

  /* ==========================================================================
     13. PLAYER UPDATE + CAMERA SHAKE
     ====================================================================== */

  var shakeAmt = 0;
  function shake(v) { shakeAmt = Math.min(1.1, shakeAmt + v); }

  function updatePlayer(dt) {
    var mx = moveVec.x, my = moveVec.y;
    if (keys.KeyW || keys.ArrowUp) my -= 1;
    if (keys.KeyS || keys.ArrowDown) my += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    var ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; ml = 1; }
    var wd = screenToWorldDir(mx, my);
    mx = wd.x; my = wd.y;

    var tvx = mx * SPEC.player.speed, tvz = my * SPEC.player.speed;
    player.vel.x += (tvx - player.vel.x) * Math.min(1, dt * 14);
    player.vel.z += (tvz - player.vel.z) * Math.min(1, dt * 14);
    player.pos.x += player.vel.x * dt;
    player.pos.z += player.vel.z * dt;

    var r = SPEC.player.radius;
    player.pos.x = Math.max(-A.hw + r, Math.min(A.hw - r, player.pos.x));
    player.pos.z = Math.max(-A.hd + r, Math.min(A.hd - r, player.pos.z));

    // facing: the aim stick wins, otherwise you face where you run
    if (aimVec.active) {
      var ad = screenToWorldDir(aimVec.x, aimVec.y);
      player.face.set(ad.x, ad.y).normalize();
    } else if (mouseAim && ml < 0.05 && !("ontouchstart" in window)) {
      var dx = mouseAim.x - player.pos.x, dz = mouseAim.z - player.pos.z;
      if (Math.hypot(dx, dz) > 0.4) player.face.set(dx, dz).normalize();
    } else if (ml > 0.15) {
      player.face.set(mx, my).normalize();
    }

    player.obj.position.set(player.pos.x, 0, player.pos.z);
    player.body.rotation.y = Math.atan2(player.face.x, player.face.y);
    player.bob += dt * (4 + ml * 9);
    var bobY = Math.abs(Math.sin(player.bob)) * 0.055 * (0.35 + ml);
    if (player.castAnim > 0) {
      player.castAnim -= dt;
      player.body.position.set(player.face.x * 0.14, bobY, player.face.y * 0.14);
    } else {
      player.body.position.set(0, bobY, 0);
    }
    player.body.rotation.z = -player.vel.x * 0.02;

    // aim reticle on the ground
    reticle.position.set(
      player.pos.x + player.face.x * 2.5, 0.08, player.pos.z + player.face.y * 2.5
    );
    reticle.rotation.y = Math.atan2(player.face.x, player.face.y);
    reticle.material.opacity = aimVec.active ? 0.5 : 0.22;
  }

  var reticle = new T.Mesh(
    new T.PlaneGeometry(0.55, 2.4),
    new T.MeshBasicMaterial({
      map: puffTex, color: 0x9fe8ff, transparent: true, opacity: 0.25,
      blending: T.AdditiveBlending, depthWrite: false
    })
  );
  reticle.rotation.x = -Math.PI / 2;
  scene.add(reticle);

  function updateEnemies(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.stun > 0) e.stun -= dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      if (e.carry) {
        e.pos.x += e.carry.vx * dt;
        e.pos.z += e.carry.vz * dt;
        clampToArena(e, SD.wallDamage);
      } else {
        e.pos.x += e.vel.x * dt;
        e.pos.z += e.vel.z * dt;
        var f = Math.max(0, 1 - SPEC.enemy.friction * dt);
        e.vel.multiplyScalar(f);
        if (e.vel.lengthSq() < 0.01) e.vel.set(0, 0, 0);
        clampToArena(e, null);
      }

      // dummy separation so they do not stack into one another
      for (var j = i + 1; j < enemies.length; j++) {
        var o = enemies[j];
        var dx = o.pos.x - e.pos.x, dz = o.pos.z - e.pos.z;
        var d = Math.hypot(dx, dz);
        var min = SPEC.enemy.radius * 2;
        if (d > 0.0001 && d < min) {
          var push = (min - d) * 0.5;
          e.pos.x -= (dx / d) * push; e.pos.z -= (dz / d) * push;
          o.pos.x += (dx / d) * push; o.pos.z += (dz / d) * push;
        }
      }

      // wobble: hit dummies rock on their base
      var speed = e.carry ? 8 : e.vel.length();
      e.leanV += (-e.lean * 42 - e.leanV * 7) * dt;
      e.lean += e.leanV * dt;
      e.lean = Math.max(-0.5, Math.min(0.5, e.lean));

      e.obj.position.set(e.pos.x, 0, e.pos.z);
      var pv = e.obj.userData.pivot;
      var mvx = e.carry ? e.carry.vx : e.vel.x;
      var mvz = e.carry ? e.carry.vz : e.vel.z;
      var mdir = Math.atan2(mvx, mvz || 1);
      pv.rotation.set(Math.cos(mdir) * e.lean, 0, -Math.sin(mdir) * e.lean);
      pv.scale.setScalar(1 + Math.max(0, e.hitFlash) * 1.3);
      if (e.stun > 0) {
        pv.rotation.y = Math.sin(time * 22) * 0.16;
      } else {
        pv.rotation.y = 0;
      }
      if (speed > 0.2 && Math.random() < dt * 14) {
        spawnSprite(e.pos.x, 0.2, e.pos.z, 0.7, 0x8b8f92, 0.3, 1.2, 0.25);
      }
      if (e.stun > 0) {
        var st = time * 6;
        for (var s2 = 0; s2 < 3; s2++) {
          pushCrescent(
            e.pos.x + Math.cos(st + s2 * 2.1) * 0.42, 1.75,
            e.pos.z + Math.sin(st + s2 * 2.1) * 0.42,
            st * 2, 0.3, 0.34, 0.6, [0.42, 0.95, 1]
          );
        }
      }
    }
  }

  /* ==========================================================================
     14. MAIN LOOP
     ====================================================================== */

  var running = false;
  var time = 0;
  var last = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!running) return;
    time += dt;

    updatePlayer(dt);
    updateSlots(dt);
    updateVolleys(dt);
    updateDrafts(dt);
    updateAgents(dt);
    updateEnemies(dt);

    beginCrescents();
    drawDrafts(dt);
    drawAgents(dt);
    endCrescents();

    // pull gather motes toward the caster while charging
    for (var i = 0; i < liveSprites.length; i++) {
      var sp = liveSprites[i];
      if (sp.userData.pullTo) {
        sp.position.x += (sp.userData.pullTo.x - sp.position.x) * Math.min(1, dt * 4.5);
        sp.position.z += (sp.userData.pullTo.z - sp.position.z) * Math.min(1, dt * 4.5);
      }
    }

    updateSprites(dt);
    updateQuads(dt);
    updateDecals(dt);
    updateRings(dt);
    updateNumbers(dt);

    if (cardTimer > 0) {
      cardTimer -= dt;
      if (cardTimer <= 0) cardEl.classList.remove("show");
    }

    if (shakeAmt > 0.001) {
      shakeAmt = Math.max(0, shakeAmt - dt * 3.2);
      camera.position.x += (Math.random() - 0.5) * shakeAmt * 0.34;
      camera.position.y += (Math.random() - 0.5) * shakeAmt * 0.34;
      camera.lookAt(camTarget);
    } else if (shakeAmt !== 0) {
      shakeAmt = 0;
      fitCamera();
    }

    renderer.render(scene, camera);
  }

  /* ==========================================================================
     15. BOOT
     ====================================================================== */

  window.addEventListener("resize", fitCamera);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fitCamera);
  window.addEventListener("orientationchange", function () { setTimeout(fitCamera, 250); });
  fitCamera();
  hudSlots();
  hudStats();
  renderer.render(scene, camera);

  document.getElementById("btn-reset").addEventListener("click", function (e) {
    e.stopPropagation();
    spawnDummies();
    stats.damage = 0; stats.slams = 0;
    hudStats();
  });

  var sheet = document.getElementById("sheet");
  document.getElementById("btn-info").addEventListener("click", function (e) {
    e.stopPropagation();
    sheet.classList.add("open");
  });
  document.getElementById("sheet-close").addEventListener("click", function (e) {
    e.stopPropagation();
    sheet.classList.remove("open");
  });

  var startEl = document.getElementById("start");
  function begin() {
    startEl.classList.add("gone");
    setTimeout(function () { startEl.style.display = "none"; }, 420);
    running = true;
    last = performance.now();
    fitCamera();
  }
  startEl.addEventListener("pointerdown", function (e) { e.preventDefault(); begin(); });
  requestAnimationFrame(frame);

  // block iOS double-tap zoom / rubber-band scroll
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });
  document.addEventListener("touchmove", function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
})();
