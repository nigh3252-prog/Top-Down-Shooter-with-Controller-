const STANCE_DEFENSE_INTERCEPTOR_ID='stance-gate5-defense';

export function installStanceDefenseDamagePipeline({
  system,
  interceptor,
  priority=-100,
  id=STANCE_DEFENSE_INTERCEPTOR_ID,
}={}){
  if(!system||typeof system.registerPlayerDamageInterceptor!=='function'){
    return{installed:false,reason:'missing-composable-damage-interceptor-api'};
  }
  let active=true;
  let release=null;

  function setInterceptor(next){
    if(!active)return false;
    release?.();
    release=null;
    if(typeof next!=='function')return false;
    const unregister=system.registerPlayerDamageInterceptor(id,next,priority);
    release=typeof unregister==='function'
      ?unregister
      :()=>system.unregisterPlayerDamageInterceptor?.(id);
    return true;
  }

  if(!setInterceptor(interceptor))return{installed:false,reason:'missing-stance-interceptor'};
  return{
    installed:true,
    system,
    setInterceptor,
    destroy(){
      if(!active)return;
      active=false;
      release?.();
      release=null;
    },
  };
}
