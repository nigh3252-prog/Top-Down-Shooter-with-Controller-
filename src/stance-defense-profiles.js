export const STANCE_DEFENSE_PROFILES=Object.freeze({
  S24:Object.freeze({
    id:'rat-step-existing-dodge',
    stanceId:'S24',
    label:'BUILT-IN DODGE',
    kind:'existing-dodge',
    dodgeCost:12,
    summary:'Rat Step uses the current Combat Arena dodge exactly as authored and spends 12 stamina.',
  }),
  S26:Object.freeze({
    id:'long-blade-parry',
    stanceId:'S26',
    label:'SWORD PARRY',
    kind:'parry',
    parryWindow:.22,
    missRecovery:.32,
    missStaminaCost:12,
    successFlash:.34,
    parryStaggerDuration:1.25,
    summary:'Tap defense for a short sword-parry window. Success is free and heavily staggers the attacker; a whiff costs 12 stamina.',
  }),
  S01:Object.freeze({
    id:'hammerfall-kite-shield',
    stanceId:'S01',
    label:'KITE SHIELD',
    kind:'shield',
    blockArcDegrees:120,
    guardMoveMultiplier:.55,
    guardCounterWindow:.8,
    minimumBlockCost:8,
    staminaPerDamage:1.5,
    summary:'Tap to toggle the kite shield between the left side and frontal guard.',
  }),
});

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
