// Experimental attack-all compatibility layer.
//
// This branch intentionally removes combat-director decision making from the
// enemy attack path. The module keeps the old public API so older arena systems
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

const REMOVED_PRESSURE_SLIDERS = ['PRESSURE BUDGET', 'AGGRESSION', 'IDLE RANGE'];
const ENEMY_COUNT_PRESETS = [
  { id:'small', label:'SMALL', multiplier:.5, count:3 },
  { id:'medium', label:'MEDIUM', multiplier:1, count:6 },
  { id:'large', label:'LARGE', multiplier:2, count:12 },
  { id:'tooMany', label:'TOO MANY', multiplier:10, count:60 },
];
const ENEMY_COUNT_STORAGE_KEY = 'arena.enemyCountPreset';

function storedEnemyCountPreset(){
  try { return localStorage.getItem(ENEMY_COUNT_STORAGE_KEY) || 'medium'; }
  catch { return 'medium'; }
}
function storeEnemyCountPreset(value){
  try { localStorage.setItem(ENEMY_COUNT_STORAGE_KEY, value); }
  catch {}
}

function installArenaControls(){
  if(typeof document === 'undefined') return;
  const box = document.getElementById('dirSliders');
  if(!box) return;

  for(const row of [...box.querySelectorAll('.srow')]){
    const text = row.querySelector('.slabel')?.textContent?.trim() || '';
    if(REMOVED_PRESSURE_SLIDERS.some(label => text.startsWith(label))) row.remove();
  }

  const waveRow=[...box.querySelectorAll('.srow')].find(row=>
    (row.querySelector('.slabel')?.textContent?.trim() || '').startsWith('WAVE SIZE')
  );
  if(!waveRow || waveRow.dataset.enemyCountPresetInstalled === 'true') return;
  const input=waveRow.querySelector('input[type="range"]');
  if(!input) return;

  waveRow.dataset.enemyCountPresetInstalled='true';
  input.max='120';
  input.hidden=true;

  const label=document.createElement('div');
  label.className='slabel';
  label.textContent='ENEMY COUNT ';
  const value=document.createElement('span');
  value.className='sval';
  label.appendChild(value);

  const controls=document.createElement('div');
  controls.style.display='grid';
  controls.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  controls.style.gap='6px';
  controls.style.width='100%';

  function applyPreset(id,{reset=false}={}){
    const preset=ENEMY_COUNT_PRESETS.find(entry=>entry.id===id)||ENEMY_COUNT_PRESETS[1];
    input.value=String(preset.count);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    storeEnemyCountPreset(preset.id);
    value.textContent=`${preset.label} · ${preset.multiplier}×`;
    controls.querySelectorAll('button').forEach(button=>button.classList.toggle('on',button.dataset.preset===preset.id));
    if(reset) document.getElementById('resetBtn')?.click();
  }

  for(const preset of ENEMY_COUNT_PRESETS){
    const button=document.createElement('button');
    button.type='button';
    button.dataset.preset=preset.id;
    button.textContent=preset.label;
    button.title=`${preset.multiplier}× normal enemy count${preset.id==='tooMany'?' — 60 enemies from the normal six':''}`;
    button.addEventListener('click',()=>applyPreset(preset.id,{reset:true}));
    controls.appendChild(button);
  }

  waveRow.replaceChildren(label,controls,input);
  const stored=storedEnemyCountPreset();
  applyPreset(stored,{reset:false});
  if(stored!=='medium') setTimeout(()=>document.getElementById('resetBtn')?.click(),0);
}

if(typeof document !== 'undefined'){
  // Imported modules execute before combat-arena's inline module body. Waiting a
  // task lets the arena finish constructing its controls before they are replaced.
  setTimeout(installArenaControls,0);
  setTimeout(installArenaControls,100);
}

// Keep melee enemies pressing into their physical collision ring. Ranged rock
// throwers stop just outside their point-blank exclusion so they can still fire.
const CONTACT_HOLD_DISTANCE = 0;
const RANGED_CLOSE_DISTANCE = 5.6;
const EXTRA_COOLDOWN_DRAIN = 3;
const INWARD_SPEED_MULTIPLIER = 1.35;

