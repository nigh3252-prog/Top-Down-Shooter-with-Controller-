const DEFAULT_PROFILE = Object.freeze({
  max:72,
  chance:.64,
  raise:.14,
  hold:.78,
  lower:.16,
  cooldown:1.05,
  breakStun:1.08,
  regenDelay:1.35,
  regenRate:24,
});

export const GOBLIN_GUARD_PROFILES = Object.freeze({
  grunt:Object.freeze({ ...DEFAULT_PROFILE }),
  dagger:Object.freeze({ ...DEFAULT_PROFILE, max:52, chance:.72, raise:.09, hold:.62, lower:.12, cooldown:.82, breakStun:.88, regenRate:28 }),
  mace:Object.freeze({ ...DEFAULT_PROFILE, max:108, chance:.62, raise:.19, hold:.92, cooldown:1.22, breakStun:1.28, regenRate:20 }),
  rock:Object.freeze({ ...DEFAULT_PROFILE, max:64, chance:.56, raise:.15, hold:.70, cooldown:1.12, breakStun:1.02, regenRate:22 }),
  captain:Object.freeze({ ...DEFAULT_PROFILE, max:152, chance:.80, raise:.21, hold:1.02, lower:.20, cooldown:1.28, breakStun:1.48, regenRate:18 }),
});

const UPWARD_ATTACK_KEYS = new Set(['vertical2','vertical7','vertical8','vertical9']);
const HEAVY_WEAPON_PATTERN = /(hammer|mace|axe|great|maul|pile|bunker)/i;
const UPWARD_LABEL_PATTERN = /(rising|upper|upswing|launcher|launch)/i;
const GUARD_FRONT_DOT = Math.cos(75 * Math.PI / 180);
const PLAYER_AIM_DOT = Math.cos(68 * Math.PI / 180);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth01 = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const normalize2 = (x, z) => {
  const length = Math.hypot(x, z) || 1;
  return { x:x / length, z:z / length };
};

export function guardProfileForKind(kind){
  return GOBLIN_GUARD_PROFILES[kind] || DEFAULT_PROFILE;
}

export function isGuardableGoblin(enemy){
  return !!enemy && enemy.hp > 0 && enemy.role === 'goblin' && !enemy.fusion;
}

export function classifyGuardAttack({ attackGroup='', attackKey='', attackLabel='', weaponId='', charged=false, chargeTier=0 } = {}){
  const group = String(attackGroup || '').toLowerCase();
  const key = String(attackKey || '').toLowerCase();
  const label = String(attackLabel || '');
  const upward = UPWARD_ATTACK_KEYS.has(key) || UPWARD_LABEL_PATTERN.test(label);
  const chop = group === 'vertical' && !upward;
  const heavyWeapon = HEAVY_WEAPON_PATTERN.test(String(weaponId || ''));
  let guardMultiplier = group === 'stab' ? .58 : group === 'horizontal' ? .72 : 1;
  let guardClass = group || 'standard';
  if(chop){ guardMultiplier = 1.55; guardClass = 'chop'; }
  if(upward){ guardMultiplier = 2.55; guardClass = 'upward'; }
  if(heavyWeapon) guardMultiplier *= 1.16;
  const tier = Math.max(0, Number(chargeTier) || 0);
  if(charged || tier > 0) guardMultiplier *= 1.20 + Math.min(.65, tier * .22);
  return { guardClass, guardMultiplier, upward, chop, heavyWeapon, charged:!!charged, chargeTier:tier };
}

export function computeGuardDamage({ amount=0, knock={x:0,z:0}, attack={} } = {}){
  const damage = Math.max(0, Number(amount) || 0);
  const impulse = Math.hypot(Number(knock?.x) || 0, Number(knock?.z) || 0);
  const multiplier = Math.max(.1, Number(attack.guardMultiplier) || 1);
  return Math.max(4, Math.round((damage * .72 + impulse * .80 + 3) * multiplier));
}

