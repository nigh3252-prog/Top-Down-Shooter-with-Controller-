// Carapace Stalker visual rig — a procedural Phyrexian-style biped built from
// flat-shaded three.js primitives, matching the low-poly "PSX carve" look of the
// other rigs in this repo (see src/pot-goblin-rig.js). Original design; not tied
// to any trademarked creature.
//
// Silhouette: a hunched ribbed bone-white carapace torso carried on two long
// clawed raptor hind legs, exposed red sinew strips lined with white bone-tooth
// ridges running down the limbs and spine, a curved blade appendage sweeping up
// from one shoulder, and a small segmented insectoid leg on the other side.
//
// Same injection pattern as the goblin rigs: pass THREE in, build materials once,
// then makeStalkerRig() to instantiate. Exposed sub-groups let the viewer pose
// and animate the creature (idle breathing / attack lunge / turntable).
//
// Usage: const rig = installCarapaceStalkerRig(THREE);

export function installCarapaceStalkerRig(THREE){
  const TAU = Math.PI * 2;

  // Deterministic hand-carved jitter (hash on rounded position) — identical idea
  // to pot-goblin-rig.js crumple(), gives the organic faceted surface.
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
      bone:   materials.bone   || new THREE.MeshStandardMaterial({ color: 0xe7e3d4, roughness: .7,  metalness: .04, flatShading: true }),
      plate:  materials.plate  || new THREE.MeshStandardMaterial({ color: 0xd8d3c2, roughness: .78, metalness: .03, flatShading: true }),
      sinew:  materials.sinew  || new THREE.MeshStandardMaterial({ color: 0xa41f1a, roughness: .55, emissive: 0x2a0402, emissiveIntensity: .5, flatShading: true }),
      flesh:  materials.flesh  || new THREE.MeshStandardMaterial({ color: 0xc23026, roughness: .6,  emissive: 0x300604, emissiveIntensity: .4, flatShading: true }),
      chitin: materials.chitin || new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: .5,  metalness: .2,  flatShading: true }),
      tooth:  materials.tooth  || new THREE.MeshStandardMaterial({ color: 0xf1ecdd, roughness: .55, flatShading: true }),
      claw:   materials.claw   || new THREE.MeshStandardMaterial({ color: 0xb8a48a, roughness: .5,  metalness: .1,  flatShading: true }),
      eye:    materials.eye    || new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0xff3a10, emissiveIntensity: 1.7, roughness: .4, flatShading: true })
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

  // Row of little bone teeth on a red sinew strip — the "zipper" ridge from the
  // art. Runs down local -Y, teeth pointing +Z (front). Add to a limb/torso group.
  function boneRidge(len, count, mats, teethScale = 1){
    const grp = new THREE.Group();
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len * .09, len, len * .05), mats.sinew);
    strip.position.set(0, -len / 2, len * .045); strip.castShadow = strip.receiveShadow = true;
    grp.add(strip);
    const th = len * .12 * teethScale;
    for(let i = 0; i < count; i++){
      const t = new THREE.Mesh(new THREE.ConeGeometry(len * .05 * teethScale, th, 4), mats.tooth);
      t.rotation.x = Math.PI / 2;                       // tip points +Z
      const f = i / (count - 1 || 1);
      t.position.set(0, -f * (len * .92) - len * .04, len * .07);
      t.castShadow = true;
      grp.add(t);
    }
    return grp;
  }

  // Curved bone-white blade appendage from two flattened tapered cone segments.
  function buildBlade(mats){
    const g = new THREE.Group();
    const s1 = new THREE.Mesh(crumple(new THREE.ConeGeometry(.24, 1.1, 4).toNonIndexed(), .03), mats.bone);
    s1.scale.set(1, 1, .34); s1.position.y = .55; s1.castShadow = true; g.add(s1);
    const j = new THREE.Group(); j.position.y = 1.05; j.rotation.z = -.5; g.add(j);
    const s2 = new THREE.Mesh(crumple(new THREE.ConeGeometry(.15, 1.15, 4).toNonIndexed(), .025), mats.bone);
    s2.scale.set(1, 1, .3); s2.position.y = .55; s2.castShadow = true; j.add(s2);
    // red sinew seam up the inner edge
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.9, .06), mats.sinew);
    seam.position.set(-.16, .8, .02); g.add(seam);
    return g;
  }

  // Small segmented insectoid leg — shrinking chitin beads with red flecks.
  function buildBeetleLeg(mats){
    const g = new THREE.Group();
    let parent = g, r = .17, seg = 4;
    for(let i = 0; i < seg; i++){
      const s = limbSegment(.5, r, r * .7, mats.chitin, 6);
      s.rotation.z = (i === 0 ? .5 : -.35) + (i % 2 ? .15 : -.15);
      s.rotation.x = .1;
      parent.add(s);
      const fleck = new THREE.Mesh(new THREE.BoxGeometry(.03, .3, .04), mats.sinew);
      fleck.position.set(0, -.25, r * .8); s.add(fleck);
      parent = s.userData.end; r *= .72;
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.06, .28, 4), mats.claw);
    tip.rotation.x = Math.PI; parent.add(tip);
    return g;
  }

  // One raptor hind leg. Returns { group, thigh, shin, foot } for posing.
  function buildLeg(side, mats){
    const group = new THREE.Group();
    const thigh = limbSegment(1.15, .3, .22, mats.plate, 7);
    group.add(thigh);
    const shin = limbSegment(1.2, .2, .12, mats.plate, 7);
    thigh.userData.end.add(shin);
    // foot: flat metatarsal + splayed claws, pivots forward off the ankle
    const foot = new THREE.Group();
    const meta = limbSegment(.55, .12, .09, mats.plate, 6);
    foot.add(meta);
    const clawMat = mats.claw;
    [-.22, 0, .22].forEach((dx, k) => {
      const toe = limbSegment(.42, .08, .03, clawMat, 5);
      toe.position.set(dx, 0, 0); toe.rotation.x = 1.15; toe.rotation.z = dx * .6;
      meta.userData.end.add(toe);
    });
    const dew = limbSegment(.3, .06, .02, clawMat, 5);   // rear dewclaw
    dew.rotation.x = -1.3; meta.add(dew);
    shin.userData.end.add(foot);

    // exposed red sinew + bone-tooth ridge down the front of thigh and shin
    const tRidge = boneRidge(1.0, 7, mats); tRidge.position.z = .16; thigh.add(tRidge);
    const sRidge = boneRidge(1.05, 8, mats); sRidge.position.z = .1; shin.add(sRidge);

    group.scale.x = side;                                 // mirror left/right
    return { group, thigh, shin, foot };
  }

  // Build the full creature under `root`. Returns named groups for the viewer.
  function makeStalkerRig({ root, mats, scale = 1 }){
    const model = new THREE.Group(); model.name = 'stalker'; model.scale.setScalar(scale);
    root.add(model);

    // hips carry the whole upper body; legs plant to the ground from here
    const hipRoot = new THREE.Group(); hipRoot.name = 'stalker hipRoot';
    hipRoot.position.y = 2.35; model.add(hipRoot);

    const hips = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.42, 0).toNonIndexed(), .05), mats.plate);
    hips.scale.set(1.3, .8, 1); hips.castShadow = hips.receiveShadow = true; hipRoot.add(hips);

    // --- ribbed carapace torso, tilted forward over the hips ---
    const torsoRoot = new THREE.Group(); torsoRoot.name = 'stalker torsoRoot';
    torsoRoot.position.set(0, .15, .1); torsoRoot.rotation.x = -.55; hipRoot.add(torsoRoot);

    // shell: a lathe ovoid, bone-white plate
    const shellPts = [
      [.05, 0], [.5, .1], [.85, .35], [.95, .7], [.82, 1.05], [.5, 1.35], [.12, 1.5]
    ].map(([r, y]) => new THREE.Vector2(r * .95, y * 1.35));
    const shell = new THREE.Mesh(crumple(new THREE.LatheGeometry(shellPts, 9).toNonIndexed(), .03), mats.bone);
    shell.castShadow = shell.receiveShadow = true; torsoRoot.add(shell);

    // rib bands — dark chitin tori stacked up the shell
    for(let i = 0; i < 6; i++){
      const f = i / 5, y = .2 + f * 1.4;
      const rr = (Math.sin(f * Math.PI) * .55 + .35) * .95;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(rr, .05, 4, 12), mats.chitin);
      rib.rotation.x = Math.PI / 2; rib.position.y = y; rib.castShadow = true;
      torsoRoot.add(rib);
    }

    // back spine ridge of bone teeth up the shell
    const spineRoot = new THREE.Group(); spineRoot.name = 'stalker spineRoot';
    const spine = boneRidge(1.3, 9, mats, 1.1);
    spine.position.set(0, 1.45, -.55); spine.rotation.x = Math.PI + .35;   // teeth out the back
    spineRoot.add(spine); torsoRoot.add(spineRoot);

    // red under-belly seam of exposed flesh at the front
    const belly = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.25, .12), mats.flesh);
    belly.position.set(0, .75, .72); belly.castShadow = true; torsoRoot.add(belly);

    // --- head / maw, low and forward off the front of the torso ---
    const headRoot = new THREE.Group(); headRoot.name = 'stalker headRoot';
    headRoot.position.set(0, 1.45, .55); torsoRoot.add(headRoot);
    const skull = new THREE.Mesh(crumple(new THREE.IcosahedronGeometry(.34, 0).toNonIndexed(), .05), mats.chitin);
    skull.scale.set(.9, .8, 1.25); skull.castShadow = true; headRoot.add(skull);
    const jaw = new THREE.Mesh(new THREE.ConeGeometry(.22, .5, 5), mats.bone);
    jaw.rotation.x = -Math.PI / 2; jaw.position.set(0, -.08, .3); headRoot.add(jaw);
    [-.14, .14].forEach(dx => {
      const eye = new THREE.Mesh(new THREE.ConeGeometry(.06, .14, 4), mats.eye);
      eye.rotation.x = -Math.PI / 2; eye.position.set(dx, .06, .28); headRoot.add(eye);
    });

    // --- blade appendage off the left shoulder, sweeping up ---
    const bladeArm = new THREE.Group(); bladeArm.name = 'stalker bladeArm';
    bladeArm.position.set(-.7, 1.15, .05); bladeArm.rotation.set(.2, 0, .7); torsoRoot.add(bladeArm);
    bladeArm.add(buildBlade(mats));

    // --- segmented insectoid leg off the right side ---
    const beetleLeg = new THREE.Group(); beetleLeg.name = 'stalker beetleLeg';
    beetleLeg.position.set(.75, .55, .2); beetleLeg.rotation.set(0, 0, -.4); torsoRoot.add(beetleLeg);
    beetleLeg.add(buildBeetleLeg(mats));

    // --- the two hind legs ---
    const L = buildLeg(1, mats);  L.group.position.set(-.42, 0, 0); hipRoot.add(L.group);
    const R = buildLeg(-1, mats); R.group.position.set(.42, 0, 0);  hipRoot.add(R.group);

    return {
      model, hipRoot, torsoRoot, spineRoot, headRoot, bladeArm, beetleLeg,
      legL: L, legR: R
    };
  }

  // Drive the creature. `t` is seconds; `amt` 0..1 eases the idle stance into the
  // attack lunge, so callers get smooth two-way transitions by animating `amt`.
  const POSE = { idle: 'idle', lunge: 'lunge' };
  const lerp = (a, b, k) => a + (b - a) * k;
  function poseStalker(rig, t, amt = 0){
    const bob = Math.sin(t * 1.8) * .04;
    const sway = Math.sin(t * 1.1) * .05;

    // torso breathing + idle head/blade flourishes (fade out as the lunge takes over)
    rig.torsoRoot.scale.setScalar(1 + Math.sin(t * 1.8) * .015);
    rig.headRoot.rotation.z = Math.sin(t * 1.3) * .05 * (1 - amt);
    rig.beetleLeg.rotation.z = -.4 + Math.sin(t * 1.6) * .1 * (1 - amt);

    // hips: idle bob -> deep crouch
    rig.hipRoot.position.y = lerp(2.35 + bob, 1.8 + bob * .3, amt);
    rig.hipRoot.rotation.x = lerp(0, .18, amt);

    // torso: idle sway -> forward thrust
    rig.torsoRoot.rotation.x = lerp(-.55 + Math.sin(t * .9) * .03, -.9, amt);

    // blade: idle rest -> cocked up and back
    rig.bladeArm.rotation.z = lerp(.7 + Math.sin(t * .8) * .06, 1.6, amt);
    rig.bladeArm.rotation.x = lerp(.2, -.4, amt);

    const stance = (leg, ti, si, fi, tl, sl, fl) => {
      leg.thigh.rotation.x = lerp(ti, tl, amt);
      leg.shin.rotation.x  = lerp(si, sl, amt);
      leg.foot.rotation.x  = lerp(fi, fl, amt);
    };
    // idle: gentle alternating sway | lunge: coiled crouch
    stance(rig.legL, .06 + sway, -.14 - sway, .1,  .5, -1.15, .7 + Math.sin(t * 2) * .03);
    stance(rig.legR, .06 - sway, -.14 + sway, .1,  .5, -1.15, .7 + Math.sin(t * 2 + 1) * .03);
  }

  return { buildStalkerMaterials, makeStalkerRig, poseStalker, POSE, crumple, limbSegment, boneRidge };
}

export default installCarapaceStalkerRig;
