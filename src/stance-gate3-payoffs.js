import { resolveGate2PilotProfile } from './stance-gate2-runtime.js';
import {
  movementMultiplierDuringAttack,
  postSwingMovementMultiplier,
  resolveStanceMovementProfile,
} from './stance-movement-profiles.js';

const pairKey=(stanceId,weaponId)=>`${stanceId}:${weaponId}`;
const freezePayoff=payoff=>Object.freeze({...payoff});

export const GATE3_FULL_PAYOFFS=Object.freeze({
  [pairKey('S24','dagger')]:freezePayoff({
    id:'light-mobile-expression',
    stanceClass:'Light',
    weaponClass:'Light',
    label:'MOBILE EXPRESSION',
    cleaveMode:'full-light',
    summary:'Normal attacks remain mobile with no post-swing movement penalty; only the fully charged finisher may cleave.',
  }),
  [pairKey('S26','longsword')]:freezePayoff({
    id:'medium-confirmed-form',
    stanceClass:'Medium',
    weaponClass:'Medium',
    label:'CONFIRMED FORM',
    comboWindowBonus:.35,
    cleaveMode:'full-medium',
    summary:'A landed first light adds 0.35 seconds to the follow-up window; cuts cleave while thrusts stay focused.',
  }),
  [pairKey('S01','greatsword')]:freezePayoff({
    id:'heavy-breaking-form',
    stanceClass:'Heavy',
    weaponClass:'Heavy',
    label:'BREAKING FORM',
    staggerMult:2,
    stunFloor:.42,
    chargedStunFloor:.78,
    cleaveMode:'full-heavy',
    summary:'All attacks cleave, stagger is doubled, and heavy impacts cross a minimum stun threshold.',
  }),
});

export function resolveGate3FullPayoff({stance,weapon,weaponId=''}={}){
  const stanceId=String(stance?.id||stance||'');
  const resolvedWeaponId=String(weaponId||weapon?.id||'');
  const gate2=resolveGate2PilotProfile({stance,weapon,weaponId:resolvedWeaponId});
  const payoff=GATE3_FULL_PAYOFFS[pairKey(stanceId,resolvedWeaponId)]||null;
  return Object.freeze({
    active:!!payoff&&gate2.active&&gate2.compatibility.tier==='full',
    stanceId,
    weaponId:resolvedWeaponId,
    gate2,
    payoff,
  });
}

export function cleaveModeForGate3Expression({stance,weapon,weaponId=''}={}){
  const gate2=resolveGate2PilotProfile({stance,weapon,weaponId});
  if(!gate2.active)return null;
  if(gate2.compatibility.tier==='unusable')return'failed';
  const full=resolveGate3FullPayoff({stance,weapon,weaponId});
  if(full.active)return full.payoff.cleaveMode;
  const weaponClass=String(gate2.compatibility.weaponClass||'').toLowerCase();
  return weaponClass?`adapted-${weaponClass}`:'adapted';
}

function clearWeaponGate3State(weapon){
  if(!weapon)return;
  delete weapon.stance2CleaveMode;
  delete weapon.stance2CurrentAttackGroup;
}

