export const ARCANA_TWEAKS_KEY='enemyLab.wizardArcana.tweaks.v1';
export const ARCANA_TWEAKS_EVENT='wizard-arcana:tweaks-changed';
export const ARCANA_SIZE_MIN=1;
export const ARCANA_SIZE_MAX=5;
export const ARCANA_SIZE_STEP=.25;
export const ARCANA_DAMAGE_MIN=1;
export const ARCANA_DAMAGE_MAX=5;
export const ARCANA_DAMAGE_STEP=.25;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function clampStepped(value,{min=1,max=5,step=.25}={}){
  const numeric=Number(value);
  const safe=Number.isFinite(numeric)?numeric:min;
  const stepped=Math.round(safe/step)*step;
  return clamp(stepped,min,max);
}

export function clampArcanaSize(value){
  return clampStepped(value,{min:ARCANA_SIZE_MIN,max:ARCANA_SIZE_MAX,step:ARCANA_SIZE_STEP});
}

export function clampArcanaDamage(value){
  return clampStepped(value,{min:ARCANA_DAMAGE_MIN,max:ARCANA_DAMAGE_MAX,step:ARCANA_DAMAGE_STEP});
}

export function normalizeArcanaTweaks(value={}){
  return Object.freeze({
    sizeMultiplier:clampArcanaSize(value?.sizeMultiplier??3),
    damageMultiplier:clampArcanaDamage(value?.damageMultiplier??3),
  });
}

export function readArcanaTweaks(storage=globalThis.localStorage){
  try{
    const parsed=JSON.parse(storage?.getItem?.(ARCANA_TWEAKS_KEY)||'{}');
    return normalizeArcanaTweaks(parsed);
  }catch{return normalizeArcanaTweaks();}
}

export function writeArcanaTweaks(value,{storage=globalThis.localStorage,eventTarget=globalThis.window}={}){
  // Merge partial UI updates with the saved settings so moving the size slider
  // cannot reset damage and moving the damage slider cannot reset size.
  const current=readArcanaTweaks(storage);
  const settings=normalizeArcanaTweaks({...current,...value});
  try{storage?.setItem?.(ARCANA_TWEAKS_KEY,JSON.stringify(settings));}catch{}
  try{globalThis.__WIZARD_ARCANA_TWEAKS__=settings;}catch{}
  try{
    if(eventTarget?.dispatchEvent&&typeof globalThis.CustomEvent==='function'){
      eventTarget.dispatchEvent(new CustomEvent(ARCANA_TWEAKS_EVENT,{detail:settings}));
    }
  }catch{}
  return settings;
}
