import { ARENA_ENEMY_CATALOG } from './arena-enemy-catalog.js';
import { WORKING_ROSTER_HADES_ID } from './encounter-pools.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const catalogByKind=new Map(ARENA_ENEMY_CATALOG.map(enemy=>[String(enemy.spawnKind||enemy.id),enemy]));

// These are the exact fallback values used by the native Hades runtime whenever
// its encounter planner is disabled by the mixed-system router.
export function createNativeHadesCadencePlan(plannedCount=1){
  const count=clamp(Math.round(Number(plannedCount)||1),1,20);
  return Object.freeze({
    activeWeightCap:Math.max(2.5,count*.65),
    simultaneousTelegraphs:2,
    spawnDelay:.72,
  });
}

function enemyDefinition(enemy){
  const catalog=catalogByKind.get(String(enemy?.kind||enemy?.spawnKind||''));
  return{
    activeWeight:Math.max(.1,Number(enemy?.def?.activeWeight)||Number(catalog?.activeWeight)||1),
    maxActive:Math.max(1,Math.round(Number(enemy?.def?.maxActive)||Number(catalog?.maxCount)||8)),
    territoryMode:enemy?.def?.territoryMode||enemy?.territoryMode||'',
    accentColor:enemy?.def?.accentColor||0xff684d,
    radius:Math.max(.1,Number(enemy?.def?.radius)||Number(enemy?.radius)||.72),
  };
}

