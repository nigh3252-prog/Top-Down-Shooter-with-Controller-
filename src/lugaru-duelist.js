import { classifyGuardAttack,computeGuardDamage } from './goblin-guard.js';
import { LUGARU_COUNTER_RELEASE_WINDOW } from './lugaru-duelist-counter-release.js';

export const LUGARU_DUELIST_ID='Lugaru Duelist';

export const LUGARU_DUELIST_ARCHETYPE=Object.freeze({
  hp:72,radius:.99,height:4.21,speed:4.05,attack:'slash',score:28,
  weapon:'longsword',color:0x6f9f4e,bellyColor:0xbfd582,armorColor:0x543820,
  poseScale:1,combatAttacks:['vertical5','horizontal6','vertical3'],timingScale:.96,
  turnSpeed:Math.PI*1.6,role:'reactive sword duelist',
  pairingTags:['duelist','reactive','melee','committed'],encounterCost:18,maxActive:4,
});

const PROFILE=Object.freeze({
  guardMax:94,raise:.10,hold:.58,lower:.24,cooldown:.62,breakStun:1.18,
  regenDelay:1.35,regenRate:25,reaction:.085,evadeDuration:.34,evadeSpeed:13.2,
  preferredRangeScale:1.08,
});
const GUARD_FRONT_DOT=Math.cos(74*Math.PI/180);
const PLAYER_AIM_DOT=Math.cos(70*Math.PI/180);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
const normalize2=(x,z)=>{const length=Math.hypot(x,z)||1;return{x:x/length,z:z/length};};

export function attackAimedAtDuelist({enemy={x:0,z:0},player={x:0,z:0},commitYaw=0}={}){
  const toEnemy=normalize2((enemy.x??0)-(player.x??0),(enemy.z??0)-(player.z??0));
  const forward={x:Math.sin(Number(commitYaw)||0),z:Math.cos(Number(commitYaw)||0)};
  return forward.x*toEnemy.x+forward.z*toEnemy.z>=PLAYER_AIM_DOT;
}

export function chooseLugaruDuelistResponse({snapshot={},distance=Infinity,guardRatio=1,aimed=true,timeToContact=Infinity}={}){
  if(!snapshot.active||!aimed||distance>12.5||timeToContact<.065)return'ignore';
  const attack=classifyGuardAttack(snapshot);
  if(attack.upward||attack.charged||attack.chargeTier>=.45)return'evade';
  if(attack.chop&&guardRatio<.72)return'evade';
  if(guardRatio<.28)return'evade';
  return'guard';
}

export function buildLugaruCounterAttack(attack,{perfect=false,punish=false}={}){
  if(!attack)return null;
  const speed=perfect?.48:punish?.68:.58;
  return{
    ...attack,
    name:perfect?`Perfect Counter · ${attack.name||'Strike'}`:punish?`Whiff Punish · ${attack.name||'Strike'}`:`Guard Counter · ${attack.name||'Strike'}`,
    windup:Math.max(.11,(Number(attack.windup)||.3)*speed),
    active:Math.max(.07,Number(attack.active)||.1),
    recovery:Math.max(.22,(Number(attack.recovery)||.4)*(perfect?.72:.84)),
    cooldown:perfect?.82:1.05,tokenCost:.1,wantsSolo:true,
  };
}

function combatSnapshot(){
  const runtime=globalThis.__arena,combat=runtime?.combatState,attack=combat?.attack;
  return{
    active:!!attack,attackRef:attack||null,attackKey:combat?.attackKey||'',
    attackGroup:combat?.attackGroup||'',attackLabel:attack?.label||'',weaponId:combat?.weapon||'',
    t:Number(combat?.t)||0,contactAt:Number(attack?.contactAt)||0,total:Number(attack?.total)||0,
    commitYaw:Number(combat?.commitYaw)||0,charged:!!runtime?.arena?.charge?.active,
    chargeTier:Number(runtime?.arena?.charge?.tier)||0,
  };
}