function currentCombatSnapshot(){
  const runtime = globalThis.__arena;
  const combat = runtime?.combatState;
  const attack = combat?.attack;
  return {
    active:!!attack,
    attackRef:attack || null,
    attackKey:combat?.attackKey || '',
    attackGroup:combat?.attackGroup || '',
    attackLabel:attack?.label || '',
    weaponId:combat?.weapon || '',
    t:Number(combat?.t) || 0,
    contactAt:Number(attack?.contactAt) || 0,
    total:Number(attack?.total) || 0,
    commitYaw:Number(combat?.commitYaw) || 0,
    charged:!!runtime?.arena?.charge?.active,
    chargeTier:Number(runtime?.arena?.charge?.tier) || 0,
  };
}

export function installGoblinGuard(system, { THREE, worldRoot } = {}){
  if(!system || !THREE) return system;

  const baseUpdate = system.update.bind(system);
  const baseDamageEnemy = system.damageEnemy.bind(system);
  const baseLaunchRigidBody = system.launchRigidBody?.bind(system);
  const baseReset = system.reset?.bind(system);
  const baseStartRoomEncounter = system.startRoomEncounter?.bind(system);
  const baseClearRoomRuntime = system.clearRoomRuntime?.bind(system);
  const states = new WeakMap();
  const tracked = new Set();
  const effects = [];
  let lastAttackRef = null;
  let lastAttackT = Infinity;
  let attackSerial = 0;
  let lastPlayer = { x:0, z:0 };

  const up = new THREE.Vector3(0,1,0);
  const tip = new THREE.Vector3();
  const targetQ = new THREE.Quaternion();
  const rollQ = new THREE.Quaternion();
  const gripOffset = new THREE.Vector3();
  const targetPos = new THREE.Vector3();
  const sparkGeometry = new THREE.OctahedronGeometry(.09,0);
  const sparkMaterial = new THREE.MeshBasicMaterial({ color:0xffd985, transparent:true, opacity:.95, depthWrite:false });
  const guardBarGeometry = new THREE.BoxGeometry(1,.06,.04);
  const guardBarBgMaterial = new THREE.MeshBasicMaterial({ color:0x332f2a, transparent:true, opacity:.88, depthWrite:false });
  const guardBarMaterial = new THREE.MeshBasicMaterial({ color:0xe7c56f, transparent:true, opacity:.95, depthWrite:false });

  function syncEnemyFields(enemy, state){
    enemy.guard = state.value;
    enemy.guardMax = state.max;
    enemy.guardState = state.phase;
    enemy.guardBroken = state.phase === 'broken';
    enemy.guardBlockedT = state.impactT;
  }

  function ensureGuardBar(enemy, state){
    if(state.bar || !enemy.root) return;
    const width = Math.max(1.05, enemy.radius * 1.85);
    const bg = new THREE.Mesh(guardBarGeometry, guardBarBgMaterial);
    const fill = new THREE.Mesh(guardBarGeometry, guardBarMaterial);
    bg.name = `${enemy.kind || 'goblin'} guard bar background`;
    fill.name = `${enemy.kind || 'goblin'} guard bar`;
    bg.scale.set(width,1,1);
    fill.scale.set(width,1.08,1.08);
    bg.position.set(0, enemy.height + .18, 0);
    fill.position.copy(bg.position);
    fill.position.z += .015;
    bg.visible = fill.visible = false;
    enemy.root.add(bg,fill);
    state.bar = { bg, fill, width };
  }

  function stateFor(enemy){
    let state = states.get(enemy);
    if(state) return state;
    const profile = guardProfileForKind(enemy.kind);
    state = {
      profile,
      max:profile.max,
      value:profile.max,
      phase:'idle',
      phaseT:0,
      cooldown:Math.random() * .65,
      regenDelay:0,
      impactT:0,
      recoil:0,
      lastAttackSerial:-1,
      bar:null,
    };
    states.set(enemy,state);
    tracked.add(enemy);
    ensureGuardBar(enemy,state);
    syncEnemyFields(enemy,state);
    return state;
  }

  function hideGuardBar(state){
    if(!state?.bar) return;
    state.bar.bg.visible = false;
    state.bar.fill.visible = false;
  }

  function updateGuardBar(enemy, state, player){
    ensureGuardBar(enemy,state);
    if(!state.bar) return;
    const visible = state.phase !== 'idle' || state.impactT > 0 || state.value < state.max - .5;
    state.bar.bg.visible = visible;
    state.bar.fill.visible = visible;
    if(!visible) return;
    const ratio = clamp(state.value / state.max,0,1);
    const width = state.bar.width;
    state.bar.fill.scale.x = width * ratio;
    state.bar.fill.position.x = -(1-ratio) * width * .5;
    state.bar.bg.lookAt(player.x ?? 0,2,player.z ?? 0);
    state.bar.fill.lookAt(player.x ?? 0,2,player.z ?? 0);
  }

  function spawnSparks(enemy, strong=false){
    if(!worldRoot) return;
    const count = strong ? 12 : 6;
    const height = Math.max(1.2, enemy.height * (system.heightScale || 1) * .54);
    const facing = enemy.facing || {x:0,z:1};
    for(let i=0;i<count;i++){
      const mesh = new THREE.Mesh(sparkGeometry,sparkMaterial);
      mesh.position.set(enemy.x + facing.x * .48, height, enemy.z + facing.z * .48);
      mesh.scale.setScalar(strong ? 1.35 : 1);
      worldRoot.add(mesh);
      effects.push({
        mesh,
        age:0,
        life:strong ? .48 : .30,
        vx:(Math.random()-.5) * (strong ? 5.2 : 3.4) + facing.x * 1.2,
        vy:1.7 + Math.random() * (strong ? 4.2 : 2.5),
        vz:(Math.random()-.5) * (strong ? 5.2 : 3.4) + facing.z * 1.2,
        spin:(Math.random()-.5) * 16,
      });
    }
  }

  function updateEffects(dt){
    for(let i=effects.length-1;i>=0;i--){
      const fx = effects[i];
      fx.age += dt;
      if(fx.age >= fx.life){
        fx.mesh.parent?.remove(fx.mesh);
        effects.splice(i,1);
        continue;
      }
      fx.vy -= 12 * dt;
      fx.mesh.position.x += fx.vx * dt;
      fx.mesh.position.y += fx.vy * dt;
      fx.mesh.position.z += fx.vz * dt;
      fx.mesh.rotation.x += fx.spin * dt;
      fx.mesh.rotation.z -= fx.spin * .7 * dt;
      fx.mesh.material.opacity = Math.max(.05,1-fx.age/fx.life);
    }
    sparkMaterial.opacity = .95;
  }

  function clearEffects(){
    for(const fx of effects) fx.mesh.parent?.remove(fx.mesh);
    effects.length = 0;
  }

  function cancelEnemyAttack(enemy){
    system.director?.releaseAllForEnemy?.(enemy);
    enemy.attack = null;
    enemy.hitDone = false;
    enemy.state = 'idle';
    enemy.stateTime = 0;
  }

  function facePlayer(enemy, player){
    const facing = normalize2((player.x ?? 0)-enemy.x,(player.z ?? 0)-enemy.z);
    enemy.facing = facing;
    enemy.facingAngle = Math.atan2(facing.x,facing.z);
    enemy.targetFacingAngle = enemy.facingAngle;
  }

  function beginGuard(enemy, state){
    cancelEnemyAttack(enemy);
    state.phase = 'raising';
    state.phaseT = 0;
    state.recoil = 0;
    state.impactT = 0;
    state.regenDelay = state.profile.regenDelay;
    syncEnemyFields(enemy,state);
  }

  function endGuard(enemy, state){
    state.phase = 'idle';
    state.phaseT = 0;
    state.cooldown = state.profile.cooldown;
    state.regenDelay = Math.max(state.regenDelay,state.profile.regenDelay*.55);
    syncEnemyFields(enemy,state);
  }

  function breakGuard(enemy, state, knock={x:0,z:0}, { launch=false } = {}){
    state.value = 0;
    state.phase = 'broken';
    state.phaseT = 0;
    state.impactT = .42;
    state.recoil = 1;
    state.cooldown = state.profile.cooldown + .45;
    state.regenDelay = state.profile.regenDelay + state.profile.breakStun;
    cancelEnemyAttack(enemy);
    enemy.stunned = Math.max(enemy.stunned || 0,state.profile.breakStun);
    enemy.knockX = (enemy.knockX || 0) + (Number(knock.x)||0) * (launch ? .45 : .22);
    enemy.knockZ = (enemy.knockZ || 0) + (Number(knock.z)||0) * (launch ? .45 : .22);
    spawnSparks(enemy,true);
    syncEnemyFields(enemy,state);
  }

  function guardIsActive(state){
    return state.phase === 'raising' || state.phase === 'holding';
  }

  function hitInsideGuardArc(enemy, player){
    const toPlayer = normalize2((player.x ?? 0)-enemy.x,(player.z ?? 0)-enemy.z);
    const facing = enemy.facing || toPlayer;
    return facing.x*toPlayer.x + facing.z*toPlayer.z >= GUARD_FRONT_DOT;
  }

  function attackAimedAtEnemy(enemy, player, snapshot){
    const toEnemy = normalize2(enemy.x-(player.x??0),enemy.z-(player.z??0));
    const forward = {x:Math.sin(snapshot.commitYaw),z:Math.cos(snapshot.commitYaw)};
    return forward.x*toEnemy.x + forward.z*toEnemy.z >= PLAYER_AIM_DOT;
  }

  function maybeStartGuard(enemy, state, player, snapshot, activeCount, maxActive){
    if(!snapshot.active || state.lastAttackSerial === attackSerial) return false;
    if(state.phase !== 'idle' || state.cooldown > 0 || state.value < state.max*.32) return false;
    if(enemy.state !== 'idle' || (enemy.stunned || 0) > 0 || system.isRigidBodyActive?.(enemy)) return false;
    const distance = Math.hypot((player.x??0)-enemy.x,(player.z??0)-enemy.z);
    if(distance > 11.5 || activeCount >= maxActive || !attackAimedAtEnemy(enemy,player,snapshot)) return false;
    const reactionWindow = Math.max(.12,snapshot.contactAt*.84);
    if(snapshot.t > reactionWindow) return false;
    state.lastAttackSerial = attackSerial;
    const urgency = clamp(1-distance/15,.35,1);
    if(Math.random() > state.profile.chance * urgency) return false;
    facePlayer(enemy,player);
    beginGuard(enemy,state);
    return true;
  }

  function advanceGuardState(enemy, state, dt){
    state.phaseT += dt;
    state.cooldown = Math.max(0,state.cooldown-dt);
    state.regenDelay = Math.max(0,state.regenDelay-dt);
    state.impactT = Math.max(0,state.impactT-dt);
    state.recoil *= Math.pow(.035,dt);
    if(state.phase === 'raising' && state.phaseT >= state.profile.raise){
      state.phase = 'holding';
      state.phaseT = 0;
    }else if(state.phase === 'holding' && state.phaseT >= state.profile.hold){
      state.phase = 'lowering';
      state.phaseT = 0;
    }else if(state.phase === 'lowering' && state.phaseT >= state.profile.lower){
      endGuard(enemy,state);
    }else if(state.phase === 'broken' && state.phaseT >= state.profile.breakStun){
      state.phase = 'idle';
      state.phaseT = 0;
      syncEnemyFields(enemy,state);
    }
    if(state.phase === 'idle' && state.regenDelay <= 0 && state.value < state.max){
      state.value = Math.min(state.max,state.value + state.profile.regenRate * dt);
    }
  }

  function prepareBlockingEnemy(enemy, state, player){
    if(!guardIsActive(state) && state.phase !== 'lowering') return;
    facePlayer(enemy,player);
    cancelEnemyAttack(enemy);
    enemy.vx = (enemy.vx || 0) * .08;
    enemy.vz = (enemy.vz || 0) * .08;
    enemy.knockX = (enemy.knockX || 0) * .30;
    enemy.knockZ = (enemy.knockZ || 0) * .30;
    enemy.stunned = Math.max(enemy.stunned || 0,.055);
  }

  function applyGuardPose(enemy, state){
    if(system.isRigidBodyActive?.(enemy) || !enemy.weaponRoot) return;
    const h = enemy.height || 4;
    const r = enemy.radius || 1;
    const impact = clamp(state.impactT/.22,0,1);
    const side = enemy.id % 2 ? 1 : -1;
    if(guardIsActive(state) || state.phase === 'lowering'){
      const raise = state.phase === 'raising' ? smooth01(state.phaseT/Math.max(.001,state.profile.raise)) : 1;
      const lower = state.phase === 'lowering' ? 1-smooth01(state.phaseT/Math.max(.001,state.profile.lower)) : 1;
      const mix = raise*lower;
      tip.set(side,.04,.10).normalize();
      targetQ.setFromUnitVectors(up,tip);
      rollQ.setFromAxisAngle(tip,side*.08);
      targetQ.premultiply(rollQ);
      const weaponScale = enemy.weaponScale || enemy.RIG?.scale || 1;
      gripOffset.set(0,enemy.RIG?.gripCenter ?? -.14,0).applyQuaternion(targetQ).multiplyScalar(weaponScale);
      targetPos.set(0,h*.54,r*(.60-impact*.12)).sub(gripOffset);
      enemy.weaponRoot.position.lerp(targetPos,mix);
      enemy.weaponRoot.quaternion.slerp(targetQ,mix);
      enemy.weaponRoot.scale.setScalar(weaponScale);
      if(enemy.torsoRoot){
        enemy.torsoRoot.rotation.x += (-.10-impact*.10)*mix;
        enemy.torsoRoot.rotation.z += side*.055*mix;
        enemy.torsoRoot.position.y -= .04*mix;
      }
      if(enemy.pelvis) enemy.pelvis.position.y -= h*.025*mix;
      if(enemy.headRoot) enemy.headRoot.rotation.x += .10*mix;
    }else if(state.phase === 'broken'){
      const u = smooth01(state.phaseT/Math.max(.001,state.profile.breakStun));
      const mix = 1-u;
      tip.set(side*.75,.64,-.16).normalize();
      targetQ.setFromUnitVectors(up,tip);
      const weaponScale = enemy.weaponScale || enemy.RIG?.scale || 1;
      gripOffset.set(0,enemy.RIG?.gripCenter ?? -.14,0).applyQuaternion(targetQ).multiplyScalar(weaponScale);
      targetPos.set(side*r*.48,h*.68,-r*.02).sub(gripOffset);
      enemy.weaponRoot.position.lerp(targetPos,mix);
      enemy.weaponRoot.quaternion.slerp(targetQ,mix);
      if(enemy.torsoRoot){
        enemy.torsoRoot.rotation.x -= .36*mix;
        enemy.torsoRoot.rotation.z -= side*.20*mix;
      }
      if(enemy.headRoot) enemy.headRoot.rotation.x -= .20*mix;
    }
  }

  function refreshAttackSerial(snapshot){
    if(snapshot.active && (snapshot.attackRef !== lastAttackRef || snapshot.t + .001 < lastAttackT)) attackSerial++;
    lastAttackRef = snapshot.attackRef;
    lastAttackT = snapshot.t;
  }

  system.update = function updateWithGoblinGuard(dt, player={x:0,z:0}){
    lastPlayer = player || lastPlayer;
    const snapshot = currentCombatSnapshot();
    refreshAttackSerial(snapshot);
    const goblins = system.enemies.filter(isGuardableGoblin);
    let activeCount = 0;
    for(const enemy of goblins){
      const state = stateFor(enemy);
      advanceGuardState(enemy,state,dt);
      if(guardIsActive(state) || state.phase === 'lowering') activeCount++;
    }
    const maxActive = Math.max(1,Math.min(3,Math.ceil(goblins.length/3)));
    for(const enemy of goblins){
      const state = stateFor(enemy);
      if(maybeStartGuard(enemy,state,lastPlayer,snapshot,activeCount,maxActive)) activeCount++;
      prepareBlockingEnemy(enemy,state,lastPlayer);
      syncEnemyFields(enemy,state);
    }
    baseUpdate(dt,lastPlayer);
    for(const enemy of goblins){
      if(!system.enemies.includes(enemy)) continue;
      const state = stateFor(enemy);
      if(guardIsActive(state) || state.phase === 'lowering') enemy.stunned = 0;
      applyGuardPose(enemy,state);
      updateGuardBar(enemy,state,lastPlayer);
      syncEnemyFields(enemy,state);
    }
    updateEffects(dt);
  };

  system.damageEnemy = function damageEnemyWithGoblinGuard(enemy, amount, knock={x:0,z:0}, opts={}){
    if(!isGuardableGoblin(enemy) || system.isRigidBodyActive?.(enemy)) return baseDamageEnemy(enemy,amount,knock,opts);
    const state = stateFor(enemy);
    if(guardIsActive(state) && hitInsideGuardArc(enemy,lastPlayer)){
      const snapshot = currentCombatSnapshot();
      const attack = classifyGuardAttack(snapshot);
      const guardDamage = computeGuardDamage({amount,knock,attack});
      state.value = Math.max(0,state.value-guardDamage);
      state.impactT = .24;
      state.recoil = clamp(guardDamage/state.max,.12,1);
      state.regenDelay = state.profile.regenDelay;
      enemy.guardLastHit = { blocked:true, guardDamage, guardClass:attack.guardClass, attackKey:snapshot.attackKey, attackGroup:snapshot.attackGroup };
      enemy.flash = 0;
      spawnSparks(enemy,false);
      if(state.value <= 0) breakGuard(enemy,state,knock);
      syncEnemyFields(enemy,state);
      return false;
    }
    if(guardIsActive(state) || state.phase === 'lowering') endGuard(enemy,state);
    return baseDamageEnemy(enemy,amount,knock,opts);
  };

  if(baseLaunchRigidBody){
    system.launchRigidBody = function launchRigidBodyThroughGuard(enemy,launch={}){
      if(isGuardableGoblin(enemy)){
        const state = stateFor(enemy);
        if(guardIsActive(state) || state.phase === 'lowering'){
          const knock = {x:Number(launch.velocityX)||0,z:Number(launch.velocityZ)||0};
          breakGuard(enemy,state,knock,{launch:true});
          applyGuardPose(enemy,state);
        }
      }
      return baseLaunchRigidBody(enemy,launch);
    };
  }

  function clearGuardRuntime(){
    clearEffects();
    for(const enemy of tracked) hideGuardBar(states.get(enemy));
    tracked.clear();
    lastAttackRef = null;
    lastAttackT = Infinity;
    attackSerial = 0;
  }

  if(baseReset) system.reset = function resetGoblinGuard(){ clearGuardRuntime(); return baseReset(); };
  if(baseStartRoomEncounter) system.startRoomEncounter = function startRoomEncounterGoblinGuard(roomId){ clearGuardRuntime(); return baseStartRoomEncounter(roomId); };
  if(baseClearRoomRuntime) system.clearRoomRuntime = function clearRoomRuntimeGoblinGuard(){ clearGuardRuntime(); return baseClearRoomRuntime(); };

  Object.defineProperty(system,'guardedGoblinCount',{ enumerable:true, get:()=>system.enemies.filter(enemy=>isGuardableGoblin(enemy)&&guardIsActive(stateFor(enemy))).length });
  Object.defineProperty(system,'brokenGuardCount',{ enumerable:true, get:()=>system.enemies.filter(enemy=>isGuardableGoblin(enemy)&&stateFor(enemy).phase==='broken').length });
  return system;
}
