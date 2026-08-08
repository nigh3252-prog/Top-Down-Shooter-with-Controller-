export const STANCE_DEFENSE_FAMILY_BY_ID=Object.freeze({
  S01:'block',
  S02:'parry',
  S03:'block',
  S04:'block',
  S05:'block',
  S06:'block',
  S07:'parry',
  S08:'parry',
  S09:'dodge',
  S10:'parry',
  S11:'dodge',
  S12:'parry',
  S13:'dodge',
  S14:'block',
  S15:'dodge',
  S16:'parry',
  S17:'parry',
  S18:'parry',
  S19:'parry',
  S20:'block',
  S21:'block',
  S22:'parry',
  S23:'dodge',
  S24:'dodge',
  S25:'dodge',
  S26:'parry',
  S27:'parry',
  S28:'block',
  S29:'parry',
  S30:'block',
});

export const STANCE_DEFENSE_FAMILY_TEMPLATES=Object.freeze({
  dodge:Object.freeze({
    sourceStanceId:'S24',
    label:'BUILT-IN DODGE',
    kind:'existing-dodge',
    dodgeCost:12,
    summary:'Uses the current Combat Arena dodge and spends 12 stamina on an eligible dodge.',
  }),
  parry:Object.freeze({
    sourceStanceId:'S26',
    label:'SWORD PARRY',
    kind:'parry',
    parryWindow:.22,
    missRecovery:.32,
    missStaminaCost:12,
    successFlash:.34,
    parryStaggerDuration:1.25,
    summary:'Tap defense for a short parry window. Success is free and heavily staggers the attacker; a whiff costs 12 stamina.',
  }),
  block:Object.freeze({
    sourceStanceId:'S01',
    label:'KITE SHIELD',
    kind:'shield',
    blockArcDegrees:120,
    guardMoveMultiplier:.55,
    guardCounterWindow:.8,
    minimumBlockCost:8,
    staminaPerDamage:1.5,
    summary:'Tap to toggle the kite shield between the side and frontal guard.',
  }),
});

const SAMPLE_PROFILE_IDS=Object.freeze({
  S24:'rat-step-existing-dodge',
  S26:'long-blade-parry',
  S01:'hammerfall-kite-shield',
});

function materializeDefenseProfile(stanceId,family){
  const template=STANCE_DEFENSE_FAMILY_TEMPLATES[family];
  if(!template)return null;
  return Object.freeze({
    ...template,
    id:SAMPLE_PROFILE_IDS[stanceId]||`stance-${String(stanceId).toLowerCase()}-${family}`,
    stanceId,
    family,
    sourceProfileStanceId:template.sourceStanceId,
  });
}

export const STANCE_DEFENSE_PROFILES=Object.freeze(Object.fromEntries(
  Object.entries(STANCE_DEFENSE_FAMILY_BY_ID).map(([stanceId,family])=>[
    stanceId,
    materializeDefenseProfile(stanceId,family),
  ]),
));

export function isHammerfallDefenseStance(stance){
  const candidates=stance&&typeof stance==='object'
    ?[stance.id,stance.stanceId,stance.cardId,stance.sourceId,stance.name,stance.label]
    :[stance];
  return candidates.some(value=>{
    const token=String(value??'').trim();
    return /^S01$/i.test(token)||/\bS01\b/i.test(token)||/\bhammerfall\b/i.test(token);
  });
}
export function resolveStanceDefenseProfile(stance){
  const stanceId=String(stance?.id||stance||'');
  return STANCE_DEFENSE_PROFILES[stanceId]
    ||(isHammerfallDefenseStance(stance)?STANCE_DEFENSE_PROFILES.S01:null);
}

export function usesCustomDefense(profileOrStance){
  const profile=profileOrStance?.kind?profileOrStance:resolveStanceDefenseProfile(profileOrStance);
  return profile?.kind==='parry'||profile?.kind==='shield';
}

export function shieldBlockCost(damage,profile=STANCE_DEFENSE_PROFILES.S01){
  const amount=Math.max(0,Number(damage)||0);
  return Math.max(Number(profile?.minimumBlockCost)||0,amount*(Number(profile?.staminaPerDamage)||1));
}

export function isFrontalShieldHit({incomingDir,forward,arcDegrees=120}={}){
  const ix=Number(incomingDir?.x),iz=Number(incomingDir?.z);
  const fx=Number(forward?.x),fz=Number(forward?.z);
  if(!Number.isFinite(ix)||!Number.isFinite(iz)||!Number.isFinite(fx)||!Number.isFinite(fz))return false;
  const il=Math.hypot(ix,iz),fl=Math.hypot(fx,fz);
  if(il<1e-6||fl<1e-6)return false;
  const towardSource={x:-ix/il,z:-iz/il};
  const facing={x:fx/fl,z:fz/fl};
  const threshold=Math.cos((Math.max(1,Math.min(359,Number(arcDegrees)||120))*Math.PI/180)/2);
  return facing.x*towardSource.x+facing.z*towardSource.z>=threshold;
}
