import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const AIR_HOT=0xf3ffff;
const AIR_CORE=0xbfeef7;
const AIR_BODY=0x86dce9;
const AIR_TRAIL=0x5bbcca;

export const WIND_SLASH_BEATS=Object.freeze([
  Object.freeze({time:.06,beat:1,damage:8}),
  Object.freeze({time:.28,beat:2,damage:10}),
  Object.freeze({time:.50,beat:3,damage:12}),
]);

export const WIND_SLASH_ENHANCED_GUST_DAMAGE=Object.freeze([3,3,4]);

export function windSlashArcSpec({beat=1,enhanced=false}={}){
  const index=clamp(Math.round(Number(beat)||1),1,3)-1;
  const primary=Object.freeze({
    beat:index+1,
    damage:[8,10,12][index],
    innerRadius:[.38,.34,.30][index],
    outerRadius:[2.35,2.85,3.42][index],
    halfAngle:[.72,.82,.94][index],
    originOffset:[.34,.38,.44][index],
    activeDuration:[.18,.20,.24][index],
    push:[.58,.76,1.02][index],
    visualScale:[1,1.10,1.23][index],
    sweepSign:index===1?-1:1,
  });
  const gust=enhanced?Object.freeze({
    damage:WIND_SLASH_ENHANCED_GUST_DAMAGE[index],
    innerRadius:primary.outerRadius*.58,
    outerRadius:primary.outerRadius+1.15+.18*index,
    halfAngle:primary.halfAngle+.12,
    piercesEnemies:true,
    destroysProjectiles:true,
  }):null;
  return Object.freeze({primary,gust,enhanced:!!enhanced});
}

export function pointInWindSlashArc({
  originX=0,originZ=0,forwardX=0,forwardZ=1,targetX=0,targetZ=0,
  innerRadius=0,outerRadius=1,halfAngle=Math.PI/4,targetRadius=0,
}={}){
  const length=Math.hypot(forwardX,forwardZ)||1;
  const fx=forwardX/length,fz=forwardZ/length;
  const dx=targetX-originX,dz=targetZ-originZ,distance=Math.hypot(dx,dz);
  const radius=Math.max(0,Number(targetRadius)||0);
  if(distance>outerRadius+radius||distance<Math.max(0,innerRadius-radius))return false;
  if(distance<1e-6)return innerRadius<=radius;
  const forwardDot=(dx*fx+dz*fz)/distance;
  const angle=Math.acos(clamp(forwardDot,-1,1));
  const padding=Math.asin(clamp(radius/Math.max(distance,radius||1),0,1));
  return angle<=halfAngle+padding;
}

function isEnemyLabRuntime(){
  if(typeof window==='undefined')return false;
  try{
    const params=new URLSearchParams(location.search||'');
    if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;
    return !!(window.parent&&window.parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(window.parent.location?.pathname||''));
  }catch{return false;}
}

function normalize2(x,z){const length=Math.hypot(x,z)||1;return{x:x/length,z:z/length};}
function playerFrame(getPlayer){
  const player=getPlayer?.()||{},forward=normalize2(Number(player.forwardX)||0,Number(player.forwardZ)||1);
  return{x:Number(player.x)||0,z:Number(player.z)||0,forward};
}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
function enemyRadius(enemy,system){return Math.max(.42,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);}
function makeMaterial(THREE,color,opacity=.8){
  return new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
}
function disposeObject(root){
  if(!root)return;root.parent?.remove(root);
  root.traverse?.(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());else object.material?.dispose?.();});
}

function makeArcLayer(THREE,{inner,outer,start,length,color,opacity}){
  const geometry=new THREE.RingGeometry(Math.max(.01,inner),Math.max(inner+.01,outer),54,1,start,length);
  const mesh=new THREE.Mesh(geometry,makeMaterial(THREE,color,opacity));
  mesh.rotation.x=Math.PI/2;
  return mesh;
}

function makeWindSlashVisual(THREE,scene,spec,size){
  const group=new THREE.Group();group.name=`Wizard Arcana Wind Slash beat ${spec.beat}`;
  const start=Math.PI/2-spec.halfAngle,length=spec.halfAngle*2;
  const swept=makeArcLayer(THREE,{inner:spec.innerRadius,outer:spec.outerRadius,start,length,color:AIR_BODY,opacity:.14});
  swept.position.y=.22;swept.userData.swept=true;swept.userData.baseOpacity=.14;group.add(swept);
  const bladeThickness=.42+.05*spec.beat;
  const blade=makeArcLayer(THREE,{inner:spec.outerRadius-bladeThickness,outer:spec.outerRadius,start,length,color:AIR_CORE,opacity:.88});
  blade.position.y=.42;blade.userData.blade=true;blade.userData.baseOpacity=.88;group.add(blade);
  const edge=makeArcLayer(THREE,{inner:spec.outerRadius-.13,outer:spec.outerRadius+.02,start,length,color:AIR_HOT,opacity:.98});
  edge.position.y=.48;edge.userData.edge=true;edge.userData.baseOpacity=.98;group.add(edge);
  for(let index=0;index<3;index++){
    const radius=spec.outerRadius-.70-index*.22;
    const opacity=.42-index*.09;
    const streak=makeArcLayer(THREE,{inner:radius-.035,outer:radius+.035,start:start+.08+index*.05,length:length*.72,color:index===0?AIR_CORE:AIR_TRAIL,opacity});
    streak.position.y=.28-index*.035;streak.userData.streak=index;streak.userData.baseOpacity=opacity;group.add(streak);
  }
  group.scale.setScalar(size*spec.visualScale);group.renderOrder=5;scene.add(group);return group;
}

