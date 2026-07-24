import { isWizardArcanaCard } from './wizard-arcana-cards.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const FIRE=0xff7438;
const FIRE_HOT=0xfff1a6;
const FIRE_GOLD=0xffbd45;
const FIRE_DEEP=0xff4b24;
const SOOT=0x25100c;
const GOLD=0xffcf62;
const AIR=0x8fe8ef;
const WATER=0x59bdf4;

export const FLAME_CROSS_BEATS=Object.freeze([
  Object.freeze({time:.08,sides:Object.freeze([1]),finisher:false}),
  Object.freeze({time:.34,sides:Object.freeze([-1]),finisher:false}),
  Object.freeze({time:.62,sides:Object.freeze([1,-1]),finisher:true}),
]);

export function flameCrossWaveSpec({side=1,finisher=false}={}){
  const sign=side<0?-1:1;
  return Object.freeze({
    side:sign,
    finisher:!!finisher,
    lateralOffset:sign*(finisher?1.02:.92),
    lateralAim:-sign*(finisher?.245:.22),
    speed:finisher?12.4:11.7,
    range:finisher?11.2:9.8,
    damage:finisher?9:6,
    push:finisher?.82:.48,
    radius:finisher?.66:.58,
    visualScale:finisher?1.12:1,
  });
}

export function pointSegmentDistance2D(point,a,b){
  const abx=b.x-a.x,abz=b.z-a.z,apx=point.x-a.x,apz=point.z-a.z;
  const denom=abx*abx+abz*abz;
  const t=denom>1e-8?clamp((apx*abx+apz*abz)/denom,0,1):0;
  return Math.hypot(point.x-(a.x+abx*t),point.z-(a.z+abz*t));
}

export function segmentIntersection2D(a,b,c,d){
  const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z;
  const cross=rx*sz-rz*sx;
  if(Math.abs(cross)<1e-8)return null;
  const qx=c.x-a.x,qz=c.z-a.z;
  const t=(qx*sz-qz*sx)/cross,u=(qx*rz-qz*rx)/cross;
  return t>=0&&t<=1&&u>=0&&u<=1?{t,u,x:a.x+rx*t,z:a.z+rz*t}:null;
}

export function reflectVelocity2D(velocity,wallA,wallB){
  const tx=wallB.x-wallA.x,tz=wallB.z-wallA.z,length=Math.hypot(tx,tz)||1;
  const nx=-tz/length,nz=tx/length,dot=velocity.x*nx+velocity.z*nz;
  return{x:velocity.x-2*dot*nx,z:velocity.z-2*dot*nz};
}

function isEnemyLabRuntime(){
  if(typeof window==='undefined')return false;
  try{
    const params=new URLSearchParams(location.search||'');
    if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;
    const parent=window.parent;
    return !!(parent&&parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(parent.location?.pathname||''));
  }catch{return false;}
}

