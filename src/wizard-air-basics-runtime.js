import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';
import { pointSegmentDistance2D, segmentIntersection2D } from './wizard-arcana-runtime.js';
import { getArenaRuntimeConfig } from './arena-runtime-context.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const AIR_HOT=0xf5ffff;
const AIR_CORE=0xc8f1f5;
const AIR_BODY=0x8fdce6;
const AIR_TRAIL=0x67bfc9;

export const AIR_SPINNER_BEATS=Object.freeze([
  Object.freeze({time:.05,beat:1,carrier:'disc'}),
  Object.freeze({time:.24,beat:2,carrier:'disc'}),
  Object.freeze({time:.50,beat:3,carrier:'ring'}),
]);

export const AIR_SPINNER_DISC=Object.freeze({
  damage:6,
  orbitRadius:2.15,
  orbitDuration:.84,
  revolutions:1,
  hitRadius:.46,
  rehitCooldown:.34,
});

export const AIR_SPINNER_RING=Object.freeze({
  damage:10,
  radius:2.95,
  width:.72,
  activeDuration:.28,
  push:2.15,
});

export const PERFORATING_JET_VOLLEYS=Object.freeze([2,3,4]);
export const PERFORATING_JET_ENHANCED_VOLLEYS=Object.freeze([3,4,5]);
export const PERFORATING_JET_BEAT_TIMES=Object.freeze([.05,.30,.57]);
export const PERFORATING_JET_SHOT_SPACING=.055;

export function airSpinnerDiscSpec({enhanced=false}={}){
  return Object.freeze({
    ...AIR_SPINNER_DISC,
    enhanced:!!enhanced,
    copies:enhanced?2:1,
    oppositePhase:!!enhanced,
  });
}

export function airSpinnerOrbitPosition({ownerX=0,ownerZ=0,startAngle=0,progress=0,radius=AIR_SPINNER_DISC.orbitRadius}={}){
  const angle=startAngle+clamp(Number(progress)||0,0,1)*Math.PI*2;
  return Object.freeze({x:ownerX+Math.sin(angle)*radius,z:ownerZ+Math.cos(angle)*radius,angle});
}

export function perforatingJetVolleyCounts({enhanced=false}={}){
  return enhanced?PERFORATING_JET_ENHANCED_VOLLEYS:PERFORATING_JET_VOLLEYS;
}

export function buildPerforatingJetSchedule({enhanced=false}={}){
  const counts=perforatingJetVolleyCounts({enhanced}),schedule=[];
  counts.forEach((count,beatIndex)=>{
    for(let shotIndex=0;shotIndex<count;shotIndex++){
      schedule.push(Object.freeze({
        beat:beatIndex+1,
        shotIndex,
        count,
        time:PERFORATING_JET_BEAT_TIMES[beatIndex]+shotIndex*PERFORATING_JET_SHOT_SPACING,
      }));
    }
  });
  return Object.freeze(schedule);
}

export function perforatingJetShotSpec({enhanced=false}={}){
  return Object.freeze({
    enhanced:!!enhanced,
    damage:3,
    speed:19.5,
    range:13.2,
    radius:.20,
    visualLength:1.18,
    piercesEnemies:true,
  });
}

function isEnemyLabRuntime(){
  try{
    const config=getArenaRuntimeConfig();if(config)return config.mode==='arena'||config.enemyLab;
    const params=new URLSearchParams(location.search||'');
    return params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab'||/(?:^|\/)combat-arena\.html$/i.test(location.pathname||'');
  }catch{return false;}
}

