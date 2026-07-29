import { LUGARU_DUELIST_ID } from './lugaru-duelist.js';

export const ORIGINAL_MULTI_GROUP_SPAWN_KIND='originalRosterMultiGroup';
export const ORIGINAL_BASE_ENEMY_IDS=Object.freeze(['grunt','dagger','mace','rock','captain']);

const baseIdSet=new Set(ORIGINAL_BASE_ENEMY_IDS);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

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

export function normalizeOriginalEncounterGroups(groups=[],maxTotal=20){
  const normalized=[];
  let remaining=clamp(Math.round(Number(maxTotal)||20),1,20);
  for(const raw of groups||[]){
    const spawnKind=String(raw?.spawnKind||raw?.kind||'').trim();
    if(!baseIdSet.has(spawnKind)&&spawnKind!==LUGARU_DUELIST_ID)continue;
    const count=Math.min(remaining,clamp(Math.round(Number(raw?.count)||1),1,20));
    if(count<=0)continue;
    normalized.push({...raw,system:'original',spawnKind,count});
    remaining-=count;
    if(remaining<=0)break;
  }
  return normalized;
}

export function collapseOriginalExecutionGroups(groups=[]){
  const originals=(groups||[]).filter(group=>group?.system==='original');
  if(originals.length<2)return{groups:[...(groups||[])],originalGroups:originals,collapsed:false};
  const firstIndex=(groups||[]).findIndex(group=>group?.system==='original');
  const childGroups=normalizeOriginalEncounterGroups(originals,20);
  const synthetic={
    id:ORIGINAL_MULTI_GROUP_SPAWN_KIND,
    label:childGroups.map(group=>group.label||group.spawnKind).join(' + '),
    system:'original',
    spawnKind:ORIGINAL_MULTI_GROUP_SPAWN_KIND,
    count:childGroups.reduce((sum,group)=>sum+group.count,0),
    encounterCost:childGroups.reduce((sum,group)=>sum+(Number(group.encounterCost)||0),0),
    activeWeight:childGroups.reduce((sum,group)=>sum+(Number(group.activeWeight)||1)*(Number(group.count)||1),0),
    maxCount:20,
    tags:[...new Set(childGroups.flatMap(group=>group.tags||[]))],
    childGroups:childGroups.map(group=>({...group})),
  };
  const execution=[];
  for(let index=0;index<(groups||[]).length;index++){
    const group=groups[index];
    if(group?.system!=='original')execution.push(group);
    else if(index===firstIndex)execution.push(synthetic);
  }
  return{groups:execution,originalGroups:childGroups,collapsed:true};
}

export function installOriginalEncounterGroupSupport(system,{releaseTarget=null,maxTotal=20}={}){
  if(!system||system.__originalEncounterGroupSupport)return system;
  if(!Array.isArray(system.enemies)||typeof system.setSpawnKind!=='function'||typeof system.setWaveSize!=='function'||typeof system.startRoomEncounter!=='function')return system;

  const rawSetSpawnKind=system.setSpawnKind.bind(system);
  const rawSetWaveSize=system.setWaveSize.bind(system);
  const rawStartRoomEncounter=system.startRoomEncounter.bind(system);
  const rawSpawnDescriptor=Object.getOwnPropertyDescriptor(system,'spawnKind');
  const rawSpawnKind=()=>rawSpawnDescriptor?.get?.call(system)??'';
  let isolatedKind=null;
  let requestedCount=1;

  function setExactSpawnKind(kind){
    const requested=String(kind||'');
    isolatedKind=baseIdSet.has(requested)||requested===LUGARU_DUELIST_ID?requested:null;
    return rawSetSpawnKind(isolatedKind?'goblins':kind);
  }
  function setExactWaveSize(value){
    requestedCount=clamp(Math.round(Number(value)||1),1,20);
    const expanded=isolatedKind?clamp(requestedCount*ORIGINAL_BASE_ENEMY_IDS.length,ORIGINAL_BASE_ENEMY_IDS.length,20):requestedCount;
    return rawSetWaveSize(expanded);
  }
  function startExactEncounter(roomId){
    if(!isolatedKind)return rawStartRoomEncounter(roomId);
    const collected=[];
    let result;
    let guard=0;
    while(collected.length<requestedCount&&guard++<10){
      const remaining=requestedCount-collected.length;
      const expanded=clamp(remaining*ORIGINAL_BASE_ENEMY_IDS.length,ORIGINAL_BASE_ENEMY_IDS.length,20);
      rawSetWaveSize(expanded);
      result=rawStartRoomEncounter(roomId);
      const expected=Math.min(remaining,Math.max(1,Math.floor(expanded/ORIGINAL_BASE_ENEMY_IDS.length)));
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
  }

  let multiActive=false;
  let pendingGroups=[];
  let requestedTotal=1;

  system.setWorkingRosterEncounterGroups=groups=>{
    pendingGroups=normalizeOriginalEncounterGroups(groups,maxTotal);
    return pendingGroups.map(group=>({...group}));
  };
  system.setSpawnKind=kind=>{
    if(kind===ORIGINAL_MULTI_GROUP_SPAWN_KIND){
      multiActive=pendingGroups.length>1;
      isolatedKind=null;
      return ORIGINAL_MULTI_GROUP_SPAWN_KIND;
    }
    multiActive=false;
    pendingGroups=[];
    return setExactSpawnKind(kind);
  };
  system.setWaveSize=value=>{
    requestedTotal=clamp(Math.round(Number(value)||1),1,20);
    if(multiActive)return requestedTotal;
    return setExactWaveSize(value);
  };
  system.startRoomEncounter=roomId=>{
    if(!multiActive||pendingGroups.length<2)return startExactEncounter(roomId);
    const collected=[];
    let result;
    for(const group of normalizeOriginalEncounterGroups(pendingGroups,Math.min(maxTotal,requestedTotal))){
      setExactSpawnKind(group.spawnKind);
      setExactWaveSize(group.count);
      result=startExactEncounter(roomId);
      collected.push(...system.enemies.splice(0));
    }
    system.enemies.push(...collected.slice(0,Math.min(maxTotal,requestedTotal)));
    return result;
  };
  Object.defineProperty(system,'spawnKind',{
    configurable:true,
    enumerable:true,
    get:()=>multiActive?ORIGINAL_MULTI_GROUP_SPAWN_KIND:(isolatedKind||rawSpawnKind()),
  });
  Object.defineProperty(system,'currentOriginalEncounterGroups',{
    configurable:true,
    enumerable:true,
    get:()=>pendingGroups.map(group=>({...group})),
  });
  system.supportsSameSystemEncounterGroups=true;
  system.__workingRosterOriginalSpawnSupport=true;
  system.__originalEncounterGroupSupport=true;
  return system;
}