function installNativeHadesCadenceOnSystem(system,{
  systemKey='original',
  planGetter=()=>null,
}={}){
  if(!system||system.__nativeHadesRosterCadence)return system;
  if(!Array.isArray(system.enemies)||!system.group||typeof system.startRoomEncounter!=='function'||typeof system.update!=='function')return system;

  const baseStart=system.startRoomEncounter.bind(system);
  const baseUpdate=system.update.bind(system);
  const baseReset=system.reset?.bind(system);
  const baseClear=system.clearRoomRuntime?.bind(system);
  let enabled=false;
  let queue=[];
  let spawnTelegraphs=[];
  let lastPlayer={x:0,z:0};
  let time=0;

  const kindOf=enemy=>String(enemy?.kind||enemy?.spawnKind||'');
  const pointOf=enemy=>({x:Number(enemy?.x)||0,z:Number(enemy?.z)||0});
  const activeWeight=()=>system.enemies.reduce((sum,enemy)=>sum+(Number(enemy?.hp)>0?enemyDefinition(enemy).activeWeight:0),0);
  const pendingWeight=()=>spawnTelegraphs.reduce((sum,entry)=>sum+entry.def.activeWeight,0);
  const queuedKindCount=kind=>system.enemies.filter(enemy=>kindOf(enemy)===kind&&Number(enemy?.hp)>0).length+
    spawnTelegraphs.filter(entry=>entry.kind===kind).length;

  function currentPlayer(player=null){
    if(Number.isFinite(Number(player?.x))&&Number.isFinite(Number(player?.z))){
      return{x:Number(player.x),z:Number(player.z)};
    }
    const actor=globalThis.__arena?.actorPos;
    if(Number.isFinite(Number(actor?.x))){
      const z=Number.isFinite(Number(actor?.z))?Number(actor.z):Number(actor?.y);
      if(Number.isFinite(z))return{x:Number(actor.x),z};
    }
    return lastPlayer;
  }

  function cadencePlan(){
    const plan=planGetter?.();
    const group=(plan?.groups||[]).find(entry=>entry?.system===systemKey);
    return createNativeHadesCadencePlan(group?.count||system.enemies.length+queue.length+spawnTelegraphs.length||1);
  }

  function spawnPriority(enemy,player){
    const def=enemyDefinition(enemy);
    const preferred=['sentry','skirmisher','trapper'].includes(def.territoryMode)?9:6;
    const point=pointOf(enemy);
    const occupied=[
      ...system.enemies.filter(candidate=>Number(candidate?.hp)>0).map(pointOf),
      ...spawnTelegraphs.map(entry=>({x:entry.x,z:entry.z})),
    ];
    const playerDistance=Math.hypot(point.x-player.x,point.z-player.z);
    const spacing=occupied.length?Math.min(...occupied.map(other=>Math.hypot(point.x-other.x,point.z-other.z))):8;
    return-Math.abs(playerDistance-preferred)+Math.min(6,spacing)*.72+Math.random()*.25;
  }

  function detachEnemy(enemy){
    if(!enemy?.root)return;
    enemy.root.visible=false;
    enemy.root.parent?.remove?.(enemy.root);
  }

  function attachEnemy(enemy,position=pointOf(enemy)){
    if(!enemy)return;
    enemy.x=Number(position?.x)||0;
    enemy.z=Number(position?.z)||0;
    if(enemy.root){
      enemy.root.position?.set?.(enemy.x,Number(enemy.root.position?.y)||0,enemy.z);
      if(enemy.root.parent!==system.group)system.group.add(enemy.root);
      enemy.root.visible=true;
    }
    if(Number.isFinite(Number(enemy.spawnGrace)))enemy.spawnGrace=Math.max(.18,Number(enemy.spawnGrace)||0);
    else enemy.cooldown=Math.max(.18,Number(enemy.cooldown)||0);
    if(!system.enemies.includes(enemy))system.enemies.push(enemy);
  }

  function destroySpawnTelegraph(entry){
    entry?.mesh?.parent?.remove?.(entry.mesh);
    entry?.mesh?.geometry?.dispose?.();
    entry?.mesh?.material?.dispose?.();
  }

  function makeSpawnTelegraph(enemy,position,def){
    const source=enemy?.telegraph;
    if(!source?.clone)return null;
    const mesh=source.clone();
    if(source.geometry?.clone)mesh.geometry=source.geometry.clone();
    if(source.material?.clone)mesh.material=source.material.clone();
    const radius=Math.max(.72,def.radius*1.2);
    const sourceRadius=Math.max(.01,Number(enemy?.radius)||def.radius||.72);
    mesh.name=`${kindOf(enemy)||'enemy'} native Hades spawn preview`;
    mesh.visible=true;
    mesh.position.set?.(Number(position?.x)||0,.065,Number(position?.z)||0);
    mesh.rotation.x=-Math.PI/2;
    mesh.scale.setScalar?.(radius/sourceRadius);
    mesh.material?.color?.setHex?.(def.accentColor||0xff684d);
    if(mesh.material){mesh.material.transparent=true;mesh.material.opacity=.68;mesh.material.depthWrite=false;}
    system.group.add(mesh);
    return mesh;
  }

  function restoreDeferred(){
    for(const entry of spawnTelegraphs){
      destroySpawnTelegraph(entry);
      attachEnemy(entry.enemy,{x:entry.x,z:entry.z});
    }
    for(const enemy of queue)attachEnemy(enemy);
    spawnTelegraphs=[];
    queue=[];
  }

  function legalQueueIndex(player,plan){
    let bestIndex=-1;
    let bestScore=-Infinity;
    for(let index=0;index<queue.length;index++){
      const enemy=queue[index];
      const def=enemyDefinition(enemy);
      const kind=kindOf(enemy);
      if(queuedKindCount(kind)>=def.maxActive)continue;
      const canOverflow=!system.enemies.length&&!spawnTelegraphs.length;
      if(!canOverflow&&activeWeight()+pendingWeight()+def.activeWeight>plan.activeWeightCap)continue;
      const score=spawnPriority(enemy,player);
      if(score>bestScore){bestScore=score;bestIndex=index;}
    }
    return bestIndex;
  }

  function releaseQueuedSpawns(player=lastPlayer){
    if(!enabled||!queue.length)return;
    const plan=cadencePlan();
    const focus=currentPlayer(player);
    let guard=0;
    while(queue.length&&spawnTelegraphs.length<plan.simultaneousTelegraphs&&guard++<40){
      const index=legalQueueIndex(focus,plan);
      if(index<0)break;
      const [enemy]=queue.splice(index,1);
      const def=enemyDefinition(enemy);
      const position=pointOf(enemy);
      const duration=plan.spawnDelay;
      spawnTelegraphs.push({
        enemy,
        kind:kindOf(enemy),
        def,
        x:position.x,
        z:position.z,
        t:duration,
        total:duration,
        mesh:makeSpawnTelegraph(enemy,position,def),
      });
    }
  }

  function updateSpawnTelegraphs(dt){
    const elapsed=Math.max(0,Number(dt)||0);
    time+=elapsed;
    for(let index=spawnTelegraphs.length-1;index>=0;index--){
      const entry=spawnTelegraphs[index];
      entry.t-=elapsed;
      const u=clamp(1-entry.t/Math.max(.001,entry.total),0,1);
      if(entry.mesh){
        const pulse=.92+Math.sin(time*(8+u*9))*Math.min(.12,.035+u*.08);
        entry.mesh.scale.multiplyScalar?.((.72+u*.52)*pulse/Math.max(.001,entry._lastScale||1));
        entry._lastScale=(.72+u*.52)*pulse;
        entry.mesh.rotation.z+=elapsed*(.45+u*1.6);
        entry.mesh.material.opacity=.26+u*.68;
      }
      if(entry.t>0)continue;
      destroySpawnTelegraph(entry);
      spawnTelegraphs.splice(index,1);
      attachEnemy(entry.enemy,{x:entry.x,z:entry.z});
    }
  }

  function stageEncounter(){
    if(!enabled||!system.enemies.length)return;
    queue=system.enemies.splice(0);
    for(const enemy of queue)detachEnemy(enemy);
    lastPlayer=currentPlayer();
    releaseQueuedSpawns(lastPlayer);
  }

  system.startRoomEncounter=roomId=>{
    restoreDeferred();
    const result=baseStart(roomId);
    stageEncounter();
    return result;
  };
  system.update=(dt,player)=>{
    lastPlayer=currentPlayer(player);
    updateSpawnTelegraphs(dt);
    releaseQueuedSpawns(lastPlayer);
    const deferred=queue.length>0||spawnTelegraphs.length>0;
    const result=system.enemies.length||!deferred?baseUpdate(dt,player):undefined;
    releaseQueuedSpawns(lastPlayer);
    return result;
  };
  if(baseReset)system.reset=()=>{restoreDeferred();return baseReset();};
  if(baseClear)system.clearRoomRuntime=()=>{restoreDeferred();return baseClear();};
  system.setNativeHadesRosterCadence=value=>{
    enabled=!!value;
    if(enabled)system.setWorkingRosterSpawnTelegraphs?.(false);
    else restoreDeferred();
    return enabled;
  };
  for(const [name,getter] of [['telegraphCount',()=>spawnTelegraphs.length],['queuedSpawnCount',()=>queue.length]]){
    const descriptor=Object.getOwnPropertyDescriptor(system,name);
    if(!descriptor||descriptor.configurable)Object.defineProperty(system,name,{configurable:true,enumerable:true,get:getter});
  }
  system.__nativeHadesRosterCadence=true;
  return system;
}

export function installNativeHadesRosterCadence(source){
  if(!source||source.__nativeHadesRosterCadence)return source;
  if(!source.originalSystem||!source.flareSystem)return source;

  const currentPlan=()=>source.currentEncounterPlan;
  installNativeHadesCadenceOnSystem(source.originalSystem,{systemKey:'original',planGetter:currentPlan});
  installNativeHadesCadenceOnSystem(source.flareSystem,{systemKey:'flare',planGetter:currentPlan});

  const baseSetSpawnKind=source.setSpawnKind.bind(source);
  source.setSpawnKind=kind=>{
    const result=baseSetSpawnKind(kind);
    const active=kind===WORKING_ROSTER_HADES_ID&&!!source.getWorkingRosterEncounterStatus?.().active;
    source.originalSystem.setNativeHadesRosterCadence?.(active);
    source.flareSystem.setNativeHadesRosterCadence?.(active);
    return result;
  };
  const baseStatus=source.getWorkingRosterEncounterStatus?.bind(source);
  source.getWorkingRosterEncounterStatus=()=>({
    ...(baseStatus?.()||{}),
    cadence:'native-hades',
    cadenceSharedWith:['original','flare','hades'],
  });
  source.__nativeHadesRosterCadence=true;
  return source;
}
