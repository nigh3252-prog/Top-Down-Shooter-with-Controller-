// Branch-local integration wrapper for the maze-combat Pilebunker card.
// The untouched combat core is pinned to the validated Hammerist War Hammer
// commit, so its relative weapon import resolves the approved detailed model.
// This wrapper adds the ability without rewriting or destabilising the sword puppet.

import { installPlayerCombat as installBasePlayerCombat } from './player-combat-core.js';
import { getWeaponDamageMultiplier } from './combat-balance.js';
import { createPowBunkerAbility } from './powbunker-ability.js';
import { installArenaEnemyRegistryProbe, getArenaEnemies, getArenaEnemySystem } from './arena-enemy-registry.js';
import { isVerticalAimGroup, selectVerticalAimTarget, correctionForSegmentY, verticalAimPhaseWeight } from './vertical-melee-aim.js';
import { createPilebunkerCombatEffect } from './pilebunker-combat-effect.js';
import { getArenaRuntimeConfig } from './arena-runtime-context.js';

const PILEBUNKER_GAME_DEFAULTS_SCHEMA=1;
const PILEBUNKER_GAME_DEFAULTS_STORAGE='arena.pilebunker.gameDefaultsSchema';
const PILEBUNKER_EFFECT_MAX=Object.freeze({
  pullRadius:14,
  pullStrength:26,
  compressionDistance:5,
  frontReach:14,
  primaryDamage:260,
  primaryStun:5,
  primaryHitRadius:7,
  secondaryDamage:120,
  secondaryRadius:12,
  secondaryKnock:26,
  secondaryStun:1.5,
  eliteControl:1,
  aimMoveMultiplier:.60,
});

