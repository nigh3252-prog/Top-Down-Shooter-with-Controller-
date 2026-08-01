import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const HOT=0xfff2b0;
const GOLD=0xffc24b;
const ORANGE=0xff742c;
const DEEP=0xe63d18;
const SOOT=0x24100b;

export const FLAME_STRIKE_BEATS=Object.freeze([
  Object.freeze({time:.06,beat:1,damage:7,finisher:false}),
  Object.freeze({time:.28,beat:2,damage:7,finisher:false}),
  Object.freeze({time:.50,beat:3,damage:14,finisher:true}),
]);

export const FLAME_STRIKE_CHARGE=Object.freeze({
  maximumHold:1.05,
  damage:28,
  range:5.1,
  width:2.55,
  activeDuration:.34,
});

export function flameStrikeBurstSpec({beat=1,charged=false}={}){
  if(charged)return Object.freeze({
    beat:3,charged:true,damage:28,range:FLAME_STRIKE_CHARGE.range,width:FLAME_STRIKE_CHARGE.width,
    originOffset:1.05,activeDuration:FLAME_STRIKE_CHARGE.activeDuration,push:1.65,visualScale:1.72,
  });
  const finisher=beat>=3;
  return Object.freeze({
    beat:finisher?3:Math.max(1,beat),charged:false,damage:finisher?14:7,
    range:finisher?3.65:2.75,width:finisher?1.78:1.30,originOffset:.82,
    activeDuration:finisher ? .27 : .20,push:finisher?1.10:.66,visualScale:finisher?1.28:1,
  });
}

export function pointInFlameStrikePlume({
  originX=0,originZ=0,forwardX=0,forwardZ=1,targetX=0,targetZ=0,
  range=1,width=1,targetRadius=0,
}={}){
  const length=Math.hypot(forwardX,forwardZ)||1,fx=forwardX/length,fz=forwardZ/length;
  const rx=fz,rz=-fx,dx=targetX-originX,dz=targetZ-originZ;
  const forward=dx*fx+dz*fz,lateral=Math.abs(dx*rx+dz*rz),radius=Math.max(0,Number(targetRadius)||0);
  if(forward<-radius||forward>range+radius)return false;
  const progress=clamp(forward/Math.max(.001,range),0,1);
  const localHalfWidth=width*(.42+.58*progress)+radius;
  return lateral<=localHalfWidth;
}

function isEnemyLabRuntime(runtimeContext){
  return runtimeContext?.mode==='enemy-lab'||runtimeContext?.config?.mode==='enemy-lab';
}

function normalize2(x,z){const length=Math.hypot(x,z)||1;return{x:x/length,z:z/length};}
function playerFrame(getPlayer){
  const player=getPlayer?.()||{},forward=normalize2(Number(player.forwardX)||0,Number(player.forwardZ)||1);
  return{x:Number(player.x)||0,z:Number(player.z)||0,forward,right:{x:forward.z,z:-forward.x}};
}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
function enemyRadius(enemy,system){return Math.max(.42,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);}
function makeMaterial(THREE,color,opacity=.88,additive=true){
  return new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});
}
function disposeObject(root){
  if(!root)return;root.parent?.remove(root);
  root.traverse?.(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());else object.material?.dispose?.();});
}

function makeBurstVisual(THREE,scene,spec,size){
  const group=new THREE.Group();group.name=spec.charged?'Wizard Arcana charged Flame Strike':'Wizard Arcana Flame Strike';
  const count=spec.charged?11:(spec.beat===3?8:6);
  for(let index=0;index<count;index++){
    const progress=index/Math.max(1,count-1),angle=(index%2?1:-1)*(.17+.15*progress),z=.38+progress*spec.range*.72;
    const radius=(.38+.30*progress)*(spec.charged?1.12:1);
    const color=index%4===0?HOT:(index%3===0?GOLD:(index%2===0?ORANGE:DEEP));
    const flame=new THREE.Mesh(new THREE.SphereGeometry(radius,14,9),makeMaterial(THREE,color,.96-progress*.24));
    flame.position.set(Math.sin(angle)*spec.width*(.30+.48*progress),.34+.28*Math.sin(progress*Math.PI),z);
    flame.scale.set(1.12+.28*progress,.76+progress*.48,1.10);flame.userData.flame=true;flame.userData.baseY=flame.scale.y;group.add(flame);
  }
  const core=new THREE.Mesh(new THREE.SphereGeometry(spec.charged ? .68 : .48,16,10),makeMaterial(THREE,HOT,.98));
  core.position.set(0,.48,.78);core.scale.set(1.2,.72,1.32);core.userData.core=true;group.add(core);
  const sootCount=spec.charged?5:3;
  for(let index=0;index<sootCount;index++){
    const soot=new THREE.Mesh(new THREE.SphereGeometry(.25+index*.035,10,7),makeMaterial(THREE,SOOT,.25-index*.025,false));
    soot.position.set((index%2?1:-1)*.25,.24,1.1+index*.45);soot.scale.set(1.35,.55,1.15);soot.userData.soot=true;group.add(soot);
  }
  const glow=new THREE.Mesh(new THREE.CircleGeometry(spec.width*.78,30),makeMaterial(THREE,ORANGE,.24));
  glow.rotation.x=-Math.PI/2;glow.position.set(0,.025,spec.range*.42);glow.scale.set(1,1.55,1);glow.userData.glow=true;group.add(glow);
  group.scale.setScalar(size*spec.visualScale);group.renderOrder=4;scene.add(group);return group;
}

