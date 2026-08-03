import { evaluateStanceSpend, STANCE_SPEND_SOURCES } from './stance-spend-policy.js';
import {
  isFrontalShieldHit,
  resolveStanceDefenseProfile,
  shieldBlockCost,
  usesCustomDefense,
} from './stance-defense-profiles.js';
import { installStanceDefenseDamagePipeline } from './stance-defense-damage-pipeline.js';
import { installStanceGate5Visuals } from './stance-gate5-visuals.js';

const EPSILON=.001;
export function createStanceGate5Runtime({arenaHandle,windowRef=globalThis.window,documentRef=globalThis.document,basePlayerSpeed=8.5}={}){
  const handle=arenaHandle,PC=handle?.PC,arena=handle?.arena,deck=handle?.deck,enemySystem=handle?.enemySystem;
  if(!PC?.combatState||!arena?.dodge||!enemySystem)throw new Error('[stance-gate5] missing Combat Arena handle');
  if(typeof enemySystem.registerPlayerDamageInterceptor!=='function')throw new Error('[stance-gate5] missing composable player-damage interceptor API');
  const state={
    stanceId:'',profileId:null,guardRaised:false,guardCounterRemaining:0,
    parryRemaining:0,parryRecoveryRemaining:0,parrySuccessRemaining:0,
    lastOutcome:'ready',lastBlockCost:0,lastOverdrawAmount:0,
  };
  const original={updateCombat:PC.updateCombat,startCombatAttack:PC.startCombatAttack};
  const visuals=installStanceGate5Visuals({PC,windowRef,documentRef});
  let lastActorPosition=readActorPosition();
  let lastSnapshot=null;
  let destroyed=false;
  function readActorPosition(){
    const position=handle.actorPos;if(!position)return null;
    const x=Number(position.x),z=Number(position.y??position.z);
    return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:null;
  }
  function writeActorPosition(position){
    const target=handle.actorPos;if(!target||!position)return;
    target.x=position.x;
    if(Number.isFinite(Number(target.y)))target.y=position.z;else target.z=position.z;
  }
  function currentProfile(){return resolveStanceDefenseProfile(arena.stance);}
  function shieldOwned(){
    if(String(arena.stance?.id||'')==='S01')return true;
    try{return Array.isArray(deck?.pool)&&deck.pool.some(card=>card?.id==='S01');}
    catch{return false;}
  }
  function playerForward(){
    const root=PC.combatLayer?.parent?.parent?.parent||PC.combatLayer?.parent?.parent||null;
    const q=root?.quaternion;
    if(!q)return{x:0,z:1};
    return{x:2*(q.x*q.z+q.w*q.y),z:1-2*(q.x*q.x+q.y*q.y)};
  }
  function resetTransient(reason='stance-change'){
    state.guardRaised=false;state.guardCounterRemaining=0;
    state.parryRemaining=0;state.parryRecoveryRemaining=0;state.parrySuccessRemaining=0;
    state.lastOutcome=reason;
  }
  function syncStance(){
    const next=String(arena.stance?.id||'');
    if(next===state.stanceId)return;
    state.stanceId=next;state.profileId=currentProfile()?.id||null;resetTransient('stance-change');
  }
  function canStartDefense(){
    return arena.deadT<0&&!handle.roomTransition?.active&&!PC.combatState.attack;
  }
  function defenseDown(source='input'){
    syncStance();
    const profile=currentProfile();
    if(!usesCustomDefense(profile))return{handled:false,delegated:true,source};
    if(!canStartDefense())return{handled:true,accepted:false,reason:'busy',source};
    if(profile.kind==='parry'){
      if(state.parryRemaining>0||state.parryRecoveryRemaining>0)return{handled:true,accepted:false,reason:'parry-recovery',source};
      state.parryRemaining=profile.parryWindow;
      state.parrySuccessRemaining=0;
      state.lastOutcome='parry-open';
      visuals.pulse('parry');publish();
      return{handled:true,accepted:true,kind:'parry',source};
    }
    if(profile.kind==='shield'){
      state.guardRaised=!state.guardRaised;
      if(!state.guardRaised)state.guardCounterRemaining=0;
      state.lastOutcome=state.guardRaised?'guard-raised':'guard-lowered';
      publish();
      return{handled:true,accepted:true,kind:'shield-toggle',guardRaised:state.guardRaised,source};
    }
    return{handled:false,delegated:true,source};
  }
  function defenseUp(source='input'){
    syncStance();
    return{handled:usesCustomDefense(currentProfile()),source};
  }
  function triggerCatchForDefense(decision,before){
    if(!decision?.opensCatch)return;
    const gate4=windowRef?.__stance2Gate4Runtime;
    if(!gate4?.engine||gate4.engine.snapshot().phase!=='idle')return;
    gate4.engine.trigger({
      before,after:Number(arena.stamina.v)||0,source:STANCE_SPEND_SOURCES.defense,
      attackKey:'stance-defense',weaponId:String(PC.combatState.weapon||''),stanceId:String(arena.stance?.id||''),
      requestedCost:decision.requestedCost,actualSpent:decision.actualSpent,
      overdrawAmount:decision.overdrawAmount,overdraw:decision.overdraw,
    });
  }
  function spendShieldBlock(cost){
    const before=Math.max(0,Number(arena.stamina.v)||0);
    const phase=windowRef?.__stance2Gate4Runtime?.engine?.snapshot?.().phase||'idle';
    const decision=evaluateStanceSpend({available:before,cost,source:STANCE_SPEND_SOURCES.defense,catchPhase:phase,epsilon:EPSILON});
    if(!decision.allowed)return decision;
    arena.stamina.v=Math.max(0,before-decision.actualSpent);
    state.lastBlockCost=decision.actualSpent;
    state.lastOverdrawAmount=decision.overdrawAmount;
    triggerCatchForDefense(decision,before);
    return decision;
  }
  function interceptDamage(hit={}){
    syncStance();
    const profile=currentProfile();
    const damage=Math.max(0,Number(hit.damage)||0);
    if(damage<=0)return{damage:0};
    if(profile?.kind==='parry'&&state.parryRemaining>0){
      state.parryRemaining=0;
      state.parryRecoveryRemaining=.14;
      state.parrySuccessRemaining=profile.successFlash;
      state.lastOutcome='parried';
      visuals.pulse('parry');publish();
      return{damage:0,outcome:'deflected'};
    }
    if(profile?.kind==='shield'&&state.guardRaised&&!PC.combatState.attack){
      const frontal=isFrontalShieldHit({incomingDir:hit.dir,forward:playerForward(),arcDegrees:profile.blockArcDegrees});
      if(!frontal){state.lastOutcome='guard-bypassed';publish();return{damage};}
      const cost=shieldBlockCost(damage,profile);
      const decision=spendShieldBlock(cost);
      if(!decision.allowed){
        state.guardRaised=false;state.guardCounterRemaining=0;state.lastOutcome='guard-broken';
        visuals.pulse('guard-break');publish();return{damage,outcome:'guard-broken'};
      }
      state.guardCounterRemaining=profile.guardCounterWindow;
      state.lastOutcome=decision.overdraw?'blocked-overdraw':'blocked';
      visuals.pulse('block');publish();
      return{damage:0,outcome:'blocked',staminaSpent:decision.actualSpent,overdrawAmount:decision.overdrawAmount};
    }
    return{damage};
  }
  const damagePipeline=installStanceDefenseDamagePipeline({system:enemySystem,interceptor:interceptDamage,priority:-100});
  function applyGuardMovement(dt){
    const profile=currentProfile();
    if(profile?.kind!=='shield'||!state.guardRaised||PC.combatState.attack||arena.dodge.t>=0)return;
    const current=readActorPosition(),previous=lastActorPosition,input=handle.arenaMoveInput?.()||{};
    const x=Number(input.x)||0,z=Number(input.z)||0,magnitude=Math.min(1,Math.hypot(x,z));
    if(!current||!previous||magnitude<=EPSILON)return;
    const nx=x/magnitude,nz=z/magnitude;
    const dx=current.x-previous.x,dz=current.z-previous.z;
    const along=Math.max(0,dx*nx+dz*nz);
    const intended=Math.max(0,Number(basePlayerSpeed)||0)*Math.max(0,dt)*magnitude;
    const reduction=Math.min(along,intended*(1-profile.guardMoveMultiplier));
    if(reduction>0){current.x-=nx*reduction;current.z-=nz*reduction;writeActorPosition(current);}
  }
  function updateTimers(dt){
    const amount=Math.max(0,Number(dt)||0);
    state.guardCounterRemaining=Math.max(0,state.guardCounterRemaining-amount);
    state.parrySuccessRemaining=Math.max(0,state.parrySuccessRemaining-amount);
    if(state.parryRemaining>0){
      state.parryRemaining=Math.max(0,state.parryRemaining-amount);
      if(state.parryRemaining<=0&&state.lastOutcome==='parry-open'){
        const profile=currentProfile();state.parryRecoveryRemaining=profile?.missRecovery||0;state.lastOutcome='parry-missed';
      }
    }else state.parryRecoveryRemaining=Math.max(0,state.parryRecoveryRemaining-amount);
  }
  function publish(dt=0){
    const profile=currentProfile();
    lastSnapshot=Object.freeze({
      active:!!profile,stanceId:String(arena.stance?.id||''),profileId:profile?.id||null,
      label:profile?.label||'EXISTING DODGE',kind:profile?.kind||'existing-dodge',summary:profile?.summary||'Uses the current Combat Arena dodge.',
      customDefense:usesCustomDefense(profile),shieldOwned:shieldOwned(),guardRaised:state.guardRaised,
      guardCounterRemaining:state.guardCounterRemaining,parryRemaining:state.parryRemaining,
      parryRecoveryRemaining:state.parryRecoveryRemaining,parrySuccessRemaining:state.parrySuccessRemaining,
      lastOutcome:state.lastOutcome,lastBlockCost:state.lastBlockCost,lastOverdrawAmount:state.lastOverdrawAmount,
      attacking:!!PC.combatState.attack,
    });
    PC.combatState.stance2Gate5=lastSnapshot;visuals.update(lastSnapshot,dt);return lastSnapshot;
  }
  PC.startCombatAttack=function(...args){
    syncStance();
    const profile=currentProfile();
    const guardCounter=profile?.kind==='shield'&&state.guardCounterRemaining>0&&Number(arena.chain?.activeSlot)===2;
    const result=original.startCombatAttack.apply(this,args);
    if(guardCounter&&PC.combatState.attack){
      state.guardCounterRemaining=0;state.lastOutcome='guard-counter';
      arena.charge.active=true;arena.charge.queued=false;arena.charge.buttonHeld=false;
      arena.charge.hold=Math.max(Number(arena.charge.hold)||0,99);arena.charge.tier=1;arena.charge.forceTier=1;
      if(arena.swing)arena.swing.guardCounter=true;
    }
    publish();return result;
  };
  PC.updateCombat=function(...args){
    const dt=Math.max(0,Number(args[0])||0);
    syncStance();updateTimers(dt);applyGuardMovement(dt);
    const result=original.updateCombat.apply(this,args);
    lastActorPosition=readActorPosition();publish(dt);return result;
  };
  syncStance();publish();
  const api={
    installed:true,defenseDown,defenseUp,interceptDamage,snapshot:()=>lastSnapshot,
    setGuardRaised(value){if(currentProfile()?.kind!=='shield')return false;state.guardRaised=!!value;publish();return true;},
    destroy(){
      if(destroyed)return;
      destroyed=true;
      PC.updateCombat=original.updateCombat;PC.startCombatAttack=original.startCombatAttack;
      damagePipeline.destroy?.();visuals.destroy();delete PC.combatState.stance2Gate5;
      if(windowRef?.__stance2Gate5Runtime===api)delete windowRef.__stance2Gate5Runtime;
    },
  };
  return api;
}
export function installStanceGate5Runtime({windowRef=globalThis.window,maxAttempts=240,pollMs=50}={}){
  if(!windowRef)return{installed:false,reason:'missing-window'};
  if(windowRef.__stance2Gate5Runtime?.installed)return windowRef.__stance2Gate5Runtime;
  let attempts=0;
  const attach=()=>{
    const handle=windowRef.__arena;
    if(handle?.PC&&handle?.arena&&handle?.enemySystem&&windowRef.__stance2Gate4Runtime?.installed){
      const runtime=createStanceGate5Runtime({arenaHandle:handle,windowRef,documentRef:windowRef.document});
      windowRef.__stance2Gate5Runtime=runtime;return runtime;
    }
    if(attempts++<maxAttempts)windowRef.setTimeout?.(attach,pollMs);return null;
  };
  attach();return{installed:false,pending:true};
}
