// Shared faction, target-selection, and damage-modifier coordination for the
// three arena enemy families. The service deliberately owns no rendering and
// no frame clock: child simulations can consult it without becoming coupled to
// one another, while Arcana runtimes can register finite-health allied actors.

export const ARENA_FACTIONS=Object.freeze({
  PLAYER:'player',
  ALLIED:'allied',
  HOSTILE:'hostile',
});

const finite=value=>Number.isFinite(Number(value));
const point=value=>({x:finite(value?.x)?Number(value.x):0,z:finite(value?.z)?Number(value.z):0});
const lexical=(a,b)=>String(a).localeCompare(String(b),'en',{numeric:true});
const FIRE_ARCANA_IDS=new Set([
  'FLAME-STRIKE','FLAME-CROSS','BOUNCING-BLAZE','HOMING-FLARES','SEARING-RUSH','FLARE-RUSH','IGNITION-RUSH',
  'FLAME-FUSION','RAPID-FIRE-AGENT','WARD-OF-FLAMES',
]);

export function arenaDamageElement(options={}){
  const explicit=String(options.element||options.arcanaElement||options.sourceElement||options.damageType||'').trim();
  if(explicit)return explicit;
  const arcanaId=String(options.arcanaId||options.sourceId||'').replace(/^WOL-/,'').split(':')[0].toUpperCase();
  if(FIRE_ARCANA_IDS.has(arcanaId)||options.flameStrike||options.flameCross||options.bouncingBlaze||options.homingFlares)return'Fire';
  return'';
}

export function arenaFactionOf(entity){
  const raw=entity?.__arenaEntity||entity;
  if(entity?.__arenaTargetKind==='player'||raw?.wizardFaction===ARENA_FACTIONS.PLAYER)return ARENA_FACTIONS.PLAYER;
  const faction=String(raw?.wizardFaction||raw?.arenaFaction||'').toLowerCase();
  return faction===ARENA_FACTIONS.ALLIED?ARENA_FACTIONS.ALLIED:ARENA_FACTIONS.HOSTILE;
}

export function isArenaCharmEligible(enemy){
  if(!enemy||Number(enemy.hp)<=0)return false;
  const def=enemy.def||{};
  const sizeClass=String(enemy.sizeClass||def.sizeClass||'').toLowerCase();
  const rank=String(enemy.rank||enemy.tier||enemy.classification||sizeClass||'').toLowerCase();
  const kind=String(enemy.kind||enemy.type||'').toLowerCase();
  const role=String(def.role||enemy.role||'').toLowerCase();
  return !(
    enemy.charmImmune===true||def.charmImmune===true||enemy.isBoss===true||def.isBoss===true||
    enemy.boss===true||enemy.isElite===true||def.isElite===true||enemy.large===true||enemy.isLarge===true||def.large===true||def.isLarge===true||enemy.eliteSize==='large'||
    sizeClass==='large'||sizeClass==='boss'||rank.includes('boss')||rank.includes('large')||kind.includes('boss')||
    Number(enemy.targetScale)>=1.5||Number(def.targetScale)>=1.5||Number(enemy.radius)>=1.4||
    Number(def.radius)>=1.4||role==='boss'||role==='spawner'
  );
}

