// Combat Arena enemy system — a faithful port of the "Director Punch" prototype's
// enemy simulation (grunt / dagger / mace / rock / captain), scaled to arena world
// units and rendered with the shared goblin rig (src/goblin-rig.js). The token
// encounter director (src/combat-director.js) gates who may attack; enemies seek to
// a tight hold distance and lunge-commit on the active phase, then a rock thrower
// adds a ranged projectile.
//
// Drop-in replacement for createCombatEnemySystem in combat-arena.html: same public
// API (enemies, update(dt,{x,z,invulnerable}), damageEnemy, reset, director, the
// set*/get* knobs, playerHp/wave/kills).

import { createCombatDirector, DEFAULT_DIRECTOR_SETTINGS } from './combat-director.js';
import { STONE_WEAPONS } from './weapons.js';
import { installGoblinRig } from './goblin-rig.js';

const S = 4.3;                       // meters -> arena-unit scale (player 8.5 u/s vs punch 1.95)
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

// Punch TYPES + goblin skin, distances/speeds pre-scaled by S. hp/score unchanged.
const ARCHETYPES = {
  grunt:   { hp:45,  radius:.99, height:4.21, speed:3.61, attack:'slash',        score:10, weapon:'longsword',  color:0x6f9f4e, bellyColor:0xbfd582, armorColor:0x543820, poseScale:1.0 },
  dagger:  { hp:34,  radius:.86, height:3.78, speed:5.12, attack:'poke',         score:14, weapon:'dagger',     color:0x83b26a, bellyColor:0xc7d78a, armorColor:0x3f5a35, poseScale:.85 },
  mace:    { hp:88,  radius:1.20, height:4.82, speed:2.84, attack:'maceOverhead', score:24, weapon:'mace',       color:0x5c8f42, bellyColor:0xa9c273, armorColor:0x4a3320, poseScale:1.25 },
  rock:    { hp:38,  radius:.95, height:3.96, speed:2.84, attack:'rockThrow',    score:16, weapon:null,         color:0x7ba85f, bellyColor:0xc2d488, armorColor:0x4d5a30, poseScale:.9, thrower:true },
  captain: { hp:170, radius:1.55, height:5.93, speed:2.54, attack:'captainSmash', score:60, weapon:'greatsword', color:0x8fb35a, bellyColor:0xd0dd8a, armorColor:0x6b5230, poseScale:1.4, isElite:true }
};

// Punch EATK: ranges/knock scaled by S; timings/damage/arc verbatim.
const EATK = {
  slash:        { kind:'melee',  name:'Slash',         range:.78*S,  tokenCost:1.0,  windup:.58, active:.16, recovery:.50, cooldown:1.45, damage:10, arc:1.1, knock:.5*S },
  poke:         { kind:'melee',  name:'Poke',          range:.70*S,  tokenCost:.75,  windup:.36, active:.13, recovery:.36, cooldown:1.05, damage:7,  arc:.75, knock:.25*S },
  maceOverhead: { kind:'melee',  name:'Overhead',      range:1.06*S, tokenCost:1.75, windup:1.05, active:.20, recovery:.78, cooldown:1.95, damage:24, arc:.9,  knock:1.0*S, wantsSolo:true },
  rockThrow:    { kind:'ranged', name:'Rock Throw',    range:3.3*S,  tokenCost:.5,   windup:.78, active:.08, recovery:.60, cooldown:2.05, damage:8,  arc:0,   knock:.2*S, projectile:true },
  captainSmash: { kind:'melee',  name:'Smash',         range:1.24*S, tokenCost:2.25, windup:1.20, active:.24, recovery:.95, cooldown:2.15, damage:30, arc:1.0, knock:1.2*S, wantsSolo:true }
};

