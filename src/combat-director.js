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
  const isMeleeGoblin = e => live(e) && e.role === 'goblin' && !isRangedEnemy(e);
  const tokenIsCommitting = token => live(token?.enemy) && token.enemy.state !== 'recovery';

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
    tunedAttacks.add(attack);
  }

  function tuneEnemyPressure(enemy, dt){
    if(!live(enemy)) return;
    if(!Number.isFinite(enemy._pressureBaseSpeed)) enemy._pressureBaseSpeed = enemy.speed;
    const speedMultiplier = enemy.role === 'goblin' ? 1.65 : 1.22;
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
  function grantApproach(enemy, { direct=false } = {}){
    if(!enemy) return;
    const wasDirect = !!enemy.directEngaged;
    if(!enemy.approachPermit){
      enemy.approachPermit = true;
      enemy.approachPermitTime = 0;
      enemy.approachCount = (enemy.approachCount || 0) + 1;
      state.approachers.push(enemy);
    }
    if(direct){
      enemy.directEngaged = true;
      if(!wasDirect || !Number.isFinite(enemy.directEngageReadyAt)){
        enemy.directEngageReadyAt = state.time + Math.max(0, Number(settings.directEngageDelay) || 0);
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
    const realRange = Number(enemy?.realAtk?.range);
    if(Number.isFinite(realRange) && realRange > 0) return realRange + 1.1;
    const holdRange = Number(enemy?.holdDist || enemy?.stop);
    if(Number.isFinite(holdRange) && holdRange > 0) return Math.max(4.2, holdRange);
    return 5.8;
  }
  function assignDirectEngagement(meleeGoblins, player, limit){
    for(const enemy of meleeGoblins){
      if(enemy !== state.directEngagedEnemy && !enemy.token) enemy.directEngaged = false;
    }
    // A recovering attacker no longer occupies the commitment lane, allowing the
    // next nearby enemy to begin its readable windup during the recovery pose.
    if(countActiveKind('melee') > 0){
      state.directEngagedEnemy = null;
      return;
    }
    const candidates = meleeGoblins.filter(enemy => {
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
    if(!chosen.approachPermit && state.approachers.length >= limit){
      const replaceable = state.approachers
        .filter(enemy => enemy && !enemy.token && enemy !== chosen)
        .sort((a,b) => distSqTo(b, player) - distSqTo(a, player))[0];
      if(replaceable) releaseApproach(replaceable, .15);
    }
    grantApproach(chosen, { direct:true });
  }
  function assignApproachPermits(enemies, player, context = {}){
    const budget = Number(context.pressureBudget ?? settings.pressureBudget);
    // Ranged goblins use the ranged harassment lane and never consume the melee
    // approach roster. Only melee goblins are selected to close on the player.
    const meleeGoblins = enemies.filter(isMeleeGoblin);
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
    assignDirectEngagement(meleeGoblins, player, limit);
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
      if(activeCost('melee') + state.cooldownPressure + attack.tokenCost > budget) return false;
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
    state.grantTimes.push({ time:state.time, kind:attack.kind });
    if(state.mode === 'chaos') return null;
    const token = {
      id:`t${state.nextTokenId++}`, enemy, attack, cost:attack.tokenCost, kind:attack.kind,
      started:state.time, impactAt:impactTimeFor(attack)
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
      activeRally:state.activeRally?.id || null,
      activeCost:activeCost('melee'),
      cooldownPressure:state.cooldownPressure,
      pressureBudget:settings.pressureBudget,
      attacksStarted10s:state.grantTimes.length,
      meleeStarted10s:state.grantTimes.filter(t => t.kind === 'melee').length,
      rangedStarted10s:state.grantTimes.filter(t => t.kind === 'ranged').length,
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
