// Enemy-system router. Manual test selections still run one isolated roster.
// The combined budget mode coordinates original, FLARE, and Hades simulations
// so one encounter can contain enemies from multiple sources without merging
// their individual combat implementations.

import {
  ARENA_ENEMY_ARCHETYPES,
  LUGARU_DUELIST_ID,
  createArenaEnemySystem as createOriginalArenaEnemySystem,
} from './arena-enemies-guard.js';
import { setArenaEnemySource } from './arena-enemy-registry.js';
import { createFlareArenaEnemySystem } from './flare-arena-enemies.js';
import { isFlareSpawnKind } from './flare-enemies.js';
import { createHadesArenaEnemySystem } from './hades-arena-enemies.js';
import { HADES_TARTARUS_POOL_ID, isHadesSpawnKind } from './hades-enemies.js';
import { ALL_ENEMIES_BUDGET_ID } from './encounter-pools.js';
import { createCombinedEncounterPlan } from './combined-encounter-director.js';
import { setHadesNativeModeActive } from './hades-encounter-tuning.js';
import { applyWizardEnemyStatus, resolveArenaEnemyMove } from './arena-enemies-base.js';
import { ARENA_FACTIONS, createArenaFactionService } from './arena-faction-service.js';
import { createPlayerDamageInterceptorStack } from './player-damage-interceptors.js';
export { ARENA_ENEMY_ARCHETYPES };

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ORIGINAL_GOBLIN_IDS=new Set(Object.keys(ARENA_ENEMY_ARCHETYPES).filter(id=>id!==LUGARU_DUELIST_ID));

export function routeArenaEnemyMove(systems,enemy,target,options={},fallback=null){
  const owner=(systems||[]).find(system=>system?.enemies?.includes?.(enemy));
  if(!owner)return false;
  const mover=owner.moveEnemyResolved||owner.moveEnemy;
  if(typeof mover==='function')return mover.call(owner,enemy,target,options);
  return typeof fallback==='function'?fallback(owner,enemy,target,options):false;
}

export function routeArenaEnemyStatus(systems,enemy,kind,duration,options={},fallback=applyWizardEnemyStatus){
  const owner=(systems||[]).find(system=>system?.enemies?.includes?.(enemy));
  if(!owner||!enemy||Number(enemy.hp)<=0)return false;
  if(typeof owner.applyStatus==='function')return owner.applyStatus(enemy,kind,duration,options)!==false;
  const applied=typeof fallback==='function'&&fallback(enemy,kind,duration,options)!==false;
  if(!applied)return false;
  const status=String(kind||'').toLowerCase();
  if(status==='shock'||status==='freeze'){
    if(typeof owner.director?.releaseAllForEnemy==='function')owner.director.releaseAllForEnemy(enemy);
    else owner.director?.release?.(enemy);
    if(enemy.state==='windup'||enemy.state==='active'||enemy.state==='recovery'){
      enemy.state='idle';enemy.stateTime=0;enemy.attack=null;enemy.hitDone=false;
    }
    enemy.vx=enemy.vz=0;
  }
  return true;
}

