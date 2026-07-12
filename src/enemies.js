import { createCombatDirector, DEFAULT_DIRECTOR_SETTINGS } from './combat-director.js';
import { ENEMY_ATTACK_BY_KIND } from './enemy-attacks.js';
import { STANCE_CARDS } from './stance-cards.js';
import { STONE_WEAPONS } from './weapons.js';
import { installGoblinRig } from './goblin-rig.js';
import { createAttackInterpreter } from './attack-interpreter.js';

export const ENEMY_STATS = {
  chaser: { radius: .46, height: 3.15, hp: 38, speed: 4.2, stop: 1.35, color: 0xff8f72 },
  brute: { radius: .62, height: 3.55, hp: 72, speed: 2.9, stop: 1.85, color: 0xd96b6b },
  maceGoblin: { radius: .38, height: 1.75, hp: 32, speed: 4.55, stop: 1.58, color: 0x70b85b, bellyColor: 0xb6d17b, armorColor: 0x5c3b24, weapon: 'mace', stanceId: 'S02', role: 'light close attacker' },
  spearGoblin: { radius: .38, height: 1.9, hp: 36, speed: 3.8, stop: 2.55, color: 0x5fae7d, bellyColor: 0xc7d78a, armorColor: 0x3f5a35, weapon: 'spear', stanceId: 'S20', role: 'reach poker' }
};

export function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }
export function nextSpawnDelay(wave){ return clamp(2.2 - wave * .07, .95, 2.2); }
export function spawnCap(wave){ return 7 + wave * 2; }


const GOBLIN_KINDS = new Set(['maceGoblin', 'spearGoblin']);

