import { resolveGate2PilotProfile } from './stance-gate2-runtime.js';

const pairKey=(stanceId,weaponId)=>`${stanceId}:${weaponId}`;
const freezeProfile=profile=>Object.freeze({...profile});
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
const smoothstep01=value=>{const t=clamp01(value);return t*t*(3-2*t);};

export const STANCE_MOVEMENT_PROFILES=Object.freeze({
  [pairKey('S24','dagger')]:freezeProfile({
    id:'rat-step-dagger-mobile',label:'MOBILE',strikeMode:'mobile',recoveryMode:'none',
    windupMultiplier:1,strikeMultiplier:1,attackRecoveryMultiplier:1,
    recoveryDuration:0,recoveryHold:0,recoveryStartMultiplier:1,
    summary:'Mobile through the attack with no post-swing movement penalty.',
  }),
  [pairKey('S24','longsword')]:freezeProfile({
    id:'rat-step-longsword-settle',label:'WALK + SETTLE',strikeMode:'walk',recoveryMode:'settle',
    windupMultiplier:.78,strikeMultiplier:.62,attackRecoveryMultiplier:.58,
    recoveryDuration:.22,recoveryHold:0,recoveryStartMultiplier:.55,
    summary:'Walk during the swing, then settle briefly before returning to full speed.',
  }),
  [pairKey('S24','greatsword')]:freezeProfile({
    id:'rat-step-greatsword-failure',label:'FAILURE RECOVERY',strikeMode:'failure',recoveryMode:'authored-failure',
    useBaseAttackMovement:true,recoveryDuration:0,recoveryHold:0,recoveryStartMultiplier:1,
    summary:'The failed-lift animation supplies its own movement and recovery commitment.',
  }),
  [pairKey('S26','dagger')]:freezeProfile({
    id:'long-blade-dagger-commit',label:'MOBILE → COMMITTED',strikeMode:'committed',recoveryMode:'settle',
    windupMultiplier:.92,strikeMultiplier:.68,attackRecoveryMultiplier:.60,
    recoveryDuration:.18,recoveryHold:0,recoveryStartMultiplier:.62,
    summary:'Mobile preparation, committed contact, and a short settling recovery.',
  }),
  [pairKey('S26','longsword')]:freezeProfile({
    id:'long-blade-longsword-controlled',label:'CONTROLLED WALK',strikeMode:'controlled',recoveryMode:'settle',
    windupMultiplier:.78,strikeMultiplier:.62,attackRecoveryMultiplier:.58,
    recoveryDuration:.25,recoveryHold:0,recoveryStartMultiplier:.55,
    summary:'Controlled walking attack with a modest post-swing recovery.',
  }),
  [pairKey('S26','greatsword')]:freezeProfile({
    id:'long-blade-greatsword-planted',label:'PLANTED',strikeMode:'planted',recoveryMode:'full-stop',
    windupMultiplier:.52,strikeMultiplier:0,attackRecoveryMultiplier:.25,
    recoveryDuration:.42,recoveryHold:.12,recoveryStartMultiplier:0,
    summary:'Slow adjustment, planted contact, then a substantial balance recovery.',
  }),
  [pairKey('S01','dagger')]:freezeProfile({
    id:'hammerfall-dagger-failure',label:'FAILURE RECOVERY',strikeMode:'failure',recoveryMode:'authored-failure',
    useBaseAttackMovement:true,recoveryDuration:0,recoveryHold:0,recoveryStartMultiplier:1,
    summary:'The unsupported-overcommit animation supplies its own movement and recovery commitment.',
  }),
  [pairKey('S01','longsword')]:freezeProfile({
    id:'hammerfall-longsword-planted',label:'PLANTED',strikeMode:'planted',recoveryMode:'full-stop',
    windupMultiplier:.48,strikeMultiplier:0,attackRecoveryMultiplier:.22,
    recoveryDuration:.32,recoveryHold:.10,recoveryStartMultiplier:0,
    summary:'Planted contact followed by a moderate recovery from the committed swing.',
  }),
  [pairKey('S01','greatsword')]:freezeProfile({
    id:'hammerfall-greatsword-full-plant',label:'FULL PLANT',strikeMode:'planted',recoveryMode:'full-stop',
    windupMultiplier:.35,strikeMultiplier:0,attackRecoveryMultiplier:.15,
    recoveryDuration:.50,recoveryHold:.18,recoveryStartMultiplier:0,
    summary:'Slow setup, complete plant through impact, and a full half-second recovery envelope.',
  }),
});

