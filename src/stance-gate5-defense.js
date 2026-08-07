import { evaluateStanceSpend, STANCE_SPEND_SOURCES } from './stance-spend-policy.js';
import { isFrontalShieldHit, resolveStanceDefenseProfile, shieldBlockCost, usesCustomDefense } from './stance-defense-profiles.js';
import { installStanceGate5Visuals } from './stance-gate5-visuals.js';

const EPSILON=.001;

function installDebugOverlay(documentRef,windowRef){
  const enabled=new URLSearchParams(windowRef?.location?.search||'').get('defenseDebug')==='1';
  if(!enabled||!documentRef)return()=>{};
  const root=documentRef.createElement('pre');
  root.id='arenaDefenseDebug';
  root.style.cssText='position:fixed;right:8px;bottom:8px;z-index:100;max-width:55vw;margin:0;padding:6px 8px;border:1px solid #d4a25f;border-radius:5px;background:rgba(5,12,13,.9);color:#ffe0a0;font:9px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre-wrap';
  documentRef.body.appendChild(root);
  return snapshot=>{root.textContent=[
    `DEFENSE ${snapshot.kind} · ${snapshot.guardRaised?'UP':'DOWN'}${snapshot.guardBroken?' · EMPTY':''}`,
    `STANCE ${snapshot.stanceId||'-'} · ${snapshot.lastOutcome}`,
    `PAD ${snapshot.lastInput||'-'} · HIT ${snapshot.lastHitDirection||'-'}`,
    `RAW DOWN ${snapshot.rawButtons||'-'} · EDGE ${snapshot.rawPressed||'-'}`,
    `MAP ${snapshot.gamepadMapping||'-'} · ${snapshot.gamepadId||'-'}`,
    `STAMINA ${snapshot.stamina.toFixed(1)}`,
  ].join('\n');};
}

