import { getArenaRuntime } from './arena-runtime-context.js';
import { ARENA_ENEMY_CATALOG } from './arena-enemy-catalog.js';
import { readWorkingRoster } from './enemy-lab-working-roster.js';
import { ALL_ENEMIES_BUDGET_ID, WORKING_ROSTER_HADES_ID } from './encounter-pools.js';
import { setCombinedEncounterPlanResolver } from './combined-encounter-director.js';
import { setHadesRosterModeActive } from './hades-encounter-tuning.js';
import { createWorkingRosterEncounterPlan } from './working-roster-encounter.js';
import { LUGARU_DUELIST_ID } from './lugaru-duelist.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const baseOriginalIds=Object.freeze(
  ARENA_ENEMY_CATALOG
    .filter(enemy=>enemy.family==='GOBLINS'&&enemy.id!==LUGARU_DUELIST_ID)
    .map(enemy=>enemy.id)
);
const baseOriginalIdSet=new Set(baseOriginalIds);

function removeEnemyImmediately(system,enemy,releaseTarget){
  system.director?.releaseAllForEnemy?.(enemy);
  releaseTarget?.(enemy);
  const index=system.enemies.indexOf(enemy);
  if(index>=0)system.enemies.splice(index,1);
  enemy?.root?.traverse?.(object=>object.geometry?.dispose?.());
  enemy?.root?.parent?.remove?.(enemy.root);
}

function retainEnemyKind(system,kind,count,releaseTarget){
  let retained=0;
  for(const enemy of [...system.enemies]){
    if(enemy.kind===kind&&retained<count){retained++;continue;}
    removeEnemyImmediately(system,enemy,releaseTarget);
  }
  return retained;
}

export function installOriginalIndividualSpawnSupport(system,{releaseTarget=null}={}){
  if(!system||system.__workingRosterOriginalSpawnSupport)return system;
  if(typeof system.setSpawnKind!=='function'||typeof system.setWaveSize!=='function'||typeof system.startRoomEncounter!=='function')return system;

  const baseSetSpawnKind=system.setSpawnKind.bind(system);
  const baseSetWaveSize=system.setWaveSize.bind(system);
  const baseStartRoomEncounter=system.startRoomEncounter.bind(system);
  const spawnDescriptor=Object.getOwnPropertyDescriptor(system,'spawnKind');
  const baseSpawnKind=()=>spawnDescriptor?.get?.call(system)??'';
  let isolatedKind=null;
  let requestedCount=1;

  system.setSpawnKind=kind=>{
    const requested=String(kind||'');
    isolatedKind=baseOriginalIdSet.has(requested)||requested===LUGARU_DUELIST_ID?requested:null;
    return baseSetSpawnKind(isolatedKind?'goblins':kind);
  };
  system.setWaveSize=value=>{
    requestedCount=clamp(Math.round(Number(value)||1),1,20);
    const expanded=isolatedKind?clamp(requestedCount*Math.max(1,baseOriginalIds.length),baseOriginalIds.length,20):requestedCount;
    return baseSetWaveSize(expanded);
  };
  system.startRoomEncounter=roomId=>{
    if(!isolatedKind)return baseStartRoomEncounter(roomId);
    const collected=[];
    let result;
    let guard=0;
    while(collected.length<requestedCount&&guard++<10){
      const remaining=requestedCount-collected.length;
      const expanded=clamp(remaining*Math.max(1,baseOriginalIds.length),baseOriginalIds.length,20);
      baseSetWaveSize(expanded);
      result=baseStartRoomEncounter(roomId);
      const expected=Math.min(remaining,Math.max(1,Math.floor(expanded/Math.max(1,baseOriginalIds.length))));
      if(isolatedKind===LUGARU_DUELIST_ID){
        retainEnemyKind(system,'grunt',expected,releaseTarget);
        system.configureLugaruDuelists?.(system.enemies);
      }else retainEnemyKind(system,isolatedKind,expected,releaseTarget);
      const batch=system.enemies.splice(0);
      if(!batch.length)break;
      collected.push(...batch);
    }
    system.enemies.push(...collected.slice(0,requestedCount));
    return result;
  };
  Object.defineProperty(system,'spawnKind',{
    configurable:true,
    enumerable:true,
    get:()=>isolatedKind||baseSpawnKind(),
  });
  system.__workingRosterOriginalSpawnSupport=true;
  return system;
}