export function createStanceGate3Runtime({arenaHandle,basePlayerSpeed=8.5}={}){
  const handle=arenaHandle;
  const PC=handle?.PC;
  const arena=handle?.arena;
  if(!arena||!PC?.combatState)throw new Error('[stance-gate3] missing Combat Arena handle');

  const original={
    updateCombat:PC.updateCombat,
    getWeaponHitZones:PC.getWeaponHitZones,
    combatMovePenalty:PC.combatMovePenalty,
    startCombatAttack:PC.startCombatAttack,
  };
  let modifiedWeapon=null;
  let attackSerial=0;
  let lastExtendedSerial=-1;
  let lastSnapshot=null;
  let lastActorPosition=readActorPosition();
  const movementRecovery={active:false,profile:null,elapsed:0};

  function readActorPosition(){
    const actorPos=handle?.actorPos;
    if(!actorPos)return null;
    const x=Number(actorPos.x),z=Number(actorPos.y??actorPos.z);
    return Number.isFinite(x)&&Number.isFinite(z)?{x,z}:null;
  }
  function writeActorPosition(position){
    const actorPos=handle?.actorPos;
    if(!actorPos||!position)return;
    actorPos.x=position.x;
    if(Number.isFinite(Number(actorPos.y)))actorPos.y=position.z;
    else actorPos.z=position.z;
  }
  function clearMovementRecovery(){
    movementRecovery.active=false;
    movementRecovery.profile=null;
    movementRecovery.elapsed=0;
  }
  function beginMovementRecovery(profile){
    if(!profile||profile.recoveryDuration<=0||profile.recoveryMode==='authored-failure'){
      clearMovementRecovery();
      return;
    }
    movementRecovery.active=true;
    movementRecovery.profile=profile;
    movementRecovery.elapsed=0;
  }

  function current(){
    const stance=arena.stance||null;
    const weaponId=String(PC.combatState.weapon||'');
    const weapon=PC.currentWeapon?.()||null;
    const gate2=resolveGate2PilotProfile({stance,weapon,weaponId});
    const full=resolveGate3FullPayoff({stance,weapon,weaponId});
    const movement=resolveStanceMovementProfile({stance,weapon,weaponId});
    const cleaveMode=cleaveModeForGate3Expression({stance,weapon,weaponId});
    return{stance,weaponId,weapon,gate2,full,movement,cleaveMode};
  }

  function apply(){
    const resolved=current();
    if(modifiedWeapon&&modifiedWeapon!==resolved.weapon)clearWeaponGate3State(modifiedWeapon);
    if(resolved.weapon&&resolved.gate2.active){
      resolved.weapon.stance2CleaveMode=resolved.cleaveMode;
      resolved.weapon.stance2CurrentAttackGroup=PC.combatState.attackGroup||'';
      modifiedWeapon=resolved.weapon;
    }else if(modifiedWeapon){
      clearWeaponGate3State(modifiedWeapon);
      modifiedWeapon=null;
    }
    if(movementRecovery.active&&movementRecovery.profile?.id!==resolved.movement.profile?.id)clearMovementRecovery();
    const recoveryDuration=Number(movementRecovery.profile?.recoveryDuration)||0;
    lastSnapshot=Object.freeze({
      active:resolved.full.active,
      stanceId:resolved.gate2.stanceId,
      weaponId:resolved.gate2.weaponId,
      tier:resolved.gate2.compatibility.tier,
      payoffId:resolved.full.payoff?.id||null,
      label:resolved.full.payoff?.label||'NO FULL-EXPRESSION PAYOFF',
      summary:resolved.full.payoff?.summary||'This pilot pairing keeps its Gate 2 expression but does not receive a matched-class Gate 3 payoff.',
      cleaveMode:resolved.cleaveMode,
      comboWindowBonus:resolved.full.payoff?.comboWindowBonus??null,
      staggerMult:resolved.full.payoff?.staggerMult??null,
      movementProfileId:resolved.movement.profile?.id||null,
      movementLabel:resolved.movement.profile?.label||null,
      movementSummary:resolved.movement.profile?.summary||null,
      recoveryMode:resolved.movement.profile?.recoveryMode||null,
      recoveryDuration:resolved.movement.profile?.recoveryDuration??null,
      recoveryRemaining:movementRecovery.active?Math.max(0,recoveryDuration-movementRecovery.elapsed):0,
    });
    PC.combatState.stance2Gate3=lastSnapshot;
    return resolved;
  }

  function applyPostSwingMovement(dt,resolved){
    if(!movementRecovery.active||PC.combatState.attack||arena.dodge?.t>=0)return;
    const profile=movementRecovery.profile;
    const multiplier=postSwingMovementMultiplier(profile,movementRecovery.elapsed);
    const currentPosition=readActorPosition();
    const input=handle?.arenaMoveInput?.()||null;
    const inputX=Number(input?.x)||0,inputZ=Number(input?.z)||0;
    const magnitude=Math.min(1,Math.hypot(inputX,inputZ));
    if(currentPosition&&lastActorPosition&&magnitude>.001&&multiplier<.999){
      const nx=inputX/magnitude,nz=inputZ/magnitude;
      const deltaX=currentPosition.x-lastActorPosition.x;
      const deltaZ=currentPosition.z-lastActorPosition.z;
      const along=Math.max(0,deltaX*nx+deltaZ*nz);
      const intended=Math.max(0,Number(basePlayerSpeed)||0)*Math.max(0,dt)*magnitude;
      const reduction=Math.min(along,intended*(1-multiplier));
      if(reduction>0){
        currentPosition.x-=nx*reduction;
        currentPosition.z-=nz*reduction;
        writeActorPosition(currentPosition);
      }
    }
    movementRecovery.elapsed+=Math.max(0,dt);
    if(movementRecovery.elapsed>=Number(profile.recoveryDuration)||!resolved.movement.active)clearMovementRecovery();
  }

  PC.startCombatAttack=function(...args){
    clearMovementRecovery();
    apply();
    attackSerial++;
    return original.startCombatAttack.apply(this,args);
  };

  PC.combatMovePenalty=function(...args){
    const resolved=apply();
    const base=original.combatMovePenalty.apply(this,args);
    const multiplier=movementMultiplierDuringAttack(
      resolved.movement.profile,
      PC.combatState.attack,
      PC.combatState.t,
    );
    return multiplier===null?base:multiplier;
  };

  PC.getWeaponHitZones=function(...args){
    const resolved=apply();
    const zones=original.getWeaponHitZones.apply(this,args)||[];
    if(!resolved.full.active)return zones;
    const payoff=resolved.full.payoff;
    if(Number.isFinite(payoff.staggerMult)){
      for(const zone of zones){
        zone.stagger*=payoff.staggerMult;
        zone.stance2Gate3Stagger=true;
      }
      const heavyFinisher=arena.chain?.activeSlot===2;
      const charged=heavyFinisher&&arena.swing?.maxChargeCleave===true;
      const floor=charged?payoff.chargedStunFloor:payoff.stunFloor;
      if(Number.isFinite(floor)&&arena.swing)arena.swing.stun=Math.max(Number(arena.swing.stun)||0,floor);
    }
    return zones;
  };

  PC.updateCombat=function(...args){
    const dt=Math.max(0,Number(args[0])||0);
    const before=apply();
    if(arena.dodge?.t>=0)clearMovementRecovery();
    applyPostSwingMovement(dt,before);
    const beforeAttack=PC.combatState.attack;
    const beforeSlot=Number(arena.chain?.activeSlot);
    const serial=attackSerial;
    const result=original.updateCombat.apply(this,args);
    const payoff=before.full.active?before.full.payoff:null;
    const landed=(PC.combatState.hitIds?.size||0)>0;
    const completed=!!beforeAttack&&!PC.combatState.attack;
    if(completed&&beforeSlot===0&&landed&&Number.isFinite(payoff?.comboWindowBonus)
      && arena.chain?.stage==='hit1Ready'&&lastExtendedSerial!==serial){
      arena.chain.comboDeadline+=payoff.comboWindowBonus;
      lastExtendedSerial=serial;
      if(lastSnapshot){
        lastSnapshot=Object.freeze({...lastSnapshot,lastComboExtension:payoff.comboWindowBonus});
        PC.combatState.stance2Gate3=lastSnapshot;
      }
    }
    if(completed)beginMovementRecovery(before.movement.profile);
    lastActorPosition=readActorPosition();
    apply();
    return result;
  };

  apply();
  const api={
    installed:true,
    apply,
    resolve:current,
    snapshot:()=>lastSnapshot,
    clearMovementRecovery,
    destroy(){
      clearMovementRecovery();
      clearWeaponGate3State(modifiedWeapon);
      modifiedWeapon=null;
      PC.updateCombat=original.updateCombat;
      PC.getWeaponHitZones=original.getWeaponHitZones;
      PC.combatMovePenalty=original.combatMovePenalty;
      PC.startCombatAttack=original.startCombatAttack;
      delete PC.combatState.stance2Gate3;
      if(installedStanceGate3Runtime===api)installedStanceGate3Runtime=null;
    },
  };
  return api;
}

let installedStanceGate3Runtime=null;

export function installStanceGate3Runtime({arenaHandle,gate2Runtime}={}){
  if(installedStanceGate3Runtime?.installed)return installedStanceGate3Runtime;
  if(!arenaHandle?.PC||!arenaHandle?.arena)return{installed:false,reason:'missing-arena-runtime'};
  if(!gate2Runtime?.installed)return{installed:false,reason:'missing-gate2-runtime'};
  installedStanceGate3Runtime=createStanceGate3Runtime({arenaHandle});
  return installedStanceGate3Runtime;
}
