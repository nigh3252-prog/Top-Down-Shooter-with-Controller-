// Shared goblin visual rig — the articulated goblin model (body/belly/belt/head/
// ears/eye/mouth + a held stone weapon), its materials, the telegraph/token/health
// markers update, the attack glow, and the death shatter. Extracted verbatim from
// src/enemies.js so both createCombatEnemySystem (weapon-lab combat) and the arena's
// createArenaEnemySystem render the same goblins.
//
// Usage: const rig = installGoblinRig(THREE);
// Materials are built by rig.buildGoblinMaterials(overrides) and passed back into the
// builders, so callers keep ownership of the per-kind body materials.

import { buildGoblinWeapon } from './goblin-weapons.js';

export function installGoblinRig(THREE){
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const tmp = new THREE.Vector3();

  function meshLocalBox(w,h,d,mat,jit=0,pos=[0,0,0]){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(pos[0],pos[1],pos[2]); m.castShadow = m.receiveShadow = true; return m; }
  function meshLocalIco(r,mat,pos=[0,0,0]){ const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r,0), mat); m.position.set(pos[0],pos[1],pos[2]); m.castShadow = m.receiveShadow = true; return m; }

  // The non-per-kind materials (per-kind body colors stay with the caller). Same
  // injection pattern as the old inline matByKind: each falls back to a default.
  function buildGoblinMaterials(materials = {}){
    return {
      flash: materials.flash || new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .9, roughness: .45, flatShading: true }),
      windup: materials.windup || new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0x7a4a00, emissiveIntensity: .7, roughness: .5, flatShading: true }),
      active: materials.active || new THREE.MeshStandardMaterial({ color: 0xff4f4f, emissive: 0xaa1010, emissiveIntensity: .9, roughness: .45, flatShading: true }),
      goblinBelly: materials.goblinBelly || new THREE.MeshStandardMaterial({ color: 0xbfd582, roughness: .85, flatShading: true }),
      goblinArmor: materials.goblinArmor || new THREE.MeshStandardMaterial({ color: 0x543820, roughness: .8, flatShading: true }),
      goblinEye: materials.goblinEye || new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffc34d, emissiveIntensity: .45, roughness: .4, flatShading: true }),
      matSilver: materials.matSilver || new THREE.MeshStandardMaterial({ color: 0xb8c4c0, metalness: .15, roughness: .48, flatShading: true }),
      matBronze: materials.matBronze || new THREE.MeshStandardMaterial({ color: 0xa8793a, metalness: .08, roughness: .55, flatShading: true }),
      matGlow: materials.matGlow || new THREE.MeshStandardMaterial({ color: 0x8dd2ff, emissive: 0x2c8eff, emissiveIntensity: .35, roughness: .4, flatShading: true }),
      matLeather: materials.matLeather || new THREE.MeshStandardMaterial({ color: 0x5a3420, roughness: .82, flatShading: true }),
      matIron: materials.matIron || new THREE.MeshStandardMaterial({ color: 0x788078, metalness: .12, roughness: .5, flatShading: true })
    };
  }

  // Articulated goblin rig. `bodyMat` is the per-kind body/head/ears material; `mats`
  // is a buildGoblinMaterials() bag (belly/armor/eye + weapon metals); `weaponDef` is
  // a STONE_WEAPONS entry (or null to hold no weapon — the weaponRoot is still built
  // so callers can hide it and attach their own prop).
  function makeGoblinRig({ kind, root, s, bodyMat, mats, weaponDef, showRig = false }){
    const pelvis = new THREE.Group(); pelvis.name = 'goblin pelvis'; root.add(pelvis);
    const torsoRoot = new THREE.Group(); torsoRoot.name = 'goblin torsoRoot'; pelvis.add(torsoRoot);
    const headRoot = new THREE.Group(); headRoot.name = 'goblin headRoot'; torsoRoot.add(headRoot);
    const weaponRigRoot = new THREE.Group(); weaponRigRoot.name = 'goblin weaponRigRoot'; torsoRoot.add(weaponRigRoot);
    const weaponRoot = new THREE.Group(); weaponRoot.name = `${kind} weaponRoot`; weaponRigRoot.add(weaponRoot);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius, Math.max(.1, s.height - s.radius * 2), 6, 14), bodyMat);
    body.position.y = s.height * .5; body.scale.set(1, 1, .9); body.castShadow = body.receiveShadow = true; torsoRoot.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(s.radius * .62, 12, 8), new THREE.MeshStandardMaterial({ color:s.bellyColor, roughness:.86, flatShading:true }));
    belly.scale.set(1,.72,.16); belly.position.set(0, s.height*.44, s.radius*.82); torsoRoot.add(belly);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(s.radius*1.03, s.radius*1.05, .09, 16), new THREE.MeshStandardMaterial({ color:s.armorColor, roughness:.78, flatShading:true }));
    belt.position.y = s.height*.38; torsoRoot.add(belt);
    const head = new THREE.Mesh(new THREE.SphereGeometry(s.radius*.72, 14, 10), bodyMat); head.scale.set(1,.82,.9); head.position.y = s.height*.82; headRoot.add(head);
    const ears = [];
    const earGeo = new THREE.ConeGeometry(s.radius*.23, s.radius*.42, 4); [-1,1].forEach(side=>{ const ear = new THREE.Mesh(earGeo, bodyMat); ear.position.set(side*s.radius*.62, s.height*.84, s.radius*.02); ear.rotation.z = -side*Math.PI*.5; ear.rotation.y = side*.25; headRoot.add(ear); ears.push(ear); });
    const eye = new THREE.Mesh(new THREE.BoxGeometry(s.radius*.78, s.radius*.11, s.radius*.06), mats.goblinEye); eye.position.set(0, s.height*.86, s.radius*.58); headRoot.add(eye);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(s.radius*.42, s.radius*.055, s.radius*.04), mats.goblinArmor); mouth.position.set(0, s.height*.77, s.radius*.6); headRoot.add(mouth);
    const RIG = buildGoblinWeapon({ THREE, kind, weaponRoot, mats });
    const weaponParts = {};
    weaponRoot.rotation.x = .35; weaponRoot.position.set(s.radius*1.02, s.height*.54, s.radius*.22);
    const goblinGlow = new THREE.Mesh(new THREE.SphereGeometry(s.radius * .72, 12, 8), new THREE.MeshBasicMaterial({ color:0xffd36a, transparent:true, opacity:0, depthWrite:false }));
    goblinGlow.visible = false; torsoRoot.add(goblinGlow);
    const rigDebug = new THREE.Group(); rigDebug.name = 'goblin invisible puppet rig debug'; rigDebug.visible = showRig; root.add(rigDebug);
    const axis = new THREE.Mesh(new THREE.BoxGeometry(.025, s.height, .025), mats.windup); axis.position.y = s.height*.5; rigDebug.add(axis);
    return { bodyRoot:pelvis, pelvis, torsoRoot, headRoot, weaponRigRoot, weaponRoot, weaponParts, RIG, body, belly, belt, head, ears, eye, mouth, goblinGlow, rigDebug };
  }

  // Health bar / telegraph ring / token ring update. `mats` needs {windup, active}.
  function updateSharedEnemyMarkers(e, h, mats){
    e.barBg.position.set(0, h + .32, 0); e.bar.position.y = e.barBg.position.y;
    if(e.telegraph){ e.telegraph.position.y = .035; e.telegraph.scale.setScalar(e.attack ? e.attack.range : e.stop); e.telegraph.visible = e.state === 'windup' || e.state === 'active'; e.telegraph.material = e.state === 'active' ? mats.active : mats.windup; }
    if(e.tokenRing) e.tokenRing.visible = !!e.token;
  }
  // Goblin body scale + attack/flash glow, then the shared markers.
  function applyGoblinVisual(e, heightScale, mats){
    const h = e.height * heightScale;
    if(e.bodyRoot) e.bodyRoot.scale.setScalar(heightScale);
    updateSharedEnemyMarkers(e, h, mats);
    if(e.goblinGlow){
      const attacking = e.state === 'windup' || e.state === 'active';
      e.goblinGlow.visible = e.flash > 0 || attacking;
      e.goblinGlow.material.opacity = clamp((e.flash * 2.8) + (e.state === 'active' ? .28 : (e.state === 'windup' ? .16 : 0)), 0, .55);
      e.goblinGlow.material.color.setHex(e.state === 'active' ? 0xff6b55 : (e.flash > 0 ? 0xffffff : 0xffd36a));
      e.goblinGlow.position.y = e.height * .52;
      e.goblinGlow.scale.set(1.2, e.height * 1.1, 1.0);
    }
  }

  // Death shatter — spits the rig parts into free-flying pieces.
  function addDeathPieceFromObject(worldRoot, deathPieces, obj, geo, mat, knock, spread = 1){
    const pieceGeo = geo || obj.geometry?.clone?.() || new THREE.BoxGeometry(.2, .2, .2);
    const pieceMat = mat || obj.material;
    const mesh = new THREE.Mesh(pieceGeo, pieceMat); obj.getWorldPosition(mesh.position); obj.getWorldQuaternion(mesh.quaternion); obj.getWorldScale(mesh.scale); mesh.castShadow = mesh.receiveShadow = true; worldRoot.add(mesh);
    const dir = new THREE.Vector3(knock.x || 0, 0, knock.z || 0); if(dir.lengthSq() < 1e-5) dir.set((Math.random()-.5), 0, (Math.random()-.5)); dir.normalize();
    const vel = dir.multiplyScalar((1.2 + Math.random() * 1.8) * spread).add(new THREE.Vector3((Math.random()-.5)*1.2, 1.4 + Math.random()*1.8, (Math.random()-.5)*1.2));
    deathPieces.push({ mesh, vel, ang:new THREE.Vector3((Math.random()-.5)*5, (Math.random()-.5)*5, (Math.random()-.5)*5), age:0 });
  }
  function shatterGoblin(worldRoot, deathPieces, e, knock, ironMat, power = 1){
    const add = (obj, geo, mat, spread) => addDeathPieceFromObject(worldRoot, deathPieces, obj, geo, mat, knock, spread * power);
    add(e.body, null, e.body.material, 1.05);
    if(e.belly) add(e.belly, null, e.belly.material, .95);
    if(e.head) add(e.head, null, e.head.material, 1.2);
    (e.ears || []).forEach(ear => add(ear, null, ear.material, 1.4));
    if(e.belt) add(e.belt, null, e.belt.material, 1.0);
    if(e.weaponRoot) add(e.weaponRoot, new THREE.BoxGeometry(.08, Math.max(.45, e.RIG?.bladeTip || .9), .08), ironMat, 1.35);
  }
  function updateDeathPieces(dt, deathPieces){
    for(let i = deathPieces.length - 1; i >= 0; i--){
      const p = deathPieces[i]; p.age += dt; p.vel.y -= 5.2 * dt; p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.ang.x * dt; p.mesh.rotation.y += p.ang.y * dt; p.mesh.rotation.z += p.ang.z * dt;
      if(p.mesh.position.y < .08){ p.mesh.position.y = .08; p.vel.y *= -.28; p.vel.x *= .75; p.vel.z *= .75; p.ang.multiplyScalar(.75); }
      if(p.age > 5){ p.mesh.parent && p.mesh.parent.remove(p.mesh); deathPieces.splice(i, 1); }
    }
  }

  return {
    clamp, meshLocalBox, meshLocalIco, buildGoblinMaterials, makeGoblinRig,
    updateSharedEnemyMarkers, applyGoblinVisual,
    addDeathPieceFromObject, shatterGoblin, updateDeathPieces
  };
}