export function createCombatEnemySystem({ THREE, worldRoot, dungeonScale = 6.5, materials = {}, directorOptions = {} }){
  const enemies = [];
  const group = new THREE.Group();
  group.name = 'Combat Enemies';
  worldRoot.add(group);
  const director = createCombatDirector({ ...DEFAULT_DIRECTOR_SETTINGS, ...directorOptions });
  let wave = 1;
  let kills = 0;
  let waveKills = 0;
  let spawnedThisWave = 0;
  let spawnTimer = 2.0;
  let nextId = 1;
  const tuning = { heightScale: 2, speedScale: 1, playerHp: 100, lastPlayerHit: '', waveSize: 6, idleRangeScale: 4.5 };

  const rig = installGoblinRig(THREE);
  const tmp = new THREE.Vector3();
  const weaponUp = new THREE.Vector3(0, 1, 0);
  const tipQ = new THREE.Quaternion();
  const rollQ = new THREE.Quaternion();
  const deathPieces = [];
  // Use the exact same materialized attack library and sampler as the player.
  // The old goblin path carried a private, increasingly stale copy of this code.
  const poseTools = createAttackInterpreter(THREE);
  const poseScratch = poseTools.P({ hold:[0,1,0], tip:[0,1,0] });
  const gripOffset = new THREE.Vector3();
  const goblinDebug = { showRig:false, spawnGoblins:true };
  const matByKind = {
    chaser: materials.chaser || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.chaser.color, roughness: .7, flatShading: true }),
    brute: materials.brute || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.brute.color, roughness: .72, flatShading: true }),
    maceGoblin: materials.maceGoblin || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.maceGoblin.color, roughness: .78, flatShading: true }),
    spearGoblin: materials.spearGoblin || new THREE.MeshStandardMaterial({ color: ENEMY_STATS.spearGoblin.color, roughness: .78, flatShading: true }),
    ...rig.buildGoblinMaterials(materials)
  };

  function setGoblinColors(kind, colors = {}){ const s = ENEMY_STATS[kind]; if(!s) return; if(colors.body != null){ s.color = colors.body; matByKind[kind]?.color?.setHex?.(colors.body); } if(colors.belly != null) s.bellyColor = colors.belly; if(colors.armor != null) s.armorColor = colors.armor; }
  function setGoblinRigDebug(value){ goblinDebug.showRig = !!value; enemies.forEach(e => { if(e.rigDebug) e.rigDebug.visible = goblinDebug.showRig; }); }
  function setSpawnGoblins(value){ goblinDebug.spawnGoblins = !!value; }

  function visualHeight(e){ return e.height * tuning.heightScale; }
  function applyBasicEnemyVisual(e){
    const h = visualHeight(e);
    e.body.position.y = h * .5; e.body.scale.set(1, tuning.heightScale, .92);
    e.eye.position.set(0, h * .62, e.radius * .88);
    rig.updateSharedEnemyMarkers(e, h, matByKind);
  }
  function applyEnemyVisual(e){ GOBLIN_KINDS.has(e.kind) ? rig.applyGoblinVisual(e, tuning.heightScale, matByKind) : applyBasicEnemyVisual(e); }

  function makeMesh(kind){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser;
    const root = new THREE.Group(); root.name = `${kind} enemy`;
    let visual;
    if(GOBLIN_KINDS.has(kind)) visual = rig.makeGoblinRig({ kind, root, s, bodyMat: matByKind[kind], mats: matByKind, weaponDef: STONE_WEAPONS[s.weapon], showRig: goblinDebug.showRig });
    else {
      const capsuleLength = Math.max(.1, s.height - s.radius * 2);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius, capsuleLength, 5, 12), matByKind[kind]);
      body.position.y = s.height * .5; body.scale.set(1, 1, .92); body.castShadow = body.receiveShadow = true; root.add(body);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(s.radius * .44, s.radius * .16, s.radius * .08), matByKind.flash); eye.position.set(0, s.height * .62, s.radius * .88); root.add(eye);
      visual = { body, eye };
    }
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .055, .035), matByKind.flash); barBg.position.set(0, s.height + .32, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.7, .065, .045), matByKind.chaser); bar.position.copy(barBg.position); bar.position.z += .012; root.add(barBg, bar);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(.72, .78, 36), matByKind.windup); telegraph.rotation.x = -Math.PI/2; telegraph.visible = false; root.add(telegraph);
    const tokenRing = new THREE.Mesh(new THREE.TorusGeometry(s.radius * 1.25, .025, 6, 32), matByKind.windup); tokenRing.position.y = .08; tokenRing.visible = false; root.add(tokenRing);
    return { root, ...visual, barBg, bar, telegraph, tokenRing };
  }

  function chooseSpawnKind(){ return Math.random() < .55 ? 'maceGoblin' : 'spearGoblin'; }
  function spawn(kind = chooseSpawnKind()){
    const s = ENEMY_STATS[kind] || ENEMY_STATS.chaser, visual = makeMesh(kind);
    const bounds = 4.9 * dungeonScale, side = Math.floor(Math.random() * 4), margin = 4;
    let x = 0, z = 0;
    if(side === 0){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = -bounds - margin; }
    else if(side === 1){ x = bounds + margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    else if(side === 2){ x = THREE.MathUtils.randFloat(-bounds, bounds); z = bounds + margin; }
    else { x = -bounds - margin; z = THREE.MathUtils.randFloat(-bounds, bounds); }
    visual.root.position.set(x, 0, z); group.add(visual.root);
    spawnedThisWave++;
    const stance = STANCE_CARDS.find(card => card.id === s.stanceId) || STANCE_CARDS.find(card => card.preferredWeapons?.includes?.(s.weapon)) || STANCE_CARDS[0];
    const e = { id: nextId++, kind, x, z, radius: s.radius, height: s.height, hp: s.hp, maxHp: s.hp, speed: s.speed, stop: s.stop, flash: 0, knockX: 0, knockZ: 0,
      state:'approach', stateTime:0, attack:null, token:null, facing:{x:0,z:1}, windup:0, active:0, recovery:0, hitDone:false, stunned:0, nearEligible:true, slotIndex:-1, deniedTimer:0, cooldown:THREE.MathUtils.randFloat(.2, 1.1), personality:THREE.MathUtils.randFloat(.85, 1.15), weaponId:s.weapon, stance, comboIndex:0, visualAttack:null, visualAttackKey:null, visualAttackTime:0, visualAttackContactAt:0, visualAttackRecoveryAt:0, visualAttackTotal:0, ...visual };
    applyEnemyVisual(e); enemies.push(e); return e;
  }

  function startWave(){
    waveKills = 0; spawnedThisWave = 0; spawnTimer = 1.0;
    const count = Math.max(1, Math.min(20, Math.round(tuning.waveSize)));
    const firstWaveMix = ['maceGoblin', 'spearGoblin', 'maceGoblin', 'spearGoblin'];
    for(let i = 0; i < count; i++) spawn(firstWaveMix[i % firstWaveMix.length]);
  }
  function clearDeathPieces(){ deathPieces.forEach(p => { if(p.mesh?.parent) p.mesh.parent.remove(p.mesh); }); deathPieces.length = 0; }
  function reset(){ director.reset(); enemies.splice(0).forEach(e => e.root.parent && e.root.parent.remove(e.root)); clearDeathPieces(); wave = 1; kills = 0; tuning.playerHp = 100; tuning.lastPlayerHit = ''; startWave(); }
  function finishWave(){ wave++; director.onWaveClear(); startWave(); }
  function damageEnemy(e, amount, knock = { x:0, z:0 }){ e.hp -= amount; e.flash = .12; e.stunned = Math.max(e.stunned, .18); director.releaseAllForEnemy(e); e.state = e.hp <= 0 ? 'dead' : 'stunned'; e.stateTime = 0; e.knockX += (knock.x || 0) * .65; e.knockZ += (knock.z || 0) * .65; if(e.hp <= 0){ kills++; waveKills++; const idx = enemies.indexOf(e); if(idx >= 0) enemies.splice(idx, 1); shatterEnemy(e, knock); e.root.parent && e.root.parent.remove(e.root); if(waveKills >= tuning.waveSize) finishWave(); return true; } return false; }

  const dist = (e,p) => Math.hypot(p.x - e.x, p.z - e.z) || 1;
  const norm = (x,z) => { const d = Math.hypot(x,z) || 1; return { x:x/d, z:z/d }; };
  function steer(e, x, z, amount, dt){ e.x += x * e.speed * tuning.speedScale * amount * dt; e.z += z * e.speed * tuning.speedScale * amount * dt; }
  function approach(e, p, dt){ const n = norm(p.x - e.x, p.z - e.z); steer(e, n.x, n.z, 1, dt); e.facing = n; }
  function idleDesired(e){ return (e.kind === 'brute' ? 3.2 : 2.6) * tuning.idleRangeScale; }
  function orbit(e, p, dt, amount=.55){ const away = norm(e.x - p.x, e.z - p.z); const side = e.id % 2 ? 1 : -1; const tangent = { x:-away.z * side, z:away.x * side }; const d = dist(e,p); const desired = idleDesired(e); const radial = d < desired - .4 ? 1 : (d > desired + 1.1 ? -1 : 0); const dir = norm(tangent.x * .85 - away.x * radial, tangent.z * .85 - away.z * radial); steer(e, dir.x, dir.z, amount, dt); e.facing = norm(p.x - e.x, p.z - e.z); }
  function moveToSlot(e, p, dt){ const slots = director.getDebugState().slots; const slot = slots[e.slotIndex]; if(!slot){ orbit(e,p,dt); return; } const tx = p.x + Math.cos(slot.angle) * slot.radius, tz = p.z + Math.sin(slot.angle) * slot.radius; const d = Math.hypot(tx-e.x, tz-e.z); const n = norm(tx-e.x, tz-e.z); if(d > .6) steer(e, n.x, n.z, .95, dt); else orbit(e,p,dt,.18); e.facing = norm(p.x - e.x, p.z - e.z); }
  function deniedBehavior(e, p, dt){ if(director.getMode() === 'battleCircle') return moveToSlot(e,p,dt); if(director.getMode() === 'nearFar' && !e.nearEligible){ const away = norm(e.x-p.x, e.z-p.z); if(dist(e,p) < 5 * tuning.idleRangeScale) steer(e, away.x, away.z, .7, dt); else orbit(e,p,dt,.45); return; } orbit(e,p,dt,e.kind === 'brute' ? .35 : .65); }
  function chooseAttack(e, p){ const a = ENEMY_ATTACK_BY_KIND[e.kind]; return a && dist(e,p) <= a.range + .65 ? a : null; }
  function prepareGoblinAttack(e){
    if(!GOBLIN_KINDS.has(e.kind) || !e.stance?.chain?.length) return;
    const key = e.stance.chain[e.comboIndex % e.stance.chain.length];
    e.comboIndex++;
    e.visualAttackKey = key;
    e.visualAttack = poseTools.ATTACKS[key] || null;
    e.visualAttackTime = 0;
    e.visualAttackContactAt = e.visualAttack?.contactAt || 0;
    e.visualAttackRecoveryAt = e.visualAttack?.comboAt || e.visualAttackContactAt;
    e.visualAttackTotal = e.visualAttack?.total || 0;
  }
  function startAttack(e, attack){
    prepareGoblinAttack(e);
    // Combat timing, the visible pose, and the hit now share one authored clock.
    // Keep enemy damage/token/cooldown balance, but identify the actual move.
    e.attack = e.visualAttack ? { ...attack, name:e.visualAttack.label, attackKey:e.visualAttackKey } : attack;
    e.state = 'windup'; e.stateTime = 0;
    e.windup = e.visualAttack?.contactAt || attack.windup;
    e.active = Math.max(.06, (e.visualAttack?.comboAt || 0) - e.windup) || attack.active;
    e.recovery = Math.max(.08, (e.visualAttack?.total || 0) - e.windup - e.active) || attack.recovery;
    e.hitDone = false;
    e.facing = norm((lastPlayer.x ?? e.x) - e.x, (lastPlayer.z ?? e.z) - e.z);
    director.grant(e, e.attack);
  }
  let lastPlayer = { x:0, z:0 };
  function hitPlayer(e, p){ if(p.invulnerable) return; const a = e.attack; const to = norm(p.x-e.x, p.z-e.z); const d = dist(e,p); const dot = to.x * e.facing.x + to.z * e.facing.z; const ang = Math.acos(clamp(dot, -1, 1)); if(d <= a.range + .45 && ang < (a.arc || 1)){ tuning.playerHp = Math.max(0, tuning.playerHp - a.damage); tuning.lastPlayerHit = `${e.kind} ${a.name} hit for ${a.damage}`; } }

  function applyGoblinPose(e){
    if(!GOBLIN_KINDS.has(e.kind) || !e.weaponRigRoot) return;
    const active = e.visualAttack && (e.state === 'windup' || e.state === 'active' || e.state === 'recovery');
    const p = active ? poseTools.sampleAttack(e.visualAttack, e.visualAttackTime, poseScratch) : poseTools.poseLerp(poseTools.IDLE, poseTools.IDLE, 0, poseScratch);
    const h = e.height, r = e.radius, holdScale = h * .30;
    e.pelvis.position.set((p.hip.x || 0) * h*.16, -(p.lower || 0) * h*.10, (p.hip.z || 0) * h*.10 + (p.lunge || 0) * r*.70);
    e.pelvis.rotation.y = p.hipTwist * .65;
    e.torsoRoot.rotation.set(p.pitch*.35, p.twist*.34, p.lean*.30);
    e.headRoot.rotation.set(p.head.y*.35, p.head.x*.42, 0);
    // Place the actual grip, rather than the weapon object's origin, on the
    // authored hold point. This is the same correction the player rig performs.
    tipQ.setFromUnitVectors(weaponUp, p.tip);
    rollQ.setFromAxisAngle(p.tip, p.roll);
    tipQ.premultiply(rollQ);
    const weaponScale = e.kind === 'spearGoblin' ? 1.08 : 1.0;
    gripOffset.set(0, e.RIG?.gripCenter ?? -.14, 0).applyQuaternion(tipQ).multiplyScalar(weaponScale);
    e.weaponRigRoot.position.set(0,0,0); e.weaponRigRoot.rotation.set(0,0,0); e.weaponRigRoot.scale.setScalar(1);
    e.weaponRoot.position.set(p.hold.x*holdScale, h*.46 + p.hold.y*holdScale, r*.28 + p.hold.z*holdScale).sub(gripOffset);
    e.weaponRoot.quaternion.copy(tipQ);
    e.weaponRoot.scale.setScalar(weaponScale);
  }


  function shatterEnemy(e, knock = { x:0, z:0 }){
    if(GOBLIN_KINDS.has(e.kind)){ rig.shatterGoblin(worldRoot, deathPieces, e, knock, matByKind.matIron); return; }
    const top = new THREE.Object3D(), mid = new THREE.Object3D(), bot = new THREE.Object3D();
    [top, mid, bot].forEach(o => e.body.add(o));
    top.position.set(0, e.height*.18, 0); mid.position.set(0, 0, 0); bot.position.set(0, -e.height*.18, 0);
    rig.addDeathPieceFromObject(worldRoot, deathPieces, top, new THREE.SphereGeometry(e.radius*.55, 8, 6), matByKind[e.kind] || matByKind.chaser, knock, 1.1);
    rig.addDeathPieceFromObject(worldRoot, deathPieces, mid, new THREE.BoxGeometry(e.radius*.9, e.height*.24, e.radius*.7), matByKind[e.kind] || matByKind.chaser, knock, 1.0);
    rig.addDeathPieceFromObject(worldRoot, deathPieces, bot, new THREE.SphereGeometry(e.radius*.48, 8, 6), matByKind[e.kind] || matByKind.chaser, knock, .9);
    rig.addDeathPieceFromObject(worldRoot, deathPieces, e.eye, null, e.eye.material, knock, 1.35);
  }
  function updateGoblinAttackState(e, dt, player){
    if(!GOBLIN_KINDS.has(e.kind) || !(e.state === 'windup' || e.state === 'active' || e.state === 'recovery')) return false;
    const total = e.visualAttackTotal || ((e.attack?.windup || 0) + (e.attack?.active || 0) + (e.attack?.recovery || 0)) || .75;
    const contactAt = e.visualAttackContactAt || Math.min(total, e.attack?.windup || total * .45);
    const recoveryAt = Math.max(contactAt, e.visualAttackRecoveryAt || contactAt + (e.attack?.active || .1));
    const prev = e.visualAttackTime || 0;
    e.facing = norm(player.x - e.x, player.z - e.z);
    e.visualAttackTime = Math.min(total, prev + dt);
    e.state = e.visualAttackTime >= recoveryAt ? 'recovery' : (e.visualAttackTime >= contactAt ? 'active' : 'windup');
    if(!e.hitDone && prev < contactAt && e.visualAttackTime >= contactAt){ hitPlayer(e, player); e.hitDone = true; }
    if(e.visualAttackTime >= total){ director.release(e); e.cooldown = (e.attack?.cooldown || 1) * e.personality; e.attack = null; e.visualAttack = null; e.state = 'approach'; e.stateTime = 0; }
    return true;
  }

  function collisionRadius(e){ return e.radius * (GOBLIN_KINDS.has(e.kind) ? tuning.heightScale * 1.18 : 1); }
  function resolveEnemySpacing(player){
    for(let pass = 0; pass < 2; pass++){
      for(let i = 0; i < enemies.length; i++){
        const a = enemies[i]; if(a.state === 'dead') continue;
        for(let j = i + 1; j < enemies.length; j++){
          const b = enemies[j]; if(b.state === 'dead') continue;
          let dx = b.x - a.x, dz = b.z - a.z;
          let d = Math.hypot(dx, dz);
          const minD = Math.max(.05, (collisionRadius(a) + collisionRadius(b)) * 1.06);
          if(d >= minD) continue;
          if(d < 1e-4){ const angle = ((a.id * 17 + b.id * 31) % 360) * Math.PI / 180; dx = Math.cos(angle); dz = Math.sin(angle); d = 1; }
          const push = (minD - d) * .5;
          const nx = dx / d, nz = dz / d;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
        }
        // Visual scale used to be ignored here, so enlarged goblins could stand
        // mathematically apart while visibly occupying the player and each other.
        let px = a.x - player.x, pz = a.z - player.z, pd = Math.hypot(px,pz);
        const playerMin = collisionRadius(a) + .68;
        if(pd < playerMin){
          if(pd < 1e-4){ const angle = (a.id * 2.399963) % (Math.PI*2); px = Math.cos(angle); pz = Math.sin(angle); pd = 1; }
          const push = playerMin - pd;
          a.x += px/pd * push; a.z += pz/pd * push;
        }
      }
    }
  }

  function updateEnemy(e, dt, player){
    e.flash = Math.max(0, e.flash - dt); e.stateTime += dt; e.cooldown = Math.max(0, e.cooldown - dt); e.stunned = Math.max(0, e.stunned - dt);
    if(e.state === 'stunned' && e.stunned <= 0){ e.state = 'approach'; e.stateTime = 0; }
    else if(updateGoblinAttackState(e, dt, player)){ /* authored goblin attack timing handled above */ }
    else if(e.state === 'windup'){ e.facing = norm(player.x - e.x, player.z - e.z); if(e.stateTime >= e.windup){ e.state = 'active'; e.stateTime = 0; } }
    else if(e.state === 'active'){ if(!e.hitDone){ hitPlayer(e, player); e.hitDone = true; } if(e.stateTime >= e.active){ e.state = 'recovery'; e.stateTime = 0; director.release(e); } }
    else if(e.state === 'recovery'){ if(e.stateTime >= e.recovery){ e.cooldown = (e.attack?.cooldown || 1) * e.personality; e.attack = null; e.state = 'approach'; e.stateTime = 0; } }
    else if(e.state !== 'dead'){
      const attack = chooseAttack(e, player);
      if(attack && e.cooldown <= 0 && director.canGrant(e, attack, { enemies, pressureBudget: director.settings.pressureBudget })) startAttack(e, attack);
      else if(attack && e.cooldown <= 0) deniedBehavior(e, player, dt);
      else if(director.getMode() === 'battleCircle') moveToSlot(e, player, dt);
      else if(dist(e, player) > e.stop * Math.min(tuning.idleRangeScale, 2.5)) approach(e, player, dt); else orbit(e, player, dt, .4);
    }
    e.x += e.knockX * dt; e.z += e.knockZ * dt; e.knockX *= Math.pow(.08, dt); e.knockZ *= Math.pow(.08, dt);
    applyGoblinPose(e);
    e.root.position.set(e.x, 0, e.z); e.root.rotation.y = Math.atan2(e.facing.x, e.facing.z);
    const flashScale = 1 + Math.max(0, e.flash) * .18; e.root.scale.set(flashScale, flashScale, flashScale); applyEnemyVisual(e);
    if(!GOBLIN_KINDS.has(e.kind)) e.body.material = e.flash > 0 ? matByKind.flash : (e.state === 'active' ? matByKind.active : (e.state === 'windup' ? matByKind.windup : matByKind[e.kind]));
    const f = clamp(e.hp / e.maxHp, 0, 1); e.bar.scale.x = f; e.bar.position.x = -(1 - f) * e.radius * .85; e.bar.lookAt(tmp.set(player.x, 2, player.z));
  }

  function update(dt, player){
    lastPlayer = player; spawnTimer -= dt;
    const cap = Math.max(1, Math.min(20, Math.round(tuning.waveSize)));
    if(spawnTimer <= 0 && spawnedThisWave < cap && enemies.length < cap){ spawn(chooseSpawnKind()); spawnTimer = nextSpawnDelay(wave); }
    director.update(dt, { enemies, pressureBudget: director.settings.pressureBudget }); director.markNearEligible(enemies, player); director.assignBattleCircleSlots(enemies, player);
    for(const e of [...enemies]) updateEnemy(e, dt, player);
    resolveEnemySpacing(player);
    for(const e of enemies) e.root.position.set(e.x, 0, e.z);
    rig.updateDeathPieces(dt, deathPieces);
  }
  function setHeightScale(value){ tuning.heightScale = clamp(Number(value) || 1, .5, 4); enemies.forEach(applyEnemyVisual); }
  function setSpeedScale(value){ tuning.speedScale = clamp(Number(value) || 1, .25, 1.5); }
  function setDirectorMode(mode){ director.setMode(mode); }
  function setPressureBudget(value){ director.settings.pressureBudget = clamp(Number(value) || 1.75, .5, 4); }
  function setCycleOnWaveClear(value){ director.settings.cycleOnWaveClear = !!value; }
  function setWaveSize(value){ tuning.waveSize = clamp(Math.round(Number(value) || 6), 1, 20); }
  function setIdleRangeScale(value){ tuning.idleRangeScale = clamp(Number(value) || 4.5, 1, 6); director.settings.battleCircleRadius = 4.5 * tuning.idleRangeScale; director.getDebugState().slots.forEach(slot => { slot.radius = director.settings.battleCircleRadius; }); }

  return { enemies, group, director, spawn, reset, update, damageEnemy, setGoblinColors, setGoblinRigDebug, setSpawnGoblins, setHeightScale, setSpeedScale, setDirectorMode, setPressureBudget, setCycleOnWaveClear, setWaveSize, setIdleRangeScale, get heightScale(){ return tuning.heightScale; }, get speedScale(){ return tuning.speedScale; }, get waveSize(){ return tuning.waveSize; }, get idleRangeScale(){ return tuning.idleRangeScale; }, get wave(){ return wave; }, get waveKills(){ return waveKills; }, get kills(){ return kills; }, get playerHp(){ return tuning.playerHp; }, get lastPlayerHit(){ return tuning.lastPlayerHit; } };
}
