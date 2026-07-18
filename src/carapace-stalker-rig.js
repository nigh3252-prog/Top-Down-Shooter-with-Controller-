// Carapace Stalker visual rig — a procedural creature built from flat-shaded
// three.js primitives, matching the low-poly "PSX carve" look of the other rigs
// in this repo (see src/pot-goblin-rig.js). Original design; not tied to any
// trademarked creature.
//
// Built component-by-component from the model sheets:
//  - HIND LEG: digitigrade Z-leg of ivory plates over gold sinew, gold "zipper"
//    ridge down the shin, splayed gold talons.
//  - TORSO: gold-filled ivory ribcage chest, a ribbed carapace curl sweeping up
//    the back and hooking forward over the shoulders, an ivory head-cap plate,
//    twin gold ports at the rear hips.
//  - FOREARM (the signature): a long limb whose length is BIFURCATED into two
//    ivory pod-halves with gold teeth lining the inner edges and a gold
//    vertebra column between — the whole forearm can gape open like a jaw.
//    An elbow leaf-wing plate sweeps back; gold claw digits plant the ground.
//  - BEETLE: pale-gold chitin beetle clinging to one forearm.
// Stance: bipedal humanoid frame moving on all fours — hunched, arms planted.
// Palette: pearl ivory + gold "gore" (per the reference sheets).
//
// Same injection pattern as the goblin rigs: pass THREE in, build materials once,
// then makeStalkerRig() to instantiate. Exposed sub-groups let the viewer pose
// and animate (idle breathing / rearing lunge with jaw-arms gaping / turntable).
//
// Usage: const rig = installCarapaceStalkerRig(THREE);

