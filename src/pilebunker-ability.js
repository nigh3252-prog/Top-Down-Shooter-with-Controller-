// Falcon Pilebunker ability — the punch rig ported from the standalone
// falcon-pilebunker-punch-lab-v2 prototype.
//
// This is a second, mostly-invisible arm system that takes over during the
// ability: a 2-bone IK arm follows the lab's authored Catmull-Rom windup
// curves and frozen launch rail, and mounts the pilebunker mechanism
// (housing / ratcheting carriage / piston ram / fist) on the forearm.
// Only the mechanism and its elbow hinge render — no lab body, legs, or
// upper-arm limb. The host feeds the rig's body outputs (hip twist, chest
// twist, crouch, lunge) into the same pose pipeline the weapon rig uses,
// so the Stone Wanderer's torso performs the punch while the equipped
// weapon stays idle in hand.
//
// weapon-lab.html owns all gameplay consequences (damage, lunge movement,
// facing lock, audio); this module reports them as consumable events so it
// never touches host systems (and never references CombatAudio, which is
// TDZ-unsafe before the frame loop starts).

export function createPilebunkerAbility({ THREE, cooldown = 5 } = {}) {
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V3(0, 1, 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- easing (lab originals) ---------- */
  const easeInQuart = t => t * t * t * t;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smoothstep = t => t * t * (3 - 2 * t);

  /* ---------- tuning ---------- */
  // RIG_SCALE maps lab character units (shoulder at y≈1.49, arm reach .58)
  // into the game's combat-layer space (arm reach ≈ 2.9). size is the lab's
  // PBTUNE.size mechanism scale, in lab units.
  const TUNE = {
    rigScale: 5.0,
    lift: 1.1,            // extra height added to the shoulder anchor (combat-layer units)
    size: 0.30,
    off: 0.55,            // elbow lift: housing offset perpendicular to the forearm
    throwExt: 2.33,       // piston throw past rest
    rear: -0.85,          // rear ram resting extension
    // body-pose mapping gains (lab value -> game pose field)
    twistGain: 1.0,
    hipGain: 1.0,
    lowerGain: 3.0,
    lungeGain: 1.0,
    impact: 1.25,         // lab DEFAULT preset impact weight
    pileDelay: 0.76,      // slam point within the strike phase
    hitAt: 0.82,          // damage point within the strike phase
  };
  const PB_MAX_RETRACT = 0.95, RATCHET_STEPS = 4;
  const L1 = 0.30, L2 = 0.28;   // upper arm / forearm IK lengths (lab units)
  const REST_SHOULDER = V3(0.27, 1.49, 0.02); // lab shoulder rest position (char-local)

  // Lab DEFAULT phase durations (seconds of ability time).
  const DUR = { brace: .15, ratchet: .55, coil: .35, hold: .18, strike: .105, impact: .12, lock: .28, retract: .22, recover: .75 };
  const B1 = DUR.brace + DUR.ratchet + DUR.coil;      // windup end
  const B2 = B1 + DUR.hold;
  const B3 = B2 + DUR.strike;
  const B4 = B3 + DUR.impact;
  const B5 = B4 + DUR.lock;
  const B6 = B5 + DUR.retract;
  const B7 = B6 + DUR.recover;

  /* ---------- authored Falcon Punch data (lab originals, right arm) ---------- */
  const GUARD_W = V3(.16, 1.32, .26), GUARD_POLE = V3(.58, .88, .02);
  const FALCON = {
    brace: V3(.08, 1.35, .36),
    high: V3(.38, 1.62, .02),
    coil: V3(.43, 1.21, -.10),
    impact: V3(.00, 1.22, .88),
    follow: V3(-.07, 1.18, .98),
    recoverMid: V3(.28, 1.23, .38),
    bracePole: V3(.62, 1.02, .04),
    highPole: V3(.72, 1.20, -.02),
    coilPole: V3(.70, .92, -.05),
    impactPole: V3(.66, .92, .02),
    braceDir: V3(.08, .14, .99).normalize(),
    highDir: V3(.24, .82, .52).normalize(),
    coilDir: V3(-.06, .10, .99).normalize(),
    coilHip: .66, coilChest: 1.02, punchHip: -.46, punchChest: -.78,
  };

  /* ---------- materials + mesh helpers (lab originals) ---------- */
  function Mst(c, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: .72, metalness: .18 }, o)); }
  const pbMat = {
    black: Mst(0x23262c), gun: Mst(0x3a3f47),
    cream: Mst(0xd8cfb8, { roughness: .82, metalness: .05 }),
    red: Mst(0xa8262a, { roughness: .6 }),
    brass: Mst(0xb08d3e, { roughness: .35, metalness: .75 }),
    chrome: Mst(0x9aa2ad, { roughness: .25, metalness: .9 }),
    dark: Mst(0x15171c, { roughness: .9 }),
  };
  function octShape(w, h, c) {
    c = Math.min(c, w / 2 - 0.001, h / 2 - 0.001);
    const s = new THREE.Shape(), x = w / 2, y = h / 2;
    s.moveTo(-x + c, -y); s.lineTo(x - c, -y); s.lineTo(x, -y + c); s.lineTo(x, y - c);
    s.lineTo(x - c, y); s.lineTo(-x + c, y); s.lineTo(-x, y - c); s.lineTo(-x, -y + c); s.closePath();
    return s;
  }
  function pbSlab(w, h, d, c, mat) {
    const bev = Math.min(c * 0.7, d * 0.35);
    const g = new THREE.ExtrudeGeometry(octShape(w, h, c), { depth: d - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1 });
    g.translate(0, 0, -(d - bev * 2) / 2); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }
  function pbBox(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
  function pbCyl(r1, r2, h, seg, mat) { return new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); }

  /* ---------- mechanism build (lab buildPilebunker, mz=+1) ---------- */
  function buildPilebunker() {
    const mz = 1;
    const root = new THREE.Group();
    const fore = new THREE.Group(); root.add(fore);             // recoils along -x on slam
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xff4a20, emissiveIntensity: 0, flatShading: true });
    const housingLen = 3.3;
    const shell = pbSlab(1.7, 1.7, housingLen, 0.4, pbMat.black);
    shell.rotation.y = Math.PI / 2; shell.position.set(0.72 + housingLen / 2, 0, 0); fore.add(shell);
    const panel = (w, h, d, mat) => { const p = pbSlab(w, h, d, 0.12, mat); p.rotation.y = Math.PI / 2; return p; };
    const topPlate = panel(1.3, 0.22, 2.3, pbMat.cream); topPlate.position.set(2.0, 0.92, 0); fore.add(topPlate);
    const topPlate2 = panel(0.9, 0.18, 1.1, pbMat.cream); topPlate2.position.set(1.47, 1.08, 0); fore.add(topPlate2);
    const sideL = panel(0.22, 1.1, 2.0, pbMat.cream); sideL.position.set(2.08, 0.05, 0.92 * mz); fore.add(sideL);
    const sideR = sideL.clone(); sideR.position.z = -0.92 * mz; fore.add(sideR);
    [[2.62, 0.05, 1.0], [2.62, 0.05, -1.0], [1.52, 0.05, 1.0], [1.52, 0.05, -1.0]].forEach(p => {
      const st = pbBox(0.06, 0.9, 0.06, pbMat.red); st.position.set(p[0], p[1], p[2] * mz); st.rotation.x = 0.35 * mz; fore.add(st);
    });
    const collar = pbSlab(1.35, 1.35, 0.55, 0.3, pbMat.gun); collar.rotation.y = Math.PI / 2; collar.position.set(0.72 + housingLen + 0.15, 0, 0); fore.add(collar);
    const collarRing = pbCyl(0.62, 0.7, 0.22, 8, pbMat.dark); collarRing.rotation.z = Math.PI / 2; collarRing.position.set(0.72 + housingLen + 0.45, 0, 0); fore.add(collarRing);
    const breech = pbSlab(1.28, 1.28, 0.7, 0.3, pbMat.gun); breech.rotation.y = Math.PI / 2; breech.position.set(0.42, 0, 0); fore.add(breech);
    const rearSeal = pbCyl(0.62, 0.68, 0.22, 8, pbMat.red); rearSeal.rotation.z = Math.PI / 2; rearSeal.position.set(0.04, 0.04, 0); fore.add(rearSeal);
    const rearSocket = pbCyl(0.52, 0.58, 0.62, 8, pbMat.gun); rearSocket.rotation.z = Math.PI / 2; rearSocket.position.set(0.24, 0.04, 0); fore.add(rearSocket);
    const stacks = [];
    for (let s = -1; s <= 1; s += 2) {
      const st = pbCyl(0.16, 0.2, 0.72, 6, pbMat.dark); st.position.set(0.55, 0.86, 0.45 * s); st.rotation.x = 0.35 * s; fore.add(st); stacks.push(st);
    }
    const gear = new THREE.Group(); gear.position.set(1.66, 0.1, 1.17 * mz); gear.scale.setScalar(0.83); fore.add(gear);
    const gearDisc = pbCyl(0.55, 0.55, 0.16, 10, pbMat.brass); gearDisc.rotation.x = Math.PI / 2; gear.add(gearDisc);
    for (let i = 0; i < 8; i++) { const t = pbBox(0.16, 0.22, 0.14, pbMat.brass); const a = i / 8 * Math.PI * 2; t.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0); t.rotation.z = a; gear.add(t); }
    const gearHub = pbCyl(0.16, 0.16, 0.24, 6, pbMat.dark); gearHub.rotation.x = Math.PI / 2; gear.add(gearHub);
    const idler = new THREE.Group(); idler.position.set(2.29, 0.62, 1.17 * mz); idler.scale.setScalar(0.83); fore.add(idler);
    const idisc = pbCyl(0.3, 0.3, 0.14, 8, pbMat.chrome); idisc.rotation.x = Math.PI / 2; idler.add(idisc);
    for (let i = 0; i < 6; i++) { const t = pbBox(0.1, 0.14, 0.12, pbMat.chrome); const a = i / 6 * Math.PI * 2; t.position.set(Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0); t.rotation.z = a; idler.add(t); }
    for (let i = 0; i < 3; i++) {
      const v = pbBox(0.5, 0.1, 0.05, glowMat); v.position.set(1.18 + i * 0.55, -0.75, 0.88); fore.add(v);
      const v2 = v.clone(); v2.position.z = -0.88; fore.add(v2);
    }
    /* carriage: rear ram pokes out the back on retract, fist flies out the front on slam */
    const carriage = new THREE.Group(); fore.add(carriage);
    const backRam = pbCyl(0.4, 0.4, 1.85, 8, pbMat.cream); backRam.rotation.z = Math.PI / 2; carriage.add(backRam);
    const backHead = pbCyl(0.52, 0.56, 0.28, 8, pbMat.gun); backHead.rotation.z = Math.PI / 2; carriage.add(backHead);
    for (let s = -1; s <= 1; s += 2) { const rod = pbCyl(0.08, 0.08, 2.75, 6, pbMat.brass); rod.rotation.z = Math.PI / 2; rod.position.set(1.98, 0.45, 0.56 * s); carriage.add(rod); }
    const ram = pbCyl(0.34, 0.34, 2.9, 8, pbMat.chrome); ram.rotation.z = Math.PI / 2; ram.position.set(2.4, -0.05, 0); carriage.add(ram);
    const ramCollar = pbCyl(0.42, 0.42, 0.3, 8, pbMat.brass); ramCollar.rotation.z = Math.PI / 2; ramCollar.position.set(3.32, -0.05, 0); carriage.add(ramCollar);
    const fist = new THREE.Group(); fist.position.set(4.38, -0.05, 0); carriage.add(fist);
    const fistCore = pbSlab(1.15, 1.35, 1.5, 0.3, pbMat.black); fistCore.rotation.y = Math.PI / 2; fist.add(fistCore);
    const fistFace = pbSlab(0.95, 1.15, 0.35, 0.24, pbMat.gun); fistFace.rotation.y = Math.PI / 2; fistFace.position.x = 0.7; fist.add(fistFace);
    for (let iy = 0; iy < 2; iy++) for (let iz = 0; iz < 2; iz++) {
      const k = pbSlab(0.34, 0.34, 0.35, 0.1, pbMat.cream); k.rotation.y = Math.PI / 2; k.position.set(0.95, (iy ? 0.3 : -0.3), (iz ? 0.32 : -0.32)); fist.add(k);
    }
    const thumb = pbSlab(0.5, 0.3, 0.5, 0.1, pbMat.gun); thumb.rotation.y = Math.PI / 2; thumb.position.set(0.25, -0.75, 0.35 * mz); thumb.rotation.z = 0.3; fist.add(thumb);
    const wristSocket = pbSlab(0.92, 1.08, 1.22, 0.2, pbMat.black); wristSocket.rotation.y = Math.PI / 2; wristSocket.position.x = -0.86; fist.add(wristSocket);
    const wristGuard = pbCyl(0.43, 0.47, 0.22, 8, pbMat.red); wristGuard.rotation.z = Math.PI / 2; wristGuard.position.set(-1.2, 0, 0); fist.add(wristGuard);

    // Upper-arm attachment point: the housing socket the IK elbow terminates on.
    const elbowSocket = new THREE.Object3D();
    elbowSocket.position.set(3.10, 0.10, 0);
    root.add(elbowSocket);

    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    return { root, fore, carriage, fist, elbowSocket, gear, idler, backRam, backHead, stacks, glowMat };
  }
  function buildElbow() {
    const g = new THREE.Group();
    const core = pbCyl(0.42, 0.42, 1.06, 8, pbMat.black); g.add(core);
    const band = pbCyl(0.5, 0.52, 0.18, 8, pbMat.brass); band.position.y = 0.02; g.add(band);
    const capA = pbCyl(0.28, 0.28, 0.17, 6, pbMat.red); capA.position.y = 0.53; g.add(capA);
    const capB = capA.clone(); capB.position.y = -0.53; g.add(capB);
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    return g;
  }

  /* ---------- rig scene graph ---------- */
  // rigRoot plays the lab's `char` role: all lab math runs in rigRoot-local
  // space, scaled/placed by the host so the proxy shoulder coincides with the
  // wanderer's right-arm shoulder anchor.
  const rigRoot = new THREE.Group();
  rigRoot.visible = false;
  const hipsProxy = new THREE.Object3D(); hipsProxy.position.y = 0.95; rigRoot.add(hipsProxy);
  const chestProxy = new THREE.Object3D(); chestProxy.position.y = 0.34; hipsProxy.add(chestProxy);
  const shAnchor = new THREE.Object3D(); shAnchor.position.set(0.27, 0.20, 0.02); chestProxy.add(shAnchor);
  const pb = buildPilebunker();
  rigRoot.add(pb.root);
  const elbowG = buildElbow();
  rigRoot.add(elbowG);

  function applyPbRear() {
    pb.backRam.position.set(-0.52 - TUNE.rear * 0.72, 0.04, 0);
    pb.backHead.position.set(pb.backRam.position.x - 0.94, 0.04, 0);
  }
  applyPbRear();

  /* ---------- 2-bone analytic IK (lab original) ---------- */
  const _st = V3(), _pp = V3(), _perp = V3(), _e = V3(), _tc = V3();
  const ik = { elbow: V3(), wrist: V3() };
  function solveArm(S, T, pole, out) {
    _st.copy(T).sub(S);
    let d = _st.length();
    const reach = L1 + L2 - 1e-4;
    if (d > reach) d = reach;
    _st.normalize();
    _tc.copy(S).addScaledVector(_st, d);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    _pp.copy(pole).sub(S);
    _perp.copy(_pp).addScaledVector(_st, -_pp.dot(_st));
    if (_perp.lengthSq() < 1e-8) _perp.set(0, -1, 0);
    _perp.normalize();
    _e.copy(S).addScaledVector(_st, a).addScaledVector(_perp, h);
    out.elbow.copy(_e); out.wrist.copy(_tc);
  }

  /* ---------- rail / direction helpers (lab originals) ---------- */
  const _railD0 = V3(), _railD1 = V3();
  function sampleQuadRail(p0, p1, p2, t, outPos, outTan) {
    const u = 1 - t;
    outPos.copy(p0).multiplyScalar(u * u).addScaledVector(p1, 2 * u * t).addScaledVector(p2, t * t);
    _railD0.copy(p1).sub(p0).multiplyScalar(2 * u);
    _railD1.copy(p2).sub(p1).multiplyScalar(2 * t);
    outTan.copy(_railD0).add(_railD1);
    if (outTan.lengthSq() < 1e-8) outTan.copy(p2).sub(p0);
    return outTan.normalize();
  }
  const _dirA = V3(), _dirB = V3(), _dirAxis = V3(), _dirQ = new THREE.Quaternion();
  function slerpRailDir(a, b, t, planeNormal, out) {
    _dirA.copy(a).normalize(); _dirB.copy(b).normalize();
    const dot = clamp(_dirA.dot(_dirB), -1, 1);
    if (dot > .9995) return out.lerpVectors(_dirA, _dirB, t).normalize();
    if (dot < -.9995) {
      _dirAxis.copy(planeNormal);
      if (_dirAxis.lengthSq() < 1e-8 || Math.abs(_dirAxis.dot(_dirA)) > .98) {
        _dirAxis.crossVectors(_dirA, UP);
        if (_dirAxis.lengthSq() < 1e-8) _dirAxis.set(0, 0, 1);
      }
      _dirAxis.normalize();
      _dirQ.setFromAxisAngle(_dirAxis, Math.PI * t);
      return out.copy(_dirA).applyQuaternion(_dirQ).normalize();
    }
    _dirAxis.crossVectors(_dirA, _dirB).normalize();
    _dirQ.setFromAxisAngle(_dirAxis, Math.acos(dot) * t);
    return out.copy(_dirA).applyQuaternion(_dirQ).normalize();
  }

  /* ---------- state ---------- */
  const state = {
    active: false, t: 0, phase: 'READY', committed: false,
    hipT: 0, chestT: 0, lungeSm: 0,
    lungeProgress: 0,
    cooldown: 0,
  };
  const mech = {
    pist: 0, gearA: 0, recoil: 0, cock: 0, charge: 0,
    lastStep: -1, slammed: false, hitDone: false, hissDone: false,
    poseDir: V3(1, 0, 0), upDir: V3(0, 1, 0),
    railDir: V3(0, 0, 1), railEndDir: V3(0, 0, 1), railUp: V3(0, 1, 0), railZax: V3(1, 0, 0),
    guardDir: V3(0, 0, 1),
    windStart: V3(), windDirStart: V3(0, 0, 1),
    windCurve: null, poleCurve: null, dirCurve: null,
  };
  const events = { clicks: 0, slam: false, hiss: false, hit: false, strikeStarted: false };
  const wristT = V3(), poleT = V3();
  const fistWorld = V3(), prevFistWorld = V3();
  const _sPos = V3(), _tmp = V3(), _wp = V3();
  const _fwd = V3(), _yax = V3(), _zax = V3();
  const _curveDir = V3(), _curvePole = V3();
  const _railShoulder = V3(), _railPerp = V3();
  const _bm = new THREE.Matrix4();

  function shoulderLocal(out) {
    rigRoot.updateMatrixWorld(true);
    shAnchor.getWorldPosition(out);
    return rigRoot.worldToLocal(out);
  }

  /* ---------- play: lab startAttack ---------- */
  function play() {
    if (state.active || state.cooldown > 0) return false;
    state.active = true; state.t = 0; state.phase = 'PALM BRACE'; state.committed = false;
    state.hipT = 0; state.chestT = 0; state.lungeSm = 0; state.lungeProgress = 0;
    mech.lastStep = -1; mech.slammed = false; mech.hitDone = false; mech.hissDone = false;
    mech.pist = 0; mech.gearA = 0; mech.recoil = 0; mech.cock = 0; mech.charge = 0;
    events.clicks = 0; events.slam = false; events.hiss = false; events.hit = false; events.strikeStarted = false;
    hipsProxy.rotation.y = 0; chestProxy.rotation.y = 0;
    shAnchor.position.set(0.27, 0.20, 0.02);
    rigRoot.visible = true;

    // Start from the guard pose so the mechanism has a sane initial direction.
    shoulderLocal(_sPos);
    solveArm(_sPos, GUARD_W, GUARD_POLE, ik);
    mech.windDirStart.copy(ik.wrist).sub(ik.elbow).normalize();
    mech.windStart.copy(GUARD_W);
    mech.guardDir.copy(GUARD_W).sub(_sPos).normalize();

    // One continuous centripetal windup through the authored poses.
    mech.windCurve = new THREE.CatmullRomCurve3(
      [mech.windStart.clone(), FALCON.brace.clone(), FALCON.high.clone(), FALCON.coil.clone()],
      false, 'centripetal', .5);
    mech.poleCurve = new THREE.CatmullRomCurve3(
      [GUARD_POLE.clone(), FALCON.bracePole.clone(), FALCON.highPole.clone(), FALCON.coilPole.clone()],
      false, 'centripetal', .5);
    mech.dirCurve = new THREE.CatmullRomCurve3(
      [mech.windDirStart.clone(), FALCON.braceDir.clone(), FALCON.highDir.clone(), FALCON.coilDir.clone()],
      false, 'centripetal', .5);

    // The release is deliberately straight and frozen (lab launch rail).
    mech.railDir.copy(FALCON.impact).sub(FALCON.coil).normalize();
    mech.railEndDir.copy(FALCON.follow).sub(FALCON.impact).normalize();
    if (mech.railEndDir.lengthSq() < 1e-8) mech.railEndDir.copy(mech.railDir);
    _railShoulder.copy(_sPos);
    _railPerp.copy(FALCON.coil).sub(_railShoulder);
    _railPerp.addScaledVector(mech.railDir, -_railPerp.dot(mech.railDir));
    if (_railPerp.lengthSq() < 1e-6) _railPerp.set(0, 1, 0);
    mech.railUp.copy(_railPerp.normalize());
    mech.railZax.crossVectors(mech.railDir, mech.railUp).normalize();
    mech.railUp.crossVectors(mech.railZax, mech.railDir).normalize();

    fistWorld.set(0, 0, 0); prevFistWorld.set(0, 0, 0);
    return true;
  }

  function end() {
    state.active = false; state.phase = 'READY'; state.committed = false;
    state.cooldown = cooldown;
    rigRoot.visible = false;
  }

  /* ---------- per-frame update: lab updateCombat phase machine, right arm ---------- */
  // ctx: { shoulderR: Vector3 in rigRoot's parent space, time: seconds }
  function update(dt, ctx = {}) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    if (!state.active) return;
    const time = ctx.time || 0;

    // Place the rig so the proxy shoulder rest coincides with the game's
    // right-arm shoulder anchor.
    rigRoot.scale.setScalar(TUNE.rigScale);
    if (ctx.shoulderR) {
      rigRoot.position.set(
        ctx.shoulderR.x - REST_SHOULDER.x * TUNE.rigScale,
        ctx.shoulderR.y + TUNE.lift - REST_SHOULDER.y * TUNE.rigScale,
        ctx.shoulderR.z - REST_SHOULDER.z * TUNE.rigScale);
    }

    state.t += dt;
    const t = state.t;
    const W = wristT;

    let hipTw = 0, chestTw = 0, crouch = 0, lungeTarget = 0, shLead = 0, shAcross = 0;

    // Shared ratchet progression across the whole windup.
    const windCharge = clamp(t / B1, 0, 1);
    if (t < B1) {
      const stepF = Math.min(RATCHET_STEPS - 1e-4, windCharge * RATCHET_STEPS);
      const step = Math.floor(stepF);
      const pull = easeOutCubic(Math.min(1, (stepF - step) / .58));
      mech.pist = -((step + pull) / RATCHET_STEPS) * PB_MAX_RETRACT;
      mech.gearA = -(step + pull) * (Math.PI / 4);
      mech.charge = windCharge;
      mech.cock = .052 * windCharge;
      if (step !== mech.lastStep) {
        mech.lastStep = step; events.clicks++;
        if (step === RATCHET_STEPS - 1) mech.recoil = Math.max(mech.recoil, .055);
      }
    }

    if (t < B1) { /* one continuous authored windup spline */
      const p = easeInOutCubic(windCharge);
      mech.windCurve.getPointAt(p, W);
      mech.poleCurve.getPointAt(p, _curvePole); poleT.copy(_curvePole);
      mech.dirCurve.getPointAt(p, _curveDir);
      if (_curveDir.lengthSq() < 1e-8) _curveDir.copy(FALCON.coilDir);
      mech.poseDir.copy(_curveDir.normalize());

      const bodyP = smoothstep(p);
      hipTw = FALCON.coilHip * bodyP;
      chestTw = FALCON.coilChest * bodyP;
      crouch = .16 * Math.pow(bodyP, 1.28);
      const braceFrac = DUR.brace / B1, ratchetFrac = (DUR.brace + DUR.ratchet) / B1;
      state.phase = windCharge < braceFrac ? 'PALM BRACE' : (windCharge < ratchetFrac ? 'OVERHEAD RATCHET' : 'DEEP COIL');
    }
    else if (t < B2) { /* threatening stillness before release */
      const p = (t - B1) / DUR.hold;
      W.copy(FALCON.coil);
      W.x += Math.sin(time * 63) * .003 * (1 - p);
      W.y += Math.sin(time * 79) * .002 * (1 - p);
      poleT.copy(FALCON.coilPole);
      mech.poseDir.copy(FALCON.coilDir);
      mech.pist = -PB_MAX_RETRACT + Math.sin(time * 92) * .010;
      mech.cock = .052;
      mech.charge = 1;
      hipTw = FALCON.coilHip;
      chestTw = FALCON.coilChest;
      crouch = .16;
      state.phase = 'FINAL HOLD';
    }
    else if (t < B3) { /* frozen linear launch rail */
      const p = (t - B2) / DUR.strike;
      if (!events.strikeStarted && !state.committed) { events.strikeStarted = true; state.committed = true; }
      const move = easeInQuart(p);
      W.lerpVectors(FALCON.coil, FALCON.impact, move);
      poleT.lerpVectors(FALCON.coilPole, FALCON.impactPole, easeInOutCubic(p));
      slerpRailDir(FALCON.coilDir, mech.railDir, easeInOutCubic(clamp(p / .42, 0, 1)), mech.railZax, mech.poseDir);

      const hp = easeOutCubic(clamp(p * 1.28, 0, 1));
      const cp = easeInOutCubic(clamp((p - .06) / .94, 0, 1));
      hipTw = lerp(FALCON.coilHip, FALCON.punchHip, hp);
      chestTw = lerp(FALCON.coilChest, FALCON.punchChest, cp);
      lungeTarget = .34 * move;
      shLead = .16 * move;
      shAcross = .070 * move;
      crouch = lerp(.16, .095, easeOutCubic(p));
      state.lungeProgress = Math.max(state.lungeProgress, move);

      const slamAt = TUNE.pileDelay, slamSpan = .16;
      if (p < slamAt) {
        mech.pist = -PB_MAX_RETRACT + Math.sin(time * 105) * .009;
        mech.cock = .052;
      } else {
        const k = easeOutCubic(clamp((p - slamAt) / slamSpan, 0, 1));
        mech.pist = -PB_MAX_RETRACT + (TUNE.throwExt + PB_MAX_RETRACT) * k;
        mech.cock = .052 * (1 - k);
        mech.gearA = -RATCHET_STEPS * (Math.PI / 4) - k * Math.PI * .65;
        if (k >= 1 && !mech.slammed) {
          mech.slammed = true;
          mech.recoil = .32;
          events.slam = true;
        }
      }
      if (!mech.hitDone && p >= TUNE.hitAt) { mech.hitDone = true; events.hit = true; }
      state.phase = 'BODY LAUNCH';
    }
    else if (t < B4) { /* committed body extension */
      const p = (t - B3) / DUR.impact;
      W.lerpVectors(FALCON.impact, FALCON.follow, easeOutCubic(clamp(p * 1.7, 0, 1)));
      poleT.copy(FALCON.impactPole);
      slerpRailDir(mech.railDir, mech.railEndDir, smoothstep(p), mech.railZax, mech.poseDir);
      hipTw = FALCON.punchHip;
      chestTw = FALCON.punchChest;
      lungeTarget = .34;
      shLead = .16; shAcross = .070;
      crouch = .095;
      mech.pist = TUNE.throwExt;
      mech.charge = 1 - p * .12;
      state.lungeProgress = 1;
      state.phase = 'IMPACT HOLD';
    }
    else if (t < B5) { /* piston visibly locked out */
      W.copy(FALCON.follow);
      poleT.copy(FALCON.impactPole);
      mech.poseDir.copy(mech.railEndDir);
      hipTw = FALCON.punchHip;
      chestTw = FALCON.punchChest;
      lungeTarget = .34;
      shLead = .16; shAcross = .070;
      crouch = .095;
      mech.pist = TUNE.throwExt;
      mech.cock = 0;
      mech.charge = .82;
      state.phase = 'PISTON LOCKED OUT';
    }
    else if (t < B6) { /* pneumatic retract */
      const raw = (t - B5) / DUR.retract;
      const p = easeInOutCubic(raw);
      if (!mech.hissDone) { mech.hissDone = true; events.hiss = true; }
      W.copy(FALCON.follow);
      poleT.copy(FALCON.impactPole);
      mech.poseDir.copy(mech.railEndDir);
      const settle = smoothstep(raw) * .10;
      hipTw = lerp(FALCON.punchHip, FALCON.punchHip * .90, settle);
      chestTw = lerp(FALCON.punchChest, FALCON.punchChest * .90, settle);
      lungeTarget = .34;
      shLead = .16; shAcross = .070;
      crouch = .095;
      mech.pist = lerp(TUNE.throwExt, 0, p);
      mech.gearA = lerp(-RATCHET_STEPS * (Math.PI / 4) - Math.PI * .65, 0, p);
      mech.cock = 0;
      mech.charge = lerp(.82, .35, p);
      state.phase = 'PNEUMATIC RETRACT';
    }
    else if (t < B7) { /* heavy recovery back to guard */
      const raw = (t - B6) / DUR.recover;
      const p = easeInOutCubic(raw);
      sampleQuadRail(FALCON.follow, FALCON.recoverMid, GUARD_W, p, W, _tmp);
      poleT.lerpVectors(FALCON.impactPole, GUARD_POLE, p);
      slerpRailDir(mech.railEndDir, mech.guardDir, p, mech.railZax, mech.poseDir);
      hipTw = FALCON.punchHip * .90 * (1 - p);
      chestTw = FALCON.punchChest * .90 * (1 - p);
      lungeTarget = .34 * (1 - p);
      shLead = .16 * (1 - p); shAcross = .070 * (1 - p);
      crouch = .095 * (1 - p);
      mech.pist = 0;
      mech.gearA = 0;
      mech.cock = 0;
      mech.charge = lerp(.35, 0, p);
      state.phase = 'HEAVY RECOVERY';
    }
    else {
      end();
      return;
    }

    // -------- body smoothing (lab constants) --------
    state.lungeSm = lerp(state.lungeSm, lungeTarget, 1 - Math.pow(.0001, dt));
    state.hipT = lerp(state.hipT, hipTw, 1 - Math.pow(.000001, dt));
    state.chestT = lerp(state.chestT, chestTw, 1 - Math.pow(.000001, dt));
    state.crouch = crouch;
    hipsProxy.rotation.y = state.hipT;
    chestProxy.rotation.y = state.chestT - state.hipT;
    shAnchor.position.set(0.27 - shAcross, 0.20, 0.02 + shLead);

    // -------- solve the arm and mount the mechanism (lab attacking branch) --------
    shoulderLocal(_sPos);
    solveArm(_sPos, W, poleT, ik);

    _fwd.copy(mech.poseDir).normalize();
    _zax.copy(mech.railZax);
    _yax.crossVectors(_zax, _fwd).normalize();
    _zax.crossVectors(_fwd, _yax).normalize();
    mech.upDir.copy(_yax);

    mech.recoil += (0 - mech.recoil) * Math.min(1, dt * 7);

    _bm.makeBasis(_fwd, _yax, _zax);
    pb.root.quaternion.setFromRotationMatrix(_bm);
    if (mech.cock) pb.root.rotateZ(mech.cock);

    const sc = TUNE.size;
    pb.root.scale.setScalar(sc);
    _wp.copy(ik.elbow).addScaledVector(_yax, TUNE.off * sc);
    if (_wp.x < .205) _wp.x = .205;   // keep the socket clear of the torso (right side)
    _tmp.copy(pb.elbowSocket.position).multiplyScalar(sc).applyQuaternion(pb.root.quaternion);
    pb.root.position.copy(_wp).sub(_tmp);

    elbowG.position.copy(_wp);
    elbowG.quaternion.setFromUnitVectors(UP, _zax);
    elbowG.scale.setScalar(sc);

    pb.carriage.position.x = mech.pist;
    pb.gear.rotation.z = mech.gearA;
    pb.idler.rotation.z = -mech.gearA * (.55 / .3);
    pb.fore.position.x = -mech.recoil;
    pb.glowMat.emissiveIntensity = mech.charge * (.8 + Math.sin(time * 20) * .2) * 2.4;
    const ext = Math.max(0, mech.pist) / TUNE.throwExt;
    pb.fist.scale.set(1 - ext * .06, 1 + ext * .04, 1 + ext * .04);

    prevFistWorld.copy(fistWorld);
    rigRoot.updateMatrixWorld(true);
    pb.fist.getWorldPosition(fistWorld);
    if (prevFistWorld.lengthSq() === 0) prevFistWorld.copy(fistWorld);
  }

  /* ---------- host-facing outputs ---------- */
  // Mutates a pose object (already IDLE-initialized by the host) so the
  // wanderer's torso performs the punch the same way weapon attacks do.
  function applyBodyPose(p) {
    if (!state.active) return p;
    p.twist += state.chestT * TUNE.twistGain;
    p.hipTwist += state.hipT * TUNE.hipGain;
    p.lower += (state.crouch || 0) * TUNE.lowerGain;
    p.lunge += state.lungeSm * TUNE.lungeGain;
    p.pitch += (state.crouch || 0) * .3;
    return p;
  }

  // Returns accumulated events since the last call and clears them.
  function consumeEvents() {
    const out = {
      clicks: events.clicks,
      slam: events.slam,
      hiss: events.hiss,
      hit: events.hit ? { point: fistWorld.clone(), prev: prevFistWorld.clone() } : null,
      strikeStarted: events.strikeStarted,
    };
    events.clicks = 0; events.slam = false; events.hiss = false; events.hit = false; events.strikeStarted = false;
    return out;
  }

  function attach(parent) { if (parent && rigRoot.parent !== parent) parent.add(rigRoot); }
  function dispose() {
    rigRoot.parent && rigRoot.parent.remove(rigRoot);
    rigRoot.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); } });
  }

  return {
    attach, play, update, applyBodyPose, consumeEvents, dispose,
    tune: TUNE,
    fistWorld, prevFistWorld,
    get active() { return state.active; },
    get phase() { return state.phase; },
    get committed() { return state.committed; },
    get cooldown() { return state.cooldown; },
    get cooldownTotal() { return cooldown; },
    get lungeProgress() { return state.lungeProgress; },
  };
}
