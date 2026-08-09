function normalizeDamageResult(result,fallback){
  if(result===false)return 0;
  if(Number.isFinite(Number(result)))return Math.max(0,Number(result));
  if(result&&Number.isFinite(Number(result.damage)))return Math.max(0,Number(result.damage));
  return fallback;
}

export function createPlayerDamageInterceptorStack({apply}={}){
  if(typeof apply!=='function')throw new TypeError('[player-damage-interceptors] apply must be a function');
  let legacyInterceptor=null;
  let nextOrder=0;
  const registered=new Map();

  function composite(hit={}){
    let damage=Math.max(0,Number(hit.damage)||0);
    const layers=[...registered.values()];
    if(typeof legacyInterceptor==='function'){
      layers.push({id:'legacy',interceptor:legacyInterceptor,priority:0,order:Number.MAX_SAFE_INTEGER});
    }
    layers.sort((a,b)=>a.priority-b.priority||a.order-b.order);
    for(const layer of layers){
      if(damage<=0)break;
      const result=layer.interceptor({...hit,damage});
      damage=normalizeDamageResult(result,damage);
    }
    return{damage};
  }

  function sync(){
    apply(registered.size>0||typeof legacyInterceptor==='function'?composite:null);
  }

  function setLegacy(interceptor){
    legacyInterceptor=typeof interceptor==='function'?interceptor:null;
    sync();
  }

  function register(id,interceptor,priority=0){
    const key=String(id||'').trim();
    if(!key)throw new TypeError('[player-damage-interceptors] interceptor id is required');
    if(typeof interceptor!=='function'){
      unregister(key);
      return()=>false;
    }
    const token=Symbol(key);
    registered.set(key,{
      id:key,
      interceptor,
      priority:Number.isFinite(Number(priority))?Number(priority):0,
      order:nextOrder++,
      token,
    });
    sync();
    let active=true;
    return()=>{
      if(!active)return false;
      active=false;
      const current=registered.get(key);
      if(current?.token!==token)return false;
      registered.delete(key);
      sync();
      return true;
    };
  }

  function unregister(id){
    const removed=registered.delete(String(id||'').trim());
    if(removed)sync();
    return removed;
  }

  return{
    composite,
    setLegacy,
    register,
    unregister,
    get size(){return registered.size;},
  };
}