export function createArenaEnemySystem({ THREE, worldRoot, materials = {}, arenaRadius = 18 } = {}){
  const rig = installGoblinRig(THREE);
  const clamp = rig.clamp;
  const mats = rig.buildGoblinMaterials(materials);
  const bodyMats = {};
  for(const [kind, a] of Object.entries(ARCHETYPES)) bodyMats[kind] = new THREE.MeshStandardMaterial({ color:a.color, roughness:.78, flatShading:true });
  const barMat = new THREE.MeshStandardMaterial({ color:0x8dd2ff, roughness:.5, flatShading:true });

  const group = new THREE.Group(); group.name = 'Arena Enemies'; worldRoot.add(group);
  const director = createCombatDirector({ ...DEFAULT_DIRECTOR_SETTINGS, pressureBudget:2.25, battleCircleRadius:1.6*S });
  const enemies = [];
  const projectiles = [];
  const deathPieces = [];
  const tuning = { playerHp:100, lastPlayerHit:'', heightScale:1, speedScale:1, waveSize:6, idleRangeScale:3 };
  let wave = 1, kills = 0, waveKills = 0, spawnedThisWave = 0, waveClearT = 0, nextId = 1, time = 0;
  let lastPlayer = { x:0, z:0, invulnerable:false };

  const PLAYER_R = .25 * S;
  const CLAMP_MARGIN = 1.0;
  // idleRangeScale scales the hold/keep radii around the punch defaults (3 = faithful).
  const rangeK = () => tuning.idleRangeScale / 3;
  const HOLD    = () => 1.55 * S * rangeK();
  const KEEP_NEAR = () => 1.35 * S * rangeK();
  const KEEP_FAR  = () => 2.4 * S * rangeK();

  /* ---------- helpers ---------- */
  const dist = (e,p) => Math.hypot((p.x ?? 0) - e.x, (p.z ?? 0) - e.z) || 1;
  const norm = (x,z) => { const d = Math.hypot(x,z) || 1; return { x:x/d, z:z/d }; };
  function wrapPi(a){ return Math.atan2(Math.sin(a), Math.cos(a)); }
  function approachN(cur, goal, dt, rate){ return cur + (goal - cur) * Math.min(1, dt*rate); }

  /* ---------- build ---------- */
  function makeEnemy(kind, x, z){
    const a = ARCHETYPES[kind];
    const s = { radius:a.radius, height:a.height, bellyColor:a.bellyColor, armorColor:a.armorColor, weapon:a.weapon };
    const root = new THREE.Group(); root.name = `${kind} arena enemy`;
    const weaponDef = a.weapon ? STONE_WEAPONS[a.weapon] : STONE_WEAPONS.mace;
    const visual = rig.makeGoblinRig({ kind, root, s, bodyMat:bodyMats[kind], mats, weaponDef, showRig:false });
    // markers (health bar + telegraph ring + token ring), matching the enemies.js layout
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(a.radius*1.7, .055, .035), mats.flash); barBg.position.set(0, a.height + .32, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(a.radius*1.7, .065, .045), barMat); bar.position.copy(barBg.position); bar.position.z += .012; root.add(barBg, bar);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(.72, .78, 36), mats.windup); telegraph.rotation.x = -Math.PI/2; telegraph.visible = false; root.add(telegraph);
    const tokenRing = new THREE.Mesh(new THREE.TorusGeometry(a.radius*1.6, .04, 6, 32), mats.windup); tokenRing.position.y = .08; tokenRing.visible = false; root.add(tokenRing);
    // rock thrower: hide the held weapon, show a rock in hand
    let rockProp = null;
    if(a.thrower){
      visual.weaponRoot.visible = false;
      rockProp = new THREE.Mesh(new THREE.DodecahedronGeometry(.28, 0), mats.matIron);
      rockProp.position.set(.3, a.height*.6, .2); visual.weaponRigRoot.add(rockProp);
    }
    root.position.set(x, 0, z); group.add(root);
    const e = {
      id: nextId++, kind, x, z, vx:0, vz:0, radius:a.radius, height:a.height,
      hp:a.hp, maxHp:a.hp, speed:a.speed, stop:HOLD(), score:a.score, poseScale:a.poseScale,
      attackId:a.attack, thrower:!!a.thrower, isElite:!!a.isElite,
      state:'idle', stateTime:0, cooldown:THREE.MathUtils.randFloat(.2, 1.0), stunned:0,
      attack:null, windup:0, active:0, recovery:0, hitDone:false,
      token:null, facing:{ x:-Math.sign(x)||0, z:-Math.sign(z)||1 }, orbitDir:Math.random()<.5?-1:1,
      deniedTimer:0, deniedMode:'orbit', nearEligible:true, slotIndex:-1,
      knockX:0, knockZ:0, flash:0, bobPhase:Math.random()*6.28,
      root, rockProp, barBg, bar, telegraph, tokenRing, ...visual
    };
    enemies.push(e);
    return e;
  }

  /* ---------- steering (punch, arena units) ---------- */
  function steer(e, dx, dz, amount, dt){
    const sp = e.speed * tuning.speedScale;
    e.vx = approachN(e.vx, dx*sp*amount, dt, 6);
    e.vz = approachN(e.vz, dz*sp*amount, dt, 6);
  }
  function seekPlayer(e, p, dt){ const d = norm(p.x - e.x, p.z - e.z); steer(e, d.x, d.z, 1, dt); }
  function orbitPlayer(e, p, dt, amount=.55){
    const rx = e.x - p.x, rz = e.z - p.z, r = Math.hypot(rx,rz) || 1;
    const tx = (-rz/r)*e.orbitDir, tz = (rx/r)*e.orbitDir;
    const corr = (HOLD() - r) * .7;
    steer(e, tx - rx/r*corr, tz - rz/r*corr, amount, dt);
  }
  function keepRange(e, p, dt, desired){
    const rx = e.x - p.x, rz = e.z - p.z, r = Math.hypot(rx,rz) || 1;
    const dirIn = r - desired;
    steer(e, -rx/r*Math.sign(dirIn), -rz/r*Math.sign(dirIn), Math.min(1, Math.abs(dirIn)), dt);
  }
  function moveToSlot(e, p, dt){
    const slots = director.getDebugState().slots; const slot = slots[e.slotIndex];
    if(!slot){ orbitPlayer(e, p, dt); return; }
    const tx = p.x + Math.cos(slot.angle)*slot.radius, tz = p.z + Math.sin(slot.angle)*slot.radius;
    const d = norm(tx - e.x, tz - e.z); const dd = Math.hypot(tx - e.x, tz - e.z);
    steer(e, d.x, d.z, clamp(dd, .15, 1), dt);
  }
  function deniedBehavior(e, p, dt){
    const mode = director.getMode();
    if(mode === 'battleCircle'){ moveToSlot(e, p, dt); return; }
    if(mode === 'nearFar' && !e.nearEligible){ keepRange(e, p, dt, KEEP_FAR()); orbitPlayer(e, p, dt, .35); return; }
    e.deniedTimer -= dt;
    if(e.deniedTimer <= 0){ e.deniedTimer = THREE.MathUtils.randFloat(.5, 1.3); e.deniedMode = Math.random() < .6 ? 'orbit' : 'range'; }
    if(e.deniedMode === 'range') keepRange(e, p, dt, KEEP_NEAR());
    else orbitPlayer(e, p, dt, .55);
  }

  /* ---------- attacks ---------- */
  function chooseAttack(e, d){
    if(e.thrower && d < 1.25 * S) return null;              // rock: don't throw point-blank
    const a = EATK[e.attackId];
    if(!a) return null;
    return d <= a.range + (a.kind === 'ranged' ? .9*S : .22*S) ? a : null;
  }
  function startEnemyAttack(e, atk, p){
    e.attack = atk; e.state = 'windup'; e.stateTime = 0;
    e.windup = atk.windup; e.active = atk.active; e.recovery = atk.recovery; e.hitDone = false;
    e.facing = norm(p.x - e.x, p.z - e.z);
    director.grant(e, atk);
  }
  function resolveEnemyMelee(e, p){
    const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx,dz);
    if(d > e.attack.range + PLAYER_R) return;
    const ang = Math.atan2(dx,dz), fa = Math.atan2(e.facing.x, e.facing.z);
    if(Math.abs(wrapPi(ang - fa)) < e.attack.arc*.5 + .2 || d < e.radius + PLAYER_R + .26){
      e.hitDone = true;
      hitPlayer(e.attack.damage, e.kind, e.attack.name);
    }
  }
  function hitPlayer(dmg, kind, name){
    if(lastPlayer.invulnerable) return;
    tuning.playerHp = Math.max(0, tuning.playerHp - dmg);
    tuning.lastPlayerHit = `${kind} ${name} hit for ${dmg}`;
  }
  const playerDead = () => tuning.playerHp <= 0;

  /* ---------- projectiles (rock) ---------- */
  function spawnProjectile(e){
    const f = e.facing;
    let pr = projectiles.find(q => q.dead);
    if(!pr){ pr = { mesh:null, dead:true }; projectiles.push(pr); }
    Object.assign(pr, { x:e.x + f.x*.35*S, z:e.z + f.z*.35*S, vx:f.x*2.2*S, vz:f.z*2.2*S, life:2.4, r:.09*S, damage:e.attack.damage, dead:false });
    if(!pr.mesh){
      pr.mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(.39, 0), mats.matIron);
      group.add(pr.mesh);
    }
    pr.mesh.visible = true;
  }
  function updateProjectiles(dt, p){
    for(const pr of projectiles){
      if(pr.dead) continue;
      pr.life -= dt; pr.x += pr.vx*dt; pr.z += pr.vz*dt;
      if(Math.hypot(pr.x - p.x, pr.z - p.z) < pr.r + PLAYER_R && !p.invulnerable && !playerDead()){
        hitPlayer(pr.damage, 'rock', 'Rock Throw'); pr.life = 0;
      }
      if(pr.life <= 0){ pr.dead = true; if(pr.mesh) pr.mesh.visible = false; }
      else if(pr.mesh){ pr.mesh.position.set(pr.x, 1.0*S, pr.z); pr.mesh.rotation.x += dt*9; }
    }
  }

  /* ---------- per-enemy update ---------- */
  function updateEnemy(e, dt, p){
    if(e.hp <= 0) return;
    e.stateTime += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.cooldown = Math.max(0, e.cooldown - dt);
    // knock decay (arena hit reaction)
    e.x += e.knockX*dt; e.z += e.knockZ*dt; e.knockX *= Math.pow(.08, dt); e.knockZ *= Math.pow(.08, dt);

    if(e.stunned > 0){
      e.stunned -= dt;
      e.vx *= Math.pow(.004, dt); e.vz *= Math.pow(.004, dt);
      e.x += e.vx*dt; e.z += e.vz*dt;
    }
    else if(e.state === 'windup'){
      e.vx = e.vz = 0;
      if(e.stateTime < e.windup*.45) e.facing = norm(p.x - e.x, p.z - e.z);
      if(e.stateTime >= e.windup){
        e.state = 'active'; e.stateTime = 0;
        if(e.attack.projectile){ spawnProjectile(e); e.hitDone = true; }
      }
    }
    else if(e.state === 'active'){
      if(!e.attack.projectile){
        e.x += e.facing.x*1.9*S*dt; e.z += e.facing.z*1.9*S*dt;   // lunge-commit
        if(!e.hitDone) resolveEnemyMelee(e, p);
      }
      if(e.stateTime >= e.active){ e.state = 'recovery'; e.stateTime = 0; }
    }
    else if(e.state === 'recovery'){
      e.vx = e.vz = 0;
      if(e.stateTime >= e.recovery){ e.state = 'idle'; e.stateTime = 0; e.cooldown = e.attack.cooldown; director.release(e); }
    }
    else {
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx,dz);
      e.facing = norm(dx,dz);
      const att = (e.cooldown <= 0 && e.stunned <= 0 && !playerDead()) ? chooseAttack(e, d) : null;
      if(att && director.canGrant(e, att, { enemies, pressureBudget:director.settings.pressureBudget })){
        startEnemyAttack(e, att, p);
      } else {
        const wantRange = EATK[e.attackId].kind === 'ranged' ? 2.6*S : .92*S;
        if(d > wantRange + .45*S) seekPlayer(e, p, dt);
        else deniedBehavior(e, p, dt);
        e.x += e.vx*dt; e.z += e.vz*dt;
      }
    }
    const rr = Math.hypot(e.x, e.z);
    if(rr > arenaRadius - CLAMP_MARGIN){ e.x *= (arenaRadius - CLAMP_MARGIN)/rr; e.z *= (arenaRadius - CLAMP_MARGIN)/rr; }
  }

  function resolveBodyCollisions(p){
    for(let pass = 0; pass < 2; pass++){
      for(let i = 0; i < enemies.length; i++){
        const a = enemies[i]; if(a.hp <= 0) continue;
        for(let j = i+1; j < enemies.length; j++){
          const b = enemies[j]; if(b.hp <= 0) continue;
          let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx,dz);
          const min = a.radius + b.radius;
          if(d >= min) continue;
          if(d < 1e-4){ const ang = ((a.id*17 + b.id*31) % 360) * Math.PI/180; dx = Math.cos(ang); dz = Math.sin(ang); d = 1; }
          const push = (min - d) * .5 / d;
          a.x -= dx*push; a.z -= dz*push; b.x += dx*push; b.z += dz*push;
        }
        // keep enemies out of the player's body (the arena owns player pos, so we
        // only move the enemy — this is what stops a lunge from ending on top of you)
        const e = a; const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx,dz) || .001, min = e.radius + PLAYER_R;
        if(d < min){ const push = (min - d) / d; e.x += dx*push; e.z += dz*push; }
      }
    }
  }

  /* ---------- punch-style rig pose ---------- */
  function applyPunchPose(e){
    const k = e.poseScale ?? 1;
    let lean = 0, weaponA = -.4;
    if(e.state === 'windup'){ const pr = easeOutCubic(clamp(e.stateTime/Math.max(e.windup,1e-3),0,1)); lean = -.38*pr; weaponA = -.4 - 1.6*pr; }
    else if(e.state === 'active'){ lean = .40; weaponA = .9; }
    else if(e.state === 'recovery'){ const pr = clamp(e.stateTime/Math.max(e.recovery,1e-3),0,1); lean = .40*(1-pr); weaponA = .9 - 1.3*pr; }
    else if(e.stunned > 0){ lean = Math.sin(time*26)*.06; }
    e.torsoRoot.rotation.x = lean;
    e.torsoRoot.position.y = e.state === 'idle' ? Math.sin(time*2 + e.bobPhase)*.03 : 0;
    e.weaponRigRoot.rotation.x = weaponA * k;
    e.root.rotation.y = Math.atan2(e.facing.x, e.facing.z);
  }
  function updateEnemyVisual(e){
    applyPunchPose(e);
    e.root.position.set(e.x, 0, e.z);
    const flashScale = 1 + Math.max(0, e.flash) * .18; e.root.scale.setScalar(flashScale);
    rig.applyGoblinVisual(e, tuning.heightScale, mats);
    const f = clamp(e.hp/e.maxHp, 0, 1); e.bar.scale.x = f; e.bar.position.x = -(1 - f)*e.radius*.85;
    e.bar.lookAt(lastPlayer.x ?? 0, 2, lastPlayer.z ?? 0);
  }

  /* ---------- waves ---------- */
  const MIX = ['grunt','dagger','grunt','rock','dagger','grunt','mace','dagger','grunt'];
  function chooseSpawnKind(i){
    if(director.getMode() === 'eliteSpotlight' && i === 0) return 'captain';
    return MIX[i % MIX.length];
  }
  function spawnPos(){
    const a = Math.random()*Math.PI*2, r = THREE.MathUtils.randFloat(arenaRadius*.62, arenaRadius - 1.5);
    return { x:(lastPlayer.x ?? 0) + Math.cos(a)*r, z:(lastPlayer.z ?? 0) + Math.sin(a)*r };
  }
  function startWave(){
    waveKills = 0; spawnedThisWave = 0; waveClearT = 0;
    const count = Math.max(1, Math.min(20, Math.round(tuning.waveSize)));
    for(let i = 0; i < count; i++){ const pos = spawnPos(); makeEnemy(chooseSpawnKind(i), pos.x, pos.z); spawnedThisWave++; }
  }
  function finishWave(){ wave++; director.onWaveClear(); startWave(); }

  function removeEnemy(e){
    const idx = enemies.indexOf(e); if(idx >= 0) enemies.splice(idx, 1);
    if(e.root.parent) e.root.parent.remove(e.root);
  }
  function damageEnemy(e, amount, knock = { x:0, z:0 }){
    if(e.hp <= 0) return false;
    e.hp -= amount; e.flash = .12; e.stunned = Math.max(e.stunned, .18);
    director.releaseAllForEnemy(e);
    if(e.state === 'windup' || e.state === 'active' || e.state === 'recovery'){ e.state = 'idle'; e.stateTime = 0; }
    e.knockX += (knock.x || 0) * .65; e.knockZ += (knock.z || 0) * .65;
    if(e.hp <= 0){
      kills++; waveKills++;
      rig.shatterGoblin(worldRoot, deathPieces, e, knock, mats.matIron);
      removeEnemy(e);
      return true;
    }
    return false;
  }

  /* ---------- lifecycle ---------- */
  function clearDeathPieces(){ deathPieces.forEach(p => p.mesh?.parent && p.mesh.parent.remove(p.mesh)); deathPieces.length = 0; }
  function reset(){
    director.reset();
    enemies.splice(0).forEach(e => e.root.parent && e.root.parent.remove(e.root));
    projectiles.forEach(pr => { pr.dead = true; if(pr.mesh) pr.mesh.visible = false; });
    clearDeathPieces();
    wave = 1; kills = 0; tuning.playerHp = 100; tuning.lastPlayerHit = '';
    startWave();
  }

  function update(dt, player){
    lastPlayer = player || lastPlayer;
    time += dt;
    director.update(dt, { enemies, pressureBudget:director.settings.pressureBudget });
    director.markNearEligible(enemies, lastPlayer);
    director.assignBattleCircleSlots(enemies);
    for(const e of [...enemies]) updateEnemy(e, dt, lastPlayer);
    resolveBodyCollisions(lastPlayer);
    updateProjectiles(dt, lastPlayer);
    for(const e of enemies) updateEnemyVisual(e);
    rig.updateDeathPieces(dt, deathPieces);
    // wave clear when everything is dead
    if(!enemies.length && !playerDead()){
      waveClearT += dt;
      if(waveClearT > 1.0) finishWave();
    } else waveClearT = 0;
  }

  startWave();

  return {
    enemies, group, director, update, damageEnemy, reset,
    setDirectorMode:(m)=>director.setMode(m),
    setPressureBudget:(v)=>{ director.settings.pressureBudget = clamp(Number(v) || 2.25, .5, 4); },
    setCycleOnWaveClear:(v)=>{ director.settings.cycleOnWaveClear = !!v; },
    setWaveSize:(v)=>{ tuning.waveSize = clamp(Math.round(Number(v) || 6), 1, 20); },
    setSpeedScale:(v)=>{ tuning.speedScale = clamp(Number(v) || 1, .25, 1.5); },
    setHeightScale:(v)=>{ tuning.heightScale = clamp(Number(v) || 1, .5, 3.5); },
    setIdleRangeScale:(v)=>{ tuning.idleRangeScale = clamp(Number(v) || 3, 1, 6); director.settings.battleCircleRadius = 1.6*S*(tuning.idleRangeScale/3); director.getDebugState().slots.forEach(sl => { sl.radius = director.settings.battleCircleRadius; }); },
    setGoblinColors:()=>{}, setGoblinRigDebug:()=>{}, setSpawnGoblins:()=>{},
    get heightScale(){ return tuning.heightScale; },
    get speedScale(){ return tuning.speedScale; },
    get waveSize(){ return tuning.waveSize; },
    get idleRangeScale(){ return tuning.idleRangeScale; },
    get wave(){ return wave; },
    get waveKills(){ return waveKills; },
    get kills(){ return kills; },
    get playerHp(){ return tuning.playerHp; },
    get lastPlayerHit(){ return tuning.lastPlayerHit; }
  };
}