export function createArenaEnemySystem(options={}){
  const factionService=options.factionService||createArenaFactionService();
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

  const original=createOriginalArenaEnemySystem({...options,factionService,systemKey:'original',onEncounterCleared:childCleared('original')});
  const flare=createFlareArenaEnemySystem({...options,factionService,systemKey:'flare',onEncounterCleared:childCleared('flare')});
  const hades=createHadesArenaEnemySystem({...options,factionService,systemKey:'hades',onEncounterCleared:childCleared('hades')});
  const systemsByKey={original,flare,hades};
  const systems=Object.values(systemsByKey);
  const playerDamageInterceptors=createPlayerDamageInterceptorStack({
    apply(interceptor){for(const system of systems)system.setPlayerDamageInterceptor?.(interceptor);},
  });
  for(const [key,system] of Object.entries(systemsByKey))factionService.registerEnemySystem(key,system);
  active=original;
  manualWaveSize=original.waveSize;
  hades.setEncounterPlanningEnabled?.(false);
  setCombatDirectorEnabled(hades,true);
  setHadesNativeModeActive(false);
  for(const system of [flare,hades]){system.clearRoomRuntime();system.group.visible=false;}

  const all=method=>(...args)=>{for(const system of systems)system[method]?.(...args);};
  const systemForKind=kind=>isHadesSpawnKind(kind)?['hades',hades]:isFlareSpawnKind(kind)?['flare',flare]:['original',original];
  const combinedSystems=()=>[...participatingKeys].map(key=>systemsByKey[key]);
  const visibleSystems=()=>combinedMode?combinedSystems():[active];
  const owningSystem=enemy=>systems.find(system=>system.enemies.includes(enemy))||null;
  function setCombatDirectorEnabled(system,enabled){system?.setCombatDirectorEnabled?.(enabled);}
  const isCombatDirectorEnabled=system=>system?.combatDirectorEnabled??true;

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
    setHadesNativeModeActive(false);
    setCombatDirectorEnabled(hades,true);
    hades.setEncounterPlanningEnabled?.(false);
  }

  function setSpawnKind(kind){
    if(kind===ALL_ENEMIES_BUDGET_ID){
      activateCombined();
      return;
    }
    if(kind===HADES_TARTARUS_POOL_ID){
      activateSingle('hades',hades);
      setCombatDirectorEnabled(hades,false);
      hades.setEncounterPlanningEnabled?.(true);
      setHadesNativeModeActive(true);
      hades.setSpawnKind(kind);
      selectedSpawnKind=hades.spawnKind;
      return;
    }
    setHadesNativeModeActive(false);
    setCombatDirectorEnabled(hades,true);
    hades.setEncounterPlanningEnabled?.(false);
    const [key,next]=systemForKind(kind);
    activateSingle(key,next);
    next.setSpawnKind(kind);
    selectedSpawnKind=next.spawnKind;
  }

  function startCombinedEncounter(roomId){
    labMode=false;
    setHadesNativeModeActive(false);
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
      setCombatDirectorEnabled(system,true);
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

    setHadesNativeModeActive(false);
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
      setCombatDirectorEnabled(system,true);
      system.setEncounterPlanningEnabled?.(false);

      const lugaruDuelist=groupPlan.system==='original'&&groupPlan.spawnKind===LUGARU_DUELIST_ID;
      const originalGoblin=groupPlan.system==='original'&&ORIGINAL_GOBLIN_IDS.has(groupPlan.spawnKind);
      const isolatedOriginal=originalGoblin||lugaruDuelist;
      system.setSpawnKind(isolatedOriginal?'goblins':groupPlan.spawnKind);
      const spawnCount=isolatedOriginal
        ? clamp(groupPlan.count*ORIGINAL_GOBLIN_IDS.size,1,20)
        : groupPlan.count;
      system.setWaveSize(spawnCount);
      system.startRoomEncounter(roomId);
      if(originalGoblin)retainOriginalGoblinKind(system,groupPlan.spawnKind,groupPlan.count);
      if(lugaruDuelist){
        retainOriginalGoblinKind(system,'grunt',groupPlan.count);
        system.configureLugaruDuelists?.(system.enemies);
      }
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

  function moveEnemyResolved(enemy,target,moveOptions={}){
    const fallback=(owner,ownedEnemy,requested,childOptions={})=>{
      const result=resolveArenaEnemyMove(ownedEnemy,requested,{
        navigation:options.navigation,
        radius:Number.isFinite(Number(childOptions.radius))?Number(childOptions.radius):Math.max(.1,(Number(ownedEnemy.radius)||1)*(Number(owner.heightScale)||1)),
        arenaRadius:Number(options.arenaRadius)||18,
        clampMargin:1,
      });
      ownedEnemy.x=result.current.x;ownedEnemy.z=result.current.z;
      if(childOptions.resetVelocity===true)ownedEnemy.vx=ownedEnemy.vz=ownedEnemy.knockX=ownedEnemy.knockZ=0;
      if(ownedEnemy.root?.position?.set)ownedEnemy.root.position.set(ownedEnemy.x,(Number(ownedEnemy.yOff)||0)+(Number(ownedEnemy.rootLift)||0),ownedEnemy.z);
      else if(ownedEnemy.mesh?.position?.set)ownedEnemy.mesh.position.set(ownedEnemy.x,ownedEnemy.mesh.position.y||0,ownedEnemy.z);
      return result;
    };
    if(!combinedMode){
      const mover=active.moveEnemyResolved||active.moveEnemy;
      return typeof mover==='function'?mover.call(active,enemy,target,moveOptions):fallback(active,enemy,target,moveOptions);
    }
    return routeArenaEnemyMove(systems,enemy,target,moveOptions,fallback);
  }
  const moveEnemy=(enemy,target,options={})=>moveEnemyResolved(enemy,target,options);

  function damagePlayer(damage,options={}){
    if(!combinedMode)return active.damagePlayer?.(damage,options)??0;
    const before=Number(active.playerHp)||0,applied=active.damagePlayer?.(damage,options)??0,after=Number(active.playerHp)||before;
    globalPlayerHp=Math.max(0,globalPlayerHp-Math.max(0,before-after));hpSnapshots.set(active,after);return applied;
  }

  function setPlayerDamageInterceptor(interceptor){playerDamageInterceptors.setLegacy(interceptor);}
  function registerPlayerDamageInterceptor(id,interceptor,priority=0){return playerDamageInterceptors.register(id,interceptor,priority);}
  function unregisterPlayerDamageInterceptor(id){return playerDamageInterceptors.unregister(id);}
  function applyStatus(enemy,kind,duration,statusOptions={}){return routeArenaEnemyStatus(systems,enemy,kind,duration,statusOptions);}
  function stunEnemy(enemy,...args){return owningSystem(enemy)?.stunEnemy?.(enemy,...args)??false;}
  function registerWizardDecoy(decoy){for(const system of visibleSystems())system.registerWizardDecoy?.(decoy);return decoy?.id||decoy?.stableId||null;}
  function unregisterWizardDecoy(id){for(const system of systems)system.unregisterWizardDecoy?.(id);}
  function consumeWizardDecoyAttacks(){return visibleSystems().flatMap(system=>system.consumeWizardDecoyAttacks?.()||[]);}
  const registerAlliedTarget=target=>factionService.registerAlliedTarget(target);
  const unregisterAlliedTarget=id=>factionService.unregisterAlliedTarget(id);
  const registerDamageModifier=modifier=>factionService.registerDamageModifier(modifier);
  const unregisterDamageModifier=id=>factionService.unregisterDamageModifier(id);
  const charmEnemy=(enemy,options={})=>factionService.charmEnemy(enemy,options);
  const releaseCharmedEnemy=enemy=>factionService.releaseCharm(enemy);
  const getNearestHostile=position=>{
    const actor={x:Number(position?.x)||0,z:Number(position?.z)||0,wizardFaction:ARENA_FACTIONS.ALLIED};
    return factionService.chooseTarget(actor,null)?.__arenaEntity||null;
  };

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
    get hostileEnemies(){return factionService.enemyDescriptors(ARENA_FACTIONS.HOSTILE).map(target=>target.__arenaEntity);},
    get alliedTargets(){return factionService.alliedTargets;},
    get charmedEnemy(){return factionService.charmedEnemy;},
    get hostileProjectiles(){return visibleSystems().flatMap(system=>system.hostileProjectiles||[]);},
    get group(){return active.group;},
    get director(){return active.director;},
    update,damageEnemy,moveEnemy,moveEnemyResolved,damagePlayer,setPlayerDamageInterceptor,registerPlayerDamageInterceptor,unregisterPlayerDamageInterceptor,applyStatus,stunEnemy,registerWizardDecoy,unregisterWizardDecoy,consumeWizardDecoyAttacks,
    registerAlliedTarget,unregisterAlliedTarget,registerDamageModifier,unregisterDamageModifier,charmEnemy,releaseCharmedEnemy,getNearestHostile,
    launchRigidBody,isRigidBodyActive,reset,startRoomEncounter,startLabScenario,clearRoomRuntime,setSpawnKind,
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
    get combatDirectorEnabled(){return combinedMode?true:isCombatDirectorEnabled(active);},
    get combatDirectorStatus(){return this.combatDirectorEnabled?'Combat Director: On':'Combat Director: Off — Tartarus Native Behavior';},
    get labMode(){return labMode;},
    factionService,originalSystem:original,flareSystem:flare,hadesSystem:hades,
  };
  setArenaEnemySource(api);
  globalThis.__enemyLabEnemySystem=api;
  return api;
}