function enemyRadius(enemy,system){
  return Math.max(.45,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);
}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
function enemyCenterY(enemy,system){
  const scale=(system?.heightScale||1)*(enemy?.currentTargetScale||enemy?.targetScale||1);
  return(enemy?.targetYOffset||enemy?.rootLift||0)+(enemy?.height||2)*scale*.5;
}
function nearestEnemy(system,position,maxRange=Infinity){
  let best=null,bestDistance=maxRange;
  for(const enemy of aliveEnemies(system)){
    const distance=Math.hypot(enemy.x-position.x,enemy.z-position.z);
    if(distance<bestDistance){best=enemy;bestDistance=distance;}
  }
  return best;
}
function firstWallHit(start,end,walls){
  let best=null;
  for(const wall of walls||[]){
    if(!wall?.a||!wall?.b)continue;
    const hit=segmentIntersection2D(start,end,wall.a,wall.b);
    if(hit&&(!best||hit.t<best.hit.t))best={wall,hit};
  }
  return best;
}
function normalize2(x,z,fallback={x:0,z:1}){
  const length=Math.hypot(x,z);
  return length>1e-6?{x:x/length,z:z/length}:{...fallback};
}
function playerFrame(getPlayer){
  const player=getPlayer?.()||{};
  const forward=normalize2(Number(player.forwardX)||0,Number(player.forwardZ)||1);
  return{x:Number(player.x)||0,z:Number(player.z)||0,forward,right:{x:forward.z,z:-forward.x}};
}
function disposeObject(root){
  if(!root)return;
  root.parent?.remove(root);
  root.traverse?.(object=>{
    object.geometry?.dispose?.();
    if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());
    else object.material?.dispose?.();
  });
}
function makeMaterial(THREE,color,opacity=.86){
  return new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
}
function makeSmokeMaterial(THREE,color=SOOT,opacity=.28){
  return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
}
function makeOrb(THREE,scene,{radius=.34,color=FIRE,opacity=.9,wireframe=false}={}){
  const material=makeMaterial(THREE,color,opacity);material.wireframe=wireframe;
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,16,10),material);
  mesh.renderOrder=3;scene.add(mesh);return mesh;
}
function makeFlameWave(THREE,scene,spec){
  const group=new THREE.Group();group.name=spec.finisher?'Wizard Arcana Flame Cross finisher wave':'Wizard Arcana Flame Cross wave';
  const head=new THREE.Mesh(new THREE.SphereGeometry(.34,14,9),makeMaterial(THREE,FIRE_HOT,.96));
  head.scale.set(1.22,.7,1.05);head.position.set(0,.34,.15);group.add(head);
  const colors=[FIRE_GOLD,FIRE,FIRE_DEEP,FIRE_GOLD,FIRE_DEEP,FIRE];
  for(let index=0;index<6;index++){
    const radius=.30-index*.026;
    const flame=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),makeMaterial(THREE,colors[index],.86-index*.075));
    flame.position.set((index%2?1:-1)*(.08+.025*index),.28+.07*Math.sin(index*1.8),-.28-index*.31);
    flame.scale.set(1+.15*Math.sin(index),.8+index*.04,1.2);flame.userData.flameIndex=index;flame.userData.baseScaleY=flame.scale.y;group.add(flame);
  }
  for(let index=0;index<3;index++){
    const soot=new THREE.Mesh(new THREE.SphereGeometry(.22-index*.035,10,7),makeSmokeMaterial(THREE,SOOT,.26-index*.055));
    soot.position.set((index%2?1:-1)*.11,.15,-1.65-index*.34);soot.scale.set(1.25,.45,1.35);soot.userData.soot=true;group.add(soot);
  }
  const glow=new THREE.Mesh(new THREE.CircleGeometry(.75,24),makeMaterial(THREE,FIRE,.24));
  glow.rotation.x=-Math.PI/2;glow.position.set(0,.035,-.4);glow.scale.set(1,1.85,1);glow.userData.groundGlow=true;group.add(glow);
  group.scale.setScalar(spec.visualScale);group.renderOrder=3;scene.add(group);return group;
}
function makeBeam(THREE,scene,start,end,{width=.7,color=FIRE,opacity=.72}={}){
  const dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz)||.01;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,.12,length),makeMaterial(THREE,color,opacity));
  mesh.position.set((start.x+end.x)*.5,.42,(start.z+end.z)*.5);
  mesh.rotation.y=Math.atan2(dx,dz);mesh.renderOrder=2;scene.add(mesh);return mesh;
}
function knockFrom(source,target,power=1){
  const direction=normalize2(target.x-source.x,target.z-source.z);
  return{x:direction.x*power,z:direction.z*power};
}
function damageEnemy(system,enemy,amount,knock={x:0,z:0},options={}){
  if(!system||!enemy||enemy.hp<=0)return false;
  if(typeof system.damageEnemy==='function'){
    system.damageEnemy(enemy,amount,knock,{power:.38,pop:.08,source:'wizardArcana',...options});
    return true;
  }
  enemy.hp=Math.max(0,(Number(enemy.hp)||0)-Math.max(0,Number(amount)||0));
  enemy.flash=Math.max(enemy.flash||0,.08);return true;
}

