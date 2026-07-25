import {
  ARCANA_TWEAKS_EVENT,
  clampArcanaDamage,
  readArcanaTweaks,
} from './wizard-arcana-settings.js';

export function scaleWizardArcanaDamage(amount,multiplier=1){
  const base=Math.max(0,Number(amount)||0);
  return base*clampArcanaDamage(multiplier);
}

export function installWizardArcanaDamageScaler({getEnemySystem}={}){
  const initial=readArcanaTweaks();
  const state={system:null,wrapper:null,base:null,damageMultiplier:initial.damageMultiplier};

  function patch(){
    let system=null;
    try{system=getEnemySystem?.();}catch{return;}
    if(!system||typeof system.damageEnemy!=='function')return;
    if(system===state.system&&system.damageEnemy===state.wrapper)return;

    const current=system.damageEnemy;
    if(current?.__wizardArcanaDamageScaler)return;
    const base=current.bind(system);
    const wrapper=function wizardArcanaScaledDamage(enemy,amount,knock,options){
      const scaled=options?.source==='wizardArcana'
        ?scaleWizardArcanaDamage(amount,state.damageMultiplier)
        :amount;
      return base(enemy,scaled,knock,options);
    };
    wrapper.__wizardArcanaDamageScaler=true;
    state.system=system;state.base=current;state.wrapper=wrapper;
    system.damageEnemy=wrapper;
  }

  const onTweaks=event=>{state.damageMultiplier=clampArcanaDamage(event?.detail?.damageMultiplier);};
  if(typeof window!=='undefined')window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);

  return{
    state,
    update:patch,
    dispose(){
      if(typeof window!=='undefined')window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
      if(state.system?.damageEnemy===state.wrapper&&state.base)state.system.damageEnemy=state.base;
      state.system=null;state.wrapper=null;state.base=null;
    },
  };
}
