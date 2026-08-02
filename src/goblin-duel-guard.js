import { getArenaRuntime } from './arena-runtime-context.js';
import { classifyGuardAttack,computeGuardDamage,isGuardableGoblin } from './goblin-guard.js';
import { createMetalGuardAudio } from './goblin-guard-audio.js';
import { createGoblinGuardVisuals } from './goblin-guard-visuals.js';

const BASE=Object.freeze({max:72,raise:.14,lower:.16,recoverToGuard:.20,counterTell:.18,defensiveTurn:4.4,personalCooldown:2.8,breakCooldown:5,breakStun:1.08,regenDelay:1.35,regenRate:24,engageDistance:10.5,releaseDistance:13.5});
export const DUEL_GUARD_PROFILES=Object.freeze({
  grunt:Object.freeze({...BASE}),
  dagger:Object.freeze({...BASE,max:52,raise:.09,lower:.12,recoverToGuard:.14,counterTell:.11,defensiveTurn:3.8,personalCooldown:2.3,breakCooldown:4.4,breakStun:.88,regenRate:28}),
  mace:Object.freeze({...BASE,max:108,raise:.19,recoverToGuard:.25,counterTell:.22,defensiveTurn:4.8,personalCooldown:3.1,breakCooldown:5.4,breakStun:1.28,regenRate:20}),
  rock:Object.freeze({...BASE,max:64,raise:.15,recoverToGuard:.18,counterTell:.20,defensiveTurn:4,personalCooldown:2.9,breakCooldown:4.8,breakStun:1.02,regenRate:22}),
  captain:Object.freeze({...BASE,max:152,raise:.21,lower:.20,recoverToGuard:.24,counterTell:.15,defensiveTurn:5.4,personalCooldown:3.3,breakCooldown:5.8,breakStun:1.48,regenRate:18}),
});
const FRONT_DOT=Math.cos(75*Math.PI/180);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const normalize2=(x,z)=>{const length=Math.hypot(x,z)||1;return{x:x/length,z:z/length};};
const attacking=enemy=>!!enemy?.attack||enemy?.state==='windup'||enemy?.state==='active'||enemy?.state==='recovery';
const guardActive=state=>state.phase==='raising'||state.phase==='holding'||state.phase==='counterTell';
export const duelGuardProfileForKind=kind=>DUEL_GUARD_PROFILES[kind]||BASE;
export const guardBlockTransfersInitiative=attack=>!attack?.chop&&!attack?.upward;
export function scoreGuardCandidate(enemy,player={x:0,z:0}){
  if(!enemy)return-Infinity;
  const distance=Math.hypot((player.x??0)-enemy.x,(player.z??0)-enemy.z);
  const distanceScore=18-Math.abs(distance-4.8)*2.2;
  const kindScore=enemy.kind==='captain'?8:enemy.kind==='grunt'?5:enemy.kind==='mace'?4:enemy.kind==='dagger'?3:1;
  return distanceScore+kindScore-(Number(enemy.id)||0)*.0001;
}
function combatSnapshot(){
  const runtime=getArenaRuntime(),combat=runtime?.combatState,attack=combat?.attack;
  return{attackKey:combat?.attackKey||'',attackGroup:combat?.attackGroup||'',attackLabel:attack?.label||'',weaponId:combat?.weapon||'',charged:!!runtime?.arena?.charge?.active,chargeTier:Number(runtime?.arena?.charge?.tier)||0};
}