export function installWizardArcanaRuntime({THREE,scene,getPlayer,getEnemySystem,getMazeSegments=()=>[]}={}){
  if(!THREE||!scene||!isEnemyLabRuntime())return{state:{effects:[]},update(){},reset(){},dispose(){}};
  const state={effects:[],castSerial:0,lastCast:null};

  function add(effect){state.effects.push(effect);return effect;}
  function remove(effect){
    if(effect?.type==='waterPrison'&&effect.captured){
      effect.captured.__wizardWaterPrison=false;
      if(effect.captured.stunState==='waterPrison'){effect.captured.stunState=null;effect.captured.stunStateRemaining=0;}
    }
    if(effect.mesh)disposeObject(effect.mesh);
    for(const mesh of effect.meshes||[])disposeObject(mesh);
    for(const flare of effect.flares||[])disposeObject(flare.mesh);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
  }
  function reset(){for(const effect of[...state.effects])remove(effect);}

  function emitFlameCrossWave(frame,side,finisher){
    const spec=flameCrossWaveSpec({side,finisher});
    const direction=normalize2(
      frame.forward.x+frame.right.x*spec.lateralAim,
      frame.forward.z+frame.right.z*spec.lateralAim,
      frame.forward,
    );
    const position={
      x:frame.x+frame.forward.x*.95+frame.right.x*spec.lateralOffset,
      z:frame.z+frame.forward.z*.95+frame.right.z*spec.lateralOffset,
    };
    const mesh=makeFlameWave(THREE,scene,spec);
    mesh.position.set(position.x,0,position.z);mesh.rotation.y=Math.atan2(direction.x,direction.z);
    add({
      type:'flameCrossWave',age:0,position,previous:{...position},direction,
      velocity:{x:direction.x*spec.speed,z:direction.z*spec.speed},distance:0,
      spec,hit:new Set(),mesh,walls:[...(getMazeSegments?.()||[])],
    });
  }

  function castFlameCross(){
    add({type:'flameCrossCombo',age:0,nextBeat:0,life:.82});
  }

  function castBouncingBlaze(frame){
    const mesh=makeOrb(THREE,scene,{radius:.42,color:FIRE,opacity:.94});
    const position={x:frame.x+frame.forward.x*1.15,z:frame.z+frame.forward.z*1.15};
    mesh.position.set(position.x,.62,position.z);
    add({type:'bouncingBlaze',age:0,life:3.4,position,velocity:{x:frame.forward.x*12,z:frame.forward.z*12},bounces:0,maxBounces:3,hit:new Set(),mesh,walls:[...(getMazeSegments?.()||[])]});
  }

  function castHomingFlares(frame){
    const flares=[];
    for(let index=0;index<5;index++){
      const mesh=makeOrb(THREE,scene,{radius:.22,color:GOLD,opacity:.95});
      flares.push({index,mesh,phase:index*Math.PI*2/5,delay:.38+index*.16,launched:false,done:false,position:{x:frame.x,z:frame.z},velocity:{x:frame.forward.x*9,z:frame.forward.z*9},target:null});
    }
    add({type:'homingFlares',age:0,life:4.3,flares});
  }

  function castDragonArc(frame){
    const group=new THREE.Group();group.name='Wizard Arcana Dragon Arc';
    const body=new THREE.Mesh(new THREE.SphereGeometry(.38,12,8),makeMaterial(THREE,FIRE,.92));body.scale.set(1.45,.72,.92);group.add(body);
    for(let i=1;i<=3;i++){const trail=new THREE.Mesh(new THREE.SphereGeometry(.22-i*.025,10,7),makeMaterial(THREE,0xffaa48,.72-i*.12));trail.position.z=-i*.42;group.add(trail);}
    scene.add(group);
    add({type:'dragonArc',age:0,life:2.7,origin:{x:frame.x,z:frame.z},forward:frame.forward,right:frame.right,distance:1,previous:{x:frame.x,z:frame.z},hit:new Set(),mesh:group,walls:[...(getMazeSegments?.()||[])]});
  }

  function castWhirlingTornado(frame){
    const group=new THREE.Group();group.name='Wizard Arcana Whirling Tornado';
    for(let index=0;index<3;index++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.72+index*.34,.09,8,28),makeMaterial(THREE,AIR,.62-index*.1));
      ring.rotation.x=Math.PI/2;ring.position.y=.28+index*.42;group.add(ring);
    }
    const core=new THREE.Mesh(new THREE.ConeGeometry(.7,2.3,18,1,true),makeMaterial(THREE,AIR,.22));core.position.y=1.1;group.add(core);scene.add(group);
    const position={x:frame.x+frame.forward.x*1.4,z:frame.z+frame.forward.z*1.4};group.position.set(position.x,0,position.z);
    add({type:'whirlingTornado',age:0,life:3.1,position,velocity:{x:frame.forward.x*3.7,z:frame.forward.z*3.7},radius:2.7,tickT:0,mesh:group,walls:[...(getMazeSegments?.()||[])]});
  }

  function castWaterPrison(frame){
    const mesh=makeOrb(THREE,scene,{radius:.58,color:WATER,opacity:.58,wireframe:true});
    const position={x:frame.x+frame.forward.x*1.15,z:frame.z+frame.forward.z*1.15};mesh.position.set(position.x,.72,position.z);
    add({type:'waterPrison',age:0,life:3.4,position,velocity:{x:frame.forward.x*7.6,z:frame.forward.z*7.6},captured:null,captureAge:0,captureLife:2.15,tickT:0,mesh,walls:[...(getMazeSegments?.()||[])]});
  }

  function cast(card){
    if(!isWizardArcanaCard(card))return false;
    const frame=playerFrame(getPlayer);state.castSerial++;state.lastCast={serial:state.castSerial,cardId:card.id,arcanaId:card.arcanaId};
    if(card.arcanaId==='FLAME-CROSS')castFlameCross(frame);
    else if(card.arcanaId==='BOUNCING-BLAZE')castBouncingBlaze(frame);
    else if(card.arcanaId==='HOMING-FLARES')castHomingFlares(frame);
    else if(card.arcanaId==='DRAGON-ARC')castDragonArc(frame);
    else if(card.arcanaId==='WHIRLING-TORNADO')castWhirlingTornado(frame);
    else if(card.arcanaId==='WATER-PRISON')castWaterPrison(frame);
    else return false;
    window.dispatchEvent(new CustomEvent('wizard-arcana:cast',{detail:{card,serial:state.castSerial}}));return true;
  }

  function updateFlameCrossCombo(effect,dt){
    effect.age+=dt;
    while(effect.nextBeat<FLAME_CROSS_BEATS.length&&effect.age>=FLAME_CROSS_BEATS[effect.nextBeat].time){
      const beat=FLAME_CROSS_BEATS[effect.nextBeat++],frame=playerFrame(getPlayer);
      for(const side of beat.sides)emitFlameCrossWave(frame,side,beat.finisher);
    }
    if(effect.nextBeat>=FLAME_CROSS_BEATS.length&&effect.age>=effect.life)remove(effect);
  }

  function updateFlameCrossWave(effect,dt,system,now){
    effect.age+=dt;
    const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};
    const wall=firstWallHit(start,end,effect.walls);
    if(wall){remove(effect);return;}
    effect.previous=start;effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);
    effect.mesh.position.set(end.x,0,end.z);effect.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);
    effect.mesh.children.forEach((child,index)=>{
      if(child.userData?.groundGlow){child.material.opacity=.18+.08*Math.sin(now*15+effect.age*9);return;}
      if(child.userData?.soot){child.material.opacity=Math.max(.04,.25-effect.distance*.008)+.035*Math.sin(now*8+index);return;}
      const pulse=1+.07*Math.sin(now*18+index*1.7);
      if(Number.isFinite(child.userData?.baseScaleY))child.scale.y=child.userData.baseScaleY*pulse;
    });
    for(const enemy of aliveEnemies(system)){
      if(effect.hit.has(enemy))continue;
      if(pointSegmentDistance2D(enemy,start,end)<=enemyRadius(enemy,system)+effect.spec.radius){
        effect.hit.add(enemy);
        damageEnemy(system,enemy,effect.spec.damage,knockFrom(start,enemy,effect.spec.push),{power:effect.spec.finisher?.46:.28,pop:effect.spec.finisher?.09:.045,flameCrossFinisher:effect.spec.finisher});
      }
    }
    if(effect.distance>=effect.spec.range)remove(effect);
  }

  function updateBouncingBlaze(effect,dt,system){
    effect.age+=dt;const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};
    const collision=firstWallHit(start,end,effect.walls);
    if(collision){
      if(effect.bounces>=effect.maxBounces){remove(effect);return;}
      const reflected=reflectVelocity2D(effect.velocity,collision.wall.a,collision.wall.b),direction=normalize2(reflected.x,reflected.z);
      effect.velocity=reflected;effect.position={x:collision.hit.x+direction.x*.16,z:collision.hit.z+direction.z*.16};effect.bounces++;
      effect.mesh.scale.setScalar(1.18);
    }else effect.position=end;
    effect.mesh.scale.lerp(new THREE.Vector3(1,1,1),Math.min(1,dt*12));effect.mesh.position.set(effect.position.x,.62,effect.position.z);effect.mesh.rotation.y+=dt*8;
    for(const enemy of aliveEnemies(system)){
      if(effect.hit.has(enemy))continue;
      if(Math.hypot(enemy.x-effect.position.x,enemy.z-effect.position.z)<=enemyRadius(enemy,system)+.42){effect.hit.add(enemy);damageEnemy(system,enemy,13,knockFrom(effect.position,enemy,1.15));}
    }
    if(effect.age>=effect.life)remove(effect);
  }

  function updateHomingFlares(effect,dt,system){
    effect.age+=dt;const frame=playerFrame(getPlayer);let remaining=0;
    for(const flare of effect.flares){
      if(flare.done)continue;remaining++;
      if(!flare.launched){
        const angle=flare.phase+effect.age*3.6,radius=1.05+.12*Math.sin(effect.age*7+flare.index);
        flare.position.x=frame.x+Math.cos(angle)*radius;flare.position.z=frame.z+Math.sin(angle)*radius;
        flare.mesh.position.set(flare.position.x,.78+.16*Math.sin(angle*2),flare.position.z);
        if(effect.age>=flare.delay){flare.launched=true;flare.target=nearestEnemy(system,flare.position,18);}
        continue;
      }
      if(!flare.target||flare.target.hp<=0||!system?.enemies?.includes(flare.target))flare.target=nearestEnemy(system,flare.position,22);
      if(flare.target){
        const desired=normalize2(flare.target.x-flare.position.x,flare.target.z-flare.position.z),turn=1-Math.exp(-dt*8.5),speed=10.8;
        flare.velocity.x+=(desired.x*speed-flare.velocity.x)*turn;flare.velocity.z+=(desired.z*speed-flare.velocity.z)*turn;
      }
      flare.position.x+=flare.velocity.x*dt;flare.position.z+=flare.velocity.z*dt;flare.mesh.position.set(flare.position.x,.66,flare.position.z);flare.mesh.rotation.y+=dt*12;
      if(flare.target&&Math.hypot(flare.target.x-flare.position.x,flare.target.z-flare.position.z)<=enemyRadius(flare.target,system)+.28){damageEnemy(system,flare.target,9,knockFrom(flare.position,flare.target,.55));flare.done=true;disposeObject(flare.mesh);flare.mesh=null;}
    }
    if(!remaining||effect.age>=effect.life)remove(effect);
  }

  function updateDragonArc(effect,dt,system){
    effect.age+=dt;effect.distance+=dt*8.6;
    const lateral=Math.sin(effect.distance*1.5)*1.55;
    const position={x:effect.origin.x+effect.forward.x*effect.distance+effect.right.x*lateral,z:effect.origin.z+effect.forward.z*effect.distance+effect.right.z*lateral};
    if(firstWallHit(effect.previous,position,effect.walls)){remove(effect);return;}
    const direction=normalize2(position.x-effect.previous.x,position.z-effect.previous.z,effect.forward);effect.previous=position;
    effect.mesh.position.set(position.x,.68,position.z);effect.mesh.rotation.y=Math.atan2(direction.x,direction.z);
    for(const enemy of aliveEnemies(system)){
      if(effect.hit.has(enemy))continue;
      if(Math.hypot(enemy.x-position.x,enemy.z-position.z)<=enemyRadius(enemy,system)+.56){effect.hit.add(enemy);damageEnemy(system,enemy,14,knockFrom(position,enemy,.9));}
    }
    if(effect.age>=effect.life)remove(effect);
  }

  function updateWhirlingTornado(effect,dt,system){
    effect.age+=dt;const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};
    if(firstWallHit(start,end,effect.walls))effect.velocity={x:0,z:0};else effect.position=end;
    effect.mesh.position.set(effect.position.x,0,effect.position.z);effect.mesh.rotation.y+=dt*3.4;
    effect.mesh.children.forEach((child,index)=>{child.rotation.z+=(index%2?1:-1)*dt*(3.5+index);child.material.opacity=(.62-index*.1)*(1-clamp(effect.age/effect.life,0,1)*.55);});
    effect.tickT-=dt;
    const shouldTick=effect.tickT<=0;if(shouldTick)effect.tickT+=.28;
    for(const enemy of aliveEnemies(system)){
      const dx=effect.position.x-enemy.x,dz=effect.position.z-enemy.z,distance=Math.hypot(dx,dz);
      if(distance>effect.radius+enemyRadius(enemy,system))continue;
      if(distance>.05){const pull=Math.min(distance,dt*(1.9+1.6*(1-distance/effect.radius)));enemy.x+=dx/distance*pull;enemy.z+=dz/distance*pull;}
      if(shouldTick)damageEnemy(system,enemy,3.5,{x:0,z:0},{power:.12,pop:.02});
    }
    if(effect.age>=effect.life)remove(effect);
  }

  function updateWaterPrison(effect,dt,system){
    effect.age+=dt;
    if(!effect.captured){
      const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};
      if(firstWallHit(start,end,effect.walls)){remove(effect);return;}
      effect.position=end;effect.mesh.position.set(end.x,.72,end.z);effect.mesh.rotation.y+=dt*2.5;
      for(const enemy of aliveEnemies(system)){
        if(Math.hypot(enemy.x-end.x,enemy.z-end.z)<=enemyRadius(enemy,system)+.52){effect.captured=enemy;enemy.__wizardWaterPrison=true;effect.captureAge=0;effect.tickT=0;effect.mesh.scale.setScalar(1.38);break;}
      }
      if(effect.age>=effect.life){remove(effect);return;}
      return;
    }
    const enemy=effect.captured;
    if(!enemy||enemy.hp<=0||!system?.enemies?.includes(enemy)){remove(effect);return;}
    effect.captureAge+=dt;effect.tickT-=dt;effect.mesh.position.set(enemy.x,enemyCenterY(enemy,system),enemy.z);effect.mesh.rotation.y+=dt*3.2;effect.mesh.rotation.x+=dt*1.7;
    enemy.stunned=Math.max(enemy.stunned||0,.16);enemy.stunState='waterPrison';enemy.stunStateRemaining=Math.max(enemy.stunStateRemaining||0,.16);
    if(effect.tickT<=0){effect.tickT+=.31;damageEnemy(system,enemy,3.5,{x:0,z:0},{power:.08,pop:.01});}
    if(effect.captureAge>=effect.captureLife){damageEnemy(system,enemy,8,knockFrom(effect.position,enemy,.35),{power:.45,pop:.18});remove(effect);}
  }

  function update(dt,now=0){
    const frame=Math.max(0,Number(dt)||0),system=getEnemySystem?.(),time=Number(now)||0;
    for(const effect of[...state.effects]){
      if(effect.type==='flameCrossCombo')updateFlameCrossCombo(effect,frame);
      else if(effect.type==='flameCrossWave')updateFlameCrossWave(effect,frame,system,time);
      else if(effect.type==='bouncingBlaze')updateBouncingBlaze(effect,frame,system);
      else if(effect.type==='homingFlares')updateHomingFlares(effect,frame,system);
      else if(effect.type==='dragonArc')updateDragonArc(effect,frame,system);
      else if(effect.type==='whirlingTornado')updateWhirlingTornado(effect,frame,system,time);
      else if(effect.type==='waterPrison')updateWaterPrison(effect,frame,system);
    }
  }

  const onPlay=event=>cast(event?.detail?.card);
  window.addEventListener('wizard-arcana:play',onPlay);
  window.__WIZARD_ARCANA_RUNTIME__=state;
  return{state,cast,update,reset,dispose(){window.removeEventListener('wizard-arcana:play',onPlay);reset();if(window.__WIZARD_ARCANA_RUNTIME__===state)delete window.__WIZARD_ARCANA_RUNTIME__;}};
}
