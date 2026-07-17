// Experimental attack-all compatibility layer.
//
// This branch intentionally removes combat-director decision making from the
// enemy attack path. The module keeps the old public API so the arena/debug UI
// can load unchanged, but it never allocates attack tokens, limits attackers,
// sequences impacts, assigns approach slots, or chooses a featured enemy.

export const DIRECTOR_MODES = [
  { id:'attackAll', label:'All Attack — No Director' }
];

export const DEFAULT_DIRECTOR_SETTINGS = {
  mode:'attackAll',
  pressureBudget:99,
  cycleOnWaveClear:false,
  nearCount:99,
  battleCircleSlots:0,
  battleCircleRadius:0,
  aggression:1,
  pressureApproachers:99,
  pressureMeleeCap:99,
  impactGap:0,
  rangedActiveCap:99,
  rangedGap:0,
  directEngageDelay:0
};

// enemies.js multiplies stop distance by as much as 2.5 before deciding whether
// to keep approaching. Keep these targets below the physical collision ring so
// enemies continue closing until spacing, rather than idling just outside their
// attack trigger. This gives every attacker a comfortable range margin.
const ATTACK_ALL_STOP_DISTANCE = {
  chaser:.45,
  brute:.58,
  maceGoblin:.45,
  spearGoblin:.55
};

const live = enemy => enemy && enemy.hp > 0 && enemy.state !== 'dead';

export function createCombatDirector(options = {}){
  const settings = { ...DEFAULT_DIRECTOR_SETTINGS, ...options, mode:'attackAll' };
  const state = {
    time:0,
    grantTimes:[],
    lastThreatTime:-99,
    lastMeleeThreatTime:-99,
    lastRangedThreatTime:-99
  };
  const slots = [];

  function clearEnemyDirectorState(enemy){
    if(!enemy) return;
    enemy.token = null;
    enemy.approachPermit = true;
    enemy.approachPermitTime = 0;
    enemy.approachCooldown = 0;
    enemy.directEngaged = true;
    enemy.directEngageReadyAt = 0;
    enemy.directEngageDistance = 0;
    enemy.directEngageCooldownCap = null;
    enemy.nearEligible = true;
    enemy.slotIndex = -1;
    if(enemy.gesture === 'rally') enemy.gesture = null;
  }

  function applyAttackAllMovement(enemy){
    if(!live(enemy)) return;
    clearEnemyDirectorState(enemy);
    enemy.attackAlign = Math.max(1, Number(enemy.attackAlign) || 0);
    if(!Number.isFinite(enemy._attackAllBaseStop)) enemy._attackAllBaseStop = Number(enemy.stop) || 1;
    const targetStop = ATTACK_ALL_STOP_DISTANCE[enemy.kind];
    if(Number.isFinite(targetStop)) enemy.stop = Math.min(enemy._attackAllBaseStop, targetStop);
  }

  function reset(){
    state.time = 0;
    state.grantTimes.length = 0;
    state.lastThreatTime = -99;
    state.lastMeleeThreatTime = -99;
    state.lastRangedThreatTime = -99;
  }

  function setMode(){ settings.mode = 'attackAll'; return settings.mode; }
  function getMode(){ return 'attackAll'; }
  function nextMode(){ return 'attackAll'; }

  function update(dt, context = {}){
    state.time += Math.max(0, Number(dt) || 0);
    state.grantTimes = state.grantTimes.filter(entry => state.time - entry.time <= 10);
    for(const enemy of context.enemies || []) applyAttackAllMovement(enemy);
  }

  function canGrant(enemy, attack){
    return live(enemy) && !!attack;
  }

  function grant(enemy, attack){
    if(!live(enemy) || !attack) return null;
    clearEnemyDirectorState(enemy);
    enemy._pressureHasAttacked = true;
    const kind = attack.kind || 'melee';
    state.grantTimes.push({ time:state.time, kind });
    state.lastThreatTime = state.time;
    if(kind === 'ranged') state.lastRangedThreatTime = state.time;
    else state.lastMeleeThreatTime = state.time;
    return null;
  }

  function release(enemy){ if(enemy) enemy.token = null; }
  function releaseApproach(enemy){ clearEnemyDirectorState(enemy); }
  function releaseAllForEnemy(enemy){ release(enemy); }
  function removeDeadTokens(enemies = []){ for(const enemy of enemies) if(enemy) enemy.token = null; }
  function activeCost(){ return 0; }
  function countActiveKind(){ return 0; }
  function hasApproachPermit(){ return true; }
  function requestRally(){ return false; }
  function endRally(){ return false; }
  function markNearEligible(enemies = []){ for(const enemy of enemies) if(enemy) enemy.nearEligible = true; }
  function assignBattleCircleSlots(enemies = []){ for(const enemy of enemies) if(enemy) enemy.slotIndex = -1; return slots; }
  function onWaveClear(){ return 'attackAll'; }

  function getDebugState(){
    return {
      mode:'attackAll',
      activeTokens:0,
      activeMelee:0,
      activeRanged:0,
      approachers:0,
      directEngagedEnemy:null,
      directEngageAttackId:null,
      directEngageDistance:0,
      activeRally:null,
      activeCost:0,
      cooldownPressure:0,
      pressureBudget:settings.pressureBudget,
      attacksStarted10s:state.grantTimes.length,
      meleeStarted10s:state.grantTimes.filter(entry => entry.kind !== 'ranged').length,
      rangedStarted10s:state.grantTimes.filter(entry => entry.kind === 'ranged').length,
      initiationsStarted10s:0,
      targetApproachers:'all',
      targetMeleeCap:'all',
      targetRangedCap:'all',
      rangedGap:0,
      impactGap:0,
      slots
    };
  }

  return {
    settings,
    reset,
    setMode,
    getMode,
    nextMode,
    update,
    canGrant,
    grant,
    release,
    releaseApproach,
    releaseAllForEnemy,
    removeDeadTokens,
    activeCost,
    countActiveKind,
    hasApproachPermit,
    requestRally,
    endRally,
    markNearEligible,
    assignBattleCircleSlots,
    onWaveClear,
    getDebugState
  };
}
