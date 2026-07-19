// Enemy-system router. Manual test selections can scale past each child system's
// twenty-enemy safety cap by running multiple identical shards. Combined budget
// encounters preserve their generated composition and multiply every group.

import { createArenaEnemySystem as createOriginalArenaEnemySystem } from './arena-enemies-original.js';
import { setArenaEnemySource } from './arena-enemy-registry.js';
import { createFlareArenaEnemySystem } from './flare-arena-enemies.js';
import { isFlareSpawnKind } from './flare-enemies.js';
import { createHadesArenaEnemySystem } from './hades-arena-enemies.js';
import { HADES_TARTARUS_POOL_ID, isHadesSpawnKind } from './hades-enemies.js';
import { ALL_ENEMIES_BUDGET_ID } from './encounter-pools.js';
import { createCombinedEncounterPlan } from './combined-encounter-director.js';

export { ARENA_ENEMY_ARCHETYPES } from './arena-enemies-original.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const BASELINE_WAVE_SIZE=6;

export function createArenaEnemySystem(options={}){
  const externalEncounterCleared=options.onEncounterCleared;
  let combinedMode=false;
  let selectedSpawnKind='mixed';
  let activeKey='original';
  let active=null;
  let encounterDepth=0;
  let currentRoomId=null;
  let currentEncounterPlan=null;
  let manualWaveSize=BASELINE_WAVE_SIZE;
  let globalPlayerHp=100;
  let combinedLastHit='';
  let combinedLastHitDir=null;

  const participatingIds=new Set();
  const clearedIds=new Set();
  const hpSnapshots=new Map();
  const systemsById=new Map();
  const pools={original:[],flare:[],hades:[]};
  const systems=[];

  const sharedTuning={
    directorMode:'attackAll',pressureBudget:99,aggression:1,cycleOnWaveClear:false,
    speedScale:.5,heightScale:1.5,hpScale:2.5,idleRangeScale:3,
    territoryEnabled:true,telegraphedSpawns:true,pursuitBudgetScale:1,
  };

  const idFor=(key,index)=>`${key}:${index}`;
  const keyForKind=kind=>isHadesSpawnKind(kind)?'hades':isFlareSpawnKind(kind)?'flare':'original';
  const factoryFor=key=>key==='hades'?createHadesArenaEnemySystem:key==='flare'?createFlareArenaEnemySystem:createOriginalArenaEnemySystem;

  const childCleared=id=>roomId=>{
    if(roomId!==currentRoomId||!participatingIds.has(id))return;
    clearedIds.add(id);
    if([...participatingIds].every(participant=>clearedIds.has(participant))){
      const clearedRoom=currentRoomId;
      currentRoomId=null;
      externalEncounterCleared?.(clearedRoom);
    }
  };

  function applySharedTuning(system){
    system.setDirectorMode?.(sharedTuning.directorMode);
    system.setPressureBudget?.(sharedTuning.pressureBudget);
    system.setAggression?.(sharedTuning.aggression);
    system.setCycleOnWaveClear?.(sharedTuning.cycleOnWaveClear);
    system.setSpeedScale?.(sharedTuning.speedScale);
    system.setHeightScale?.(sharedTuning.heightScale);
    system.setHpScale?.(sharedTuning.hpScale);
    system.setIdleRangeScale?.(sharedTuning.idleRangeScale);
    system.setTerritoryEnabled?.(sharedTuning.territoryEnabled);
    system.setTelegraphedSpawns?.(sharedTuning.telegraphedSpawns);
    system.setPursuitBudgetScale?.(sharedTuning.pursuitBudgetScale);
    system.setEncounterPlanningEnabled?.(false);
  }

  function createChild(key){
    const index=pools[key].length;
    const id=idFor(key,index);
    const system=factoryFor(key)({...options,onEncounterCleared:childCleared(id)});
    applySharedTuning(system);
    system.clearRoomRuntime?.();
    system.group.visible=false;
    pools[key].push(system);
    systems.push(system);
    systemsById.set(id,system);
    return system;
  }

  function ensurePool(key,count){
    while(pools[key].length<count)createChild(key);
    return pools[key];
  }

  const original=createChild('original');
  const flare=createChild('flare');
  const hades=createChild('hades');
  active=original;
  manualWaveSize=original.waveSize||BASELINE_WAVE_SIZE;

  const all=method=>(...args)=>{for(const system of systems)system[method]?.(...args);};
  const owningSystem=enemy=>systems.find(system=>system.enemies.includes(enemy))||null;
  const visibleSystems=()=>[...participatingIds].map(id=>systemsById.get(id)).filter(Boolean);
  const countScale=()=>Math.max(1/BASELINE_WAVE_SIZE,manualWaveSize/BASELINE_WAVE_SIZE);

  // Whole-number scales become identical copies of the current encounter. This is
  // important for Hades: ten medium-sized shards also multiply its spawn/pursuit
  // allowances by ten instead of creating one huge queue behind a single cap.
  function countsForScale(baseCount,scale=countScale()){
    const safeBase=Math.max(1,Math.round(baseCount)||1);
    const safeScale=Math.max(1/safeBase,Number(scale)||1);
    const whole=Math.floor(safeScale+1e-8);
    const counts=Array.from({length:whole},()=>safeBase);
    const fraction=safeScale-whole;
    if(fraction>.001)counts.push(Math.max(1,Math.round(safeBase*fraction)));
    return counts.length?counts:[1];
  }

  function clearAllRuntime(){
    for(const system of systems){system.clearRoomRuntime?.();system.group.visible=false;}
    participatingIds.clear();
    clearedIds.clear();
    hpSnapshots.clear();
    currentRoomId=null;
  }

  function activateSingle(key){
    clearAllRuntime();
    combinedMode=false;
    activeKey=key;
    active=ensurePool(key,1)[0];
    active.group.visible=true;
    globalPlayerHp=active.playerHp;
    combinedLastHit='';
    combinedLastHitDir=null;
    currentEncounterPlan=null;
  }

  function activateCombined(){
    clearAllRuntime();
    combinedMode=true;
    activeKey='original';
    active=original;
    selectedSpawnKind=ALL_ENEMIES_BUDGET_ID;
    globalPlayerHp=100;
    combinedLastHit='';
    combinedLastHitDir=null;
    currentEncounterPlan=null;
  }

  function setSpawnKind(kind){
    if(kind===ALL_ENEMIES_BUDGET_ID||kind===HADES_TARTARUS_POOL_ID){
      activateCombined();
      return;
    }
    const key=keyForKind(kind);
    activateSingle(key);
    selectedSpawnKind=kind;
    active.setSpawnKind(kind);
  }

  function startShard({key,index,count,spawnKind,roomId}){
    const system=ensurePool(key,index+1)[index];
    const id=idFor(key,index);
    participatingIds.add(id);
    system.group.visible=true;
    system.setEncounterPlanningEnabled?.(false);
    system.setSpawnKind(spawnKind);
    system.setWaveSize(count);
    system.startRoomEncounter(roomId);
    hpSnapshots.set(system,system.playerHp);
    return system;
  }

  function startSingleEncounter(roomId){
    clearAllRuntime();
    currentRoomId=roomId;
    const chunks=countsForScale(BASELINE_WAVE_SIZE);
    chunks.forEach((count,index)=>startShard({key:activeKey,index,count,spawnKind:selectedSpawnKind,roomId}));
    active=pools[activeKey][0];
    currentEncounterPlan={
      mode:'manual-count-preset',
      totalCount:chunks.reduce((sum,count)=>sum+count,0),
      baseCount:BASELINE_WAVE_SIZE,
      countScale:countScale(),
      shardCounts:[...chunks],
      usesWaveSizeSlider:true,
    };
  }

  function startCombinedEncounter(roomId){
    clearAllRuntime();
    encounterDepth++;
    currentRoomId=roomId;
    const basePlan=createCombinedEncounterPlan({depth:encounterDepth});
    const nextIndexByKey={original:0,flare:0,hades:0};
    const scaledGroups=[];

    for(const groupPlan of basePlan.groups){
      const chunks=countsForScale(groupPlan.count);
      const startIndex=nextIndexByKey[groupPlan.system]||0;
      chunks.forEach((count,offset)=>startShard({
        key:groupPlan.system,index:startIndex+offset,count,
        spawnKind:groupPlan.spawnKind,roomId,
      }));
      nextIndexByKey[groupPlan.system]=startIndex+chunks.length;
      scaledGroups.push({
        ...groupPlan,
        baseCount:groupPlan.count,
        count:chunks.reduce((sum,count)=>sum+count,0),
        shardCounts:[...chunks],
      });
    }

    if(!participatingIds.size){
      const chunks=countsForScale(4);
      chunks.forEach((count,index)=>startShard({key:'original',index,count,spawnKind:'goblins',roomId}));
      scaledGroups.push({id:'fallbackGoblins',label:'Fallback Goblins',system:'original',spawnKind:'goblins',baseCount:4,count:chunks.reduce((a,b)=>a+b,0),shardCounts:[...chunks]});
    }

    currentEncounterPlan={
      ...basePlan,
      baseTotalCount:basePlan.totalCount,
      totalCount:scaledGroups.reduce((sum,group)=>sum+group.count,0),
      countScale:countScale(),
      groups:scaledGroups,
      usesWaveSizeSlider:true,
    };
  }

  function startRoomEncounter(roomId){
    if(combinedMode)startCombinedEncounter(roomId);
    else startSingleEncounter(roomId);
  }

  function resolveCrossSystemBodies(){
    const entries=[];
    for(const id of participatingIds){
      const system=systemsById.get(id);
      for(const enemy of system?.enemies||[])entries.push({id,enemy});
    }
    for(let pass=0;pass<2;pass++){
      for(let i=0;i<entries.length;i++){
        const a=entries[i];
        if(a.enemy.hp<=0)continue;
        for(let j=i+1;j<entries.length;j++){
          const b=entries[j];
          if(a.id===b.id||b.enemy.hp<=0)continue;
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

  function updateActive(dt,player){
    const activeSystems=visibleSystems();
    if(!activeSystems.length)return;
    for(const system of activeSystems){
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
    if(activeSystems.length>1)resolveCrossSystemBodies();
  }

  function update(dt,player){updateActive(dt,player);}

  function damageEnemy(enemy,...args){
    const owner=owningSystem(enemy);
    return owner?.damageEnemy(enemy,...args)??false;
  }

  function launchRigidBody(enemy,launch={}){return !!owningSystem(enemy)?.launchRigidBody?.(enemy,launch);}
  function isRigidBodyActive(enemy){return !!owningSystem(enemy)?.isRigidBodyActive?.(enemy);}

  function reset(){
    clearAllRuntime();
    for(const system of systems){system.reset();system.clearRoomRuntime?.();system.group.visible=false;}
    encounterDepth=0;
    currentRoomId=null;
    currentEncounterPlan=null;
    globalPlayerHp=100;
    combinedLastHit='';
    combinedLastHitDir=null;
    active=ensurePool(activeKey,1)[0];
  }

  function clearRoomRuntime(){clearAllRuntime();}

  function setWaveSize(value){manualWaveSize=clamp(Math.round(Number(value)||BASELINE_WAVE_SIZE),1,120);}
  function setDirectorMode(value){sharedTuning.directorMode=value;all('setDirectorMode')(value);}
  function setPressureBudget(value){sharedTuning.pressureBudget=Number(value)||99;all('setPressureBudget')(sharedTuning.pressureBudget);}
  function setAggression(value){sharedTuning.aggression=Number(value)||1;all('setAggression')(sharedTuning.aggression);}
  function setCycleOnWaveClear(value){sharedTuning.cycleOnWaveClear=!!value;all('setCycleOnWaveClear')(value);}
  function setSpeedScale(value){sharedTuning.speedScale=Number(value)||1;all('setSpeedScale')(sharedTuning.speedScale);}
  function setHeightScale(value){sharedTuning.heightScale=Number(value)||1;all('setHeightScale')(sharedTuning.heightScale);}
  function setHpScale(value){sharedTuning.hpScale=Number(value)||1;all('setHpScale')(sharedTuning.hpScale);}
  function setIdleRangeScale(value){sharedTuning.idleRangeScale=Number(value)||3;all('setIdleRangeScale')(sharedTuning.idleRangeScale);}
  function setTerritoryEnabled(value){sharedTuning.territoryEnabled=!!value;all('setTerritoryEnabled')(value);}
  function setTelegraphedSpawns(value){sharedTuning.telegraphedSpawns=!!value;all('setTelegraphedSpawns')(value);}
  function setPursuitBudgetScale(value){sharedTuning.pursuitBudgetScale=Number(value)||1;all('setPursuitBudgetScale')(sharedTuning.pursuitBudgetScale);}

  const api={
    get enemies(){return visibleSystems().flatMap(system=>system.enemies);},
    get group(){return active?.group||original.group;},
    get director(){return active?.director||original.director;},
    update,damageEnemy,launchRigidBody,isRigidBodyActive,reset,startRoomEncounter,clearRoomRuntime,setSpawnKind,
    setDirectorMode,setPressureBudget,setAggression,setCycleOnWaveClear,setWaveSize,setSpeedScale,
    setHeightScale,setHpScale,setIdleRangeScale,setTerritoryEnabled,setTelegraphedSpawns,
    setEncounterPlanningEnabled:all('setEncounterPlanningEnabled'),setPursuitBudgetScale,
    setGoblinColors:(...args)=>active?.setGoblinColors?.(...args),setGoblinRigDebug:(...args)=>active?.setGoblinRigDebug?.(...args),setSpawnGoblins:(...args)=>active?.setSpawnGoblins?.(...args),
    get heightScale(){return sharedTuning.heightScale;},get speedScale(){return sharedTuning.speedScale;},get hpScale(){return sharedTuning.hpScale;},
    get waveSize(){return manualWaveSize;},get enemyCountScale(){return countScale();},get idleRangeScale(){return sharedTuning.idleRangeScale;},get aggression(){return sharedTuning.aggression;},get spawnKind(){return combinedMode?ALL_ENEMIES_BUDGET_ID:selectedSpawnKind;},
    get wave(){return combinedMode?encounterDepth:(active?.wave||1);},get waveKills(){return visibleSystems().reduce((sum,system)=>sum+system.waveKills,0);},
    get kills(){return visibleSystems().reduce((sum,system)=>sum+system.kills,0);},get playerHp(){return globalPlayerHp;},
    get lastPlayerHit(){return combinedLastHit||(active?.lastPlayerHit||'');},get lastPlayerHitDir(){return combinedLastHitDir||(active?.lastPlayerHitDir||null);},
    get activeEncounterRoomId(){return currentRoomId;},
    get playerActionLocked(){return visibleSystems().some(system=>!!system.playerActionLocked);},get playerMoveScale(){const list=visibleSystems();return list.length?Math.min(...list.map(system=>system.playerMoveScale??1)):1;},
    get currentEncounterPlan(){return currentEncounterPlan;},
    get queuedSpawnCount(){return visibleSystems().reduce((sum,system)=>sum+(system.queuedSpawnCount??0),0);},
    get telegraphCount(){return visibleSystems().reduce((sum,system)=>sum+(system.telegraphCount??0),0);},
    get activeSet(){return combinedMode?'combined':activeKey;},
    originalSystem:original,flareSystem:flare,hadesSystem:hades,
  };
  setArenaEnemySource(api);
  return api;
}