const live = enemy => enemy && enemy.hp > 0 && enemy.state !== 'dead';
const ranged = enemy => !!enemy?.thrower || enemy?.attackId === 'rockThrow';

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

  function applyAttackAllProfile(enemy, dt, player){
    if(!live(enemy)) return;
    clearEnemyDirectorState(enemy);

    // Any enemy whose personal attack is ready may begin it. Facing should never
    // become a second hidden permission gate in the attack-all experiment.
    enemy.attackAlign = Math.PI;
    enemy.facingBias = 0;

    // Fixed cadence rather than an aggression slider: normal animation recovery
    // remains readable, but personal post-attack cooldowns drain four times as fast
    // once the enemy system's own one-times drain is included.
    if(Number.isFinite(enemy.cooldown) && enemy.cooldown > 0){
      enemy.cooldown = Math.max(0, enemy.cooldown - dt * EXTRA_COOLDOWN_DRAIN);
    }

    // Normal melee goblins used a hold distance derived from their longest move,
    // which could leave the next shorter move out of range. Aim inside the collision
    // ring so body collision—not an orbit radius—decides how close they get.
    if(!ranged(enemy)){
      enemy.stop = CONTACT_HOLD_DISTANCE;
      enemy.holdDist = CONTACT_HOLD_DISTANCE;
      if(Number.isFinite(enemy.preferredRange)) enemy.preferredRange = CONTACT_HOLD_DISTANCE;
    }

    if(!player || enemy.state !== 'idle' || enemy.stunned > 0) return;
    const dx = (player.x ?? 0) - enemy.x;
    const dz = (player.z ?? 0) - enemy.z;
    const distance = Math.hypot(dx, dz);
    const targetDistance = ranged(enemy) ? RANGED_CLOSE_DISTANCE : CONTACT_HOLD_DISTANCE;
    if(distance <= 1e-5) return;

    // Seed a strong radial velocity before the enemy's own steering step. Its normal
    // movement and wall collision still resolve the final position, but orbit logic
    // can no longer leave melee parked outside range. Rock throwers use a narrow hold
    // band just beyond their point-blank exclusion so they remain able to fire.
    const speed = Math.max(2.5, Number(enemy.speed) || 0) * INWARD_SPEED_MULTIPLIER;
    let direction = 1;
    if(ranged(enemy)){
      if(distance < targetDistance - .15) direction = -1;
      else if(distance <= targetDistance + .15){ enemy.vx = 0; enemy.vz = 0; return; }
    }
    enemy.vx = dx / distance * speed * direction;
    enemy.vz = dz / distance * speed * direction;
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
    const step = Math.max(0, Number(dt) || 0);
    state.time += step;
    state.grantTimes = state.grantTimes.filter(entry => state.time - entry.time <= 10);
    for(const enemy of context.enemies || []) applyAttackAllProfile(enemy, step, context.player);
  }

  function canGrant(enemy, attack){return live(enemy) && !!attack;}

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
      mode:'attackAll',activeTokens:0,activeMelee:0,activeRanged:0,approachers:0,
      directEngagedEnemy:null,directEngageAttackId:null,directEngageDistance:0,
      activeRally:null,activeCost:0,cooldownPressure:0,pressureBudget:'unlimited',
      attacksStarted10s:state.grantTimes.length,
      meleeStarted10s:state.grantTimes.filter(entry => entry.kind !== 'ranged').length,
      rangedStarted10s:state.grantTimes.filter(entry => entry.kind === 'ranged').length,
      initiationsStarted10s:0,targetApproachers:'all',targetMeleeCap:'all',targetRangedCap:'all',
      rangedGap:0,impactGap:0,slots
    };
  }

  return {
    settings,reset,setMode,getMode,nextMode,update,canGrant,grant,release,releaseApproach,
    releaseAllForEnemy,removeDeadTokens,activeCost,countActiveKind,hasApproachPermit,
    requestRally,endRally,markNearEligible,assignBattleCircleSlots,onWaveClear,getDebugState
  };
}