export function createArenaFactionService(){
  const systems=new Map();
  const alliedTargets=new Map();
  const targetLocks=new WeakMap();
  const damageModifiers=new Map();
  let charmedEnemy=null;

  function registerEnemySystem(key,system){
    const id=String(key||'enemy-system');
    systems.set(id,system);
    return()=>{if(systems.get(id)===system)systems.delete(id);};
  }

  function ownerEntry(enemy){
    for(const [key,system] of systems)if(system?.enemies?.includes?.(enemy))return{key,system};
    return null;
  }

  function enemyStableId(enemy){
    if(!enemy)return'';
    if(enemy.wizardStableId)return String(enemy.wizardStableId);
    const owner=ownerEntry(enemy);
    const local=enemy.id??enemy.stableId??enemy.kind??'enemy';
    const id=`${owner?.key||'enemy'}:${String(local).padStart(4,'0')}`;
    enemy.wizardStableId=id;
    return id;
  }

  function registerAlliedTarget(target){
    const id=String(target?.stableId||target?.id||'').trim();
    if(!id||!finite(target?.x)||!finite(target?.z))return false;
    target.stableId=id;
    target.wizardFaction=ARENA_FACTIONS.ALLIED;
    if(target.active===undefined)target.active=true;
    alliedTargets.set(id,target);
    return id;
  }

  function unregisterAlliedTarget(id){return alliedTargets.delete(String(id||''));}

  function targetLive(entity,kind=null){
    if(!entity)return false;
    if(kind==='player')return entity.targetable!==false;
    if(kind==='ally')return alliedTargets.get(String(entity.stableId||entity.id||''))===entity&&entity.active!==false&&(!finite(entity.hp)||Number(entity.hp)>0);
    const owner=ownerEntry(entity);
    return !!owner&&Number(entity.hp)>0;
  }

  function descriptor(kind,entity,id){
    const position=point(entity);
    return{
      x:position.x,z:position.z,
      radius:Math.max(.1,Number(entity?.radius)||1),
      invulnerable:kind==='player'?!!entity?.invulnerable:false,
      targetable:targetLive(entity,kind),
      wizardFaction:kind==='player'?ARENA_FACTIONS.PLAYER:arenaFactionOf(entity),
      __arenaTargetKind:kind,
      __arenaTargetId:String(id),
      __arenaEntity:entity,
    };
  }

  function captureTarget(target){
    if(!target)return null;
    if(target.__arenaTargetKind){
      return{kind:target.__arenaTargetKind,id:String(target.__arenaTargetId),entity:target.__arenaEntity,last:point(target)};
    }
    if(alliedTargets.get(String(target.stableId||target.id||''))===target)return{kind:'ally',id:String(target.stableId||target.id),entity:target,last:point(target)};
    const owner=ownerEntry(target);
    if(owner)return{kind:'enemy',id:enemyStableId(target),entity:target,last:point(target)};
    return{kind:'player',id:'player',entity:target,last:point(target)};
  }

  function resolveCapturedTarget(capture,player=null,{stale=true}={}){
    if(!capture)return null;
    let entity=capture.entity;
    if(capture.kind==='player')entity=player||entity;
    else if(capture.kind==='ally')entity=alliedTargets.get(capture.id)||entity;
    else if(!targetLive(entity,'enemy')){
      entity=null;
      for(const system of systems.values()){
        entity=system?.enemies?.find?.(enemy=>enemyStableId(enemy)===capture.id)||null;
        if(entity)break;
      }
    }
    if(entity&&targetLive(entity,capture.kind)){
      capture.entity=entity;capture.last=point(entity);
      return descriptor(capture.kind,entity,capture.id);
    }
    if(!stale)return null;
    return{
      ...capture.last,radius:Math.max(.1,Number(entity?.radius)||1),invulnerable:true,targetable:false,
      wizardFaction:entity?arenaFactionOf(entity):ARENA_FACTIONS.HOSTILE,
      __arenaTargetKind:capture.kind,__arenaTargetId:capture.id,__arenaEntity:entity,__arenaStaleTarget:true,
    };
  }

  function enemyDescriptors(faction){
    const values=[];
    for(const system of systems.values())for(const enemy of system?.enemies||[]){
      if(Number(enemy?.hp)<=0||arenaFactionOf(enemy)!==faction)continue;
      values.push(descriptor('enemy',enemy,enemyStableId(enemy)));
    }
    return values;
  }

  function candidatesFor(actor,player){
    if(arenaFactionOf(actor)===ARENA_FACTIONS.ALLIED)return enemyDescriptors(ARENA_FACTIONS.HOSTILE);
    const values=enemyDescriptors(ARENA_FACTIONS.ALLIED).filter(value=>value.__arenaEntity!==actor);
    for(const [id,target] of alliedTargets)if(targetLive(target,'ally'))values.push(descriptor('ally',target,id));
    if(player?.targetable!==false)values.push(descriptor('player',player,'player'));
    return values;
  }

  function chooseTarget(actor,player){
    const ax=Number(actor?.x)||0,az=Number(actor?.z)||0;
    const values=candidatesFor(actor,player);
    values.sort((a,b)=>{
      const da=(a.x-ax)**2+(a.z-az)**2,db=(b.x-ax)**2+(b.z-az)**2;
      return da-db||lexical(a.__arenaTargetId,b.__arenaTargetId);
    });
    return values[0]||null;
  }

  function lockTarget(actor,target){
    if(!actor||!target)return false;
    const capture=captureTarget(target);if(!capture)return false;
    targetLocks.set(actor,capture);actor.wizardTargetId=capture.id;
    return capture.id;
  }

  function resolveLockedTarget(actor,player){
    return resolveCapturedTarget(targetLocks.get(actor),player,{stale:true});
  }

  function releaseTarget(actor){
    if(!actor)return false;
    const removed=targetLocks.delete(actor);delete actor.wizardTargetId;return removed;
  }

  function targetForActor(actor,player,{locked=false}={}){
    return locked&&targetLocks.has(actor)?resolveLockedTarget(actor,player):chooseTarget(actor,player);
  }

  function damageTarget(target,amount,knock={x:0,z:0},options={},damagePlayer=null){
    const capture=captureTarget(target),resolved=resolveCapturedTarget(capture,null,{stale:false});
    if(!resolved||resolved.targetable===false)return false;
    if(resolved.__arenaTargetKind==='player')return damagePlayer?.(amount,knock,options)??false;
    if(resolved.__arenaTargetKind==='ally'){
      const ally=resolved.__arenaEntity;
      const before=finite(ally.hp)?Number(ally.hp):null;
      const applied=ally.onDamage?.(Math.max(0,Number(amount)||0),knock,options);
      return applied===undefined?(before!==null&&Number(ally.hp)<before):applied;
    }
    const enemy=resolved.__arenaEntity,owner=ownerEntry(enemy)?.system;
    if(!owner)return false;
    const before=Number(enemy.hp);
    const killed=owner.damageEnemy?.(enemy,amount,knock,{...options,sourceFaction:options.sourceFaction||ARENA_FACTIONS.ALLIED});
    return !!killed||Number(enemy.hp)<before;
  }

  function setEnemyFaction(enemy,faction,meta={}){
    const owner=ownerEntry(enemy)?.system;
    if(!owner||Number(enemy?.hp)<=0)return false;
    owner.setEnemyFaction?.(enemy,faction,meta);
    enemy.wizardFaction=faction===ARENA_FACTIONS.ALLIED?ARENA_FACTIONS.ALLIED:ARENA_FACTIONS.HOSTILE;
    releaseTarget(enemy);
    return true;
  }

  function releaseCharm(enemy=charmedEnemy){
    if(!enemy)return false;
    const restored=setEnemyFaction(enemy,ARENA_FACTIONS.HOSTILE,{reason:'charm-released'});
    if(enemy===charmedEnemy)charmedEnemy=null;
    return restored;
  }

  function charmEnemy(enemy,{sourceId='MENTIS-IMPERIUM'}={}){
    if(!isArenaCharmEligible(enemy))return{accepted:false,reason:'immune',enemy};
    if(charmedEnemy&&charmedEnemy!==enemy)releaseCharm(charmedEnemy);
    if(!setEnemyFaction(enemy,ARENA_FACTIONS.ALLIED,{reason:'charmed',sourceId}))return{accepted:false,reason:'unowned',enemy};
    charmedEnemy=enemy;enemy.wizardCharmSourceId=String(sourceId);
    return{accepted:true,enemy,stableId:enemyStableId(enemy)};
  }

  function registerDamageModifier(modifier){
    const id=String(modifier?.id||'').trim();
    if(!id||typeof modifier?.apply!=='function')return false;
    damageModifiers.set(id,{...modifier,id,priority:Number(modifier.priority)||0});
    return id;
  }
  function unregisterDamageModifier(id){return damageModifiers.delete(String(id||''));}

  function modifyDamage(target,amount,options={}){
    const requested=Math.max(0,Number(amount)||0);
    if(options.__arenaDamageModified)return{damage:requested,requested,applied:[]};
    let damage=requested;
    const applied=[];
    const grouped=new Map();
    const ordered=[...damageModifiers.values()].sort((a,b)=>a.priority-b.priority||lexical(a.id,b.id));
    const context={target,options,element:arenaDamageElement(options),factionService:api};
    for(const modifier of ordered){
      const result=modifier.apply({...context,damage,requested});
      if(result===undefined||result===null||result===false)continue;
      if(finite(result)){damage=Math.max(0,Number(result));applied.push(modifier.id);continue;}
      const multiplier=finite(result.multiplier)?Math.max(0,Number(result.multiplier)):1;
      const flat=finite(result.flat)?Number(result.flat):0;
      if(result.stackKey){
        const key=String(result.stackKey),effective={multiplier,flat,id:modifier.id};
        const previous=grouped.get(key);
        if(!previous||multiplier>previous.multiplier||(multiplier===previous.multiplier&&flat>previous.flat))grouped.set(key,effective);
      }else{
        damage=Math.max(0,damage*multiplier+flat);applied.push(modifier.id);
      }
    }
    for(const key of [...grouped.keys()].sort(lexical)){
      const value=grouped.get(key);damage=Math.max(0,damage*value.multiplier+value.flat);applied.push(value.id);
    }
    return{damage,requested,applied};
  }

  function clearRuntime(){
    for(const enemy of enemyDescriptors(ARENA_FACTIONS.ALLIED).map(value=>value.__arenaEntity))setEnemyFaction(enemy,ARENA_FACTIONS.HOSTILE,{reason:'runtime-clear'});
    alliedTargets.clear();damageModifiers.clear();charmedEnemy=null;
  }

  const api={
    registerEnemySystem,registerAlliedTarget,unregisterAlliedTarget,
    chooseTarget,targetForActor,lockTarget,resolveLockedTarget,releaseTarget,captureTarget,resolveCapturedTarget,
    damageTarget,enemyStableId,ownerEntry,enemyDescriptors,arenaFactionOf,
    charmEnemy,releaseCharm,isCharmEligible:isArenaCharmEligible,
    registerDamageModifier,unregisterDamageModifier,modifyDamage,clearRuntime,
    get alliedTargets(){return[...alliedTargets.values()];},
    get charmedEnemy(){return charmedEnemy;},
  };
  return api;
}