export function installLugaruDuelist(system,{THREE,worldRoot,navigation=null,arenaRadius=18}={}){
  if(!system||!THREE)return system;
  const baseUpdate=system.update.bind(system),baseDamage=system.damageEnemy.bind(system);
  const baseLaunch=system.launchRigidBody?.bind(system),baseReset=system.reset?.bind(system);
  const baseStart=system.startRoomEncounter?.bind(system),baseClear=system.clearRoomRuntime?.bind(system);
  const states=new WeakMap(),tracked=new Set(),effects=[];
  let lastPlayer={x:0,z:0},lastAttackRef=null,lastAttackT=Infinity,attackSerial=0,audioContext=null;

  const up=new THREE.Vector3(0,1,0),tip=new THREE.Vector3();
  const targetQ=new THREE.Quaternion(),rollQ=new THREE.Quaternion(),targetPos=new THREE.Vector3();
  const sparkGeometry=new THREE.OctahedronGeometry(.085,0);
  const sparkMaterial=new THREE.MeshBasicMaterial({color:0xffd985,transparent:true,opacity:.96,depthWrite:false});
  const bgMaterial=new THREE.MeshBasicMaterial({color:0x2e2924,transparent:true,opacity:.88,depthWrite:false});
  const fillMaterial=new THREE.MeshBasicMaterial({color:0xf0c96b,transparent:true,opacity:.98,depthWrite:false});
  const markMaterial=new THREE.MeshStandardMaterial({color:0xa94f3f,roughness:.68,metalness:.18,flatShading:true});

  const isDuelist=enemy=>!!enemy?._lugaruDuelist&&enemy.hp>0;
  const guardActive=state=>state.guardPhase==='raising'||state.guardPhase==='holding';
  const guardLive=state=>state.guardPhase==='holding'||(state.guardPhase==='raising'&&state.guardT>=PROFILE.raise*.45);

  function stateFor(enemy){
    let state=states.get(enemy);if(state)return state;
    state={guard:PROFILE.guardMax,guardPhase:'idle',guardT:0,guardCooldown:0,regenDelay:0,impactT:0,
      observedSerial:-1,reactionT:0,decisionMade:false,evadeT:-1,evadeDir:{x:0,z:0},counterDelay:-1,
      counterKind:'guard',lastPunishSerial:-1,spacingCooldown:.45,baseHold:enemy.holdDist||enemy.stop||4,bar:null,mark:null};
    states.set(enemy,state);tracked.add(enemy);return state;
  }

  function ensureVisuals(enemy,state){
    if(!enemy.root)return;
    if(!state.bar){
      const width=Math.max(1.05,enemy.radius*1.85),geometry=new THREE.BoxGeometry(1,.06,.04);
      const bg=new THREE.Mesh(geometry,bgMaterial),fill=new THREE.Mesh(geometry,fillMaterial);
      bg.position.set(0,enemy.height+.18,0);fill.position.copy(bg.position);fill.position.z+=.015;
      bg.visible=fill.visible=false;enemy.root.add(bg,fill);state.bar={bg,fill,width};
    }
    if(!state.mark){
      const mark=new THREE.Mesh(new THREE.TorusGeometry(Math.max(.2,enemy.radius*.32),.055,6,18),markMaterial);
      mark.name='Lugaru Duelist red collar';mark.rotation.x=Math.PI/2;mark.position.set(0,enemy.height*.77,0);
      enemy.root.add(mark);state.mark=mark;
    }
  }

  function configure(enemy){
    if(!enemy||enemy.hp<=0)return;
    const state=stateFor(enemy);
    if(!enemy._lugaruDuelistConfigured){
      enemy._lugaruDuelistConfigured=true;enemy._lugaruDuelist=true;enemy.role='duelist';
      const targetHp=Math.max(enemy.maxHp||0,Math.round(72*Math.max(.25,system.hpScale||1)));
      enemy.hp+=Math.max(0,targetHp-(enemy.maxHp||enemy.hp||0));enemy.maxHp=targetHp;
      enemy.speed=(enemy.speed||3.6)*1.12;enemy.turnSpeed=Math.max(enemy.turnSpeed||0,Math.PI*1.6);
      enemy.attackAlign=.62;enemy.facingBias=0;enemy.facingDecisionT=9999;state.baseHold=enemy.holdDist||enemy.stop||4;
    }
    enemy.role='duelist';enemy.rallyTimer=9999;enemy.facingBias=0;
    enemy.holdDist=state.baseHold*PROFILE.preferredRangeScale;enemy.stop=enemy.holdDist;
    enemy.duelistGuard=state.guard;enemy.duelistGuardMax=PROFILE.guardMax;
    ensureVisuals(enemy,state);
  }

  function configureLugaruDuelists(enemies=[]){for(const enemy of enemies){enemy._lugaruDuelist=true;configure(enemy);}return enemies;}
  function face(enemy){const f=normalize2((lastPlayer.x??0)-enemy.x,(lastPlayer.z??0)-enemy.z);enemy.facing=f;enemy.facingAngle=Math.atan2(f.x,f.z);enemy.targetFacingAngle=enemy.facingAngle;}
  function cancelAttack(enemy){system.director?.releaseAllForEnemy?.(enemy);enemy.attack=null;enemy.hitDone=false;enemy.state='idle';enemy.stateTime=0;}
  function lowerGuard(state,{immediate=false}={}){if(immediate){state.guardPhase='idle';state.guardT=0;state.guardCooldown=PROFILE.cooldown;return;}if(state.guardPhase!=='idle'&&state.guardPhase!=='broken'){state.guardPhase='lowering';state.guardT=0;}}
  function beginGuard(enemy,state){cancelAttack(enemy);state.guardPhase='raising';state.guardT=0;state.impactT=0;state.regenDelay=PROFILE.regenDelay;face(enemy);}

  function playClang(strong=false){
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioContext)return;
    try{audioContext=audioContext||new AudioContext();if(audioContext.state==='suspended')audioContext.resume?.();
      const t=audioContext.currentTime,master=audioContext.createGain();master.gain.setValueAtTime(strong?.22:.15,t);master.gain.exponentialRampToValueAtTime(.0001,t+(strong?.42:.28));master.connect(audioContext.destination);
      (strong?[610,1180,2440]:[820,1570,2810]).forEach((frequency,index)=>{const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type=index===0?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,t);oscillator.frequency.exponentialRampToValueAtTime(frequency*.68,t+(strong?.34:.22));gain.gain.setValueAtTime(index===0?.65:.38,t);gain.gain.exponentialRampToValueAtTime(.0001,t+(strong?.36:.24));oscillator.connect(gain).connect(master);oscillator.start(t);oscillator.stop(t+(strong?.44:.30));});
    }catch{}
  }
  function sparks(enemy,strong=false){if(!worldRoot)return;const facing=enemy.facing||{x:0,z:1};for(let i=0;i<(strong?13:7);i++){const material=sparkMaterial.clone(),mesh=new THREE.Mesh(sparkGeometry,material);mesh.position.set(enemy.x+facing.x*.48,Math.max(1.2,enemy.height*(system.heightScale||1)*.54),enemy.z+facing.z*.48);mesh.scale.setScalar(strong?1.4:1);worldRoot.add(mesh);effects.push({mesh,age:0,life:strong?.48:.30,vx:(Math.random()-.5)*(strong?5.4:3.6)+facing.x*1.2,vy:1.7+Math.random()*(strong?4.3:2.6),vz:(Math.random()-.5)*(strong?5.4:3.6)+facing.z*1.2,spin:(Math.random()-.5)*17});}}
  function breakGuard(enemy,state,knock={x:0,z:0}){state.guard=0;state.guardPhase='broken';state.guardT=0;state.impactT=.42;state.guardCooldown=PROFILE.cooldown+.5;state.regenDelay=PROFILE.regenDelay+PROFILE.breakStun;state.counterDelay=-1;cancelAttack(enemy);enemy.stunned=Math.max(enemy.stunned||0,PROFILE.breakStun);enemy.knockX=(enemy.knockX||0)+(Number(knock.x)||0)*.24;enemy.knockZ=(enemy.knockZ||0)+(Number(knock.z)||0)*.24;sparks(enemy,true);playClang(true);}

  function beginEvade(enemy,state,{counter=true}={}){cancelAttack(enemy);lowerGuard(state,{immediate:true});const away=normalize2(enemy.x-(lastPlayer.x??0),enemy.z-(lastPlayer.z??0)),side=enemy.orbitDir||1;state.evadeDir=normalize2(away.x-away.z*side*.34,away.z+away.x*side*.34);state.evadeT=0;state.counterKind=counter?'evade':'spacing';state.counterDelay=-1;state.spacingCooldown=.75;enemy.orbitDir*=-1;enemy._lugaruEvading=true;}
  function moveEvade(enemy,state,dt){state.evadeT+=dt;const u=clamp(state.evadeT/PROFILE.evadeDuration,0,1),speed=PROFILE.evadeSpeed*Math.pow(1-u,.45),delta={x:state.evadeDir.x*speed*dt,z:state.evadeDir.z*speed*dt};let moved={x:enemy.x+delta.x,z:enemy.z+delta.z};if(navigation?.resolveMovement)moved=navigation.resolveMovement({x:enemy.x,z:enemy.z},delta,enemy.radius*(system.heightScale||1)*(enemy.collisionScale||1))||moved;else{const r=Math.hypot(moved.x,moved.z),limit=Math.max(1,arenaRadius-1.2);if(r>limit)moved={x:moved.x*limit/r,z:moved.z*limit/r};}enemy.x=moved.x;enemy.z=moved.z;enemy.vx=enemy.vz=0;enemy.stunned=Math.max(enemy.stunned||0,.07);face(enemy);if(state.evadeT>=PROFILE.evadeDuration){state.evadeT=-1;enemy._lugaruEvading=false;const distance=Math.hypot((lastPlayer.x??0)-enemy.x,(lastPlayer.z??0)-enemy.z);if(state.counterKind==='evade'&&distance<=8.2){state.counterDelay=.08;state.counterKind='evade';}}}

  function chooseCounterBase(enemy){const attacks=[...(enemy.realAttacks||[])];if(!attacks.length)return enemy.attack||null;attacks.sort((a,b)=>(Number(a.windup)||9)-(Number(b.windup)||9));return attacks[0];}
  function startCounter(enemy,state,{perfect=false,punish=false}={}){if(enemy.hp<=0||enemy.state!=='idle'||(enemy.stunned||0)>0)return false;const attack=buildLugaruCounterAttack(chooseCounterBase(enemy),{perfect,punish});if(!attack)return false;lowerGuard(state,{immediate:true});system.director?.releaseAllForEnemy?.(enemy);face(enemy);enemy.attack=attack;enemy.state='windup';enemy.stateTime=0;enemy.windup=attack.windup;enemy.active=attack.active;enemy.recovery=attack.recovery;enemy.hitDone=false;enemy.cooldown=0;if(enemy.useRealCombat){enemy.combatAtt=attack.combatAtt;enemy.combatAttackIndex=((enemy.combatAttackIndex||0)+1)%Math.max(1,enemy.realAttacks.length);}system.director?.grant?.(enemy,attack);state.counterDelay=-1;enemy.duelistIntent=punish?'punish':perfect?'perfect counter':'counter';return true;}

  function advanceGuard(enemy,state,dt){state.guardT+=dt;state.guardCooldown=Math.max(0,state.guardCooldown-dt);state.regenDelay=Math.max(0,state.regenDelay-dt);state.impactT=Math.max(0,state.impactT-dt);state.spacingCooldown=Math.max(0,state.spacingCooldown-dt);if(state.guardPhase==='raising'&&state.guardT>=PROFILE.raise){state.guardPhase='holding';state.guardT=0;}else if(state.guardPhase==='holding'&&state.guardT>=PROFILE.hold){state.guardPhase='lowering';state.guardT=0;}else if(state.guardPhase==='lowering'&&state.guardT>=PROFILE.lower){state.guardPhase='idle';state.guardT=0;state.guardCooldown=PROFILE.cooldown;}else if(state.guardPhase==='broken'&&state.guardT>=PROFILE.breakStun){state.guardPhase='idle';state.guardT=0;}if(state.guardPhase==='idle'&&state.regenDelay<=0&&state.guard<PROFILE.guardMax)state.guard=Math.min(PROFILE.guardMax,state.guard+PROFILE.regenRate*dt);if(guardActive(state)||state.guardPhase==='lowering'){cancelAttack(enemy);face(enemy);enemy.vx=enemy.vz=0;enemy.knockX=(enemy.knockX||0)*.3;enemy.knockZ=(enemy.knockZ||0)*.3;enemy.stunned=Math.max(enemy.stunned||0,.055);}}

  function refreshSerial(snapshot){if(snapshot.active&&(snapshot.attackRef!==lastAttackRef||snapshot.t+.001<lastAttackT))attackSerial++;lastAttackRef=snapshot.attackRef;lastAttackT=snapshot.t;}
  function observe(enemy,state,snapshot,distance){if(!snapshot.active)return;if(state.observedSerial!==attackSerial){state.observedSerial=attackSerial;state.reactionT=PROFILE.reaction+(enemy.id%3)*.012;state.decisionMade=false;}if(state.decisionMade||state.evadeT>=0||state.guardPhase!=='idle'||enemy.state!=='idle'||(enemy.stunned||0)>0)return;const response=chooseLugaruDuelistResponse({snapshot,distance,guardRatio:state.guard/PROFILE.guardMax,aimed:attackAimedAtDuelist({enemy,player:lastPlayer,commitYaw:snapshot.commitYaw}),timeToContact:snapshot.contactAt-snapshot.t});if(state.reactionT>0||response==='ignore')return;state.decisionMade=true;if(response==='evade')beginEvade(enemy,state,{counter:true});else beginGuard(enemy,state);}
  function punish(enemy,state,snapshot,distance){if(!snapshot.active||state.lastPunishSerial===attackSerial||snapshot.t<snapshot.contactAt+.09)return;if(state.evadeT>=0||state.guardPhase!=='idle'||state.counterDelay>=0||enemy.state!=='idle'||(enemy.stunned||0)>0)return;const reach=Math.max(0,...(enemy.realAttacks||[]).map(attack=>Number(attack.range)||0));if(distance>Math.max(6.2,reach+1.1))return;state.lastPunishSerial=attackSerial;startCounter(enemy,state,{punish:true});}
  function before(enemy,state,dt,snapshot){configure(enemy);state.reactionT=Math.max(0,state.reactionT-dt);if(state.counterDelay>=0){state.counterDelay-=dt;if(state.counterDelay<=0&&startCounter(enemy,state,{perfect:state.counterKind==='perfect'}))return;}if(state.evadeT>=0){moveEvade(enemy,state,dt);return;}advanceGuard(enemy,state,dt);const distance=Math.hypot((lastPlayer.x??0)-enemy.x,(lastPlayer.z??0)-enemy.z);if(enemy.state==='idle'&&state.guardPhase==='idle'&&state.spacingCooldown<=0&&distance<state.baseHold*.68){beginEvade(enemy,state,{counter:false});return;}if(state.guardPhase==='idle'&&state.guardCooldown<=0)observe(enemy,state,snapshot,distance);punish(enemy,state,snapshot,distance);}

  function pose(enemy,state){if(system.isRigidBodyActive?.(enemy)||!enemy.weaponRoot)return;const side=enemy.id%2?1:-1;if(guardActive(state)||state.guardPhase==='lowering'){const raise=state.guardPhase==='raising'?smooth(state.guardT/PROFILE.raise):1,lower=state.guardPhase==='lowering'?1-smooth(state.guardT/PROFILE.lower):1,mix=raise*lower;tip.set(side,.04,.1).normalize();targetQ.setFromUnitVectors(up,tip);rollQ.setFromAxisAngle(tip,side*.08);targetQ.premultiply(rollQ);targetPos.set(0,(enemy.height||4)*.54,(enemy.radius||1)*.6);enemy.weaponRoot.position.lerp(targetPos,mix);enemy.weaponRoot.quaternion.slerp(targetQ,mix);if(enemy.torsoRoot){enemy.torsoRoot.rotation.x-=.11*mix;enemy.torsoRoot.rotation.z+=side*.055*mix;}}if(state.evadeT>=0){const kick=Math.sin(clamp(state.evadeT/PROFILE.evadeDuration,0,1)*Math.PI);if(enemy.torsoRoot){enemy.torsoRoot.rotation.x-=.28*kick;enemy.torsoRoot.rotation.z+=(enemy.orbitDir||1)*.12*kick;}if(enemy.pelvis)enemy.pelvis.position.y-=enemy.height*.055*kick;}}
  function updateBar(enemy,state){ensureVisuals(enemy,state);if(!state.bar)return;const visible=state.guardPhase!=='idle'||state.impactT>0||state.guard<PROFILE.guardMax-.5;state.bar.bg.visible=state.bar.fill.visible=visible;if(!visible)return;const ratio=clamp(state.guard/PROFILE.guardMax,0,1),width=state.bar.width;state.bar.bg.scale.x=width;state.bar.fill.scale.x=width*ratio;state.bar.fill.position.x=-(1-ratio)*width*.5;state.bar.bg.lookAt(lastPlayer.x??0,2,lastPlayer.z??0);state.bar.fill.lookAt(lastPlayer.x??0,2,lastPlayer.z??0);}
  function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const fx=effects[i];fx.age+=dt;if(fx.age>=fx.life){fx.mesh.parent?.remove(fx.mesh);fx.mesh.material?.dispose?.();effects.splice(i,1);continue;}fx.vy-=12*dt;fx.mesh.position.x+=fx.vx*dt;fx.mesh.position.y+=fx.vy*dt;fx.mesh.position.z+=fx.vz*dt;fx.mesh.rotation.x+=fx.spin*dt;fx.mesh.material.opacity=Math.max(.05,1-fx.age/fx.life);}}

  system.configureLugaruDuelists=configureLugaruDuelists;system.isLugaruDuelist=isDuelist;
  system.update=function updateLugaru(dt,player={x:0,z:0}){lastPlayer=player||lastPlayer;const snapshot=combatSnapshot();refreshSerial(snapshot);const duelists=system.enemies.filter(isDuelist);for(const enemy of duelists)before(enemy,stateFor(enemy),dt,snapshot);baseUpdate(dt,lastPlayer);for(const enemy of duelists){if(!system.enemies.includes(enemy))continue;const state=stateFor(enemy);configure(enemy);pose(enemy,state);updateBar(enemy,state);enemy.duelistGuard=state.guard;enemy.duelistIntent=state.evadeT>=0?'evade':state.counterDelay>=0?'counter':state.guardPhase!=='idle'?state.guardPhase:enemy.state;}updateEffects(dt);};

  system.damageEnemy=function damageLugaru(enemy,amount,knock={x:0,z:0},opts={}){if(!isDuelist(enemy)||system.isRigidBodyActive?.(enemy))return baseDamage(enemy,amount,knock,opts);const state=stateFor(enemy);if(guardLive(state)){const toPlayer=normalize2((lastPlayer.x??0)-enemy.x,(lastPlayer.z??0)-enemy.z),facing=enemy.facing||toPlayer;if(facing.x*toPlayer.x+facing.z*toPlayer.z>=GUARD_FRONT_DOT){const snapshot=combatSnapshot(),attack=classifyGuardAttack(snapshot),guardDamage=computeGuardDamage({amount,knock,attack}),perfect=state.guardPhase==='raising';state.guard=Math.max(0,state.guard-guardDamage);state.impactT=.25;state.regenDelay=PROFILE.regenDelay;enemy.flash=0;sparks(enemy,false);playClang(false);if(state.guard<=0)breakGuard(enemy,state,knock);else{lowerGuard(state,{immediate:true});state.counterDelay=perfect?.055:.14;state.counterKind=perfect?'perfect':'guard';enemy.duelistCounterReleaseT=LUGARU_COUNTER_RELEASE_WINDOW;}return false;}}if(guardActive(state)||state.guardPhase==='lowering')lowerGuard(state,{immediate:true});return baseDamage(enemy,amount,knock,opts);};
  if(baseLaunch)system.launchRigidBody=function launchLugaru(enemy,launch={}){if(isDuelist(enemy)){const state=stateFor(enemy);if(guardActive(state)||state.guardPhase==='lowering')breakGuard(enemy,state,{x:Number(launch.velocityX)||0,z:Number(launch.velocityZ)||0});}return baseLaunch(enemy,launch);};

  function clearRuntime(){for(const fx of effects){fx.mesh.parent?.remove(fx.mesh);fx.mesh.material?.dispose?.();}effects.length=0;for(const enemy of tracked){const state=states.get(enemy);if(state?.bar){state.bar.bg.visible=false;state.bar.fill.visible=false;}}tracked.clear();lastAttackRef=null;lastAttackT=Infinity;attackSerial=0;}
  if(baseReset)system.reset=function(){clearRuntime();return baseReset();};
  if(baseStart)system.startRoomEncounter=function(roomId){clearRuntime();return baseStart(roomId);};
  if(baseClear)system.clearRoomRuntime=function(){clearRuntime();return baseClear();};
  Object.defineProperty(system,'lugaruDuelistCount',{enumerable:true,get:()=>system.enemies.filter(isDuelist).length});
  return system;
}