function normalize2(x,z,fallback={x:0,z:1}){
  const length=Math.hypot(x,z);
  return length>1e-6?{x:x/length,z:z/length}:{...fallback};
}
function playerFrame(getPlayer){
  const player=getPlayer?.()||{},forward=normalize2(Number(player.forwardX)||0,Number(player.forwardZ)||1);
  return{x:Number(player.x)||0,z:Number(player.z)||0,forward,right:{x:forward.z,z:-forward.x}};
}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
function enemyRadius(enemy,system){return Math.max(.42,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);}
function enemyCenterY(enemy,system){
  const scale=(system?.heightScale||1)*(enemy?.currentTargetScale||enemy?.targetScale||1);
  return(enemy?.targetYOffset||enemy?.rootLift||0)+(enemy?.height||2)*scale*.55;
}
function makeMaterial(THREE,color,opacity=.82,additive=true){
  return new THREE.MeshBasicMaterial({
    color,transparent:true,opacity,
    blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
    depthWrite:false,side:THREE.DoubleSide,
  });
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
function firstWallHit(start,end,walls){
  let best=null;
  for(const wall of walls||[]){
    if(!wall?.a||!wall?.b)continue;
    const hit=segmentIntersection2D(start,end,wall.a,wall.b);
    if(hit&&(!best||hit.t<best.hit.t))best={wall,hit};
  }
  return best;
}
function knockFrom(source,target,power){
  const direction=normalize2(target.x-source.x,target.z-source.z);
  return{x:direction.x*power,z:direction.z*power};
}

function makeCrescent(THREE,scene,size=1){
  const group=new THREE.Group();group.name='Wizard Arcana Air Spinner orbiting disc';
  const start=-1.05,length=2.10;
  const body=new THREE.Mesh(new THREE.RingGeometry(.17,.55,28,1,start,length),makeMaterial(THREE,AIR_BODY,.78));
  body.rotation.x=-Math.PI/2;body.scale.z=.72;body.userData.baseOpacity=.78;group.add(body);
  const edge=new THREE.Mesh(new THREE.RingGeometry(.47,.59,28,1,start,length),makeMaterial(THREE,AIR_HOT,.96));
  edge.rotation.x=-Math.PI/2;edge.position.y=.035;edge.scale.z=.72;edge.userData.baseOpacity=.96;group.add(edge);
  for(let index=0;index<2;index++){
    const streak=new THREE.Mesh(new THREE.RingGeometry(.25+index*.11,.29+index*.11,24,1,start+.12,length*.72),makeMaterial(THREE,AIR_CORE,.40-index*.10));
    streak.rotation.x=-Math.PI/2;streak.position.y=-.025-index*.018;streak.scale.z=.70;streak.userData.baseOpacity=.40-index*.10;streak.userData.streak=index;group.add(streak);
  }
  group.scale.setScalar(size);group.renderOrder=6;scene.add(group);return group;
}

function makeSpinnerRing(THREE,scene,size=1){
  const group=new THREE.Group();group.name='Wizard Arcana Air Spinner finisher ring';
  const rings=[
    {inner:2.18,outer:2.42,color:AIR_BODY,opacity:.48},
    {inner:2.43,outer:2.62,color:AIR_HOT,opacity:.92},
    {inner:1.82,outer:1.91,color:AIR_CORE,opacity:.40},
  ];
  for(const spec of rings){
    const mesh=new THREE.Mesh(new THREE.RingGeometry(spec.inner,spec.outer,64),makeMaterial(THREE,spec.color,spec.opacity));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=.10;mesh.userData.baseOpacity=spec.opacity;group.add(mesh);
  }
  for(let index=0;index<8;index++){
    const angle=index*Math.PI/4;
    const streak=new THREE.Mesh(new THREE.PlaneGeometry(.10,.72),makeMaterial(THREE,index%2?AIR_CORE:AIR_HOT,.58));
    streak.rotation.x=-Math.PI/2;streak.rotation.z=-angle;streak.position.set(Math.sin(angle)*2.28,.14,Math.cos(angle)*2.28);streak.userData.baseOpacity=.58;group.add(streak);
  }
  group.scale.setScalar(size);group.renderOrder=6;scene.add(group);return group;
}

function makeJet(THREE,scene,size=1){
  const group=new THREE.Group();group.name='Wizard Arcana Perforating Jet micro-projectile';
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.17,.62,6),makeMaterial(THREE,AIR_HOT,.98));
  tip.rotation.x=Math.PI/2;tip.position.z=.28;tip.userData.baseOpacity=.98;group.add(tip);
  const core=new THREE.Mesh(new THREE.BoxGeometry(.13,.08,.72),makeMaterial(THREE,AIR_CORE,.88));
  core.position.z=-.18;core.userData.baseOpacity=.88;group.add(core);
  for(let index=0;index<3;index++){
    const tail=new THREE.Mesh(new THREE.PlaneGeometry(.055,.72+index*.18),makeMaterial(THREE,index===0?AIR_BODY:AIR_TRAIL,.52-index*.10));
    tail.rotation.x=-Math.PI/2;tail.rotation.z=(index-1)*.13;tail.position.set((index-1)*.09,-.015,-.63-index*.12);tail.userData.baseOpacity=.52-index*.10;tail.userData.tail=index;group.add(tail);
  }
  group.scale.setScalar(size);group.renderOrder=7;scene.add(group);return group;
}

