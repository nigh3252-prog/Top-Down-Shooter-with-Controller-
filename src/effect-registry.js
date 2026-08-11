import { readonlyMap } from './card-definition.js';

const ARCANA_HANDLER_ROWS = Object.freeze([
  ['FLAME-STRIKE','wizardFlameStrike'],
  ['FLAME-CROSS','wizardArcana'],
  ['BOUNCING-BLAZE','wizardArcana'],
  ['WIND-SLASH','wizardWindSlash'],
  ['HOMING-FLARES','wizardRebuiltArcana'],
  ['DRAGON-ARC','wizardRebuiltArcana'],
  ['WHIRLING-TORNADO','wizardRebuiltArcana'],
  ['WATER-PRISON','wizardRebuiltArcana'],
  ['AIR-SPINNER','wizardAirBasics'],
  ['PERFORATING-JET','wizardAirBasics'],
  ['EARTH-KNUCKLES','wizardNextSource'],
  ['BLADED-VINE','wizardNextSource'],
  ['STONE-SHOT','wizardNextSource'],
  ['SPARK-CONTACT','wizardNextSource'],
  ['BOLT-RAIL','wizardNextSource'],
  ['VOLT-DISC','wizardNextSource'],
  ['ICE-DAGGER','wizardNextTwentyBasics'],
  ['RIP-TIDE','wizardNextTwentyBasics'],
  ['AQUA-ARC','wizardNextTwentyBasics'],
  ['CHAOS-CRUSHER','wizardNextTwentyBasics'],
  ['SEARING-RUSH','wizardNextTwentyDash'],
  ['FLARE-RUSH','wizardNextTwentyDash'],
  ['IGNITION-RUSH','wizardNextTwentyDash'],
  ['AIR-BURST','wizardNextTwentyDash'],
  ['GUST-BURST','wizardNextTwentyDash'],
  ['RAZOR-BURST','wizardNextTwentyDash'],
  ['SPIKE-TRACK','wizardNextTwentyDash'],
  ['TOXIC-TRAP','wizardNextTwentyDash'],
  ['SNARE-TRACK','wizardNextTwentyDash'],
  ['THUNDER-LINE','wizardNextTwentyDash'],
  ['CIRCUIT-LINE','wizardNextTwentyDash'],
  ['SHOCK-LINE','wizardNextTwentyDash'],
  ['WAVE-FRONT','wizardNextTwentyDash'],
  ['FROST-FEINT','wizardNextTwentyDash'],
  ['FROST-WING','wizardNextTwentyDash'],
  ['CHAOTIC-RIFT','wizardNextTwentyDash'],
  ['FLAME-FUSION','wizardFusionLeap'],
  ['RAPID-FIRE-AGENT','wizardAlliedArcana'],
  ['WARD-OF-FLAMES','wizardAlliedArcana'],
  ['MENTIS-IMPERIUM','wizardAlliedArcana'],
  ['HEROIC-LEAP','wizardFusionLeap'],
  ['CYCLONE-BOOMERANG','wizardArcaneTypes'],
  ['EARTHEN-AEGIS','wizardArcaneTypes'],
  ['BALL-LIGHTNING','wizardArcaneTypes'],
  ['AQUA-BEAM','wizardArcaneTypes'],
  ['ARCANE-INTERVENTION','wizardArcaneTypes'],
  ['FLAME-BREATH','wizardVfxArcana'],
  ['SEARING-CROWN','wizardVfxArcana'],
  ['IGNITION-DRIVE','wizardVfxArcana'],
  ['ENGULFING-FISSURE','wizardVfxArcana'],
  ['DRAGON-BLAST','wizardVfxArcana'],
  ['SHEARING-CHAIN','wizardVfxArcana'],
  ['TECTONIC-DRILL','wizardVfxArcana'],
  ['ROCK-SOLID-TOMAHAWK','wizardVfxArcana'],
  ['AQUA-VORTEX','wizardVfxArcana'],
  ['AQUA-BREAKER','wizardVfxArcana'],
]);

const ARCANA_EFFECT_ROWS = Object.freeze(ARCANA_HANDLER_ROWS.map(([arcanaId,runtimeHandlerId])=>Object.freeze({
  arcanaId,
  effectId:`arcana:${arcanaId}`,
  runtimeHandlerId,
  label:arcanaId.replaceAll('-',' '),
})));

