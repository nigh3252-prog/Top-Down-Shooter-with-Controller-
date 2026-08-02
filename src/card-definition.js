export function deepFreeze(value, seen=new WeakSet()){
  if(!value||typeof value!=='object'||seen.has(value))return value;
  seen.add(value);
  for(const child of Object.values(value))deepFreeze(child,seen);
  return Object.freeze(value);
}

export function freezeCard(card){
  return deepFreeze(card);
}

export function readonlyMap(entries){
  const source=new Map(entries);
  const view={
    get(key){return source.get(key);},
    has(key){return source.has(key);},
    keys(){return source.keys();},
    values(){return source.values();},
    entries(){return source.entries();},
    forEach(callback,thisArg){return source.forEach((value,key)=>callback.call(thisArg,value,key,view));},
    [Symbol.iterator](){return source[Symbol.iterator]();},
  };
  Object.defineProperty(view,'size',{enumerable:true,value:source.size});
  return Object.freeze(view);
}
