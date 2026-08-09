function normalizeDamageResult(hit,result){
  const base={...(hit||{}),damage:Math.max(0,Number(hit?.damage)||0)};
  if(result===undefined||result===null)return base;
  if(typeof result==='number')return{...base,damage:Math.max(0,Number(result)||0)};
  if(typeof result!=='object')return base;
  const raw=result.damage??result.remaining??base.damage;
  return{...base,...result,damage:Math.max(0,Number(raw)||0)};
}

export function createPlayerDamageRoute({apply}={}){
  let defenseResolver=null;
  let externalInterceptor=null;
  let active=true;

  const route=hit=>{
    let current=normalizeDamageResult(hit,hit);
    if(current.damage<=0)return current;
    if(typeof defenseResolver==='function'){
      current=normalizeDamageResult(current,defenseResolver(current));
      if(current.damage<=0)return current;
    }
    if(typeof externalInterceptor==='function'){
      current=normalizeDamageResult(current,externalInterceptor(current));
    }
    return current;
  };

  const sync=()=>{
    if(!active)return false;
    apply?.(route);
    return true;
  };

  sync();
  return Object.freeze({
    route,
    setDefenseResolver(resolver){defenseResolver=typeof resolver==='function'?resolver:null;return sync();},
    setExternalInterceptor(interceptor){externalInterceptor=typeof interceptor==='function'?interceptor:null;return sync();},
    clearDefenseResolver(){defenseResolver=null;return sync();},
    destroy(){active=false;defenseResolver=null;externalInterceptor=null;},
  });
}