function makeImpactFlash(THREE,scene,x,y,z,size){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(.42*size,14,9),makeMaterial(THREE,0xffffff,.96));
  mesh.position.set(x,y,z);mesh.renderOrder=8;scene.add(mesh);return mesh;
}

function makeChargeVisual(THREE,scene){
  const group=new THREE.Group();group.name='Wizard Arcana Flame Strike charge';
  const ring=new THREE.Mesh(new THREE.RingGeometry(.55,.68,42),makeMaterial(THREE,GOLD,.72));ring.rotation.x=-Math.PI/2;ring.userData.ring=true;group.add(ring);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.34,14,9),makeMaterial(THREE,HOT,.82));core.position.y=.45;core.userData.core=true;group.add(core);
  scene.add(group);return group;
}

export function installWizardFlameStrikeRuntime({THREE,scene,getPlayer,getEnemySystem,runtimeContext=null}={}){
  const initial=readArcanaTweaks();
  if(!THREE||!scene||!isEnemyLabRuntime(runtimeContext))return{state:{effects:[],sizeMultiplier:initial.sizeMultiplier},update(){},reset(){},dispose(){}};
  const state={effects:[],sizeMultiplier:initial.sizeMultiplier,pointerHeld:[false,false],activeCombos:[]};

  function add(effect){state.effects.push(effect);return effect;}
  function remove(effect){
    if(effect.chargeMesh)disposeObject(effect.chargeMesh);
    if(effect.mesh)disposeObject(effect.mesh);
    for(const mesh of effect.flashes||[])disposeObject(mesh);
    let index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
    index=state.activeCombos.indexOf(effect);if(index>=0)state.activeCombos.splice(index,1);
  }
  function reset(){for(const effect of[...state.effects])remove(effect);state.activeCombos.length=0;}
  function currentSize(){return clampArcanaSize(state.sizeMultiplier);}
  function gamepadHeld(slot){
    try{for(const pad of navigator.getGamepads?.()||[]){if(pad?.buttons?.[4+slot]?.pressed)return true;}}catch{}
    return false;
  }
  function heldSlot(){for(let slot=0;slot<2;slot++)if(state.pointerHeld[slot]||gamepadHeld(slot))return slot;return -1;}
  function slotHeld(slot){return slot>=0&&(state.pointerHeld[slot]||gamepadHeld(slot));}

  function damageBurst(frame,spec,size){
    const system=getEnemySystem?.();if(!system)return[];
    const originX=frame.x+frame.forward.x*spec.originOffset,originZ=frame.z+frame.forward.z*spec.originOffset,flashes=[];
    for(const enemy of aliveEnemies(system)){
      if(!pointInFlameStrikePlume({originX,originZ,forwardX:frame.forward.x,forwardZ:frame.forward.z,targetX:enemy.x,targetZ:enemy.z,range:spec.range*size,width:spec.width*size,targetRadius:enemyRadius(enemy,system)}))continue;
      const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);
      const power=spec.charged ? .72 : (spec.beat===3 ? .48 : .30);
      const pop=spec.charged ? .18 : .08;
      system.damageEnemy?.(enemy,spec.damage,{x:direction.x*spec.push,z:direction.z*spec.push},{source:'wizardArcana',power,pop,flameStrike:true,charged:spec.charged});
      const scale=(system.heightScale||1)*(enemy.currentTargetScale||enemy.targetScale||1),height=(enemy.height||2)*scale;
      flashes.push(makeImpactFlash(THREE,scene,enemy.x,(enemy.targetYOffset||enemy.rootLift||0)+height*.55,enemy.z,size*(spec.charged?1.4:1)));
    }
    return flashes;
  }

  function emitBurst(spec){
    const frame=playerFrame(getPlayer),size=currentSize(),mesh=makeBurstVisual(THREE,scene,spec,size);
    mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);
    const flashes=damageBurst(frame,spec,size);
    add({type:'flameStrikeBurst',age:0,life:spec.activeDuration,mesh,flashes,spec,size});
  }

  function startCombo(){
    const combo={type:'flameStrikeCombo',age:0,nextBeat:0,slot:heldSlot(),charging:false,chargeAge:0,chargeMesh:null,life:.86};
    state.activeCombos.push(combo);add(combo);
  }

  function updateCombo(effect,dt){
    effect.age+=dt;
    while(effect.nextBeat<2&&effect.age>=FLAME_STRIKE_BEATS[effect.nextBeat].time){emitBurst(flameStrikeBurstSpec({beat:effect.nextBeat+1}));effect.nextBeat++;}
    if(effect.nextBeat===2&&effect.age>=FLAME_STRIKE_BEATS[2].time){
      effect.nextBeat=3;
      if(slotHeld(effect.slot)){effect.charging=true;effect.chargeMesh=makeChargeVisual(THREE,scene);}
      else emitBurst(flameStrikeBurstSpec({beat:3}));
    }
    if(effect.charging){
      effect.chargeAge+=dt;const frame=playerFrame(getPlayer),size=currentSize(),k=clamp(effect.chargeAge/FLAME_STRIKE_CHARGE.maximumHold,0,1);
      effect.chargeMesh.position.set(frame.x+frame.forward.x*1.05,.03,frame.z+frame.forward.z*1.05);effect.chargeMesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);
      effect.chargeMesh.scale.setScalar(size*(.72+k*1.05));effect.chargeMesh.rotation.z+=dt*(2.8+k*5.2);
      effect.chargeMesh.children.forEach(child=>{if(child.userData?.ring)child.material.opacity=.48+.34*Math.sin(effect.chargeAge*13);else child.material.opacity=.62+.30*k;});
      if(!slotHeld(effect.slot)||effect.chargeAge>=FLAME_STRIKE_CHARGE.maximumHold){disposeObject(effect.chargeMesh);effect.chargeMesh=null;effect.charging=false;emitBurst(flameStrikeBurstSpec({charged:true}));effect.age=Math.max(effect.age,effect.life);}
    }
    if(!effect.charging&&effect.nextBeat>=3&&effect.age>=effect.life)remove(effect);
  }

  function updateBurst(effect,dt,now){
    effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);
    effect.mesh.children.forEach((child,index)=>{
      if(child.userData?.soot)child.material.opacity=.25*Math.pow(1-k,.75);
      else if(child.userData?.glow)child.material.opacity=.24*Math.pow(1-k,.55);
      else{
        const baseOpacity=child.userData?.core ? .98 : .86;
        child.material.opacity=Math.max(0,baseOpacity*Math.pow(1-k,.48));
        if(child.userData?.flame)child.scale.y=child.userData.baseY*(1+.10*Math.sin(now*20+index));
      }
    });
    for(const flash of effect.flashes||[]){flash.material.opacity=.96*Math.pow(1-k,.35);flash.scale.setScalar(1+k*1.9);}
    if(k>=1)remove(effect);
  }

  function cardSlotFromTarget(target){const card=target?.closest?.('.scard');if(card?.id==='card0')return 0;if(card?.id==='card1')return 1;return-1;}
  const onPointerDown=event=>{const slot=cardSlotFromTarget(event.target);if(slot>=0)state.pointerHeld[slot]=true;};
  const onPointerEnd=event=>{const slot=cardSlotFromTarget(event.target);if(slot>=0)state.pointerHeld[slot]=false;else state.pointerHeld.fill(false);};
  const onBlur=()=>state.pointerHeld.fill(false);
  const onPlay=event=>{if(event?.detail?.card?.arcanaId==='FLAME-STRIKE')startCombo();};
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  document.addEventListener('pointerdown',onPointerDown,true);
  window.addEventListener('pointerup',onPointerEnd,true);window.addEventListener('pointercancel',onPointerEnd,true);window.addEventListener('blur',onBlur);
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);

  return{
    state,reset,
    update(dt,now=0){for(const effect of[...state.effects]){if(effect.type==='flameStrikeCombo')updateCombo(effect,Math.max(0,dt));else if(effect.type==='flameStrikeBurst')updateBurst(effect,Math.max(0,dt),Number(now)||0);}},
    dispose(){document.removeEventListener('pointerdown',onPointerDown,true);window.removeEventListener('pointerup',onPointerEnd,true);window.removeEventListener('pointercancel',onPointerEnd,true);window.removeEventListener('blur',onBlur);window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();},
  };
}