export function installGoblinDuelGuard(system,{THREE,worldRoot}={}){
  if(!system||!THREE)return system;
  const baseUpdate=system.update.bind(system),baseDamage=system.damageEnemy.bind(system),baseLaunch=system.launchRigidBody?.bind(system);
  const baseReset=system.reset?.bind(system),baseStart=system.startRoomEncounter?.bind(system),baseClear=system.clearRoomRuntime?.bind(system);
  const states=new WeakMap(),tracked=new Set(),audio=createMetalGuardAudio(),visuals=createGoblinGuardVisuals({THREE,worldRoot,system});
  let owner=null,groupCooldown=.45,initiative='neutral',lastPlayer={x:0,z:0},hitSerial=0;

  function stateFor(enemy){
    let state=states.get(enemy);if(state)return state;
    const profile=duelGuardProfileForKind(enemy.kind);
    state={profile,max:profile.max,value:profile.max,phase:'idle',phaseT:0,turnT:0,cooldown:0,regenDelay:0,impactT:0,recoil:0,attackSeen:false,bar:null};
    states.set(enemy,state);tracked.add(enemy);sync(enemy,state);return state;
  }
  function sync(enemy,state){enemy.guard=state.value;enemy.guardMax=state.max;enemy.guardState=state.phase;enemy.guardBroken=state.phase==='broken';enemy.guardBlockedT=state.impactT;enemy.guardInitiative=initiative;enemy.guardOwner=enemy===owner;}
  function face(enemy,player){const facing=normalize2((player.x??0)-enemy.x,(player.z??0)-enemy.z);enemy.facing=facing;enemy.facingAngle=Math.atan2(facing.x,facing.z);enemy.targetFacingAngle=enemy.facingAngle;}
  function acquire(enemy,state){owner=enemy;state.phase='raising';state.phaseT=0;state.turnT=0;state.attackSeen=false;state.regenDelay=state.profile.regenDelay;initiative='neutral';sync(enemy,state);}
  function release(enemy,state,{forced=false}={}){if(owner===enemy)owner=null;state.attackSeen=false;state.phase=forced?'lowering':'idle';state.phaseT=0;state.cooldown=Math.max(state.cooldown,state.profile.personalCooldown);groupCooldown=Math.max(groupCooldown,1.15);initiative='neutral';sync(enemy,state);}
  function breakGuard(enemy,state,knock={x:0,z:0},{launch=false}={}){
    state.value=0;state.phase='broken';state.phaseT=0;state.impactT=.46;state.cooldown=state.profile.breakCooldown;state.regenDelay=state.profile.regenDelay+state.profile.breakStun;
    if(owner===enemy)owner=null;groupCooldown=Math.max(groupCooldown,2.2);system.director?.releaseAllForEnemy?.(enemy);
    enemy.attack=null;enemy.hitDone=false;enemy.state='idle';enemy.stateTime=0;enemy.stunned=Math.max(enemy.stunned||0,state.profile.breakStun);
    enemy.knockX=(enemy.knockX||0)+(Number(knock.x)||0)*(launch?.45:.22);enemy.knockZ=(enemy.knockZ||0)+(Number(knock.z)||0)*(launch?.45:.22);
    initiative='playerPressure';visuals.spawnSparks(enemy,true);audio.playBreak({power:1.25+Math.hypot(Number(knock.x)||0,Number(knock.z)||0)*.035});sync(enemy,state);
  }
  function insideArc(enemy,player){const toPlayer=normalize2((player.x??0)-enemy.x,(player.z??0)-enemy.z),facing=enemy.facing||toPlayer;return facing.x*toPlayer.x+facing.z*toPlayer.z>=FRONT_DOT;}
  function eligible(enemy,state,player){
    if(state.phase!=='idle'||state.cooldown>0||state.value<state.max*.32)return false;
    if(enemy.state!=='idle'||attacking(enemy)||(enemy.stunned||0)>0||system.isRigidBodyActive?.(enemy))return false;
    return Math.hypot((player.x??0)-enemy.x,(player.z??0)-enemy.z)<=state.profile.engageDistance;
  }
  function choose(goblins,player){
    if(owner||groupCooldown>0)return;
    const candidates=goblins.filter(enemy=>eligible(enemy,stateFor(enemy),player));if(!candidates.length)return;
    candidates.sort((a,b)=>scoreGuardCandidate(b,player)-scoreGuardCandidate(a,player));acquire(candidates[0],stateFor(candidates[0]));
  }
  function advance(enemy,state,dt,player){
    state.phaseT+=dt;state.cooldown=Math.max(0,state.cooldown-dt);state.regenDelay=Math.max(0,state.regenDelay-dt);state.impactT=Math.max(0,state.impactT-dt);state.recoil*=Math.pow(.035,dt);if(enemy===owner)state.turnT+=dt;
    if(state.phase==='raising'&&state.phaseT>=state.profile.raise){state.phase='holding';state.phaseT=0;}
    else if(state.phase==='counterTell'&&state.phaseT>=state.profile.counterTell){state.phase='committing';state.phaseT=0;enemy.cooldown=0;initiative='enemyPressure';}
    else if(state.phase==='recovering'&&state.phaseT>=state.profile.recoverToGuard){
      const distance=Math.hypot((player.x??0)-enemy.x,(player.z??0)-enemy.z);
      if(enemy===owner&&state.turnT<state.profile.defensiveTurn&&distance<=state.profile.releaseDistance&&state.value>=state.max*.18){state.phase='raising';state.phaseT=0;initiative='neutral';}else release(enemy,state);
    }else if(state.phase==='lowering'&&state.phaseT>=state.profile.lower){state.phase='idle';state.phaseT=0;}
    else if(state.phase==='broken'&&state.phaseT>=state.profile.breakStun){state.phase='idle';state.phaseT=0;}
    if(state.phase==='idle'&&state.regenDelay<=0&&state.value<state.max)state.value=Math.min(state.max,state.value+state.profile.regenRate*dt);
  }
  function beforeUpdate(enemy,state,player){
    if(enemy!==owner)return;
    if(Math.hypot((player.x??0)-enemy.x,(player.z??0)-enemy.z)>state.profile.releaseDistance){release(enemy,state,{forced:true});return;}
    if(guardActive(state)){face(enemy,player);enemy.vx=(enemy.vx||0)*.62;enemy.vz=(enemy.vz||0)*.62;}
  }
  function afterUpdate(enemy,state,player){
    if(enemy!==owner)return;const isAttacking=attacking(enemy);
    if(guardActive(state)&&isAttacking){state.phase='committing';state.phaseT=0;state.attackSeen=true;initiative='enemyPressure';}
    else if(state.phase==='committing'){
      if(isAttacking)state.attackSeen=true;
      else if((state.attackSeen&&enemy.state==='idle')||state.phaseT>.55){state.phase='recovering';state.phaseT=0;initiative='neutral';}
    }
    if(guardActive(state))face(enemy,player);
  }

  system.update=function duelGuardUpdate(dt,player={x:0,z:0}){
    lastPlayer=player||lastPlayer;groupCooldown=Math.max(0,groupCooldown-dt);
    const goblins=system.enemies.filter(isGuardableGoblin);if(owner&&!goblins.includes(owner))owner=null;
    for(const enemy of goblins){const state=stateFor(enemy);advance(enemy,state,dt,lastPlayer);beforeUpdate(enemy,state,lastPlayer);sync(enemy,state);}
    choose(goblins,lastPlayer);baseUpdate(dt,lastPlayer);
    for(const enemy of goblins){if(!system.enemies.includes(enemy))continue;const state=stateFor(enemy);afterUpdate(enemy,state,lastPlayer);visuals.applyPose(enemy,state);visuals.updateBar(enemy,state,lastPlayer,enemy===owner);sync(enemy,state);}
    visuals.update(dt);
  };

  system.damageEnemy=function duelGuardDamage(enemy,amount,knock={x:0,z:0},opts={}){
    if(!isGuardableGoblin(enemy)||system.isRigidBodyActive?.(enemy))return baseDamage(enemy,amount,knock,opts);
    const state=stateFor(enemy);
    if(guardActive(state)&&insideArc(enemy,lastPlayer)){
      const snapshot=combatSnapshot(),attack=classifyGuardAttack(snapshot),guardDamage=computeGuardDamage({amount,knock,attack});
      state.value=Math.max(0,state.value-guardDamage);state.impactT=.24;state.recoil=clamp(guardDamage/state.max,.12,1);state.regenDelay=state.profile.regenDelay;
      hitSerial++;enemy.guardHitSerial=hitSerial;enemy.guardLastHit={serial:hitSerial,blocked:true,guardDamage,guardClass:attack.guardClass,attackKey:snapshot.attackKey,attackGroup:snapshot.attackGroup,initiative:guardBlockTransfersInitiative(attack)?'enemyPressure':'playerPressure'};
      enemy.flash=0;visuals.spawnSparks(enemy,false);audio.playBlock({guardClass:attack.guardClass,power:.72+guardDamage/state.max});
      if(state.value<=0)breakGuard(enemy,state,knock);
      else if(guardBlockTransfersInitiative(attack)){state.phase='counterTell';state.phaseT=0;initiative='enemyPressure';}
      else initiative='playerPressure';sync(enemy,state);return false;
    }
    if(enemy===owner&&(guardActive(state)||state.phase==='lowering'))release(enemy,state);return baseDamage(enemy,amount,knock,opts);
  };

  if(baseLaunch)system.launchRigidBody=function duelGuardLaunch(enemy,launch={}){
    if(isGuardableGoblin(enemy)){const state=stateFor(enemy);if(guardActive(state)||state.phase==='lowering'){breakGuard(enemy,state,{x:Number(launch.velocityX)||0,z:Number(launch.velocityZ)||0},{launch:true});visuals.applyPose(enemy,state);}}
    return baseLaunch(enemy,launch);
  };

  function clearRuntime(){visuals.clear();for(const enemy of tracked)visuals.hide(states.get(enemy));tracked.clear();owner=null;groupCooldown=.45;initiative='neutral';hitSerial=0;}
  if(baseReset)system.reset=function(){clearRuntime();return baseReset();};
  if(baseStart)system.startRoomEncounter=function(roomId){clearRuntime();return baseStart(roomId);};
  if(baseClear)system.clearRoomRuntime=function(){clearRuntime();return baseClear();};
  Object.defineProperty(system,'guardedGoblinCount',{enumerable:true,get:()=>owner&&guardActive(stateFor(owner))?1:0});
  Object.defineProperty(system,'brokenGuardCount',{enumerable:true,get:()=>system.enemies.filter(enemy=>isGuardableGoblin(enemy)&&stateFor(enemy).phase==='broken').length});
  Object.defineProperty(system,'guardDuelState',{enumerable:true,get:()=>({owner,initiative,groupCooldown})});
  return system;
}
