export const DIRECTOR_MODES = [
  { id:'attackChain', label:'Attack Chain' },
  { id:'dodgeTraining', label:'Dodge Training' },
  { id:'chaos', label:'Chaos' },
  { id:'oneAttacker', label:'One Attacker' },
  { id:'battleCircle', label:'Battle Circle' },
  { id:'pressureBudget', label:'Pressure Budget' },
  { id:'nearFar', label:'Near / Far' },
  { id:'wavePacing', label:'Wave Pacing' },
  { id:'eliteSpotlight', label:'Elite Spotlight' }
];

export const DEFAULT_DIRECTOR_SETTINGS = {
  mode:'pressureBudget', pressureBudget:3, cycleOnWaveClear:false, nearCount:3,
  battleCircleSlots:8, battleCircleRadius:4.5, aggression:1.15,
  pressureApproachers:3, pressureMeleeCap:1, impactGap:.46,
  rangedActiveCap:1, rangedGap:.9, directEngageDelay:.2
};

const INITIATION_PROFILES = {
  slash:        { engageRange:7.2, closeSpeed:1.30, preferredRange:3.0, lungeSpeed:9.5,  hop:2.0, minLungeDistance:2.0 },
  poke:         { engageRange:6.6, closeSpeed:1.45, preferredRange:2.2, lungeSpeed:10.5, hop:1.8, minLungeDistance:1.8 },
  maceOverhead: { engageRange:7.8, closeSpeed:1.18, preferredRange:4.0, lungeSpeed:7.5,  hop:1.2, minLungeDistance:2.5 },
  captainSmash: { engageRange:8.8, closeSpeed:1.15, preferredRange:4.6, lungeSpeed:8.2,  hop:2.4, minLungeDistance:2.8 },
  lionPounce:   { engageRange:8.4, closeSpeed:1.35, preferredRange:3.1, lungeSpeed:12.0, hop:3.4, minLungeDistance:2.2 },
  spidLegStab:  { engageRange:6.8, closeSpeed:1.55, preferredRange:2.2, lungeSpeed:11.0, hop:1.7, minLungeDistance:1.7 },
  sunDart:      { engageRange:7.5, closeSpeed:1.45, preferredRange:3.0, lungeSpeed:10.5, hop:2.2, minLungeDistance:2.0 },
  grabSnatch:   { engageRange:6.5, closeSpeed:1.35, preferredRange:2.0, lungeSpeed:9.0,  hop:1.8, minLungeDistance:1.8 },
  toothyChomp:  { engageRange:5.8, closeSpeed:1.25, preferredRange:1.8, lungeSpeed:7.5,  hop:1.0, minLungeDistance:1.5 },
  motherHarvest:{ engageRange:7.2, closeSpeed:1.10, preferredRange:2.8, lungeSpeed:7.0,  hop:1.4, minLungeDistance:2.2 },
  stiltStomp:   { engageRange:8.4, closeSpeed:1.15, preferredRange:2.8, lungeSpeed:8.0,  hop:2.1, minLungeDistance:2.4 },
  antCharge:    { engageRange:10.0,closeSpeed:1.55, preferredRange:3.8, lungeSpeed:14.0, hop:3.0, minLungeDistance:2.5 },
  phoenixDive:  { engageRange:10.0,closeSpeed:1.45, preferredRange:3.4, lungeSpeed:13.0, hop:4.5, minLungeDistance:2.5 },
  crocSnap:     { engageRange:7.0, closeSpeed:1.50, preferredRange:1.0, lungeSpeed:11.0, hop:.8,  minLungeDistance:1.5 },
  default:      { engageRange:7.0, closeSpeed:1.30, preferredRange:2.5, lungeSpeed:9.0,  hop:1.8, minLungeDistance:2.0 }
};

