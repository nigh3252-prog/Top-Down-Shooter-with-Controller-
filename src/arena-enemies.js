// Enemy-system router. Original, FLARE, and Hades research rosters each retain
// an isolated simulation and director, while the combat arena sees one API.

import { createArenaEnemySystem as createOriginalArenaEnemySystem } from './arena-enemies-original.js';
import { createFlareArenaEnemySystem } from './flare-arena-enemies.js';
import { isFlareSpawnKind } from './flare-enemies.js';
import { createHadesArenaEnemySystem } from './hades-arena-enemies.js';
import { isHadesSpawnKind } from './hades-enemies.js';

export { ARENA_ENEMY_ARCHETYPES } from './arena-enemies-original.js';

export function createArenaEnemySystem(options={}){
  const original=createOriginalArenaEnemySystem(options);
  const flare=createFlareArenaEnemySystem(options);
  const hades=createHadesArenaEnemySystem(options);
  const systems=[original,flare,hades];
  let active=original;
  for(const system of [flare,hades]){system.clearRoomRuntime();system.group.visible=false;}

  const all=method=>(...args)=>{for(const system of systems)system[method]?.(...args);};
  function activate(next){
    if(active===next)return;
    active.clearRoomRuntime?.();active.group.visible=false;
    active=next;active.group.visible=true;
  }
  function setSpawnKind(kind){
    const next=isHadesSpawnKind(kind)?hades:isFlareSpawnKind(kind)?flare:original;
    activate(next);next.setSpawnKind(kind);
  }

  return {
    get enemies(){return active.enemies;},get group(){return active.group;},get director(){return active.director;},
    update:(...args)=>active.update(...args),damageEnemy:(...args)=>active.damageEnemy(...args),reset:()=>active.reset(),
    startRoomEncounter:(...args)=>active.startRoomEncounter(...args),clearRoomRuntime:()=>active.clearRoomRuntime(),setSpawnKind,
    setDirectorMode:all('setDirectorMode'),setPressureBudget:all('setPressureBudget'),setAggression:all('setAggression'),
    setCycleOnWaveClear:all('setCycleOnWaveClear'),setWaveSize:all('setWaveSize'),setSpeedScale:all('setSpeedScale'),
    setHeightScale:all('setHeightScale'),setHpScale:all('setHpScale'),setIdleRangeScale:all('setIdleRangeScale'),
    setTerritoryEnabled:all('setTerritoryEnabled'),setTelegraphedSpawns:all('setTelegraphedSpawns'),
    setEncounterPlanningEnabled:all('setEncounterPlanningEnabled'),setPursuitBudgetScale:all('setPursuitBudgetScale'),
    setGoblinColors:(...args)=>active.setGoblinColors?.(...args),setGoblinRigDebug:(...args)=>active.setGoblinRigDebug?.(...args),setSpawnGoblins:(...args)=>active.setSpawnGoblins?.(...args),
    get heightScale(){return active.heightScale;},get speedScale(){return active.speedScale;},get hpScale(){return active.hpScale;},
    get waveSize(){return active.waveSize;},get idleRangeScale(){return active.idleRangeScale;},get aggression(){return active.aggression;},get spawnKind(){return active.spawnKind;},
    get wave(){return active.wave;},get waveKills(){return active.waveKills;},get kills(){return active.kills;},get playerHp(){return active.playerHp;},
    get lastPlayerHit(){return active.lastPlayerHit;},get lastPlayerHitDir(){return active.lastPlayerHitDir;},get activeEncounterRoomId(){return active.activeEncounterRoomId;},
    get playerActionLocked(){return !!active.playerActionLocked;},get playerMoveScale(){return active.playerMoveScale??1;},
    get currentEncounterPlan(){return active.currentEncounterPlan??null;},get queuedSpawnCount(){return active.queuedSpawnCount??0;},get telegraphCount(){return active.telegraphCount??0;},
    get activeSet(){return active===hades?'hades':active===flare?'flare':'original';},
    originalSystem:original,flareSystem:flare,hadesSystem:hades,
  };
}