function needsPilebunkerGameDefaults(){
  try{return Number(localStorage.getItem(PILEBUNKER_GAME_DEFAULTS_STORAGE))!==PILEBUNKER_GAME_DEFAULTS_SCHEMA;}
  catch(_){return true;}
}
function markPilebunkerGameDefaultsApplied(){
  try{localStorage.setItem(PILEBUNKER_GAME_DEFAULTS_STORAGE,String(PILEBUNKER_GAME_DEFAULTS_SCHEMA));}catch(_){}
}
export function installPlayerCombat(api){
  const PC=installBasePlayerCombat(api);
  const runtimeMode=getArenaRuntimeConfig()?.mode;
  const supportedArenaRuntime=runtimeMode==='arena'||runtimeMode==='enemy-lab'
    ||/(?:^|\/)combat-arena\.html$/i.test(location.pathname)
    ||/HEX MAZE COMBAT/i.test(document.title);
  if(!supportedArenaRuntime)return PC;

  const {THREE}=api;
  const UP=new THREE.Vector3(0,1,0),shoulder=new THREE.Vector3(),localPoint=new THREE.Vector3(),worldTip=new THREE.Vector3(),worldBase=new THREE.Vector3();
  const playerWorld=new THREE.Vector3(),playerForward=new THREE.Vector3(0,0,1),identityQ=new THREE.Quaternion();
  const applyGameDefaults=needsPilebunkerGameDefaults();
  const ability=createPowBunkerAbility({THREE,scene:api.scene});
  if(applyGameDefaults){ability.setSize(.300);ability.setArmHeight(3);ability.setWeaponMode('right');}
  for(const descriptor of ability.controlDescriptors())api.controlRegistry?.register?.(
    {id:'pilebunker',label:'PILEBUNKER',source:'player-combat',placement:{section:'loadout',subsection:'Pilebunker'},profile:{scope:'profile',pathPrefix:'ability.pilebunker'}},
    {...descriptor,profile:{path:`ability.pilebunker.${descriptor.id.split('.').slice(1).join('.')}`,scope:'profile',migrationId:`pilebunker-${descriptor.id}`},placement:{section:'loadout',subsection:'Pilebunker',order:0,accessibleLabel:`Player loadout / Pilebunker / ${descriptor.label}`}},
  );
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

  /* restrained vertical aim assist for horizontal slices and thrusts */
  const verticalAim={attackKey:null,group:null,lastT:0,target:null,targetY:0,current:0,desired:0};
  const aimA=new THREE.Vector3(),aimB=new THREE.Vector3(),aimShR=new THREE.Vector3(),aimShL=new THREE.Vector3(),aimER=new THREE.Vector3(),aimEL=new THREE.Vector3(),aimDir=new THREE.Vector3(),aimRightElbowOffset=new THREE.Vector3(.18,-.18,.05),aimLeftElbowOffset=new THREE.Vector3(-.18,-.18,.05);
  function resetVerticalAim(){verticalAim.attackKey=null;verticalAim.group=null;verticalAim.lastT=0;verticalAim.target=null;verticalAim.targetY=0;verticalAim.current=0;verticalAim.desired=0;}
  function arenaEnemyHeightScale(){try{return Math.max(.01,Number(getArenaEnemySystem().heightScale)||1);}catch(_){return 1;}}
  function acquireVerticalAimTarget(){
    const state=PC.combatState,group=state.attackGroup;
    verticalAim.attackKey=state.attackKey;verticalAim.group=group;verticalAim.lastT=state.t||0;verticalAim.target=null;verticalAim.targetY=0;verticalAim.current=0;verticalAim.desired=0;
    if(!state.attack||!isVerticalAimGroup(group)||ability.active)return;
    const player=getPlayerTransform();
    const picked=selectVerticalAimTarget({enemies:getArenaEnemies(),playerX:player.x,playerZ:player.z,committedYaw:state.commitYaw,heightScale:arenaEnemyHeightScale()});
    if(picked){verticalAim.target=picked.enemy;verticalAim.targetY=picked.targetY;}
  }
  function syncVerticalAimTarget(){
    const state=PC.combatState;
    if(!state.attack||!isVerticalAimGroup(state.attackGroup)||ability.active){if(verticalAim.attackKey!==null)resetVerticalAim();return;}
    const restarted=state.attackKey!==verticalAim.attackKey||state.attackGroup!==verticalAim.group||(state.t||0)+1e-4<verticalAim.lastT;
    if(restarted)acquireVerticalAimTarget();else verticalAim.lastT=state.t||0;
  }
  function verticalAimOffset(){
    const state=PC.combatState;
    if(!verticalAim.target||!state.attack||!isVerticalAimGroup(state.attackGroup))return 0;
    return verticalAim.current*verticalAimPhaseWeight({t:state.t,contactAt:state.attack.contactAt,total:state.attack.total});
  }
  function updateVerticalAimDesired(rawDt){
    const root=PC.weaponRoot,state=PC.combatState;
    if(!verticalAim.target||!root||!state.attack||!isVerticalAimGroup(state.attackGroup)){verticalAim.desired=0;verticalAim.current+=(0-verticalAim.current)*Math.min(1,Math.max(0,rawDt)*14);return;}
    if(verticalAim.target.hp<=0){verticalAim.target=null;verticalAim.desired=0;verticalAim.current=0;return;}
    root.updateWorldMatrix(true,false);
    const zones=original.zones();const zone=zones&&zones[0];
    if(!zone)return;
    aimA.copy(zone.from);aimB.copy(zone.to);root.localToWorld(aimA);root.localToWorld(aimB);
    const cap=state.attackGroup==='stab'?.65:.75;
    verticalAim.desired=correctionForSegmentY(verticalAim.targetY,aimA.y,aimB.y,cap);
    verticalAim.current+=(verticalAim.desired-verticalAim.current)*Math.min(1,Math.max(0,rawDt)*12);
  }
  function placeAimSegment(mesh,a,b,r){
    if(!mesh)return;aimDir.subVectors(b,a);const len=aimDir.length();if(len<1e-5)return;aimDir.normalize();mesh.position.copy(a).addScaledVector(aimDir,len*.5);mesh.quaternion.setFromUnitVectors(UP,aimDir);mesh.scale.set(r,len,r);
  }
  function applyVerticalAimVisual(offset){
    if(Math.abs(offset)<1e-4)return;
    const layer=PC.combatLayer,root=PC.weaponRoot;if(!layer||!root)return;
    const i=layer.children.indexOf(root);if(i<0)return;const rightArmA=layer.children[i+1],rightArmB=layer.children[i+2],leftArmA=layer.children[i+3],leftArmB=layer.children[i+4],rightHand=layer.children[i+5],leftHand=layer.children[i+6];
    root.position.y+=offset;
    if(!rightHand||!leftHand){root.updateWorldMatrix(true,false);return;}
    rightHand.position.y+=offset;leftHand.position.y+=offset;
    const drop=PC.getCombatShoulderDrop();aimShR.set(.72,1.20-drop,.36);aimShL.set(-.72,1.20-drop,.36);
    aimER.copy(aimShR).lerp(rightHand.position,.55).add(aimRightElbowOffset);
    aimEL.copy(aimShL).lerp(leftHand.position,.55).add(aimLeftElbowOffset);
    placeAimSegment(rightArmA,aimShR,aimER,.070);placeAimSegment(rightArmB,aimER,rightHand.position,.060);placeAimSegment(leftArmA,aimShL,aimEL,.070);placeAimSegment(leftArmB,aimEL,leftHand.position,.060);
    root.updateWorldMatrix(true,false);
  }

  const combatEffect=createPilebunkerCombatEffect({THREE,scene:api.scene,getEnemies:getArenaEnemies,getPlayer:getPlayerTransform,hitEnemy:hitArenaEnemy});
  if(applyGameDefaults){for(const [key,value] of Object.entries(PILEBUNKER_EFFECT_MAX))combatEffect.setTuning(key,value);markPilebunkerGameDefaultsApplied();}
  for(const descriptor of combatEffect.controlDescriptors())api.controlRegistry?.register?.(
    {id:'pilebunker',label:'PILEBUNKER',source:'player-combat',placement:{section:'loadout',subsection:'Pilebunker'},profile:{scope:'profile',pathPrefix:'ability.pilebunker'}},
    {...descriptor,profile:{path:`ability.pilebunker.${descriptor.id.split('.').slice(1).join('.')}`,scope:'profile',migrationId:`pilebunker-${descriptor.id}`},placement:{section:'loadout',subsection:'Pilebunker effect',order:0,accessibleLabel:`Player loadout / Pilebunker / ${descriptor.label}`}},
  );

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

  PC.updateCombat=function(dt,now,sway,rawDt=dt){
    const state=PC.combatState,wasAbilityActive=ability.active,layer=PC.combatLayer;
    if(wasAbilityActive){state.attack=null;state.pending=null;state.pendingGroup=null;state.pendingLabEvent=null;}
    syncVerticalAimTarget();
    const frameAimOffset=wasAbilityActive?0:verticalAimOffset();
    if(layer)layer.position.y=frameAimOffset;
    const out=original.update(dt,now,sway,rawDt);
    if(layer){layer.position.y=0;layer.updateWorldMatrix(true,true);}
    if(wasAbilityActive){state.attack=abilityBlocker;state.attackKey='powBunker';state.attackGroup='ability';state.t=0;state.fired=true;state.hitIds||=new Set();}
    else{syncVerticalAimTarget();updateVerticalAimDesired(rawDt);if(state.attack)applyVerticalAimVisual(frameAimOffset);}
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
  Object.defineProperty(PC,'canPlayPilebunker',{value:canPlay,enumerable:true});
  Object.defineProperty(PC,'playPilebunker',{value:playFromCard,enumerable:true});
  return PC;
}
