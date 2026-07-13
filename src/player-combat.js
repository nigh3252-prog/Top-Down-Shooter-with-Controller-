// Branch-local integration wrapper for the maze-combat Pilebunker card.
// The untouched combat core is pinned to the exact commit this branch started
// from; this wrapper adds the ability without rewriting or destabilising the
// sword puppet. Non-arena pages receive the original combat core unchanged.

import { installPlayerCombat as installBasePlayerCombat } from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@4b54d50cf7b686fbfa727656ce18b7e6471db9c8/src/player-combat.js';
import { getWeaponDamageMultiplier } from './combat-balance.js';
import { createPowBunkerAbility, installPowBunkerTuningPanel } from './powbunker-ability.js';
import { installArenaEnemyRegistryProbe, getArenaEnemies } from './arena-enemy-registry.js';
import { createPilebunkerCombatEffect } from './pilebunker-combat-effect.js';

export function installPlayerCombat(api) {
  const PC=installBasePlayerCombat(api);
  const arenaPage=/(?:^|\/)combat-arena\.html$/i.test(location.pathname)||/HEX MAZE COMBAT/i.test(document.title);
  if(!arenaPage)return PC;

  const {THREE}=api;
  const UP=new THREE.Vector3(0,1,0);
  const shoulder=new THREE.Vector3();
  const localPoint=new THREE.Vector3();
  const worldTip=new THREE.Vector3();
  const worldBase=new THREE.Vector3();
  const playerWorld=new THREE.Vector3();
  const playerForward=new THREE.Vector3(0,0,1);
  const identityQ=new THREE.Quaternion();
  const ability=createPowBunkerAbility({THREE,scene:api.scene});
  installPowBunkerTuningPanel(ability);
  installArenaEnemyRegistryProbe();

  const original={
    attach:PC.attachCombatToActiveModel,
    update:PC.updateCombat,
    start:PC.startCombatAttack,
    trigger:PC.triggerCombatAttack,
    zones:PC.getWeaponHitZones,
    movePenalty:PC.combatMovePenalty,
  };

  let abilityHitSpec=null;
  const abilityBlocker={
    __powBunker:true,total:999,contactAt:1,comboAt:999,
    phases:[{t0:0,t1:999}],group:'ability',label:'PILEBUNKER',
  };

  function getPlayerTransform(){
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition)root.getWorldPosition(playerWorld);
    else playerWorld.set(0,0,0);
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);
    playerForward.y=0;
    if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);
    playerForward.normalize();
    return {x:playerWorld.x,z:playerWorld.z,forwardX:playerForward.x,forwardZ:playerForward.z};
  }

  const combatEffect=createPilebunkerCombatEffect({
    THREE,
    scene:api.scene,
    getEnemies:getArenaEnemies,
    getPlayer:getPlayerTransform,
    hitEnemy:hitArenaEnemy,
  });
  combatEffect.installPanel();

  /* ---------- optional weapon presentation while the card resolves ---------- */
  const carryHold=new THREE.Vector3();
  const carryTip=new THREE.Vector3();
  const carrySwordQ=new THREE.Quaternion();
  const carryRollQ=new THREE.Quaternion();
  const carryPlaneQ=new THREE.Quaternion();
  const carryPlaneBlendQ=new THREE.Quaternion();
  const carryParentQ=new THREE.Quaternion();
  const carryDesiredQ=new THREE.Quaternion();
  const carryIdentityQ=new THREE.Quaternion();
  const carryTargetQ=new THREE.Quaternion();
  const carryGripOff=new THREE.Vector3();
  const carryHoldRaw=new THREE.Vector3();
  const carryHoldW=new THREE.Vector3();
  const carryShoulderMid=new THREE.Vector3();
  const carryTargetPos=new THREE.Vector3();
  const smooth01=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  function presentationBlend(){
    const p=ability.progress;
    return smooth01(p/.10)*(1-smooth01((p-.80)/.20));
  }
  function applyAbilityWeaponPresentation(){
    const root=PC.weaponRoot;
    if(!root)return;
    if(!ability.active){root.visible=true;return;}
    const mode=ability.tuning.weaponMode;
    if(mode==='hidden'){root.visible=false;return;}
    root.visible=true;
    if(mode!=='left'&&mode!=='right')return;

    // Mirror the complete carry pose, not just its position. This gives two
    // genuinely opposite test choices even though the approved Pilebunker
    // animation's internal side labels do not match its visual handedness.
    const side=mode==='left'?-1:1;
    carryHold.set(.48*side,.72,-.10);
    carryTip.set(.18*side,-.28,-.94).normalize();
    const carryRoll=1.08*side;

    const activeModel=api.activeModel;
    carryParentQ.copy(api.actorVisual?.quaternion||carryIdentityQ).multiply(activeModel?.quaternion||carryIdentityQ);
    carryDesiredQ.copy(api.yawQ||carryIdentityQ);
    carryPlaneQ.copy(carryParentQ).invert().multiply(carryDesiredQ);
    const floorBlend=PC.getCombatFloorBlend();
    if(floorBlend<.999){carryPlaneBlendQ.copy(carryIdentityQ).slerp(carryPlaneQ,floorBlend);carryPlaneQ.copy(carryPlaneBlendQ);}

    carrySwordQ.setFromUnitVectors(UP,carryTip);
    carryRollQ.setFromAxisAngle(carryTip,carryRoll);
    carrySwordQ.premultiply(carryRollQ);
    carryTargetQ.copy(carryPlaneQ).multiply(carrySwordQ);

    const drop=PC.getCombatShoulderDrop();
    carryShoulderMid.set(0,1.20-drop,.36);
    PC.combatToWarden(carryHold,carryHoldRaw);
    carryHoldW.copy(carryHoldRaw).sub(carryShoulderMid).applyQuaternion(carryPlaneQ).add(carryShoulderMid);
    carryGripOff.set(0,PC.RIG.gripCenter,0).applyQuaternion(carryTargetQ).multiplyScalar(PC.getCombatScale());
    carryTargetPos.copy(carryHoldW).sub(carryGripOff);

    const k=presentationBlend();
    root.position.lerp(carryTargetPos,k);
    root.quaternion.slerp(carryTargetQ,k);
    root.updateWorldMatrix(true,false);
  }

  function canPlay(){return !!api.activeModel&&!ability.active&&!PC.combatState.attack;}
  window.__POWBUNKER_CAN_PLAY__=canPlay;
  window.__POWBUNKER=ability;
  window.__PILEBUNKER_EFFECT__=combatEffect;

  function ensureAttached(){const parent=api.actorVisual;if(parent)ability.attach(parent);}

  PC.attachCombatToActiveModel=function attachCombatToActiveModelWithPowBunker(){
    const out=original.attach();ensureAttached();return out;
  };
  PC.startCombatAttack=function startCombatAttackWithAbilityGuard(...args){if(ability.active)return false;return original.start(...args);};
  PC.triggerCombatAttack=function triggerCombatAttackWithAbilityGuard(...args){if(ability.active)return false;return original.trigger(...args);};
  PC.combatMovePenalty=function combatMovePenaltyWithAbility(){if(ability.active)return .34;return original.movePenalty();};

  PC.getWeaponHitZones=function getWeaponHitZonesWithPowBunker(){
    if(!abilityHitSpec)return original.zones();
    const weaponDef=PC.currentWeapon();
    const common={
      weaponId:PC.combatState.weapon,
      weaponDef,
      attackKey:'vertical',
      attackGroup:'vertical',
      hitType:'blunt',
    };
    const zoneId=abilityHitSpec.role==='primary'?'pilebunkerPrimary':'pilebunkerSecondary';
    const mult=getWeaponDamageMultiplier({...common,zoneId});
    // The arena adds a .82–1.24 contact-quality factor. The large target-centred
    // capsule normally lands near the high end; this keeps requested effect
    // damage close to its tuning value without coupling to the equipped weapon.
    const damage=abilityHitSpec.damage/Math.max(.001,mult*1.18);
    return [{
      id:zoneId,
      label:abilityHitSpec.role==='primary'?'Pilebunker One on One':'Pilebunker detonation',
      type:'blunt',
      from:new THREE.Vector3(0,-1.25,0),
      to:new THREE.Vector3(0,1.25,0),
      radius:abilityHitSpec.radius,
      damage,
      stagger:0,
      prefer:'any',
    }];
  };

  function hitArenaEnemy(enemy, options={}){
    const weaponRoot=PC.weaponRoot;
    const parent=weaponRoot?.parent;
    const enemies=getArenaEnemies();
    if(!enemy||enemy.hp<=0||!weaponRoot||!parent||!api.hooks?.detectHits)return false;

    const point=options.point?.isVector3
      ? options.point
      : new THREE.Vector3(enemy.x,Math.max(.8,(enemy.height||2)*.48),enemy.z);
    const motion=options.motion||{x:0,z:1};
    const length=Math.hypot(motion.x||0,motion.z||0)||1;
    const mx=(motion.x||0)/length,mz=(motion.z||0)/length;
    const previousStun=enemy.stunned||0;
    const old={
      position:weaponRoot.position.clone(),quaternion:weaponRoot.quaternion.clone(),scale:weaponRoot.scale.clone(),visible:weaponRoot.visible,
      attack:PC.combatState.attack,attackKey:PC.combatState.attackKey,attackGroup:PC.combatState.attackGroup,weapon:PC.combatState.weapon,
      hitIds:PC.combatState.hitIds,singleTargetEnemy:PC.combatState.singleTargetEnemy,fired:PC.combatState.fired,
    };
    let landed=false;
    try{
      parent.updateMatrixWorld(true);
      localPoint.copy(point);parent.worldToLocal(localPoint);
      weaponRoot.visible=false;
      weaponRoot.position.copy(localPoint);
      weaponRoot.quaternion.identity();
      weaponRoot.scale.setScalar(1);
      weaponRoot.updateMatrixWorld(true);

      abilityHitSpec={
        damage:Number(options.damage)||1,
        role:options.role||'secondary',
        radius:Math.max(2.4,(enemy.radius||1)*2.25),
      };
      PC.combatState.weapon='dagger';
      PC.combatState.attack={total:.01,contactAt:0,comboAt:0,phases:[{t0:0,t1:.01}]};
      PC.combatState.attackKey='vertical';
      PC.combatState.attackGroup='vertical';
      // Pre-mark every other enemy so the arena's normal hit pipeline can only
      // resolve this explicitly selected victim, even inside the compressed pack.
      PC.combatState.hitIds=new Set(enemies.filter(candidate=>candidate!==enemy));
      PC.combatState.singleTargetEnemy=enemy;
      PC.combatState.fired=true;
      worldTip.copy(point).add(new THREE.Vector3(mx,0,mz));
      worldBase.copy(point).add(new THREE.Vector3(-mx,0,-mz));
      api.hooks.detectHits(.016,worldTip,worldBase,42);
      landed=PC.combatState.hitIds.has(enemy);
      if(landed&&enemy.hp>0){
        enemy.stunned=Math.max(previousStun,Number(options.stun)||0);
        const knock=Number(options.knock)||0;
        enemy.knockX=(enemy.knockX||0)+mx*knock;
        enemy.knockZ=(enemy.knockZ||0)+mz*knock;
      }
    }finally{
      abilityHitSpec=null;
      PC.combatState.attack=old.attack;
      PC.combatState.attackKey=old.attackKey;
      PC.combatState.attackGroup=old.attackGroup;
      PC.combatState.weapon=old.weapon;
      PC.combatState.hitIds=old.hitIds;
      PC.combatState.singleTargetEnemy=old.singleTargetEnemy;
      PC.combatState.fired=old.fired;
      weaponRoot.position.copy(old.position);
      weaponRoot.quaternion.copy(old.quaternion);
      weaponRoot.scale.copy(old.scale);
      weaponRoot.visible=old.visible;
      weaponRoot.updateMatrixWorld(true);
    }
    return landed;
  }

  function playFromCard(){
    if(!canPlay())return false;
    ensureAttached();
    if(PC.weaponRoot)PC.weaponRoot.visible=true;
    PC.combatState.pending=null;PC.combatState.pendingGroup=null;PC.combatState.readyLock=0;
    const started=ability.start();
    if(started){
      combatEffect.start();
      PC.combatState.attack=abilityBlocker;
      PC.combatState.attackKey='powBunker';
      PC.combatState.attackGroup='ability';
      PC.combatState.t=0;
      PC.combatState.fired=true;
      PC.combatState.hitIds=new Set();
      window.dispatchEvent(new CustomEvent('powbunker:started'));
    }
    return started;
  }
  window.addEventListener('powbunker:play',playFromCard);

  PC.updateCombat=function updateCombatWithPowBunker(dt,now,sway,rawDt=dt){
    const state=PC.combatState;
    const wasAbilityActive=ability.active;
    if(wasAbilityActive){state.attack=null;state.pending=null;state.pendingGroup=null;state.pendingLabEvent=null;}
    const out=original.update(dt,now,sway,rawDt);
    if(wasAbilityActive){
      state.attack=abilityBlocker;
      state.attackKey='powBunker';
      state.attackGroup='ability';
      state.t=0;
      state.fired=true;
      state.hitIds||=new Set();
    }
    ensureAttached();

    const model=api.activeModel,actorVisual=api.actorVisual;
    if(model&&actorVisual){
      shoulder.set(.72,1.20-PC.getCombatShoulderDrop(),.36);
      model.updateMatrixWorld(true);model.localToWorld(shoulder);
      actorVisual.updateMatrixWorld(true);actorVisual.worldToLocal(shoulder);
      ability.update(dt,{anchor:shoulder,time:now,rawDt});
      applyAbilityWeaponPresentation();
      ability.applyHostPose(model,api.W);
    }else{
      ability.update(dt,{time:now,rawDt});
      applyAbilityWeaponPresentation();
    }

    if(ability.active){
      combatEffect.update({phase:ability.phase,progress:ability.progress,dt,rawDt});
    }

    const ev=ability.consumeEvents();
    if(ev.slam){
      state.hitStop=Math.max(state.hitStop,.07*1.35);
      state.wobble.vel+=(Math.random()<.5?-1:1)*7.4;
    }
    if(ev.hit){
      const result=combatEffect.impact(ev.hit);
      const landed=!!result.landed;
      ability.impactFeedback(ev.hit,landed);
      if(landed){
        state.hitStop=Math.max(state.hitStop,.115);
        state.wobble.vel+=(Math.random()<.5?-1:1)*10.5;
      }
    }
    if(ev.finished){
      combatEffect.finish();
      if(PC.weaponRoot)PC.weaponRoot.visible=true;
      state.attack=null;
      state.attackKey=null;
      state.attackGroup='vertical';
      state.t=0;
      state.fired=false;
      state.pending=null;
      state.pendingGroup=null;
      state.pendingLabEvent=null;
      window.dispatchEvent(new CustomEvent('powbunker:finished'));
    }
    return out;
  };

  Object.defineProperty(PC,'powBunkerAbility',{value:ability,enumerable:true});
  Object.defineProperty(PC,'pilebunkerCombatEffect',{value:combatEffect,enumerable:true});
  return PC;
}
