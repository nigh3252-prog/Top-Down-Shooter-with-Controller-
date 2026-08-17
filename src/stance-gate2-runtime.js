import { listCards } from './card-registry.js';
import { guardPoseFor } from './guard-poses.js';
import { getArenaRuntime } from './arena-runtime-context.js';
import { resolveStanceWeaponCompatibility } from './stance-compatibility.js';
import { STONE_WEAPONS } from './weapons.js';
import { getStanceAttackAdapter, withAdaptedStanceAttack } from './stance-attack-adapters.js';
import { getWeaponStanceBalance } from './weapon-stance-plan.js';

const STANCE_CARDS = listCards({family:'stance'});

export const GATE2_STANCE_IDS=Object.freeze(['S24','S26','S01']);
export const GATE2_WEAPON_IDS=Object.freeze(['dagger','longsword','greatsword']);
export const GATE2_FAILURE_ATTACKS=Object.freeze({
  tooHeavy:'stance2FailTooHeavy',
  tooLight:'stance2FailTooLight',
});

const BASELINE_CHAIN_BY_ID=new Map(
  STANCE_CARDS.map(stance=>[stance.id,Object.freeze([...(stance.chain||[])])]),
);
const STANCE_BY_ID=new Map(STANCE_CARDS.map(stance=>[stance.id,stance]));
const pairKey=(stanceId,weaponId)=>`${stanceId}:${weaponId}`;
const freezeProfile=profile=>Object.freeze({
  ...profile,
  moveKeys:profile.moveKeys?Object.freeze([...profile.moveKeys]):null,
  pace:Object.freeze({...profile.pace}),
});

export const GATE2_PAIR_PROFILES=Object.freeze({
  [pairKey('S24','dagger')]:freezeProfile({
    id:'rat-step-dagger-full',stanceId:'S24',weaponId:'dagger',tier:'full',
    label:'FULL · RAPID KNIFE',moveKeys:null,gripMode:'normal',
    pace:{windup:.48,strike:.55,follow:.58,recovery:.50},
    reachMult:1,damageMult:1,staggerMult:1,
  }),
  [pairKey('S24','longsword')]:freezeProfile({
    id:'rat-step-longsword-adapted',stanceId:'S24',weaponId:'longsword',tier:'adapted',
    label:'ADAPTED · HALF-SWORD',moveKeys:['vertical10','stab3','horizontal3'],gripMode:'halfSword',
    pace:{windup:.76,strike:.82,follow:.88,recovery:.92},
    reachMult:.62,damageMult:.72,staggerMult:.56,
  }),
  [pairKey('S24','greatsword')]:freezeProfile({
    id:'rat-step-greatsword-failed',stanceId:'S24',weaponId:'greatsword',tier:'unusable',
    label:'UNUSABLE · TOO HEAVY',moveKeys:[GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy,GATE2_FAILURE_ATTACKS.tooHeavy],gripMode:'failedHeavy',
    pace:{windup:.92,strike:.72,follow:.78,recovery:1.42},
    reachMult:0,damageMult:0,staggerMult:0,failed:true,
  }),
  [pairKey('S26','dagger')]:freezeProfile({
    id:'long-blade-dagger-adapted',stanceId:'S26',weaponId:'dagger',tier:'adapted',
    label:'ADAPTED · PLANTED KNIFE',moveKeys:['stab3','horizontal3','vertical5'],gripMode:'closeTwoHand',
    pace:{windup:.78,strike:.82,follow:.88,recovery:.94},
    reachMult:.90,damageMult:.78,staggerMult:.66,
  }),
  [pairKey('S26','longsword')]:freezeProfile({
    id:'long-blade-longsword-full',stanceId:'S26',weaponId:'longsword',tier:'full',
    label:'FULL · LONG BLADE',moveKeys:null,gripMode:'normal',
    pace:{windup:.96,strike:1.00,follow:1.02,recovery:1.00},
    reachMult:1,damageMult:1,staggerMult:1,
  }),
  [pairKey('S26','greatsword')]:freezeProfile({
    id:'long-blade-greatsword-adapted',stanceId:'S26',weaponId:'greatsword',tier:'adapted',
    label:'ADAPTED · CHOKED GREATBLADE',moveKeys:['vertical10','stab5','horizontal6'],gripMode:'halfSword',
    pace:{windup:1.18,strike:1.24,follow:1.30,recovery:1.34},
    reachMult:.68,damageMult:.75,staggerMult:.72,
  }),
  [pairKey('S01','dagger')]:freezeProfile({
    id:'hammerfall-dagger-failed',stanceId:'S01',weaponId:'dagger',tier:'unusable',
    label:'UNUSABLE · TOO LIGHT',moveKeys:[GATE2_FAILURE_ATTACKS.tooLight,GATE2_FAILURE_ATTACKS.tooLight,GATE2_FAILURE_ATTACKS.tooLight],gripMode:'failedLight',
    pace:{windup:.90,strike:.72,follow:.78,recovery:1.48},
    reachMult:0,damageMult:0,staggerMult:0,failed:true,
  }),
  [pairKey('S01','longsword')]:freezeProfile({
    id:'hammerfall-longsword-adapted',stanceId:'S01',weaponId:'longsword',tier:'adapted',
    label:'ADAPTED · BRACED LONGSWORD',moveKeys:['vertical10','vertical5','vertical9'],gripMode:'braced',
    pace:{windup:1.22,strike:1.30,follow:1.36,recovery:1.42},
    reachMult:.92,damageMult:.82,staggerMult:.80,
  }),
  [pairKey('S01','greatsword')]:freezeProfile({
    id:'hammerfall-greatsword-full',stanceId:'S01',weaponId:'greatsword',tier:'full',
    label:'FULL · GREATBLADE HAMMERFALL',moveKeys:null,gripMode:'braced',
    pace:{windup:1.62,strike:1.60,follow:1.70,recovery:1.78},
    reachMult:1,damageMult:1,staggerMult:1,
  }),
});

