// Enemy-system router. Manual test selections still run one isolated roster.
// The combined budget mode coordinates original, FLARE, and Hades simulations
// so one encounter can contain enemies from multiple sources without merging
// their individual combat implementations.

import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createOriginalArenaEnemySystem,
} from './arena-enemies-guard.js';
import { setArenaEnemySource } from './arena-enemy-registry.js';
import { createFlareArenaEnemySystem } from './flare-arena-enemies.js';
import { isFlareSpawnKind } from './flare-enemies.js';
import { createHadesArenaEnemySystem } from './hades-arena-enemies.js';
import { HADES_TARTARUS_POOL_ID, isHadesSpawnKind } from './hades-enemies.js';
import { ALL_ENEMIES_BUDGET_ID } from './encounter-pools.js';
import { createCombinedEncounterPlan } from './combined-encounter-director.js';

export { ARENA_ENEMY_ARCHETYPES };

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ORIGINAL_GOBLIN_IDS=new Set(Object.keys(ARENA_ENEMY_ARCHETYPES));

export function createArenaEnemySystem(options={}){
  const externalEncounterCleared=options.onEncounterCleared;
  let combinedMode=false;
  let labMode=false;
  let selectedSpawnKind='mixed';
  let activeKey='original';
  let active=null;
  let encounterDepth=0;
  let currentRoomId=null;
  let currentEncounterPlan=null;
  let manualWaveSize=6;
  let globalPlayerHp=100;
  let combinedLastHit='';
  let combinedLastHitDir=null;
  const participatingKeys=new Set();
  const clearedKeys=new Set();
  const hpSnapshots=new Map();

  const childCleared=key=>roomId=>{
    if(!combinedMode){
      if(key===activeKey)externalEncounterCleared?.(roomId);
      return;
    }
    if(roomId!==currentRoomId||!participatingKeys.has(key))return;
    clearedKeys.add(key);
    if([...participatingKeys].every(participant=>clearedKeys.has(participant))){
      const clearedRoom=currentRoomId;
      currentRoomId=null;
      if(!labMode)externalEncounterCleared?.(clearedRoom);
    }
  };

  const original=createOriginalArenaEnemySystem({...options,onEncounterCleared:childCleared('original')});
  const flare=createFlareArenaEnemySystem({...options,onEncounterCleared:childCleared('flare')});
  const hades=createHadesArenaEnemySystem({...options,onEncounterCleared:childCleared('hades')});
  const systemsByKey={original,flare,hades};
  const systems=Object.values(systemsByKey);
  active=original;
  manualWaveSize=original.waveSize;
  hades.setEncounterPlanningEnabled?.(false);
  for(const system of [flare,hades]){system.clearRoomRuntime();system.group.visible=false;}

  const all=method=>(...args)=>{for(const system of systems)system[method]?.(...args);};
  const systemForKind=kind=>isHadesSpawnKind(kind)?['hades',hades]:isFlareSpawnKind(kind)?['flare',flare]:['original',original];
  const combinedSystems=()=>[...participatingKeys].map(key=>systemsByKey[key]);
  const visibleSystems=()=>combinedMode?combinedSystems():[active];
  const owningSystem=enemy=>systems.find(system=>system.enemies.includes(enemy))||null;

  function clearCombinedRuntime(){
    for(const system of systems){system.clearRoomRuntime?.();system.group.visible=false;}
    participatingKeys.clear();
    clearedKeys.clear();
    hpSnapshots.clear();
    currentRoomId=null;
    labMode=false;
  }

  function activateSingle(key,system){
    clearCombinedRuntime();
    combinedMode=false;
    labMode=false;
    activeKey=key;
    active=system;
    system.group.visible=true;
    system.setWaveSize?.(manualWaveSize);
  }

  function activateCombined(){
    clearCombinedRuntime();
    combinedMode=true;
    labMode=false;
    activeKey='original';
    active=original;
    selectedSpawnKind=ALL_ENEMIES_BUDGET_ID;
    globalPlayerHp=100;
    combinedLastHit='';
    combinedLastHitDir=null;
    hades.setEncounterPlanningEnabled?.(false);
  }

  function setSpawnKind(kind){
    if(kind===ALL_ENEMIES_BUDGET_ID||kind===HADES_TARTARUS_POOL_ID){
      activateCombined();
      return;
    }
    const [key,next]=systemForKind(kind);
    activateSingle(key,next);
    next.setSpawnKind(kind);
    selectedSpawnKind=next.spawnKind;
  }

  function startCombinedEncounter(roomId){
    labMode=false;
    for(const system of systems){system.clearRoomRuntime?.();system.group.visible=false;}
    participatingKeys.clear();
    clearedKeys.clear();
    hpSnapshots.clear();
    encounterDepth++;
    currentRoomId=roomId;
    currentEncounterPlan=createCombinedEncounterPlan({depth:encounterDepth});

    for(const groupPlan of currentEncounterPlan.groups){
      const system=systemsByKey[groupPlan.system];
      if(!system)continue;
      participatingKeys.add(groupPlan.system);
      system.group.visible=true;
      system.setEncounterPlanningEnabled?.(false);
      system.setSpawnKind(groupPlan.spawnKind);
      system.setWaveSize(groupPlan.count);
      system.startRoomEncounter(roomId);
      hpSnapshots.set(system,system.playerHp);
    }

    if(!participatingKeys.size){
      participatingKeys.add('original');
      original.group.visible=true;
      original.setSpawnKind('goblins');
      original.setWaveSize(4);
      original.startRoomEncounter(roomId);
      hpSnapshots.set(original,original.playerHp);
    }
  }

  function removeEnemyImmediately(system,enemy){
    const index=system.enemies.indexOf(enemy);
    if(index>=0)system.enemies.splice(index,1);
    if(enemy?.root?.parent)enemy.root.parent.remove(enemy.root);
  }

  function retainOriginalGoblinKind(system,kind,count){
    let retained=0;
    for(const enemy of [...system.enemies]){
      if(enemy.kind===kind&&retained<count){retained++;continue;}
      removeEnemyImmediately(system,enemy);
    }
    return retained;
  }

  function normalizeLabGroups(groups=[]){
    const normalized=[];
    const claimedSystems=new Set();
    for(const raw of groups){
      const spawnKind=String(raw?.spawnKind||raw?.kind||'').trim();
      if(!spawnKind)continue;
      const [systemKey]=systemForKind(spawnKind);
      if(claimedSystems.has(systemKey)){
        return {ok:false,error:`Enemy Lab needs groups from different enemy systems; ${systemKey} was selected twice.`};
      }
      claimedSystems.add(systemKey);
      normalized.push({
        system:systemKey,
        spawnKind,
        count:clamp(Math.round(Number(raw?.count)||1),1,20),
      });
    }
    if(!normalized.length)return {ok:false,error:'Enemy Lab scenario did not contain any valid enemy groups.'};
    return {ok:true,groups:normalized};
  }

  function startLabScenario(roomId=-1,scenario={}){
    const normalized=normalizeLabGroups(scenario.groups);
    if(!normalized.ok)return normalized;

    clearCombinedRuntime();
    combinedMode=true;
    labMode=true;
    activeKey='original';
    active=original;
    globalPlayerHp=100;
    combinedLastHit='';
    combinedLastHitDir=null;
    participatingKeys.clear();
    clearedKeys.clear();
    hpSnapshots.clear();
    currentRoomId=roomId;
    currentEncounterPlan={
      mode:'enemy-lab',
      label:scenario.label||'Enemy Lab Test',
      groups:normalized.groups.map(group=>({...group})),
    };

    for(const groupPlan of normalized.groups){
      const system=systemsByKey[groupPlan.system];
      participatingKeys.add(groupPlan.system);
      system.reset?.();
      system.clearRoomRuntime?.();
      system.group.visible=true;
      system.setEncounterPlanningEnabled?.(false);

      const originalGoblin=groupPlan.system==='original'&&ORIGINAL_GOBLIN_IDS.has(groupPlan.spawnKind);
      system.setSpawnKind(originalGoblin?'goblins':groupPlan.spawnKind);
      const spawnCount=originalGoblin
        ? clamp(groupPlan.count*ORIGINAL_GOBLIN_IDS.size,1,20)
        : groupPlan.count;
      system.setWaveSize(spawnCount);
      system.startRoomEncounter(roomId);
      if(originalGoblin)retainOriginalGoblinKind(system,groupPlan.spawnKind,groupPlan.count);
      hpSnapshots.set(system,system.playerHp);
    }

    selectedSpawnKind=normalized.groups[0].spawnKind;
    return {ok:true,plan:currentEncounterPlan};
  }

  function startRoomEncounter(roomId){
    labMode=false;
    if(combinedMode)startCombinedEncounter(roomId);
    else active.startRoomEncounter(roomId);
  }

  function resolveCrossSystemBodies(){
    const entries=[];
    for(const key of participatingKeys){
      for(const enemy of systemsByKey[key].enemies)entries.push({key,enemy});
    }
    for(let pass=0;pass<2;pass++){
      for(let i=0;i<entries.length;i++){
        const a=entries[i];
        if(a.enemy.hp<=0)continue;
        for(let j=i+1;j<entries.length;j++){
          const b=entries[j];
          if(a.key===b.key||b.enemy.hp<=0)continue;
          let dx=b.enemy.x-a.enemy.x,dz=b.enemy.z-a.enemy.z,d=Math.hypot(dx,dz);
          const ar=a.enemy.radius*(a.enemy.collisionScale||1),br=b.enemy.radius*(b.enemy.collisionScale||1);
          const minimum=ar+br+.18;
          if(d>=minimum)continue;
          if(d<.001){dx=1;dz=0;d=1;}
          const push=(minimum-d)*.5/d;
          a.enemy.x-=dx*push;a.enemy.z-=dz*push;b.enemy.x+=dx*push;b.enemy.z+=dz*push;
        }
      }
    }
  }

  function updateCombined(dt,player){
    for(const system of combinedSystems()){
      const previousHp=hpSnapshots.get(system)??system.playerHp;
      const safePlayer={...(player||{}),invulnerable:!!player?.invulnerable||globalPlayerHp<=0};
      system.update(dt,safePlayer);
      const nextHp=system.playerHp;
      const damage=Math.max(0,previousHp-nextHp);
      if(damage>0){
        globalPlayerHp=Math.max(0,globalPlayerHp-damage);
        combinedLastHit=system.lastPlayerHit||combinedLastHit;
        combinedLastHitDir=system.lastPlayerHitDir||null;
      }
      hpSnapshots.set(system,nextHp);
    }
    resolveCrossSystemBodies();
  }

  function update(dt,player){
    if(combinedMode)updateCombined(dt,player);
    else active.update(dt,player);
  }

  function damageEnemy(enemy,...args){
    if(!combinedMode)return active.damageEnemy(enemy,...args);
    const owner=owningSystem(enemy);
    return owner?.damageEnemy(enemy,...args)??false;
  }

  function launchRigidBody(enemy,launch={}){
    return !!owningSystem(enemy)?.launchRigidBody?.(enemy,launch);
  }

  function isRigidBodyActive(enemy){
    return !!owningSystem(enemy)?.isRigidBodyActive?.(enemy);
  }

  function reset(){
    labMode=false;
    if(combinedMode){
      for(const system of systems){system.reset();system.group.visible=false;hpSnapshots.set(system,system.playerHp);}
      participatingKeys.clear();
      clearedKeys.clear();
      hpSnapshots.clear();
      encounterDepth=0;
      currentRoomId=null;
      currentEncounterPlan=null;
      globalPlayerHp=100;
      combinedLastHit='';
      combinedLastHitDir=null;
    }else active.reset();
  }

  function clearRoomRuntime(){
    if(combinedMode)clearCombinedRuntime();
    else active.clearRoomRuntime();
  }

  function setWaveSize(value){
    manualWaveSize=clamp(Math.round(Number(value)||6),1,20);
    if(!combinedMode)for(const system of systems)system.setWaveSize?.(manualWaveSize);
  }

  const api={
    get enemies(){return visibleSystems().flatMap(system=>system.enemies);},
    get group(){return active.group;},
    get director(){return active.director;},
    update,damageEnemy,launchRigidBody,isRigidBodyActive,reset,startRoomEncounter,startLabScenario,clearRoomRuntime,setSpawnKind,
    setDirectorMode:all('setDirectorMode'),setPressureBudget:all('setPressureBudget'),setAggression:all('setAggression'),
    setCycleOnWaveClear:all('setCycleOnWaveClear'),setWaveSize,setSpeedScale:all('setSpeedScale'),
    setHeightScale:all('setHeightScale'),setHpScale:all('setHpScale'),setIdleRangeScale:all('setIdleRangeScale'),
    setTerritoryEnabled:all('setTerritoryEnabled'),setTelegraphedSpawns:all('setTelegraphedSpawns'),
    setEncounterPlanningEnabled:all('setEncounterPlanningEnabled'),setPursuitBudgetScale:all('setPursuitBudgetScale'),
    setGoblinColors:(...args)=>active.setGoblinColors?.(...args),setGoblinRigDebug:(...args)=>active.setGoblinRigDebug?.(...args),setSpawnGoblins:(...args)=>active.setSpawnGoblins?.(...args),
    get heightScale(){return active.heightScale;},get speedScale(){return active.speedScale;},get hpScale(){return active.hpScale;},
    get waveSize(){return manualWaveSize;},get idleRangeScale(){return active.idleRangeScale;},get aggression(){return active.aggression;},get spawnKind(){return combinedMode?ALL_ENEMIES_BUDGET_ID:selectedSpawnKind;},
    get wave(){return combinedMode?encounterDepth:active.wave;},get waveKills(){return combinedMode?combinedSystems().reduce((sum,system)=>sum+system.waveKills,0):active.waveKills;},
    get kills(){return combinedMode?systems.reduce((sum,system)=>sum+system.kills,0):active.kills;},get playerHp(){return combinedMode?globalPlayerHp:active.playerHp;},
    get lastPlayerHit(){return combinedMode?combinedLastHit:active.lastPlayerHit;},get lastPlayerHitDir(){return combinedMode?combinedLastHitDir:active.lastPlayerHitDir;},
    get activeEncounterRoomId(){return combinedMode?currentRoomId:active.activeEncounterRoomId;},
    get playerActionLocked(){return visibleSystems().some(system=>!!system.playerActionLocked);},get playerMoveScale(){const list=visibleSystems();return list.length?Math.min(...list.map(system=>system.playerMoveScale??1)):1;},
    get currentEncounterPlan(){return combinedMode?currentEncounterPlan:(active.currentEncounterPlan??null);},
    get queuedSpawnCount(){return visibleSystems().reduce((sum,system)=>sum+(system.queuedSpawnCount??0),0);},
    get telegraphCount(){return visibleSystems().reduce((sum,system)=>sum+(system.telegraphCount??0),0);},
    get activeSet(){return combinedMode?'combined':active===hades?'hades':active===flare?'flare':'original';},
    get labMode(){return labMode;},
    originalSystem:original,flareSystem:flare,hadesSystem:hades,
  };
  setArenaEnemySource(api);
  globalThis.__enemyLabEnemySystem=api;
  return api;
}