function makeImpactFlash(THREE,scene,x,y,z,size){
  const group=new THREE.Group();group.name='Wizard Arcana Wind Slash impact';
  const core=new THREE.Mesh(new THREE.SphereGeometry(.31*size,12,8),makeMaterial(THREE,AIR_HOT,.96));core.userData.baseOpacity=.96;group.add(core);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.34*size,.46*size,26),makeMaterial(THREE,AIR_CORE,.72));ring.rotation.x=Math.PI/2;ring.userData.baseOpacity=.72;group.add(ring);
  group.position.set(x,y,z);group.renderOrder=8;scene.add(group);return group;
}

export function installWizardWindSlashRuntime({THREE,scene,getPlayer,getEnemySystem}={}){
  const initial=readArcanaTweaks();
  if(!THREE||!scene||!isEnemyLabRuntime())return{state:{effects:[],sizeMultiplier:initial.sizeMultiplier},update(){},reset(){},dispose(){}};
  const state={effects:[],sizeMultiplier:initial.sizeMultiplier};

  function add(effect){state.effects.push(effect);return effect;}
  function remove(effect){
    if(effect.mesh)disposeObject(effect.mesh);
    for(const flash of effect.flashes||[])disposeObject(flash);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
  }
  function reset(){for(const effect of[...state.effects])remove(effect);}
  function currentSize(){return clampArcanaSize(state.sizeMultiplier);}

  function damageArc(frame,spec,size){
    const system=getEnemySystem?.();if(!system)return[];
    const originX=frame.x+frame.forward.x*spec.originOffset;
    const originZ=frame.z+frame.forward.z*spec.originOffset;
    const flashes=[];
    for(const enemy of aliveEnemies(system)){
      if(!pointInWindSlashArc({
        originX,originZ,forwardX:frame.forward.x,forwardZ:frame.forward.z,
        targetX:enemy.x,targetZ:enemy.z,
        innerRadius:spec.innerRadius*size,outerRadius:spec.outerRadius*size,
        halfAngle:spec.halfAngle,targetRadius:enemyRadius(enemy,system),
      }))continue;
      const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);
      const power=spec.beat===3 ? .48 : .30;
      const pop=spec.beat===3 ? .11 : .06;
      system.damageEnemy?.(enemy,spec.damage,{x:direction.x*spec.push,z:direction.z*spec.push},{source:'wizardArcana',power,pop,windSlash:true,beat:spec.beat});
      const scale=(system.heightScale||1)*(enemy.currentTargetScale||enemy.targetScale||1),height=(enemy.height||2)*scale;
      flashes.push(makeImpactFlash(THREE,scene,enemy.x,(enemy.targetYOffset||enemy.rootLift||0)+height*.55,enemy.z,size*(.9+spec.beat*.08)));
    }
    return flashes;
  }

  function emitSlash(beat){
    const frame=playerFrame(getPlayer),size=currentSize(),spec=windSlashArcSpec({beat}).primary;
    const mesh=makeWindSlashVisual(THREE,scene,spec,size);
    mesh.position.set(frame.x+frame.forward.x*spec.originOffset,0,frame.z+frame.forward.z*spec.originOffset);
    const baseYaw=Math.atan2(frame.forward.x,frame.forward.z),sweepAmount=.62;
    mesh.rotation.y=baseYaw-spec.sweepSign*sweepAmount*.52;
    const flashes=damageArc(frame,spec,size);
    add({type:'windSlashArc',age:0,life:spec.activeDuration,mesh,flashes,spec,size,baseYaw,sweepAmount});
  }

  function startCombo(){add({type:'windSlashCombo',age:0,nextBeat:0,life:.78});}
  function updateCombo(effect,dt){
    effect.age+=dt;
    while(effect.nextBeat<WIND_SLASH_BEATS.length&&effect.age>=WIND_SLASH_BEATS[effect.nextBeat].time){
      emitSlash(WIND_SLASH_BEATS[effect.nextBeat].beat);effect.nextBeat++;
    }
    if(effect.nextBeat>=WIND_SLASH_BEATS.length&&effect.age>=effect.life)remove(effect);
  }
  function updateArc(effect,dt,now){
    effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),ease=1-Math.pow(1-k,3);
    effect.mesh.rotation.y=effect.baseYaw+effect.spec.sweepSign*effect.sweepAmount*(ease-.52);
    effect.mesh.children.forEach((child,index)=>{
      child.material.opacity=(child.userData?.baseOpacity??.36)*Math.pow(1-k,.52);
      if(child.userData?.streak!==undefined)child.rotation.z+=effect.spec.sweepSign*dt*(1.8+child.userData.streak*.5);
      if(child.userData?.blade)child.scale.setScalar(1+.035*Math.sin(now*22+index));
    });
    for(const flash of effect.flashes||[]){
      flash.children.forEach(child=>{child.material.opacity=(child.userData?.baseOpacity??.8)*Math.pow(1-k,.35);});
      flash.scale.setScalar(1+k*1.5);
    }
    if(k>=1)remove(effect);
  }

  const onPlay=event=>{if(event?.detail?.card?.arcanaId==='WIND-SLASH')startCombo();};
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  return{
    state,reset,
    update(dt,now=0){for(const effect of[...state.effects]){if(effect.type==='windSlashCombo')updateCombo(effect,Math.max(0,dt));else if(effect.type==='windSlashArc')updateArc(effect,Math.max(0,dt),Number(now)||0);}},
    dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();},
  };
}
