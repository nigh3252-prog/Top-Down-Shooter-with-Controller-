// Branch-local integration wrapper for the maze-combat Pilebunker card.
// The untouched combat core is pinned to the exact commit this branch started
// from; this wrapper adds the ability without rewriting or destabilising the
// sword puppet. Non-arena pages receive the original combat core unchanged.

import { installPlayerCombat as installBasePlayerCombat } from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@4b54d50cf7b686fbfa727656ce18b7e6471db9c8/src/player-combat.js';
import { getWeaponDamageMultiplier } from './combat-balance.js';
import { createPowBunkerAbility, installPowBunkerTuningPanel } from './powbunker-ability.js';
import { installArenaEnemyRegistryProbe, getArenaEnemies } from './arena-enemy-registry.js';
import { createPilebunkerCombatEffect } from './pilebunker-combat-effect.js';

export function installPlayerCombat(api){
  const PC=installBasePlayerCombat(api);
  const arenaPage=/(?:^|\/)combat-arena\.html$/i.test(location.pathname)||/HEX MAZE COMBAT/i.test(document.title);
  if(!arenaPage)return PC;

  const {THREE}=api;
  const UP=new THREE.Vector3(0,1,0),shoulder=new THREE.Vector3(),localPoint=new THREE.Vector3(),worldTip=new THREE.Vector3(),worldBase=new THREE.Vector3();
  const playerWorld=new THREE.Vector3(),playerForward=new THREE.Vector3(0,0,1),identityQ=new THREE.Quaternion();
  const ability=createPowBunkerAbility({THREE,scene:api.scene});
  installPowBunkerTuningPanel(ability);
  installArenaEnemyRegistryProbe();

  const original={attach:PC.attachCombatToActiveModel,update:PC.updateCombat,start:PC.startCombatAttack,trigger:PC.triggerCombatAttack,zones:PC.getWeaponHitZones,movePenalty:PC.combatMovePenalty};
  let abilityHitSpec=null;
  const abilityBlocker={__powBunker:true,total:999,contactAt:1,comboAt:999,phases:[{t0:0,t1:999}],group:'ability',label:'PILEBUNKER'};

  function getPlayerTransform(){
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition)root.getWorldPosition(playerWorld);else playerWorld.set(0,0,0);
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);playerForward.y=0;if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);playerForward.normalize();
    return{x:playerWorld.x,z:playerWorld.z,forwardX:playerForward.x,forwardZ:playerForward.z};
  }

  const combatEffect=createPilebunkerCombatEffect({THREE,scene:api.scene,getEnemies:getArenaEnemies,getPlayer:getPlayerTransform,hitEnemy:hitArenaEnemy});
  combatEffect.installPanel();

  /* guided Pilebunker aim: movement-stick direction, retained when centred */
  const guidedAim={active:false,yaw:0,lastRoot:new THREE.Vector3(),currentRoot:new THREE.Vector3(),keys:new Set()};
  const wrapPi=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
  addEventListener('keydown',event=>guidedAim.keys.add(event.key.toLowerCase()));
  addEventListener('keyup',event=>guidedAim.keys.delete(event.key.toLowerCase()));
  function beginGuidedAim(){
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);playerForward.y=0;if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);playerForward.normalize();
    guidedAim.yaw=Math.atan2(playerForward.x,playerForward.z);guidedAim.active=true;
    const root=api.actorVisual?.parent;if(root?.getWorldPosition)root.getWorldPosition(guidedAim.lastRoot);else guidedAim.lastRoot.set(0,0,0);
  }
  function readAimInput(){
    let x=0,z=0;
    const gp=navigator.getGamepads?.()[0];
    if(gp){const dz=v=>Math.abs(v)>.16?v:0;x=dz(gp.axes[0]||0);z=dz(gp.axes[1]||0);}
    if(Math.hypot(x,z)<.16){
      if(guidedAim.keys.has('a')||guidedAim.keys.has('arrowleft'))x-=1;
      if(guidedAim.keys.has('d')||guidedAim.keys.has('arrowright'))x+=1;
      if(guidedAim.keys.has('w')||guidedAim.keys.has('arrowup'))z-=1;
      if(guidedAim.keys.has('s')||guidedAim.keys.has('arrowdown'))z+=1;
    }
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition){
      root.getWorldPosition(guidedAim.currentRoot);
      const dx=guidedAim.currentRoot.x-guidedAim.lastRoot.x,dz=guidedAim.currentRoot.z-guidedAim.lastRoot.z;
      guidedAim.lastRoot.copy(guidedAim.currentRoot);
      if(Math.hypot(x,z)<.16&&Math.hypot(dx,dz)>.0025){x=dx;z=dz;}
    }
    const length=Math.hypot(x,z);return length>.12?{x:x/length,z:z/length}:null;
  }
  function updateGuidedAim(rawDt){
    if(!ability.active||combatEffect.aimMode!=='guided'){guidedAim.active=false;return;}
    if(!guidedAim.active)beginGuidedAim();
    const input=readAimInput();
    if(input){
      const target=Math.atan2(input.x,input.z),turn=Math.min(1,Math.max(0,rawDt)*11);
      guidedAim.yaw=wrapPi(guidedAim.yaw+wrapPi(target-guidedAim.yaw)*turn);
    }
    api.yawQ?.setFromAxisAngle(UP,guidedAim.yaw);
    if(api.actorVisual&&api.yawQ)api.actorVisual.quaternion.copy(api.yawQ);
  }
  function endGuidedAim(){guidedAim.active=false;}

  /* optional weapon presentation while the card resolves */
  const carryHold=new THREE.Vector3(),carryTip=new THREE.Vector3(),carrySwordQ=new THREE.Quaternion(),carryRollQ=new THREE.Quaternion(),carryPlaneQ=new THREE.Quaternion(),carryPlaneBlendQ=new THREE.Quaternion(),carryParentQ=new THREE.Quaternion(),carryDesiredQ=new THREE.Quaternion(),carryIdentityQ=new THREE.Quaternion(),carryTargetQ=new THREE.Quaternion(),carryGripOff=new THREE.Vector3(),carryHoldRaw=new THREE.Vector3(),carryHoldW=new THREE.Vector3(),carryShoulderMid=new THREE.Vector3(),carryTargetPos=new THREE.Vector3();
  const smooth01=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  function presentationBlend(){const p=ability.progress;return smooth01(p/.10)*(1-smooth01((p-.80)/.20));}
  function applyAbilityWeaponPresentation(){
    const root=PC.weaponRoot;if(!root)return;
    if(!ability.active){root.visible=true;return;}
    const mode=ability.tuning.weaponMode;if(mode==='hidden'){root.visible=false;return;}root.visible=true;if(mode!=='left'&&mode!=='right')return;
    const side=mode==='left'?-1:1;carryHold.set(.48*side,.72,-.10);carryTip.set(.18*side,-.28,-.94).normalize();const carryRoll=1.08*side;
    const activeModel=api.activeModel;carryParentQ.copy(api.actorVisual?.quaternion||carryIdentityQ).multiply(activeModel?.quaternion||carryIdentityQ);carryDesiredQ.copy(api.yawQ||carryIdentityQ);carryPlaneQ.copy(carryParentQ).invert().multiply(carryDesiredQ);
    const floorBlend=PC.getCombatFloorBlend();if(floorBlend<.999){carryPlaneBlendQ.copy(carryIdentityQ).slerp(carryPlaneQ,floorBlend);carryPlaneQ.copy(carryPlaneBlendQ);}
    carrySwordQ.setFromUnitVectors(UP,carryTip);carryRollQ.setFromAxisAngle(carryTip,carryRoll);carrySwordQ.premultiply(carryRollQ);carryTargetQ.copy(carryPlaneQ).multiply(carrySwordQ);
    const drop=PC.getCombatShoulderDrop();carryShoulderMid.set(0,1.20-drop,.36);PC.combatToWarden(carryHold,carryHoldRaw);carryHoldW.copy(carryHoldRaw).sub(carryShoulderMid).applyQuaternion(carryPlaneQ).add(carryShoulderMid);carryGripOff.set(0,PC.RIG.gripCenter,0).applyQuaternion(carryTargetQ).multiplyScalar(PC.getCombatScale());carryTargetPos.copy(carryHoldW).sub(carryGripOff);
    const k=presentationBlend();root.position.lerp(carryTargetPos,k);root.quaternion.slerp(carryTargetQ,k);root.updateWorldMatrix(true,false);
  }

  function canPlay(){return!!api.activeModel&&!ability.active&&!PC.combatState.attack;}
  window.__POWBUNKER_CAN_PLAY__=canPlay;window.__POWBUNKER=ability;window.__PILEBUNKER_EFFECT__=combatEffect;
  function ensureAttached(){const parent=api.actorVisual;if(parent)ability.attach(parent);}
  PC.attachCombatToActiveModel=function(){const out=original.attach();ensureAttached();return out;};
  PC.startCombatAttack=function(...args){if(ability.active)return false;return original.start(...args);};
  PC.triggerCombatAttack=function(...args){if(ability.active)return false;return original.trigger(...args);};
  PC.combatMovePenalty=function(){if(ability.active)return combatEffect.aimMode==='guided'?THREE.MathUtils.clamp(combatEffect.tuning.aimMoveMultiplier,.05,.8):.34;return original.movePenalty();};

  PC.getWeaponHitZones=function(){
    if(!abilityHitSpec)return original.zones();
    const weaponDef=PC.currentWeapon(),common={weaponId:PC.combatState.weapon,weaponDef,attackKey:'vertical',attackGroup:'vertical',hitType:'blunt'};
    const zoneId=abilityHitSpec.role==='primary'?'pilebunkerPrimary':'pilebunkerSecondary',mult=getWeaponDamageMultiplier({...common,zoneId}),damage=abilityHitSpec.damage/Math.max(.001,mult*1.18);
    return[{id:zoneId,label:abilityHitSpec.role==='primary'?'Pilebunker One on One':'Pilebunker detonation',type:'blunt',from:new THREE.Vector3(0,-1.25,0),to:new THREE.Vector3(0,1.25,0),radius:abilityHitSpec.radius,damage,stagger:0,prefer:'any'}];
  };

  function hitArenaEnemy(enemy,options={}){
    const weaponRoot=PC.weaponRoot,parent=weaponRoot?.parent,enemies=getArenaEnemies();if(!enemy||enemy.hp<=0||!weaponRoot||!parent||!api.hooks?.detectHits)return false;
    const point=options.point?.isVector3?options.point:new THREE.Vector3(enemy.x,Math.max(.8,(enemy.height||2)*.48),enemy.z),motion=options.motion||{x:0,z:1},length=Math.hypot(motion.x||0,motion.z||0)||1,mx=(motion.x||0)/length,mz=(motion.z||0)/length,previousStun=enemy.stunned||0;
    const old={position:weaponRoot.position.clone(),quaternion:weaponRoot.quaternion.clone(),scale:weaponRoot.scale.clone(),visible:weaponRoot.visible,attack:PC.combatState.attack,attackKey:PC.combatState.attackKey,attackGroup:PC.combatState.attackGroup,weapon:PC.combatState.weapon,hitIds:PC.combatState.hitIds,singleTargetEnemy:PC.combatState.singleTargetEnemy,fired:PC.combatState.fired};
    let landed=false;
    try{
      parent.updateMatrixWorld(true);localPoint.copy(point);parent.worldToLocal(localPoint);weaponRoot.visible=false;weaponRoot.position.copy(localPoint);weaponRoot.quaternion.identity();weaponRoot.scale.setScalar(1);weaponRoot.updateMatrixWorld(true);
      abilityHitSpec={damage:Number(options.damage)||1,role:options.role||'secondary',radius:Math.max(2.4,(enemy.radius||1)*2.25)};PC.combatState.weapon='dagger';PC.combatState.attack={total:.01,contactAt:0,comboAt:0,phases:[{t0:0,t1:.01}]};PC.combatState.attackKey='vertical';PC.combatState.attackGroup='vertical';PC.combatState.hitIds=new Set(enemies.filter(candidate=>candidate!==enemy));PC.combatState.singleTargetEnemy=enemy;PC.combatState.fired=true;
      worldTip.copy(point).add(new THREE.Vector3(mx,0,mz));worldBase.copy(point).add(new THREE.Vector3(-mx,0,-mz));api.hooks.detectHits(.016,worldTip,worldBase,42);landed=PC.combatState.hitIds.has(enemy);
      if(landed&&enemy.hp>0){enemy.stunned=Math.max(previousStun,Number(options.stun)||0);const knock=Number(options.knock)||0;enemy.knockX=(enemy.knockX||0)+mx*knock;enemy.knockZ=(enemy.knockZ||0)+mz*knock;}
    }finally{
      abilityHitSpec=null;PC.combatState.attack=old.attack;PC.combatState.attackKey=old.attackKey;PC.combatState.attackGroup=old.attackGroup;PC.combatState.weapon=old.weapon;PC.combatState.hitIds=old.hitIds;PC.combatState.singleTargetEnemy=old.singleTargetEnemy;PC.combatState.fired=old.fired;weaponRoot.position.copy(old.position);weaponRoot.quaternion.copy(old.quaternion);weaponRoot.scale.copy(old.scale);weaponRoot.visible=old.visible;weaponRoot.updateMatrixWorld(true);
    }
    return landed;
  }

  function playFromCard(){
    if(!canPlay())return false;ensureAttached();if(PC.weaponRoot)PC.weaponRoot.visible=true;PC.combatState.pending=null;PC.combatState.pendingGroup=null;PC.combatState.readyLock=0;
    const started=ability.start();
    if(started){combatEffect.start();if(combatEffect.aimMode==='guided')beginGuidedAim();PC.combatState.attack=abilityBlocker;PC.combatState.attackKey='powBunker';PC.combatState.attackGroup='ability';PC.combatState.t=0;PC.combatState.fired=true;PC.combatState.hitIds=new Set();window.dispatchEvent(new CustomEvent('powbunker:started'));}
    return started;
  }
  window.addEventListener('powbunker:play',playFromCard);

  PC.updateCombat=function(dt,now,sway,rawDt=dt){
    const state=PC.combatState,wasAbilityActive=ability.active;
    if(wasAbilityActive){state.attack=null;state.pending=null;state.pendingGroup=null;state.pendingLabEvent=null;}
    const out=original.update(dt,now,sway,rawDt);
    if(wasAbilityActive){state.attack=abilityBlocker;state.attackKey='powBunker';state.attackGroup='ability';state.t=0;state.fired=true;state.hitIds||=new Set();}
    ensureAttached();if(ability.active)updateGuidedAim(rawDt);
    const model=api.activeModel,actorVisual=api.actorVisual;
    if(model&&actorVisual){shoulder.set(.72,1.20-PC.getCombatShoulderDrop(),.36);model.updateMatrixWorld(true);model.localToWorld(shoulder);actorVisual.updateMatrixWorld(true);actorVisual.worldToLocal(shoulder);ability.update(dt,{anchor:shoulder,time:now,rawDt});applyAbilityWeaponPresentation();ability.applyHostPose(model,api.W);}
    else{ability.update(dt,{time:now,rawDt});applyAbilityWeaponPresentation();}
    if(ability.active)combatEffect.update({phase:ability.phase,progress:ability.progress,dt,rawDt});
    const ev=ability.consumeEvents();
    if(ev.slam){state.hitStop=Math.max(state.hitStop,.07*1.35);state.wobble.vel+=(Math.random()<.5?-1:1)*7.4;}
    if(ev.hit){const result=combatEffect.impact(ev.hit),landed=!!result.landed;ability.impactFeedback(ev.hit,landed);if(landed){state.hitStop=Math.max(state.hitStop,.115);state.wobble.vel+=(Math.random()<.5?-1:1)*10.5;}}
    if(ev.finished){combatEffect.finish();endGuidedAim();if(PC.weaponRoot)PC.weaponRoot.visible=true;state.attack=null;state.attackKey=null;state.attackGroup='vertical';state.t=0;state.fired=false;state.pending=null;state.pendingGroup=null;state.pendingLabEvent=null;window.dispatchEvent(new CustomEvent('powbunker:finished'));}
    return out;
  };

  Object.defineProperty(PC,'powBunkerAbility',{value:ability,enumerable:true});
  Object.defineProperty(PC,'pilebunkerCombatEffect',{value:combatEffect,enumerable:true});
  return PC;
}
