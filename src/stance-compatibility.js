export const STANCE_CLASSES = Object.freeze(['Light', 'Medium', 'Heavy']);

export const STANCE_CLASS_PRESENTATION = Object.freeze({
  Light:Object.freeze({label:'Speed',short:'S'}),
  Medium:Object.freeze({label:'Balanced',short:'B'}),
  Heavy:Object.freeze({label:'Power',short:'P'}),
});

export function getStanceClassPresentation(value){
  const normalized=normalizeStanceClass(value);
  return normalized?STANCE_CLASS_PRESENTATION[normalized]||null:null;
}
export function stanceClassDisplayName(value){return getStanceClassPresentation(value)?.label||String(value||'');}
export function stanceClassShort(value){return getStanceClassPresentation(value)?.short||'';}

export const STANCE_CLASS_BY_ID = Object.freeze({
  S01:'Heavy',
  S02:'Heavy',
  S03:'Medium',
  S04:'Heavy',
  S05:'Heavy',
  S06:'Heavy',
  S07:'Heavy',
  S08:'Heavy',
  S09:'Heavy',
  S10:'Heavy',
  S11:'Medium',
  S12:'Medium',
  S13:'Medium',
  S14:'Light',
  S15:'Medium',
  S16:'Light',
  S17:'Medium',
  S18:'Light',
  S19:'Light',
  S20:'Medium',
  S21:'Heavy',
  S22:'Medium',
  S23:'Light',
  S24:'Light',
  S25:'Light',
  S26:'Medium',
  S27:'Heavy',
  S28:'Heavy',
  S29:'Medium',
  S30:'Heavy',
});

export const STANCE_COMPATIBILITY_TIERS = Object.freeze({
  full:Object.freeze({id:'full',label:'FULL',distance:0,attackExpression:'full'}),
  adapted:Object.freeze({id:'adapted',label:'ADAPTED',distance:1,attackExpression:'adapted'}),
  unusable:Object.freeze({id:'unusable',label:'UNUSABLE',distance:2,attackExpression:'failed'}),
  unknown:Object.freeze({id:'unknown',label:'UNKNOWN',distance:null,attackExpression:'unknown'}),
});

const CLASS_RANK = Object.freeze({Light:0,Medium:1,Heavy:2});
const validClass = value => Object.prototype.hasOwnProperty.call(CLASS_RANK, value);

export function normalizeStanceClass(value){
  const raw=String(value||'').trim().toLowerCase();
  if(raw==='light'||raw==='speed')return'Light';
  if(raw==='medium'||raw==='balanced')return'Medium';
  if(raw==='heavy'||raw==='power')return'Heavy';
  return null;
}

export function getStanceClass(stanceOrId){
  if(stanceOrId&&typeof stanceOrId==='object'){
    const explicit=normalizeStanceClass(stanceOrId.stanceClass);
    if(explicit)return explicit;
    return STANCE_CLASS_BY_ID[String(stanceOrId.id||'')]||null;
  }
  return STANCE_CLASS_BY_ID[String(stanceOrId||'')]||null;
}

export function getWeaponClass(weaponDef){
  if(!weaponDef)return null;
  return normalizeStanceClass(weaponDef.weightClass)||normalizeStanceClass(weaponDef.staminaClass);
}

export function getCompatibilityTierByDistance(distance){
  if(distance===0)return STANCE_COMPATIBILITY_TIERS.full;
  if(distance===1)return STANCE_COMPATIBILITY_TIERS.adapted;
  if(distance===2)return STANCE_COMPATIBILITY_TIERS.unusable;
  return STANCE_COMPATIBILITY_TIERS.unknown;
}

export function resolveStanceWeaponCompatibility({stance,weapon,weaponId=''}={}){
  const stanceClass=getStanceClass(stance);
  const weaponClass=getWeaponClass(weapon);
  const stanceId=typeof stance==='string'?stance:String(stance?.id||'');
  const resolvedWeaponId=String(weaponId||weapon?.id||'');
  if(!validClass(stanceClass)||!validClass(weaponClass)){
    return Object.freeze({
      stanceId,weaponId:resolvedWeaponId,stanceClass,weaponClass,
      distance:null,tier:'unknown',label:'UNKNOWN',attackExpression:'unknown',
      preferredWeapon:false,
    });
  }
  const distance=Math.abs(CLASS_RANK[stanceClass]-CLASS_RANK[weaponClass]);
  const tier=getCompatibilityTierByDistance(distance);
  const preferredWeapons=Array.isArray(stance?.preferredWeapons)?stance.preferredWeapons:[];
  return Object.freeze({
    stanceId,weaponId:resolvedWeaponId,stanceClass,weaponClass,distance,
    tier:tier.id,label:tier.label,attackExpression:tier.attackExpression,
    preferredWeapon:!!resolvedWeaponId&&preferredWeapons.includes(resolvedWeaponId),
  });
}

export function stanceClassCounts(map=STANCE_CLASS_BY_ID){
  const counts={Light:0,Medium:0,Heavy:0};
  for(const value of Object.values(map||{})){
    const normalized=normalizeStanceClass(value);
    if(normalized)counts[normalized]++;
  }
  return Object.freeze(counts);
}
