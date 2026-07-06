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
  mode:'oneAttacker', pressureBudget:1.75, cycleOnWaveClear:true, nearCount:3,
  battleCircleSlots:8, battleCircleRadius:4.5
};

export function createCombatDirector(options = {}){
  const settings = { ...DEFAULT_DIRECTOR_SETTINGS, ...options };
  const state = { mode:settings.mode, time:0, activeTokens:[], cooldownPressure:0, lastThreatTime:-99, nextTokenId:1, waveCleared:false };
  const slots = Array.from({ length:settings.battleCircleSlots }, (_, i) => ({
    angle: -Math.PI * .9 + i * (Math.PI * 1.8 / Math.max(1, settings.battleCircleSlots - 1)),
    radius: settings.battleCircleRadius,
    enemyId:null
  }));
  const modeIds = DIRECTOR_MODES.map(m => m.id);
  const live = e => e && e.hp > 0 && e.state !== 'dead';
  const distSqTo = (e, p) => { const dx = (p.x ?? 0) - e.x, dz = (p.z ?? 0) - e.z; return dx*dx + dz*dz; };

  function reset(){ state.time = 0; state.activeTokens.length = 0; state.cooldownPressure = 0; state.lastThreatTime = -99; state.nextTokenId = 1; state.waveCleared = false; }
  function setMode(modeId){ if(modeIds.includes(modeId)) { state.mode = modeId; releaseAll(); } }
  function getMode(){ return state.mode; }
  function nextMode(){ const i = Math.max(0, modeIds.indexOf(state.mode)); setMode(modeIds[(i + 1) % modeIds.length]); return state.mode; }
  function releaseAll(){ for(const t of state.activeTokens) if(t.enemy && t.enemy.token === t) t.enemy.token = null; state.activeTokens.length = 0; }
  function activeCost(){ return state.activeTokens.reduce((sum, t) => sum + (t.cost || 0), 0); }
  function countActiveKind(kind){ return state.activeTokens.filter(t => t.kind === kind).length; }
  function release(enemy){ if(!enemy || !enemy.token) return; const token = enemy.token; state.activeTokens = state.activeTokens.filter(t => t !== token); state.cooldownPressure += (token.cost || 0) * .55; enemy.token = null; }
  function releaseAllForEnemy(enemy){ release(enemy); }
  function removeDeadTokens(enemies = []){ for(const e of enemies) if(!live(e) || e.stunned > 0) release(e); state.activeTokens = state.activeTokens.filter(t => live(t.enemy) && t.enemy.token === t); }
  function update(dt, context = {}){ state.time += dt; const budget = Number(context.pressureBudget ?? settings.pressureBudget); state.cooldownPressure = Math.max(0, state.cooldownPressure - dt * budget * .7); removeDeadTokens(context.enemies || []); }
  function markNearEligible(enemies, player){ const sorted = enemies.filter(live).sort((a,b) => distSqTo(a, player) - distSqTo(b, player)); const n = state.mode === 'nearFar' ? settings.nearCount : 999; sorted.forEach((e, i) => { e.nearEligible = i < n; }); }
  function assignBattleCircleSlots(enemies){ if(state.mode !== 'battleCircle') return slots; for(const s of slots) s.enemyId = null; enemies.filter(live).forEach((e, i) => { e.slotIndex = i % slots.length; slots[e.slotIndex].enemyId = e.id; }); return slots; }
  function canGrant(enemy, attack, context = {}){
    if(!live(enemy) || !attack) return false;
    if(state.mode === 'chaos') return true;
    const active = state.activeTokens;
    const budget = Number(context.pressureBudget ?? settings.pressureBudget);
    const gap = state.mode === 'attackChain' ? 1.4 : state.mode === 'dodgeTraining' ? .85 : .48;
    if(state.mode === 'nearFar' && !enemy.nearEligible) return false;
    if(attack.wantsSolo && active.length) return false;
    if(state.mode === 'attackChain') return active.length < 1 && state.time - state.lastThreatTime > 1.35;
    if(state.mode === 'dodgeTraining') return active.length < 1 && state.time - state.lastThreatTime > .75;
    if(state.mode === 'oneAttacker' || state.mode === 'battleCircle' || state.mode === 'wavePacing') return active.length < 1 && state.time - state.lastThreatTime > gap;
    if(state.mode === 'eliteSpotlight'){
      const bruteAlive = (context.enemies || []).some(e => e.kind === 'brute' && live(e) && e.stunned <= 0);
      if(enemy.kind !== 'brute' && bruteAlive && active.length === 0 && Math.random() < .72) return false;
      return active.length < 1 && state.time - state.lastThreatTime > .35;
    }
    if(state.mode === 'pressureBudget' || state.mode === 'nearFar'){
      if(activeCost() + state.cooldownPressure + attack.tokenCost > budget) return false;
      if(attack.kind === 'melee' && countActiveKind('melee') >= (budget >= 2.25 ? 2 : 1)) return false;
      return state.time - state.lastThreatTime > .18;
    }
    return active.length < 1;
  }
  function grant(enemy, attack){ if(state.mode === 'chaos') return null; const token = { id:`t${state.nextTokenId++}`, enemy, attack, cost:attack.tokenCost, kind:attack.kind, started:state.time }; state.activeTokens.push(token); enemy.token = token; state.lastThreatTime = state.time; return token; }
  function onWaveClear(){ state.waveCleared = true; releaseAll(); return settings.cycleOnWaveClear ? nextMode() : state.mode; }
  function getDebugState(){ return { mode:state.mode, activeTokens:state.activeTokens.length, activeCost:activeCost(), cooldownPressure:state.cooldownPressure, pressureBudget:settings.pressureBudget, slots }; }
  return { settings, reset, setMode, getMode, nextMode, update, canGrant, grant, release, releaseAllForEnemy, removeDeadTokens, activeCost, countActiveKind, markNearEligible, assignBattleCircleSlots, onWaveClear, getDebugState };
}