export function createStanceGate5Runtime({arenaHandle,windowRef=globalThis.window,documentRef=globalThis.document}={}){
  const handle=arenaHandle,PC=handle?.PC,arena=handle?.arena,deck=handle?.deck,enemySystem=handle?.enemySystem;
  if(!PC?.combatState||!arena?.dodge||!arena?.stamina||!enemySystem)throw new Error('[arena-defense] missing Combat Arena handle');
  if(typeof enemySystem.setPlayerDefenseResolver!=='function')throw new Error('[arena-defense] enemy router lacks setPlayerDefenseResolver');

  const state=arena.defense={
    stanceId:'',profileId:null,kind:'existing-dodge',guardRaised:false,guardBroken:false,
    guardCounterRemaining:0,parryRemaining:0,parryRecoveryRemaining:0,parrySuccessRemaining:0,
    lastOutcome:'ready',lastBlockCost:0,lastDodgeCost:0,lastOverdrawAmount:0,lastInput:'',lastHitDirection:'',
    rawButtons:'',rawPressed:'',gamepadId:'',gamepadMapping:'',aliasConflict:false,
  };
  const originalStartCombatAttack=PC.startCombatAttack;
  const visuals=installStanceGate5Visuals({PC,windowRef,documentRef});
  const renderDebug=installDebugOverlay(documentRef,windowRef);
  let lastSnapshot=null;
  let destroyed=false;

  const currentProfile=()=>resolveStanceDefenseProfile(arena.stance);
  function shieldOwned(){
    if(currentProfile()?.kind==='shield')return true;
    try{return Array.isArray(deck?.pool)&&deck.pool.some(card=>card?.id==='S01');}
    catch{return false;}
  }
  function authoritativeForward(){
    const value=handle.getPlayerForward?.()||handle.playerForward?.();
    const x=Number(value?.x??value?.forwardX),z=Number(value?.z??value?.forwardZ),length=Math.hypot(x,z);
    return length>EPSILON?{x:x/length,z:z/length}:{x:0,z:1};
  }
  function resolveParryAttacker(hit={}){
    if(hit?.sourceEnemy&&Number(hit.sourceEnemy.hp)>0)return hit.sourceEnemy;
    const sourceId=String(hit?.sourceEnemyId||'');
    if(!sourceId)return null;
    return (enemySystem.enemies||[]).find(enemy=>
      Number(enemy?.hp)>0&&(String(enemy?.wizardStableId||'')===sourceId||String(enemy?.id||'')===sourceId)
    )||null;
  }
  function addParryImpactReaction(enemy,dir){
    if(!enemy)return;
    const dx=Number(dir?.x)||0,dz=Number(dir?.z)||0,length=Math.hypot(dx,dz)||1;
    enemy.knockX=(Number(enemy.knockX)||0)-dx/length*3.4;
    enemy.knockZ=(Number(enemy.knockZ)||0)-dz/length*3.4;
    if('flash' in enemy)enemy.flash=Math.max(Number(enemy.flash)||0,.34);
    if('squash' in enemy)enemy.squash=Math.max(Number(enemy.squash)||0,.72);
    if('squashT' in enemy)enemy.squashT=Math.max(Number(enemy.squashT)||0,.28);
    if('squashMax' in enemy)enemy.squashMax=Math.max(Number(enemy.squashMax)||0,.28);
  }
  function resetTransient(reason='stance-change'){
    state.guardRaised=false;state.guardBroken=false;state.guardCounterRemaining=0;
    state.parryRemaining=0;state.parryRecoveryRemaining=0;state.parrySuccessRemaining=0;
    state.lastDodgeCost=0;state.lastOutcome=reason;
  }
  function syncStance(){
    const profile=currentProfile();
    const nextStance=String(arena.stance?.id||arena.stance?.name||'');
    const nextProfile=profile?.id||null;
    if(nextStance===state.stanceId&&nextProfile===state.profileId)return profile;
    state.stanceId=nextStance;state.profileId=nextProfile;state.kind=profile?.kind||'existing-dodge';
    resetTransient('stance-change');publish();return profile;
  }
  function canStartDefense(){return arena.deadT<0&&!handle.roomTransition?.active&&!PC.combatState.attack;}
  function consumesDefenseInput(){return usesCustomDefense(currentProfile());}
  function defenseDown(source='input'){
    state.lastInput=source;
    const profile=syncStance();
    if(!usesCustomDefense(profile))return{handled:false,delegated:true,source};
    if(!canStartDefense())return{handled:true,accepted:false,reason:'busy',source};
    if(profile.kind==='parry'){
      if(state.parryRemaining>0||state.parryRecoveryRemaining>0)return{handled:true,accepted:false,reason:'parry-recovery',source};
      state.parryRemaining=profile.parryWindow;state.parrySuccessRemaining=0;state.lastOutcome='parry-open';
      visuals.pulse('parry-open');publish();return{handled:true,accepted:true,kind:'parry',source};
    }
    if(profile.kind==='shield'){
      state.guardRaised=!state.guardRaised;state.guardBroken=false;
      if(!state.guardRaised)state.guardCounterRemaining=0;
      state.lastOutcome=state.guardRaised?'guard-raised':'guard-lowered';
      publish();return{handled:true,accepted:true,kind:'shield-toggle',guardRaised:state.guardRaised,source};
    }
    return{handled:false,delegated:true,source};
  }
  function defenseUp(source='input'){state.lastInput=source;return{handled:consumesDefenseInput(),source};}

  function triggerCatchForDefense(decision,before,attackKey='stance-defense'){
    if(!decision?.opensCatch)return;
    const engine=windowRef?.__stance2Gate4Runtime?.engine;
    if(!engine||engine.snapshot().phase!=='idle')return;
    engine.trigger({
      before,after:Number(arena.stamina.v)||0,source:STANCE_SPEND_SOURCES.defense,
      attackKey,weaponId:String(PC.combatState.weapon||''),stanceId:String(arena.stance?.id||''),
      requestedCost:decision.requestedCost,actualSpent:decision.actualSpent,
      overdrawAmount:decision.overdrawAmount,overdraw:decision.overdraw,
    });
  }
  function spendStanceDefense(cost,attackKey){
    const before=Math.max(0,Number(arena.stamina.v)||0);
    const phase=windowRef?.__stance2Gate4Runtime?.engine?.snapshot?.().phase||'idle';
    const decision=evaluateStanceSpend({available:before,cost,source:STANCE_SPEND_SOURCES.defense,catchPhase:phase,epsilon:EPSILON});
    if(decision.allowed){
      arena.stamina.v=Math.max(0,before-decision.actualSpent);
      triggerCatchForDefense(decision,before,attackKey);
    }
    return{before,decision};
  }
  function spendShieldBlock(cost){
    const {decision}=spendStanceDefense(cost,'hammerfall-block');
    if(!decision.allowed)return decision;
    state.lastBlockCost=decision.actualSpent;state.lastOverdrawAmount=decision.overdrawAmount;state.guardBroken=false;
    return decision;
  }
  function spendDodge(){
    const profile=syncStance();
    const cost=Math.max(0,Number(profile?.dodgeCost)||0);
    if(profile?.kind!=='existing-dodge'||cost<=EPSILON){
      return Object.freeze({
        allowed:true,source:STANCE_SPEND_SOURCES.defense,available:Math.max(0,Number(arena.stamina.v)||0),
        requestedCost:0,actualSpent:0,overdrawAmount:0,overdraw:false,opensCatch:false,reason:'free-fallback-dodge',
      });
    }
    const {decision}=spendStanceDefense(cost,'rat-step-dodge');
    state.lastDodgeCost=decision.actualSpent;
    state.lastOverdrawAmount=decision.overdrawAmount;
    state.lastOutcome=decision.allowed?(decision.overdraw?'dodge-overdraw':'dodge-spent'):'dodge-empty';
    publish();return decision;
  }
  function resolvePlayerHit(hit={}){
    const profile=syncStance();
    const damage=Math.max(0,Number(hit.damage)||0);
    if(damage<=0)return{...hit,damage:0};
    const dir=hit.dir||{};state.lastHitDirection=`${Number(dir.x)||0},${Number(dir.z)||0}`;
    if(profile?.kind==='parry'&&state.parryRemaining>0){
      state.parryRemaining=0;state.parryRecoveryRemaining=.14;state.parrySuccessRemaining=profile.successFlash;
      const attacker=resolveParryAttacker(hit);
      const staggerDuration=Math.max(0,Number(profile.parryStaggerDuration)||0);
      const staggered=!!attacker&&staggerDuration>0&&enemySystem.stunEnemy?.(attacker,staggerDuration,{kind:'parryStagger'})!==false;
      if(staggered)addParryImpactReaction(attacker,hit.dir);
      state.lastOutcome=staggered?'parried-stagger':'parried';
      visuals.pulse('parry-success');publish();
      return{...hit,damage:0,outcome:'deflected',staggered,staggerDuration:staggered?staggerDuration:0};
    }
    if(profile?.kind==='shield'&&state.guardRaised&&!PC.combatState.attack){
      const frontal=isFrontalShieldHit({incomingDir:hit.dir,forward:authoritativeForward(),arcDegrees:profile.blockArcDegrees});
      if(!frontal){state.lastOutcome='guard-bypassed';publish();return{...hit,damage};}
      const decision=spendShieldBlock(shieldBlockCost(damage,profile));
      if(!decision.allowed){
        state.guardBroken=true;state.guardCounterRemaining=0;state.lastOutcome='guard-broken';
        visuals.pulse('guard-break');publish();return{...hit,damage,outcome:'guard-broken'};
      }
      state.guardCounterRemaining=profile.guardCounterWindow;
      state.lastOutcome=decision.overdraw?'blocked-overdraw':'blocked';
      visuals.pulse('block');publish();
      return{...hit,damage:0,outcome:'blocked',staminaSpent:decision.actualSpent,overdrawAmount:decision.overdrawAmount};
    }
    return{...hit,damage};
  }
  function update(dt=0){
    const profile=syncStance();
    const amount=Math.max(0,Number(dt)||0);
    state.kind=profile?.kind||'existing-dodge';
    if(state.guardBroken&&(Number(arena.stamina.v)||0)>EPSILON){state.guardBroken=false;if(state.guardRaised)state.lastOutcome='guard-recovered';}
    state.guardCounterRemaining=Math.max(0,state.guardCounterRemaining-amount);
    state.parrySuccessRemaining=Math.max(0,state.parrySuccessRemaining-amount);
    if(state.parryRemaining>0){
      state.parryRemaining=Math.max(0,state.parryRemaining-amount);
      if(state.parryRemaining<=0&&state.lastOutcome==='parry-open'){
        state.parryRecoveryRemaining=profile?.missRecovery||0;state.lastOutcome='parry-missed';
      }
    }else state.parryRecoveryRemaining=Math.max(0,state.parryRecoveryRemaining-amount);
    publish(amount);return lastSnapshot;
  }
  function publish(dt=0){
    const profile=currentProfile();
    lastSnapshot=Object.freeze({
      ...state,active:!!profile,kind:profile?.kind||'existing-dodge',label:profile?.label||'EXISTING DODGE',
      customDefense:usesCustomDefense(profile),shieldOwned:shieldOwned(),attacking:!!PC.combatState.attack,
      stamina:Math.max(0,Number(arena.stamina.v)||0),
    });
    PC.combatState.stance2Gate5=lastSnapshot;visuals.update(lastSnapshot,dt);renderDebug(lastSnapshot);return lastSnapshot;
  }

  PC.startCombatAttack=function(...args){
    const profile=syncStance();
    const guardCounter=profile?.kind==='shield'&&state.guardCounterRemaining>0&&Number(arena.chain?.activeSlot)===2;
    const result=originalStartCombatAttack.apply(this,args);
    if(guardCounter&&PC.combatState.attack){
      state.guardCounterRemaining=0;state.lastOutcome='guard-counter';
      arena.charge.active=true;arena.charge.queued=false;arena.charge.buttonHeld=false;
      arena.charge.hold=Math.max(Number(arena.charge.hold)||0,99);arena.charge.tier=1;arena.charge.forceTier=1;
      if(arena.swing)arena.swing.guardCounter=true;
    }
    publish();return result;
  };

  enemySystem.setPlayerDefenseResolver(resolvePlayerHit);
  syncStance();publish();
  const api={
    installed:true,state,defenseDown,defenseUp,spendDodge,resolvePlayerHit,update,syncStance,consumesDefenseInput,snapshot:()=>lastSnapshot,
    recordGamepad(input,actions={}){
      const down=['cross','square','l2','r2'].filter(name=>input?.current?.[name]);
      const edges=['cross','square','l2','r2'].filter(name=>input?.pressed?.[name]);
      state.rawButtons=(input?.rawDown||[]).join(',');
      state.rawPressed=(input?.rawPressed||[]).join(',');
      state.gamepadId=String(input?.id||'');
      state.gamepadMapping=String(input?.mapping||'');
      state.aliasConflict=actions?.aliasConflict===true;
      if(edges.length||input?.rawPressed?.length){
        state.lastInput=`edge:${edges.join('+')||'-'} raw:${state.rawPressed||'-'}${state.aliasConflict?' ALIAS':''}`;
      }else if(down.length)state.lastInput=`held:${down.join('+')}`;
      publish();
    },
    setGuardRaised(value){if(currentProfile()?.kind!=='shield')return false;state.guardRaised=!!value;state.guardBroken=false;publish();return true;},
    reset(reason='manual'){resetTransient(reason);publish();},
    destroy(){
      if(destroyed)return;destroyed=true;
      PC.startCombatAttack=originalStartCombatAttack;
      enemySystem.setPlayerDefenseResolver(null);visuals.destroy();delete PC.combatState.stance2Gate5;
      if(arena.defense===state)delete arena.defense;
    },
  };
  return api;
}

export function installStanceGate5Runtime({windowRef=globalThis.window,maxAttempts=240,pollMs=50}={}){
  if(!windowRef)return{installed:false,reason:'missing-window'};
  if(windowRef.__arenaDefenseController?.installed)return windowRef.__arenaDefenseController;
  let attempts=0;
  const attach=()=>{
    const handle=windowRef.__arena;
    if(handle?.PC&&handle?.arena&&handle?.enemySystem){
      const runtime=createStanceGate5Runtime({arenaHandle:handle,windowRef,documentRef:windowRef.document});
      windowRef.__arenaDefenseController=runtime;return runtime;
    }
    if(attempts++<maxAttempts)windowRef.setTimeout?.(attach,pollMs);return null;
  };
  attach();return{installed:false,pending:true};
}
