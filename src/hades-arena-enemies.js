import { createCombatDirector, DEFAULT_DIRECTOR_SETTINGS } from './combat-director.js';
import {
  HADES_ATTACKS,
  HADES_ENEMY_ARCHETYPES,
  HADES_TARTARUS_IDS,
  HADES_TARTARUS_POOL_ID,
  isHadesEnemy,
} from './hades-enemies.js';
import { createHadesEncounterPlan } from './hades-encounter-director.js';
import { installHadesEnemyRig } from './hades-enemy-rig.js';

const PLAYER_R=1.05;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const norm=(x,z)=>{const d=Math.hypot(x,z)||1;return{x:x/d,z:z/d};};
const wrapPi=a=>Math.atan2(Math.sin(a),Math.cos(a));
const pointSegmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1;const t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/l2,0,1);return Math.hypot(p.x-(a.x+dx*t),p.z-(a.z+dz*t));};

export function createHadesArenaEnemySystem({THREE,worldRoot,arenaRadius=18,navigation=null,roomEncounterMode=false,onEncounterCleared=null,factionService=null,systemKey='hades',onActivityTransition=null}={}){
  const rig=installHadesEnemyRig(THREE);
  const group=new THREE.Group();
  group.name='Hades Tartarus Enemies';
  worldRoot.add(group);

  const director=createCombatDirector({...DEFAULT_DIRECTOR_SETTINGS,pressureBudget:2.25,battleCircleRadius:6.9});
  const enemies=[];
  const projectiles=[];
  const mines=[];
  const effects=[];
  const deathPieces=[];
  const restraints=[];
  const spawnTelegraphs=[];
  let spawnQueue=[];

  const tuning={
    playerHp:100,
    lastPlayerHit:'',
    lastPlayerHitDir:null,
    heightScale:1.5,
    speedScale:.5,
    hpScale:2.5,
    waveSize:6,
    idleRangeScale:3,
    aggression:1,
    spawnKind:HADES_TARTARUS_POOL_ID,
    territoryEnabled:true,
    telegraphedSpawns:true,
    encounterPlanningEnabled:true,
    pursuitBudgetScale:1,
    combatDirectorEnabled:true,
  };

  let wave=1;
  let encounterDepth=0;
  let kills=0;
  let waveKills=0;
  let waveClearT=0;
  let nextId=1;
  let time=0;
  let activeEncounterRoomId=null;
  let currentEncounterPlan=null;
  let lastPlayer={x:0,z:0,invulnerable:false};
  const reportActivity=(kind,count)=>{
    if(Number(count)>0)onActivityTransition?.({kind,count,systemKey});
  };

  const markerMat=new THREE.MeshStandardMaterial({color:0xf2d3c0,roughness:.5,flatShading:true});
  const markerBg=new THREE.MeshStandardMaterial({color:0x281b25,roughness:.85,flatShading:true});
  const telegraphMat=new THREE.MeshBasicMaterial({color:0xff684d,transparent:true,opacity:.82,depthWrite:false});
  const tokenMat=new THREE.MeshBasicMaterial({color:0xc86cff,transparent:true,opacity:.7,depthWrite:false});
  const orbMat=new THREE.MeshStandardMaterial({color:0xb85cff,emissive:0x7d28ba,emissiveIntensity:.9,roughness:.3,flatShading:true});
  const mineMat=new THREE.MeshStandardMaterial({color:0x59313c,emissive:0xe75c42,emissiveIntensity:.35,roughness:.7,flatShading:true});
  const chainMat=new THREE.LineBasicMaterial({color:0xf05b53,transparent:true,opacity:.9});
  const beamMat=new THREE.LineBasicMaterial({color:0xff604f,transparent:true,opacity:.95});

  const rangeK=()=>tuning.idleRangeScale/3;
  const collisionRadius=e=>e.radius*tuning.heightScale*(e.collisionScale||1);
  const separationRadius=e=>collisionRadius(e)*(e.separationScale||1.04);
  const playerDead=()=>tuning.playerHp<=0;
  const live=e=>e&&e.hp>0&&enemies.includes(e);
  const activeWeight=()=>enemies.reduce((sum,e)=>sum+(e.def.activeWeight||1),0);
  const pendingWeight=()=>spawnTelegraphs.reduce((sum,s)=>sum+(s.def.activeWeight||1),0);
  const pursuitBudget=()=>((currentEncounterPlan?.pursuitWeightCap)||3)*tuning.pursuitBudgetScale;

  function setFacing(e,a){e.facingAngle=wrapPi(a);e.facing.x=Math.sin(e.facingAngle);e.facing.z=Math.cos(e.facingAngle);}
  function turnTo(e,p,dt,mult=1){const goal=Math.atan2(p.x-e.x,p.z-e.z),delta=wrapPi(goal-e.facingAngle),max=Math.max(.1,e.turnSpeed)*mult*dt;setFacing(e,e.facingAngle+clamp(delta,-max,max));return Math.abs(delta);}
  function approach(cur,goal,dt,rate=6){return cur+(goal-cur)*Math.min(1,dt*rate);}
  function steer(e,dx,dz,amount,dt){const s=e.speed*tuning.speedScale;e.vx=approach(e.vx,dx*s*amount,dt);e.vz=approach(e.vz,dz*s*amount,dt);}
  function seek(e,p,dt,amount=1){const target=navigation?.nextWaypoint?.(e,p,activeEncounterRoomId)||p;const d=norm(target.x-e.x,target.z-e.z);steer(e,d.x,d.z,amount,dt);}
  function orbit(e,p,dt,desired,amount=.45){const rx=e.x-p.x,rz=e.z-p.z,r=Math.hypot(rx,rz)||1,tx=-rz/r*e.orbitDir,tz=rx/r*e.orbitDir,corr=clamp((desired-r)*.7,-1,1);steer(e,tx-rx/r*corr,tz-rz/r*corr,amount,dt);}
  function keepRange(e,p,dt,desired){const rx=e.x-p.x,rz=e.z-p.z,r=Math.hypot(rx,rz)||1;if(r<desired-.45)steer(e,rx/r,rz/r,.8,dt);else if(r>desired+.65)steer(e,-rx/r,-rz/r,.65,dt);else orbit(e,p,dt,desired,.5);}

  function guardHome(e,p,dt){
    const home={x:e.homeX,z:e.homeZ};
    const hd=Math.hypot(e.x-home.x,e.z-home.z);
    if(hd>Math.max(.7,e.homeRadius*.62))seek(e,home,dt,.72);
    else orbit(e,home,dt,Math.max(.35,e.homeRadius*.32),.18);
    turnTo(e,p,dt,.7);
  }

  function moveEnemy(e,p,dt,d){
    if(e.def.role==='spawner'){e.vx=e.vz=0;turnTo(e,p,dt,.35);return;}
    const desired=e.preferredRange*rangeK();
    const converted=factionService?.arenaFactionOf?.(e)==='allied';
    if(!tuning.territoryEnabled||converted){
      if(e.thrower||e.def.role==='beam'||e.def.role==='trapper'||e.def.role==='ranged')keepRange(e,p,dt,desired);
      else if(e.def.role==='charger'){if(d>desired*.85)seek(e,p,dt,1);else orbit(e,p,dt,desired*.72,.28);}
      else if(d>desired+.6)seek(e,p,dt,.9);else orbit(e,p,dt,desired,.36);
      turnTo(e,p,dt,e.thrower?.85:1);
      return;
    }

    const mode=e.territoryMode;
    const home={x:e.homeX,z:e.homeZ};
    const homeDistance=Math.hypot(e.x-home.x,e.z-home.z);

    if(mode==='sentry'){
      if(homeDistance>e.homeRadius)seek(e,home,dt,.75);
      else{e.vx*=Math.pow(.025,dt);e.vz*=Math.pow(.025,dt);}
      turnTo(e,p,dt,.72);
      return;
    }

    if(mode==='skirmisher'||mode==='trapper'){
      if(homeDistance>e.leashRadius||d>desired*1.85){seek(e,home,dt,.8);turnTo(e,p,dt,.65);return;}
      keepRange(e,p,dt,desired);
      turnTo(e,p,dt,e.thrower?.85:1);
      return;
    }

    if((mode==='frontliner'||mode==='pursuer')&&!e.pursuitAllowed){
      guardHome(e,p,dt);
      return;
    }

    if(homeDistance>e.leashRadius&&d>desired){
      seek(e,home,dt,.9);
      turnTo(e,p,dt,.75);
      return;
    }

    if(e.def.role==='charger'){if(d>desired*.85)seek(e,p,dt,1);else orbit(e,p,dt,desired*.72,.28);}
    else if(d>desired+.6)seek(e,p,dt,.9);else orbit(e,p,dt,desired,.36);
    turnTo(e,p,dt,1);
  }

  function updatePursuitAssignments(){
    if(!tuning.territoryEnabled){for(const e of enemies)e.pursuitAllowed=true;return;}
    const candidates=enemies
      .filter(e=>e.hp>0&&(e.def.pursuitWeight||0)>0&&(factionService?.arenaFactionOf?.(e)||'hostile')==='hostile')
      .sort((a,b)=>Math.hypot(a.x-lastPlayer.x,a.z-lastPlayer.z)-Math.hypot(b.x-lastPlayer.x,b.z-lastPlayer.z));
    for(const e of enemies)e.pursuitAllowed=factionService?.arenaFactionOf?.(e)==='allied';
    let used=0;
    for(const e of candidates){
      const weight=e.def.pursuitWeight||1;
      if(used+weight<=pursuitBudget()||used===0){e.pursuitAllowed=true;used+=weight;}
    }
  }

  function applySeparation(e,dt){let sx=0,sz=0;for(const o of enemies){if(o===e||o.hp<=0)continue;let dx=e.x-o.x,dz=e.z-o.z,d=Math.hypot(dx,dz),comfort=separationRadius(e)+separationRadius(o)+.25;if(d>=comfort)continue;if(d<.001){dx=1;dz=0;d=1;}const k=1-d/comfort;sx+=dx/d*k;sz+=dz/d*k;}const l=Math.hypot(sx,sz);if(!l)return;const s=e.speed*tuning.speedScale;e.vx=clamp(e.vx+sx/l*s*dt*5,-s,s);e.vz=clamp(e.vz+sz/l*s*dt*5,-s,s);}
  function makeLine(material){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const l=new THREE.Line(g,material);l.visible=false;group.add(l);return l;}

  function makeEnemy(kind,x,z,extra={}){
    const def=HADES_ENEMY_ARCHETYPES[kind];
    if(!def)return null;
    const root=new THREE.Group();
    root.name=`${def.label} arena enemy`;
    const visual=rig.create(kind,def);
    root.add(visual.group);
    const barBg=new THREE.Mesh(new THREE.BoxGeometry(def.radius*1.8,.06,.04),markerBg);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(def.radius*1.8,.07,.05),markerMat);
    barBg.position.set(0,def.height+.35,0);
    bar.position.copy(barBg.position);
    bar.position.z+=.012;
    const telegraph=new THREE.Mesh(new THREE.RingGeometry(.72,.80,34),telegraphMat);
    telegraph.rotation.x=-Math.PI/2;
    telegraph.visible=false;
    const tokenRing=new THREE.Mesh(new THREE.TorusGeometry(def.radius*1.55,.04,6,28),tokenMat);
    tokenRing.rotation.x=Math.PI/2;
    tokenRing.position.y=.08;
    tokenRing.visible=false;
    root.add(barBg,bar,telegraph,tokenRing);
    root.position.set(x,0,z);
    group.add(root);
    const attackTemplate=def.attackId?HADES_ATTACKS[def.attackId]:null;
    const attack=attackTemplate?{...attackTemplate}:null;
    const hp=Math.round(def.hp*tuning.hpScale);
    const a=Math.atan2((lastPlayer.x??0)-x,(lastPlayer.z??0)-z);
    const e={
      id:nextId++,kind,label:def.label,def,x,z,vx:0,vz:0,radius:def.radius,height:def.height,
      wizardFaction:'hostile',wizardStableId:`${systemKey}:${String(nextId-1).padStart(4,'0')}`,
      hp,maxHp:hp,speed:def.speed,score:def.score,role:'hades',preferredRange:def.preferredRange,
      thrower:!!def.thrower,flying:!!def.flying,fusion:false,isElite:false,attackId:def.attackId,
      realAtk:attack,attackRange:attack?.range||0,holdDist:attack?.range||def.preferredRange,
      state:'idle',stateTime:0,cooldown:rand(.2,1.0),spawnGrace:extra.spawnGrace??.18,
      stunned:0,attack:null,windup:0,active:0,recovery:0,hitDone:false,token:null,
      approachPermit:false,approachPermitTime:0,approachCooldown:0,approachCount:0,
      directEngaged:false,nearEligible:true,slotIndex:-1,gesture:null,
      facing:{x:Math.sin(a),z:Math.cos(a)},facingAngle:a,
      turnSpeed:def.role==='charger'?Math.PI*2.4:Math.PI*1.45,
      attackAlign:def.thrower?.95:.68,orbitDir:Math.random()<.5?-1:1,
      knockX:0,knockZ:0,flash:0,yOff:0,vyOff:0,visualGroundSpeed:0,
      maxGroundSpeed:def.speed*tuning.speedScale,targetScale:1,currentTargetScale:1,
      collisionScale:1,separationScale:1,attackOriginForward:0,headCollisionRadius:0,
      targetYOffset:0,summonTimer:def.summonInterval?rand(1.4,def.summonInterval):0,
      spawnedBy:extra.spawnedBy||null,
      territoryMode:def.territoryMode||'frontliner',
      homeX:extra.homeX??x,homeZ:extra.homeZ??z,
      homeRadius:def.homeRadius??7,leashRadius:def.leashRadius??11,pursuitAllowed:false,
      beamLine:def.role==='beam'?makeLine(beamMat):null,beamTick:0,
      root,visual,barBg,bar,telegraph,tokenRing,
    };
    enemies.push(e);
    reportActivity('living',enemies.length);
    return e;
  }

  function setCombatDirectorEnabled(value){
    const enabled=!!value;
    if(tuning.combatDirectorEnabled===enabled)return enabled;
    tuning.combatDirectorEnabled=enabled;
    director.reset();
    for(const e of enemies){
      if(Number.isFinite(e._pressureBaseSpeed))e.speed=e._pressureBaseSpeed;
      if(Number.isFinite(e._pressureBasePreferredRange))e.preferredRange=e._pressureBasePreferredRange;
      delete e._pressureBaseSpeed;
      delete e._pressureBasePreferredRange;
      e.token=null;e.approachPermit=false;e.directEngaged=false;e.slotIndex=-1;e.nearEligible=true;
      const template=e.attackId?HADES_ATTACKS[e.attackId]:null;
      e.realAtk=template?{...template}:null;
      if(e.state==='idle')e.attack=null;
    }
    return enabled;
  }
  function startAttack(e,attack,target){e.attack=attack;e.realAtk=attack;e.state='windup';e.stateTime=0;e.windup=attack.windup;e.active=attack.active;e.recovery=attack.recovery;e.hitDone=false;e.beamTick=0;if(tuning.combatDirectorEnabled&&factionService?.arenaFactionOf?.(e)!=='allied')director.grant(e,attack);factionService?.lockTarget?.(e,target);}
  function hitPlayer(damage,kind,name,dir=null){if(lastPlayer.invulnerable||playerDead())return false;tuning.playerHp=Math.max(0,tuning.playerHp-damage);tuning.lastPlayerHit=`${HADES_ENEMY_ARCHETYPES[kind]?.label||kind} ${name} hit for ${damage}`;tuning.lastPlayerHitDir=dir?{x:dir.x,z:dir.z}:null;return true;}
  function resolveMelee(e,p){const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz),attack=e.attack,targetRadius=p.__arenaTargetKind?(p.radius||PLAYER_R):PLAYER_R;if(d>attack.range*rangeK()+targetRadius)return;if(navigation?.raycastWalls?.({x:e.x,z:e.z},{x:p.x,z:p.z}))return;const delta=Math.abs(wrapPi(Math.atan2(dx,dz)-e.facingAngle));if(delta>attack.arc*.5+.2&&d>collisionRadius(e)+targetRadius+.2)return;const amount=Math.max(1,Math.round(attack.damage)),applied=factionService&&p.__arenaTargetKind?factionService.damageTarget(p,amount,e.facing,{sourceEnemyId:e.wizardStableId,sourceFaction:e.wizardFaction,attack:attack.name},(value,dir)=>hitPlayer(value,e.kind,attack.name,dir)):hitPlayer(amount,e.kind,attack.name,e.facing);if(applied){e.hitDone=true;if(attack.restrain&&(!p.__arenaTargetKind||p.__arenaTargetKind==='player'))startRestraint(e,attack.restrain);}}
  function spawnOrb(e,target){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,1),orbMat);group.add(mesh);const f=e.facing;projectiles.push({mesh,x:e.x+f.x*.65,z:e.z+f.z*.65,vx:f.x*6.4,vz:f.z*6.4,life:2.4,r:.34,damage:e.attack.damage,owner:e.id,arenaTarget:factionService?.captureTarget?.(target)||null,sourceEnemyId:e.wizardStableId,sourceFaction:e.wizardFaction});}
  function spawnMine(e,target){const targetA=Math.atan2(target.x-e.x,target.z-e.z)+rand(-.8,.8),distance=rand(2.2,5.2),tx=e.x+Math.sin(targetA)*distance,tz=e.z+Math.cos(targetA)*distance;const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.34,0),mineMat);group.add(mesh);mines.push({mesh,x:tx,z:tz,owner:e.id,arm:.65,life:8,triggerRadius:1.45,damage:e.attack.damage,arenaTarget:factionService?.captureTarget?.(target)||null,sourceEnemyId:e.wizardStableId,sourceFaction:e.wizardFaction});}
  function detonateMine(m){if(!mines.includes(m))return;const target=m.arenaTarget?factionService?.resolveCapturedTarget?.(m.arenaTarget,lastPlayer,{stale:false}):lastPlayer;if(target){const d=Math.hypot(target.x-m.x,target.z-m.z);if(d<2.35+(target.radius||PLAYER_R)){const dir=norm(target.x-m.x,target.z-m.z);if(factionService&&target.__arenaTargetKind)factionService.damageTarget(target,m.damage,dir,{sourceEnemyId:m.sourceEnemyId,sourceFaction:m.sourceFaction,attack:'Mine Blast'},(value,knock)=>hitPlayer(value,'hadesWretchedPest','Mine Blast',knock));else hitPlayer(m.damage,'hadesWretchedPest','Mine Blast',dir);}}const ring=new THREE.Mesh(new THREE.RingGeometry(.35,.48,28),new THREE.MeshBasicMaterial({color:0xff784e,transparent:true,opacity:1,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(m.x,.08,m.z);group.add(ring);effects.push({mesh:ring,age:0,life:.38,kind:'ring'});m.mesh.parent?.remove(m.mesh);m.mesh.geometry.dispose();mines.splice(mines.indexOf(m),1);}
  function detonateOwnerMines(owner){for(const m of [...mines])if(m.owner===owner)detonateMine(m);}
  function startRestraint(e,duration){const existing=restraints.find(r=>r.source===e);if(existing){existing.t=duration;return;}const line=makeLine(chainMat);line.visible=true;restraints.push({source:e,t:duration,tick:.2,line});}
  function updateRestraints(dt){for(let i=restraints.length-1;i>=0;i--){const r=restraints[i];r.t-=dt;r.tick-=dt;if(!live(r.source)||r.t<=0){r.line.parent?.remove(r.line);r.line.geometry.dispose();restraints.splice(i,1);continue;}const a=new THREE.Vector3(r.source.x,r.source.height*tuning.heightScale*.55,r.source.z),b=new THREE.Vector3(lastPlayer.x,1.2,lastPlayer.z);r.line.geometry.setFromPoints([a,b]);if(r.tick<=0){r.tick+=.25;hitPlayer(1,r.source.kind,'Chain Restraint',norm(lastPlayer.x-r.source.x,lastPlayer.z-r.source.z));}}}
  function updateProjectiles(dt){for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i],prev={x:p.x,z:p.z};p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;if(navigation?.raycastWalls?.(prev,{x:p.x,z:p.z}))p.life=0;const target=p.arenaTarget?factionService?.resolveCapturedTarget?.(p.arenaTarget,lastPlayer,{stale:false}):lastPlayer;if(target&&Math.hypot(p.x-target.x,p.z-target.z)<p.r+(target.radius||PLAYER_R)){const dir=norm(p.vx,p.vz);if(factionService&&target.__arenaTargetKind)factionService.damageTarget(target,p.damage,dir,{sourceEnemyId:p.sourceEnemyId,sourceFaction:p.sourceFaction,attack:'Witch Orb'},(value,knock)=>hitPlayer(value,'hadesWretchedWitch','Witch Orb',knock));else hitPlayer(p.damage,'hadesWretchedWitch','Witch Orb',dir);p.life=0;}p.mesh.position.set(p.x,1.35,p.z);p.mesh.rotation.x+=dt*5;p.mesh.rotation.y+=dt*4;if(p.life<=0){p.mesh.parent?.remove(p.mesh);p.mesh.geometry.dispose();projectiles.splice(i,1);}}}
  function updateMines(dt){for(const m of [...mines]){m.arm-=dt;m.life-=dt;m.mesh.position.set(m.x,.28+Math.sin(time*5+m.x)*.05,m.z);m.mesh.rotation.y+=dt*2.5;m.mesh.material.emissiveIntensity=m.arm<=0?.55+.3*Math.sin(time*10):.15;const target=m.arenaTarget?factionService?.resolveCapturedTarget?.(m.arenaTarget,lastPlayer,{stale:false}):lastPlayer;if((m.arm<=0&&target&&Math.hypot(m.x-target.x,m.z-target.z)<m.triggerRadius+(target.radius||PLAYER_R))||m.life<=0)detonateMine(m);}}
  function updateBeam(e,dt,target){if(!e.beamLine)return;e.beamLine.visible=e.state==='windup'||e.state==='active';if(!e.beamLine.visible)return;if(e.state==='windup')turnTo(e,target,dt,.48);else turnTo(e,target,dt,.12);const start={x:e.x,z:e.z},range=e.attack?.range||13,end={x:e.x+e.facing.x*range,z:e.z+e.facing.z*range};e.beamLine.geometry.setFromPoints([new THREE.Vector3(start.x,e.height*tuning.heightScale*.48,start.z),new THREE.Vector3(end.x,.85,end.z)]);if(e.state==='active'){e.beamTick-=dt;if(e.beamTick<=0){e.beamTick+=Math.max(.055,e.active/Math.max(1,e.attack.beamTicks||17));if(pointSegmentDistance(target,start,end)<.48+(target.radius||PLAYER_R)&&!navigation?.raycastWalls?.(start,{x:target.x,z:target.z})){const amount=e.attack.tickDamage??e.attack.damage;if(factionService&&target.__arenaTargetKind)factionService.damageTarget(target,amount,e.facing,{sourceEnemyId:e.wizardStableId,sourceFaction:e.wizardFaction,attack:e.attack.name},(value,knock)=>hitPlayer(value,e.kind,e.attack.name,knock));else hitPlayer(amount,e.kind,e.attack.name,e.facing);}}}}

  function pendingChildCount(sourceId){
    return enemies.filter(x=>x.spawnedBy===sourceId&&x.hp>0).length+
      spawnTelegraphs.filter(x=>x.extra?.spawnedBy===sourceId).length+
      spawnQueue.filter(x=>x.extra?.spawnedBy===sourceId).length;
  }

  function updateSpawner(e,dt){
    if(e.def.role!=='spawner')return;
    e.summonTimer-=dt;
    if(e.summonTimer>0||playerDead())return;
    if(pendingChildCount(e.id)>=e.def.summonCap){e.summonTimer=.8;return;}
    const a=Math.random()*Math.PI*2,r=rand(1.2,2.0);
    const resolved={x:e.x+Math.cos(a)*r,z:e.z+Math.sin(a)*r};
    queueSpawn(e.def.summonId,resolved,{spawnedBy:e.id,spawnGrace:.25,delay:.48,priority:true});
    e.summonTimer=e.def.summonInterval;
  }

  function updateEnemy(e,dt,p){
    if(e.hp<=0)return;
    const prev={x:e.x,z:e.z};
    e.stateTime+=dt;
    e.cooldown=Math.max(0,e.cooldown-dt);
    e.spawnGrace=Math.max(0,e.spawnGrace-dt);
    e.flash=Math.max(0,e.flash-dt);
    e.x+=e.knockX*dt;
    e.z+=e.knockZ*dt;
    e.knockX*=Math.pow(.07,dt);
    e.knockZ*=Math.pow(.07,dt);
    if(e.yOff>0||e.vyOff!==0){e.vyOff-=22*dt;e.yOff=Math.max(0,e.yOff+e.vyOff*dt);if(!e.yOff&&e.vyOff<0)e.vyOff=0;}
    updateSpawner(e,dt);
    if(e.stunned>0){e.stunned-=dt;e.vx*=Math.pow(.005,dt);e.vz*=Math.pow(.005,dt);}
    else if(e.state==='windup'){
      e.vx=e.vz=0;
      if(!e.attack?.beam&&e.stateTime<e.windup*.55)turnTo(e,p,dt,.55);
      if(e.stateTime>=e.windup){e.state='active';e.stateTime=0;if(e.attack.projectile){spawnOrb(e,p);e.hitDone=true;}if(e.attack.mine){spawnMine(e,p);e.hitDone=true;}}
    }else if(e.state==='active'){
      if(!e.attack.projectile&&!e.attack.mine&&!e.attack.beam){e.x+=e.facing.x*(e.attack.lungeSpeed||3.5)*dt;e.z+=e.facing.z*(e.attack.lungeSpeed||3.5)*dt;if(!e.hitDone)resolveMelee(e,p);}
      if(e.stateTime>=e.active){e.state='recovery';e.stateTime=0;}
    }else if(e.state==='recovery'){
      e.vx=e.vz=0;
      if(e.stateTime>=e.recovery){e.state='idle';e.stateTime=0;e.cooldown=e.attack.cooldown/tuning.aggression;if(tuning.combatDirectorEnabled)director.release(e);factionService?.releaseTarget?.(e);e.attack=null;}
    }else if(e.def.role!=='spawner'){
      const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz),attack=e.realAtk,alignment=Math.abs(wrapPi(Math.atan2(dx,dz)-e.facingAngle));
      const converted=factionService?.arenaFactionOf?.(e)==='allied';
      const directorAllows=converted||!tuning.combatDirectorEnabled||director.canGrant(e,attack,{enemies,pressureBudget:director.settings.pressureBudget,aggression:tuning.aggression});
      if(e.spawnGrace<=0&&attack&&e.cooldown<=0&&!playerDead()&&d<=attack.range*rangeK()+.9&&alignment<=e.attackAlign&&directorAllows)startAttack(e,attack,p);
      else{moveEnemy(e,p,dt,d);applySeparation(e,dt);e.x+=e.vx*dt;e.z+=e.vz*dt;}
    }
    updateBeam(e,dt,p);
    if(navigation?.resolveMovement){const moved=navigation.resolveMovement(prev,{x:e.x-prev.x,z:e.z-prev.z},collisionRadius(e));e.x=moved.x;e.z=moved.z;}
    else{const r=Math.hypot(e.x,e.z),limit=arenaRadius-1;if(r>limit){e.x*=limit/r;e.z*=limit/r;}}
  }

  function resolveBodies(p){for(let pass=0;pass<3;pass++)for(let i=0;i<enemies.length;i++){const a=enemies[i];if(a.hp<=0||a.__heroicLeapCarried)continue;for(let j=i+1;j<enemies.length;j++){const b=enemies[j];if(b.hp<=0||b.__heroicLeapCarried)continue;let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),min=separationRadius(a)+separationRadius(b)+.16;if(d>=min)continue;if(d<.001){dx=1;dz=0;d=1;}const push=(min-d)*.5/d;a.x-=dx*push;a.z-=dz*push;b.x+=dx*push;b.z+=dz*push;}let dx=a.x-p.x,dz=a.z-p.z,d=Math.hypot(dx,dz),min=collisionRadius(a)+PLAYER_R;if(d<min){if(d<.001){dx=1;dz=0;d=1;}const push=(min-d)/d;a.x+=dx*push;a.z+=dz*push;}}}
  function updateVisual(e,dt){e.root.position.set(e.x,e.yOff+(e.flying?.35:0)+(Number(e.wizardAirborneOffset)||0),e.z);e.root.rotation.y=e.facingAngle;rig.update(e.visual,e,dt,time,tuning.heightScale);e.telegraph.visible=e.state==='windup';if(e.telegraph.visible){const u=clamp(e.stateTime/Math.max(.001,e.windup),0,1);e.telegraph.scale.setScalar(.65+u*.85);e.telegraph.material.opacity=.3+u*.6;}e.tokenRing.visible=!!e.token;const f=clamp(e.hp/e.maxHp,0,1);e.bar.scale.x=f;e.bar.position.x=-(1-f)*e.radius*.9;e.bar.lookAt(lastPlayer.x??0,2,lastPlayer.z??0);e.visual.group.scale.multiplyScalar(1+e.flash*.3);}
  function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const f=effects[i];f.age+=dt;const u=f.age/f.life;f.mesh.scale.setScalar(1+u*3);f.mesh.material.opacity=1-u;if(f.age>=f.life){f.mesh.parent?.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();effects.splice(i,1);}}}
  function spawnDeath(e,knock,power){const colors=[e.def.color,e.def.secondaryColor,e.def.accentColor,0xd1c6a5];for(let i=0;i<6;i++){const s=rand(.18,.42),m=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.85,flatShading:true}));m.position.set(e.x,rand(.5,e.height*tuning.heightScale*.7),e.z);worldRoot.add(m);deathPieces.push({mesh:m,vx:(knock.x||0)*.45+rand(-2.2,2.2)*power,vy:rand(2.8,6.0)*power,vz:(knock.z||0)*.45+rand(-2.2,2.2)*power,life:rand(.65,1.2)});}}
  function updateDeath(dt){for(let i=deathPieces.length-1;i>=0;i--){const p=deathPieces[i];p.life-=dt;p.vy-=14*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y=Math.max(.06,p.mesh.position.y+p.vy*dt);p.mesh.position.z+=p.vz*dt;p.mesh.rotation.x+=dt*5;p.mesh.rotation.z+=dt*4;if(p.life<=0){p.mesh.parent?.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();deathPieces.splice(i,1);}}}
  function removeEnemy(e){const i=enemies.indexOf(e);if(i>=0)enemies.splice(i,1);director.releaseAllForEnemy(e);e.beamLine?.parent?.remove(e.beamLine);e.beamLine?.geometry?.dispose?.();e.root.parent?.remove(e.root);rig.dispose(e.visual);}
  function damageEnemy(e,amount,knock={x:0,z:0},opts={}){if(!e||e.hp<=0)return false;const modified=factionService?.modifyDamage?.(e,amount,opts);if(modified){amount=modified.damage;opts={...opts,__arenaDamageModified:true,damageModifiers:modified.applied};}const power=opts.power??clamp(amount/28,.4,2),committed=!!(e.attack?.uninterruptible&&e.state==='active');e.hp-=amount;e.flash=.12+power*.08;if(!committed){e.stunned=Math.max(e.stunned,.17+power*.055);director.releaseAllForEnemy(e);factionService?.releaseTarget?.(e);if(e.state!=='idle'){e.state='idle';e.stateTime=0;e.attack=null;}e.knockX+=(knock.x||0)*.72;e.knockZ+=(knock.z||0)*.72;if(power>.95)e.vyOff+=1.1+power*1.4;}if(e.hp<=0){kills++;waveKills++;factionService?.releaseTarget?.(e);if(factionService?.charmedEnemy===e)factionService.releaseCharm(e);if(e.kind==='hadesWretchedPest')detonateOwnerMines(e.id);spawnDeath(e,knock,1+power*.25);removeEnemy(e);return true;}return false;}

  function setEnemyFaction(e,faction){if(!e||!enemies.includes(e)||e.hp<=0)return false;director.releaseAllForEnemy(e);factionService?.releaseTarget?.(e);e.wizardFaction=faction==='allied'?'allied':'hostile';e.state='idle';e.stateTime=0;e.attack=null;e.hitDone=false;e.vx=e.vz=0;return true;}

  function candidateSpawn(kind){
    const def=HADES_ENEMY_ARCHETYPES[kind];
    const preferred=def?.territoryMode==='sentry'||def?.territoryMode==='skirmisher'||def?.territoryMode==='trapper'?9:6;
    let best=null;
    let bestScore=-Infinity;
    const occupied=[...enemies.map(e=>({x:e.x,z:e.z})),...spawnTelegraphs.map(s=>({x:s.x,z:s.z}))];
    for(let i=0;i<10;i++){
      let p=navigation?.randomSpawn?.(activeEncounterRoomId,lastPlayer);
      if(!p){const a=Math.random()*Math.PI*2,r=rand(arenaRadius*.38,arenaRadius-1.5);p={x:(lastPlayer.x??0)+Math.cos(a)*r,z:(lastPlayer.z??0)+Math.sin(a)*r};}
      const playerDistance=Math.hypot(p.x-lastPlayer.x,p.z-lastPlayer.z);
      const spacing=occupied.length?Math.min(...occupied.map(o=>Math.hypot(p.x-o.x,p.z-o.z))):8;
      const score=-Math.abs(playerDistance-preferred)+Math.min(6,spacing)*.72+Math.random()*.25;
      if(score>bestScore){best=p;bestScore=score;}
    }
    return best||{x:lastPlayer.x+preferred,z:lastPlayer.z};
  }

  function destroySpawnTelegraph(s){
    s.mesh.parent?.remove(s.mesh);
    s.mesh.geometry?.dispose?.();
    s.mesh.material?.dispose?.();
  }

  function beginSpawnTelegraph(entry){
    const def=HADES_ENEMY_ARCHETYPES[entry.kind];
    if(!def)return;
    const p=entry.position||candidateSpawn(entry.kind);
    if(!tuning.telegraphedSpawns){makeEnemy(entry.kind,p.x,p.z,{...entry.extra,homeX:p.x,homeZ:p.z});return;}
    const radius=Math.max(.72,def.radius*1.2);
    const material=new THREE.MeshBasicMaterial({color:def.accentColor||0xff684d,transparent:true,opacity:.68,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.RingGeometry(radius*.72,radius,36),material);
    mesh.rotation.x=-Math.PI/2;
    mesh.position.set(p.x,.065,p.z);
    group.add(mesh);
    const duration=entry.extra?.delay??currentEncounterPlan?.spawnDelay??.82;
    spawnTelegraphs.push({kind:entry.kind,def,x:p.x,z:p.z,t:duration,total:duration,mesh,extra:entry.extra||{}});
    reportActivity('telegraph',spawnTelegraphs.length);
  }

  function queuedKindCount(kind){
    return enemies.filter(e=>e.kind===kind&&e.hp>0).length+
      spawnTelegraphs.filter(s=>s.kind===kind).length;
  }

  function releaseQueuedSpawns(){
    if(!spawnQueue.length)return;
    const telegraphLimit=currentEncounterPlan?.simultaneousTelegraphs??1;
    let guard=0;
    while(spawnQueue.length&&spawnTelegraphs.length<telegraphLimit&&guard++<40){
      const cap=currentEncounterPlan?.activeWeightCap??Math.max(2.5,tuning.waveSize*.65);
      const canOverflow=!enemies.length&&!spawnTelegraphs.length;
      const index=spawnQueue.findIndex(entry=>{
        const def=HADES_ENEMY_ARCHETYPES[entry.kind];
        if(!def)return true;
        if(queuedKindCount(entry.kind)>=def.maxActive)return false;
        return canOverflow||activeWeight()+pendingWeight()+(def.activeWeight||1)<=cap;
      });
      if(index<0)break;
      const [entry]=spawnQueue.splice(index,1);
      if(!HADES_ENEMY_ARCHETYPES[entry.kind])continue;
      beginSpawnTelegraph(entry);
      if(!tuning.telegraphedSpawns)continue;
    }
  }

  function queueSpawn(kind,position=null,extra={}){
    const entry={kind,position,extra};
    if(extra.priority)spawnQueue.unshift(entry);else spawnQueue.push(entry);
    reportActivity('queue',spawnQueue.length);
  }

  function updateSpawnTelegraphs(dt){
    for(let i=spawnTelegraphs.length-1;i>=0;i--){
      const s=spawnTelegraphs[i];
      s.t-=dt;
      const u=clamp(1-s.t/Math.max(.001,s.total),0,1);
      const pulse=.92+Math.sin(time*(8+u*9))*Math.min(.12,.035+u*.08);
      s.mesh.scale.setScalar((.72+u*.52)*pulse);
      s.mesh.rotation.z+=dt*(.45+u*1.6);
      s.mesh.material.opacity=.26+u*.68;
      if(s.t<=0){
        destroySpawnTelegraph(s);
        spawnTelegraphs.splice(i,1);
        makeEnemy(s.kind,s.x,s.z,{...s.extra,homeX:s.x,homeZ:s.z});
      }
    }
  }

  function oldStyleEntries(count){
    if(tuning.spawnKind!==HADES_TARTARUS_POOL_ID)return Array.from({length:count},()=>tuning.spawnKind);
    return Array.from({length:count},(_,i)=>HADES_TARTARUS_IDS[(wave-1+i)%HADES_TARTARUS_IDS.length]);
  }

  function startWave(){
    waveKills=0;
    waveClearT=0;
    const depth=roomEncounterMode?Math.max(1,encounterDepth):Math.max(1,wave);
    currentEncounterPlan=tuning.encounterPlanningEnabled
      ?createHadesEncounterPlan({depth,targetCount:tuning.waveSize,spawnKind:tuning.spawnKind})
      :{
        depth,typeIds:[],composition:'legacy-round-robin',
        entries:oldStyleEntries(clamp(Math.round(tuning.waveSize),1,20)),
        activeWeightCap:Math.max(2.5,tuning.waveSize*.65),
        pursuitWeightCap:3,simultaneousTelegraphs:2,spawnDelay:.72,
      };
    spawnQueue=currentEncounterPlan.entries.map(kind=>({kind,position:null,extra:{}}));
    reportActivity('queue',spawnQueue.length);
    releaseQueuedSpawns();
  }

  function finishWave(){wave++;if(tuning.combatDirectorEnabled)director.onWaveClear();startWave();}
  function clearDeath(){deathPieces.splice(0).forEach(p=>{p.mesh.parent?.remove(p.mesh);p.mesh.geometry?.dispose?.();p.mesh.material?.dispose?.();});}
  function clearRuntime(){
    director.reset();
    enemies.splice(0).forEach(e=>{factionService?.releaseTarget?.(e);e.beamLine?.parent?.remove(e.beamLine);e.beamLine?.geometry?.dispose?.();e.root.parent?.remove(e.root);rig.dispose(e.visual);});
    projectiles.splice(0).forEach(p=>{p.mesh.parent?.remove(p.mesh);p.mesh.geometry?.dispose?.();});
    mines.splice(0).forEach(m=>{m.mesh.parent?.remove(m.mesh);m.mesh.geometry?.dispose?.();});
    restraints.splice(0).forEach(r=>{r.line.parent?.remove(r.line);r.line.geometry?.dispose?.();});
    effects.splice(0).forEach(f=>{f.mesh.parent?.remove(f.mesh);f.mesh.geometry?.dispose?.();f.mesh.material?.dispose?.();});
    spawnTelegraphs.splice(0).forEach(destroySpawnTelegraph);
    spawnQueue=[];
    currentEncounterPlan=null;
    clearDeath();
  }

  function startRoomEncounter(roomId){
    clearRuntime();
    activeEncounterRoomId=roomId;
    encounterDepth++;
    wave=encounterDepth;
    waveKills=0;
    waveClearT=0;
    startWave();
  }

  function reset(){
    clearRuntime();
    wave=1;
    encounterDepth=0;
    kills=0;
    tuning.playerHp=100;
    tuning.lastPlayerHit='';
    tuning.lastPlayerHitDir=null;
    activeEncounterRoomId=null;
    if(!roomEncounterMode)startWave();
  }

  function update(dt,player){
    lastPlayer=player||lastPlayer;
    time+=dt;
    updateSpawnTelegraphs(dt);
    releaseQueuedSpawns();
    updatePursuitAssignments();
    if(tuning.combatDirectorEnabled){
      director.update(dt,{enemies,player:lastPlayer,pressureBudget:director.settings.pressureBudget,aggression:tuning.aggression});
      director.markNearEligible(enemies,lastPlayer);
      director.assignBattleCircleSlots(enemies);
    }else{
      for(const e of enemies){e.token=null;e.directEngaged=false;e.nearEligible=true;e.slotIndex=-1;}
    }
    for(const e of enemies){e._sx=e.x;e._sz=e.z;}
    for(const e of [...enemies]){
      if(e.__heroicLeapCarried){e.vx=e.vz=e.knockX=e.knockZ=0;e.state='idle';e.attack=null;continue;}
      const locked=e.state!=='idle'&&!!e.wizardTargetId;
      const target=factionService?.targetForActor?.(e,lastPlayer,{locked})||(!factionService?lastPlayer:null);
      if(target)updateEnemy(e,dt,target);else{e.vx*=Math.pow(.02,dt);e.vz*=Math.pow(.02,dt);e.cooldown=Math.max(0,e.cooldown-dt);}
    }
    resolveBodies(lastPlayer);
    for(const e of enemies){e.maxGroundSpeed=Math.max(.1,e.speed*tuning.speedScale);e.visualGroundSpeed=Math.min(e.maxGroundSpeed,Math.hypot(e.x-e._sx,e.z-e._sz)/Math.max(dt,.001));updateVisual(e,dt);}
    updateProjectiles(dt);
    updateMines(dt);
    updateRestraints(dt);
    updateEffects(dt);
    updateDeath(dt);
    releaseQueuedSpawns();
    const hostileRemaining=enemies.some(enemy=>(factionService?.arenaFactionOf?.(enemy)||'hostile')==='hostile');
    if(!hostileRemaining&&!spawnQueue.length&&!spawnTelegraphs.length&&!playerDead()){
      waveClearT+=dt;
      if(waveClearT>1){
        if(roomEncounterMode&&activeEncounterRoomId!==null){
          const id=activeEncounterRoomId;
          activeEncounterRoomId=null;
          waveClearT=0;
          if(tuning.combatDirectorEnabled)director.onWaveClear();
          onEncounterCleared?.(id);
        }else if(!roomEncounterMode)finishWave();
      }
    }else waveClearT=0;
  }

  if(!roomEncounterMode)startWave();

  return{
    enemies,group,director,update,damageEnemy,setEnemyFaction,reset,startRoomEncounter,clearRoomRuntime:clearRuntime,setCombatDirectorEnabled,
    setDirectorMode:m=>director.setMode(m),
    setPressureBudget:v=>{director.settings.pressureBudget=clamp(Number(v)||2.25,.5,4);},
    setAggression:v=>{tuning.aggression=clamp(Number(v)||1,.25,3);director.settings.aggression=tuning.aggression;},
    setCycleOnWaveClear:v=>{director.settings.cycleOnWaveClear=!!v;},
    setWaveSize:v=>{tuning.waveSize=clamp(Math.round(Number(v)||6),1,20);},
    setSpeedScale:v=>{tuning.speedScale=clamp(Number(v)||1,.25,1.5);},
    setHeightScale:v=>{tuning.heightScale=clamp(Number(v)||1,.5,3.5);},
    setHpScale:v=>{tuning.hpScale=clamp(Number(v)||1,.25,5);},
    setIdleRangeScale:v=>{tuning.idleRangeScale=clamp(Number(v)||3,1,6);director.settings.battleCircleRadius=6.9*(tuning.idleRangeScale/3);director.getDebugState().slots.forEach(s=>s.radius=director.settings.battleCircleRadius);},
    setSpawnKind:k=>{tuning.spawnKind=k===HADES_TARTARUS_POOL_ID||isHadesEnemy(k)?k:HADES_TARTARUS_POOL_ID;},
    setTerritoryEnabled:v=>{tuning.territoryEnabled=!!v;},
    setTelegraphedSpawns:v=>{tuning.telegraphedSpawns=!!v;},
    setEncounterPlanningEnabled:v=>{tuning.encounterPlanningEnabled=!!v;},
    setPursuitBudgetScale:v=>{tuning.pursuitBudgetScale=clamp(Number(v)||1,.35,2);},
    setGoblinColors:()=>{},setGoblinRigDebug:()=>{},setSpawnGoblins:()=>{},
    get heightScale(){return tuning.heightScale;},
    get speedScale(){return tuning.speedScale;},
    get hpScale(){return tuning.hpScale;},
    get waveSize(){return tuning.waveSize;},
    get idleRangeScale(){return tuning.idleRangeScale;},
    get aggression(){return tuning.aggression;},
    get combatDirectorEnabled(){return tuning.combatDirectorEnabled;},
    get spawnKind(){return tuning.spawnKind;},
    get wave(){return wave;},
    get encounterDepth(){return encounterDepth;},
    get waveKills(){return waveKills;},
    get kills(){return kills;},
    get playerHp(){return tuning.playerHp;},
    get lastPlayerHit(){return tuning.lastPlayerHit;},
    get lastPlayerHitDir(){return tuning.lastPlayerHitDir||null;},
    get activeEncounterRoomId(){return activeEncounterRoomId;},
    get playerActionLocked(){return restraints.length>0;},
    get playerMoveScale(){return restraints.length>0?.25:1;},
    get currentEncounterPlan(){return currentEncounterPlan;},
    get queuedSpawnCount(){return spawnQueue.length;},
    get telegraphCount(){return spawnTelegraphs.length;},
  };
}
