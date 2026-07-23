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
import { createAttackInterpreter } from './attack-interpreter.js';
import { FUSION_ARCHETYPES, FUSION_ATTACKS, FUSION_ENEMY_IDS, isFusionEnemy } from './fusion-enemies.js';
import { installFusionEnemyRig } from './fusion-enemy-rig.js';

const S = 4.3;                       // meters -> arena-unit scale (player 8.5 u/s vs punch 1.95)
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

// Goblin weapons are built at their final readable size by goblin-weapons.js.
// Real attack reach is derived from each weapon's own rig metadata.
const GOBLIN_WEAPON_SCALE = 1;

// The retained goblins use the chunky enemy-only weapons from goblin-weapons.js,
// but drive them with the same authored attacks.js choreography as the player.
export const ARENA_ENEMY_ARCHETYPES = {
  grunt:   { hp:45,  radius:.99, height:4.21, speed:3.61, attack:'slash',         score:10, weapon:'longsword',  color:0x6f9f4e, bellyColor:0xbfd582, armorColor:0x543820, poseScale:1.0,  combatAttacks:['vertical5','horizontal6','vertical3'], timingScale:1.00, turnSpeed:Math.PI,       rallyMin:6, rallyMax:11 },
  dagger:  { hp:34,  radius:.86, height:3.78, speed:5.12, attack:'poke',          score:14, weapon:'dagger',     color:0x83b26a, bellyColor:0xc7d78a, armorColor:0x3f5a35, poseScale:.85, combatAttacks:['stab2','horizontal6','stab4'],         timingScale:.88, turnSpeed:Math.PI*1.34, rallyMin:5, rallyMax:9 },
  mace:    { hp:88,  radius:1.20, height:4.82, speed:2.84, attack:'maceOverhead', score:24, weapon:'mace',       color:0x5c8f42, bellyColor:0xa9c273, armorColor:0x4a3320, poseScale:1.25, combatAttacks:['vertical6','vertical9','vertical16'], timingScale:1.35, turnSpeed:Math.PI*.62, rallyMin:7, rallyMax:12 },
  rock:    { hp:38,  radius:.95, height:3.96, speed:2.84, attack:'rockThrow',     score:16, weapon:null,         color:0x7ba85f, bellyColor:0xc2d488, armorColor:0x4d5a30, poseScale:.9,  thrower:true, turnSpeed:Math.PI*.84, rallyMin:6, rallyMax:11 },
  captain: { hp:170, radius:1.55, height:5.93, speed:2.54, attack:'captainSmash', score:60, weapon:'greatsword', color:0x8fb35a, bellyColor:0xd0dd8a, armorColor:0x6b5230, poseScale:1.4,  combatAttacks:['vertical16','horizontal5','vertical15'], timingScale:1.22, isElite:true, turnSpeed:Math.PI*.5, rallyMin:4, rallyMax:7 }
};
const BASE_ARCHETYPES = ARENA_ENEMY_ARCHETYPES;
const ARCHETYPES = { ...BASE_ARCHETYPES, ...FUSION_ARCHETYPES };

// Punch EATK: ranges/knock scaled by S; timings/damage/arc verbatim.
const BASE_EATK = {
  slash:        { kind:'melee',  name:'Slash',         range:.78*S,  tokenCost:1.0,  windup:.58, active:.16, recovery:.50, cooldown:1.45, damage:10, arc:1.1, knock:.5*S },
  poke:         { kind:'melee',  name:'Poke',          range:.70*S,  tokenCost:.75,  windup:.36, active:.13, recovery:.36, cooldown:1.05, damage:7,  arc:.75, knock:.25*S },
  maceOverhead: { kind:'melee',  name:'Overhead',      range:1.06*S, tokenCost:1.75, windup:1.05, active:.20, recovery:.78, cooldown:1.95, damage:24, arc:.9,  knock:1.0*S, wantsSolo:true },
  rockThrow:    { kind:'ranged', name:'Rock Throw',    range:3.3*S,  tokenCost:.5,   windup:.78, active:.08, recovery:.60, cooldown:2.05, damage:8,  arc:0,   knock:.2*S, projectile:true },
  captainSmash: { kind:'melee',  name:'Smash',         range:1.24*S, tokenCost:2.25, windup:1.20, active:.24, recovery:.95, cooldown:2.15, damage:30, arc:1.0, knock:1.2*S, wantsSolo:true }
};
const EATK = { ...BASE_EATK, ...FUSION_ATTACKS };