export function rosterSpawnFlowSettings(plan,systemKey,fallbackCount=1){
  const groups=Array.isArray(plan?.groups)?plan.groups:[];
  const group=groups.find(entry=>entry?.system===systemKey);
  const plannedCount=clamp(Math.round(Number(group?.count)||Number(fallbackCount)||1),1,20);
  const activeWeightCap=Math.max(2.5,plannedCount*.65);
  return {
    plannedCount,
    // Keep the published cadence value stable across JS floating-point forms.
    activeWeightCap:Number(activeWeightCap.toFixed(2)),
    simultaneousTelegraphs:Math.min(2,plannedCount),
    spawnDelay:clamp(Number(plan?.spawnDelay)||.72,.35,1.5),
  };
}

export function installRosterSpawnTelegraphSupport(system,{
  systemKey='original',
  planGetter=()=>null,
  catalog=ARENA_ENEMY_CATALOG,
}={}){
  if(!system||system.__workingRosterSpawnTelegraphSupport)return system;
  if(!Array.isArray(system.enemies)||!system.group||typeof system.startRoomEncounter!=='function'||typeof system.update!=='function')return system;
  const baseStart=system.startRoomEncounter.bind(system);
  const baseUpdate=system.update.bind(system);
  const baseReset=system.reset?.bind(system);
  const baseClear=system.clearRoomRuntime?.bind(system);
  const weightsByKind=new Map((catalog||[]).map(enemy=>[String(enemy.spawnKind||enemy.id),Math.max(.1,Number(enemy.activeWeight)||1)]));
  let enabled=false;
  let queue=[];
  let pending=[];
  let lastPlayer={x:0,z:0};

  const enemyWeight=enemy=>Math.max(.1,Number(enemy?.def?.activeWeight)||weightsByKind.get(String(enemy?.kind||''))||1);
  const activeWeight=()=>system.enemies.reduce((sum,enemy)=>sum+(Number(enemy?.hp)>0?enemyWeight(enemy):0),0);
  const pendingWeight=()=>pending.reduce((sum,entry)=>sum+enemyWeight(entry.enemy),0);
  const flow=()=>rosterSpawnFlowSettings(planGetter?.(),systemKey,system.enemies.length+queue.length+pending.length||1);
  const spawnPoint=enemy=>({x:Number(enemy?.x)||0,z:Number(enemy?.z)||0});

  function currentPlayer(player=null){
    if(Number.isFinite(Number(player?.x))&&Number.isFinite(Number(player?.z))){
      return{x:Number(player.x),z:Number(player.z)};
    }
    const actor=getArenaRuntime()?.actorPos;
    if(Number.isFinite(Number(actor?.x))){
      const z=Number.isFinite(Number(actor?.z))?Number(actor.z):Number(actor?.y);
      if(Number.isFinite(z))return{x:Number(actor.x),z};
    }
    return lastPlayer;
  }
  function preferredSpawnDistance(enemy){
    const role=String(enemy?.def?.role||enemy?.role||'').toLowerCase();
    return enemy?.thrower||/(ranged|beam|trapper|skirmisher)/.test(role)?8.5:6;
  }
  function spawnPriority(enemy,player){
    const point=spawnPoint(enemy);
    const distance=Math.hypot(point.x-player.x,point.z-player.z);
    const preferred=preferredSpawnDistance(enemy);
    const occupied=[
      ...system.enemies.filter(candidate=>Number(candidate?.hp)>0).map(spawnPoint),
      ...pending.map(entry=>entry.position),
    ];
    const spacing=occupied.length
      ?Math.min(...occupied.map(other=>Math.hypot(point.x-other.x,point.z-other.z)))
      :8;
    return-Math.abs(distance-preferred)+Math.min(6,spacing)*.72;
  }
  function takeBestQueuedEnemy(player){
    let bestIndex=0;
    let bestScore=-Infinity;
    for(let index=0;index<queue.length;index++){
      const score=spawnPriority(queue[index],player);
      if(score>bestScore){bestScore=score;bestIndex=index;}
    }
    return queue.splice(bestIndex,1)[0]||null;
  }
  function detachEnemy(enemy){
    if(!enemy?.root)return;
    enemy.root.visible=false;
    enemy.root.parent?.remove?.(enemy.root);
  }
  function attachEnemy(enemy,position=spawnPoint(enemy)){
    if(!enemy)return;
    enemy.x=Number(position?.x)||0;
    enemy.z=Number(position?.z)||0;
    if(enemy.root){
      enemy.root.position?.set?.(enemy.x,Number(enemy.root.position?.y)||0,enemy.z);
      if(enemy.root.parent!==system.group)system.group.add(enemy.root);
      enemy.root.visible=true;
    }
    enemy.cooldown=Math.max(.18,Number(enemy.cooldown)||0);
    if(!system.enemies.includes(enemy))system.enemies.push(enemy);
  }
  function destroyRing(ring){
    ring?.parent?.remove?.(ring);
    ring?.geometry?.dispose?.();
    ring?.material?.dispose?.();
  }
  function makeRing(enemy,position){
    const source=enemy?.telegraph;
    if(!source?.clone)return null;
    const ring=source.clone();
    if(source.geometry?.clone)ring.geometry=source.geometry.clone();
    if(source.material?.clone)ring.material=source.material.clone();
    ring.name=`${enemy?.kind||'enemy'} Hades-style spawn preview`;
    ring.visible=true;
    ring.position.set?.(Number(position?.x)||0,.065,Number(position?.z)||0);
    ring.rotation.x=-Math.PI/2;
    ring.scale.setScalar?.(.72);
    ring.material?.color?.setHex?.(0xff684d);
    if(ring.material){ring.material.transparent=true;ring.material.opacity=.34;ring.material.depthWrite=false;}
    system.group.add(ring);
    return ring;
  }
  function restoreDeferred(){
    for(const entry of pending){
      destroyRing(entry.ring);
      attachEnemy(entry.enemy,entry.position);
    }
    for(const enemy of queue)attachEnemy(enemy);
    pending=[];
    queue=[];
  }
  function beginTelegraph(enemy,settings){
    const position=spawnPoint(enemy);
    pending.push({
      enemy,
      position,
      ring:makeRing(enemy,position),
      t:settings.spawnDelay,
      total:settings.spawnDelay,
    });
  }
  function fillTelegraphs(player=lastPlayer){
    if(!enabled||!queue.length)return;
    const settings=flow();
    const focus=currentPlayer(player);
    let guard=0;
    while(queue.length&&pending.length<settings.simultaneousTelegraphs&&guard++<40){
      const next=takeBestQueuedEnemy(focus);
      if(!next)break;
      const projected=activeWeight()+pendingWeight()+enemyWeight(next);
      const canOverflow=!system.enemies.length&&!pending.length;
      if(!canOverflow&&projected>settings.activeWeightCap){
        queue.push(next);
        break;
      }
      beginTelegraph(next,settings);
    }
  }
  function stageSpawnedEnemies(){
    if(!enabled||!system.enemies.length)return;
    queue=system.enemies.splice(0);
    for(const enemy of queue)detachEnemy(enemy);
    lastPlayer=currentPlayer();
    fillTelegraphs(lastPlayer);
  }
  function updateTelegraphs(dt){
    const elapsed=Math.max(0,Number(dt)||0);
    for(let index=pending.length-1;index>=0;index--){
      const entry=pending[index];
      entry.t-=elapsed;
      const u=clamp(1-entry.t/Math.max(.001,entry.total),0,1);
      if(entry.ring){
        const pulse=.92+Math.sin((performance.now?.()??Date.now())*.012)*(.04+u*.07);
        entry.ring.scale.setScalar?.((.72+u*.52)*pulse);
        entry.ring.rotation.z+=elapsed*(1+u*1.5);
        if(entry.ring.material)entry.ring.material.opacity=.26+u*.68;
      }
      if(entry.t>0)continue;
      destroyRing(entry.ring);
      attachEnemy(entry.enemy,entry.position);
      pending.splice(index,1);
    }
  }

  system.startRoomEncounter=roomId=>{
    restoreDeferred();
    const result=baseStart(roomId);
    stageSpawnedEnemies();
    return result;
  };
  system.update=(dt,player)=>{
    lastPlayer=currentPlayer(player);
    updateTelegraphs(dt);
    fillTelegraphs(lastPlayer);
    const deferred=queue.length>0||pending.length>0;
    const result=system.enemies.length||!deferred?baseUpdate(dt,player):undefined;
    fillTelegraphs(lastPlayer);
    return result;
  };
  if(baseReset)system.reset=()=>{restoreDeferred();return baseReset();};
  if(baseClear)system.clearRoomRuntime=()=>{restoreDeferred();return baseClear();};
  system.setWorkingRosterSpawnTelegraphs=value=>{
    enabled=!!value;
    if(!enabled)restoreDeferred();
    return enabled;
  };
  for(const [name,getter] of [['telegraphCount',()=>pending.length],['queuedSpawnCount',()=>queue.length]]){
    const descriptor=Object.getOwnPropertyDescriptor(system,name);
    if(!descriptor||descriptor.configurable)Object.defineProperty(system,name,{configurable:true,enumerable:true,get:getter});
  }
  system.__workingRosterSpawnTelegraphSupport=true;
  return system;
}