const movementClassPairKey=(stanceClass,weaponClass)=>`${stanceClass}:${weaponClass}`;
export const STANCE_MOVEMENT_CLASS_TEMPLATE_SOURCES=Object.freeze({
  'Light:Light':'S24:dagger',
  'Light:Medium':'S24:longsword',
  'Light:Heavy':'S24:greatsword',
  'Medium:Light':'S26:dagger',
  'Medium:Medium':'S26:longsword',
  'Medium:Heavy':'S26:greatsword',
  'Heavy:Light':'S01:dagger',
  'Heavy:Medium':'S01:longsword',
  'Heavy:Heavy':'S01:greatsword',
});
export const STANCE_MOVEMENT_CLASS_TEMPLATES=Object.freeze(Object.fromEntries(
  Object.entries(STANCE_MOVEMENT_CLASS_TEMPLATE_SOURCES).map(([key,sourcePair])=>[key,STANCE_MOVEMENT_PROFILES[sourcePair]]),
));
function materializeMovementTemplate(template,pilotProfile,stanceId,weaponId,gate2){
  if(!template)return null;
  if(pilotProfile)return pilotProfile;
  return freezeProfile({
    ...template,
    id:`stance2-movement-${String(gate2?.compatibility?.stanceClass||'unknown').toLowerCase()}-${String(gate2?.compatibility?.weaponClass||'unknown').toLowerCase()}`,
    sourceProfileId:template.id,
    stanceId,weaponId,
  });
}

export function resolveStanceMovementProfile({stance,weapon,weaponId=''}={}){
  const stanceId=String(stance?.id||stance||'');
  const resolvedWeaponId=String(weaponId||weapon?.id||'');
  const gate2=resolveGate2PilotProfile({stance,weapon,weaponId:resolvedWeaponId});
  const pilotProfile=STANCE_MOVEMENT_PROFILES[pairKey(stanceId,resolvedWeaponId)]||null;
  const templateKey=movementClassPairKey(gate2.compatibility.stanceClass,gate2.compatibility.weaponClass);
  const template=STANCE_MOVEMENT_CLASS_TEMPLATES[templateKey]||null;
  const profile=materializeMovementTemplate(template,pilotProfile,stanceId,resolvedWeaponId,gate2);
  return Object.freeze({active:!!profile&&gate2.active,stanceId,weaponId:resolvedWeaponId,templateKey,gate2,profile});
}


export function movementMultiplierDuringAttack(profile,attack,t=0){
  if(!profile||profile.useBaseAttackMovement||!attack)return null;
  const time=Math.max(0,Number(t)||0);
  const windupEnd=Math.max(0,Number(attack.phases?.[0]?.t1)||0);
  const contact=Math.max(windupEnd,Number(attack.contactAt)||windupEnd);
  if(time<windupEnd)return clamp01(profile.windupMultiplier);
  if(time<=contact+.12)return clamp01(profile.strikeMultiplier);
  return clamp01(profile.attackRecoveryMultiplier);
}

export function postSwingMovementMultiplier(profile,elapsed=0){
  if(!profile||profile.recoveryDuration<=0)return 1;
  const duration=Math.max(.001,Number(profile.recoveryDuration)||0);
  const hold=Math.max(0,Math.min(duration,Number(profile.recoveryHold)||0));
  const start=clamp01(profile.recoveryStartMultiplier);
  const time=Math.max(0,Number(elapsed)||0);
  if(time>=duration)return 1;
  if(time<=hold)return start;
  const progress=(time-hold)/Math.max(.001,duration-hold);
  return start+(1-start)*smoothstep01(progress);
}