export function installCarapaceStalkerRig(THREE){
  const lerp = (a, b, k) => a + (b - a) * k;

  // Deterministic hand-carved jitter (hash on rounded position) — same idea as
  // pot-goblin-rig.js crumple(), gives the organic faceted surface.
  function crumple(geo, amt){
    const p = geo.attributes.position;
    for(let i = 0; i < p.count; i++){
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      const j = (h - Math.floor(h)) - .5;
      p.setXYZ(i, x + j * amt, y + Math.sin(h) * .5 * amt, z + Math.cos(h * 1.7) * .5 * amt);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
    return geo;
  }

  // Non-per-kind materials with defaults, override-able like buildGoblinMaterials.
  function buildStalkerMaterials(materials = {}){
    return {
      pearl:    materials.pearl    || new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: .42, metalness: .1,  flatShading: true }),
      pearlDull:materials.pearlDull|| new THREE.MeshStandardMaterial({ color: 0xe0d8c4, roughness: .55, metalness: .08, flatShading: true }),
      gold:     materials.gold     || new THREE.MeshStandardMaterial({ color: 0xd9b23f, roughness: .34, metalness: .75, emissive: 0x3a2604, emissiveIntensity: .35, flatShading: true }),
      goldDark: materials.goldDark || new THREE.MeshStandardMaterial({ color: 0xa87f28, roughness: .42, metalness: .7,  emissive: 0x2a1c04, emissiveIntensity: .3,  flatShading: true }),
      claw:     materials.claw     || new THREE.MeshStandardMaterial({ color: 0xecc95e, roughness: .24, metalness: .85, emissive: 0x4a3206, emissiveIntensity: .4,  flatShading: true }),
      chitin:   materials.chitin   || new THREE.MeshStandardMaterial({ color: 0xc4b083, roughness: .5,  metalness: .45, flatShading: true })
    };
  }

  // A tapered limb bone: pivot at the top, cylinder hanging down local -Y so the
  // joint at userData.end (y = -len) is where the next segment attaches.
  function limbSegment(len, rTop, rBot, mat, radial = 7){
    const g = new THREE.Group();
    const geo = crumple(new THREE.CylinderGeometry(rTop, rBot, len, radial, 1).toNonIndexed(), rTop * .1);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = -len / 2; m.castShadow = m.receiveShadow = true;
    g.add(m);
    const end = new THREE.Object3D(); end.position.y = -len; g.add(end);
    g.userData.end = end;
    return g;
  }

  // Row of gold teeth on a gold sinew strip — the "zipper" of exposed gore that
  // runs down limbs. Local -Y, teeth pointing +Z. Add to a limb group.
  function goldRidge(len, count, mats, teethScale = 1){
    const grp = new THREE.Group();
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len * .09, len, len * .05), mats.goldDark);
    strip.position.set(0, -len / 2, len * .05); strip.castShadow = strip.receiveShadow = true;
    grp.add(strip);
    const th = len * .13 * teethScale;
    for(let i = 0; i < count; i++){
      const t = new THREE.Mesh(new THREE.ConeGeometry(len * .05 * teethScale, th, 4), mats.gold);
      t.rotation.x = Math.PI / 2;
      const f = i / (count - 1 || 1);
      t.position.set(0, -f * (len * .9) - len * .05, len * .08);
      t.castShadow = true;
      grp.add(t);
    }
    return grp;
  }

  // Gold talon — polished curved claw cone.
  function talon(len, r, mats){
    const c = new THREE.Mesh(crumple(new THREE.ConeGeometry(r, len, 5).toNonIndexed(), r * .06), mats.claw);
    c.castShadow = true;
    return c;
  }

  // HIND LEG (leg model sheet): ivory-plated digitigrade Z-leg with a gold
  // ridge down the shin and three big gold talons + rear dewclaw.
  // Returns { group, thigh, shin, foot } for posing.
  function buildLeg(side, mats){
    const group = new THREE.Group();

    // thigh: big teardrop ivory plate over a gold inner core
    const thigh = limbSegment(.85, .3, .2, mats.pearl, 8);
    thigh.rotation.x = .55;
    group.add(thigh);
    const thighPlate = new THREE.Mesh(crumple(new THREE.ConeGeometry(.3, .9, 6).toNonIndexed(), .03), mats.pearl);
    thighPlate.rotation.x = Math.PI; thighPlate.scale.set(1, 1, .55);
    thighPlate.position.set(0, -.38, -.06); thighPlate.castShadow = true; thigh.add(thighPlate);
    const thighGore = goldRidge(.6, 5, mats, .9); thighGore.position.set(0, -.1, .17); thigh.add(thighGore);
    const knee = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .1, 8), mats.gold);
    knee.rotation.z = Math.PI / 2; knee.position.y = -.85; thigh.add(knee);

    // shin: slim ivory with the gold zipper down the front
    const shin = limbSegment(.95, .16, .1, mats.pearl, 7);
    shin.rotation.x = -1.3;
    thigh.userData.end.add(shin);
    const sRidge = goldRidge(.8, 8, mats, .85); sRidge.position.set(0, -.05, .1); shin.add(sRidge);

    // digitigrade foot: short metatarsal + three splayed gold talons + dewclaw
    const foot = new THREE.Group();
    foot.rotation.x = .85;
    const meta = limbSegment(.42, .11, .09, mats.pearlDull, 6);
    foot.add(meta);
    [-.16, 0, .16].forEach(dx => {
      const t = talon(.44, .075, mats);
      t.rotation.x = 1.35 + Math.abs(dx) * .4; t.rotation.z = dx * 2.2;
      t.position.set(dx * 1.4, -.42, .12);
      foot.add(t);
    });
    const dew = talon(.26, .05, mats);
    dew.rotation.x = -2.4; dew.position.set(0, -.3, -.1); foot.add(dew);
    shin.userData.end.add(foot);

    group.scale.x = side;
    return { group, thigh, shin, foot };
  }

  // BIFURCATED FOREARM (forearm model sheet): two ivory pod-halves hinged at the
  // shoulder/elbow, gold teeth lining the inner edges, gold vertebra column in
  // the split, elbow leaf-wing plate, gold claw digits at the tip.
  // jawA/jawB rotate around local Y to gape the arm open like a jaw.
  // Returns { group, jawA, jawB, wing } — group pivots at the shoulder.
  function buildForearm(side, mats){
    const group = new THREE.Group();
    const LEN = 1.85;

    // one pod-half: elongated lathe leaf-pod (round, tapers both ends) + teeth.
    function half(sign){
      const h = new THREE.Group();
      const prof = [
        [.02, 0], [.11, -.12], [.18, -.45], [.21, -.85], [.17, -1.3], [.1, -1.62], [.02, -1.85]
      ].map(([r, y]) => new THREE.Vector2(r, y * (LEN / 1.85)));
      const pod = new THREE.Mesh(crumple(new THREE.LatheGeometry(prof, 7).toNonIndexed(), .015), mats.pearl);
      pod.scale.set(.62, 1, 1);
      pod.position.set(sign * .12, 0, 0);
      pod.castShadow = pod.receiveShadow = true;
      h.add(pod);
      // gold teeth on the inner face, pointing across the split
      const N = 9;
      for(let i = 0; i < N; i++){
        const f = (i + .5) / N;
        const t = new THREE.Mesh(new THREE.ConeGeometry(.035, .11, 4), mats.gold);
        t.rotation.z = sign * Math.PI / 2;               // tip points inward
        t.position.set(sign * .05, -f * LEN * .82 - .12, 0);
        t.castShadow = true;
        h.add(t);
      }
      // two gold claw digits at the pod tip
      [.3, -.1].forEach((rx, k) => {
        const c = talon(.34, .055, mats);
        c.rotation.x = 1.45 - rx; c.position.set(sign * .09, -LEN + .06 + k * .02, .14 - k * .16);
        h.add(c);
      });
      return h;
    }
    const jawA = half(1), jawB = half(-1);
    group.add(jawA); group.add(jawB);

    // gold vertebra column running in the split
    const spine = new THREE.Group();
    const M = 11;
    for(let i = 0; i < M; i++){
      const f = (i + .5) / M;
      const v = new THREE.Mesh(new THREE.TorusGeometry(.055, .028, 4, 7), mats.goldDark);
      v.rotation.x = Math.PI / 2;
      v.position.y = -f * LEN * .9;
      v.castShadow = true;
      spine.add(v);
    }
    group.add(spine);

    // elbow leaf-wing: flattened ivory blade sweeping up-back from the shoulder
    const wing = new THREE.Group();
    const wb = new THREE.Mesh(crumple(new THREE.ConeGeometry(.24, 1.05, 5).toNonIndexed(), .03), mats.pearl);
    wb.scale.set(1, 1, .3); wb.position.y = .5; wb.castShadow = true;
    wing.add(wb);
    wing.position.set(0, -.05, -.12); wing.rotation.x = -2.55;   // point up and back
    group.add(wing);

    group.scale.x = side;
    return { group, jawA, jawB, wing };
  }

  // TORSO (torso model sheet): gold-filled ivory ribcage, carapace curl hooking
  // forward over the shoulders, ivory head-cap, twin gold ports at the rear.
  function buildTorso(mats){
    const g = new THREE.Group();

    // chest ribcage: ivory ellipsoid core with gold rib arches wrapped around it
    const chest = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.52, 1).toNonIndexed(), .04), mats.goldDark);
    chest.scale.set(.78, 1.05, .8); chest.castShadow = chest.receiveShadow = true;
    g.add(chest);
    for(let i = 0; i < 7; i++){
      const f = i / 6, y = -.42 + f * .95;
      const r = .3 * Math.sin(Math.PI * (.18 + .64 * f)) + .17;
      const ribG = new THREE.Mesh(
        crumple(new THREE.TorusGeometry(r, .05, 4, 9, Math.PI * 1.6).toNonIndexed(), .012), mats.pearl);
      ribG.rotation.set(Math.PI / 2, 0, -Math.PI * .3);
      ribG.position.y = y; ribG.scale.set(1.1, .9, 1);
      ribG.castShadow = true;
      g.add(ribG);
      const ribIn = new THREE.Mesh(new THREE.TorusGeometry(r * .8, .028, 4, 9, Math.PI * 1.5), mats.gold);
      ribIn.rotation.copy(ribG.rotation); ribIn.position.y = y; ribIn.scale.copy(ribG.scale);
      g.add(ribIn);
    }

    // carapace curl: ribbed shell sweeping up the back, hooking forward over top
    const curl = new THREE.Group(); curl.position.set(0, .28, -.14);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -.12, -.36),
      new THREE.Vector3(0,  .32, -.34),
      new THREE.Vector3(0,  .60, -.14),
      new THREE.Vector3(0,  .72,  .14),
      new THREE.Vector3(0,  .56,  .38),
      new THREE.Vector3(0,  .34,  .44)
    ]);
    const core = new THREE.Mesh(
      crumple(new THREE.TubeGeometry(curve, 22, .17, 6, false).toNonIndexed(), .015), mats.gold);
    core.castShadow = true; curl.add(core);
    const SEGS = 13, up = new THREE.Vector3(0, 0, 1);
    for(let i = 0; i < SEGS; i++){
      const u = i / (SEGS - 1);
      const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
      const w = (.24 + .1 * Math.sin(Math.PI * (.2 + .6 * u))) * (1 - .3 * u);
      const rib = new THREE.Mesh(
        crumple(new THREE.TorusGeometry(w, .07, 4, 8, Math.PI * 1.6).toNonIndexed(), .012), mats.pearl);
      rib.quaternion.setFromUnitVectors(up, tan);
      rib.rotation.z += Math.PI * .2;
      rib.position.copy(p);
      rib.scale.set(1.08, .85, 1);
      rib.castShadow = true;
      curl.add(rib);
    }
    g.add(curl);

    // head-cap: smooth ivory oval plate at the front of the curl, tilted forward
    const cap = new THREE.Group(); cap.position.set(0, .82, .46); cap.rotation.x = .8;
    const capM = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.4, 1).toNonIndexed(), .02), mats.pearl);
    capM.scale.set(.72, .28, 1); capM.castShadow = true;
    cap.add(capM);
    const capRim = new THREE.Mesh(new THREE.TorusGeometry(.3, .025, 4, 10), mats.gold);
    capRim.rotation.x = Math.PI / 2; capRim.scale.set(.85, 1.15, 1); capRim.position.y = .06;
    cap.add(capRim);
    g.add(cap);

    // twin gold ports at the rear hips
    [-.16, .16].forEach(dx => {
      const port = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, .22, 8, 1, true), mats.gold);
      port.rotation.x = 1.2; port.position.set(dx, -.5, -.3);
      g.add(port);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .2, 7), mats.goldDark);
      inner.rotation.x = 1.2; inner.position.set(dx, -.5, -.3);
      g.add(inner);
    });

    return { group: g, cap, curl };
  }

  // BEETLE: pale-gold chitin beetle clinging to a forearm.
  function buildBeetle(mats){
    const beetle = new THREE.Group();
    const body = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.24, 0).toNonIndexed(), .025), mats.chitin);
    body.scale.set(1, .58, 1.4); body.castShadow = true; beetle.add(body);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.016, .05, .48), mats.goldDark);
    seam.position.y = .13; beetle.add(seam);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), mats.chitin);
    head.position.set(0, -.02, .32); head.castShadow = true; beetle.add(head);
    for(let s = -1; s <= 1; s += 2){
      for(let k = 0; k < 3; k++){
        const leg = limbSegment(.3, .028, .01, mats.goldDark, 4);
        leg.position.set(s * .18, -.04, .18 - k * .2);
        leg.rotation.z = s * 1.2; leg.rotation.x = .25 - k * .25;
        beetle.add(leg);
      }
    }
    return beetle;
  }

  // Assemble the full creature under `root` in its all-fours stance.
  function makeStalkerRig({ root, mats, scale = 1 }){
    const model = new THREE.Group(); model.name = 'stalker'; model.scale.setScalar(scale);
    root.add(model);

    // hips carry the whole frame; the body leans forward onto the planted arms
    const hipRoot = new THREE.Group(); hipRoot.name = 'stalker hipRoot';
    hipRoot.position.set(0, 1.5, -.55); model.add(hipRoot);

    const torsoRoot = new THREE.Group(); torsoRoot.name = 'stalker torsoRoot';
    torsoRoot.position.set(0, .28, .3); torsoRoot.rotation.x = .5;   // hunch forward
    hipRoot.add(torsoRoot);
    const torso = buildTorso(mats);
    torsoRoot.add(torso.group);

    // shoulders at the front-top of the chest; arms plant down-forward
    const armL = buildForearm(1, mats);
    armL.group.position.set(-.52, .32, .48); armL.group.rotation.set(-.32, 0, .22);
    torsoRoot.add(armL.group);
    const armR = buildForearm(-1, mats);
    armR.group.position.set(.52, .32, .48); armR.group.rotation.set(-.32, 0, -.22);
    torsoRoot.add(armR.group);

    // beetle prey: hidden until the grab snaps shut, then clamped in the right
    // arm's jaw-split with its legs sticking out
    const beetle = buildBeetle(mats);
    beetle.position.set(0, -.95, .16); beetle.rotation.set(1.15, .25, .35);
    beetle.visible = false;
    armR.group.add(beetle);

    // hind legs from the hips
    const L = buildLeg(1, mats);  L.group.position.set(-.42, 0, -.1); L.group.rotation.set(0,  .1, .06);  hipRoot.add(L.group);
    const R = buildLeg(-1, mats); R.group.position.set(.42, 0, -.1);  R.group.rotation.set(0, -.1, -.06); hipRoot.add(R.group);

    return {
      model, hipRoot, torsoRoot,
      cap: torso.cap, curl: torso.curl,
      armL, armR, beetle, legL: L, legR: R
    };
  }

  // Drive the creature. `t` is seconds. `s` is the animation state:
  //   walk  0..1 — blend of the all-fours walking gait (diagonal step cycle)
  //   lunge 0..1 — blend of the reared-up lunge posture
  //   grabT       — seconds since the lunge-and-grab was triggered (< 0 = none).
  //                 Timeline: 0-.35 rear + gape, .45-.7 strike + snap shut,
  //                 > .6 the beetle prey appears clamped in the right jaw-arm
  //                 and struggles. Releasing (grabT < 0) hides the prey.
  const POSE = { idle: 'idle', walk: 'walk', lunge: 'lunge' };
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  function poseStalker(rig, t, s = {}){
    const walk = s.walk ?? 0, amt = s.lunge ?? 0;
    const grabT = s.grabT ?? -1;
    const bob = Math.sin(t * 1.7) * .03;
    const sway = Math.sin(t * 1.05) * .04;
    const ph = t * 4.2;                                  // walk cycle phase

    // grab timeline envelopes (only meaningful while lunging)
    const gape   = amt * (grabT < 0 ? .5 + Math.sin(t * 6) * .04
                 : lerp(smooth(grabT / .35), .14, smooth((grabT - .45) / .22)));
    const strike = amt * smooth((grabT - .4) / .28);     // arms whip forward at the snap
    const held   = grabT > .6 && amt > .05;              // prey clamped in the jaws

    // breathing through the ribcage + cap nod
    rig.torsoRoot.scale.setScalar(1 + Math.sin(t * 1.7) * .012);
    rig.cap.rotation.x = .75 + Math.sin(t * 1.2) * .04 * (1 - amt) + .35 * amt
                       + Math.sin(ph * 2) * .03 * walk;

    // hips: all-fours (bobbing with the gait) -> rear up, then pitch into the strike
    rig.hipRoot.position.y = lerp(1.5 + bob + Math.sin(ph * 2) * .05 * walk,
                                  1.72 + bob * .4 - .12 * strike, amt);
    rig.hipRoot.position.z = -.55 + .22 * strike;
    rig.hipRoot.rotation.x = lerp(0, -.34 + .3 * strike, amt);
    rig.hipRoot.rotation.z = Math.sin(ph) * .045 * walk * (1 - amt);
    rig.torsoRoot.rotation.x = lerp(.5 + Math.sin(t * .85) * .02, .16 + .22 * strike, amt);
    rig.torsoRoot.rotation.y = Math.sin(ph) * .06 * walk * (1 - amt);

    // arms: planted (stepping opposite the legs) -> raised, then whipped forward
    for(const [arm, k, phase] of [[rig.armL, 1, Math.PI], [rig.armR, -1, 0]]){
      const step = Math.sin(ph + phase) * .2 * walk;
      arm.group.rotation.x = lerp(-.32 + sway * .3 * k + step, -1.05 + .45 * strike, amt);
      arm.group.rotation.z = k * lerp(.22, .5 - .22 * strike, amt);
      arm.jawA.rotation.y =  gape;                       // halves swing apart
      arm.jawB.rotation.y = -gape;
      arm.jawA.position.x =  gape * .22;
      arm.jawB.position.x = -gape * .22;
    }

    // prey: appears at the snap, struggles in the clamp, vanishes on release
    rig.beetle.visible = held;
    if(held){
      const struggle = Math.max(.25, 1 - (grabT - .6) * .35);   // tires out slowly
      rig.beetle.rotation.y = .25 + Math.sin(t * 16) * .1 * struggle;
      rig.beetle.rotation.z = .35 + Math.sin(t * 21 + 1) * .08 * struggle;
    }

    // legs: gait swing / coiled crouch when reared
    const stance = (leg, k, phase) => {
      const sw = Math.sin(ph + phase) * walk;
      const lift = Math.max(0, Math.sin(ph + phase + Math.PI / 2)) * walk;
      leg.thigh.rotation.x = lerp(.55 + sway * k + sw * .3, .9, amt);
      leg.shin.rotation.x  = lerp(-1.3 - sway * k - sw * .28, -1.6, amt);
      leg.foot.rotation.x  = lerp(.85 - lift * .3, 1.0, amt) + Math.sin(t * 2 + k) * .02 * (1 - amt - walk * .5);
    };
    stance(rig.legL, 1, 0);
    stance(rig.legR, -1, Math.PI);
  }

  return { buildStalkerMaterials, makeStalkerRig, poseStalker, POSE, crumple, limbSegment, goldRidge };
}

export default installCarapaceStalkerRig;