const classPairKey=(stanceClass,weaponClass)=>`${stanceClass}:${weaponClass}`;
export const GATE2_CLASS_TEMPLATE_SOURCES=Object.freeze({
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
export const GATE2_CLASS_PAIR_TEMPLATES=Object.freeze(Object.fromEntries(
  Object.entries(GATE2_CLASS_TEMPLATE_SOURCES).map(([key,sourcePair])=>[key,GATE2_PAIR_PROFILES[sourcePair]]),
));
function materializeClassTemplateProfile({template,pilotProfile,stanceId,weaponId,compatibility}={}){
  if(!template)return null;
  if(pilotProfile)return pilotProfile;
  return freezeProfile({
    ...template,
    id:`stance2-${String(compatibility?.stanceClass||'unknown').toLowerCase()}-${String(compatibility?.weaponClass||'unknown').toLowerCase()}-${String(compatibility?.tier||'unknown')}`,
    sourceProfileId:template.id,
    stanceId,weaponId,
    label:`${template.label} · CLASS TEMPLATE`,
  });
}

export function isGate2PilotPair(stanceId,weaponId){
  return Object.prototype.hasOwnProperty.call(GATE2_PAIR_PROFILES,pairKey(String(stanceId||''),String(weaponId||'')));
}

export function resolveGate2PilotProfile({stance,weapon,weaponId=''}={}){
  const stanceId=String(stance?.id||stance||'');
  const resolvedWeaponId=String(weaponId||weapon?.id||'');
  const compatibility=resolveStanceWeaponCompatibility({stance,weapon,weaponId:resolvedWeaponId});
  const pilotProfile=GATE2_PAIR_PROFILES[pairKey(stanceId,resolvedWeaponId)]||null;
  const templateKey=classPairKey(compatibility.stanceClass,compatibility.weaponClass);
  const template=GATE2_CLASS_PAIR_TEMPLATES[templateKey]||null;
  const profile=materializeClassTemplateProfile({template,pilotProfile,stanceId,weaponId:resolvedWeaponId,compatibility});
  const balance=getWeaponStanceBalance({weaponId:resolvedWeaponId,stanceClass:compatibility.stanceClass});
  const originalChain=BASELINE_CHAIN_BY_ID.get(stanceId)||Object.freeze([...(stance?.chain||[])]);
  const effectiveChain=profile?.failed&&profile?.moveKeys?profile.moveKeys:originalChain;
  return Object.freeze({
    active:!!profile&&compatibility.tier!=='unknown',
    stanceId,
    weaponId:resolvedWeaponId,
    compatibility,
    templateKey,
    sourceProfileId:profile?.sourceProfileId||profile?.id||null,
    profile,
    balance,
    effectiveChain:Object.freeze([...effectiveChain]),
  });
}

function materializeFailureAttack(PC,{group,label,phases}){
  let t=0,contactAt=0;
  const built=phases.map(def=>{
    const phase={
      dur:def.dur,
      ease:PC.Ease[def.ease]||PC.Ease.linear,
      pose:def.pose==='IDLE'?PC.IDLE:PC.P(def.pose),
      t0:t,
    };
    t+=def.dur;
    phase.t1=t;
    if(def.contact){phase.contact=true;contactAt=phase.t1;}
    return phase;
  });
  return{
    group,label,approved:true,definitionKey:label,
    phases:built,total:t,contactAt,comboAt:built[built.length-1].t0,
    meta:{stance2Failure:true},
  };
}

export function injectGate2FailureAttacks(PC){
  if(!PC?.ATTACKS||!PC.P||!PC.Ease)return false;
  if(!PC.ATTACKS[GATE2_FAILURE_ATTACKS.tooHeavy]){
    PC.ATTACKS[GATE2_FAILURE_ATTACKS.tooHeavy]=materializeFailureAttack(PC,{
      group:'vertical',label:'Failed Lift · Weapon Too Heavy',phases:[
        {dur:.18,ease:'outCubic',pose:{hold:[.30,.72,.20],tip:[.14,-.86,.48],roll:.10,twist:.16,pitch:.20,lean:.18,hipTwist:.12,hip:[.05,0,-.02],lower:.16,head:[.10,.14]}},
        {dur:.13,ease:'inCubic',contact:true,pose:{hold:[.50,.43,.12],tip:[.28,-.94,.18],roll:.24,twist:.30,pitch:.36,lean:.34,hipTwist:.22,hip:[.10,0,.03],lower:.24,lunge:.03,head:[.16,.24]}},
        {dur:.24,ease:'outQuad',pose:{hold:[.22,.38,.04],tip:[.10,-.98,.12],roll:.08,twist:.12,pitch:.30,lean:.24,hipTwist:.10,hip:[.06,0,.02],lower:.22,head:[.08,.20]}},
        {dur:.42,ease:'outBack',pose:'IDLE'},
      ],
    });
  }
  if(!PC.ATTACKS[GATE2_FAILURE_ATTACKS.tooLight]){
    PC.ATTACKS[GATE2_FAILURE_ATTACKS.tooLight]=materializeFailureAttack(PC,{
      group:'vertical',label:'Overcommitted Swing · Weapon Too Light',phases:[
        {dur:.22,ease:'outCubic',pose:{hold:[.16,1.72,-.16],tip:[.06,.72,-.70],roll:.02,twist:.06,pitch:-.28,lean:.02,hipTwist:.08,hip:[0,0,-.09],lower:-.08,head:[.02,-.24]}},
        {dur:.10,ease:'inCubic',contact:true,pose:{hold:[-.34,.54,.72],tip:[-.52,-.78,.34],roll:-.38,twist:-.44,pitch:.42,lean:-.34,hipTwist:-.34,hip:[-.10,0,.10],lower:.24,lunge:.30,head:[-.18,.28]}},
        {dur:.26,ease:'outQuad',pose:{hold:[-.58,.42,.34],tip:[-.70,-.66,.24],roll:-.54,twist:-.58,pitch:.34,lean:-.46,hipTwist:-.46,hip:[-.14,0,.08],lower:.22,lunge:.12,head:[-.24,.22]}},
        {dur:.46,ease:'outBack',pose:'IDLE'},
      ],
    });
  }
  return true;
}

function paceSnapshot(PC,weaponId){
  const tune=PC.combatState.tune;
  return{
    weaponId,
    weight:Number(tune.weight),
    windup:Number(tune.windup),
    follow:Number(tune.follow),
    recovery:Number(tune.recovery),
  };
}

function restorePace(PC,baseline,currentWeaponId){
  if(!baseline||baseline.weaponId!==currentWeaponId)return false;
  const tune=PC.combatState.tune;
  for(const key of ['weight','windup','follow','recovery']){
    if(Number.isFinite(baseline[key]))tune[key]=baseline[key];
  }
  return true;
}

function applyLegacyPace(PC,profile){
  const tune=PC.combatState.tune;
  const length=Number(tune.length)||1;
  const strike=Math.max(.36,Number(profile.pace.strike)||1);
  const effectiveWeight=(strike-1-(length-1)*.36)/.78+.35;
  tune.weight=Math.max(-.15,Math.min(1.25,effectiveWeight));
  tune.windup=Math.max(.2,(Number(profile.pace.windup)||strike)/strike);
  tune.follow=Math.max(.2,(Number(profile.pace.follow)||strike)/strike);
  tune.recovery=Math.max(.2,(Number(profile.pace.recovery)||strike)/strike);
}

function applyPace(PC,profile,balance){
  const tune=PC.combatState.tune;
  // Failed class pairings keep their authored failure timing. Every usable
  // pairing starts from the weapon's own tune and receives only the bounded
  // matrix adjustment, so a stance cannot erase the weapon's identity.
  if(profile?.failed){
    applyLegacyPace(PC,profile);
    return;
  }
  const tempo=balance?.tempo||{};
  const attack=Math.max(.84,Math.min(1.16,Number(tempo.attack)||1));
  const recovery=Math.max(.84,Math.min(1.20,Number(tempo.recovery)||1));
  tune.windup=Math.max(.2,Number(tune.windup||1)*attack);
  tune.follow=Math.max(.2,Number(tune.follow||1)*attack);
  tune.recovery=Math.max(.2,Number(tune.recovery||1)*recovery);
}

function gripSnapshot(PC){
  return{
    gripCenter:PC.RIG.gripCenter,
    handR:[PC.RIG.handR.x,PC.RIG.handR.y,PC.RIG.handR.z],
    handL:[PC.RIG.handL.x,PC.RIG.handL.y,PC.RIG.handL.z],
  };
}

function restoreGrip(PC,baseline){
  if(!baseline)return false;
  PC.RIG.gripCenter=baseline.gripCenter;
  PC.RIG.handR.set(...baseline.handR);
  PC.RIG.handL.set(...baseline.handL);
  return true;
}

function applyGrip(PC,profile){
  if(profile.gripMode==='normal')return;
  const RIG=PC.RIG;
  const bladeLen=Math.max(.08,RIG.bladeTip-RIG.bladeBase);
  if(profile.gripMode==='halfSword'){
    RIG.gripCenter=RIG.bladeBase+bladeLen*.18;
    RIG.handR.set(0,-.02,.02);
    RIG.handL.set(0,RIG.bladeBase+bladeLen*.34,-.01);
  }else if(profile.gripMode==='closeTwoHand'){
    RIG.handR.set(0,-.03,.02);
    RIG.handL.set(0,-.10,-.01);
  }else if(profile.gripMode==='braced'){
    RIG.handR.set(0,-.03,.02);
    RIG.handL.set(0,-.30,-.03);
  }else if(profile.gripMode==='failedHeavy'){
    RIG.handR.set(.02,-.02,.02);
    RIG.handL.set(-.02,-.18,-.02);
  }else if(profile.gripMode==='failedLight'){
    RIG.handR.set(0,-.02,.02);
    RIG.handL.set(0,-.12,-.02);
  }
}

function resetCombatForPair(handle){
  const c=handle.arena.chain||{};
  Object.assign(c,{
    stage:'idle',comboDeadline:0,finisherDeadline:0,inputLockT:0,lightLockT:0,
    activeSlot:-1,pendingSlot:-1,pendingStage:null,pendingExpiresAt:0,pendingInput:null,
  });
  const charge=handle.arena.charge||{};
  Object.assign(charge,{active:false,queued:false,buttonHeld:false,hold:0,forceTier:null});
  const state=handle.PC.combatState;
  state.attack=null;state.t=0;state.pending=null;state.pendingGroup=null;state.readyLock=0;state.chargePull=0;
}

export function createStanceGate2Runtime({arenaHandle,windowRef=globalThis.window}={}){
  const handle=arenaHandle;
  const PC=handle?.PC;
  if(!handle?.arena||!PC?.combatState)throw new Error('[stance-gate2] missing Combat Arena handle');
  injectGate2FailureAttacks(PC);

  const original={
    updateCombat:PC.updateCombat,
    getWeaponHitZones:PC.getWeaponHitZones,
    setReadyPose:PC.setReadyPose,
    selectCombatWeapon:PC.selectCombatWeapon,
    startCombatAttack:PC.startCombatAttack,
  };
  let modifiedStance=null;
  let activeContextKey=null;
  let paceBaseline=null;
  let gripBaseline=null;
  let lastSnapshot=null;

  function cloneRuntimeStance(stance){
    return{...stance,chain:[...(stance?.chain||[])]};
  }

  function restoreStanceChain(stance){
    if(!stance)return;
    const baseline=BASELINE_CHAIN_BY_ID.get(stance.id);
    if(baseline&&!Object.isFrozen(stance))stance.chain=[...baseline];
    if(modifiedStance===stance){
      const canonical=STANCE_BY_ID.get(stance.id);
      if(canonical&&canonical!==stance&&handle.arena.stance===stance)handle.arena.stance=canonical;
      modifiedStance=null;
    }
  }

  function current(){
    const stance=handle.arena.stance||null;
    const weaponId=String(PC.combatState.weapon||'');
    const weapon=PC.currentWeapon?.()||null;
    return resolveGate2PilotProfile({stance,weapon,weaponId});
  }

  function leaveContext(currentWeaponId){
    restorePace(PC,paceBaseline,currentWeaponId);
    restoreGrip(PC,gripBaseline);
    paceBaseline=null;
    gripBaseline=null;
    activeContextKey=null;
  }

  function apply(){
    const resolved=current();
    let stance=handle.arena.stance||null;
    const weaponId=resolved.weaponId;
    const nextContext=resolved.active?pairKey(resolved.stanceId,weaponId):null;

    if(modifiedStance&&modifiedStance!==stance)restoreStanceChain(modifiedStance);
    if(resolved.active&&resolved.profile?.failed&&resolved.profile?.moveKeys&&stance){
      if(stance!==modifiedStance){
        stance=cloneRuntimeStance(stance);
        handle.arena.stance=stance;
      }
      stance.chain=[...resolved.profile.moveKeys];
      modifiedStance=stance;
    }else if(stance&&modifiedStance===stance){
      restoreStanceChain(stance);
    }

    if(nextContext!==activeContextKey){
      leaveContext(weaponId);
      if(resolved.active){
        activeContextKey=nextContext;
        paceBaseline=paceSnapshot(PC,weaponId);
        gripBaseline=gripSnapshot(PC);
      }
    }
    if(resolved.active){
      // Rebase every frame from the captured weapon tune so the matrix is
      // idempotent while the stance/runtime hooks are evaluated repeatedly.
      restorePace(PC,paceBaseline,weaponId);
      applyPace(PC,resolved.profile,resolved.balance);
      restoreGrip(PC,gripBaseline);
      applyGrip(PC,resolved.profile);
    }

    lastSnapshot=Object.freeze({
      active:resolved.active,
      stanceId:resolved.stanceId,
      weaponId:resolved.weaponId,
      tier:resolved.compatibility.tier,
      label:resolved.profile?.label||'UNKNOWN STANCE 2 PAIR',
      profileId:resolved.profile?.id||null,
      failed:!!resolved.profile?.failed,
      attackAdapterId:getStanceAttackAdapter(resolved.compatibility.stanceClass,resolved.compatibility.weaponClass)?.id||null,
      effectiveChain:Object.freeze([...resolved.effectiveChain]),
      gripMode:resolved.profile?.gripMode||'normal',
      pace:resolved.profile?Object.freeze({...resolved.profile.pace}):null,
      balance:resolved.balance||null,
    });
    PC.combatState.stance2Gate2=lastSnapshot;
    return resolved;
  }

  PC.updateCombat=function(...args){apply();return original.updateCombat.apply(this,args);};
  PC.getWeaponHitZones=function(...args){
    const resolved=apply();
    const zones=original.getWeaponHitZones.apply(this,args)||[];
    const profile=resolved.active?resolved.profile:null;
    if(!profile)return zones;
    if(profile.failed)return[];
    if(profile.tier!=='adapted')return zones;
    const pivot=PC.RIG.gripCenter;
    for(const zone of zones){
      zone.from.y=pivot+(zone.from.y-pivot)*profile.reachMult;
      zone.to.y=pivot+(zone.to.y-pivot)*profile.reachMult;
      zone.damage*=profile.damageMult;
      zone.stagger*=profile.staggerMult;
      zone.stance2Adapted=true;
    }
    return zones;
  };
  PC.setReadyPose=function(...args){const result=original.setReadyPose.apply(this,args);apply();return result;};
  PC.selectCombatWeapon=function(...args){const result=original.selectCombatWeapon.apply(this,args);apply();return result;};
  PC.startCombatAttack=function(key,group,...rest){
    const resolved=apply();
    const slot=Number(handle.arena.chain?.activeSlot);
    const replacement=resolved.active&&resolved.profile?.failed&&resolved.profile?.moveKeys&&slot>=0?resolved.profile.moveKeys[slot]:null;
    const resolvedKey=replacement&&PC.ATTACKS[replacement]?replacement:key;
    const invoke=()=>{
      const resolvedGroup=PC.ATTACKS[resolvedKey]?.group||group;
      return original.startCombatAttack.call(this,resolvedKey,resolvedGroup,...rest);
    };
    const adapted=resolved.active&&!resolved.profile?.failed&&resolved.compatibility.tier==='adapted'&&resolvedKey===key;
    const result=adapted
      ?withAdaptedStanceAttack(PC,key,resolved.compatibility.stanceClass,resolved.compatibility.weaponClass,invoke)
      :invoke();
    if(resolved.profile?.failed&&handle.arena.charge){
      handle.arena.charge.active=false;
      handle.arena.charge.queued=false;
      handle.arena.charge.forceTier=null;
      PC.combatState.chargePull=0;
    }
    return result;
  };

  function selectPair({stanceId,weaponId}={}){
    const stance=STANCE_BY_ID.get(String(stanceId||''));
    const requestedWeapon=String(weaponId||'');
    if(!stance||!STONE_WEAPONS[requestedWeapon])return{ok:false,error:'Unknown Stance 2 pair'};
    resetCombatForPair(handle);
    if(PC.combatState.weapon!==requestedWeapon)PC.selectCombatWeapon(requestedWeapon);
    if(modifiedStance&&modifiedStance!==stance)restoreStanceChain(modifiedStance);
    handle.arena.stance=stance;
    handle.arena.stanceIndex=0;
    resetCombatForPair(handle);
    PC.setReadyPose(guardPoseFor(stance));
    const resolved=apply();
    return{ok:true,resolved,snapshot:lastSnapshot};
  }

  apply();
  const api={
    installed:true,
    apply,
    selectPair,
    snapshot:()=>lastSnapshot,
    resolve:current,
    destroy(){
      if(modifiedStance)restoreStanceChain(modifiedStance);
      leaveContext(String(PC.combatState.weapon||''));
      PC.updateCombat=original.updateCombat;
      PC.getWeaponHitZones=original.getWeaponHitZones;
      PC.setReadyPose=original.setReadyPose;
      PC.selectCombatWeapon=original.selectCombatWeapon;
      PC.startCombatAttack=original.startCombatAttack;
      delete PC.combatState.stance2Gate2;
      if(installedStanceGate2Runtime===api)installedStanceGate2Runtime=null;
    },
  };
  return api;
}

let installedStanceGate2Runtime=null;

export function installStanceGate2Runtime({arenaHandle=getArenaRuntime()}={}){
  if(installedStanceGate2Runtime?.installed)return installedStanceGate2Runtime;
  const handle=arenaHandle||getArenaRuntime();
  if(!handle?.PC||!handle?.arena)return{installed:false,reason:'missing-arena-runtime'};
  installedStanceGate2Runtime=createStanceGate2Runtime({arenaHandle:handle});
  return installedStanceGate2Runtime;
}