export function createCombatDirector(options = {}){
  const settings = { ...DEFAULT_DIRECTOR_SETTINGS, ...options };
  // The arena previously constructed this director with the old 2.25 budget.
  // Treat that exact legacy value as a migration point for the pressure pass.
  if(options.pressureBudget === 2.25) settings.pressureBudget = 3;
  const state = {
    mode:settings.mode, time:0, activeTokens:[], approachers:[], activeRally:null,
    directEngagedEnemy:null, lastRallyTime:-99, cooldownPressure:0,
    lastThreatTime:-99, lastMeleeThreatTime:-99, lastRangedThreatTime:-99,
    nextTokenId:1, waveCleared:false, grantTimes:[], modeSelectionMigrated:false
  };
  const slots = Array.from({ length:settings.battleCircleSlots }, (_, i) => ({
    angle: -Math.PI * .9 + i * (Math.PI * 1.8 / Math.max(1, settings.battleCircleSlots - 1)),
    radius: settings.battleCircleRadius,
    enemyId:null
  }));
  const modeIds = DIRECTOR_MODES.map(m => m.id);
  const tunedAttacks = new WeakSet();
  const live = e => e && e.hp > 0 && e.state !== 'dead';
  const distSqTo = (e, p) => { const dx = (p.x ?? 0) - e.x, dz = (p.z ?? 0) - e.z; return dx*dx + dz*dz; };
  const isRangedEnemy = e => !!e?.thrower || e?.attackId === 'rockThrow';
  const isMeleeEnemy = e => live(e) && !!e.attackId && !isRangedEnemy(e);
  const isMeleeGoblin = e => isMeleeEnemy(e) && e.role === 'goblin';
  const tokenIsCommitting = token => live(token?.enemy) && token.enemy.state !== 'recovery';
  const initiationProfile = enemy => INITIATION_PROFILES[enemy?.attackId] || INITIATION_PROFILES.default;

  function reset(){
    releaseAll();
    state.time = 0;
    state.cooldownPressure = 0;
    state.lastThreatTime = -99;
    state.lastMeleeThreatTime = -99;
    state.lastRangedThreatTime = -99;
    state.lastRallyTime = -99;
    state.directEngagedEnemy = null;
    state.nextTokenId = 1;
    state.waveCleared = false;
    state.grantTimes.length = 0;
  }
  function setMode(modeId){
    // Existing players may have the former default persisted in localStorage. Migrate
    // that first boot selection once; later manual One Attacker selections still work.
    if(!state.modeSelectionMigrated){
      state.modeSelectionMigrated = true;
      if(modeId === 'oneAttacker') modeId = 'pressureBudget';
    }
    if(modeIds.includes(modeId)) { state.mode = modeId; releaseAll(); }
  }
  function getMode(){ return state.mode; }
  function nextMode(){ const i = Math.max(0, modeIds.indexOf(state.mode)); setMode(modeIds[(i + 1) % modeIds.length]); return state.mode; }
  function releaseAll(){
    for(const t of state.activeTokens) if(t.enemy && t.enemy.token === t) t.enemy.token = null;
    state.activeTokens.length = 0;
    for(const e of state.approachers){
      if(!e) continue;
      e.approachPermit = false;
      e.directEngaged = false;
    }
    state.approachers.length = 0;
    state.directEngagedEnemy = null;
    if(state.activeRally?.gesture === 'rally') state.activeRally.gesture = null;
    state.activeRally = null;
  }
  function activeCost(kind=null){
    return state.activeTokens.reduce((sum, token) => {
      if(!tokenIsCommitting(token) || (kind && token.kind !== kind)) return sum;
      return sum + (token.cost || 0);
    }, 0);
  }
  function countActiveKind(kind){
    return state.activeTokens.filter(token => token.kind === kind && tokenIsCommitting(token)).length;
  }
  function releaseApproach(enemy, cooldown=0){
    if(!enemy) return;
    state.approachers = state.approachers.filter(e => e !== enemy);
    if(state.directEngagedEnemy === enemy) state.directEngagedEnemy = null;
    enemy.approachPermit = false;
    enemy.approachPermitTime = 0;
    enemy.directEngaged = false;
    enemy.directEngageReadyAt = 0;
    enemy.directEngageDistance = 0;
    enemy.directEngageCooldownCap = null;
    enemy.approachCooldown = Math.max(enemy.approachCooldown || 0, cooldown);
  }
  function release(enemy){
    if(!enemy) return;
    if(enemy.token){
      const token = enemy.token;
      state.activeTokens = state.activeTokens.filter(t => t !== token);
      // Melee pressure has a small memory so attacks stay sequenced. Ranged cadence
      // is controlled by its own global shot gap instead of consuming melee budget.
      if(token.kind === 'melee') state.cooldownPressure += (token.cost || 0) * .22;
      enemy.token = null;
    }
    releaseApproach(enemy, .35);
  }
  function releaseAllForEnemy(enemy){ release(enemy); }
  function removeDeadTokens(enemies = []){
    for(const e of enemies) if(!live(e) || e.stunned > 0) release(e);
    state.activeTokens = state.activeTokens.filter(t => live(t.enemy) && t.enemy.token === t);
  }

  function tuneAttack(attack){
    if(!attack || tunedAttacks.has(attack)) return;
    const damageTargets = new Map([[7,10],[8,12],[10,16],[24,32],[30,38]]);
    const currentDamage = Number(attack.damage) || 0;
    if(currentDamage > 0){
      attack.damage = damageTargets.get(currentDamage) ?? Math.max(currentDamage + 2, Math.round(currentDamage * 1.18));
    }
    if(Number.isFinite(attack.cooldown)) attack.cooldown = Math.max(.55, attack.cooldown * .82);
    // Keep attacks readable but remove the long stationary invitation to walk away.
    // Heavy attacks retain more anticipation than fast pokes and pounces.
    if(attack.kind === 'melee' && Number.isFinite(attack.windup)){
      attack.windup = Math.max(.28, attack.windup * (attack.wantsSolo ? .80 : .78));
    }
    tunedAttacks.add(attack);
  }

  function tuneEnemyPressure(enemy, dt){
    if(!live(enemy)) return;
    if(!Number.isFinite(enemy._pressureBaseSpeed)) enemy._pressureBaseSpeed = enemy.speed;
    if(!Number.isFinite(enemy._pressureBasePreferredRange)) enemy._pressureBasePreferredRange = enemy.preferredRange;
    const profile = initiationProfile(enemy);
    let speedMultiplier = enemy.role === 'goblin' ? 1.65 : 1.22;
    if(enemy.directEngaged && !enemy.token){
      speedMultiplier *= profile.closeSpeed;
      if(Number.isFinite(enemy.directEngageCooldownCap) && enemy.cooldown > 0){
        enemy.cooldown = Math.min(enemy.cooldown, enemy.directEngageCooldownCap);
      }
      enemy.attackAlign = Math.max(enemy.attackAlign || 0, .92);
      if(enemy.fusion && Number.isFinite(enemy._pressureBasePreferredRange)){
        enemy.preferredRange = Math.min(enemy._pressureBasePreferredRange, profile.preferredRange);
      }
    } else if(enemy.fusion && Number.isFinite(enemy._pressureBasePreferredRange)){
      enemy.preferredRange = enemy._pressureBasePreferredRange;
    }
    enemy.speed = enemy._pressureBaseSpeed * speedMultiplier;
    if(enemy.role === 'goblin') enemy.attackAlign = Math.max(enemy.attackAlign || 0, .78);
    // Cooldowns continue ticking in the enemy system; this extra drain removes a
    // second layer of downtime without making attacks animation-cancel themselves.
    if(enemy.cooldown > 0) enemy.cooldown = Math.max(0, enemy.cooldown - dt * .45);
  }

  function approachLimit(budget){
    if(state.mode === 'chaos') return Math.max(3, Math.min(5, Math.round(budget + 1)));
    if(state.mode === 'pressureBudget' || state.mode === 'nearFar') return Math.max(3, settings.pressureApproachers || 3);
    if(state.mode === 'oneAttacker' || state.mode === 'battleCircle' || state.mode === 'wavePacing') return 2;
    return 2;
  }
  function grantApproach(enemy, { direct=false, lone=false, distance=0 } = {}){
    if(!enemy) return;
    const wasDirect = !!enemy.directEngaged;
    // Only goblins consume approach slots. Fusion enemies already own their movement
    // roles, but can still be marked as the direct-engagement melee claimant.
    if(enemy.role === 'goblin' && !enemy.approachPermit){
      enemy.approachPermit = true;
      enemy.approachPermitTime = 0;
      enemy.approachCount = (enemy.approachCount || 0) + 1;
      state.approachers.push(enemy);
    }
    if(direct){
      enemy.directEngaged = true;
      enemy.directEngageDistance = distance;
      const firstAttack = !enemy._pressureHasAttacked;
      enemy.directEngageCooldownCap = firstAttack ? (lone ? .02 : .10) : (lone ? .35 : .48);
      if(!wasDirect || !Number.isFinite(enemy.directEngageReadyAt)){
        const baseDelay = Math.max(0, Number(settings.directEngageDelay) || 0);
        enemy.directEngageReadyAt = state.time + (lone ? Math.min(.12, baseDelay) : baseDelay);
      }
      state.directEngagedEnemy = enemy;
      if(enemy.gesture === 'rally'){
        enemy.gesture = null;
        enemy.gestureTime = 0;
        if(state.activeRally === enemy) state.activeRally = null;
      }
    }
  }
  function directEngagementRange(enemy){
    const profile = initiationProfile(enemy);
    const realRange = Number(enemy?.realAtk?.range);
    if(Number.isFinite(realRange) && realRange > 0) return Math.max(profile.engageRange, realRange + 1.1);
    const holdRange = Number(enemy?.holdDist || enemy?.stop);
    if(Number.isFinite(holdRange) && holdRange > 0) return Math.max(profile.engageRange, holdRange);
    return profile.engageRange;
  }
  function assignDirectEngagement(meleeEnemies, player, limit){
    for(const enemy of meleeEnemies){
      if(enemy !== state.directEngagedEnemy && !enemy.token) enemy.directEngaged = false;
    }
    // A recovering attacker no longer occupies the commitment lane, allowing the
    // next nearby enemy to begin its readable windup during the recovery pose.
    if(countActiveKind('melee') > 0){
      state.directEngagedEnemy = null;
      return;
    }
    const candidates = meleeEnemies.filter(enemy => {
      if(enemy.token || enemy.state !== 'idle' || enemy.stunned > 0 || enemy.gesture === 'rally') return false;
      const range = directEngagementRange(enemy);
      return distSqTo(enemy, player) <= range * range;
    }).sort((a,b) => distSqTo(a, player) - distSqTo(b, player));
    const chosen = candidates[0];
    if(!chosen){
      if(state.directEngagedEnemy && !state.directEngagedEnemy.token){
        state.directEngagedEnemy.directEngaged = false;
        state.directEngagedEnemy.directEngageReadyAt = 0;
      }
      state.directEngagedEnemy = null;
      return;
    }
    if(state.directEngagedEnemy && state.directEngagedEnemy !== chosen && !state.directEngagedEnemy.token){
      state.directEngagedEnemy.directEngaged = false;
      state.directEngagedEnemy.directEngageReadyAt = 0;
    }
    if(chosen.role === 'goblin' && !chosen.approachPermit && state.approachers.length >= limit){
      const replaceable = state.approachers
        .filter(enemy => enemy && !enemy.token && enemy !== chosen)
        .sort((a,b) => distSqTo(b, player) - distSqTo(a, player))[0];
      if(replaceable) releaseApproach(replaceable, .15);
    }
    const distance = Math.sqrt(distSqTo(chosen, player));
    grantApproach(chosen, { direct:true, lone:meleeEnemies.length === 1, distance });
  }
  function assignApproachPermits(enemies, player, context = {}){
    const budget = Number(context.pressureBudget ?? settings.pressureBudget);
    const meleeEnemies = enemies.filter(isMeleeEnemy);
    // Ranged goblins use the ranged harassment lane and never consume the melee
    // approach roster. Only melee goblins are selected to close on the player.
    const meleeGoblins = meleeEnemies.filter(isMeleeGoblin);
    state.approachers = state.approachers.filter(e => {
      const keep = meleeGoblins.includes(e) && e.stunned <= 0 && e.gesture !== 'rally';
      if(!keep){
        e.approachPermit = false;
        e.directEngaged = false;
      }
      return keep;
    });
    for(const token of state.activeTokens){
      const e = token.enemy;
      if(isMeleeGoblin(e) && !state.approachers.includes(e)) grantApproach(e);
    }
    const limit = approachLimit(budget);
    assignDirectEngagement(meleeEnemies, player, limit);
    while(state.approachers.length < limit){
      // Start closing before the personal cooldown is fully finished so the next
      // attacker can be in position while the current attacker is recovering.
      const candidates = meleeGoblins.filter(e => !e.approachPermit && !e.token && e.state === 'idle' && e.stunned <= 0 && (e.approachCooldown || 0) <= 0 && e.cooldown <= 1.2 && e.gesture !== 'rally');
      if(!candidates.length) break;
      candidates.sort((a,b) => ((a.approachCount || 0)*2 + distSqTo(a,player)*.02) - ((b.approachCount || 0)*2 + distSqTo(b,player)*.02));
      grantApproach(candidates[0]);
    }
  }
  function update(dt, context = {}){
    state.time += dt;
    const budget = Number(context.pressureBudget ?? settings.pressureBudget);
    const aggression = Math.max(.25, settings.aggression || 1, Number(context.aggression ?? settings.aggression) || 1);
    state.cooldownPressure = Math.max(0, state.cooldownPressure - dt * budget * 1.15 * aggression);
    for(const e of context.enemies || []){
      tuneEnemyPressure(e, dt);
      e.approachCooldown = Math.max(0, (e.approachCooldown || 0) - dt);
      if(e.approachPermit && !e.token){
        e.approachPermitTime = (e.approachPermitTime || 0) + dt;
        if(e.approachPermitTime > 10 && !e.directEngaged) releaseApproach(e,.35);
      }
    }
    state.grantTimes = state.grantTimes.filter(t => state.time - t.time <= 10);
    removeDeadTokens(context.enemies || []);
    if(state.activeRally && (!live(state.activeRally) || state.activeRally.stunned > 0 || state.activeRally.gesture !== 'rally')) state.activeRally = null;
    assignApproachPermits(context.enemies || [], context.player || {x:0,z:0}, context);
  }
  function markNearEligible(enemies, player){ const sorted = enemies.filter(live).sort((a,b) => distSqTo(a, player) - distSqTo(b, player)); const n = state.mode === 'nearFar' ? settings.nearCount : 999; sorted.forEach((e, i) => { e.nearEligible = i < n; }); }
  function assignBattleCircleSlots(enemies){ if(state.mode !== 'battleCircle') return slots; for(const s of slots) s.enemyId = null; enemies.filter(live).forEach((e, i) => { e.slotIndex = i % slots.length; slots[e.slotIndex].enemyId = e.id; }); return slots; }

  function impactTimeFor(attack, startedAt=state.time){
    return startedAt + Math.max(0, Number(attack?.windup) || 0);
  }
  function impactSlotOpen(attack){
    const impactAt = impactTimeFor(attack);
    const gap = Math.max(.28, Number(settings.impactGap) || .46);
    return state.activeTokens.every(token => {
      if(!tokenIsCommitting(token)) return true;
      const otherImpact = Number.isFinite(token.impactAt) ? token.impactAt : impactTimeFor(token.attack, token.started);
      if(otherImpact < state.time - .05) return true;
      return Math.abs(otherImpact - impactAt) >= (attack.kind === 'ranged' || token.kind === 'ranged' ? gap * .75 : gap);
    });
  }

  function applyInitiationImpulse(enemy, attack){
    if(!enemy?.directEngaged || attack?.kind !== 'melee') return false;
    const profile = initiationProfile(enemy);
    const distance = Number(enemy.directEngageDistance) || 0;
    if(distance < profile.minLungeDistance) return false;
    const aggressionBoost = Math.min(1.18, 1 + Math.max(0, (Number(settings.aggression) || 1) - 1) * .06);
    const impulse = profile.lungeSpeed * aggressionBoost;
    const fx = Number(enemy.facing?.x) || 0;
    const fz = Number(enemy.facing?.z) || 0;
    enemy.knockX = (Number(enemy.knockX) || 0) + fx * impulse;
    enemy.knockZ = (Number(enemy.knockZ) || 0) + fz * impulse;
    if(Number.isFinite(enemy.vyOff)) enemy.vyOff = Math.max(enemy.vyOff, profile.hop);
    enemy._pressureInitiation = { started:state.time, distance, attackId:enemy.attackId };
    return true;
  }

  function canGrant(enemy, attack, context = {}){
    if(!live(enemy) || !attack) return false;
    tuneAttack(attack);
    if(enemy.directEngaged && attack.kind === 'melee' && state.time < (enemy.directEngageReadyAt || 0)) return false;
    if(state.mode === 'chaos') return true;
    const active = state.activeTokens;
    const budget = Number(context.pressureBudget ?? settings.pressureBudget);
    const aggression = Math.max(.25, settings.aggression || 1, Number(context.aggression ?? settings.aggression) || 1);
    const gap = (state.mode === 'attackChain' ? 1.4 : state.mode === 'dodgeTraining' ? .85 : .34) / aggression;
    if(state.mode === 'nearFar' && !enemy.nearEligible) return false;
    // Heavy attacks still own the melee spotlight, but ranged harassment remains a
    // separate lane and does not switch off because a mace is winding up.
    if(attack.wantsSolo && countActiveKind('melee')) return false;
    if(state.mode === 'attackChain') return active.filter(tokenIsCommitting).length < 1 && state.time - state.lastThreatTime > 1.35 / aggression;
    if(state.mode === 'dodgeTraining') return active.filter(tokenIsCommitting).length < 1 && state.time - state.lastThreatTime > .75 / aggression;
    if(state.mode === 'oneAttacker' || state.mode === 'battleCircle' || state.mode === 'wavePacing') return active.filter(tokenIsCommitting).length < 1 && state.time - state.lastThreatTime > gap;
    if(state.mode === 'eliteSpotlight'){
      const isElite = e => e.kind === 'brute' || e.kind === 'captain';
      const bruteAlive = (context.enemies || []).some(e => isElite(e) && live(e) && e.stunned <= 0);
      if(!isElite(enemy) && bruteAlive && active.filter(tokenIsCommitting).length === 0 && Math.random() < .72) return false;
      return active.filter(tokenIsCommitting).length < 1 && state.time - state.lastThreatTime > .3 / aggression;
    }
    if(state.mode === 'pressureBudget' || state.mode === 'nearFar'){
      if(attack.kind === 'ranged'){
        if(countActiveKind('ranged') >= Math.max(1, Number(settings.rangedActiveCap) || 1)) return false;
        if(state.time - state.lastRangedThreatTime < Math.max(.2, Number(settings.rangedGap) || .9) / aggression) return false;
        return impactSlotOpen(attack);
      }
      const pressureMemory = enemy.directEngaged ? 0 : state.cooldownPressure;
      if(activeCost('melee') + pressureMemory + attack.tokenCost > budget) return false;
      if(countActiveKind('melee') >= Math.max(1, Number(settings.pressureMeleeCap) || 1)) return false;
      if(!impactSlotOpen(attack)) return false;
      const meleeGap = enemy.directEngaged ? 0 : .1 / aggression;
      return state.time - state.lastMeleeThreatTime > meleeGap;
    }
    return active.filter(tokenIsCommitting).length < 1;
  }
  function grant(enemy, attack){
    tuneAttack(attack);
    if(isMeleeGoblin(enemy) && !enemy.approachPermit) grantApproach(enemy);
    const initiation = applyInitiationImpulse(enemy, attack);
    state.grantTimes.push({ time:state.time, kind:attack.kind, initiation });
    enemy._pressureHasAttacked = true;
    if(state.mode === 'chaos') return null;
    const token = {
      id:`t${state.nextTokenId++}`, enemy, attack, cost:attack.tokenCost, kind:attack.kind,
      started:state.time, impactAt:impactTimeFor(attack), initiation
    };
    state.activeTokens.push(token);
    enemy.token = token;
    state.lastThreatTime = state.time;
    if(attack.kind === 'ranged') state.lastRangedThreatTime = state.time;
    else state.lastMeleeThreatTime = state.time;
    return token;
  }
  function hasApproachPermit(enemy){
    // Ranged enemies are governed by the ranged lane, not the melee approach roster.
    // Fusion enemies own role-specific movement, so only goblins need explicit slots.
    return enemy?.role !== 'goblin' || isRangedEnemy(enemy) || !!enemy.approachPermit || !!enemy.token;
  }
  function requestRally(enemy){
    if(!enemy || isRangedEnemy(enemy) || enemy.approachPermit || enemy.token || state.activeRally || state.time - state.lastRallyTime < 3.5) return false;
    state.activeRally = enemy;
    state.lastRallyTime = state.time;
    return true;
  }
  function endRally(enemy){ if(state.activeRally === enemy) state.activeRally = null; }
  function onWaveClear(){ state.waveCleared = true; releaseAll(); return settings.cycleOnWaveClear ? nextMode() : state.mode; }
  function getDebugState(){
    return {
      mode:state.mode,
      activeTokens:state.activeTokens.length,
      activeMelee:countActiveKind('melee'),
      activeRanged:countActiveKind('ranged'),
      approachers:state.approachers.length,
      directEngagedEnemy:state.directEngagedEnemy?.id || null,
      directEngageAttackId:state.directEngagedEnemy?.attackId || null,
      directEngageDistance:state.directEngagedEnemy?.directEngageDistance || 0,
      activeRally:state.activeRally?.id || null,
      activeCost:activeCost('melee'),
      cooldownPressure:state.cooldownPressure,
      pressureBudget:settings.pressureBudget,
      attacksStarted10s:state.grantTimes.length,
      meleeStarted10s:state.grantTimes.filter(t => t.kind === 'melee').length,
      rangedStarted10s:state.grantTimes.filter(t => t.kind === 'ranged').length,
      initiationsStarted10s:state.grantTimes.filter(t => t.initiation).length,
      targetApproachers:approachLimit(settings.pressureBudget),
      targetMeleeCap:settings.pressureMeleeCap,
      targetRangedCap:settings.rangedActiveCap,
      rangedGap:settings.rangedGap,
      impactGap:settings.impactGap,
      slots
    };
  }
  return { settings, reset, setMode, getMode, nextMode, update, canGrant, grant, release, releaseApproach, releaseAllForEnemy, removeDeadTokens, activeCost, countActiveKind, hasApproachPermit, requestRally, endRally, markNearEligible, assignBattleCircleSlots, onWaveClear, getDebugState };
}
