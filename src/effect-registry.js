export const EFFECT_DEFINITIONS = Object.freeze([
  Object.freeze({effectId:'bloodSlash',label:'Blood Slash'}),
  Object.freeze({effectId:'bingBong',label:'Bing Bong'}),
]);

const EFFECTS_BY_ID = new Map();
for(const definition of EFFECT_DEFINITIONS){
  if(EFFECTS_BY_ID.has(definition.effectId))throw new Error(`Duplicate effect definition: ${definition.effectId}`);
  EFFECTS_BY_ID.set(definition.effectId,definition);
}

const normalizeEffectId=value=>String(value?.effectId??value??'').trim();
const effectDefinition=value=>EFFECTS_BY_ID.get(normalizeEffectId(value))||null;

export const EFFECT_IDS = Object.freeze(EFFECT_DEFINITIONS.map(definition=>definition.effectId));
export const EFFECT_REGISTRY = Object.freeze({
  get:effectDefinition,
  require(value){
    const definition=effectDefinition(value);
    if(!definition)throw new Error(`Unknown effect definition: ${normalizeEffectId(value)}`);
    return definition;
  },
  list(){return Object.freeze(EFFECT_DEFINITIONS.slice());},
});

export function getEffectDefinition(value){
  return effectDefinition(value);
}

export function requireEffectDefinition(value){
  return EFFECT_REGISTRY.require(value);
}

export function listEffectDefinitions(){
  return EFFECT_REGISTRY.list();
}

function normalizeHandler(handler){
  if(typeof handler==='function')return{play:handler};
  return handler&&typeof handler==='object'?handler:null;
}

export function createEffectDispatcher({handlers={},fallbackCanPlay=()=>true,fallbackPlay=()=>undefined}={}){
  const handlersById=new Map();
  for(const definition of EFFECT_DEFINITIONS){
    const handler=normalizeHandler(handlers[definition.effectId]);
    if(handler)handlersById.set(definition.effectId,handler);
  }
  const handlerFor=value=>handlersById.get(normalizeEffectId(value))||null;
  return Object.freeze({
    get:handlerFor,
    has(value){return handlersById.has(normalizeEffectId(value));},
    require(value){
      const handler=handlerFor(value);
      if(!handler)throw new Error(`No runtime handler registered for effect: ${normalizeEffectId(value)}`);
      return handler;
    },
    list(){
      return Object.freeze([...handlersById].map(([effectId,handler])=>Object.freeze({effectId,handler})));
    },
    canPlay(card,context={}){
      const effectId=normalizeEffectId(card);
      const handler=effectId?handlerFor(effectId):null;
      if(effectId&&!handler)return false;
      if(typeof handler?.canPlay==='function')return handler.canPlay(card,context)!==false;
      return fallbackCanPlay(card,context)!==false;
    },
    play(card,context={}){
      const effectId=normalizeEffectId(card);
      const handler=effectId?handlerFor(effectId):null;
      if(effectId&&!handler)return false;
      if(typeof handler?.play==='function')return handler.play(card,context);
      return fallbackPlay(card,context);
    },
  });
}
