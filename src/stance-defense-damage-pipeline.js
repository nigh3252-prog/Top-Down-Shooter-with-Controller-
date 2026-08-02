import { setArenaEnemySource } from './arena-enemy-registry.js';

function normalizeDamageResult(result,fallback){
  if(result===false)return 0;
  if(Number.isFinite(Number(result)))return Math.max(0,Number(result));
  if(result&&Number.isFinite(Number(result.damage)))return Math.max(0,Number(result.damage));
  return fallback;
}

export function installStanceDefenseDamagePipeline({system,interceptor,priority=-100}={}){
  if(!system||typeof system.setPlayerDamageInterceptor!=='function'){
    return{installed:false,reason:'missing-damage-interceptor-api'};
  }
  const originalSet=system.setPlayerDamageInterceptor.bind(system);
  let legacyInterceptor=null;
  let stanceInterceptor=typeof interceptor==='function'?interceptor:null;
  let active=true;

  function composite(hit={}){
    let damage=Math.max(0,Number(hit.damage)||0);
    const ordered=priority<=0
      ?[stanceInterceptor,legacyInterceptor]
      :[legacyInterceptor,stanceInterceptor];
    for(const layer of ordered){
      if(typeof layer!=='function'||damage<=0)continue;
      const result=layer({...hit,damage});
      damage=normalizeDamageResult(result,damage);
    }
    return{damage};
  }

  const proxy=new Proxy(system,{
    get(target,property){
      if(property==='originalSystem'||property==='flareSystem'||property==='hadesSystem')return undefined;
      if(property==='setPlayerDamageInterceptor'){
        return next=>{
          legacyInterceptor=typeof next==='function'?next:null;
          originalSet(composite);
        };
      }
      if(property==='registerPlayerDamageInterceptor'){
        return(id,next)=>{
          stanceInterceptor=typeof next==='function'?next:null;
          originalSet(composite);
          return()=>{if(active)stanceInterceptor=null;};
        };
      }
      const value=Reflect.get(target,property,target);
      return typeof value==='function'?value.bind(target):value;
    },
  });

  // Publishing a different system identity makes the existing Arcana runtime
  // re-register its interceptor through the proxy on its next combat update.
  setArenaEnemySource(proxy);
  originalSet(composite);

  return{
    installed:true,
    proxy,
    setInterceptor(next){stanceInterceptor=typeof next==='function'?next:null;originalSet(composite);},
    destroy(){
      active=false;
      stanceInterceptor=null;
      originalSet(legacyInterceptor);
    },
  };
}
