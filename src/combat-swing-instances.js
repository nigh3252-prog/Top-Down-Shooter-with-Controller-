const TRANSIENT_ATTACK_KEYS = Object.freeze([
  '__bloodSlashBoosted',
  '__bloodSlashSpent',
  '__bingBongPrimaries',
  '__combatSwingId',
]);

export function clearTransientAttackState(attack){
  if(!attack || typeof attack!=='object') return attack;
  for(const key of TRANSIENT_ATTACK_KEYS) delete attack[key];
  return attack;
}

export function createCombatSwingInstance(authoredAttack,{swingId=0,boosted=false,spent=false}={}){
  if(!authoredAttack || typeof authoredAttack!=='object') return null;
  const swing={...authoredAttack};
  clearTransientAttackState(swing);
  swing.__combatSwingId=Math.max(0,Number(swingId)||0);
  if(boosted) swing.__bloodSlashBoosted=true;
  if(spent) swing.__bloodSlashSpent=true;
  return swing;
}

export function installCombatSwingInstances({PC,hooks,cardEffects}={}){
  if(!PC?.combatState || !hooks || !cardEffects?.state){
    throw new Error('[combat-swing-instances] PC, hooks, and cardEffects are required.');
  }

  const effectState=cardEffects.state;
  const state={
    serial:0,
    currentSwingId:0,
    currentAttack:null,
    boostedSwingId:0,
    spentSwingId:0,
  };

  for(const attack of Object.values(PC.ATTACKS||{})) clearTransientAttackState(attack);

  const previousStart=hooks.onAttackStart;
  const previousComplete=hooks.onAttackComplete;

  hooks.onAttackStart=function swingInstanceAttackStart(info={}){
    const authoredAttack=PC.combatState.attack;
    // Remove contamination left by builds that wrote temporary flags directly to
    // the authored ATTACKS entry before the per-swing instance system existed.
    clearTransientAttackState(authoredAttack);

    const out=previousStart?.(info);
    if(!authoredAttack) return out;

    const boosted=info.group==='horizontal'&&(
      effectState.boostedAttack===authoredAttack||authoredAttack.__bloodSlashBoosted===true
    );
    const spent=authoredAttack.__bloodSlashSpent===true;
    const swingId=++state.serial;
    const swing=createCombatSwingInstance(authoredAttack,{swingId,boosted,spent});

    // The combat core reads combatState.attack after this hook returns, so replacing
    // the shared authored definition here gives the whole swing its own runtime object.
    PC.combatState.attack=swing;
    effectState.activeAttack=swing;
    effectState.boostedAttack=boosted?swing:null;

    state.currentSwingId=swingId;
    state.currentAttack=swing;
    state.boostedSwingId=boosted?swingId:0;
    state.spentSwingId=spent?swingId:0;

    clearTransientAttackState(authoredAttack);
    return out;
  };

  hooks.onAttackComplete=function swingInstanceAttackComplete(...args){
    clearTransientAttackState(state.currentAttack);
    state.currentSwingId=0;
    state.currentAttack=null;
    state.boostedSwingId=0;
    state.spentSwingId=0;
    return previousComplete?.(...args);
  };

  function isCurrentBoosted(){
    const attack=PC.combatState.attack;
    return !!attack&&attack===state.currentAttack&&
      attack.__combatSwingId===state.boostedSwingId&&
      PC.combatState.attackGroup==='horizontal';
  }

  function update(){
    const attack=PC.combatState.attack;
    const ownsCurrent=!!attack&&attack===state.currentAttack&&attack.__combatSwingId===state.currentSwingId;

    if(!ownsCurrent){
      clearTransientAttackState(state.currentAttack);
      if(effectState.activeAttack===state.currentAttack) effectState.activeAttack=null;
      if(effectState.boostedAttack===state.currentAttack) effectState.boostedAttack=null;
      state.currentSwingId=0;
      state.currentAttack=null;
      state.boostedSwingId=0;
      state.spentSwingId=0;
      // Synthetic ability attacks never pass through the normal attack-start hook.
      // They also must never inherit Blood Slash or Bing Bong runtime fields.
      if(attack) clearTransientAttackState(attack);
      return;
    }

    if(!isCurrentBoosted()){
      delete attack.__bloodSlashBoosted;
      if(effectState.boostedAttack===attack) effectState.boostedAttack=null;
    }
  }

  return {state,update,isCurrentBoosted};
}
