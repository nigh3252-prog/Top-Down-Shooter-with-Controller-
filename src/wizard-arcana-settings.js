export const ARCANA_TWEAKS_KEY='enemyLab.wizardArcana.tweaks.v1';
export const ARCANA_TWEAKS_EVENT='wizard-arcana:tweaks-changed';
export const ARCANA_SIZE_MIN=1;
export const ARCANA_SIZE_MAX=5;
export const ARCANA_SIZE_STEP=.25;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function clampArcanaSize(value){
  const numeric=Number(value);
  const safe=Number.isFinite(numeric)?numeric:1;
  const stepped=Math.round(safe/ARCANA_SIZE_STEP)*ARCANA_SIZE_STEP;
  return clamp(stepped,ARCANA_SIZE_MIN,ARCANA_SIZE_MAX);
}

export function normalizeArcanaTweaks(value={}){
  return Object.freeze({sizeMultiplier:clampArcanaSize(value?.sizeMultiplier)});
}

export function readArcanaTweaks(storage=globalThis.localStorage){
  try{
    const parsed=JSON.parse(storage?.getItem?.(ARCANA_TWEAKS_KEY)||'{}');
    return normalizeArcanaTweaks(parsed);
  }catch{return normalizeArcanaTweaks();}
}

export function writeArcanaTweaks(value,{storage=globalThis.localStorage,eventTarget=globalThis.window}={}){
  const settings=normalizeArcanaTweaks(value);
  try{storage?.setItem?.(ARCANA_TWEAKS_KEY,JSON.stringify(settings));}catch{}
  try{globalThis.__WIZARD_ARCANA_TWEAKS__=settings;}catch{}
  try{
    if(eventTarget?.dispatchEvent&&typeof globalThis.CustomEvent==='function'){
      eventTarget.dispatchEvent(new CustomEvent(ARCANA_TWEAKS_EVENT,{detail:settings}));
    }
  }catch{}
  return settings;
}