function makeImpact(THREE,scene,x,y,z,size=.6){
  const group=new THREE.Group();group.name='Wizard Arcana air impact';
  const core=new THREE.Mesh(new THREE.SphereGeometry(.22*size,10,7),makeMaterial(THREE,AIR_HOT,.94));core.userData.baseOpacity=.94;group.add(core);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.24*size,.34*size,22),makeMaterial(THREE,AIR_CORE,.68));ring.rotation.x=-Math.PI/2;ring.userData.baseOpacity=.68;group.add(ring);
  group.position.set(x,y,z);group.renderOrder=9;scene.add(group);return group;
}

export function installWizardAirBasicsRuntime({THREE,scene,getPlayer,getEnemySystem,getMazeSegments=()=>[]}={}){
  const initial=readArcanaTweaks();
  if(!THREE||!scene||!isEnemyLabRuntime())return{state:{effects:[],sizeMultiplier:initial.sizeMultiplier},canPlay(){return false;},play(){return false;},update(){},reset(){},dispose(){}};
  const state={effects:[],sizeMultiplier:initial.sizeMultiplier};

  function currentSize(){return clampArcanaSize(state.sizeMultiplier);}
  function add(effect){state.effects.push(effect);return effect;}
  function remove(effect){
    if(effect.mesh)disposeObject(effect.mesh);
    for(const mesh of effect.meshes||[])disposeObject(mesh);
    for(const flash of effect.flashes||[])disposeObject(flash);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
  }
  function reset(){for(const effect of[...state.effects])remove(effect);}

  function emitAirSpinnerDisc(beat){
    const frame=playerFrame(getPlayer),size=currentSize(),spec=airSpinnerDiscSpec();
    const startAngle=Math.atan2(frame.forward.x,frame.forward.z);
    const mesh=makeCrescent(THREE,scene,size);
    const initialPosition=airSpinnerOrbitPosition({ownerX:frame.x,ownerZ:frame.z,startAngle,progress:0,radius:spec.orbitRadius*size});
    mesh.position.set(initialPosition.x,.44,initialPosition.z);
    mesh.rotation.y=startAngle+Math.PI/2;
    add({type:'airSpinnerDisc',age:0,beat,spec,size,startAngle,mesh,lastHits:new Map(),previous:{x:initialPosition.x,z:initialPosition.z}});
  }

  function emitAirSpinnerRing(){
    const frame=playerFrame(getPlayer),size=currentSize(),spec=AIR_SPINNER_RING,mesh=makeSpinnerRing(THREE,scene,size),flashes=[];
    mesh.position.set(frame.x,0,frame.z);
    const system=getEnemySystem?.();
    for(const enemy of aliveEnemies(system)){
      const distance=Math.hypot(enemy.x-frame.x,enemy.z-frame.z);
      if(distance>spec.radius*size+enemyRadius(enemy,system))continue;
      system.damageEnemy?.(enemy,spec.damage,knockFrom(frame,enemy,spec.push),{source:'wizardArcana',power:.66,pop:.16,airSpinnerRing:true});
      flashes.push(makeImpact(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,size*.95));
    }
    add({type:'airSpinnerRing',age:0,life:spec.activeDuration,mesh,flashes,size});
  }

  function startAirSpinner(){add({type:'airSpinnerCombo',age:0,nextBeat:0,life:.78});}

  function updateAirSpinnerCombo(effect,dt){
    effect.age+=dt;
    while(effect.nextBeat<AIR_SPINNER_BEATS.length&&effect.age>=AIR_SPINNER_BEATS[effect.nextBeat].time){
      const beat=AIR_SPINNER_BEATS[effect.nextBeat++];
      if(beat.carrier==='disc')emitAirSpinnerDisc(beat.beat);else emitAirSpinnerRing();
    }
    if(effect.nextBeat>=AIR_SPINNER_BEATS.length&&effect.age>=effect.life)remove(effect);
  }

  function updateAirSpinnerDisc(effect,dt,system,now){
    effect.age+=dt;
    const progress=clamp(effect.age/effect.spec.orbitDuration,0,1),owner=playerFrame(getPlayer);
    const position=airSpinnerOrbitPosition({ownerX:owner.x,ownerZ:owner.z,startAngle:effect.startAngle,progress,radius:effect.spec.orbitRadius*effect.size});
    const start={...effect.previous},end={x:position.x,z:position.z};effect.previous=end;
    effect.mesh.position.set(end.x,.42+.08*Math.sin(progress*Math.PI*2),end.z);
    effect.mesh.rotation.y=position.angle+Math.PI/2;
    effect.mesh.children.forEach((child,index)=>{
      child.material.opacity=(child.userData?.baseOpacity??.5)*(1-.22*progress);
      if(child.userData?.streak!==undefined)child.rotation.z+=dt*(2.4+index*.5);
    });
    for(const enemy of aliveEnemies(system)){
      const last=effect.lastHits.get(enemy)??-Infinity;
      if(effect.age-last<effect.spec.rehitCooldown)continue;
      if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+effect.spec.hitRadius*effect.size)continue;
      effect.lastHits.set(enemy,effect.age);
      system.damageEnemy?.(enemy,effect.spec.damage,knockFrom(owner,enemy,.42),{source:'wizardArcana',power:.24,pop:.04,airSpinnerDisc:true,beat:effect.beat});
      add({type:'airImpact',age:0,life:.16,mesh:makeImpact(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,effect.size*.72)});
    }
    if(progress>=1)remove(effect);
  }

  function updateAirSpinnerRing(effect,dt){
    effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);
    effect.mesh.scale.multiplyScalar(1+dt*1.6);
    effect.mesh.rotation.y+=dt*3.8;
    effect.mesh.children.forEach(child=>{child.material.opacity=(child.userData?.baseOpacity??.5)*Math.pow(1-k,.5);});
    for(const flash of effect.flashes||[]){flash.scale.setScalar(1+k*1.5);flash.children.forEach(child=>{child.material.opacity=(child.userData?.baseOpacity??.7)*Math.pow(1-k,.38);});}
    if(k>=1)remove(effect);
  }

  function startPerforatingJet(){
    add({type:'perforatingJetCombo',age:0,nextEmission:0,schedule:buildPerforatingJetSchedule(),beatFrames:new Map(),life:1.0});
  }

  function emitPerforatingJetShot(effect,event){
    let frame=effect.beatFrames.get(event.beat);
    if(!frame){frame=playerFrame(getPlayer);effect.beatFrames.set(event.beat,frame);}
    const size=currentSize(),spec=perforatingJetShotSpec(),position={x:frame.x+frame.forward.x*.92,z:frame.z+frame.forward.z*.92};
    const mesh=makeJet(THREE,scene,size);mesh.position.set(position.x,.58,position.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);
    add({
      type:'perforatingJetShot',age:0,position,previous:{...position},direction:{...frame.forward},
      velocity:{x:frame.forward.x*spec.speed,z:frame.forward.z*spec.speed},distance:0,spec,size,mesh,hit:new Set(),
      walls:[...(getMazeSegments?.()||[])],beat:event.beat,shotIndex:event.shotIndex,
    });
  }

  function updatePerforatingJetCombo(effect,dt){
    effect.age+=dt;
    while(effect.nextEmission<effect.schedule.length&&effect.age>=effect.schedule[effect.nextEmission].time){
      emitPerforatingJetShot(effect,effect.schedule[effect.nextEmission++]);
    }
    if(effect.nextEmission>=effect.schedule.length&&effect.age>=effect.life)remove(effect);
  }

  function updatePerforatingJetShot(effect,dt,system,now){
    effect.age+=dt;
    const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};
    const wall=firstWallHit(start,end,effect.walls);if(wall){remove(effect);return;}
    effect.previous=start;effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);
    effect.mesh.position.set(end.x,.58+.035*Math.sin(now*24+effect.shotIndex),end.z);
    effect.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);
    effect.mesh.children.forEach((child,index)=>{
      child.material.opacity=(child.userData?.baseOpacity??.6)*Math.max(.28,1-effect.distance/effect.spec.range*.35);
      if(child.userData?.tail!==undefined)child.scale.y=.85+.18*Math.sin(now*28+index*1.4);
    });
    for(const enemy of aliveEnemies(system)){
      if(effect.hit.has(enemy))continue;
      if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+effect.spec.radius*effect.size)continue;
      effect.hit.add(enemy);
      system.damageEnemy?.(enemy,effect.spec.damage,{x:effect.direction.x*.18,z:effect.direction.z*.18},{source:'wizardArcana',power:.12,pop:.02,perforatingJet:true,beat:effect.beat,shotIndex:effect.shotIndex});
      add({type:'airImpact',age:0,life:.14,mesh:makeImpact(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,effect.size*.54)});
    }
    if(effect.distance>=effect.spec.range)remove(effect);
  }

  function updateImpact(effect,dt){
    effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);
    effect.mesh.scale.setScalar(1+k*1.35);
    effect.mesh.children.forEach(child=>{child.material.opacity=(child.userData?.baseOpacity??.7)*Math.pow(1-k,.35);});
    if(k>=1)remove(effect);
  }

  function canPlay(card){return card?.arcanaId==='AIR-SPINNER'||card?.arcanaId==='PERFORATING-JET';}
  function play(card,context={}){
    if(!canPlay(card))return false;
    if(card.arcanaId==='AIR-SPINNER')startAirSpinner();else startPerforatingJet();
    return true;
  }

  const onPlay=event=>{
    play(event?.detail?.card,event?.detail||{});
  };
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  return{
    state,canPlay,play,reset,
    update(dt,now=0){
      const frame=Math.max(0,Number(dt)||0),system=getEnemySystem?.(),time=Number(now)||0;
      for(const effect of[...state.effects]){
        if(effect.type==='airSpinnerCombo')updateAirSpinnerCombo(effect,frame);
        else if(effect.type==='airSpinnerDisc')updateAirSpinnerDisc(effect,frame,system,time);
        else if(effect.type==='airSpinnerRing')updateAirSpinnerRing(effect,frame);
        else if(effect.type==='perforatingJetCombo')updatePerforatingJetCombo(effect,frame);
        else if(effect.type==='perforatingJetShot')updatePerforatingJetShot(effect,frame,system,time);
        else if(effect.type==='airImpact')updateImpact(effect,frame);
      }
    },
    dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();},
  };
}
