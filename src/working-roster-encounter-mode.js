import { ARENA_ENEMY_CATALOG } from './arena-enemy-catalog.js';
import { readWorkingRoster } from './enemy-lab-working-roster.js';
import { ALL_ENEMIES_BUDGET_ID, WORKING_ROSTER_HADES_ID } from './encounter-pools.js';
import { setCombinedEncounterPlanResolver } from './combined-encounter-director.js';
import { createWorkingRosterEncounterPlan } from './working-roster-encounter.js';
import { LUGARU_DUELIST_ID } from './lugaru-duelist.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const baseOriginalIds=Object.freeze(
  ARENA_ENEMY_CATALOG
    .filter(enemy=>enemy.family==='GOBLINS'&&enemy.id!==LUGARU_DUELIST_ID)
    .map(enemy=>enemy.id)
);
const baseOriginalIdSet=new Set(baseOriginalIds);

function removeEnemyImmediately(system,enemy){
  system.director?.releaseAllForEnemy?.(enemy);
  const index=system.enemies.indexOf(enemy);
  if(index>=0)system.enemies.splice(index,1);
  enemy?.root?.parent?.remove?.(enemy.root);
}

function retainEnemyKind(system,kind,count){
  let retained=0;
  for(const enemy of [...system.enemies]){
    if(enemy.kind===kind&&retained<count){retained++;continue;}
    removeEnemyImmediately(system,enemy);
  }
  return retained;
}

export function installOriginalIndividualSpawnSupport(system){
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
    const expanded=isolatedKind?clamp(requestedCount*Math.max(1,baseOriginalIds.length),1,20):requestedCount;
    return baseSetWaveSize(expanded);
  };
  system.startRoomEncounter=roomId=>{
    const result=baseStartRoomEncounter(roomId);
    if(!isolatedKind)return result;
    if(isolatedKind===LUGARU_DUELIST_ID){
      retainEnemyKind(system,'grunt',requestedCount);
      system.configureLugaruDuelists?.(system.enemies);
    }else retainEnemyKind(system,isolatedKind,requestedCount);
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

export function installWorkingRosterEncounterMode(source,{
  storage=globalThis.localStorage,
  catalog=ARENA_ENEMY_CATALOG,
}={}){
  if(!source||source.__workingRosterEncounterMode)return source;
  if(typeof source.setSpawnKind!=='function')return source;

  installOriginalIndividualSpawnSupport(source.originalSystem);
  const baseSetSpawnKind=source.setSpawnKind.bind(source);
  const spawnDescriptor=Object.getOwnPropertyDescriptor(source,'spawnKind');
  const baseSpawnKind=()=>spawnDescriptor?.get?.call(source)??ALL_ENEMIES_BUDGET_ID;
  let workingRosterMode=false;
  const rosterIds=()=>readWorkingRoster(storage,catalog);

  setCombinedEncounterPlanResolver(({depth=1,random=Math.random}={})=>{
    if(!workingRosterMode)return null;
    const ids=rosterIds();
    if(!ids.length){workingRosterMode=false;return null;}
    return createWorkingRosterEncounterPlan({depth,random,rosterIds:ids,catalog});
  });

  source.setSpawnKind=kind=>{
    if(kind===WORKING_ROSTER_HADES_ID){
      workingRosterMode=rosterIds().length>0;
      return baseSetSpawnKind(ALL_ENEMIES_BUDGET_ID);
    }
    workingRosterMode=false;
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
  });
  source.__workingRosterEncounterMode=true;
  return source;
}