export function arcanaEffectId(arcanaId){
  const id=String(arcanaId||'').trim().toUpperCase();
  return ARCANA_EFFECT_ROWS.some(row=>row.arcanaId===id)?`arcana:${id}`:null;
}

export const ARCANA_EFFECT_DEFINITIONS=ARCANA_EFFECT_ROWS;

export const EFFECT_DEFINITIONS=Object.freeze([
  Object.freeze({effectId:'pilebunker',runtimeHandlerId:'pilebunker',label:'Pilebunker'}),
  Object.freeze({effectId:'bloodSlash',runtimeHandlerId:'bloodSlash',label:'Blood Slash'}),
  Object.freeze({effectId:'bingBong',runtimeHandlerId:'bingBong',label:'Bing Bong'}),
  ...ARCANA_EFFECT_DEFINITIONS.map(({effectId,runtimeHandlerId,label})=>Object.freeze({effectId,runtimeHandlerId,label})),
]);

const EFFECTS_BY_ID=new Map();
for(const definition of EFFECT_DEFINITIONS){
  if(EFFECTS_BY_ID.has(definition.effectId))throw new Error(`Duplicate effect definition: ${definition.effectId}`);
  EFFECTS_BY_ID.set(definition.effectId,definition);
}

const normalizeEffectId=value=>String(value?.effectId??value??'').trim();
const effectDefinition=value=>EFFECTS_BY_ID.get(normalizeEffectId(value))||null;

export const EFFECT_IDS=Object.freeze(EFFECT_DEFINITIONS.map(definition=>definition.effectId));
export const RUNTIME_HANDLER_IDS=Object.freeze([...new Set(EFFECT_DEFINITIONS.map(definition=>definition.runtimeHandlerId))]);

export const EFFECT_REGISTRY=Object.freeze({
  get:effectDefinition,
  require(value){
    const definition=effectDefinition(value);
    if(!definition)throw new Error(`Unknown effect definition: ${normalizeEffectId(value)}`);
    return definition;
  },
  list(){return Object.freeze(EFFECT_DEFINITIONS.slice());},
});

export function getEffectDefinition(value){return effectDefinition(value);}
export function requireEffectDefinition(value){return EFFECT_REGISTRY.require(value);}
export function listEffectDefinitions(){return EFFECT_REGISTRY.list();}

function normalizeHandler(handler){
  if(typeof handler==='function')return{canPlay:()=>true,play:handler};
  return handler&&typeof handler==='object'?handler:null;
}

export function createRuntimeHandlerTable(handlers={}){
  const entries=[];
  for(const runtimeHandlerId of RUNTIME_HANDLER_IDS){
    const source=typeof handlers?.get==='function'?handlers.get(runtimeHandlerId):handlers?.[runtimeHandlerId];
    const handler=normalizeHandler(source);
    if(handler)entries.push([runtimeHandlerId,Object.freeze(handler)]);
  }
  return readonlyMap(entries);
}

export function createEffectDispatcher({runtimeHandlers=null,handlers=null}={}){
  const handlerTable=createRuntimeHandlerTable(runtimeHandlers||handlers||{});
  const recordFor=value=>effectDefinition(value);
  const handlerFor=value=>{
    const definition=recordFor(value);
    return definition?handlerTable.get(definition.runtimeHandlerId)||null:null;
  };
  return Object.freeze({
    handlers:handlerTable,
    get:handlerFor,
    getEffect(value){return recordFor(value);},
    has(value){return !!handlerFor(value);},
    require(value){
      const handler=handlerFor(value);
      if(!handler)throw new Error(`No runtime handler registered for effect: ${normalizeEffectId(value)}`);
      return handler;
    },
    list(){
      return Object.freeze(EFFECT_DEFINITIONS.map(definition=>Object.freeze({
        ...definition,
        handler:handlerTable.get(definition.runtimeHandlerId)||null,
      })));
    },
    canPlay(card,context={}){
      const effectId=normalizeEffectId(card),handler=handlerFor(effectId);
      if(!effectId||!handler||typeof handler.canPlay!=='function')return false;
      return handler.canPlay(card,context)!==false;
    },
    play(card,context={}){
      const effectId=normalizeEffectId(card),handler=handlerFor(effectId);
      if(!effectId||!handler||typeof handler.play!=='function')return false;
      return handler.play(card,context);
    },
  });
}
