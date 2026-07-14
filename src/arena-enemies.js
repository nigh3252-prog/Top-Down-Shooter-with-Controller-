// Enemy-system router. The original combat-arena roster remains intact in
// arena-enemies-original.js; FLARE research enemies run in their own isolated
// simulation and can be selected from the same arena menu.

import { createArenaEnemySystem as createOriginalArenaEnemySystem } from './arena-enemies-original.js';
import { createFlareArenaEnemySystem } from './flare-arena-enemies.js';
import { isFlareSpawnKind } from './flare-enemies.js';

export { ARENA_ENEMY_ARCHETYPES } from './arena-enemies-original.js';

export function createArenaEnemySystem(options={}){
  const original=createOriginalArenaEnemySystem(options);
  const flare=createFlareArenaEnemySystem(options);
  let active=original;
  flare.clearRoomRuntime();
  flare.group.visible=false;

  const both=method=>(...args)=>{ original[method]?.(...args); flare[method]?.(...args); };
  function activate(next){
    if(active===next)return;
    active.clearRoomRuntime?.();active.group.visible=false;
    active=next;active.group.visible=true;
  }
  function setSpawnKind(kind){
    const next=isFlareSpawnKind(kind)?flare:original;
    activate(next);next.setSpawnKind(kind);
  }

  return {
    get enemies(){return active.enemies;},get group(){return active.group;},get director(){return active.director;},
    update:(...args)=>active.update(...args),damageEnemy:(...args)=>active.damageEnemy(...args),reset:()=>active.reset(),
    startRoomEncounter:(...args)=>active.startRoomEncounter(...args),clearRoomRuntime:()=>active.clearRoomRuntime(),
    setSpawnKind,
    setDirectorMode:both('setDirectorMode'),setPressureBudget:both('setPressureBudget'),setAggression:both('setAggression'),
    setCycleOnWaveClear:both('setCycleOnWaveClear'),setWaveSize:both('setWaveSize'),setSpeedScale:both('setSpeedScale'),
    setHeightScale:both('setHeightScale'),setHpScale:both('setHpScale'),setIdleRangeScale:both('setIdleRangeScale'),
    setGoblinColors:(...args)=>active.setGoblinColors?.(...args),setGoblinRigDebug:(...args)=>active.setGoblinRigDebug?.(...args),setSpawnGoblins:(...args)=>active.setSpawnGoblins?.(...args),
    get heightScale(){return active.heightScale;},get speedScale(){return active.speedScale;},get hpScale(){return active.hpScale;},
    get waveSize(){return active.waveSize;},get idleRangeScale(){return active.idleRangeScale;},get aggression(){return active.aggression;},get spawnKind(){return active.spawnKind;},
    get wave(){return active.wave;},get waveKills(){return active.waveKills;},get kills(){return active.kills;},get playerHp(){return active.playerHp;},
    get lastPlayerHit(){return active.lastPlayerHit;},get lastPlayerHitDir(){return active.lastPlayerHitDir;},get activeEncounterRoomId(){return active.activeEncounterRoomId;},
    get activeSet(){return active===flare?'flare':'original';},originalSystem:original,flareSystem:flare,
  };
}
