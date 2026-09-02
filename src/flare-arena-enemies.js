import { createCombatDirector, DEFAULT_DIRECTOR_SETTINGS } from './combat-director.js';
import {
  FLARE_ATTACKS, FLARE_ENEMY_ARCHETYPES, FLARE_LEVEL_1_IDS,
  FLARE_LEVEL_1_POOL_ID, isFlareEnemy,
} from './flare-enemies.js';
import { installFlareEnemyRig } from './flare-enemy-rig.js';
import { ENEMY_LAB_MAX_DIRECT_COUNT } from './enemy-lab-direct-encounter.js';

const PLAYER_RADIUS = 1.05;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const norm = (x,z)=>{ const d=Math.hypot(x,z)||1; return {x:x/d,z:z/d}; };
const wrapPi = a=>Math.atan2(Math.sin(a),Math.cos(a));
const rand = (a,b)=>a+Math.random()*(b-a);

export function createFlareArenaEnemySystem({
  THREE, worldRoot, arenaRadius=18, navigation=null,
  roomEncounterMode=false, onEncounterCleared=null,
  factionService=null, systemKey='flare',
}={}){
  const rig=installFlareEnemyRig(THREE);
  const group=new THREE.Group(); group.name='FLARE Level 1 Enemies'; worldRoot.add(group);
  const director=createCombatDirector({ ...DEFAULT_DIRECTOR_SETTINGS, pressureBudget:2.25, battleCircleRadius:6.9 });
  const enemies=[], deathPieces=[], bleeds=[];
  const tuning={ playerHp:100,lastPlayerHit:'',lastPlayerHitDir:null,heightScale:1.5,speedScale:.5,hpScale:2.5,waveSize:6,waveSizeLimit:20,idleRangeScale:3,aggression:1,spawnKind:FLARE_LEVEL_1_POOL_ID };
  let wave=1,kills=0,waveKills=0,waveClearT=0,nextId=1,time=0,activeEncounterRoomId=null;
  let lastPlayer={x:0,z:0,invulnerable:false};

  const markerMat=new THREE.MeshStandardMaterial({color:0xd7e8ef,roughness:.5,flatShading:true});
  const markerBg=new THREE.MeshStandardMaterial({color:0x2a1d1c,roughness:.8,flatShading:true});
  const windupMat=new THREE.MeshBasicMaterial({color:0xe59b42,transparent:true,opacity:.82,depthWrite:false});
  const tokenMat=new THREE.MeshBasicMaterial({color:0x89d5ff,transparent:true,opacity:.72,depthWrite:false});
  const rangeK=()=>tuning.idleRangeScale/3;
  const collisionRadius=e=>e.radius*tuning.heightScale;
  const separationRadius=e=>collisionRadius(e)*1.06;
  const playerDead=()=>tuning.playerHp<=0;

  function setFacing(e,angle){ e.facingAngle=wrapPi(angle); e.facing.x=Math.sin(e.facingAngle); e.facing.z=Math.cos(e.facingAngle); }
  function turnTo(e,p,dt,mult=1){
    const goal=Math.atan2(p.x-e.x,p.z-e.z),delta=wrapPi(goal-e.facingAngle),max=e.turnSpeed*mult*dt;
    setFacing(e,e.facingAngle+clamp(delta,-max,max)); return Math.abs(delta);
  }
  function approach(cur,goal,dt,rate=6){ return cur+(goal-cur)*Math.min(1,dt*rate); }
  function steer(e,dx,dz,amount,dt){
    const speed=e.speed*tuning.speedScale;
    e.vx=approach(e.vx,dx*speed*amount,dt); e.vz=approach(e.vz,dz*speed*amount,dt);
  }
  function seek(e,p,dt,amount=1){
    const target=navigation?.nextWaypoint?.(e,p,activeEncounterRoomId)||p;
    const d=norm(target.x-e.x,target.z-e.z); steer(e,d.x,d.z,amount,dt);
  }
  function orbit(e,p,dt,desired,amount=.4){
    const rx=e.x-p.x,rz=e.z-p.z,r=Math.hypot(rx,rz)||1;
    const tx=-rz/r*e.orbitDir,tz=rx/r*e.orbitDir,corr=clamp((desired-r)*.7,-1,1);
    steer(e,tx-rx/r*corr,tz-rz/r*corr,amount,dt);
  }
  function moveToSlot(e,p,dt){
    const slot=director.getDebugState().slots[e.slotIndex];
    if(!slot){ orbit(e,p,dt,e.waitRange,.4); return; }
    const raw={x:p.x+Math.cos(slot.angle)*slot.radius,z:p.z+Math.sin(slot.angle)*slot.radius};
    const target=navigation?.nextWaypoint?.(e,raw,activeEncounterRoomId)||raw;
    const d=norm(target.x-e.x,target.z-e.z); steer(e,d.x,d.z,1,dt);
  }
  function moveEnemy(e,p,dt,distance){
    const permitted=director.hasApproachPermit(e);
    const attackRange=e.attackRange*rangeK();
    if(permitted){
      if(distance>attackRange+.55) seek(e,p,dt,1); else orbit(e,p,dt,attackRange*.9,.24);
      turnTo(e,p,dt,1); return;
    }
    if(director.getMode()==='battleCircle'){ moveToSlot(e,p,dt); return; }
    const wait=e.waitRange*rangeK();
    if(distance<wait-.5){
      const away=norm(e.x-p.x,e.z-p.z); steer(e,away.x,away.z,.55,dt);
    } else if(distance>wait+2){ seek(e,p,dt,.42); }
    else orbit(e,p,dt,wait,.45);
    turnTo(e,p,dt,.65);
  }

  function makeEnemy(kind,x,z){
    const def=FLARE_ENEMY_ARCHETYPES[kind];
    if(!def) return null;
    const root=new THREE.Group(); root.name=`${def.label} arena enemy`;
    const visual=rig.create(kind,def); root.add(visual.group);
    const barBg=new THREE.Mesh(new THREE.BoxGeometry(def.radius*1.8,.06,.04),markerBg);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(def.radius*1.8,.07,.05),markerMat);
    barBg.position.set(0,def.height+.35,0); bar.position.copy(barBg.position); bar.position.z+=.012;
    const telegraph=new THREE.Mesh(new THREE.RingGeometry(.72,.79,32),windupMat); telegraph.rotation.x=-Math.PI/2; telegraph.visible=false;
    const tokenRing=new THREE.Mesh(new THREE.TorusGeometry(def.radius*1.55,.04,6,28),tokenMat); tokenRing.rotation.x=Math.PI/2; tokenRing.position.y=.08; tokenRing.visible=false;
    root.add(barBg,bar,telegraph,tokenRing); root.position.set(x,0,z); group.add(root);
    const attackIds=[...def.attacks], first=FLARE_ATTACKS[attackIds[0]];
    const hp=Math.round(def.hp*tuning.hpScale),angle=Math.atan2(-x||0,-z||1);
    const e={
      id:nextId++,kind,label:def.label,def,x,z,vx:0,vz:0,radius:def.radius,height:def.height,
      wizardFaction:'hostile',wizardStableId:`${systemKey}:${String(nextId-1).padStart(4,'0')}`,
      hp,maxHp:hp,speed:def.speed,score:def.score,poise:def.poise,avoidance:def.avoidance,
      attackIds,attackIndex:0,attackId:attackIds[0],realAtk:first,attackRange:Math.max(...attackIds.map(id=>FLARE_ATTACKS[id].range)),
      holdDist:first.range,preferredRange:first.range,waitRange:Math.min(def.threatRange,first.range+3.2),
      role:'goblin',fusion:false,thrower:false,isElite:false,statusImmunities:def.statusImmunities||[],
      state:'idle',stateTime:0,cooldown:rand(.2,1),stunned:0,attack:null,windup:0,active:0,recovery:0,hitDone:false,
      token:null,approachPermit:false,approachPermitTime:0,approachCooldown:0,approachCount:0,directEngaged:false,
      facing:{x:Math.sin(angle),z:Math.cos(angle)},facingAngle:angle,turnSpeed:Math.PI/Math.max(.12,def.turnDelay),attackAlign:.58,
      orbitDir:Math.random()<.5?-1:1,nearEligible:true,slotIndex:-1,gesture:null,
      knockX:0,knockZ:0,flash:0,yOff:0,vyOff:0,visualGroundSpeed:0,maxGroundSpeed:def.speed*tuning.speedScale,
      root,visual,barBg,bar,telegraph,tokenRing,
    };
    enemies.push(e); return e;
  }

  function chooseAttack(e,distance){
    const ids=e.attackIds;
    for(let offset=0;offset<ids.length;offset++){
      const idx=(e.attackIndex+offset)%ids.length,attack=FLARE_ATTACKS[ids[idx]];
      if(distance<=attack.range*rangeK()+.75) return { attack, id:ids[idx], nextIndex:(idx+1)%ids.length };
    }
    return null;
  }
  function startAttack(e,choice,target){
    const { attack, id, nextIndex }=choice;
    e.attackIndex=nextIndex; e.attackId=id;
    e.attack=attack; e.realAtk=attack; e.state='windup'; e.stateTime=0;
    e.windup=attack.windup; e.active=attack.active; e.recovery=attack.recovery; e.hitDone=false;
    if(factionService?.arenaFactionOf?.(e)!=='allied')director.grant(e,attack);
    factionService?.lockTarget?.(e,target);
  }
  function hitPlayer(damage,kind,name,dir=null){
    if(lastPlayer.invulnerable||playerDead()) return false;
    tuning.playerHp=Math.max(0,tuning.playerHp-damage);
    tuning.lastPlayerHit=`${FLARE_ENEMY_ARCHETYPES[kind]?.label||kind} ${name} hit for ${damage}`;
    tuning.lastPlayerHitDir=dir?{x:dir.x,z:dir.z}:null; return true;
  }
  function applyBleed(attack,source){
    if(!attack.bleed) return;
    bleeds.push({remaining:attack.bleed.ticks,interval:attack.bleed.interval,t:attack.bleed.interval,damage:attack.bleed.damage,source});
  }
  function resolveMelee(e,p){
    const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz);
    const targetRadius=p.__arenaTargetKind?(p.radius||PLAYER_RADIUS):PLAYER_RADIUS;
    if(d>e.attack.range*rangeK()+targetRadius) return;
    if(navigation?.raycastWalls?.({x:e.x,z:e.z},{x:p.x,z:p.z})) return;
    const delta=Math.abs(wrapPi(Math.atan2(dx,dz)-e.facingAngle));
    if(delta>e.attack.arc*.5+.2 && d>collisionRadius(e)+targetRadius+.2) return;
    const avg=(e.attack.damageMin+e.attack.damageMax)*.5;
    const directorScale=Math.max(.75,(e.attack.damage||avg)/avg);
    const damage=Math.max(1,Math.round(rand(e.attack.damageMin,e.attack.damageMax+1)*directorScale));
    const applied=factionService&&p.__arenaTargetKind
      ?factionService.damageTarget(p,damage,e.facing,{sourceEnemyId:e.wizardStableId,sourceFaction:e.wizardFaction,attack:e.attack.name},
        (value,dir)=>hitPlayer(value,e.kind,e.attack.name,dir))
      :hitPlayer(damage,e.kind,e.attack.name,e.facing);
    if(applied){e.hitDone=true;if(!p.__arenaTargetKind||p.__arenaTargetKind==='player')applyBleed(e.attack,e.kind);}
  }
  function updateBleeds(dt){
    for(let i=bleeds.length-1;i>=0;i--){
      const b=bleeds[i]; b.t-=dt;
      if(b.t<=0){
        b.t+=b.interval; b.remaining--;
        if(!playerDead()){
          tuning.playerHp=Math.max(0,tuning.playerHp-b.damage);
          tuning.lastPlayerHit=`Goblin Runner bleed hit for ${b.damage}`;
          tuning.lastPlayerHitDir=null;
        }
      }
      if(b.remaining<=0||playerDead()) bleeds.splice(i,1);
    }
  }

  function updateEnemy(e,dt,p){
    if(e.hp<=0) return;
    const previous={x:e.x,z:e.z};
    e.stateTime+=dt; e.cooldown=Math.max(0,e.cooldown-dt); e.flash=Math.max(0,e.flash-dt);
    e.x+=e.knockX*dt; e.z+=e.knockZ*dt; e.knockX*=Math.pow(.07,dt); e.knockZ*=Math.pow(.07,dt);
    if(e.yOff>0||e.vyOff!==0){ e.vyOff-=22*dt; e.yOff=Math.max(0,e.yOff+e.vyOff*dt); if(!e.yOff&&e.vyOff<0)e.vyOff=0; }
    if(e.stunned>0){
      e.stunned-=dt; e.vx*=Math.pow(.005,dt); e.vz*=Math.pow(.005,dt);
    } else if(e.state==='windup'){
      e.vx=e.vz=0;
      if(e.stateTime<e.windup*.45) turnTo(e,p,dt,.6);
      if(e.stateTime>=e.windup){ e.state='active'; e.stateTime=0; }
    } else if(e.state==='active'){
      const speed=e.attack.lungeSpeed||4;
      e.x+=e.facing.x*speed*dt; e.z+=e.facing.z*speed*dt;
      if(!e.hitDone) resolveMelee(e,p);
      if(e.stateTime>=e.active){ e.state='recovery'; e.stateTime=0; }
    } else if(e.state==='recovery'){
      e.vx=e.vz=0;
      if(e.stateTime>=e.recovery){
        e.state='idle'; e.stateTime=0; e.cooldown=e.attack.cooldown/tuning.aggression; director.release(e); factionService?.releaseTarget?.(e); e.attack=null;
      }
    } else {
      const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz),alignment=Math.abs(wrapPi(Math.atan2(dx,dz)-e.facingAngle));
      const choice=e.cooldown<=0&&!playerDead()?chooseAttack(e,d):null;
      const converted=factionService?.arenaFactionOf?.(e)==='allied';
      if(choice&&(converted||director.hasApproachPermit(e))&&alignment<=e.attackAlign&&(converted||director.canGrant(e,choice.attack,{enemies,pressureBudget:director.settings.pressureBudget,aggression:tuning.aggression}))) startAttack(e,choice,p);
      else { moveEnemy(e,p,dt,d); applySeparation(e,dt); e.x+=e.vx*dt; e.z+=e.vz*dt; }
    }
    if(navigation?.resolveMovement){
      const moved=navigation.resolveMovement(previous,{x:e.x-previous.x,z:e.z-previous.z},collisionRadius(e)); e.x=moved.x;e.z=moved.z;
    } else {
      const r=Math.hypot(e.x,e.z),limit=arenaRadius-1;
      if(r>limit){e.x*=limit/r;e.z*=limit/r;}
    }
  }

  function applySeparation(e,dt){
    let sx=0,sz=0;
    for(const other of enemies){
      if(other===e||other.hp<=0)continue;
      let dx=e.x-other.x,dz=e.z-other.z,d=Math.hypot(dx,dz); const comfort=separationRadius(e)+separationRadius(other)+.35;
      if(d>=comfort)continue; if(d<.001){dx=1;dz=0;d=1;}
      const pressure=1-d/comfort;sx+=dx/d*pressure;sz+=dz/d*pressure;
    }
    const l=Math.hypot(sx,sz); if(!l)return;
    const max=e.speed*tuning.speedScale;e.vx=clamp(e.vx+sx/l*max*dt*5,-max,max);e.vz=clamp(e.vz+sz/l*max*dt*5,-max,max);
  }
  function resolveBodies(p){
    for(let pass=0;pass<3;pass++) for(let i=0;i<enemies.length;i++){
      const a=enemies[i]; if(a.hp<=0||a.__heroicLeapCarried)continue;
      for(let j=i+1;j<enemies.length;j++){
        const b=enemies[j];if(b.hp<=0||b.__heroicLeapCarried)continue;let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),min=separationRadius(a)+separationRadius(b)+.18;
        if(d>=min)continue;if(d<.001){dx=1;dz=0;d=1;}const push=(min-d)*.5/d;a.x-=dx*push;a.z-=dz*push;b.x+=dx*push;b.z+=dz*push;
      }
      let dx=a.x-p.x,dz=a.z-p.z,d=Math.hypot(dx,dz),min=collisionRadius(a)+PLAYER_RADIUS;
      if(d<min){if(d<.001){dx=1;dz=0;d=1;}const push=(min-d)/d;a.x+=dx*push;a.z+=dz*push;}
    }
  }

  function updateVisual(e,dt){
    e.root.position.set(e.x,e.yOff+(Number(e.wizardAirborneOffset)||0),e.z); e.root.rotation.y=e.facingAngle;
    rig.update(e.visual,e,dt,time,tuning.heightScale);
    e.telegraph.visible=e.state==='windup';
    if(e.telegraph.visible){ const u=clamp(e.stateTime/Math.max(.001,e.windup),0,1); e.telegraph.scale.setScalar(.7+u*.65); e.telegraph.material.opacity=.35+u*.55; }
    e.tokenRing.visible=!!e.token;
    const f=clamp(e.hp/e.maxHp,0,1);e.bar.scale.x=f;e.bar.position.x=-(1-f)*e.radius*.9;
    e.bar.lookAt(lastPlayer.x??0,2,lastPlayer.z??0);
    const flash=1+e.flash*.28;e.visual.group.scale.multiplyScalar(flash);
  }
  function spawnDeathPieces(e,knock,power){
    const colors=[e.def.color,e.def.clothColor,e.def.accentColor,0xb8ad92];
    for(let i=0;i<6;i++){
      const size=rand(.18,.42);const mesh=new THREE.Mesh(new THREE.BoxGeometry(size,size,size),new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.85,flatShading:true}));
      mesh.position.set(e.x,rand(.5,e.height*tuning.heightScale*.7),e.z);worldRoot.add(mesh);
      deathPieces.push({mesh,vx:(knock.x||0)*.45+rand(-2.2,2.2)*power,vy:rand(2.8,6.2)*power,vz:(knock.z||0)*.45+rand(-2.2,2.2)*power,life:rand(.65,1.2)});
    }
  }
  function updateDeathPieces(dt){
    for(let i=deathPieces.length-1;i>=0;i--){const p=deathPieces[i];p.life-=dt;p.vy-=14*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y=Math.max(.06,p.mesh.position.y+p.vy*dt);p.mesh.position.z+=p.vz*dt;p.mesh.rotation.x+=dt*5;p.mesh.rotation.z+=dt*4;if(p.life<=0){p.mesh.parent?.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();deathPieces.splice(i,1);}}
  }
  function removeEnemy(e){ const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);e.root.parent?.remove(e.root);rig.dispose(e.visual); }
  function damageEnemy(e,amount,knock={x:0,z:0},opts={}){
    if(!e||e.hp<=0)return false;
    const modified=factionService?.modifyDamage?.(e,amount,opts);
    if(modified){amount=modified.damage;opts={...opts,__arenaDamageModified:true,damageModifiers:modified.applied};}
    const power=opts.power??clamp(amount/28,.4,2),poiseResist=clamp(e.poise/45,0,.65);
    e.hp-=amount;e.flash=.12+power*.08;e.stunned=Math.max(e.stunned,(.18+power*.06)*(1-poiseResist));
    director.releaseAllForEnemy(e);factionService?.releaseTarget?.(e);
    if(e.state!=='idle'){e.state='idle';e.stateTime=0;e.attack=null;}
    e.knockX+=(knock.x||0)*(1-poiseResist);e.knockZ+=(knock.z||0)*(1-poiseResist);
    if(power>.95)e.vyOff+=(1.1+power*1.4)*(1-poiseResist);
    if(e.hp<=0){kills++;waveKills++;if(factionService?.charmedEnemy===e)factionService.releaseCharm(e);spawnDeathPieces(e,knock,1+power*.25);removeEnemy(e);return true;}
    return false;
  }

  function setEnemyFaction(e,faction){
    if(!e||!enemies.includes(e)||e.hp<=0)return false;
    director.releaseAllForEnemy(e);factionService?.releaseTarget?.(e);
    e.wizardFaction=faction==='allied'?'allied':'hostile';e.state='idle';e.stateTime=0;e.attack=null;e.hitDone=false;e.vx=e.vz=0;
    return true;
  }

  function spawnPos(){
    const room=navigation?.randomSpawn?.(activeEncounterRoomId,lastPlayer);if(room)return room;
    const a=Math.random()*Math.PI*2,r=rand(arenaRadius*.62,arenaRadius-1.5);return{x:(lastPlayer.x??0)+Math.cos(a)*r,z:(lastPlayer.z??0)+Math.sin(a)*r};
  }
  function chooseSpawnKind(i){
    if(tuning.spawnKind===FLARE_LEVEL_1_POOL_ID)return FLARE_LEVEL_1_IDS[(wave-1+i)%FLARE_LEVEL_1_IDS.length];
    return isFlareEnemy(tuning.spawnKind)?tuning.spawnKind:FLARE_LEVEL_1_IDS[(wave-1+i)%FLARE_LEVEL_1_IDS.length];
  }
  function startWave(){
    waveKills=0;waveClearT=0;const count=clamp(Math.round(tuning.waveSize),1,tuning.waveSizeLimit);
    for(let i=0;i<count;i++){const p=spawnPos();makeEnemy(chooseSpawnKind(i),p.x,p.z);}
  }
  function finishWave(){wave++;director.onWaveClear();startWave();}
  function clearDeathPieces(){deathPieces.splice(0).forEach(p=>{p.mesh.parent?.remove(p.mesh);p.mesh.geometry?.dispose?.();p.mesh.material?.dispose?.();});}
  function clearEnemies(){director.reset();enemies.splice(0).forEach(e=>{factionService?.releaseTarget?.(e);e.root.parent?.remove(e.root);rig.dispose(e.visual);});bleeds.length=0;clearDeathPieces();}
  function startRoomEncounter(roomId){clearEnemies();activeEncounterRoomId=roomId;waveKills=0;waveClearT=0;startWave();}
  function reset(){clearEnemies();wave=1;kills=0;tuning.playerHp=100;tuning.lastPlayerHit='';tuning.lastPlayerHitDir=null;activeEncounterRoomId=null;if(!roomEncounterMode)startWave();}
  function update(dt,player){
    lastPlayer=player||lastPlayer;time+=dt;
    director.update(dt,{enemies,player:lastPlayer,pressureBudget:director.settings.pressureBudget,aggression:tuning.aggression});
    director.markNearEligible(enemies,lastPlayer);director.assignBattleCircleSlots(enemies);
    for(const e of enemies){e._sx=e.x;e._sz=e.z;}
    for(const e of [...enemies]){
      if(e.__heroicLeapCarried){e.vx=e.vz=e.knockX=e.knockZ=0;e.state='idle';e.attack=null;continue;}
      const locked=e.state!=='idle'&&!!e.wizardTargetId;
      const target=factionService?.targetForActor?.(e,lastPlayer,{locked})||(!factionService?lastPlayer:null);
      if(target)updateEnemy(e,dt,target);else{e.vx*=Math.pow(.02,dt);e.vz*=Math.pow(.02,dt);e.cooldown=Math.max(0,e.cooldown-dt);}
    }
    resolveBodies(lastPlayer);
    for(const e of enemies){e.maxGroundSpeed=Math.max(.1,e.speed*tuning.speedScale);e.visualGroundSpeed=Math.min(e.maxGroundSpeed,Math.hypot(e.x-e._sx,e.z-e._sz)/Math.max(dt,.001));updateVisual(e,dt);}
    updateBleeds(dt);updateDeathPieces(dt);
    const hostileRemaining=enemies.some(enemy=>(factionService?.arenaFactionOf?.(enemy)||'hostile')==='hostile');
    if(!hostileRemaining&&!playerDead()){
      waveClearT+=dt;if(waveClearT>1){if(roomEncounterMode&&activeEncounterRoomId!==null){const id=activeEncounterRoomId;activeEncounterRoomId=null;waveClearT=0;director.onWaveClear();onEncounterCleared?.(id);}else if(!roomEncounterMode)finishWave();}
    }else waveClearT=0;
  }

  if(!roomEncounterMode)startWave();
  return {
    enemies,group,director,update,damageEnemy,setEnemyFaction,reset,startRoomEncounter,clearRoomRuntime:clearEnemies,
    setDirectorMode:m=>director.setMode(m),
    setPressureBudget:v=>{director.settings.pressureBudget=clamp(Number(v)||2.25,.5,4);},
    setAggression:v=>{tuning.aggression=clamp(Number(v)||1,.25,3);director.settings.aggression=tuning.aggression;},
    setCycleOnWaveClear:v=>{director.settings.cycleOnWaveClear=!!v;},
    setWaveSize:(v,options={})=>{tuning.waveSizeLimit=options?.source==='enemy-lab'?ENEMY_LAB_MAX_DIRECT_COUNT:20;tuning.waveSize=clamp(Math.round(Number(v)||6),1,tuning.waveSizeLimit);},
    setSpeedScale:v=>{tuning.speedScale=clamp(Number(v)||1,.25,1.5);},
    setHeightScale:v=>{tuning.heightScale=clamp(Number(v)||1,.5,3.5);},
    setHpScale:v=>{tuning.hpScale=clamp(Number(v)||1,.25,5);},
    setIdleRangeScale:v=>{tuning.idleRangeScale=clamp(Number(v)||3,1,6);director.settings.battleCircleRadius=6.9*(tuning.idleRangeScale/3);director.getDebugState().slots.forEach(s=>s.radius=director.settings.battleCircleRadius);},
    setSpawnKind:kind=>{tuning.spawnKind=kind===FLARE_LEVEL_1_POOL_ID||isFlareEnemy(kind)?kind:FLARE_LEVEL_1_POOL_ID;},
    setGoblinColors:()=>{},setGoblinRigDebug:()=>{},setSpawnGoblins:()=>{},
    get heightScale(){return tuning.heightScale;},get speedScale(){return tuning.speedScale;},get hpScale(){return tuning.hpScale;},get waveSize(){return tuning.waveSize;},get idleRangeScale(){return tuning.idleRangeScale;},get aggression(){return tuning.aggression;},get spawnKind(){return tuning.spawnKind;},
    get wave(){return wave;},get waveKills(){return waveKills;},get kills(){return kills;},get playerHp(){return tuning.playerHp;},get lastPlayerHit(){return tuning.lastPlayerHit;},get lastPlayerHitDir(){return tuning.lastPlayerHitDir||null;},get activeEncounterRoomId(){return activeEncounterRoomId;},
  };
}
