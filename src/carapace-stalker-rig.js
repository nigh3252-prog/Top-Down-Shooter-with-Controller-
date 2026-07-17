// Carapace Stalker visual rig — a procedural Phyrexian-style biped built from
// flat-shaded three.js primitives, matching the low-poly "PSX carve" look of the
// other rigs in this repo (see src/pot-goblin-rig.js). Original design; not tied
// to any trademarked creature.
//
// Silhouette (from the reference art): a hunched, forward-crouched horror carried
// on two big splayed digitigrade legs of raw pink-red muscle banded with pale
// bone. Its back is a huge curved cream carapace of stacked rib segments that
// sweeps up from the hips and curls back over. A red exposed-muscle core with
// white rib bones sits under the shell; a small red hook juts from the top; and
// a red serrated arm on one side ends in a chitinous beetle.
//
// Same injection pattern as the goblin rigs: pass THREE in, build materials once,
// then makeStalkerRig() to instantiate. Exposed sub-groups let the viewer pose
// and animate the creature (idle breathing / attack lunge / turntable).
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
      bone:     materials.bone     || new THREE.MeshStandardMaterial({ color: 0xe9e2cf, roughness: .66, metalness: .04, flatShading: true }),
      shell:    materials.shell    || new THREE.MeshStandardMaterial({ color: 0xded3ba, roughness: .72, metalness: .03, flatShading: true }),
      flesh:    materials.flesh    || new THREE.MeshStandardMaterial({ color: 0xc4574a, roughness: .62, emissive: 0x2c0806, emissiveIntensity: .28, flatShading: true }),
      muscle:   materials.muscle   || new THREE.MeshStandardMaterial({ color: 0xa8332b, roughness: .58, emissive: 0x320604, emissiveIntensity: .35, flatShading: true }),
      fleshDark:materials.fleshDark|| new THREE.MeshStandardMaterial({ color: 0x7c281f, roughness: .6,  flatShading: true }),
      tooth:    materials.tooth    || new THREE.MeshStandardMaterial({ color: 0xf1ebd9, roughness: .55, flatShading: true }),
      claw:     materials.claw     || new THREE.MeshStandardMaterial({ color: 0xd8c9ac, roughness: .5,  metalness: .08, flatShading: true }),
      chitin:   materials.chitin   || new THREE.MeshStandardMaterial({ color: 0x2b211c, roughness: .5,  metalness: .18, flatShading: true }),
      eye:      materials.eye      || new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0xff3a10, emissiveIntensity: 1.7, roughness: .4, flatShading: true })
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

  // Pale band ring around a limb — a thin flat-shaded torus.
  function band(radius, mat){
    const t = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * .16, 4, 10), mat);
    t.rotation.x = Math.PI / 2; t.castShadow = true;
    return t;
  }

  // Row of little bone teeth on a red sinew strip — the "zipper" ridge from the
  // art. Runs down local -Y, teeth pointing +Z (front). Add to a limb/torso group.
  function boneRidge(len, count, mats, teethScale = 1){
    const grp = new THREE.Group();
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len * .1, len, len * .05), mats.fleshDark);
    strip.position.set(0, -len / 2, len * .05); strip.castShadow = strip.receiveShadow = true;
    grp.add(strip);
    const th = len * .14 * teethScale;
    for(let i = 0; i < count; i++){
      const t = new THREE.Mesh(new THREE.ConeGeometry(len * .055 * teethScale, th, 4), mats.tooth);
      t.rotation.x = Math.PI / 2;                       // tip points +Z
      const f = i / (count - 1 || 1);
      t.position.set(0, -f * (len * .9) - len * .05, len * .08);
      t.castShadow = true;
      grp.add(t);
    }
    return grp;
  }

  // The hero shape: a big curved cream carapace of stacked rib arches sweeping up
  // from the hips and curling back, with a red muscle core showing beneath.
  function buildCarapace(mats){
    const g = new THREE.Group();
    // a raised arc that leans back and tapers to a point (not a full coil)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,  .00,  .20),
      new THREE.Vector3(0,  .50,  .30),
      new THREE.Vector3(0, 1.00,  .22),
      new THREE.Vector3(0, 1.42,  .00),
      new THREE.Vector3(0, 1.72, -.38),
      new THREE.Vector3(0, 1.88, -.82),
      new THREE.Vector3(0, 1.86,-1.24)
    ]);
    const width = u => (.28 + .48 * Math.sin(Math.PI * (0.10 + 0.80 * u))) * (1 - .34 * u);

    // red muscle core tube running the length of the shell (exposed under the ribs)
    const core = new THREE.Mesh(
      crumple(new THREE.TubeGeometry(curve, 26, .17, 6, false).toNonIndexed(), .02), mats.muscle);
    core.castShadow = core.receiveShadow = true; g.add(core);

    // cream base shell just outside the core — flattened into a wide plate
    const base = new THREE.Mesh(
      crumple(new THREE.TubeGeometry(curve, 26, .26, 6, false).toNonIndexed(), .02), mats.shell);
    base.castShadow = base.receiveShadow = true;
    base.scale.set(1.2, 1, .82);                        // wide + shallow, like a curved plate
    g.add(base);

    // stacked rib arches — half-tori oriented to the curve tangent, wrapping the
    // front a little (arc > PI) and tapering to the tip
    const RIBS = 16, up = new THREE.Vector3(0, 0, 1);
    for(let i = 0; i < RIBS; i++){
      const u = i / (RIBS - 1);
      const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
      const rib = new THREE.Mesh(
        crumple(new THREE.TorusGeometry(width(u), .075, 4, 9, Math.PI * 1.25).toNonIndexed(), .02), mats.bone);
      rib.quaternion.setFromUnitVectors(up, tan);       // hole-axis (+Z) -> tangent
      rib.rotation.z += Math.PI * .125;                 // centre the wider arc over the back
      rib.position.copy(p);
      rib.scale.set(1.12, .8, 1);
      rib.castShadow = rib.receiveShadow = true;
      g.add(rib);
    }
    return g;
  }

  // One big digitigrade hind leg of red muscle, pale banding, bone-tooth ridge,
  // clawed foot. Returns { group, thigh, shin, foot } for posing.
  function buildLeg(side, mats){
    const group = new THREE.Group();

    const thigh = limbSegment(.72, .32, .24, mats.flesh, 8);
    thigh.rotation.x = .62;                              // knee forward (bird leg)
    group.add(thigh);
    thigh.add(band(.29, mats.tooth)); const tb = band(.24, mats.tooth); tb.position.y = -.5; thigh.add(tb);

    const shin = limbSegment(.8, .22, .14, mats.flesh, 8);
    shin.rotation.x = -1.15;                             // ankle tucks back under body
    thigh.userData.end.add(shin);
    const sb = band(.18, mats.tooth); sb.position.y = -.4; shin.add(sb);

    const foot = new THREE.Group();
    const meta = limbSegment(.5, .12, .09, mats.flesh, 6);
    foot.rotation.x = .78;                               // toes forward onto the ground
    foot.add(meta);
    [-.2, 0, .2].forEach(dx => {
      const toe = limbSegment(.4, .08, .025, mats.claw, 5);
      toe.position.set(dx, 0, 0); toe.rotation.x = 1.15; toe.rotation.z = dx * .7;
      meta.userData.end.add(toe);
    });
    const dew = limbSegment(.26, .06, .02, mats.claw, 5);
    dew.rotation.x = -1.4; meta.add(dew);
    shin.userData.end.add(foot);

    // exposed red sinew + bone-tooth ridge down the front of thigh and shin
    const tRidge = boneRidge(.66, 6, mats); tRidge.position.z = .18; thigh.add(tRidge);
    const sRidge = boneRidge(.72, 7, mats); sRidge.position.z = .12; shin.add(sRidge);

    group.scale.x = side;                                // mirror left/right
    return { group, thigh, shin, foot };
  }

  // Chitinous beetle on a red serrated arm — the segmented appendage on one side.
  function buildBeetle(mats){
    const arm = new THREE.Group();
    let parent = arm, r = .15;
    for(let i = 0; i < 3; i++){                          // red serrated arm segments
      const s = limbSegment(.5, r, r * .78, mats.flesh, 6);
      s.rotation.z = (i === 0 ? .35 : -.28);
      s.rotation.x = .12;
      parent.add(s);
      const ridge = boneRidge(.44, 4, mats, .8); ridge.position.z = r * .8; s.add(ridge);
      parent = s.userData.end; r *= .8;
    }
    // beetle body: rounded dark carapace + a split wing seam + legs + little head
    const beetle = new THREE.Group(); parent.add(beetle);
    const body = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.3, 0).toNonIndexed(), .03), mats.chitin);
    body.scale.set(1, .62, 1.35); body.castShadow = true; beetle.add(body);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.02, .06, .55), mats.fleshDark);
    seam.position.set(0, .18, 0); beetle.add(seam);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.12, 0), mats.chitin);
    head.position.set(0, 0, .38); head.castShadow = true; beetle.add(head);
    for(let s = -1; s <= 1; s += 2){
      for(let k = 0; k < 3; k++){
        const leg = limbSegment(.34, .04, .015, mats.chitin, 4);
        leg.position.set(s * .22, -.05, .22 - k * .24);
        leg.rotation.z = s * 1.15; leg.rotation.x = .3 - k * .3;
        beetle.add(leg);
      }
    }
    return arm;
  }

  // Small curved red hook that juts from the top of the shell.
  function buildHook(mats){
    const g = new THREE.Group();
    const s1 = new THREE.Mesh(crumple(new THREE.ConeGeometry(.09, .6, 4).toNonIndexed(), .015), mats.flesh);
    s1.scale.set(1, 1, .55); s1.position.y = .3; s1.castShadow = true; g.add(s1);
    const j = new THREE.Group(); j.position.y = .58; j.rotation.z = -.9; g.add(j);
    const s2 = new THREE.Mesh(crumple(new THREE.ConeGeometry(.055, .45, 4).toNonIndexed(), .012), mats.muscle);
    s2.scale.set(1, 1, .5); s2.position.y = .22; s2.castShadow = true; j.add(s2);
    return g;
  }

  // Build the full creature under `root`. Returns named groups for the viewer.
  function makeStalkerRig({ root, mats, scale = 1 }){
    const model = new THREE.Group(); model.name = 'stalker'; model.scale.setScalar(scale);
    root.add(model);

    // low hips carry a hunched, forward-leaning body over the big legs
    const hipRoot = new THREE.Group(); hipRoot.name = 'stalker hipRoot';
    hipRoot.position.y = 1.18; model.add(hipRoot);

    const hips = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.4, 0).toNonIndexed(), .05), mats.muscle);
    hips.scale.set(1.5, .8, 1.05); hips.castShadow = hips.receiveShadow = true; hipRoot.add(hips);

    // torso core + carapace pivot, leaning forward off the hips
    const torsoRoot = new THREE.Group(); torsoRoot.name = 'stalker torsoRoot';
    torsoRoot.position.set(0, .12, .05); torsoRoot.rotation.x = .12; hipRoot.add(torsoRoot);

    // red exposed muscle core at the front-lower torso, striped with dark red +
    // a couple of pale rib bones (the exposed ribcage in the art)
    const chest = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.5, 0).toNonIndexed(), .05), mats.flesh);
    chest.scale.set(1.15, 1.1, .95); chest.position.set(0, .35, .28); chest.castShadow = chest.receiveShadow = true;
    torsoRoot.add(chest);
    for(let i = 0; i < 4; i++){
      const rib = new THREE.Mesh(new THREE.TorusGeometry(.34 - i * .015, .035, 4, 8, Math.PI * 1.1), mats.tooth);
      rib.rotation.set(Math.PI / 2, 0, .1); rib.position.set(0, .12 + i * .2, .5);
      torsoRoot.add(rib);
    }

    const carapaceRoot = new THREE.Group(); carapaceRoot.name = 'stalker carapaceRoot';
    carapaceRoot.position.set(0, .2, .0); carapaceRoot.rotation.x = -.12; carapaceRoot.scale.setScalar(.95);
    torsoRoot.add(carapaceRoot);
    carapaceRoot.add(buildCarapace(mats));

    // small forward maw with glowing eyes, tucked low at the front of the core
    const headRoot = new THREE.Group(); headRoot.name = 'stalker headRoot';
    headRoot.position.set(0, .2, .7); torsoRoot.add(headRoot);
    const skull = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.24, 0).toNonIndexed(), .04), mats.chitin);
    skull.scale.set(.95, .8, 1.2); skull.castShadow = true; headRoot.add(skull);
    const jaw = new THREE.Mesh(new THREE.ConeGeometry(.16, .38, 5), mats.bone);
    jaw.rotation.x = -Math.PI / 2; jaw.position.set(0, -.08, .22); headRoot.add(jaw);
    [-.1, .1].forEach(dx => {
      const eye = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 4), mats.eye);
      eye.rotation.x = -Math.PI / 2; eye.position.set(dx, .05, .2); headRoot.add(eye);
    });

    // small red hook off the upper back of the shell
    const hook = new THREE.Group(); hook.name = 'stalker hook';
    hook.position.set(.12, 1.25, -.15); hook.rotation.set(-.3, 0, .2); carapaceRoot.add(hook);
    hook.add(buildHook(mats));

    // beetle arm off the right of the torso
    const beetle = new THREE.Group(); beetle.name = 'stalker beetle';
    beetle.position.set(.62, .5, .25); beetle.rotation.set(.1, -.3, -.7); torsoRoot.add(beetle);
    beetle.add(buildBeetle(mats));

    // the two splayed hind legs
    const L = buildLeg(1, mats);  L.group.position.set(-.4, 0, 0); L.group.rotation.set(0,  .14, .12);  hipRoot.add(L.group);
    const R = buildLeg(-1, mats); R.group.position.set(.4, 0, 0);  R.group.rotation.set(0, -.14, -.12); hipRoot.add(R.group);

    return { model, hipRoot, torsoRoot, carapaceRoot, headRoot, hook, beetle, legL: L, legR: R };
  }

  // Drive the creature. `t` is seconds; `amt` 0..1 eases the idle stance into the
  // attack lunge, so callers get smooth two-way transitions by animating `amt`.
  const POSE = { idle: 'idle', lunge: 'lunge' };
  function poseStalker(rig, t, amt = 0){
    const bob = Math.sin(t * 1.8) * .03;
    const sway = Math.sin(t * 1.05) * .04;

    // breathing on the shell + idle flourishes (fade out as the lunge takes over)
    rig.carapaceRoot.scale.setScalar(1 + Math.sin(t * 1.8) * .012);
    rig.headRoot.rotation.z = Math.sin(t * 1.3) * .06 * (1 - amt);
    rig.beetle.rotation.z = -.7 + Math.sin(t * 1.6) * .12 * (1 - amt);
    rig.hook.rotation.z = lerp(.2 + Math.sin(t * .9) * .06, .8, amt);

    // hips: idle bob -> deeper crouch and forward pitch (the lunge)
    rig.hipRoot.position.y = lerp(1.18 + bob, .92 + bob * .3, amt);
    rig.hipRoot.rotation.x = lerp(0, .28, amt);
    rig.torsoRoot.rotation.x = lerp(.12 + Math.sin(t * .9) * .025, -.12, amt);
    rig.headRoot.rotation.x = lerp(0, .5, amt);          // maw thrusts forward/down

    const stance = (leg, tS, sS, k) => {
      leg.thigh.rotation.x = lerp(.62 + tS, .95, amt);
      leg.shin.rotation.x  = lerp(-1.15 - sS, -1.5, amt);
      leg.foot.rotation.x  = lerp(.78, .95, amt) + Math.sin(t * 2 + k) * .02 * (1 - amt);
    };
    stance(rig.legL,  sway, sway, 0);
    stance(rig.legR, -sway, -sway, 1);
  }

  return { buildStalkerMaterials, makeStalkerRig, poseStalker, POSE, crumple, limbSegment, boneRidge };
}

export default installCarapaceStalkerRig;