function clarifyHadesStyleControls(){
  if(typeof document==='undefined')return;
  const label=document.querySelector('label[for="hadesDifficultyRampSelect"]');
  if(label)label.textContent='HADES-STYLE ENEMY INTRODUCTION';
  const select=document.getElementById('hadesDifficultyRampSelect');
  if(select){
    const labels={slow:'Slow · Gradual',medium:'Medium · Faster',high:'High · Fast'};
    for(const option of select.options)if(labels[option.value])option.textContent=labels[option.value];
  }
}

export function installWorkingRosterEncounterMode(source,{
  storage=globalThis.localStorage,
  catalog=ARENA_ENEMY_CATALOG,
}={}){
  if(!source||source.__workingRosterEncounterMode)return source;
  if(typeof source.setSpawnKind!=='function')return source;

  installOriginalIndividualSpawnSupport(source.originalSystem,{
    releaseTarget:enemy=>source.factionService?.releaseTarget?.(enemy),
  });
  const currentPlan=()=>source.currentEncounterPlan;
  installRosterSpawnTelegraphSupport(source.originalSystem,{systemKey:'original',planGetter:currentPlan,catalog});
  installRosterSpawnTelegraphSupport(source.flareSystem,{systemKey:'flare',planGetter:currentPlan,catalog});
  const baseSetSpawnKind=source.setSpawnKind.bind(source);
  const spawnDescriptor=Object.getOwnPropertyDescriptor(source,'spawnKind');
  const baseSpawnKind=()=>spawnDescriptor?.get?.call(source)??ALL_ENEMIES_BUDGET_ID;
  let workingRosterMode=false;
  const rosterIds=()=>readWorkingRoster(storage,catalog);
  const setRosterMode=value=>{
    workingRosterMode=!!value;
    source.originalSystem?.setWorkingRosterSpawnTelegraphs?.(workingRosterMode);
    source.flareSystem?.setWorkingRosterSpawnTelegraphs?.(workingRosterMode);
    source.hadesSystem?.setTelegraphedSpawns?.(true);
    setHadesRosterModeActive(workingRosterMode);
    if(typeof setTimeout==='function')setTimeout(clarifyHadesStyleControls,0);
    return workingRosterMode;
  };

  setCombinedEncounterPlanResolver(({depth=1,random=Math.random}={})=>{
    if(!workingRosterMode)return null;
    const ids=rosterIds();
    if(!ids.length){setRosterMode(false);return null;}
    return createWorkingRosterEncounterPlan({depth,random,rosterIds:ids,catalog});
  });

  source.setSpawnKind=kind=>{
    if(kind===WORKING_ROSTER_HADES_ID){
      const active=rosterIds().length>0;
      setRosterMode(active);
      return baseSetSpawnKind(ALL_ENEMIES_BUDGET_ID);
    }
    setRosterMode(false);
    return baseSetSpawnKind(kind);
  };
  Object.defineProperty(source,'spawnKind',{
    configurable:true,
    enumerable:true,
    get:()=>workingRosterMode?WORKING_ROSTER_HADES_ID:baseSpawnKind(),
  });
  source.getWorkingRosterEncounterStatus=()=>({
    active:workingRosterMode,
    ids:rosterIds(),
    fallbackMode:ALL_ENEMIES_BUDGET_ID,
    spawnTelegraphs:true,
    reinforcementFlow:true,
    previewBeforeModel:true,
  });
  source.__workingRosterEncounterMode=true;
  if(typeof setTimeout==='function')setTimeout(clarifyHadesStyleControls,0);
  return source;
}