export function createArenaEnemySystem({
  THREE, worldRoot, materials = {}, arenaRadius = 18,
  navigation = null, roomEncounterMode = false, onEncounterCleared = null,
} = {}){
  const rig = installGoblinRig(THREE);
  const fusionRig = installFusionEnemyRig(THREE);
  // Shared choreography interpreter — the exact same pose sampler the player uses
  // (src/attack-interpreter.js), so a grunt swings the real player animation.
  const interp = createAttackInterpreter(THREE);
  const poseScratch = interp.P({ hold:[0,1,0], tip:[0,1,0] });
  const clamp = rig.clamp;
  const lerp = THREE.MathUtils.lerp;
  const mats = rig.buildGoblinMaterials(materials);
  const bodyMats = {};
  for(const [kind, a] of Object.entries(ARCHETYPES)) bodyMats[kind] = new THREE.MeshStandardMaterial({ color:a.color, roughness:.78, flatShading:true });
  const barMat = new THREE.MeshStandardMaterial({ color:0x8dd2ff, roughness:.5, flatShading:true });

  // Every goblin builds its own geometries + several per-instance materials
  // (pot-goblin-rig.js) that were never freed on death/clear — an unbounded GPU
  // leak across waves. These shared materials are built once and reused by all
  // enemies, so they must be excluded from per-enemy disposal.
  const sharedMats = new Set([barMat, ...Object.values(bodyMats), ...Object.values(mats)]);
  for(const m of Object.values(materials || {})) if(m && m.isMaterial) sharedMats.add(m);
  // Geometries are always unique per enemy (verified: markers, rig, and weapon all
  // build fresh geometry), so disposing every geometry under a root is safe. On a
  // kill the shatter pieces clone their geometry, so the root's geometry is still
  // safe to free immediately.
  function disposeEnemyGeometry(root){
    root.traverse(obj => { if(obj.geometry) obj.geometry.dispose(); });
  }
  // Per-instance materials are only safe to dispose when no shatter piece can still
  // reference them (i.e. clearing live, un-shattered enemies), never mid-kill.
  function disposeEnemyMaterials(root){
    root.traverse(obj => {
      const mat = obj.material; if(!mat) return;
      for(const m of (Array.isArray(mat) ? mat : [mat])){
        if(m && m.isMaterial && !sharedMats.has(m)){ m.map?.dispose?.(); m.dispose(); }
      }
    });
  }

  const group = new THREE.Group(); group.name = 'Arena Enemies'; worldRoot.add(group);
  const director = createCombatDirector({ ...DEFAULT_DIRECTOR_SETTINGS, pressureBudget:2.25, battleCircleRadius:1.6*S });
  const enemies = [];
  const projectiles = [];
  const deathPieces = [];
  const tuning = { playerHp:100, lastPlayerHit:'', lastPlayerHitDir:null, heightScale:1.5, speedScale:.5, hpScale:2.5, waveSize:6, idleRangeScale:3, aggression:1, spawnKind:'mixed' };
  let wave = 1, kills = 0, waveKills = 0, spawnedThisWave = 0, waveClearT = 0, nextId = 1, time = 0;
  let activeEncounterRoomId = null;
  let lastPlayer = { x:0, z:0, invulnerable:false };

  const PLAYER_R = .25 * S;
  const CLAMP_MARGIN = 1.0;
  // idleRangeScale scales the hold/keep radii around the punch defaults (3 = faithful).
  const rangeK = () => tuning.idleRangeScale / 3;
  const HOLD    = () => 1.55 * S * rangeK();
  const KEEP_NEAR = () => 1.35 * S * rangeK();
  const KEEP_FAR  = () => 2.4 * S * rangeK();

  /* ---------- real-combat (grunt) pose mapping ---------- */
  // The goblin rig holds a weapon built with these blade coords (goblin-rig.js RIG).
  const ZONE_R = .16;
  // "Combat space": maps a sampled player pose (hold/tip, ~unit scale) onto the
  // goblin torso. hold scales by height; the grip sits at a chest anchor; lunge
  // shifts forward. computeRealReach and applyRealCombatPose share these so the
  // rendered weapon tip and the derived attack reach stay in lockstep.
  const G_ANCHOR_Y = .46;   // * height  — grip anchor height (chest/shoulder)
  const G_ANCHOR_Z = .28;   // * radius  — grip anchor forward of body center
  const G_HOLD     = .30;   // * height  — pose.hold components -> torso units
  const G_LUNGE    = .70;   // * radius  — pose.lunge -> forward torso shift
  const HOLD_FRAC  = .94;   // stand this fraction of reach out (lunge-commit closes the rest)
  const _UP = new THREE.Vector3(0,1,0), _q = new THREE.Quaternion(), _qr = new THREE.Quaternion();
  const _tip = new THREE.Vector3(), _holdV = new THREE.Vector3(), _gripOff = new THREE.Vector3();

  // Forward reach (body center -> weapon tip) at the attack's contact pose, in the
  // same units as enemy positions. Derived entirely from the real animation + the
  // real weapon length + scale, so spacing is emergent, not hand-authored.
  function computeRealReach(att, geom, weaponScale, weaponRig){
    const p = interp.sampleAttack(att, att.contactAt, poseScratch);
    const holdZ = geom.radius*G_ANCHOR_Z + p.hold.z*(geom.height*G_HOLD) + p.lunge*(geom.radius*G_LUNGE);
    const gripCenter = weaponRig?.gripCenter ?? -.14;
    const bladeTip = weaponRig?.bladeTip ?? 1.15;
    const tipFwd = p.tip.z * (bladeTip - gripCenter) * weaponScale;
    return holdZ + tipFwd + ZONE_R*weaponScale;
  }
  function materializeGoblinAttack(a, attackKey, weaponScale, weaponRig){
    const combatAtt = interp.ATTACKS[attackKey];
    if(!combatAtt) return null;
    const base = BASE_EATK[a.attack];
    const scale = a.timingScale || 1;
    const activeEnd = Math.max(combatAtt.contactAt, combatAtt.comboAt);
    return {
      ...base,
      name:combatAtt.label,
      attackKey,
      combatAtt,
      windup:combatAtt.contactAt * scale,
      active:Math.max(.06, activeEnd - combatAtt.contactAt) * scale,
      recovery:Math.max(.08, combatAtt.total - activeEnd) * scale,
      range:computeRealReach(combatAtt, { height:a.height, radius:a.radius }, weaponScale, weaponRig),
    };
  }

  /* ---------- helpers ---------- */
  const dist = (e,p) => Math.hypot((p.x ?? 0) - e.x, (p.z ?? 0) - e.z) || 1;
  const norm = (x,z) => { const d = Math.hypot(x,z) || 1; return { x:x/d, z:z/d }; };
  function wrapPi(a){ return Math.atan2(Math.sin(a), Math.cos(a)); }
  function approachN(cur, goal, dt, rate){ return cur + (goal - cur) * Math.min(1, dt*rate); }
  function setFacingAngle(e, angle){ e.facingAngle = wrapPi(angle); e.facing.x = Math.sin(e.facingAngle); e.facing.z = Math.cos(e.facingAngle); }
  function turnFacingToAngle(e, angle, dt, rate=e.turnSpeed){
    const delta = wrapPi(angle - e.facingAngle), maxTurn = Math.max(0, rate || 0) * dt;
    setFacingAngle(e, e.facingAngle + clamp(delta, -maxTurn, maxTurn));
    e.targetFacingAngle = wrapPi(angle);
    return Math.abs(delta);
  }
  function turnFacingToPoint(e, p, dt, rate=e.turnSpeed){ return turnFacingToAngle(e, Math.atan2(p.x-e.x,p.z-e.z), dt, rate); }

  /* ---------- build ---------- */
  function makeEnemy(kind, x, z){
    const a = ARCHETYPES[kind];
    const s = { radius:a.radius, height:a.height, bellyColor:a.bellyColor, armorColor:a.armorColor, weapon:a.weapon };
    const root = new THREE.Group(); root.name = `${kind} arena enemy`;
    const weaponDef = a.weapon ? STONE_WEAPONS[a.weapon] : STONE_WEAPONS.mace;
    let visual;
    if(a.fusion){
      const fusionVisual = fusionRig.create(kind);
      root.add(fusionVisual.model.group);
      visual = { fusionVisual };
    } else {
      visual = rig.makeGoblinRig({ kind, root, s, bodyMat:bodyMats[kind], mats, weaponDef, showRig:false });
    }
    // markers (health bar + telegraph ring + token ring), matching the enemies.js layout
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(a.radius*1.7, .055, .035), mats.flash); barBg.position.set(0, a.height + .32, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(a.radius*1.7, .065, .045), barMat); bar.position.copy(barBg.position); bar.position.z += .012; root.add(barBg, bar);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(.72, .78, 36), mats.windup); telegraph.rotation.x = -Math.PI/2; telegraph.visible = false; root.add(telegraph);
    const tokenRing = new THREE.Mesh(new THREE.TorusGeometry(a.radius*1.6, .04, 6, 32), mats.windup); tokenRing.position.y = .08; tokenRing.visible = false; root.add(tokenRing);
    const rockProp = a.thrower ? visual.weaponRoot : null;
    root.position.set(x, 0, z); group.add(root);
    const weaponScale = visual.RIG?.scale || GOBLIN_WEAPON_SCALE;
    const realAttacks = (a.combatAttacks || []).map(key => materializeGoblinAttack(a, key, weaponScale, visual.RIG)).filter(Boolean);
    const useRealCombat = realAttacks.length > 0;
    let combatAtt = realAttacks[0]?.combatAtt || null;
    const maxReach = realAttacks.reduce((best, attack) => Math.max(best, attack.range), 0);
    const holdDist = useRealCombat ? maxReach * HOLD_FRAC : HOLD();
    if(useRealCombat){
      visual.weaponRoot.scale.setScalar(weaponScale);
    }
    const hp = Math.round(a.hp * tuning.hpScale);
    const initialFacing = { x:-Math.sign(x)||0, z:-Math.sign(z)||1 };
    const initialFacingAngle = Math.atan2(initialFacing.x, initialFacing.z);
    const e = {
      id: nextId++, kind, x, z, vx:0, vz:0, radius:a.radius, height:a.height,
      hp, maxHp:hp, speed:a.speed, stop:useRealCombat ? holdDist : HOLD(), score:a.score, poseScale:a.poseScale,
      fusion:isFusionEnemy(kind) || !!a.fusion, role:a.role || 'goblin', preferredRange:a.preferredRange || 2.6,
      visualScale:a.visualScale || 1, targetScale:a.targetScale || 1, currentTargetScale:a.targetScale || 1,
      collisionScale:a.collisionScale || 1, separationScale:a.separationScale || a.collisionScale || 1,
      attackOriginForward:a.attackOriginForward || 0, headCollisionRadius:a.headCollisionRadius || 0,
      pairingTags:a.pairingTags || [], meleeAccessible:true, meleeWindow:null,
      rootLift:0, targetYOffset:0,
      attackId:a.attack, thrower:!!a.thrower, isElite:!!a.isElite,
      useRealCombat, combatAtt, realAttacks, combatAttackIndex:0, holdDist, weaponScale,
      state:'idle', stateTime:0, cooldown:THREE.MathUtils.randFloat(.2, 1.0), stunned:0,
      attack:null, windup:0, active:0, recovery:0, hitDone:false,
      token:null, approachPermit:false, approachPermitTime:0, approachCooldown:0, approachCount:0,
      facing:initialFacing, facingAngle:initialFacingAngle, targetFacingAngle:initialFacingAngle,
      turnSpeed:a.turnSpeed || Math.PI*8, attackAlign:a.thrower ? .62 : .48, facingBias:THREE.MathUtils.randFloat(-.55,.55), facingDecisionT:THREE.MathUtils.randFloat(1.2,2.8), orbitDir:Math.random()<.5?-1:1,
      gesture:null, gestureTime:0, gestureDuration:1.3, rallyFacingAngle:initialFacingAngle,
      rallyTimer:THREE.MathUtils.randFloat(a.rallyMin || 7, a.rallyMax || 13), rallyMin:a.rallyMin || 7, rallyMax:a.rallyMax || 13,
      deniedTimer:0, deniedMode:'orbit', nearEligible:true, slotIndex:-1,
      knockX:0, knockZ:0, flash:0, bobPhase:Math.random()*6.28,
      yOff:0, vyOff:0, squash:0, squashT:0, squashMax:.001, spin:0, spinVel:0,
      visualGroundSpeed:0, maxGroundSpeed:a.speed*tuning.speedScale,
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
  const collisionRadius = e => e.radius * tuning.heightScale * (e.collisionScale || 1);
  const separationRadius = e => e.radius * tuning.heightScale * (e.separationScale || e.collisionScale || 1);
  function pointForward(e, distance){
    return { x:e.x + e.facing.x*distance, z:e.z + e.facing.z*distance };
  }
  function attackOrigin(e){
    return e.attackOriginForward > 0 ? pointForward(e, e.attackOriginForward * tuning.heightScale) : { x:e.x, z:e.z };
  }
  function playerCollisionCircles(e){
    const circles = [{ x:e.x, z:e.z, radius:collisionRadius(e) }];
    if(e.headCollisionRadius > 0){
      const head = pointForward(e, e.attackOriginForward * tuning.heightScale * .82);
      circles.push({ ...head, radius:e.headCollisionRadius * tuning.heightScale });
    }
    return circles;
  }
  function applySeparationSteering(e, dt){
    let sx = 0, sz = 0;
    for(const other of enemies){
      if(other === e || other.hp <= 0) continue;
      let dx = e.x - other.x, dz = e.z - other.z, d = Math.hypot(dx,dz);
      const comfort = separationRadius(e) + separationRadius(other) + .7;
      if(d >= comfort) continue;
      if(d < 1e-4){ const a = ((e.id*19 + other.id*37) % 360) * Math.PI/180; dx = Math.cos(a); dz = Math.sin(a); d = 1; }
      const pressure = 1 - d/comfort;
      sx += dx/d * pressure; sz += dz/d * pressure;
    }
    const amount = Math.hypot(sx,sz);
    if(amount <= 0) return;
    const maxSpeed = e.speed * tuning.speedScale;
    e.vx = clamp(e.vx + sx/amount * maxSpeed * Math.min(1, amount) * dt * 7, -maxSpeed, maxSpeed);
    e.vz = clamp(e.vz + sz/amount * maxSpeed * Math.min(1, amount) * dt * 7, -maxSpeed, maxSpeed);
  }
  function seekPlayer(e, p, dt){
    const target = navigation?.nextWaypoint?.(e, p, activeEncounterRoomId) || p;
    const d = norm(target.x - e.x, target.z - e.z);
    steer(e, d.x, d.z, 1, dt);
  }
  function orbitPlayer(e, p, dt, amount=.55){
    const rx = e.x - p.x, rz = e.z - p.z, r = Math.hypot(rx,rz) || 1;
    const tx = (-rz/r)*e.orbitDir, tz = (rx/r)*e.orbitDir;
    const hold = e.useRealCombat ? e.holdDist : HOLD();
    const corr = (hold - r) * .7;
    steer(e, tx - rx/r*corr, tz - rz/r*corr, amount, dt);
  }
  function orbitAtRange(e, p, dt, desired, amount=.55){
    const rx = e.x - p.x, rz = e.z - p.z, r = Math.hypot(rx,rz) || 1;
    const tx = (-rz/r)*e.orbitDir, tz = (rx/r)*e.orbitDir;
    const corr = clamp((desired-r)*.7,-1,1);
    steer(e,tx-rx/r*corr,tz-rz/r*corr,amount,dt);
  }
  function keepRange(e, p, dt, desired){
    const rx = e.x - p.x, rz = e.z - p.z, r = Math.hypot(rx,rz) || 1;
    const dirIn = r - desired;
    steer(e, -rx/r*Math.sign(dirIn), -rz/r*Math.sign(dirIn), Math.min(1, Math.abs(dirIn)), dt);
  }
  function moveToSlot(e, p, dt){
    const slots = director.getDebugState().slots; const slot = slots[e.slotIndex];
    if(!slot){ orbitPlayer(e, p, dt); return; }
    const rawTarget = { x:p.x + Math.cos(slot.angle)*slot.radius, z:p.z + Math.sin(slot.angle)*slot.radius };
    const target = navigation?.nextWaypoint?.(e, rawTarget, activeEncounterRoomId) || rawTarget;
    const tx = target.x, tz = target.z;
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

  function goblinWaitingRange(e){
    const attack = EATK[e.attackId];
    if(attack?.kind === 'ranged') return 2.75*S;
    return Math.max(1.3*S, (attack?.range || 1.0*S)*1.25 + e.radius);
  }
  function endRally(e){
    if(e.gesture !== 'rally') return;
    e.gesture = null; e.gestureTime = 0; e.rallyTimer = THREE.MathUtils.randFloat(e.rallyMin,e.rallyMax);
    director.endRally(e);
  }
  function updateGoblinRally(e, p, dt, distance){
    if(e.gesture === 'rally'){
      e.gestureTime += dt; e.vx *= Math.pow(.01,dt); e.vz *= Math.pow(.01,dt);
      turnFacingToAngle(e,e.rallyFacingAngle,dt,e.turnSpeed*.7);
      if(e.gestureTime >= e.gestureDuration) endRally(e);
      return true;
    }
    if(director.hasApproachPermit(e)) return false;
    e.rallyTimer -= dt;
    const wait = goblinWaitingRange(e);
    if(e.rallyTimer <= 0 && distance >= wait-.7 && distance <= wait+2.3 && director.requestRally(e)){
      e.gesture='rally'; e.gestureTime=0; e.rallyFacingAngle=wrapPi(e.facingAngle + THREE.MathUtils.randFloat(-.65,.65));
      e.vx=e.vz=0;
      return true;
    }
    return false;
  }
  function moveGoblin(e,p,dt,distance){
    const permit = director.hasApproachPermit(e), attack = EATK[e.attackId];
    if(permit){
      const desired = attack?.kind === 'ranged' ? 2.6*S : (e.useRealCombat ? e.holdDist : .92*S);
      if(distance > desired + .45*S) seekPlayer(e,p,dt);
      else orbitAtRange(e,p,dt,desired,.22);
      turnFacingToPoint(e,p,dt);
      return;
    }
    const inner = goblinWaitingRange(e), outer = inner + 1.7;
    if(distance < inner){
      keepRange(e,p,dt,inner+.45);
      turnFacingToAngle(e,Math.atan2(p.x-e.x,p.z-e.z)+e.facingBias,dt,e.turnSpeed*.7);
    } else if(distance > outer){
      const toward=norm(p.x-e.x,p.z-e.z); steer(e,toward.x,toward.z,.42,dt);
      const travel=Math.atan2(e.vx,e.vz); turnFacingToAngle(e,travel,dt,e.turnSpeed*.8);
    } else {
      orbitAtRange(e,p,dt,inner+.7,e.kind==='dagger'?.58:.34);
      const travel=Math.atan2(e.vx,e.vz); turnFacingToAngle(e,travel+e.facingBias*.35,dt,e.turnSpeed*.75);
    }
  }

  /* ---------- attacks ---------- */
  function chooseAttack(e, d, p){
    if(e.thrower && d < 1.25 * S) return null;              // rock: don't throw point-blank
    const a = e.useRealCombat ? e.realAttacks[e.combatAttackIndex % e.realAttacks.length] : EATK[e.attackId];
    if(!a) return null;
    const origin = attackOrigin(e);
    const threatDistance = e.attackOriginForward > 0 ? Math.hypot(p.x - origin.x, p.z - origin.z) : d;
    return threatDistance <= a.range + (a.kind === 'ranged' ? .9*S : .22*S) ? a : null;
  }
  function startEnemyAttack(e, atk, p){
    e.attack = atk; e.state = 'windup'; e.stateTime = 0;
    e.windup = atk.windup; e.active = atk.active; e.recovery = atk.recovery; e.hitDone = false;
    if(e.useRealCombat){
      e.combatAtt = atk.combatAtt;
      e.combatAttackIndex = (e.combatAttackIndex + 1) % e.realAttacks.length;
    }
    director.grant(e, atk);
  }

  function updateFusionAccessibility(e){
    e.currentTargetScale = e.targetScale || 1;
    if(!e.fusion){ e.meleeAccessible = true; e.meleeWindow = null; e.rootLift = 0; e.targetYOffset = 0; return; }
    const attack = e.attack;
    const states = attack?.meleeWindow?.states || [];
    e.meleeAccessible = !states.length || states.includes(e.state);
    e.meleeWindow = e.meleeAccessible && states.length ? attack.meleeWindow.id : null;
    if(e.meleeWindow && attack.meleeWindow.targetHeight === 'standard') e.currentTargetScale = 1;
    // The aerial body leaves the floor during its windup and dive. It returns
    // to the standard target height for recovery, where melee can connect.
    e.rootLift = e.kind === 'phx' && attack && (e.state === 'windup' || e.state === 'active') ? 2.1 * tuning.heightScale : 0;
    e.targetYOffset = e.rootLift;
  }

  function moveFusion(e, p, dt, d){
    const desired = e.preferredRange;
    if(e.role === 'flanker'){
      if(d > desired + .35) seekPlayer(e, p, dt); else orbitPlayer(e, p, dt, .8);
      return;
    }
    if(e.role === 'skirmisher' || e.role === 'aerial harasser'){
      keepRange(e, p, dt, desired); orbitPlayer(e, p, dt, .55);
      return;
    }
    if(e.role === 'area controller' || e.role === 'reach sentinel'){
      if(d < desired - .5) keepRange(e, p, dt, desired); else orbitPlayer(e, p, dt, .25);
      return;
    }
    if(e.role === 'charger'){
      if(d > desired) seekPlayer(e, p, dt); else orbitPlayer(e, p, dt, .35);
      return;
    }
    if(e.role === 'low ambusher'){
      if(d > desired + .3) seekPlayer(e, p, dt); else orbitPlayer(e, p, dt, .25);
      return;
    }
    if(d > desired) seekPlayer(e, p, dt); else orbitPlayer(e, p, dt, .25);
  }
  function resolveEnemyMelee(e, p){
    const origin = attackOrigin(e);
    const dx = p.x - origin.x, dz = p.z - origin.z, d = Math.hypot(dx,dz);
    if(d > e.attack.range + PLAYER_R) return;
    if(navigation?.raycastWalls?.(origin, { x:p.x, z:p.z })) return;
    const ang = Math.atan2(dx,dz), fa = Math.atan2(e.facing.x, e.facing.z);
    const closeRadius = (e.headCollisionRadius > 0 ? e.headCollisionRadius*tuning.heightScale : collisionRadius(e)) + PLAYER_R + .26;
    if(Math.abs(wrapPi(ang - fa)) < e.attack.arc*.5 + .2 || d < closeRadius){
      e.hitDone = true;
      hitPlayer(e.attack.damage, e.kind, e.attack.name, e.facing);
    }
  }
  function hitPlayer(dmg, kind, name, dir = null){
    if(lastPlayer.invulnerable) return;
    tuning.playerHp = Math.max(0, tuning.playerHp - dmg);
    tuning.lastPlayerHit = `${kind} ${name} hit for ${dmg}`;
    tuning.lastPlayerHitDir = dir ? { x:dir.x, z:dir.z } : null;
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
      const previous = { x:pr.x, z:pr.z };
      pr.life -= dt; pr.x += pr.vx*dt; pr.z += pr.vz*dt;
      if(navigation?.raycastWalls?.(previous, { x:pr.x, z:pr.z })) pr.life = 0;
      if(Math.hypot(pr.x - p.x, pr.z - p.z) < pr.r + PLAYER_R && !p.invulnerable && !playerDead()){
        hitPlayer(pr.damage, 'rock', 'Rock Throw', norm(pr.vx, pr.vz)); pr.life = 0;
      }
      if(pr.life <= 0){ pr.dead = true; if(pr.mesh) pr.mesh.visible = false; }
      else if(pr.mesh){ pr.mesh.position.set(pr.x, 1.0*S, pr.z); pr.mesh.rotation.x += dt*9; }
    }
  }

  /* ---------- per-enemy update ---------- */
  function updateEnemy(e, dt, p){
    if(e.hp <= 0) return;
    const previous = { x:e.x, z:e.z };
    e.stateTime += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.cooldown = Math.max(0, e.cooldown - dt);
    if(e.role === 'goblin'){
      e.facingDecisionT -= dt;
      if(e.facingDecisionT <= 0){ e.facingDecisionT=THREE.MathUtils.randFloat(1.3,2.8); e.facingBias=THREE.MathUtils.randFloat(-.55,.55); }
    }
    updateFusionAccessibility(e);
    // knock decay (arena hit reaction)
    e.x += e.knockX*dt; e.z += e.knockZ*dt; e.knockX *= Math.pow(.08, dt); e.knockZ *= Math.pow(.08, dt);
    // hit-feel body reaction: vertical pop, hit spin, squash timer
    if(e.yOff > 0 || e.vyOff !== 0){
      e.vyOff -= 22*dt;
      e.yOff = Math.max(0, e.yOff + e.vyOff*dt);
      if(e.yOff === 0 && e.vyOff < 0) e.vyOff = 0;
    }
    e.spin += e.spinVel*dt;
    e.spinVel *= Math.pow(.06, dt);
    e.spin *= Math.pow(.02, dt);
    e.squashT = Math.max(0, e.squashT - dt);

    if(e.stunned > 0){
      endRally(e);
      e.stunned -= dt;
      e.vx *= Math.pow(.004, dt); e.vz *= Math.pow(.004, dt);
      e.x += e.vx*dt; e.z += e.vz*dt;
    }
    else if(e.state === 'windup'){
      e.vx = e.vz = 0;
      if(e.stateTime < e.windup*.45){
        if(e.role === 'goblin') turnFacingToPoint(e,p,dt,e.turnSpeed*.65);
        else { e.facing=norm(p.x-e.x,p.z-e.z); e.facingAngle=Math.atan2(e.facing.x,e.facing.z); }
      }
      if(e.stateTime >= e.windup){
        e.state = 'active'; e.stateTime = 0;
        if(e.attack.projectile){ spawnProjectile(e); e.hitDone = true; }
      }
    }
    else if(e.state === 'active'){
      if(!e.attack.projectile){
        const lungeScale = e.fusion
          ? ({ pounce:1.05, dart:.72, snatch:.38, chomp:.28, harvest:.18, stomp:.12, charge:1.55, dive:.92, snap:.22, stab:.48 }[e.attack.movement] || .5) * S
          : 1.9*S;
        e.x += e.facing.x*lungeScale*dt; e.z += e.facing.z*lungeScale*dt;   // lunge-commit
        if(!e.hitDone) resolveEnemyMelee(e, p);
      }
      if(e.stateTime >= e.active){ e.state = 'recovery'; e.stateTime = 0; }
    }
    else if(e.state === 'recovery'){
      e.vx = e.vz = 0;
      if(e.stateTime >= e.recovery){ e.state = 'idle'; e.stateTime = 0; e.cooldown = e.attack.cooldown / tuning.aggression; director.release(e); }
    }
    else {
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx,dz);
      if(e.fusion){ e.facing=norm(dx,dz); e.facingAngle=Math.atan2(e.facing.x,e.facing.z); }
      const permitted = director.hasApproachPermit(e);
      const alignment = e.role === 'goblin' ? Math.abs(wrapPi(Math.atan2(dx,dz)-e.facingAngle)) : 0;
      const att = (e.cooldown <= 0 && e.stunned <= 0 && !playerDead()) ? chooseAttack(e, d, p) : null;
      if(att && permitted && alignment <= e.attackAlign && director.canGrant(e, att, { enemies, pressureBudget:director.settings.pressureBudget, aggression:tuning.aggression })){
        startEnemyAttack(e, att, p);
      } else {
        if(e.fusion){
          const wantRange=e.preferredRange;
          if(d>wantRange+.45*S) seekPlayer(e,p,dt); else moveFusion(e,p,dt,d);
        } else if(!updateGoblinRally(e,p,dt,d)) moveGoblin(e,p,dt,d);
        applySeparationSteering(e, dt);
        e.x += e.vx*dt; e.z += e.vz*dt;
      }
    }
    updateFusionAccessibility(e);
    if(navigation?.resolveMovement){
      const moved = navigation.resolveMovement(previous, { x:e.x - previous.x, z:e.z - previous.z }, collisionRadius(e));
      e.x = moved.x; e.z = moved.z;
    } else {
      const rr = Math.hypot(e.x, e.z);
      if(rr > arenaRadius - CLAMP_MARGIN){ e.x *= (arenaRadius - CLAMP_MARGIN)/rr; e.z *= (arenaRadius - CLAMP_MARGIN)/rr; }
    }
  }

  function resolveBodyCollisions(p){
    const origins = new Map(enemies.map(e => [e, { x:e.x, z:e.z }]));
    for(let pass = 0; pass < 4; pass++){
      for(let i = 0; i < enemies.length; i++){
        const a = enemies[i]; if(a.hp <= 0) continue;
        for(let j = i+1; j < enemies.length; j++){
          const b = enemies[j]; if(b.hp <= 0) continue;
          let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx,dz);
          const min = separationRadius(a) + separationRadius(b) + .22;
          if(d >= min) continue;
          if(d < 1e-4){ const ang = ((a.id*17 + b.id*31) % 360) * Math.PI/180; dx = Math.cos(ang); dz = Math.sin(ang); d = 1; }
          const push = (min - d) * .5 / d;
          a.x -= dx*push; a.z -= dz*push; b.x += dx*push; b.z += dz*push;
        }
        // keep enemies out of the player's body (the arena owns player pos, so we
        // only move the enemy — this is what stops a lunge from ending on top of you)
        const e = a;
        for(const circle of playerCollisionCircles(e)){
          let dx = circle.x - p.x, dz = circle.z - p.z, d = Math.hypot(dx,dz), min = circle.radius + PLAYER_R;
          if(d < 1e-4){ const ang = (e.id * 47 % 360) * Math.PI/180; dx = Math.cos(ang); dz = Math.sin(ang); d = 1; }
          if(d < min){ const push = (min - d) / d; e.x += dx*push; e.z += dz*push; }
        }
      }
    }
    if(navigation?.resolveMovement){
      for(const e of enemies){
        const origin = origins.get(e) || { x:e.x, z:e.z };
        const projected = navigation.resolveMovement(origin, { x:e.x - origin.x, z:e.z - origin.z }, collisionRadius(e));
        e.x = projected.x; e.z = projected.z;
      }
    }
  }

  /* ---------- punch-style rig pose ---------- */
  function applyRallyPose(e){
    e.headRoot.rotation.set(0,0,0);
    if(e.gesture !== 'rally') return;
    const u=clamp(e.gestureTime/e.gestureDuration,0,1);
    const raise=u<.2 ? easeOutCubic(u/.2) : (u>.78 ? 1-easeOutCubic((u-.78)/.22) : 1);
    const shaking=u>.2&&u<.8 ? Math.sin((u-.2)/.6*Math.PI*6) : 0;
    e.weaponRigRoot.rotation.x=lerp(e.weaponRigRoot.rotation.x,-2.18,raise);
    e.weaponRigRoot.rotation.z=shaking*.42*raise;
    e.weaponRigRoot.position.y=.46*raise;
    e.torsoRoot.position.y+=Math.abs(shaking)*.07*raise;
    e.torsoRoot.rotation.z+=shaking*.055*raise;
    e.headRoot.rotation.y=-shaking*.11*raise;
  }
  function applyPunchPose(e){
    const k = e.poseScale ?? 1;
    let lean = 0, weaponA = -.4;
    if(e.thrower){
      if(e.state === 'windup'){
        const pr = easeOutCubic(clamp(e.stateTime/Math.max(e.windup,1e-3),0,1));
        lean = -.18*pr; e.weaponRigRoot.rotation.set(-.35*pr, .55*pr, -.65*pr);
      } else if(e.state === 'active'){
        lean = .32; e.weaponRigRoot.rotation.set(.75, -.18, .35);
      } else if(e.state === 'recovery'){
        const pr = clamp(e.stateTime/Math.max(e.recovery,1e-3),0,1);
        lean = .32*(1-pr); e.weaponRigRoot.rotation.set(.75*(1-pr), -.18*(1-pr), .35*(1-pr));
      } else e.weaponRigRoot.rotation.set(0,0,0);
    }
    else if(e.state === 'windup'){ const pr = easeOutCubic(clamp(e.stateTime/Math.max(e.windup,1e-3),0,1)); lean = -.38*pr; weaponA = -.4 - 1.6*pr; }
    else if(e.state === 'active'){ lean = .40; weaponA = .9; }
    else if(e.state === 'recovery'){ const pr = clamp(e.stateTime/Math.max(e.recovery,1e-3),0,1); lean = .40*(1-pr); weaponA = .9 - 1.3*pr; }
    else if(e.stunned > 0){ lean = Math.sin(time*26)*.06; }
    e.torsoRoot.rotation.set(lean,0,0);
    e.torsoRoot.position.y = e.state === 'idle' ? Math.sin(time*2 + e.bobPhase)*.03 : 0;
    if(!e.thrower){ e.weaponRigRoot.position.set(0,0,0); e.weaponRigRoot.rotation.set(weaponA*k,0,0); }
    e.root.rotation.y = Math.atan2(e.facing.x, e.facing.z);
  }
  /* ---------- authored goblin melee pose ---------- */
  // Maps the enemy state clock onto the real attack's timeline, samples the exact
  // player pose (shared interpreter), then drives the goblin rig: torso coil +
  // the weapon floated at the pose's hold point / tip direction. The rig has no
  // arms, so — like its static weapon — the weapon simply hangs at the grip.
  function applyRealCombatPose(e){
    const att = e.combatAtt;
    const activeEnd = Math.max(att.contactAt, att.comboAt);
    let at = -1;                                            // -1 = idle -> IDLE pose
    if(e.state === 'windup')        at = clamp(e.stateTime/Math.max(e.windup,1e-3),0,1) * att.contactAt;
    else if(e.state === 'active')   at = att.contactAt + clamp(e.stateTime/Math.max(e.active,1e-3),0,1) * (activeEnd - att.contactAt);
    else if(e.state === 'recovery') at = activeEnd + clamp(e.stateTime/Math.max(e.recovery,1e-3),0,1) * (att.total - activeEnd);
    const pose = at >= 0 ? interp.sampleAttack(att, at, poseScratch)
                         : interp.poseLerp(interp.IDLE, interp.IDLE, 0, poseScratch);
    const h = e.height, r = e.radius;
    // torso coil — kept light so the weapon swing (pose.tip) reads without the
    // torso rotation double-compounding onto it.
    e.pelvis.position.set(pose.hip.x*h*.16, -pose.lower*h*.10, pose.hip.z*h*.10 + pose.lunge*r*G_LUNGE);
    e.pelvis.rotation.y = pose.hipTwist*.65;
    e.torsoRoot.rotation.set(pose.pitch*.35, pose.twist*.34, pose.lean*.30);
    e.torsoRoot.position.set(0, e.state === 'idle' ? Math.sin(time*2 + e.bobPhase)*.03 : 0, 0);
    e.headRoot.rotation.set(pose.head.y*.35, pose.head.x*.42, 0);
    // weapon transform in torso-local space (weaponRigRoot stays identity)
    _tip.copy(pose.tip).normalize();
    _q.setFromUnitVectors(_UP, _tip); _qr.setFromAxisAngle(_tip, pose.roll); _q.premultiply(_qr);
    _holdV.set(pose.hold.x*(h*G_HOLD), h*G_ANCHOR_Y + pose.hold.y*(h*G_HOLD), r*G_ANCHOR_Z + pose.hold.z*(h*G_HOLD));
    _gripOff.set(0, e.RIG?.gripCenter ?? -.14, 0).applyQuaternion(_q).multiplyScalar(e.weaponScale);
    e.weaponRigRoot.position.set(0,0,0); e.weaponRigRoot.rotation.set(0,0,0); e.weaponRigRoot.scale.setScalar(1);
    e.weaponRoot.position.copy(_holdV).sub(_gripOff);
    e.weaponRoot.quaternion.copy(_q);
    e.weaponRoot.scale.setScalar(e.weaponScale);
    e.root.rotation.y = Math.atan2(e.facing.x, e.facing.z);
  }
  function updateEnemyVisual(e, dt){
    if(e.fusion){
      e.root.rotation.y = Math.atan2(e.facing.x, e.facing.z);
      fusionRig.update(e.fusionVisual, e, dt, time, tuning.heightScale * e.visualScale);
    } else if(e.useRealCombat) applyRealCombatPose(e);
    else applyPunchPose(e);
    if(!e.fusion) applyRallyPose(e);
    e.root.position.set(e.x, e.yOff + e.rootLift, e.z);
    const flashScale = 1 + Math.max(0, e.flash) * .18;
    // squash-and-stretch rides the flash pop: wide + short at max, easing back
    const sq = e.squash * (e.squashT / e.squashMax);
    e.root.scale.set(flashScale * (1 + sq*.45), flashScale * (1 - sq*.36), flashScale * (1 + sq*.45));
    e.root.rotation.z = e.spin * .12;
    if(e.fusion) rig.updateSharedEnemyMarkers(e, e.height * tuning.heightScale * e.targetScale, mats);
    else rig.applyGoblinVisual(e, tuning.heightScale, mats);
    const f = clamp(e.hp/e.maxHp, 0, 1); e.bar.scale.x = f; e.bar.position.x = -(1 - f)*e.radius*.85;
    e.bar.lookAt(lastPlayer.x ?? 0, 2, lastPlayer.z ?? 0);
  }

  /* ---------- waves ---------- */
  // Pure strains remain the default; the picker can switch the wave to the
  // retained goblin roster or focus on one pure strain.
  const MIX = FUSION_ENEMY_IDS;
  const GOBLIN_MIX = Object.keys(BASE_ARCHETYPES);
  function chooseSpawnKind(i){
    if(tuning.spawnKind === 'mixed') return MIX[(wave - 1 + i) % MIX.length];
    if(tuning.spawnKind === 'goblins') return GOBLIN_MIX[(wave - 1 + i) % GOBLIN_MIX.length];
    return tuning.spawnKind;
  }
  function spawnPos(){
    const roomPoint = navigation?.randomSpawn?.(activeEncounterRoomId, lastPlayer);
    if(roomPoint) return roomPoint;
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
    // Free this enemy's geometry now. Shatter pieces (if any) clone their own
    // geometry, so the root's buffers are no longer referenced. Materials are left
    // for the shatter pieces and reclaimed at clearEnemies.
    if(!e.fusion) disposeEnemyGeometry(e.root);
  }
  function damageEnemy(e, amount, knock = { x:0, z:0 }, opts = {}){
    if(e.hp <= 0) return false;
    endRally(e);
    // hit power (~1 average swing, ~2 charged haymaker) drives the body reaction
    const power = opts.power ?? clamp(amount / 28, .4, 2);
    const pop = opts.pop ?? 1;
    e.hp -= amount;
    e.flash = .12 + power * .08;
    e.stunned = Math.max(e.stunned, .18 + power * .06);
    director.releaseAllForEnemy(e);
    if(e.state === 'windup' || e.state === 'active' || e.state === 'recovery'){ e.state = 'idle'; e.stateTime = 0; }
    e.knockX += (knock.x || 0) * .65; e.knockZ += (knock.z || 0) * .65;
    // squash-and-stretch + spin + vertical pop on heavy hits
    e.squash = Math.min(1, (.22 + power * .28) * pop);
    e.squashT = e.squashMax = .18 + power * .10;
    e.spinVel += (Math.random() < .5 ? -1 : 1) * (1.6 + power * 2.6) * pop;
    if(power > .95) e.vyOff += (1.4 + power * 1.9) * pop;
    if(e.hp <= 0){
      kills++; waveKills++;
      // gibs fly harder on the killing blow (shatterGoblin normalizes knock, so
      // magnitude goes in via the power/spread multiplier)
      if(e.fusion){
        fusionRig.shatterMeshes(e.fusionVisual).forEach((mesh, i) => {
          rig.addDeathPieceFromObject(worldRoot, deathPieces, mesh, null, mesh.material, knock, (1 + i*.025) * (1.05 + power*.35));
        });
      } else {
        rig.shatterGoblin(worldRoot, deathPieces, e, knock, mats.matIron, 1.2 + power * .7);
      }
      removeEnemy(e);
      return true;
    }
    return false;
  }

  /* ---------- lifecycle ---------- */
  function clearDeathPieces(){ deathPieces.forEach(p => { if(p.mesh){ p.mesh.parent?.remove(p.mesh); p.mesh.geometry?.dispose?.(); } }); deathPieces.length = 0; }
  function clearEnemies(){
    director.reset();
    enemies.splice(0).forEach(e => {
      if(e.fusion) fusionRig.dispose(e.fusionVisual);
      else { disposeEnemyGeometry(e.root); disposeEnemyMaterials(e.root); }
      if(e.root.parent) e.root.parent.remove(e.root);
    });
    projectiles.forEach(pr => { pr.dead = true; if(pr.mesh) pr.mesh.visible = false; });
    clearDeathPieces();
  }
  function startRoomEncounter(roomId){
    clearEnemies();
    activeEncounterRoomId = roomId;
    waveKills = 0; spawnedThisWave = 0; waveClearT = 0;
    startWave();
  }
  function reset(){
    clearEnemies();
    wave = 1; kills = 0; tuning.playerHp = 100; tuning.lastPlayerHit = '';
    activeEncounterRoomId = null;
    if(!roomEncounterMode) startWave();
  }

  function update(dt, player){
    lastPlayer = player || lastPlayer;
    time += dt;
    director.update(dt, { enemies, player:lastPlayer, pressureBudget:director.settings.pressureBudget, aggression:tuning.aggression });
    director.markNearEligible(enemies, lastPlayer);
    director.assignBattleCircleSlots(enemies);
    for(const e of enemies){ e._visualStartX = e.x; e._visualStartZ = e.z; }
    for(const e of [...enemies]) updateEnemy(e, dt, lastPlayer);
    resolveBodyCollisions(lastPlayer);
    for(const e of enemies){
      e.maxGroundSpeed = Math.max(.1, e.speed * tuning.speedScale);
      e.visualGroundSpeed = Math.min(e.maxGroundSpeed, Math.hypot(e.x - e._visualStartX, e.z - e._visualStartZ) / Math.max(dt, .001));
    }
    updateProjectiles(dt, lastPlayer);
    for(const e of enemies) updateEnemyVisual(e, dt);
    rig.updateDeathPieces(dt, deathPieces);
    // wave clear when everything is dead
    if(!enemies.length && !playerDead()){
      waveClearT += dt;
      if(waveClearT > 1.0){
        if(roomEncounterMode && activeEncounterRoomId !== null){
          const clearedRoomId = activeEncounterRoomId;
          activeEncounterRoomId = null; waveClearT = 0;
          director.onWaveClear();
          onEncounterCleared?.(clearedRoomId);
        } else if(!roomEncounterMode) finishWave();
      }
    } else waveClearT = 0;
  }

  if(!roomEncounterMode) startWave();

  return {
    enemies, group, director, update, damageEnemy, reset, startRoomEncounter, clearRoomRuntime:clearEnemies,
    setDirectorMode:(m)=>director.setMode(m),
    setPressureBudget:(v)=>{ director.settings.pressureBudget = clamp(Number(v) || 2.25, .5, 4); },
    setAggression:(v)=>{ tuning.aggression = clamp(Number(v) || 1, .25, 3); director.settings.aggression = tuning.aggression; },
    setCycleOnWaveClear:(v)=>{ director.settings.cycleOnWaveClear = !!v; },
    setWaveSize:(v)=>{ tuning.waveSize = clamp(Math.round(Number(v) || 6), 1, 20); },
    setSpeedScale:(v)=>{ tuning.speedScale = clamp(Number(v) || 1, .25, 1.5); },
    setHeightScale:(v)=>{ tuning.heightScale = clamp(Number(v) || 1, .5, 3.5); },
    setHpScale:(v)=>{ tuning.hpScale = clamp(Number(v) || 1, .25, 5); },
    setIdleRangeScale:(v)=>{ tuning.idleRangeScale = clamp(Number(v) || 3, 1, 6); director.settings.battleCircleRadius = 1.6*S*(tuning.idleRangeScale/3); director.getDebugState().slots.forEach(sl => { sl.radius = director.settings.battleCircleRadius; }); },
    setSpawnKind:(kind)=>{ tuning.spawnKind = kind === 'mixed' || kind === 'goblins' || FUSION_ENEMY_IDS.includes(kind) ? kind : 'mixed'; },
    setGoblinColors:()=>{}, setGoblinRigDebug:()=>{}, setSpawnGoblins:()=>{},
    get heightScale(){ return tuning.heightScale; },
    get speedScale(){ return tuning.speedScale; },
    get hpScale(){ return tuning.hpScale; },
    get waveSize(){ return tuning.waveSize; },
    get idleRangeScale(){ return tuning.idleRangeScale; },
    get aggression(){ return tuning.aggression; },
    get spawnKind(){ return tuning.spawnKind; },
    get wave(){ return wave; },
    get waveKills(){ return waveKills; },
    get kills(){ return kills; },
    get playerHp(){ return tuning.playerHp; },
    get lastPlayerHit(){ return tuning.lastPlayerHit; },
    get lastPlayerHitDir(){ return tuning.lastPlayerHitDir || null; },
    get activeEncounterRoomId(){ return activeEncounterRoomId; }
  };
}
